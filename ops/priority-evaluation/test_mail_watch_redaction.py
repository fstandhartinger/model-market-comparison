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

    def test_ordinary_reply_keeps_excerpt(self):
        self.assertEqual(mw.safe_summary("Please publish it.", "Re: result"), "Please publish it.")

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
