import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { patchContent } from './patch-cli-claude-code.js';

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

    try {
        const output = execSync('npm view @anthropic-ai/claude-code versions --json').toString();
        const allVersions = JSON.parse(output);
        return allVersions.filter(v => {
            // filter version >= 2.0.64
            const parts = v.split('.').map(Number);
            if (parts[0] > versionPaths[0]) return true;
            if (parts[0] === versionPaths[0]) {
                if (parts[1] > versionPaths[1]) return true;
                if (parts[1] === versionPaths[1]) return parts[2] >= versionPaths[2];
            }
            return false;
        });
    } catch (e) {
        console.error('Failed to fetch versions from npm, using fallback.');
        return ['2.0.64', '2.1.12'];
    }
}

const ONLY_VERSION = process.env.ONLY_VERSION;
const VERSIONS = ONLY_VERSION ? ONLY_VERSION.split(',') : getVersions(MIN_VERSION_TEST);

if (ONLY_VERSION) {
    console.log(`Running tests ONLY for versions: ${ONLY_VERSION}`);
} else {
    console.log(`Running tests for all versions from ${MIN_VERSION_TEST}`);
}

const CACHE_DIR = path.join(process.cwd(), '.test-cache');

async function downloadFile(version, dest) {
    if (fs.existsSync(dest)) return;

    const cdns = [
        (v) => `https://cdn.jsdelivr.net/npm/@anthropic-ai/claude-code@${v}/cli.js`,
        (v) => `https://unpkg.com/@anthropic-ai/claude-code@${v}/cli.js`
    ];

    for (const getUrl of cdns) {
        const url = getUrl(version);
        for (let retry = 0; retry < 2; retry++) {
            try {
                await new Promise((resolve, reject) => {
                    fs.mkdirSync(path.dirname(dest), { recursive: true });
                    const file = fs.createWriteStream(dest);
                    https.get(url, (response) => {
                        if (response.statusCode !== 200) {
                            file.close();
                            fs.unlink(dest, () => {});
                            reject(new Error(`Failed to download: ${response.statusCode}`));
                            return;
                        }
                        response.pipe(file);
                        file.on('finish', () => {
                            file.close();
                            resolve();
                        });
                    }).on('error', (err) => {
                        file.close();
                        fs.unlink(dest, () => {});
                        reject(err);
                    });
                });
                return; // Download success
            } catch (err) {
                console.warn(`Attempt ${retry + 1} failed for ${url}: ${err.message}`);
                if (retry === 1 && getUrl === cdns[cdns.length - 1]) {
                    throw err; // Last retry of last CDN failed
                }
            }
        }
    }
}

const MAX_DOWNLOADS = 10;
let activeDownloads = 0;
const downloadQueue = [];

function processQueue() {
    if (activeDownloads < MAX_DOWNLOADS && downloadQueue.length > 0) {
        const { resolve, reject, args } = downloadQueue.shift();
        activeDownloads++;
        downloadFile(...args)
            .then(resolve)
            .catch(reject)
            .finally(() => {
                activeDownloads--;
                processQueue();
            });
    }
}

async function downloadWithLimit(version, dest) {
    return new Promise((resolve, reject) => {
        downloadQueue.push({ resolve, reject, args: [version, dest] });
        processQueue();
    });
}

describe('Claude Code Vietnamese Patch Test', () => {
    it.concurrent.each(VERSIONS)('should successfully patch version %s', async (v) => {
        const filePath = path.join(CACHE_DIR, `cli-${v}.js`);
        
        // Each test downloads its target file with concurrency limit
        await downloadWithLimit(v, filePath);
        
        const content = fs.readFileSync(filePath, 'utf-8');
        const result = patchContent(content);

        expect(result.success, `Patch failed for version ${v}`).toBe(true);
        expect(result.content).toContain('/* Vietnamese IME fix */');

        // Verify code structure after patch
        expect(result.content).toMatch(/let _vn = \w+\.replace\(\/\\x7f\/g, ""\);/);
        expect(result.content).toContain('.insert(_c)');
    }, 300000); // Increased timeout for each test case
});
