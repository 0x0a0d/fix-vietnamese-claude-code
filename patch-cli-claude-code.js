#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DORK = '/* _0x0a0d_ime_fix_ */';

function usage() {
    console.log(`
Usage:
  fix-claude-code-vn [options]

Options:
  -f, --file <_path_>   Path to cli.js or claude file
  -d, --dry-run       Test without overwriting the file
  -o, --output <path>  Write patched content to a new file
  -h, --help          Show this help message

Description:
  This script patches Claude Code CLI tool to fix Vietnamese IME issues.
  If no file is specified, it will try to find it automatically.
    `);
}

function findClaudePath() {
    const isWin = os.platform() === "win32";

    const run = (cmd) => {
        try {
            return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
              .toString()
              .split(/\r?\n/)[0]
              .trim();
        } catch {
            return "";
        }
    };

    const exists = (p) => p && fs.existsSync(p);

    // 1) which / where / bun which
    for (const cmd of [
        isWin ? "where claude" : "which claude",
        "bun which claude",
    ]) {
        const p = run(cmd);
        if (exists(p)) {
            if (!isWin) {
                try {
                    return execSync(`realpath "${ p }"`).toString().trim();
                } catch {}
            }
            return p;
        }
    }

    // 2) Bun global paths
    const bunInstall =
      process.env.BUN_INSTALL ||
      (isWin
        ? path.join(process.env.USERPROFILE || "", ".bun")
        : path.join(process.env.HOME || "", ".bun"));

    const bunPaths = [
        path.join(bunInstall, "bin", isWin ? "claude.exe" : "claude"),
        path.join(bunInstall, "bin", isWin ? "claude.cmd" : "claude"),
        path.join(
          bunInstall,
          "install",
          "global",
          "node_modules",
          "@anthropic-ai",
          "claude-code",
          "cli.js"
        ),
    ];

    for (const p of bunPaths) {
        if (exists(p)) {
            return p;
        }
    }

    // 3) npm global
    try {
        const npmRoot = execSync("npm root -g").toString().trim();

        const cliPath = path.join(
          npmRoot,
          "@anthropic-ai",
          "claude-code",
          "cli.js"
        );
        if (exists(cliPath)) {

            return cliPath;
        }
    } catch (e) {

    }

    // 4) Windows fallbacks
    if (isWin) {

        const paths = [
            path.join(
              process.env.APPDATA || "",
              "npm",
              "node_modules",
              "@anthropic-ai",
              "claude-code",
              "cli.js"
            ),
            path.join(
              process.env.LOCALAPPDATA || "",
              "npm",
              "node_modules",
              "@anthropic-ai",
              "claude-code",
              "cli.js"
            ),
        ];

        if (process.env.NVM_HOME) {
            try {
                for (const d of fs.readdirSync(process.env.NVM_HOME)) {
                    paths.push(
                      path.join(
                        process.env.NVM_HOME,
                        d,
                        "node_modules",
                        "@anthropic-ai",
                        "claude-code",
                        "cli.js"
                      )
                    );
                }
            } catch (e) {

            }
        }

        for (const p of paths) {
            if (exists(p)) {

                return p;
            }
        }
    }


    return null;
}

// stolen fixed solution from manhit96/claude-code-vietnamese-fix
function patchContentJs(fileContent) {
    if (fileContent.includes(DORK)) {
        return { success: true, alreadyPatched: true };
    }

    // Pattern matching:
    // match this: l.match(/\x7f/g)...if(!S.equals(CA)){if(S.text!==CA.text)Q(CA.text);T(CA.offset)}ct1(),lt1();return
    // We use a regex that captures variable and function names dynamically.
    const re = /(?<m0>(?<var0>[\w$]+)\.match\(\/\\x7f\/g\).*?)(?<m1>if\(!(?<var1>[\w$]+)\.equals\((?<var2>[\w$]+)\)\){if\(\k<var1>\.text!==\k<var2>\.text\)(?<func1>[\w$]+)\(\k<var2>\.text\);(?<func2>[\w$]+)\(\k<var2>\.offset\)})(?<m2>(?:[\w$]+\(\),?\s*)*;?\s*return)/g;

    const newContent = fileContent.replace(re, (...args) => {
        const { m0, m1, var0, var2, m2 } = args[args.length - 1];
        return `
${DORK}
${m0}
let _vn = ${var0}.replace(/\\x7f/g, "");
if (_vn.length > 0) {
    for (const _c of _vn) ${var2} = ${var2}.insert(_c);
    ${m1}
}
${m2}
`;
    });

    if (newContent.length === fileContent.length) {
        return { success: false, message: 'Patch failed: no match found' };
    }

    return { success: true, alreadyPatched: false, content: newContent };
}

