import os
import re
import sys

def update_readme(v_js, v_bin, readme_path='README.md', dry_run=False):
    if not os.path.exists(readme_path):
        print(f"Error: {readme_path} not found")
        return False

    with open(readme_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The block we are looking for starts with **Phiên bản đã test:**
    # and ends with ([CHANGELOG.md](./CHANGELOG.md))
    # Note: The existing README has "(Chi tiết tại [CHANGELOG.md](./CHANGELOG.md))"
    
    new_versions = f"**Phiên bản đã test:**\n- npm: v{v_js}\n- binary: v{v_bin}\n(Chi tiết tại [CHANGELOG.md](./CHANGELOG.md))"
    
    # Improved regex to be more flexible but still specific to the block
    # It matches from the header to the end of the line containing the changelog link
    pattern = r"\*\*Phiên bản đã test:\*\*.*?\(\[CHANGELOG\.md\]\(\./CHANGELOG\.md\)\)"
    
    # We need to handle the fact that there might be some text before the link in the parenthesis
    # like "(Chi tiết tại [CHANGELOG.md]...)"
    # Let's use a more robust regex
    pattern = r"\*\*Phiên bản đã test:\*\*\n.*?\n\(.*?\[CHANGELOG\.md\]\(\./CHANGELOG\.md\)\)"
    
    if not re.search(pattern, content, flags=re.DOTALL):
        print("Warning: Could not find the version block in README.md using the primary pattern.")
        # Fallback to a simpler match if the complex one fails
        pattern = r"\*\*Phiên bản đã test:\*\*.*?\n\n"
        if not re.search(pattern, content, flags=re.DOTALL):
            print("Error: Could not find version block even with fallback.")
            return False

    new_content = re.sub(pattern, new_versions, content, flags=re.DOTALL, count=1)
    
    if new_content == content:
        print("No changes made (content already matches or regex failed)")
        return False

    if dry_run:
        print("Dry run: README.md would be updated to:")
        print("---")
        # Find the start and end of the match to display it
        match = re.search(pattern, content, flags=re.DOTALL)
        if match:
            # We want to show what it WOULD look like
            print(new_versions)
        else:
            print("COULD NOT FIND MATCH")
        print("---")
    else:
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Successfully updated {readme_path} to v{v_js} / v{v_bin}")
    
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 update-readme.py <v_js> <v_bin> [--dry-run]")
        sys.exit(1)
    
    v_js = sys.argv[1]
    v_bin = sys.argv[2]
    is_dry_run = "--dry-run" in sys.argv
    
    update_readme(v_js, v_bin, dry_run=is_dry_run)
