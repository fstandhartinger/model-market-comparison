#!/usr/bin/env python3
"""N118 (15 Nov 2026, f62aeab1): an owned order whose official pod measurement is complete stays quiet until 3 h.

Synthetic: no DB, unit, board post or notification.
Run: python3 -m unittest ops/priority-evaluation/test_measured_release.py -v
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path
from unittest import mock

os.environ["FASTLANE_HOST_EVIDENCE_OFFLINE"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parent))
import autopickup as ap  # noqa: E402
import native_owner as no  # noqa: E402

RID = "f62aeab1-97ee-4340-85de-a4a513757a6d"
VALID = {"request_id": RID, "measurement_completed": True, "torn_down_at": "2026-11-15T06:04:25.217855+00:00",
         "pod_id": None, "cleanup_uncertain": False, "last_pod_id": "pod-x", "creation_attempts": 1,
         "ended_at": "2026-11-15T06:04:30.000000+00:00", "cost_estimate_usd": 1.25}
# What pod_runner leaves when the pod finished but the host-side row check failed (no receipt.json written):
# measurement_completed and torn_down_at are set, ended_at / cost_estimate_usd are not (CR-764 review MUST 1).
HOST_CHECK_FAILED = {k: v for k, v in VALID.items() if k not in ("ended_at", "cost_estimate_usd")}


class Base(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="measured-release-"))
        self.pods = self.tmp / "state" / "pods"
        self.pods.mkdir(parents=True)
        (self.tmp / "state" / "requests").mkdir(parents=True)
        self.patches = [mock.patch.object(ap, "HOME", self.tmp), mock.patch.object(ap, "STATE_ROOT", self.tmp / "state"),
                        mock.patch.object(ap, "JOB_ROOT", self.tmp / "orders"),
                        mock.patch.object(ap.pod_runner, "PODS_DIR", self.pods),  # same path as STATE_ROOT / "pods"
                        mock.patch.object(ap.subprocess, "run", return_value=subprocess.CompletedProcess([], 3, "inactive\n", ""))]
        for patch in self.patches:
            patch.start()
        self.now = ap.utcnow()
        self.owner = no.owner_name(RID)

    def tearDown(self) -> None:
        for patch in reversed(self.patches):
            patch.stop()

    def pod(self, record: object | None = None, raw: str | None = None) -> None:
        path = self.pods / f"{RID}.json"
        path.write_text(raw if raw is not None else json.dumps(record), encoding="utf-8")

    def live_owner(self, text: str | None = None) -> None:
        path = self.tmp / "jobs" / self.owner / "STATE.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text or f"# STATE\n- {RID} measured, scoring\n", encoding="utf-8")
        (path.parent / "PROMPT.md").write_text("owner\n", encoding="utf-8")
        no.receipt(path.parent, {"order": RID, "launched": True})

    def row(self, hours_left: float) -> dict:
        paid = self.now - timedelta(hours=48) + timedelta(hours=hours_left)
        return {"id": RID, "status": "paid", "evaluation_status": "pending", "paid_at": ap.iso(paid),
                "customer_name": "C", "model_name": "M", "sla_36h_alerted_at": ap.iso(paid + timedelta(hours=36))}


class MeasuredRecordTests(Base):
    def test_valid_record_is_measured(self) -> None:
        self.pod(VALID)
        self.assertTrue(ap.measured_awaiting_release(RID))
        self.assertEqual(ap.owned_hold_margin(RID), ap.MEASURED_RELEASE_MARGIN)

    def test_missing_unreadable_or_empty_record_is_not_measured(self) -> None:
        self.assertFalse(ap.measured_awaiting_release(RID))  # no file
        self.assertEqual(ap.owned_hold_margin(RID), ap.OWNED_HOLD_DEADLINE_MARGIN)
        for raw in ("", "{broken", "[]", "null", "{}", '"text"'):
            self.pod(raw=raw)
            self.assertFalse(ap.measured_awaiting_release(RID), repr(raw))
            self.assertEqual(ap.owned_hold_margin(RID), ap.OWNED_HOLD_DEADLINE_MARGIN, repr(raw))

    def test_valid_fields_mixed_with_one_empty_or_wrong_field_is_not_measured(self) -> None:
        bad = [("measurement_completed", False), ("measurement_completed", "true"), ("measurement_completed", 1),
               ("measurement_completed", None), ("torn_down_at", ""), ("torn_down_at", None), ("torn_down_at", "synthetic"),
               ("torn_down_at", 1731650665), ("pod_id", "pod-live"), ("pod_id", ""), ("cleanup_uncertain", True),
               ("cleanup_uncertain", None), ("scored_dispatch_uncertain", True), ("request_id", ""),
               ("request_id", None), ("request_id", "11111111-1111-4111-8111-111111111111")]
        for key, value in bad:
            self.pod(dict(VALID, **{key: value}))
            self.assertFalse(ap.measured_awaiting_release(RID), (key, value))
        for key, value in (("ended_at", ""), ("ended_at", None), ("ended_at", "synthetic"), ("cost_estimate_usd", None),
                           ("cost_estimate_usd", "1.25"), ("cost_estimate_usd", True)):
            self.pod(dict(VALID, **{key: value}))
            self.assertFalse(ap.measured_awaiting_release(RID), (key, value))
        for key in ("measurement_completed", "torn_down_at", "cleanup_uncertain", "request_id", "ended_at",
                    "cost_estimate_usd"):
            self.pod({k: v for k, v in VALID.items() if k != key})
            self.assertFalse(ap.measured_awaiting_release(RID), f"missing {key}")
        self.pod(dict(VALID, scored_dispatch_uncertain=False))
        self.assertTrue(ap.measured_awaiting_release(RID))

    def test_host_check_failure_record_is_not_measured(self) -> None:
        self.pod(HOST_CHECK_FAILED)
        self.assertFalse(ap.measured_awaiting_release(RID))
        self.assertEqual(ap.owned_hold_margin(RID), ap.OWNED_HOLD_DEADLINE_MARGIN)

    def test_failed_remeasurement_after_a_success_is_not_measured(self) -> None:
        # An older successful run's ended_at stays; the new attempt's torn_down_at is later (fix check F2).
        self.pod(dict(VALID, torn_down_at="2026-11-16T09:00:00+00:00"))
        self.assertFalse(ap.measured_awaiting_release(RID))
        self.assertFalse(ap.measured_awaiting_release(RID, {"operational_hold": {"reason": "native_runtime_build"}}))

    def test_invalid_measurement_hold_reason_is_not_measured(self) -> None:
        self.pod(VALID)
        for reason in sorted(ap.MEASUREMENT_INVALID_REASONS):
            state = {"operational_hold": {"reason": reason, "transient": False}}
            self.assertFalse(ap.measured_awaiting_release(RID, state), reason)
            self.assertEqual(ap.owned_hold_margin(RID, state), ap.OWNED_HOLD_DEADLINE_MARGIN, reason)
        self.assertTrue(ap.measured_awaiting_release(RID, {"operational_hold": {"reason": "unsupported_measurement_backend"}}))

    def test_undecodable_or_deeply_nested_file_is_not_measured(self) -> None:
        (self.pods / f"{RID}.json").write_bytes(b'{"request_id": "\xff\xfe' + bytes([0xff, 0xfe]) + b'"}')
        self.assertFalse(ap.measured_awaiting_release(RID))
        self.pod(raw="[" * 100_000 + "]" * 100_000)
        self.assertFalse(ap.measured_awaiting_release(RID))

    def test_other_orders_record_does_not_count(self) -> None:
        other = "11111111-1111-4111-8111-111111111111"
        (self.pods / f"{other}.json").write_text(json.dumps(dict(VALID, request_id=other)), encoding="utf-8")
        self.assertFalse(ap.measured_awaiting_release(RID))
        self.assertTrue(ap.measured_awaiting_release(other))


class NativeRescueTests(Base):
    def setUp(self) -> None:
        super().setUp()
        (self.tmp / "orders" / RID / "trusted-runner").mkdir(parents=True)
        self.state = {"id": RID, "steps": {}, "alerts": {},
                      "operational_hold": {"reason": "unsupported_measurement_backend", "transient": False,
                                           "owner": self.owner},
                      "native_owner": {"job": self.owner, "requested_at": ap.iso(self.now - timedelta(hours=30)),
                                       "starts": 1, "start_ok": True}}
        self.effects = mock.Mock()
        self.effects.start_unit.return_value = True
        self.effects.board.return_value = True

    def test_measured_live_owner_stays_quiet_until_three_hours(self) -> None:
        self.live_owner()
        self.pod(VALID)
        for left, quiet in ((11, True), (4, True), (2.9, False)):
            self.assertEqual(ap.ensure_native_owner(self.row(left), self.state, self.effects, self.now,
                                                    "unsupported_measurement_backend"), quiet, left)
        self.effects.start_unit.assert_not_called()

    def test_unmeasured_or_partial_record_keeps_the_twelve_hour_margin(self) -> None:
        self.live_owner()
        for record in (None, dict(VALID, torn_down_at=""), dict(VALID, measurement_completed=False), {}):
            if record is not None:
                self.pod(record)
            self.assertFalse(ap.ensure_native_owner(self.row(4), self.state, self.effects, self.now,
                                                    "unsupported_measurement_backend"), record)
            self.assertTrue(ap.ensure_native_owner(self.row(13), self.state, self.effects, self.now,
                                                   "unsupported_measurement_backend"), record)

    def test_measured_order_with_dead_owner_is_not_quiet_by_itself(self) -> None:
        self.live_owner(f"# STATE\n- {RID} delivered\n- FINAL DONE\n")
        self.pod(VALID)
        self.state["native_owner"]["starts"] = no.MAX_STARTS
        self.assertFalse(ap.ensure_native_owner(self.row(10), self.state, self.effects, self.now,
                                                "unsupported_measurement_backend"))
        self.effects.start_unit.assert_not_called()

    def test_measured_order_with_dead_owner_and_a_restart_left_keeps_the_twelve_hour_card(self) -> None:
        self.live_owner(f"# STATE\n- {RID} delivered\n- FINAL DONE\n")
        self.pod(VALID)
        self.state["native_owner"]["starts"] = 1
        self.assertLess(1, no.MAX_STARTS)
        self.assertFalse(ap.ensure_native_owner(self.row(10), self.state, self.effects, self.now,
                                                "unsupported_measurement_backend"))
        self.effects.start_unit.assert_called_once()  # restarted, but not quietly
        self.state["native_owner"] = {"job": self.owner, "requested_at": ap.iso(self.now - timedelta(hours=30)),
                                      "starts": 1, "start_ok": True}
        self.effects.start_unit.reset_mock()
        self.assertTrue(ap.ensure_native_owner(self.row(13), self.state, self.effects, self.now,
                                               "unsupported_measurement_backend"))
        self.effects.start_unit.assert_called_once()

    def test_measured_live_owner_with_invalid_measurement_hold_keeps_twelve_hours(self) -> None:
        self.live_owner()
        self.pod(VALID)
        self.state["operational_hold"]["reason"] = "partial_measurement_requires_reconciliation"
        with mock.patch.object(ap, "native_owner_due", return_value=True):
            self.assertFalse(ap.ensure_native_owner(self.row(10), self.state, self.effects, self.now,
                                                    "partial_measurement_requires_reconciliation"))

    def test_escalation_card_waits_for_three_hours_when_measured(self) -> None:
        self.live_owner()
        self.pod(VALID)
        with mock.patch.object(ap, "alert") as alert:
            ap.operational_escalate(self.row(6), self.state, self.effects, self.now, "unsupported_measurement_backend",
                                    exhausted=False)
        alert.assert_not_called()
        with mock.patch.object(ap, "alert") as alert:
            ap.operational_escalate(self.row(2), self.state, self.effects, self.now, "unsupported_measurement_backend",
                                    exhausted=False)
        self.assertTrue(alert.call_args.kwargs["urgent"])


class Handoff36Tests(Base):
    def setUp(self) -> None:
        super().setUp()
        self.state = {"id": RID, "steps": {"sla24_handoff": {"status": "done"}}, "alerts": {},
                      "operational_hold": {"reason": "unsupported_measurement_backend", "transient": False,
                                           "owner": self.owner}}
        self.effects = mock.Mock()
        self.effects.board.return_value = True

    def run_handoff(self, hours_left: float) -> None:
        row = self.row(hours_left)
        row["sla_24h_alerted_at"] = row["paid_at"]
        ap.advance_sla_handoffs(row, self.state, self.effects, self.now, self.tmp / "orders")

    def test_measured_live_owner_defers_without_consuming_the_step(self) -> None:
        self.live_owner()
        self.pod(VALID)
        self.run_handoff(10)
        self.effects.board.assert_not_called()
        self.assertFalse(ap.step_done(self.state, "sla36_handoff"))
        self.run_handoff(2.5)
        self.assertIn("36 hours after payment", self.effects.board.call_args.args[0])
        self.assertTrue(ap.step_done(self.state, "sla36_handoff"))

    def test_unmeasured_partial_or_unowned_still_hands_off_at_36_hours(self) -> None:
        cases = [("no record", None, True, False), ("partial record", dict(VALID, pod_id="pod-live"), True, False),
                 ("empty record", {}, True, False), ("dead owner", VALID, False, False),
                 ("transient hold", VALID, True, True)]
        for name, record, live, transient in cases:
            self.state = {"id": RID, "steps": {"sla24_handoff": {"status": "done"}}, "alerts": {},
                          "operational_hold": {"reason": "unsupported_measurement_backend", "transient": transient,
                                               "owner": self.owner}}
            for path in self.pods.glob("*.json"):
                path.unlink()
            if record is not None:
                self.pod(record)
            self.live_owner(None if live else f"# STATE\n- {RID}\n- FINAL DONE\n")
            self.effects.board.reset_mock()
            self.run_handoff(10)
            self.assertTrue(self.effects.board.called, name)
            self.assertTrue(ap.step_done(self.state, "sla36_handoff"), name)


class NativeApiCompletionTests(Base):
    def setUp(self) -> None:
        super().setUp()
        # The exact order is the sole admission, but fixtures carry no real evaluation evidence.
        self.rid = "f193d3ab-8ae4-4eef-a93b-cdf0264d9798"
        self.owner = no.owner_name(self.rid)
        self.paid = ap.iso(self.now - timedelta(hours=38))
        self.native_row = {"id": self.rid, "access_type": "api_endpoint", "synthetic_test": False,
                           "status": "paid", "evaluation_status": "pending", "evaluation_attempts": 0,
                           "resubmission_count": 0, "paid_at": self.paid, "sla_36h_alerted_at": self.paid}
        self.state = {"id": self.rid, "steps": {"sla36_handoff": {"status": "done"}},
                      "operational_hold": {"owner": self.owner, "reason": "unsupported_measurement_backend",
                                           "transient": False}}
        self.receipts = self.tmp / "jobs" / self.owner / "receipts"
        self.receipts.mkdir(parents=True)
        fixture_pins = {}
        for name in ("VALIDATION-1121.json", "CONSUMED-1121.md"):
            fixture = name.encode()
            (self.receipts / name).write_bytes(fixture)
            fixture_pins[name] = hashlib.sha256(fixture).hexdigest()
        key = hashlib.sha256(f"{self.rid}\n{self.paid}".encode()).hexdigest()
        pins = mock.patch.dict(ap.NATIVE_API_COMPLETIONS, {key: fixture_pins}, clear=True)
        pins.start()
        self.addCleanup(pins.stop)

    def test_requires_both_pinned_receipts_and_original_paid_attempt(self) -> None:
        complete = ap.native_api_measurement_completed
        self.assertTrue(complete(self.native_row, self.state))
        for change in ({"id": RID}, {"synthetic_test": True}, {"paid_at": ap.iso(self.now)},
                       {"resubmission_count": 1}, {"evaluation_attempts": 1}, {"access_type": "open_weights"}):
            with self.subTest(change=change):
                self.assertFalse(complete(dict(self.native_row, **change), self.state))
        self.assertFalse(complete(self.native_row, {"operational_hold": {"reason": "existing_measurement_receipt_changed"}}))
        custody = self.receipts / "CONSUMED-1121.md"
        custody.write_bytes(b"tampered")
        self.assertFalse(complete(self.native_row, self.state))
        custody.unlink()
        self.assertFalse(complete(self.native_row, self.state))
        redirected = self.tmp / custody.name
        redirected.write_bytes(custody.name.encode())
        custody.symlink_to(redirected)
        self.assertFalse(complete(self.native_row, self.state))

    def test_real_entry_points_recognize_measurement_without_start_or_status_write(self) -> None:
        effects = mock.Mock(dry_run=False)
        ap.save_state(self.state)
        self.assertTrue(ap.measurement_started(self.rid, self.tmp / "orders", row=self.native_row))
        with mock.patch.object(ap, "update_row") as update, mock.patch.object(ap, "operational_escalate") as escalate:
            ap.manage_evaluation(self.native_row, self.state, effects, self.now)
        update.assert_not_called()
        escalate.assert_not_called()
        self.assertEqual(effects.mock_calls, [])
        self.assertEqual(ap.load_state(self.rid)["operational_hold"], self.state["operational_hold"])

    def test_release_handoff_has_own_retry_and_keeps_paid_deadline(self) -> None:
        for name in ("STATE.md", "PROMPT.md"):
            (self.receipts.parent / name).write_text(self.rid)
        no.receipt(self.receipts.parent, {"order": self.rid, "launched": True})
        effects = mock.Mock()
        effects.board.return_value = True
        root = self.tmp / "orders"
        ap.advance_sla_handoffs(self.native_row, self.state, effects, self.now, root)
        effects.board.assert_not_called()
        late = ap.deadline_for(self.native_row)
        ap.advance_sla_handoffs(self.native_row, self.state, effects, late, root)
        message, owner = effects.board.call_args.args
        self.assertIn("validated native API measurement", message)
        self.assertIn(late.isoformat(), message)
        self.assertIn("Refunds need Florian's button", message)
        self.assertEqual(owner, self.owner)
        ap.advance_sla_handoffs(self.native_row, self.state, effects, late, root)
        effects.board.assert_called_once()


    def test_stale_parked_owner_needs_a_pending_wake_for_this_order(self) -> None:
        self.live_owner(f"# STATE\n- {self.rid}\n- PARKED\n")
        no.receipt(self.receipts.parent, {"order": self.rid, "launched": True})
        stamp = (self.now - timedelta(hours=7)).timestamp()
        os.utime(self.tmp / "jobs" / self.owner / "STATE.md", (stamp, stamp))
        ap.save_state(self.state)
        schedule = self.tmp / "schedule"
        schedule.mkdir()
        (schedule / "state.json").write_text("{}")
        events = schedule / "events.jsonl"
        event = {"id": f"check-{self.rid[:8]}", "owner": [self.owner], "status": "active",
                 "at": ap.iso(self.now + timedelta(hours=1))}

        for owner, expected in ((self.owner, "digest"), ("different-owner", "urgent")):
            with self.subTest(owner=owner):
                events.write_text(json.dumps({**event, "owner": [owner]}) + "\n")
                effects = ap.Effects(dry_run=True)
                with mock.patch.object(effects, "notify", return_value=True) as notify:
                    self.assertTrue(ap.send_sla_notice(self.native_row, 36, effects))
                self.assertEqual(notify.call_args.kwargs["mode"], expected)
                self.assertIn("validated native API measurement" if expected == "digest" else "🚨 DRINGEND",
                              notify.call_args.args[0])

    def test_unverified_measurement_keeps_urgent_notice_with_live_owner(self) -> None:
        self.live_owner(f"# STATE\n- {self.rid}\n")
        no.receipt(self.receipts.parent, {"order": self.rid, "launched": True})
        ap.save_state(self.state)
        (self.receipts / "CONSUMED-1121.md").unlink()
        effects = mock.Mock()
        ap.send_sla_notice(self.native_row, 36, effects)
        self.assertEqual(effects.notify.call_args.kwargs["mode"], "urgent")

    def test_final_done_owner_does_not_suppress_urgent_notice(self) -> None:
        # Valid pinned native receipts, but the owner already wrote FINAL DONE: nobody is left to release.
        self.live_owner(f"# STATE\n- {self.rid}\n- FINAL DONE\n")
        no.receipt(self.receipts.parent, {"order": self.rid, "launched": True})
        ap.save_state(self.state)
        self.assertTrue(ap.native_api_measurement_completed(self.native_row, self.state))
        effects = mock.Mock()
        ap.send_sla_notice(self.native_row, 36, effects)
        self.assertEqual(effects.notify.call_args.kwargs["mode"], "urgent")
        self.assertTrue(effects.notify.call_args.args[0].startswith("🚨 DRINGEND"))

    def test_health_reports_release_deadline_at_three_hours(self) -> None:
        self.live_owner(f"# STATE\n- {self.rid}\n")
        no.receipt(self.receipts.parent, {"order": self.rid, "launched": True})
        ap.save_state(self.state)
        effects = mock.Mock(dry_run=True)
        with mock.patch.object(ap, "sql_rows", return_value=[self.native_row]), \
                mock.patch.object(ap, "measurement_pin_problems", return_value=[]), \
                mock.patch.object(ap, "install_problems", return_value=([], [], {})), \
                mock.patch.object(ap, "systemd_last_success", return_value=self.now), \
                mock.patch.object(ap, "utcnow", return_value=self.now) as clock:
            self.assertEqual(ap.health(effects)["held_orders"][0]["kind"], "measured_awaiting_release")
            clock.return_value = ap.deadline_for(self.native_row) - timedelta(hours=3)
            report = ap.health(effects)
            self.assertEqual(report["held_orders"], [])
            self.assertTrue(any("native API measurement is complete and release is pending" in problem
                                for problem in report["problems"]))


if __name__ == "__main__":
    unittest.main()
