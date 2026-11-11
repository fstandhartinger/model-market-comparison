"""One decision card per fast-lane order (N91): fixtures only, no Telegram, no notify, no database.

After "Send delay note" / "No action" the 40 h card keeps exactly one live "Refund in full" button until its
existing expires_at; the 48 h card is deferred while it is live. Captions are never edited."""
import io
import json
import subprocess
import sys
import tempfile
import unittest
import urllib.request
import uuid
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import refund_approval as rf  # noqa: E402
import refusal_approval as ra  # noqa: E402
import sla_decision as sd  # noqa: E402

RID = str(uuid.uuid4())
ROW = {"id": RID, "customer_name": "Metask", "email": "o@example.com", "model_name": "m", "amount_total": 4900,
       "paid_at": "2026-10-09T00:00:00+00:00", "status": "paid", "stripe_mode": "live", "synthetic_test": False}
CHAT, MSG = 42, 5150
NOW = 1_000_000.0
EXPIRES = int(NOW) - 100 + sd.WINDOW


class Effects:
    dry_run = False


class Fake:
    def __init__(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.taps = []
        self.http = []
        self.runs = []
        self.keyboards = []

    def urlopen(self, request, timeout=None):
        self.http.append((request.full_url.rsplit("/", 1)[1], json.loads(request.data)))
        return io.StringIO('{"ok": true}')

    def run(self, args, **kwargs):
        self.runs.append([str(a) for a in args])
        out = "[DRY RUN] would send to the chat\n" if "--dry-run" in args else "MESSAGE_ID=9999\n"
        return subprocess.CompletedProcess(args, 0, stdout=out, stderr="")

    def callback_rows(self, keys, chat):
        return [t for t in self.taps if t[5] in keys and t[1] == chat and t[3] == chat]

    def methods(self):
        return [m for m, _ in self.http]


class OneCard(unittest.TestCase):
    def setUp(self):
        self.f = Fake()
        self.sla_root = self.f.tmp / "sla"
        self.rf_root = self.f.tmp / "refund"
        self.resolved = []
        patches = [
            mock.patch.object(ra, "telegram_config", return_value=("t", CHAT)),
            mock.patch.object(ra, "CALLBACK_STATUS", self.f.tmp / "status"),
            mock.patch.object(ra, "callback_rows", self.f.callback_rows),
            mock.patch.object(ra, "register_keyboard", lambda m, k, carryable=False: self.f.keyboards.append((m, k))),
            mock.patch.object(ra, "close_durable_reply_action", lambda state: True),
            mock.patch.object(ra, "settle_card", self.settle),
            mock.patch.object(sd, "_resolve_ask", lambda s, p, d: self.resolved.append(d) or True),
            mock.patch.object(sd, "live_runtime", return_value=True),
            mock.patch.object(rf, "live_runtime", return_value=True),
            mock.patch.object(urllib.request, "urlopen", self.f.urlopen),
            mock.patch("subprocess.run", self.f.run),
            mock.patch("autopickup.decision_context_line", lambda row, t: t.format(customer="Metask", model="m")),
            mock.patch("autopickup.eur_phrase", lambda amount: ""),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    def settle(self, state, path, reason, source=None):
        state["settled"] = True
        state["settled_reason"] = reason
        ra.atomic(path, state)

    def seed_card(self, **extra):
        state = {"request_id": RID, "kind": "sla_40h", "history": [], "card": 1, "notification": "sent",
                 "chat_id": CHAT, "message_id": MSG, "created_at": int(NOW) - 100, "expires_at": EXPIRES,
                 "delay_key": "sla_d", "refund_key": "sla_r", "noaction_key": "sla_n", "buttons_attached": True, **extra}
        ra.atomic(self.sla_root / f"{RID}.json", state)

    def sla(self, now=NOW, row=ROW):
        return sd.advance(row, self.sla_root, Effects, now, "10 Oct 12:00 UTC")

    def state(self):
        return json.loads((self.sla_root / f"{RID}.json").read_text())

    def tap(self, update, key, received, sender=CHAT, chat=CHAT):
        self.f.taps.append((update, chat, MSG, sender, received, key))

    def refund(self, now, row=ROW):
        return rf.advance(row, self.rf_root, Effects, now, "10 Oct 12:00 UTC", sla_root=self.sla_root)

    def keyboard_edits(self):
        return [p["reply_markup"]["inline_keyboard"] for m, p in self.f.http if m == "editMessageReplyMarkup"]

    def decided(self, first, key, update=10):
        self.seed_card()
        self.tap(update, key, NOW - 5)
        self.assertEqual(self.sla(), first)

    def check_flow(self, first, key):
        self.decided(first, key)
        # keeps exactly one live Refund button, ask stays open, nothing settled yet
        self.assertEqual(self.keyboard_edits()[-1], [[{"text": "Refund in full", "callback_data": "sla_r"}]])
        self.assertEqual((self.resolved, self.state().get("settled")), ([], None))
        self.assertEqual(self.sla(NOW + 60), first)  # no press yet: stays, no second edit
        self.assertEqual(len(self.keyboard_edits()), 1)
        self.tap(11, "sla_r", NOW + 30)
        self.assertEqual(self.sla(NOW + 60), "refund")
        self.assertEqual(sd.reference(self.sla_root, RID), "telegram:5150:11")
        self.assertEqual(self.resolved, ["refund"])
        self.assertEqual(self.keyboard_edits()[-1], [])
        self.assertEqual(self.state()["expires_at"], EXPIRES)  # never extended
        # idempotent: the same press is recorded once
        self.assertEqual(self.sla(NOW + 120), "refund")
        self.assertEqual(sd.reference(self.sla_root, RID), "telegram:5150:11")
        self.assertEqual(self.resolved, ["refund"])
        self.assertNotIn("editMessageText", self.f.methods())

    def test_delay_note_then_refund_press(self):
        self.check_flow("delay_note", "sla_d")

    def test_no_action_then_refund_press(self):
        self.check_flow("no_action", "sla_n")

    def test_press_older_than_first_decision_is_ignored(self):
        self.decided("delay_note", "sla_d", update=10)
        self.tap(9, "sla_r", NOW + 10)   # update older than the first decision
        self.tap(10, "sla_r", NOW + 10)  # the decision's own update id
        self.assertEqual(self.sla(NOW + 60), "delay_note")
        self.assertNotIn("late_refund", self.state())

    def test_foreign_chat_or_sender_is_ignored(self):
        self.decided("delay_note", "sla_d")
        self.tap(12, "sla_r", NOW + 10, sender=99)
        self.tap(13, "sla_r", NOW + 10, chat=99)
        self.assertEqual(self.sla(NOW + 60), "delay_note")
        self.assertNotIn("late_refund", self.state())

    def test_press_after_expiry_is_ignored_and_card_closes(self):
        self.decided("no_action", "sla_n")
        self.tap(14, "sla_r", EXPIRES + 5)
        self.assertEqual(self.sla(EXPIRES + 10), "no_action")
        st = self.state()
        self.assertNotIn("late_refund", st)
        self.assertTrue(st["late_closed"])
        self.assertEqual(self.keyboard_edits()[-1], [])
        self.assertEqual(self.resolved, ["no_action"])
        self.assertTrue(st["settled"])
        self.assertEqual(st["expires_at"], EXPIRES)

    def test_48h_deferred_while_40h_card_live_then_sent_after_expiry(self):
        self.decided("delay_note", "sla_d")
        self.f.runs.clear()
        self.assertEqual(self.refund(NOW + 60), "pending")
        self.assertEqual(self.refund(NOW + 120), "pending")
        self.assertEqual([r for r in self.f.runs if "now" in r], [])  # no 48 h card
        self.assertFalse((self.rf_root / f"{RID}.json").exists())
        notes = list(self.rf_root.glob("*.deferred_to_sla40_card.json"))
        self.assertEqual(len(notes), 1)
        # after the 40 h card expires without a Refund press, the normal 48 h card follows
        self.sla(EXPIRES + 10)
        self.assertEqual(self.refund(EXPIRES + 20), "pending")
        self.assertTrue(any("now" in r and "--dry-run" not in r for r in self.f.runs))
        self.assertTrue((self.rf_root / f"{RID}.json").exists())

    def test_48h_without_a_sent_40h_card_is_unchanged(self):
        for label, extra in (("no state", None), ("unknown", {"notification": "unknown"}),
                             ("undecided", {"decision": None}), ("expired-card", {"decision": "expired"})):
            with self.subTest(label):
                self.f.runs.clear()
                rf_root = self.f.tmp / f"rf-{label}"
                sla_root = self.f.tmp / f"sla-{label}"
                if extra is not None:
                    state = {"request_id": RID, "kind": "sla_40h", "notification": "sent", "chat_id": CHAT,
                             "message_id": MSG, "expires_at": EXPIRES, **extra}
                    ra.atomic(sla_root / f"{RID}.json", state)
                rf.advance(ROW, rf_root, Effects, NOW, "10 Oct 12:00 UTC", sla_root=sla_root)
                self.assertTrue(any("now" in r and "--dry-run" not in r for r in self.f.runs), label)

    def test_owner_managed_unchanged(self):
        owner = {**ROW, "id": next(iter(sd.OWNER_MANAGED_40H))}
        self.seed_card(request_id=owner["id"], decision="delay_note", update_id=1, decided_at=NOW - 5,
                       late_attached=True)
        ra.atomic(self.sla_root / f"{owner['id']}.json", {**json.loads((self.sla_root / f"{RID}.json").read_text()),
                                                           "request_id": owner["id"]})
        self.assertEqual(self.sla(row=owner), "owner_managed")
        self.f.runs.clear()
        self.refund(NOW, row=owner)
        self.assertTrue(any("now" in r and "--dry-run" not in r for r in self.f.runs))

    def test_40h_refund_means_no_48h_card(self):
        self.decided("delay_note", "sla_d")
        self.tap(11, "sla_r", NOW + 30)
        self.assertEqual(self.sla(NOW + 60), "refund")
        self.f.runs.clear()
        # the caller writes refund_decision=approved, so refund_decision_rows no longer lists the order; and if it
        # still did, the late_refund state defers nothing and the row is already decided upstream.
        self.assertEqual(self.sla(NOW + 90), "refund")
        self.assertEqual(self.resolved, ["refund"])

    def test_48h_card_not_deferred_once_the_order_left_the_open_set(self):
        # CR-732 (S1): a late delivery or refusal moves the row to refund_due/refund_pending; the 40 h sweep stops
        # polling its card, so the 40 h card is closed (never a refund) and the 48 h card asks now.
        self.decided("no_action", "sla_n")
        self.f.runs.clear()
        for status in ("refund_due", "refund_pending"):
            with self.subTest(status):
                self.assertEqual(self.refund(NOW + 60, row={**ROW, "status": status}), "pending")
        st = self.state()
        self.assertTrue(st["late_closed"] and st["superseded"])
        self.assertNotIn("late_refund", st)
        # no dead Refund button left on the 40 h card (the later edit is the new 48 h card's keyboard)
        cleared = [p for m, p in self.f.http if m == "editMessageReplyMarkup" and p.get("message_id") == MSG
                   and p["reply_markup"]["inline_keyboard"] == []]
        self.assertEqual(len(cleared), 1)
        self.assertTrue(st["buttons_removed"])
        self.assertEqual(st["settled_reason"], sd.SETTLED["superseded"])
        self.assertTrue(any("now" in r and "--dry-run" not in r for r in self.f.runs))  # one 48 h card
        self.assertEqual(len([r for r in self.f.runs if "now" in r and "--dry-run" not in r]), 1)
        self.assertFalse(list(self.rf_root.glob("*.deferred_to_sla40_card.json")))
        self.assertEqual(sd.close_superseded(self.sla_root, ROW), False)  # idempotent

    def test_open_order_is_still_deferred(self):
        self.decided("delay_note", "sla_d")
        self.assertEqual(self.refund(NOW + 60, row={**ROW, "status": "review_passed"}), "pending")
        self.assertFalse(self.state().get("late_closed"))
        self.assertTrue(list(self.rf_root.glob("*.deferred_to_sla40_card.json")))

    def test_failed_closeout_after_expiry_is_retried_and_bounded(self):
        # CR-732 (S2): late_closed is saved before the close-out; a failed settle must be retried, not dropped.
        self.decided("no_action", "sla_n")
        fails = {"n": 0}

        def flaky(state, path, reason, source=None):
            fails["n"] += 1
            state["settled"] = fails["n"] >= 3
            ra.atomic(path, state)
        with mock.patch.object(ra, "settle_card", flaky):
            self.sla(EXPIRES + 10)
            self.assertFalse(self.state()["closeout_done"])
            self.sla(EXPIRES + 20)
            self.sla(EXPIRES + 30)
            self.assertTrue(self.state()["closeout_done"])
            self.sla(EXPIRES + 40)
        self.assertEqual(fails["n"], 3)  # no further attempts once done
        with mock.patch.object(ra, "settle_card", lambda *a, **k: None):  # never succeeds: bounded
            self.seed_card(decision="no_action", update_id=1, decided_at=NOW - 5, late_attached=True,
                           late_closed=True, closeout_tries=0)
            for i in range(sd.CLOSEOUT_TRIES + 5):
                self.sla(EXPIRES + 100 + i)
            self.assertEqual(self.state()["closeout_tries"], sd.CLOSEOUT_TRIES)

    def test_no_edit_message_text_anywhere(self):
        self.assertFalse(hasattr(ra, "edit_card_text"))
        self.assertFalse(hasattr(ra, "extend_ask"))
        for name in ("refusal_approval.py", "refund_approval.py", "sla_decision.py"):
            self.assertNotIn("editMessageText", (HERE / name).read_text())


if __name__ == "__main__":
    unittest.main()
