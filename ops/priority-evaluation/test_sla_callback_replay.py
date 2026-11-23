"""Replay the trusted worker's exact-order SLA decision paths against disposable state."""

import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock, patch

import autopickup as pickup
import refund_approval as approval
import sla_decision as sla

ORDER = "9aa6673b-f364-4a20-9fc4-899678189814"
NEIGHBOR = "9aa6673b-f364-4a20-9fc4-899678189815"
NOW = datetime(2026, 11, 21, 17, 32, tzinfo=timezone.utc)


def order(order_id):
    return {
        "id": order_id, "status": "paid", "stripe_mode": "live", "synthetic_test": False,
        "paid_at": "2026-11-19T17:31:29+00:00", "email": f"{order_id}@example.invalid",
    }


def card(order_id, decision):
    return {
        "request_id": order_id, "kind": "sla_40h", "notification": "sent", "message_id": 200,
        "chat_id": 100, "created_at": NOW.timestamp() - 30000, "expires_at": NOW.timestamp() + 12000,
        "buttons_attached": True, "late_attached": bool(decision), "decision": decision,
        "update_id": 1, "delay_key": f"delay-{order_id}", "refund_key": f"refund-{order_id}",
        "noaction_key": f"none-{order_id}",
    }


class ReplayTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.cards = self.root / "sla-decisions"
        self.cards.mkdir()
        self.effects = Mock(dry_run=False)
        self.effects.mail.return_value = (True, "fixture")
        self.effects.board.return_value = True
        self.start_patch(patch.object(pickup, "STATE_ROOT", self.root))
        self.start_patch(patch.object(pickup, "utcnow", return_value=NOW))
        self.start_patch(patch.object(sla, "live_runtime", return_value=True))
        self.start_patch(patch.object(approval, "live_runtime", return_value=True))
        self.start_patch(patch.object(sla, "_attach"))
        self.start_patch(patch.object(sla.ra, "register_keyboard"))
        self.start_patch(patch.object(sla, "_send_card"))
        self.start_patch(patch.object(pickup, "load_state", side_effect=lambda rid: {"id": rid}))
        self.start_patch(patch.object(pickup, "save_state"))
        self.start_patch(patch.object(pickup, "owner_for", return_value="fixture"))
        self.start_patch(patch.object(pickup, "read_template", return_value="Order {ORDER_REF} new ETA {NEW_ETA}"))

    def start_patch(self, patcher):
        patcher.start()
        self.addCleanup(patcher.stop)

    def check_repeated_replay(self, decision):
        path = self.cards / f"{ORDER}.json"
        original = json.dumps(card(ORDER, decision))
        path.write_text(original)
        neighbor_path = self.cards / f"{NEIGHBOR}.json"
        neighbor_path.write_text(json.dumps(card(NEIGHBOR, decision)))
        row_calls = []

        def callbacks(keys, chat):
            row_calls.extend(keys)
            return [(2, chat, 200, chat, NOW.timestamp(), key) for key in keys if key.startswith("delay-")]

        with patch.object(sla.ra, "callback_rows", side_effect=callbacks), \
             patch.object(pickup, "sla_decision_rows", return_value=[order(ORDER), order(NEIGHBOR)]), \
             patch.object(pickup, "apply_refund_decision") as write_refund:
            for cycle in range(2):
                with self.subTest(cycle=cycle):
                    self.effects.mail.reset_mock()
                    self.assertEqual(pickup.sla_decisions(None, self.root, self.effects), 1)
                    self.effects.mail.assert_called_once()
                    self.assertEqual(self.effects.mail.call_args.args[0], order(NEIGHBOR)["email"])
                    self.assertEqual(path.read_text(), original)
                    self.assertFalse(any(ORDER in key for key in row_calls))
            write_refund.assert_not_called()
        self.assertEqual(json.loads(neighbor_path.read_text())["decision"], "delay_note")

    def test_queued_tap_blocked_before_lookup_in_two_cycles(self):
        self.check_repeated_replay(decision=None)

    def test_recorded_delay_not_replayed_in_two_cycles(self):
        self.check_repeated_replay(decision="delay_note")

    def test_refund_still_requires_distinct_approval(self):
        for order_id in (ORDER, NEIGHBOR):
            (self.cards / f"{order_id}.json").write_text(json.dumps(card(order_id, "delay_note")))
        with patch.object(approval, "_send_card") as send, \
             patch.object(pickup, "refund_decision_rows", return_value=[order(ORDER), order(NEIGHBOR)]), \
             patch.object(pickup, "apply_refund_decision") as write_refund:
            self.assertEqual(pickup.refund_decisions(None, self.root, self.effects), 2)
            send.assert_called_once()
            self.assertEqual(send.call_args.args[0]["request_id"], ORDER)
            self.assertEqual(send.call_args.args[0]["kind"], "sla_missed")
            write_refund.assert_not_called()
        self.assertTrue((self.root / "refund-approvals" / f"{NEIGHBOR}.deferred_to_sla40_card.json").exists())
        self.assertFalse((self.root / "refund-approvals" / f"{ORDER}.deferred_to_sla40_card.json").exists())
        self.effects.mail.assert_not_called()
