#!/usr/bin/env python3
"""N118 (15 Nov 2026, f62aeab1): an owned order whose official pod measurement is complete stays quiet until 3 h.

Synthetic: no DB, unit, board post or notification.
Run: python3 -m unittest ops/priority-evaluation/test_measured_release.py -v
"""

from __future__ import annotations

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
         "pod_id": None, "cleanup_uncertain": False, "last_pod_id": "pod-x", "creation_attempts": 1}


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
        for key in ("measurement_completed", "torn_down_at", "cleanup_uncertain", "request_id"):
            self.pod({k: v for k, v in VALID.items() if k != key})
            self.assertFalse(ap.measured_awaiting_release(RID), f"missing {key}")
        self.pod(dict(VALID, scored_dispatch_uncertain=False))
        self.assertTrue(ap.measured_awaiting_release(RID))

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


if __name__ == "__main__":
    unittest.main()
