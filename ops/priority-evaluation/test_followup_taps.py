"""A refund or SLA tap counts on a follow-up that carries the same buttons (Florian, 2 Nov 2026, card 19156)."""
import unittest

import refund_approval as rf
import refusal_approval as ra
import sla_decision as sd

NOW = 1000.0


def refund_state():
    return {"chat_id": 456, "message_id": 123, "created_at": 900, "expires_at": 2000, "refund_key": "r", "decline_key": "d"}


def sla_state():
    return {"chat_id": 456, "message_id": 123, "created_at": 900, "expires_at": 2000, "delay_key": "l", "refund_key": "r",
            "noaction_key": "n"}


class FollowUpTaps(unittest.TestCase):
    def test_tap_on_follow_up_decides_and_the_audit_names_that_message(self):
        for module, state, data, decision in ((rf, refund_state(), "r", "refund"), (sd, sla_state(), "l", "delay_note")):
            module.apply_callbacks(state, [(4, 456, 999, 456, NOW, data)], NOW)
            self.assertEqual((state["decision"], state["update_id"], state["tap_message_id"]), (decision, 4, 999))

    def test_wrong_key_sender_chat_or_time_never_decides(self):
        rows = [(1, 456, 999, 456, NOW, "other"), (2, 456, 999, 111, NOW, "r"), (3, 777, 999, 777, NOW, "r"),
                (4, 456, 999, 456, 800.0, "r"), (5, 456, 999, 456, NOW + 1, "r"), (6, 456, 999, 456, "bad", "r")]
        for module, state in ((rf, refund_state()), (sd, sla_state())):
            module.apply_callbacks(state, rows, NOW)
            self.assertNotIn("decision", state)

    def test_email_approval_stays_bound_to_the_card_with_the_draft(self):
        state = {"chat_id": 456, "message_id": 123, "created_at": 900, "expires_at": 2000, "send_key": "s", "keep_key": "k"}
        ra.apply_callbacks(state, [(1, 456, 999, 456, NOW, "s")], NOW)
        self.assertNotIn("decision", state)


if __name__ == "__main__":
    unittest.main()
