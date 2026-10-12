"""The installer copies an explicit file list; every first-party module an installed module imports must be in it.

Regression for card 377 (12 Oct 2026): host_evidence.py was imported by autopickup.py but not installed."""
import ast
import re
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent


def installed_files():
    text = (HERE / 'install-autopickup.sh').read_text()
    match = re.search(r'^for f in (.+?); do$', text, re.M)
    assert match, 'installer file loop not found'
    return set(match.group(1).split())


def first_party_imports(path):
    names = set()
    for node in ast.walk(ast.parse(path.read_text())):
        if isinstance(node, ast.Import):
            names |= {alias.name.split('.')[0] for alias in node.names}
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            names.add(node.module.split('.')[0])
    return {name for name in names if (HERE / f'{name}.py').is_file() and not name.startswith('test_')}


class InstallerInventory(unittest.TestCase):
    def test_every_imported_first_party_module_is_installed(self):
        listed = installed_files()
        missing = {}
        for name in sorted(listed):
            if name.endswith('.py') and (HERE / name).is_file():
                absent = {f'{m}.py' for m in first_party_imports(HERE / name)} - listed
                if absent:
                    missing[name] = sorted(absent)
        self.assertEqual(missing, {})


if __name__ == '__main__':
    unittest.main()
