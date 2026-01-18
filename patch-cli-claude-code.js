#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Original method stolen from this
 * https://github.com/manhit96/claude-code-vietnamese-fix
 * This patch fixes Vietnamese input method editors (IMEs) compatibility issues in Claude.
 * By modifying `cli.js` code from this:
 * ```js
 * if (!S.equals(CA)) {
 *     if (S.text !== CA.text) Q(CA.text);
 *     T(CA.offset)
 * }
 * ct1(), lt1();
 * return
 * ```
 * To this:
 * ```js
 * /* Vietnamese IME fix * /
 * let _vn = n.replace(/\x7f/g, "");
 * if (_vn.length > 0) {
 *   for (const _c of _vn) CA = CA.insert(_c);
 *   if (!S.equals(CA)) {
 *     if (S.text !== CA.text) Q(CA.text);
 *     T(CA.offset)
 *   }
 * }
 * Oe1(), Me1();
 * return
 * ```
 * Note: I have no idea how this works, just ported python logic to JS with make it better performance.
 */

const DORK = '/* Vietnamese IME fix */';

function usage() {
    console.log(`
Usage:
  fix-claude-code-vn [options]

Options:
  -f, --file <path>   Path to Claude's cli.js file
  -h, --help          Show this help message

Description:
  This script patches Claude Code's cli.js to fix Vietnamese IME issues.
  If no file is specified, it will try to find it automatically.
    `);
}

function findClaudePath() {
    // 1. Try which/where
    try {
        const cmd = os.platform() === 'win32' ? 'where claude' : 'which claude';
        const binPath = execSync(cmd).toString().split('\n')[0].trim();
        if (binPath) {
            // On Unix, it might be a symlink, resolve it
            let realPath = binPath;
            if (os.platform() !== 'win32') {
                try {
                    realPath = execSync(`realpath "${binPath}"`).toString().trim();
                } catch (e) { /* ignore */ }
            }

            if (realPath.endsWith('.js')) return realPath;
            
            // If it's a binary/shell script, try to find the node_modules
            const dir = path.dirname(realPath);
            const npmPath = path.join(dir, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
            if (fs.existsSync(npmPath)) return npmPath;
        }
    } catch (e) { /* ignore */ }

    // 2. Try npm root -g
    try {
        const npmRoot = execSync('npm root -g').toString().trim();
        const cliPath = path.join(npmRoot, '@anthropic-ai', 'claude-code', 'cli.js');
        if (fs.existsSync(cliPath)) return cliPath;
    } catch (e) { /* ignore */ }

    // 3. Common paths for Windows
    if (os.platform() === 'win32') {
        const commonPaths = [
            path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),
            path.join(process.env.LOCALAPPDATA || '', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js')
        ];
        
        // nvm-windows
        if (process.env.NVM_HOME) {
            try {
                const dirs = fs.readdirSync(process.env.NVM_HOME);
                for (const d of dirs) {
                    const p = path.join(process.env.NVM_HOME, d, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
                    if (fs.existsSync(p)) commonPaths.push(p);
                }
            } catch (e) { /* ignore */ }
        }

        for (const p of commonPaths) {
            if (fs.existsSync(p)) return p;
        }
    }

    return null;
}

function patchContent(fileContent) {
    if (fileContent.includes(DORK)) {
        return { success: true, alreadyPatched: true, content: fileContent };
    }

    // Pattern matching:
    // match this: l.match(/\x7f/g)...if(!S.equals(CA)){if(S.text!==CA.text)Q(CA.text);T(CA.offset)}ct1(),lt1();return
    // We use a regex that captures variable and function names dynamically.
    const re = /((?<var0>[\w$]+)\.match\(\/\\x7f\/g\).*?)if\(!(?<var1>[\w$]+)\.equals\((?<var2>[\w$]+)\)\){if\(\k<var1>\.text!==\k<var2>\.text\)(?<func1>[\w$]+)\(\k<var2>\.text\);(?<func2>[\w$]+)\(\k<var2>\.offset\)}(?<remain>(?:[\w$]+\(\),?\s*)*;?\s*return)/;
    
    const newContent = fileContent.replace(re, (match, m0, var0, var1, var2, func1, func2, remain) => {
        return `
${DORK}
${m0}
let _vn = ${var0}.replace(/\\x7f/g, "");
if (_vn.length > 0) {
    for (const _c of _vn) ${var2} = ${var2}.insert(_c);
    if (!${var1}.equals(${var2})) {
        if (${var1}.text !== ${var2}.text) ${func1}(${var2}.text);
        ${func2}(${var2}.offset);
    }
}
${remain}
`;
    });

    if (newContent === fileContent) {
        return { success: false, content: fileContent };
    }

    return { success: true, alreadyPatched: false, content: newContent };
}

// Main execution
if (require.main === module) {
    let targetPath = null;
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-f' || args[i] === '--file') {
            targetPath = args[++i];
        } else if (args[i] === '-h' || args[i] === '--help') {
            usage();
            process.exit(0);
        }
    }

    if (!targetPath) {
        targetPath = findClaudePath();
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
        console.error('Error: Could not find Claude Code cli.js.');
        if (targetPath) console.error(`Path tried: ${targetPath}`);
        usage();
        process.exit(1);
    }

    console.log(`Target: ${targetPath}`);

    if (!targetPath.endsWith('.js')) {
        console.error('Error: Target file must be a .js file.');
        process.exit(1);
    }

    const content = fs.readFileSync(targetPath, 'utf-8');
    const result = patchContent(content);

    if (result.alreadyPatched) {
        console.log('Claude is already patched for Vietnamese IME.');
        process.exit(0);
    }

    if (!result.success) {
        console.error('Error: Failed to patch Claude. The code structure might have changed.');
        process.exit(1);
    }

    fs.writeFileSync(targetPath, result.content, 'utf-8');
    console.log('Success: Claude has been patched for Vietnamese IME.');
}

// Export for testing
module.exports = { patchContent };
