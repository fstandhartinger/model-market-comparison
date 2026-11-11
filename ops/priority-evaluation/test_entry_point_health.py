"""N95 (8 Nov 2026): the health check fails when ~/bin/jevbench-autopickup.py is not a symlink to
runtime/autopickup.py, and flags runtime hash drift against the install record."""
import importlib
import json
import os
import re
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent
TMP = Path(tempfile.mkdtemp(prefix="fastlane-entrypoint-test-"))
os.environ.setdefault("FASTLANE_DB", "fastlane_test")
os.environ.setdefault("FASTLANE_STATE_ROOT", str(TMP / "state"))
os.environ.setdefault("FASTLANE_JOB_ROOT", str(TMP / "jobs"))
os.environ.setdefault("FASTLANE_SHARE_ROOT", str(TMP / "share"))
sys.path.insert(0, str(HERE))
ap = importlib.import_module("autopickup")


class EntryPointHealth(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="entry-", dir=TMP))
        self.share = self.root / "share"
        self.bin = self.root / "bin"
        (self.share / "runtime").mkdir(parents=True)
        self.bin.mkdir()
        self.runtime = self.share / "runtime" / "autopickup.py"
        self.runtime.write_text("# runtime v1\n")
        self.entry = self.bin / "jevbench-autopickup.py"
        patches = [mock.patch.object(ap, "SHARE_ROOT", self.share), mock.patch.object(ap, "BIN_ROOT", self.bin)]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    def keys(self):
        return [key for key, _ in ap.install_problems()[0]]

    def test_symlink_to_runtime_with_matching_record_is_clean(self):
        self.entry.symlink_to(self.runtime)
        ap.write_install_record("test", "fixture")
        problems, warnings, info = ap.install_problems()
        self.assertEqual((problems, warnings, info["drift"]), ([], [], False))

    def test_regular_file_copy_fails(self):
        shutil.copy(self.runtime, self.entry)
        ap.write_install_record("test", "fixture")
        problems, _, _ = ap.install_problems()
        self.assertEqual([k for k, _ in problems], ["install:entry-point"])
        self.assertIn("a regular file", problems[0][1])

    def test_symlink_to_other_target_fails(self):
        other = self.root / "elsewhere.py"
        other.write_text("# runtime v1\n")
        self.entry.symlink_to(other)
        self.assertEqual(self.keys(), ["install:entry-point"])

    def test_dangling_and_missing_entry_point_fail(self):
        self.assertEqual(self.keys(), ["install:entry-point"])
        self.entry.symlink_to(self.root / "gone.py")
        self.assertEqual(self.keys(), ["install:entry-point"])

    def test_symlink_chain_resolving_to_runtime_passes(self):
        hop = self.root / "hop.py"
        hop.symlink_to(self.runtime)
        self.entry.symlink_to(hop)
        self.assertEqual(self.keys(), [])

    def test_runtime_drift_is_a_warning_not_a_problem(self):
        self.entry.symlink_to(self.runtime)
        ap.write_install_record("install-autopickup.sh abc", "install from merged main")
        self.runtime.write_text("# runtime v1 + hand edit\n")
        problems, warnings, info = ap.install_problems()
        self.assertEqual(problems, [])
        self.assertTrue(info["drift"])
        self.assertEqual(len(warnings), 1)
        self.assertIn("drifted", warnings[0])
        # A deliberate hot-fix re-records with a reason and the warning clears.
        record = ap.write_install_record("hotfix", "urgent-autofix-1 hunk")
        self.assertEqual(json.loads(ap.install_record_path().read_text())["reason"], "urgent-autofix-1 hunk")
        self.assertEqual(record["source"], "hotfix")
        self.assertEqual(ap.install_problems()[1], [])

    def test_missing_record_is_a_warning(self):
        self.entry.symlink_to(self.runtime)
        problems, warnings, info = ap.install_problems()
        self.assertEqual(problems, [])
        self.assertIn("no install record", warnings[0])
        self.assertFalse(info["drift"])


    def test_symlink_loop_is_a_problem_not_a_crash(self):
        # CR-732 (N7): Path.resolve(strict=True) raises RuntimeError on a loop in Python 3.10
        loop = self.bin / "loop.py"
        loop.symlink_to(self.entry)
        self.entry.symlink_to(loop)
        self.assertEqual(self.keys(), ["install:entry-point"])

    def test_non_utf8_install_record_is_a_warning_not_a_crash(self):
        self.entry.symlink_to(self.runtime)
        ap.install_record_path().parent.mkdir(parents=True, exist_ok=True)
        ap.install_record_path().write_bytes(b"\xff\xfe not json")
        problems, warnings, _ = ap.install_problems()
        self.assertEqual(problems, [])
        self.assertIn("no install record", warnings[0])

    def test_non_string_record_hash_is_a_warning_not_a_crash(self):
        self.entry.symlink_to(self.runtime)
        ap.install_record_path().parent.mkdir(parents=True, exist_ok=True)
        ap.install_record_path().write_text('{"sha256": 5}')
        problems, warnings, _ = ap.install_problems()
        self.assertEqual(problems, [])
        self.assertIn("no install record", warnings[0])

class InstallerAndUnit(unittest.TestCase):
    def test_health_unit_runs_runtime_not_entry_point(self):
        unit = (HERE / "jevbench-priority-autopickup-health.service").read_text()
        exec_start = re.search(r"^ExecStart=(.+)$", unit, re.M).group(1)
        self.assertIn("/.local/share/priority-evaluation/runtime/autopickup.py health", exec_start)
        self.assertNotIn("bin/jevbench-autopickup", exec_start)

    def test_installer_verifies_symlink_and_writes_record(self):
        text = (HERE / "install-autopickup.sh").read_text()
        link = text.index('ln -sfn "$SHARE/runtime/autopickup.py" "$BIN/jevbench-autopickup.py"')
        self.assertLess(link, text.index('[ -L "$BIN/jevbench-autopickup.py" ]'))
        self.assertIn(ap.INSTALL_RECORD_NAME, text[link:])
        self.assertEqual(ap.ENTRY_POINT_NAME, "jevbench-autopickup.py")


if __name__ == "__main__":
    unittest.main()