function patchContentBinary(binaryContent) {
    if (binaryContent.includes(DORK)) {
        return { success: true, alreadyPatched: true };
    }

    const re = /(?<m0>(?<var0>[\w$]+)\.match\(\/\\x7f\/g\).*?)(?<m1>if\(!(?<var1>[\w$]+)\.equals\((?<var2>[\w$]+)\)\){if\(\k<var1>\.text!==\k<var2>\.text\)(?<func1>[\w$]+)\(\k<var2>\.text\);(?<func2>[\w$]+)\(\k<var2>\.offset\)})(?<m2>(?:[\w$]+\(\),?\s*)*;?\s*return)/g;

    const matches = [];
    binaryContent = binaryContent.replace(re, (...args) => {
        const groups = args[args.length - 1];
        const offset = args[args.length - 3];
        const { m0, m1, var0, var2, m2 } = groups;

        const patchedContent = `${DORK}
${m0}
let _vn = ${var0}.replace(/\\x7f/g, "");
if (_vn.length > 0) {
    for (const _c of _vn) ${var2} = ${var2}.insert(_c);
    ${m1}
}
${m2}`.replace(/^\s+/gm, '');
        matches.push({ diff: patchedContent.length - args[0].length, index: offset });
        return patchedContent;
    });

    if (matches.length === 0) {
        return { success: false, message: 'Patch failed: no match found' };
    }

    // now from index, we must look back for `\x00// @bun `
    const pragma = `// @bun `
    const pragmaLength = pragma.length
    for (let i = 0; i < matches.length; i++) {
        for (let j = matches[i].index - 1; j >= (i === 0 ? 0 : matches[i - 1].index); j--) {
            if (binaryContent[j] === '\x00') {
                // pragma test
                if (binaryContent.slice(j + 1, j + 1 + pragmaLength).toString() === pragma) {
                    // look next to find first `\n//`
                    let found = false;
                    for (let k = j + 1 + pragmaLength; k < matches[i].index; k++) {
                        if (binaryContent[k] === '\n' && binaryContent[k + 1] === '/' && binaryContent[k + 2] === '/') {
                            // remove from binaryContent after `//` exactly `diff` bytes
                            const diff = matches[i].diff;
                            const sliceStart = k + 3;
                            binaryContent = binaryContent.slice(0, sliceStart) + binaryContent.slice(sliceStart + diff);
                            found = true;
                            break;
                        }
                    }
                    if (found) {
                        matches[i].found = true;
                        break;
                    };
                }
            }
        }
        if (!matches[i].found) {
            break;
        }
    }

    if (matches.every(m => !m.found)) {
        return { success: false, message: 'Patch failed: pragma' };
    }

    return { success: true, alreadyPatched: false, content: binaryContent };
}

// Main execution
if (require.main === module) {
    let targetPath = null;
    let isDryRun = false;
    let outputPath = null;
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-f' || args[i] === '--file') {
            targetPath = args[++i];
        } else if (args[i] === '-d' || args[i] === '--dry-run') {
            isDryRun = true;
        } else if (args[i] === '-o' || args[i] === '--output') {
            outputPath = args[++i];
        } else if (args[i] === '-h' || args[i] === '--help') {
            usage();
            process.exit(0);
        }
    }

    if (!targetPath) {
        targetPath = findClaudePath();
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
        console.error('Error: Could not find Claude Code CLI.');
        if (targetPath) console.error(`Path tried: ${targetPath}`);
        usage();
        process.exit(1);
    }

    console.log(`Target: ${targetPath}`);

    const result = targetPath.endsWith('.js')
      ? patchContentJs(fs.readFileSync(targetPath, 'latin1'))
      : patchContentBinary(fs.readFileSync(targetPath, 'latin1'));

    if (result.alreadyPatched) {
        console.log('Claude is already patched for Vietnamese IME.');
        process.exit(0);
    }

    if (!result.success) {
        console.error(result.message);
        process.exit(1);
    }

    if (isDryRun) {
        console.log('Dry run: patch applied successfully (not saved).');
        process.exit(0);
    }

    const finalPath = outputPath || targetPath;
    fs.writeFileSync(finalPath, result.content, 'latin1');
    console.log(`Success: Claude has been patched at ${finalPath}`);
}

// Export for testing
module.exports = {
    DORK,
    patchContentJs,
    patchContentBinary,
};
