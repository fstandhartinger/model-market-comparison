"""Offline tests of the late envelope audit sink, with no live mail access."""

import fcntl
import importlib.util
import os
import tempfile
import unittest
import warnings
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from cd7e_late_audit import MESSAGE_ID, AuditHold, append_accepted


class LateAuditTest(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.path = Path(temp.name) / "sent-audit.log"
        self.lock = Path(temp.name) / "audit.lock"
        self.ordinary_row = b"1780000000\t2026-05-28T20:26:40\tgmail\tother@example.test\tOrdinary\n"
        self.path.write_bytes(self.ordinary_row)
        self.lock.touch()
        self.inode = self.identity(self.path)
        self.lock_inode = self.identity(self.lock)
        self.accepted = datetime.fromtimestamp(1780000042, timezone.utc)
        self.exact_row = (b"1780000042\t2026-05-28T20:27:22\tgmail\tpaid@example.test\tResult\t"
                          + MESSAGE_ID + b"\n")

    @staticmethod
    def identity(path):
        info = path.stat()
        return info.st_dev, info.st_ino

    def append(self, **kwargs):
        fields = {"accepted_at": self.accepted, "recipient": "paid@example.test", "subject": "Result"}
        fields.update(kwargs)
        return append_accepted(self.path, self.inode, self.lock, self.lock_inode, **fields)

    def test_exact_row_and_recovery_use_original_acceptance_time(self):
        self.assertEqual(self.append(recipient="Paid@example.test"), "appended")
        self.assertEqual(self.append(), "present")
        self.assertEqual(self.path.read_bytes(), self.ordinary_row + self.exact_row)

    def test_busy_writer_leaves_sink_unchanged(self):
        with self.lock.open("rb") as ordinary_lock, self.path.open("ab") as ordinary_writer:
            fcntl.flock(ordinary_lock, fcntl.LOCK_EX)
            ordinary_writer.write(self.ordinary_row)
            with self.assertRaises(AuditHold):
                self.append()
        self.assertEqual(self.append(), "appended")
        self.assertEqual(self.path.read_bytes(), self.ordinary_row * 2 + self.exact_row)

    def test_replacement_and_symlink_hold(self):
        rotated = self.path.with_suffix(".old")
        self.path.rename(rotated)
        self.path.touch()
        with self.assertRaises(AuditHold):
            self.append()
        self.path.unlink()
        self.path.symlink_to(rotated)
        with self.assertRaises(AuditHold):
            self.append()
        self.assertEqual(rotated.read_bytes(), self.ordinary_row)

    def test_incomplete_tail_conflicting_marker_and_duplicate_hold(self):
        for tail in (b"partial", self.exact_row.replace(b"Result", b"Other"), self.exact_row * 2):
            with self.subTest(tail=tail):
                before = self.ordinary_row + tail
                self.path.write_bytes(before)
                with self.assertRaises(AuditHold):
                    self.append()
                self.assertEqual(self.path.read_bytes(), before)

    def test_failure_then_retry_before_append_and_after_append(self):
        with patch("cd7e_late_audit.os.write", side_effect=OSError):
            with self.assertRaises(AuditHold):
                self.append()
        self.assertEqual(self.path.read_bytes(), self.ordinary_row)
        with patch("cd7e_late_audit.os.fsync", side_effect=OSError):
            with self.assertRaises(AuditHold):
                self.append()
        with patch("cd7e_late_audit.os.fsync", wraps=os.fsync) as sync:
            self.assertEqual(self.append(), "present")
            sync.assert_called_once()
        self.assertEqual(self.path.read_bytes(), self.ordinary_row + self.exact_row)

    def test_short_append_preserves_partial_row_and_holds_recovery(self):
        write = os.write
        with patch("cd7e_late_audit.os.write", side_effect=lambda fd, row: write(fd, row[:-8])):
            with self.assertRaises(AuditHold):
                self.append()
        with self.assertRaises(AuditHold):
            self.append()
        self.assertEqual(self.path.read_bytes(), self.ordinary_row + self.exact_row[:-8])

    def test_invalid_fields_and_scan_bound_hold(self):
        with self.assertRaises(AuditHold):
            self.append(accepted_at=self.accepted.replace(tzinfo=None))
        with self.assertRaises(AuditHold):
            self.append(recipient="paid@example.test\tother@example.test")
        with patch("cd7e_late_audit.MAX_SCAN_BYTES", 20):
            with self.assertRaises(AuditHold):
                self.append()
        with patch("cd7e_late_audit.MAX_SCAN_BYTES", len(self.ordinary_row + self.exact_row) - 1):
            with self.assertRaises(AuditHold):
                self.append()
        self.assertEqual(self.path.read_bytes(), self.ordinary_row)

    @unittest.skipUnless(os.environ.get("CD7E_MAIL_ADAPTER"), "requires pinned mail reader fixture")
    def test_canonical_readers_include_the_row_and_retained_inflight(self):
        adapter = Path(os.environ["CD7E_MAIL_ADAPTER"]) / "mail_tool.py"
        fixture = self.path.parent / adapter.name
        fixture.write_bytes(adapter.read_bytes())
        (fixture.parent / "accounts.json").write_text("{}")
        spec = importlib.util.spec_from_file_location("cd7e_audit_mail_fixture", fixture)
        mail = importlib.util.module_from_spec(spec)
        self.assertEqual(self.append(), "appended")
        now = self.accepted.timestamp() + 10
        with warnings.catch_warnings():
            # The pinned tool leaves its fixture reads unclosed.
            warnings.simplefilter("ignore", ResourceWarning)
            spec.loader.exec_module(mail)
            with patch.object(mail, "_inflight_entries", return_value=[(now - 1, ["open@example.test"])]):
                self.assertEqual(mail._recent_external_count(now), 3)
                self.assertEqual(mail._last_send_to_domain("example.test", now), now - 1)
            with patch.object(mail, "_inflight_entries", return_value=[]):
                self.assertEqual(mail._last_send_to_domain("example.test", now), self.accepted.timestamp())


if __name__ == "__main__":
    unittest.main()
