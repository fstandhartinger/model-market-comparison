"""Regression (urgent card 373): the paid-order and customer-mail notices must pass the installed notifier.

~/bin/notify rejects cards without a "Worum geht's" line and immediate 🧑 asks without buttons; both notices
failed silently for days and left notification_status 'pending'/'failed'.
"""

import importlib.util
import subprocess
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

HERE = Path(__file__).parent
NOTIFY = Path("/home/flori/bin/notify")


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


worker = load("notice_worker", HERE / "worker.py")
mail_watch = load("notice_mail_watch", HERE / "jevbench-priority-mail-watch.py")


def dry_run(argv, message=None):
    return subprocess.run(argv + ["--dry-run"], input=message, text=True, capture_output=True, timeout=60)


@unittest.skipUnless(NOTIFY.is_file(), "installed Sandy notifier is unavailable")
class NoticeCardsPassNotify(unittest.TestCase):
    def test_payment_notice_passes_notify(self):
        row = {"id": "00000000-0000-4000-8000-000000000000", "stripe_mode": "live", "payment_intent_id": "pi_Test123",
               "amount_total": 9900, "benchmarks": ["jevbench"], "email": "a@example.com",
               "model_name": "Example 8B", "visibility": "public"}
        sent = []
        with patch.object(worker, "claim_notification", return_value=row), \
                patch.object(worker, "notify_florian", side_effect=lambda m: sent.append(m) or True), \
                patch.object(worker, "sql"):
            worker.process_notification()
        result = dry_run([str(NOTIFY), "now", "--requested", "--text-stdin"], sent[0])
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_customer_mail_notice_passes_notify(self):
        event = {"gmail_message_id": "m1", "request_id": "00000000-0000-4000-8000-000000000000",
                 "body_file": "/tmp/body.txt", "summary": "", "owner": "fastlane-eval-00000000"}
        meta = {"received_at": datetime(2026, 10, 10, 12, 0, tzinfo=timezone.utc)}
        calls = []
        with patch.object(mail_watch, "is_access_event", return_value=False), \
                patch.object(mail_watch, "run_delivery", side_effect=lambda argv, **kw: calls.append(argv) or 0), \
                patch.object(mail_watch, "record_delivery", return_value=True):
            mail_watch.notify_florian(event, {"model_name": "Example 8B"}, meta)
        result = dry_run(calls[0])
        self.assertEqual(result.returncode, 0, result.stderr)


class NotifyExitCodes(unittest.TestCase):
    def run_with(self, returncode):
        done = subprocess.CompletedProcess([], returncode, stdout="NOT SENT: pacing cap (queued)\n", stderr="")
        with patch.object(worker.subprocess, "run", return_value=done):
            return worker.notify_florian("x")

    def test_queued_card_is_not_retried(self):
        # A retry after exit 75 only queued duplicate digest entries every five minutes (card 373).
        self.assertTrue(self.run_with(0))
        self.assertTrue(self.run_with(worker.NOTIFY_NOT_SENT_EXIT))
        self.assertFalse(self.run_with(2))


if __name__ == "__main__":
    unittest.main()
