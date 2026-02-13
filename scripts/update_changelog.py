import os
import re
import sys
from datetime import date

def get_status(platform, version):
    log_file = 'combined_test_output.log'
    if not os.path.exists(log_file):
        return '❌'
    
    with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
        log = f.read()
        
        if f'RESULT_IGNORED: {version}:{platform}' in log:
            return '⚪'
        
        # Check for failure pattern
        fail_pattern_bin = f'FAIL  patch-cli-claude-code.test.js > Claude Code Vietnamese Patch Test > Binary Patch Test on {platform}'
        fail_pattern_js = f'FAIL  patch-cli-claude-code.test.js > Claude Code Vietnamese Patch Test > JS Patch Test'
        
        if fail_pattern_bin in log or (platform == 'js' and fail_pattern_js in log):
            return '❌'
        
        return '✅'

def update_changelog(v_js, v_bin, filename='CHANGELOG.md'):
    platforms_map = {
        'js': 'js', 
        'mac-arm64': 'darwin-arm64', 
        'mac-x64': 'darwin-x64', 
        'linux-arm64': 'linux-arm64', 
        'linux-x64': 'linux-x64', 
        'win-x64': 'win32-x64',
        'win-arm64': 'win32-arm64'
    }
    platforms_list = ['js', 'mac-arm64', 'mac-x64', 'linux-arm64', 'linux-x64', 'win-x64', 'win-arm64']
    
    today = date.today().strftime('%Y-%m-%d')
    results = [v_js, today]
    
    for p_key in platforms_list:
        p = platforms_map[p_key]
        v = v_js if p == 'js' else v_bin
        results.append(get_status(p, v))
    
    new_row = "| " + " | ".join(results) + " |"
    
    content = []
    if os.path.exists(filename):
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.readlines()
    
    table_start = -1
    for i, line in enumerate(content):
        if "| version |" in line and "| js |" in line:
            table_start = i
            break
            
    header = "| version | date | js | mac-arm64 | mac-x64 | linux-arm64 | linux-x64 | win-x64 | win-arm64 |"
    separator = "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"

    if table_start == -1:
        new_content = [
            "# Local Changelog & Testing State\n",
            "\n",
            "Automated testing history for new Claude Code versions.\n",
            "\n",
            header + "\n",
            separator + "\n",
            new_row + "\n"
        ]
    else:
        # Update existing version or insert new
        version_exists = False
        # Look for the version in the first 15 rows of the table
        for i in range(table_start + 2, min(table_start + 15, len(content))):
            if f"| {v_js} |" in content[i]:
                content[i] = new_row + "\n"
                version_exists = True
                break
        
        if not version_exists:
            content.insert(table_start + 2, new_row + "\n")
        new_content = content
        
    with open(filename, 'w', encoding='utf-8') as f:
        f.writelines(new_content)
    print(f"Successfully updated {filename} for v{v_js}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 update-changelog.py <v_js> <v_bin>")
        sys.exit(1)
    
    update_changelog(sys.argv[1], sys.argv[2])
