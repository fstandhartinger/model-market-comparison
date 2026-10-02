import importlib.util
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

spec = importlib.util.spec_from_file_location("mailwatch", Path(__file__).with_name("jevbench-priority-mail-watch.py"))
mw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mw)

SYNTH = "sk-SYNTHETIC-not-a-real-key-0123456789abcdef"
EVENT = {"gmail_message_id": "1", "request_id": "00000000-0000-4000-8000-000000000001", "owner": "o",
         "body_file": "/x/customer-mail/1.txt"}
META = {"sender_email": "ann@example.com", "subject": "Re: access",
        "received_at": datetime(2026, 10, 1, 23, 0, tzinfo=timezone.utc)}


class MailWatchRedactionTest(unittest.TestCase):
    def test_credential_reply_gets_fixed_summary(self):
        body = f'Hi, here you go:\napi_key: "{SYNTH}"\nendpoint https://drex.example.ai/v1/systemone'
        summary = mw.safe_summary(body, "Re: access")
        self.assertEqual(summary, mw.ACCESS_SUMMARY)
        self.assertNotIn(SYNTH, summary)

    def test_short_or_split_tokens_redacted(self):
        for body in ("here: Ab3+xY9/Qz8.Lm2_Pk7-Rt5=Wn4Vd6", "the key is abc123XYZ"):
            self.assertEqual(mw.safe_summary(body, "Re"), mw.ACCESS_SUMMARY, body)

    def test_ordinary_reply_withheld_by_default(self):
        self.assertEqual(mw.safe_summary("Please publish it.", "Re: result"), mw.REPLY_SUMMARY)
        for body in ("login demo, pw Xk9mQ2vLp7", "credentials: demo / Xk9!aa"):
            self.assertNotIn("Xk9", mw.safe_summary(body, "Re"))

    def test_legacy_event_sanitized_through_delivery(self):
        legacy = {**EVENT, "summary": f"here pw Xk9mQ2vLp7", "subject": f"Re: key {SYNTH}",
                  "sender_email": "ann@example.com", "received_at": "2026-10-01T23:00:00+00:00",
                  "notification_status": "pending", "board_status": "pending", "model_name": "M"}
        statements, sent = [], []
        def fake_sql(statement):
            statements.append(statement)
            return "1" if "RETURNING" in statement else ("0" if "count(*)" in statement else "")
        def fake_run(argv, **kw):
            sent.append((argv, kw.get("input")))
            return mock.Mock(returncode=0)
        with mock.patch.object(mw, "sql", fake_sql), mock.patch.object(mw, "pending_events", return_value=[legacy]), \
                mock.patch.object(mw.subprocess, "run", fake_run):
            mw.deliver_pending()
        self.assertIn(mw.ACCESS_SUMMARY.replace("'", "''"), statements[0])
        self.assertIn(mw.WITHHELD_SUBJECT, statements[0])
        outbound = repr(sent)
        for secret in (SYNTH, "Xk9mQ2vLp7", "ann@example.com"):
            self.assertNotIn(secret, outbound)
        self.assertEqual(len(sent), 2)
        self.assertTrue(any("notification_status='sent'" in s for s in statements))
        self.assertTrue(any("board_status='sent'" in s for s in statements))

    def test_timeout_is_not_sent_and_not_retried(self):
        statements = []
        def fake_sql(statement):
            statements.append(statement)
            return ""
        def boom(argv, **kw):
            raise mw.subprocess.TimeoutExpired(argv, 45)
        event = {**EVENT, "summary": mw.REPLY_SUMMARY, "subject": mw.WITHHELD_SUBJECT}
        with mock.patch.object(mw, "sql", fake_sql), mock.patch.object(mw.subprocess, "run", boom):
            self.assertFalse(mw.notify_florian(event, {"model_name": "M"}, META))
            self.assertFalse(mw.post_board(event, {"model_name": "M"}, META))
        # No status write at all: the row stays 'sending', so claim_event never re-sends it and it is never 'sent'.
        self.assertEqual(statements, [])

    def test_clean_failure_is_retried(self):
        statements = []
        with mock.patch.object(mw, "sql", lambda s: statements.append(s) or ""), \
                mock.patch.object(mw.subprocess, "run", lambda argv, **kw: mock.Mock(returncode=1)):
            mw.post_board({**EVENT, "summary": mw.REPLY_SUMMARY}, {}, META)
        self.assertIn("board_status='failed'", statements[0])

    def run_delivery(self, fn, summary, rc=0):
        calls, sqls = [], []
        def fake_run(args, **kw):
            calls.append((args, kw.get("input")))
            return mock.Mock(returncode=rc)
        with mock.patch.object(mw.subprocess, "run", side_effect=fake_run), \
             mock.patch.object(mw, "sql", side_effect=lambda s: sqls.append(s) or ""):
            ok = fn(dict(EVENT, summary=summary), {"model_name": "Drex"}, META)
        return ok, calls, sqls

    def test_access_delivery_never_carries_key_sender_or_subject(self):
        # Legacy pending row whose stored summary still holds the raw excerpt.
        legacy = f'Hi, api_key: "{SYNTH}"'
        for fn in (mw.notify_florian, mw.post_board):
            ok, calls, sqls = self.run_delivery(fn, legacy)
            self.assertTrue(ok)
            blob = repr(calls) + repr(sqls)
            for secret in (SYNTH, "ann@example.com", "Re: access"):
                self.assertNotIn(secret, blob, fn.__name__)
            self.assertIn("'sent'", sqls[-1])
        self.assertIn("digest", self.run_delivery(mw.notify_florian, legacy)[1][0][0])

    def test_failed_delivery_stays_failed(self):
        ok, _, sqls = self.run_delivery(mw.notify_florian, mw.ACCESS_SUMMARY, rc=1)
        self.assertFalse(ok)
        self.assertIn("'failed'", sqls[-1])
        self.assertNotIn("'sent'", sqls[-1])

    def test_sql_statement_goes_via_stdin_not_argv(self):
        with mock.patch.object(mw.subprocess, "run", return_value=mock.Mock(returncode=0, stdout="")) as run:
            mw.sql(f"SELECT '{SYNTH}'")
        args, kw = run.call_args
        self.assertNotIn(SYNTH, repr(args))
        self.assertIn(SYNTH, kw["input"])


if __name__ == "__main__":
    unittest.main()
