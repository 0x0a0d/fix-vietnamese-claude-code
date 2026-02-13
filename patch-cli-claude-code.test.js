import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { patchContentJs, patchContentBinary, DORK } from './patch-cli-claude-code.js';
import { execSync } from 'child_process';

const MIN_VERSION_TEST = '2.0.64';

function getVersions(minVersion) {
    const versionPaths = minVersion.split('.').map(Number);
    if (versionPaths.length === 2) {
        versionPaths.push(0);
    } else if (versionPaths.length === 1) {
        versionPaths.push(0, 0);
    } else if (versionPaths.length > 3) {
        throw new Error('Invalid version format');
    }

    const versions = new Set();

    try {
        const output = execSync('npm view @anthropic-ai/claude-code versions --json').toString();
        const allVersions = JSON.parse(output);
        allVersions.forEach(v => versions.add(v));
    } catch (e) {
        console.error('Failed to fetch versions from npm, using fallback.');
        ['2.0.64', '2.1.38'].forEach(v => versions.add(v));
    }

    // If platform is not js, also check GCS for "latest" version which might be newer than NPM
    if (ONLY_PLATFORM && ONLY_PLATFORM !== 'js') {
        try {
            const gcsLatest = execSync('curl -s https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/latest').toString().trim();
            if (gcsLatest && !versions.has(gcsLatest)) {
                console.log(`Adding latest GCS version: ${gcsLatest}`);
                versions.add(gcsLatest);
            }
        } catch (e) {
            console.warn('Failed to fetch latest version from GCS');
        }
    }

    return Array.from(versions).filter(v => {
        // filter version >= minVersion (default 2.0.64)
        const parts = v.split('.').map(Number);
        if (parts[0] > versionPaths[0]) return true;
        if (parts[0] === versionPaths[0]) {
            if (parts[1] > versionPaths[1]) return true;
            if (parts[1] === versionPaths[1]) return parts[2] >= versionPaths[2];
        }
        return false;
    });
}

const ONLY_VERSION = process.env.ONLY_VERSION;
const ONLY_PLATFORM = process.env.ONLY_PLATFORM;
const VERSIONS = ONLY_VERSION ? ONLY_VERSION.split(',') : getVersions(MIN_VERSION_TEST);

if (ONLY_VERSION) {
    console.log(`Running tests ONLY for versions: ${ONLY_VERSION}`);
} else {
    console.log(`Running tests for all versions from ${MIN_VERSION_TEST}`);
}

if (ONLY_PLATFORM) {
    console.log(`Running tests ONLY for platform: ${ONLY_PLATFORM}`);
}

const CACHE_DIR = path.join(process.cwd(), '.test-cache');

async function downloadUrl(url) {
    for (let retry = 0; retry < 2; retry++) {
        try {
            return await new Promise((resolve, reject) => {
                https.get(url, (response) => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`Failed to download: ${response.statusCode} for ${url}`));
                        return;
                    }
                    const chunks = [];
                    response.on('data', (chunk) => chunks.push(chunk));
                    response.on('end', () => {
                        const buffer = Buffer.concat(chunks);
                        resolve(buffer.toString('latin1'));
                    });
                }).on('error', (err) => {
                    reject(err);
                });
            });
        } catch (err) {
            if (retry === 1) throw err;
            console.warn(`Attempt ${retry + 1} failed for ${url}: ${err.message}`);
        }
    }
}

async function downloadJs(version) {
    const urls = [
        `https://cdn.jsdelivr.net/npm/@anthropic-ai/claude-code@${version}/cli.js`,
        `https://unpkg.com/@anthropic-ai/claude-code@${version}/cli.js`
    ];

    for (const url of urls) {
        try {
            return await downloadUrl(url);
        } catch (e) {
            if (url === urls[urls.length - 1]) throw e;
        }
    }
}

async function downloadBinary(version, platform) {
    const ext = platform.startsWith('win') ? '.exe' : '';
    const url = `https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/${version}/${platform}/claude${ext}`;
    try {
        return await downloadUrl(url);
    } catch (e) {
        if (e.message.includes('404')) {
            const error = new Error(`RESULT_IGNORED: 404 not found`);
            error.code = '404';
            throw error;
        }
        throw e;
    }
}

