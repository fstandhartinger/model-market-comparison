"""Inert tests of exact draft authorization; no Telegram, mail, or production DB."""
import copy
import importlib.machinery
import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import Mock, patch

import refusal_approval as approval

RID = "ee581238-8964-488d-a81d-cfef6a9f9645"
NOW = 1790712000
ROW = {"id": RID, "stripe_mode": "live", "synthetic_test": False, "status": "refunded",
       "refund_status": "succeeded", "refund_reason": "source_review_failed", "refunded_at": "2026-09-29T20:00:00Z",
       "refund_id": "re_fixture", "email": "customer@example.org"}
TO, SUBJECT, BODY = ROW["email"], "Order ee581238: source review and refund", "Your full payment has been refunded."


def prepared():
    draft, digest = approval.envelope(ROW, TO, SUBJECT, BODY)
    return {"draft": draft, "digest": digest, "send_key": "random_send", "keep_key": "random_keep",
            "notification": "sent", "message_id": 123, "chat_id": 456, "created_at": NOW - 10,
            "expires_at": NOW + 10, "buttons_attached": True}


def click(**changes):
    values = {"update": 1, "chat": 456, "message": 123, "sender": 456, "received": NOW, "data": "random_send"}
    values.update(changes)
    return tuple(values.values())


class ApprovalTests(unittest.TestCase):
    def setUp(self):
        # These tests drive the live-path state machine with every effect mocked; the
        # scratch-runtime guard (FASTLANE_DB/FASTLANE_STATE_ROOT) must not short-circuit it.
        env = patch.dict("os.environ")
        env.start()
        self.addCleanup(env.stop)
        import os
        os.environ.pop("FASTLANE_DB", None)
        os.environ.pop("FASTLANE_STATE_ROOT", None)
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.path = self.root / (RID + ".json")
        self.fx = Mock(dry_run=False)
        self.fx.mail.return_value = (True, "ok")

    def tearDown(self):
        self.tmp.cleanup()

    def run_advance(self, callbacks=(), **kwargs):
        with patch.object(approval, "callback_rows", return_value=callbacks), \
             patch.object(approval, "attach"), patch.object(approval, "notify_card") as notify, \
             patch.object(approval, "close_durable_reply_action", return_value=True), \
             patch.object(approval, "resolve_ask", return_value=True):
            result = approval.advance(kwargs.get("row", ROW), TO, SUBJECT, kwargs.get("body", BODY),
                                      self.root, self.fx, NOW)
        return result, notify

    def save(self, **kwargs):
        state = prepared()
        state.update(kwargs)
        approval.atomic(self.path, state)

    def test_only_exact_callback_authorizes(self):
        for change in ({"sender": 457}, {"chat": 457}, {"message": 124}, {"data": "other"},
                       {"received": NOW - 11}, {"received": NOW + 1}, {"received": "invalid"}):
            with self.subTest(change=change):
                state = prepared()
                approval.apply_callbacks(state, [click(**change)], NOW)
                self.assertNotIn("decision", state)
        state = prepared()
        approval.apply_callbacks(state, [click()], NOW)
        self.assertEqual(state["decision"], "send")

    def test_expired_click_never_approves(self):
        state = prepared()
        approval.apply_callbacks(state, [click(received=NOW + 11)], NOW + 12)
        self.assertEqual(state["decision"], "expired")

    def test_first_valid_choice_is_final(self):
        state = prepared()
        approval.apply_callbacks(state, [click(data="random_keep"), click(update=2)], NOW)
        approval.apply_callbacks(state, [click(update=3)], NOW)
        self.assertEqual(state["decision"], "keep")

    def test_draft_or_refund_mutation_cannot_reuse_approval(self):
        self.save(decision="send")
        self.assertEqual(self.run_advance(body=BODY + " Modified.")[0], "held")
        self.assertEqual(self.run_advance(row={**ROW, "refund_id": "re_other"})[0], "held")
        self.fx.mail.assert_not_called()

    def test_pending_or_synthetic_refund_rejected(self):
        for change in ({"status": "refund_due"}, {"refund_status": "pending"}, {"refunded_at": None},
                       {"synthetic_test": True}, {"stripe_mode": "test"}, {"refund_id": None}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                approval.envelope({**ROW, **change}, TO, SUBJECT, BODY)

    def test_database_approved_flag_is_not_authority(self):
        self.save()
        self.assertEqual(self.run_advance(row={**ROW, "refusal_email_status": "approved"})[0], "pending")
        self.fx.mail.assert_not_called()

    def test_exact_send_and_replay_send_only_once(self):
        self.save()
        self.assertEqual(self.run_advance([click()])[0], "sent")
        self.assertEqual(self.run_advance([click()])[0], "sent")
        self.fx.mail.assert_called_once_with(TO, SUBJECT, BODY)

    def test_unknown_smtp_is_not_retried(self):
        self.save()
        self.fx.mail.return_value = (False, "timeout")
        self.assertEqual(self.run_advance([click()])[0], "unknown")
        self.assertEqual(self.run_advance([click()])[0], "unknown")
        self.fx.mail.assert_called_once()

    def test_crash_after_claim_is_not_retried(self):
        self.save(decision="send", mail="sending", claimed_at=NOW - 2)
        self.assertEqual(self.run_advance()[0], "unknown")
        self.assertEqual(self.run_advance()[0], "unknown")
        self.fx.mail.assert_not_called()

    def test_keep_completes_without_mail(self):
        self.save()
        self.assertEqual(self.run_advance([click(data="random_keep")])[0], "held")
        self.fx.mail.assert_not_called()

    def test_exact_send_callback_closes_durable_reply_action_before_mail(self):
        self.save()
        loader = importlib.machinery.SourceFileLoader(
            "notify_reply_actions", str(Path.home() / "bin/notify_reply_actions.py"))
        spec = importlib.util.spec_from_loader(loader.name, loader)
        registry = importlib.util.module_from_spec(spec)
        loader.exec_module(registry)
        with patch.object(registry, "DB_PATH", self.root / "reply-actions.sqlite3"):
            registry.register_telegram(
                123, "refusal card", "/home/flori/jobs/fastlane-refusal-reply-guard-20260929",
                str(self.root / "reply.json"), "codex:allout-bh-pipeline-20260929", minutes=720)
            self.assertEqual(len(registry.waiting_telegram()), 1)
            def send_only_after_reply_action_is_closed(*args):
                self.assertEqual(registry.waiting_telegram(), [])
                return True, "ok"
            self.fx.mail.side_effect = send_only_after_reply_action_is_closed
            close_action = approval.close_durable_reply_action
            with patch.object(approval, "close_durable_reply_action",
                              side_effect=lambda state: close_action(state, registry)), \
                 patch.object(approval, "callback_rows", return_value=[click()]), \
                 patch.object(approval, "attach"), \
                 patch.object(approval, "resolve_ask", return_value=True):
                result = approval.advance(ROW, TO, SUBJECT, BODY, self.root, self.fx, NOW)
            self.assertEqual(result, "sent")
            self.assertEqual(registry.waiting_telegram(), [])
        self.fx.mail.assert_called_once_with(TO, SUBJECT, BODY)

    def test_exact_keep_callback_closes_durable_reply_action_without_mail(self):
        self.save()
        loader = importlib.machinery.SourceFileLoader(
            "notify_reply_actions", str(Path.home() / "bin/notify_reply_actions.py"))
        spec = importlib.util.spec_from_loader(loader.name, loader)
        registry = importlib.util.module_from_spec(spec)
        loader.exec_module(registry)
        with patch.object(registry, "DB_PATH", self.root / "reply-actions.sqlite3"):
            registry.register_telegram(
                123, "refusal card", "/home/flori/jobs/fastlane-refusal-reply-guard-20260929",
                str(self.root / "reply.json"), "codex:allout-bh-pipeline-20260929", minutes=720)
            close_action = approval.close_durable_reply_action
            with patch.object(approval, "close_durable_reply_action",
                              side_effect=lambda state: close_action(state, registry)), \
                 patch.object(approval, "callback_rows", return_value=[click(data="random_keep")]), \
                 patch.object(approval, "attach"), \
                 patch.object(approval, "resolve_ask", return_value=True):
                result = approval.advance(ROW, TO, SUBJECT, BODY, self.root, self.fx, NOW)
            self.assertEqual(result, "held")
            self.assertEqual(registry.waiting_telegram(), [])
        self.fx.mail.assert_not_called()

    def test_expired_refusal_card_preserves_durable_reply_expiry(self):
        self.save(expires_at=NOW - 1)
        loader = importlib.machinery.SourceFileLoader(
            "notify_reply_actions", str(Path.home() / "bin/notify_reply_actions.py"))
        spec = importlib.util.spec_from_loader(loader.name, loader)
        registry = importlib.util.module_from_spec(spec)
        loader.exec_module(registry)
        with patch.object(registry, "DB_PATH", self.root / "reply-actions.sqlite3"):
            registry.register_telegram(
                123, "refusal card", "/home/flori/jobs/fastlane-refusal-reply-guard-20260929",
                str(self.root / "reply.json"), "codex:allout-bh-pipeline-20260929", minutes=720)
            expires_at = registry.get_action(123)["expires_at"]
            close_action = approval.close_durable_reply_action
            close = Mock(side_effect=lambda state: close_action(state, registry))
            with patch.object(approval, "close_durable_reply_action", close), \
                 patch.object(approval, "callback_rows", return_value=[]), \
                 patch.object(approval, "attach"), \
                 patch.object(approval, "resolve_ask", return_value=True):
                result = approval.advance(ROW, TO, SUBJECT, BODY, self.root, self.fx, NOW)
            self.assertEqual(result, "held")
            close.assert_not_called()
            self.assertEqual(registry.get_action(123)["status"], "waiting")
            self.assertEqual(registry.get_action(123)["expires_at"], expires_at)
            registry.update(123, status="expired")
            self.assertEqual(registry.waiting_telegram(), [])
        self.fx.mail.assert_not_called()

    def test_unrecognized_reply_action_status_is_not_overwritten(self):
        loader = importlib.machinery.SourceFileLoader(
            "notify_reply_actions", str(Path.home() / "bin/notify_reply_actions.py"))
        spec = importlib.util.spec_from_loader(loader.name, loader)
        registry = importlib.util.module_from_spec(spec)
        loader.exec_module(registry)
        with patch.object(registry, "DB_PATH", self.root / "reply-actions.sqlite3"):
            registry.register_telegram(
                123, "refusal card", "/home/flori/jobs/fastlane-refusal-reply-guard-20260929",
                str(self.root / "reply.json"), "codex:allout-bh-pipeline-20260929", minutes=720)
            registry.update(123, status="manual_review")
            self.assertFalse(approval.close_durable_reply_action(prepared(), registry))
            self.assertEqual(registry.get_action(123)["status"], "manual_review")

    def test_uncertain_notification_is_not_resent(self):
        self.save(notification="attempted", message_id=None)
        result, notify = self.run_advance()
        self.assertEqual(result, "unknown")
        notify.assert_not_called()

    def test_dryrun_never_asks_or_sends(self):
        self.fx.dry_run = True
        result, notify = self.run_advance(row={**ROW, "synthetic_test": True})
        self.assertEqual(result, "pending")
        notify.assert_not_called()
        self.fx.mail.assert_not_called()
        self.assertFalse(self.path.exists())

    def test_caps_do_not_enqueue_notification(self):
        self.save()
        state = prepared()
        preview = Mock(returncode=0, stdout="message would be queued")
        with patch.object(approval, "HOME", self.root), patch.object(approval, "telegram_config", return_value=("dummy", 456)), \
             patch.object(approval, "card"), patch.object(approval.subprocess, "run", side_effect=[Mock(stdout=b"No matching entries."), preview]) as run:
            (self.root / "DECISIONS.md").write_text("fixture")
            approval.notify_card(state, self.path, NOW)
        self.assertEqual(run.call_count, 2)
        self.assertIn("--dry-run", run.call_args.args[0])

    def test_same_second_callback_after_fractional_creation(self):
        state = prepared()
        result = Mock(returncode=0, stdout="MESSAGE_ID=123")
        preview = Mock(returncode=0, stdout="[DRY RUN] would send to the main chat")
        with patch.object(approval, "HOME", self.root), patch.object(approval, "telegram_config", return_value=("dummy", 456)), \
             patch.object(approval, "card"), patch.object(approval.subprocess, "run", side_effect=[Mock(stdout=b"No matching entries."), preview, result]):
            (self.root / "DECISIONS.md").write_text("fixture")
            approval.notify_card(state, self.path, NOW + 0.7)
        self.assertEqual(state["created_at"], NOW)
        approval.apply_callbacks(state, [click()], NOW + 0.9)
        self.assertEqual(state["decision"], "send")

    def test_caption_passes_actual_shared_notify_formatter(self):
        notify_path=Path.home()/'bin/notify'
        if not notify_path.exists():self.skipTest('Sandy notification formatter unavailable')
        loader=importlib.machinery.SourceFileLoader('refusal_notify_format_test',str(notify_path))
        spec=importlib.util.spec_from_loader(loader.name,loader)
        module=importlib.util.module_from_spec(spec);loader.exec_module(module)
        state=prepared()
        with patch.object(approval, "HOME", self.root), patch.object(approval, "telegram_config", return_value=("dummy", 456)), \
             patch.object(approval, "card"), patch.object(approval.subprocess, "run", side_effect=[Mock(stdout=b"No matching entries."), Mock(returncode=0,stdout="message would be queued")]) as run:
            (self.root / "DECISIONS.md").write_text("fixture")
            approval.notify_card(state,self.path,NOW)
        caption=run.call_args.kwargs['input']
        command=run.call_args.args[0]
        self.assertIn("--florian-only", command)
        self.assertIn("--ask", command)
        reply_job_dir=str(self.root/'jobs'/'fastlane-refusal-reply-guard-20260929')
        self.assertEqual(run.call_args.kwargs['env']['AGENT_BOARD_JOBDIR'],reply_job_dir)
        self.assertEqual(run.call_args.kwargs['env']['NOTIFY_REPLY_JOB_DIR'],reply_job_dir)
        service=(Path(__file__).with_name('jevbench-priority-autopickup.service')).read_text()
        self.assertIn('Environment=AGENT_BOARD_JOBDIR=%h/jobs/fastlane-refusal-reply-guard-20260929',service)
        self.assertIn('Environment=NOTIFY_REPLY_JOB_DIR=%h/jobs/fastlane-refusal-reply-guard-20260929',service)
        parsed=module.validate_format(caption,'now',ask_minutes=720)
        self.assertEqual(len(parsed),1)
        self.assertEqual(len(parsed[0]['steps']),2)
        self.assertLessEqual(len(caption),500)

    def test_unread_board_entry_blocks_ask(self):
        state = prepared()
        with patch.object(approval, "HOME", self.root), patch.object(approval, "telegram_config") as config, \
             patch.object(approval.subprocess, "run", return_value=Mock(stdout=b"Addressed decision pending")) as run:
            (self.root / "DECISIONS.md").write_text("fixture")
            approval.notify_card(state, self.path, NOW)
        config.assert_not_called()
        self.assertEqual(run.call_count, 1)
        self.assertIn("freshness_hold", json.loads(self.path.read_text()))
        with patch.object(approval.subprocess, "run") as run:
            approval.notify_card(state, self.path, NOW + 300)
        run.assert_not_called()

    def test_known_pre_smtp_gate_preserves_exact_approval_and_retries(self):
        self.save()
        self.fx.mail.return_value = (False, "gate_refused")
        self.assertEqual(self.run_advance([click()])[0], "pending")
        self.assertEqual(json.loads(self.path.read_text())["mail"], "gate_blocked")
        self.fx.mail.return_value = (True, "ok")
        self.assertEqual(self.run_advance()[0], "sent")
        self.assertEqual(self.run_advance()[0], "sent")
        self.assertEqual(self.fx.mail.call_count, 2)

    def test_readonly_broker_filter(self):
        dbpath = self.root / "broker.sqlite3"
        with sqlite3.connect(dbpath) as db:
            db.execute("CREATE TABLE callback_events(update_id,chat_id,message_id,sender_id,received_at,data)")
            db.executemany("INSERT INTO callback_events VALUES(?,?,?,?,?,?)", [click(), click(sender=999)])
        with patch.object(approval, "CALLBACK_DB", dbpath):
            self.assertEqual(approval.callback_rows(123, 456), [click()])

    def test_card_renders_the_fixed_preview(self):
        path = self.root / "preview.png"
        approval.card(path, prepared()["draft"])
        self.assertGreater(path.stat().st_size, 1000)
        self.assertEqual(path.stat().st_mode & 0o777, 0o600)


if __name__ == "__main__":
    unittest.main()
