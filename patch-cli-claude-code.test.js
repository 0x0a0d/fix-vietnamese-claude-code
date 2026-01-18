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

const VERSIONS = getVersions(MIN_VERSION_TEST);

const CACHE_DIR = path.join(process.cwd(), '.test-cache');

async function downloadFile(url, dest) {
    if (fs.existsSync(dest)) return;

    fs.mkdirSync(path.dirname(dest), { recursive: true });

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

describe('Claude Code Vietnamese Patch Test', () => {
    beforeAll(async () => {
        // download versions if not exists
        for (const v of VERSIONS) {
            const url = `https://unpkg.com/@anthropic-ai/claude-code@${v}/cli.js`;
            const dest = path.join(CACHE_DIR, `cli-${v}.js`);
            console.log(`Checking version ${v}...`);
            await downloadFile(url, dest);
        }
    }, 60000); // 1 minute timeout for downloads

    it.each(VERSIONS)('should successfully patch version %s', (v) => {
        const filePath = path.join(CACHE_DIR, `cli-${v}.js`);
        const content = fs.readFileSync(filePath, 'utf-8');

        const result = patchContent(content);

        expect(result.success, `Patch failed for version ${v}`).toBe(true);
        expect(result.content).toContain('/* Vietnamese IME fix */');

        // Verify code structure after patch
        expect(result.content).toMatch(/let _vn = \w+\.replace\(\/\\x7f\/g, ""\);/);
        expect(result.content).toContain('.insert(_c)');
    });
});