describe('Claude Code Vietnamese Patch Test', () => {
    describe.skipIf(ONLY_PLATFORM && ONLY_PLATFORM !== 'js')('JS Patch Test', () => {
        const JS_CACHE_DIR = path.join(CACHE_DIR, 'js');
        if (!fs.existsSync(JS_CACHE_DIR)) {
            fs.mkdirSync(JS_CACHE_DIR, { recursive: true });
        }
        it.concurrent.each(VERSIONS)('should successfully patch cli.js version %s and run --help', async (v) => {
            const filePath = path.join(JS_CACHE_DIR, `cli-${v}.js`);
            const patchedPath = path.join(JS_CACHE_DIR, `cli-${v}-patched.js`);
            let content;
            if (!fs.existsSync(filePath)) {
                content = await downloadJs(v);
                fs.writeFileSync(filePath, content, 'latin1');
            } else {
                content = fs.readFileSync(filePath, 'latin1');
            }
            let result;
            try {
                result = patchContentJs(content);
                if (result.success) {
                    fs.writeFileSync(patchedPath, result.content, 'latin1');
                    // Verify by running node patchedPath --help
                    try {
                        const output = execSync(`node "${patchedPath}" --help`, { stdio: 'pipe' }).toString();
                        if (process.env.SHOW_HELP_OUTPUT) {
                            console.log(`\n[INFO] Execution test passed for JS v${v}. Full output:\n${'-'.repeat(40)}\n${output}${'-'.repeat(40)}\n`);
                        } else {
                            console.log(`[INFO] Execution test passed for JS v${v} (output hidden).`);
                        }
                    } catch (e) {
                        const msg = e.stderr?.toString() || e.message;
                        throw new Error(`Execution test failed: ${msg}`);
                    }
                }
            } catch (e) {
                console.error(`Failed to patch cli.js version ${v}: ${e.message}`);
                result = { success: false, message: e.message };
            }

            expect(result.success, `JS Patch failed for version ${v}: ${result.message}`).toBe(true);
        }, 300_000);
    });

    /**
     * // platforms: darwin-arm64, darwin-x64, linux-x64, linux-arm64, linux-x64-musl, linux-arm64-musl
     * https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/<VERSION>/<PLATFORM>/claude
     *
     * // win32-x64/claude.exe
     * https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/claude-code-releases/<VERSION>/win32-x64/claude.exe
     */
    const BINARY_PLATFORMS = [
        'darwin-arm64',
        'darwin-x64',
        'linux-x64',
        'linux-arm64',
        'linux-x64-musl',
        'linux-arm64-musl',
        'win32-x64',
        'win32-arm64'
    ].filter(p => !ONLY_PLATFORM || ONLY_PLATFORM === p);

    describe.runIf(BINARY_PLATFORMS.length > 0).each(BINARY_PLATFORMS)('Binary Patch Test on %s', (platform) => {
        const binDir = path.join(CACHE_DIR, platform);
        if (!fs.existsSync(binDir)) {
            fs.mkdirSync(binDir, { recursive: true });
        }

        it.each(VERSIONS)(`should successfully patch binary version %s on ${platform} and run --help if possible`, async (v) => {
            const ext = platform.startsWith('win') ? '.exe' : '';
            const filePath = path.join(binDir, `claude-${v}${ext}`);
            const patchedPath = path.join(binDir, `claude-${v}-patched${ext}`);
            let content;

            if (!fs.existsSync(filePath)) {
                try {
                    content = await downloadBinary(v, platform);
                    fs.writeFileSync(filePath, content, 'latin1');
                } catch (e) {
                    if (e.code === '404') {
                        console.log(`RESULT_IGNORED: ${v}:${platform}`);
                        return; // Test as passed but ignored
                    }
                    throw e;
                }
            } else {
                content = fs.readFileSync(filePath, 'latin1');
            }
            let result;
            try {
                result = patchContentBinary(content);
                if (result.success) {
                    fs.writeFileSync(patchedPath, result.content, 'latin1');
                    if (!platform.startsWith('win')) {
                        fs.chmodSync(patchedPath, 0o755);
                    }
                    
                    // Verify by running --help if platform matches current OS
                    const currentPlatform = process.platform + '-' + process.arch;
                    let normalizedCurrent = currentPlatform === 'darwin-x64' ? 'darwin-x64' : 
                                            currentPlatform === 'darwin-arm64' ? 'darwin-arm64' :
                                            currentPlatform === 'linux-x64' ? 'linux-x64' :
                                            currentPlatform === 'linux-arm64' ? 'linux-arm64' :
                                            currentPlatform === 'win32-x64' ? 'win32-x64' :
                                            currentPlatform === 'win32-arm64' ? 'win32-arm64' : '';

                    if (normalizedCurrent.startsWith('linux-')) {
                        try {
                            const isMusl = execSync('ldd --version', { stdio: 'pipe' }).toString().includes('musl');
                            if (isMusl) {
                                normalizedCurrent += '-musl';
                            }
                        } catch (e) {
                            // ignore if ldd fails
                        }
                    }

                    if (platform === normalizedCurrent) {
                        try {
                            const output = execSync(`"${patchedPath}" --help`, { stdio: 'pipe' }).toString();
                            if (process.env.SHOW_HELP_OUTPUT) {
                                console.log(`\n[INFO] Execution test passed for ${platform} v${v}. Full output:\n${'-'.repeat(40)}\n${output}${'-'.repeat(40)}\n`);
                            } else {
                                console.log(`[INFO] Execution test passed for ${platform} v${v} (output hidden).`);
                            }
                        } catch (e) {
                            const msg = e.stderr?.toString() || e.message;
                            throw new Error(`Execution test failed for ${platform}: ${msg}`);
                        }
                    }
                }
            } catch (e) {
                console.error(`Failed to patch binary version ${v} on ${platform}: ${e.message}`);
                result = { success: false, message: e.message };
            }
            if (!result.success) {
                console.log(result.success, result.alreadyPatched, result.message)
            }

            expect(result.success, `Binary Patch failed for ${platform} v${v}: ${result.message}`).toBe(true);
        }, 300_000);
    });
});
