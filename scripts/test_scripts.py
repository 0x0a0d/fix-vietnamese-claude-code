import unittest
import os
import re
import tempfile
import shutil
from update_readme import update_readme
from update_changelog import update_changelog

class TestScripts(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        
    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def test_update_readme(self):
        readme_path = os.path.join(self.test_dir, 'README.md')
        content = """# Title
**Phiên bản đã test:**
- npm: v0.0.1
- binary: v0.0.1
(Chi tiết tại [CHANGELOG.md](./CHANGELOG.md))

## Other Section
"""
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        update_readme("1.2.3", "1.2.3", readme_path=readme_path)
        
        with open(readme_path, 'r', encoding='utf-8') as f:
            new_content = f.read()
            
        self.assertIn("- npm: v1.2.3", new_content)
        self.assertIn("- binary: v1.2.3", new_content)
        self.assertIn("(Chi tiết tại [CHANGELOG.md](./CHANGELOG.md))", new_content)
        self.assertNotIn("v0.0.1", new_content)

    def test_update_changelog_new_version(self):
        changelog_path = os.path.join(self.test_dir, 'CHANGELOG.md')
        log_path = 'combined_test_output.log' # The script looks for this in CWD
        
        # Create a mock header
        content = """# Changelog
| version | date | js | mac-arm64 | mac-x64 | linux-arm64 | linux-x64 | win-x64 | win-arm64 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.0.0 | 2024-01-01 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
"""
        with open(changelog_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        # Create mock log
        # Force current directory for the script to find combined_test_output.log
        old_cwd = os.getcwd()
        os.chdir(self.test_dir)
        try:
            with open('combined_test_output.log', 'w', encoding='utf-8') as f:
                f.write("RESULT_IGNORED: 1.1.0:win32-arm64\n")
                f.write("PASS  patch-cli-claude-code.test.js > Binary Patch Test on linux-x64\n")
            
            update_changelog("1.1.0", "1.1.0", filename='CHANGELOG.md')
            
            with open('CHANGELOG.md', 'r', encoding='utf-8') as f:
                new_content = f.read()
                
            # Version 1.1.0 should be inserted at the top of the table
            self.assertIn("| 1.1.0 |", new_content)
            self.assertIn("⚪ |", new_content) # for win-arm64
            self.assertIn("| 1.0.0 |", new_content)
        finally:
            os.chdir(old_cwd)

    def test_update_changelog_existing_version(self):
        changelog_path = os.path.join(self.test_dir, 'CHANGELOG.md')
        
        content = """# Changelog
| version | date | js | mac-arm64 | mac-x64 | linux-arm64 | linux-x64 | win-x64 | win-arm64 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1.0 | 2024-01-01 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
"""
        with open(changelog_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        old_cwd = os.getcwd()
        os.chdir(self.test_dir)
        try:
            # New log shows success
            with open('combined_test_output.log', 'w', encoding='utf-8') as f:
                f.write("Test passed perfectly\n")
            
            update_changelog("1.1.0", "1.1.0", filename='CHANGELOG.md')
            
            with open('CHANGELOG.md', 'r', encoding='utf-8') as f:
                new_content = f.read()
                
            # Row should be updated from ❌ to ✅
            self.assertIn("| 1.1.0 |", new_content)
            self.assertIn("✅ | ✅ | ✅ |", new_content)
            self.assertNotIn("❌", new_content)
        finally:
            os.chdir(old_cwd)

if __name__ == "__main__":
    unittest.main()
