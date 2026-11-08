"""One decision card per fast-lane order (N91, order ac6ebe34): fixtures only, no Telegram, no notify, no database."""
import io
import json
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
DEADLINE_TS = NOW + 8 * 3600  # the 48 h deadline: 8 h after "now" (about 40 h after payment)


class Effects:
    dry_run = False


class Fake:
    """Telegram/notify/callback fixtures; records every call."""

    def __init__(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.taps = []          # callback rows (update, chat, message, sender, received, data)
        self.http = []          # (method, payload)
        self.runs = []          # subprocess.run argv
        self.extended = []
        self.keyboards = []

    def urlopen(self, request, timeout=None):
        self.http.append((request.full_url.rsplit("/", 1)[1], json.loads(request.data)))
        return io.StringIO('{"ok": true}')

    def run(self, args, **kwargs):
        self.runs.append([str(a) for a in args])
        import subprocess
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
        patches = [
            mock.patch.object(ra, "telegram_config", return_value=("t", CHAT)),
            mock.patch.object(ra, "CALLBACK_STATUS", self.f.tmp / "status"),
            mock.patch.object(ra, "callback_rows", self.f.callback_rows),
            mock.patch.object(ra, "register_keyboard", lambda m, k, carryable=False: self.f.keyboards.append((m, k))),
            mock.patch.object(ra, "extend_ask", lambda m, e: self.f.extended.append((m, e)) or True),
            mock.patch.object(ra, "close_durable_reply_action", lambda state: True),
            mock.patch.object(ra, "settle_card", self.settle),
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

    @staticmethod
    def settle(state, path, reason, source=None):
        state["settled"] = True
        ra.atomic(path, state)

    # a delivered 40 h card as sla_decision._send_card leaves it, with its exact keys
    def seed_card(self, **extra):
        state = {"request_id": RID, "kind": "sla_40h", "history": [], "card": 1, "notification": "sent",
                 "chat_id": CHAT, "message_id": MSG, "created_at": int(NOW) - 100, "expires_at": int(NOW) - 100 + sd.WINDOW,
                 "delay_key": "sla_d", "refund_key": "sla_r", "noaction_key": "sla_n", "buttons_attached": True, **extra}
        ra.atomic(self.sla_root / f"{RID}.json", state)
        return state

    def sla(self, now=NOW):
        return sd.advance(ROW, self.sla_root, Effects, now, "10 Oct 12:00 UTC", deadline_ts=DEADLINE_TS)

    def sla_state(self):
        return json.loads((self.sla_root / f"{RID}.json").read_text())

    def tap(self, update, key, received, sender=CHAT, chat=CHAT, message=MSG):
        self.f.taps.append((update, chat, message, sender, received, key))

    def refund(self, now):
        return rf.advance(ROW, self.rf_root, Effects, now, "10 Oct 12:00 UTC", sla_root=self.sla_root)

    # 1. delay note, then a Refund press on the same card
    def test_delay_note_keeps_one_refund_button_and_a_later_press_refunds_once(self):
        self.seed_card()
        self.tap(10, "sla_d", NOW - 5)
        self.assertEqual(self.sla(), "delay_note")
        # same message edited: caption says the note was sent; exactly one live button, "Refund in full"
        self.assertEqual(self.f.methods(), ["editMessageText", "editMessageReplyMarkup"])
        text, markup = self.f.http[0][1], self.f.http[1][1]
        self.assertEqual((text["message_id"], markup["message_id"]), (MSG, MSG))
        self.assertIn("Delay note sent", text["text"])
        self.assertIn("refund still possible", text["text"])
        self.assertEqual(markup["reply_markup"]["inline_keyboard"],
                         [[{"text": "Refund in full", "callback_data": "sla_r"}]])
        state = self.sla_state()
        self.assertEqual(state["decision"], "delay_note")
        self.assertEqual(state["late_expires_at"], DEADLINE_TS + sd.WINDOW)
        self.assertNotIn("settled", state)  # the card is not closed yet
        self.assertEqual(self.f.extended, [(MSG, DEADLINE_TS + sd.WINDOW)])
        # no press yet: still delay_note, no second edit
        self.assertEqual(self.sla(NOW + 60), "delay_note")
        self.assertEqual(len(self.f.http), 2)
        # the press (on the follow-up or the card), after the delay tap
        self.tap(11, "sla_r", NOW + 100)
        self.assertEqual(self.sla(NOW + 200), "refund")
        self.assertEqual(sd.reference(self.sla_root, RID), f"telegram:{MSG}:11")
        # idempotent: later cycles name the same press
        self.assertEqual(self.sla(NOW + 300), "refund")
        self.assertEqual(sd.reference(self.sla_root, RID), f"telegram:{MSG}:11")
        self.assertEqual(self.sla_state()["late_update_id"], 11)
        self.assertEqual(self.f.methods()[-1], "editMessageReplyMarkup")
        self.assertEqual(self.f.http[-1][1]["reply_markup"]["inline_keyboard"], [])  # buttons gone once decided

    def test_late_press_must_be_exact_in_window_chat_sender_and_after_the_delay_tap(self):
        self.seed_card()
        self.tap(10, "sla_d", NOW - 5)
        self.sla()
        self.tap(9, "sla_r", NOW + 1)                       # an update older than the delay tap
        self.tap(12, "sla_r", NOW + 1, sender=7)            # foreign sender
        self.tap(13, "sla_r", NOW + 1, chat=7, sender=7)    # foreign chat
        self.tap(14, "sla_other", NOW + 1)                  # not our key
        self.tap(15, "sla_r", DEADLINE_TS + sd.WINDOW + 5)  # after the window
        self.tap(16, "sla_r", NOW + 100_000)                # in the future
        self.assertEqual(self.sla(NOW + 500), "delay_note")
        self.assertNotIn("late_refund", self.sla_state())

    def test_expired_late_window_closes_the_card_without_a_refund(self):
        self.seed_card()
        self.tap(10, "sla_d", NOW - 5)
        self.sla()
        self.tap(11, "sla_r", DEADLINE_TS + sd.WINDOW + 10)  # tapped after the window ended
        late = DEADLINE_TS + sd.WINDOW + 60
        self.assertEqual(self.sla(late), "delay_note")
        state = self.sla_state()
        self.assertTrue(state["late_closed"])
        self.assertNotIn("late_refund", state)
        self.assertEqual(self.f.http[-1][1]["reply_markup"]["inline_keyboard"], [])
        self.assertTrue(state.get("settled"))

    def test_text_never_decides(self):
        self.seed_card()
        self.tap(10, "sla_d", NOW - 5)
        self.sla()
        self.tap(11, "refund in full", NOW + 5)  # a typed word is not the key
        self.tap(12, "sla_r ", NOW + 5)
        self.assertEqual(self.sla(NOW + 10), "delay_note")

    # 2. 48 h with a live 40 h card -> same message edited, nothing sent
    def adopted_run(self, **seed):
        self.seed_card(**seed)
        before = len(self.f.http)
        outcome = self.refund(NOW + 8 * 3600 + 60)
        return outcome, self.f.http[before:]

    def test_48h_edits_the_40h_card_instead_of_sending_a_new_one(self):
        for label, seed in (("delay_note", {"decision": "delay_note", "update_id": 10, "decided_at": NOW - 5,
                                            "late_attached": True, "late_expires_at": DEADLINE_TS + sd.WINDOW}),
                            ("no_action", {"decision": "no_action", "update_id": 10, "decided_at": NOW - 5}),
                            ("pending", {}),
                            ("expired", {"decision": "expired", "settled": True})):
            with self.subTest(label):
                self.reset()
                outcome, calls = self.adopted_run(**seed)
                self.assertEqual(outcome, "pending")
                self.assertEqual([m for m, _ in calls], ["editMessageText", "editMessageReplyMarkup"])
                self.assertTrue(all(p["message_id"] == MSG for _, p in calls))
                self.assertIn("Refund USD 49.00", calls[0][1]["text"])
                state = json.loads((self.rf_root / f"{RID}.json").read_text())
                labels = [b["text"] for b in calls[1][1]["reply_markup"]["inline_keyboard"][0]]
                self.assertEqual(labels, ["Refund in full", "No refund"])
                self.assertEqual(calls[1][1]["reply_markup"]["inline_keyboard"][0][0]["callback_data"], state["refund_key"])
                self.assertEqual(state["message_id"], MSG)
                self.assertEqual(state["adopted_from"], sd.SOURCE)
                self.assertEqual(self.f.keyboards[-1][0], MSG)        # registered via ra.register_keyboard
                self.assertEqual(self.f.extended[-1][0], MSG)         # ask bookkeeping updated, not duplicated
                self.assertFalse([r for r in self.f.runs if "now" in r], self.f.runs)  # no new notify send
                self.assertEqual(self.sla_state()["superseded_by"], rf.SOURCE)
                # the 40 h keys can no longer decide or expire/re-ask the shared message
                self.assertNotEqual(self.sla(NOW + 8 * 3600 + 120), "refund")
                self.assertEqual(len(self.f.http), 2)

    def reset(self):
        """A fresh fixture world inside one test (subTest loops); the patches keep pointing at self.f."""
        self.f.__init__()
        self.sla_root, self.rf_root = self.f.tmp / "sla", self.f.tmp / "refund"

    def test_48h_buttons_on_the_shared_card_decide_exactly_once(self):
        self.seed_card(decision="delay_note", update_id=10, decided_at=NOW - 5, late_attached=True,
                       late_expires_at=DEADLINE_TS + sd.WINDOW)
        now = NOW + 8 * 3600 + 60
        self.assertEqual(self.refund(now), "pending")
        key = json.loads((self.rf_root / f"{RID}.json").read_text())["refund_key"]
        self.tap(20, "sla_r", now + 5)            # the superseded 40 h key does nothing
        self.assertEqual(self.refund(now + 10), "pending")
        self.tap(21, key, now + 20)
        self.assertEqual(self.refund(now + 30), "refund")
        self.assertEqual(rf.reference(self.rf_root, RID), f"telegram:{MSG}:21")
        self.assertEqual(self.refund(now + 40), "refund")
        self.assertEqual(rf.reference(self.rf_root, RID), f"telegram:{MSG}:21")

    def test_48h_without_a_usable_40h_card_sends_a_fresh_card_as_before(self):
        cases = {"no_card": None,
                 "unknown_delivery": {"notification": "unknown"},
                 "attempted": {"notification": "attempted"},
                 "no_message": {"message_id": None}}
        for label, seed in cases.items():
            with self.subTest(label):
                self.reset()
                if seed is not None:
                    self.seed_card(**seed)
                self.refund(NOW + 8 * 3600 + 60)
                sent = [r for r in self.f.runs if "now" in r and "--dry-run" not in r]
                self.assertEqual(len(sent), 1, label)
                self.assertNotIn("editMessageText", self.f.methods(), label)  # nothing is rewritten without a usable card

    def test_owner_managed_order_never_adopts_a_card(self):
        owner = "114b6e41-14c5-42b1-9a35-386ab83b62e9"
        row = dict(ROW, id=owner)
        ra.atomic(self.sla_root / f"{owner}.json", {"request_id": owner, "kind": "sla_40h", "notification": "sent",
                                                    "chat_id": CHAT, "message_id": MSG})
        self.assertIsNone(rf._adoptable_sla_card(self.sla_root, row))
        self.assertEqual(sd.advance(row, self.sla_root, Effects, NOW, "x", deadline_ts=DEADLINE_TS), "owner_managed")
        self.assertEqual(self.f.http, [])

    def test_failed_edit_retries_the_same_message_then_falls_back_to_a_fresh_card(self):
        self.seed_card()
        with mock.patch.object(ra, "edit_card_text", side_effect=ValueError("caption edit failed")):
            for _ in range(3):
                self.assertEqual(self.refund(NOW + 8 * 3600 + 60), "pending")
            self.assertEqual([r for r in self.f.runs if "now" in r], [])  # never a second card while retrying
            self.refund(NOW + 8 * 3600 + 60)
        self.assertEqual(len([r for r in self.f.runs if "now" in r and "--dry-run" not in r]), 1)

    def test_no_double_refund_after_a_40h_refund(self):
        self.seed_card(decision="refund", update_id=10, decided_at=NOW - 5)
        self.assertIsNone(rf._adoptable_sla_card(self.sla_root, ROW))
        self.seed_card(decision="delay_note", update_id=10, decided_at=NOW - 5, late_refund=True, late_update_id=11)
        self.assertIsNone(rf._adoptable_sla_card(self.sla_root, ROW))

    def test_adopted_card_expires_like_a_48h_card(self):
        self.seed_card(decision="delay_note", update_id=10, decided_at=NOW - 5, late_attached=True,
                       late_expires_at=DEADLINE_TS + sd.WINDOW)
        now = NOW + 8 * 3600 + 60
        self.refund(now)
        state = json.loads((self.rf_root / f"{RID}.json").read_text())
        self.assertEqual(state["expires_at"], int(now) + rf.WINDOW)
        # the shared message is never re-asked as a 40 h card
        self.assertEqual(self.sla(now + rf.WINDOW + 60), "delay_note")


if __name__ == "__main__":
    unittest.main()
