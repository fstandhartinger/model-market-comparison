#!/usr/bin/env python3
"""Owner liveness for owned operational holds in the health sweep (urgent-autofix-443).

Run: python3 -m unittest ops/priority-evaluation/test_owned_hold_health.py -v
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
from datetime import timedelta
from pathlib import Path
from unittest import mock

os.environ["FASTLANE_HOST_EVIDENCE_OFFLINE"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parent))
import autopickup as ap  # noqa: E402

RID = "5fa1a5f0-dc7d-4eca-bbe2-b9d73051c70d"


class OwnerJobLiveTests(unittest.TestCase):
    def setUp(self) -> None:
        self.home = Path(tempfile.mkdtemp(prefix="owned-hold-test-"))
        self.patch_home = mock.patch.object(ap, "HOME", self.home)
        self.patch_home.start()
        self.inactive = mock.patch.object(ap.subprocess, "run", return_value=subprocess.CompletedProcess([], 3, "inactive\n", ""))
        self.run = self.inactive.start()
        self.now = ap.utcnow()

    def tearDown(self) -> None:
        self.inactive.stop()
        self.patch_home.stop()

    def job(self, name: str, text: str, age: timedelta = timedelta(0)) -> None:
        path = self.home / "jobs" / name / "STATE.md"
        path.parent.mkdir(parents=True)
        path.write_text(text, encoding="utf-8")
        stamp = time.time() - age.total_seconds()
        os.utime(path, (stamp, stamp))

    def test_fresh_state_is_live(self) -> None:
        self.job("owner-job-1", "# STATE\n- 23:5xZ 5fa1a5f0 working\n")
        self.assertTrue(ap.owner_job_live("owner-job-1", RID, self.now))

    def test_final_done_is_not_live(self) -> None:
        self.job("owner-job-2", "# STATE\n- 5fa1a5f0 done\n- FINAL DONE\n\n")
        self.assertFalse(ap.owner_job_live("owner-job-2", RID, self.now))

    def test_stale_state_needs_running_unit(self) -> None:
        self.job("owner-job-3", "# STATE\n- 5fa1a5f0 parked\n", age=timedelta(hours=7))
        self.assertFalse(ap.owner_job_live("owner-job-3", RID, self.now))
        self.run.return_value = subprocess.CompletedProcess([], 0, "active\n", "")
        self.assertTrue(ap.owner_job_live("owner-job-3", RID, self.now))
        self.assertEqual(self.run.call_args.args[0][-1], "owner-job-3.service")

    def sched(self, *events: dict, done: dict | None = None, snooze: dict | None = None) -> None:
        folder = self.home / "schedule"
        folder.mkdir(exist_ok=True)
        (folder / "events.jsonl").write_text("".join(json.dumps(e) + "\n" for e in events), encoding="utf-8")
        (folder / "state.json").write_text(json.dumps({"done": done or {}, "snooze": snooze or {}}), encoding="utf-8")

    def wake(self, owner: str, delta: timedelta, **extra: object) -> dict:
        event = {"id": "fl5fa1-heartbeat", "at": (self.now + delta).strftime("%Y-%m-%dT%H:%MZ"), "owner": [owner],
                 "status": "active", "recurrence": "none", "what": "Order 5fa1a5f0: check in"}
        event.update(extra)
        return event

    def test_parked_owner_with_pending_sched_is_live(self) -> None:
        # N102: a correctly parked owner with a 7 h old STATE.md and a pending sched wake is not dead.
        self.job("owner-job-6", "# STATE\n- 5fa1a5f0 waiting for the customer\n- PARKED\n", age=timedelta(hours=7))
        self.assertFalse(ap.owner_job_live("owner-job-6", RID, self.now))  # no sched files at all
        self.sched(self.wake("owner-job-6", timedelta(hours=3)))
        self.run.reset_mock()
        self.assertTrue(ap.owner_job_live("owner-job-6", RID, self.now))
        self.run.assert_not_called()

    def test_parked_owner_needs_its_own_pending_sched_for_the_order(self) -> None:
        self.job("owner-job-7", "# STATE\n- 5fa1a5f0 waiting\n- PARKED\n", age=timedelta(hours=7))
        event = self.wake("owner-job-7", timedelta(hours=3))
        key = f"{event['id']}|{event['at']}"
        cases = {
            "other owner": [self.wake("someone-else", timedelta(hours=3))],
            "other order": [self.wake("owner-job-7", timedelta(hours=3), id="fl-other", what="Order 11111111")],
            "cancelled": [self.wake("owner-job-7", timedelta(hours=3), status="cancelled")],
            "done event": [self.wake("owner-job-7", timedelta(hours=3), status="done")],
            "long overdue": [self.wake("owner-job-7", -timedelta(hours=7))],
            "recurring ended": [self.wake("owner-job-7", -timedelta(days=9),
                                          recurrence={"weekly": {"days": ["mon"], "time": "10:00"},
                                                      "until": (self.now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%MZ")})],
        }
        for name, events in cases.items():
            self.sched(*events)
            self.assertFalse(ap.owner_job_live("owner-job-7", RID, self.now), name)
        self.sched(event, done={key: {"proof": "x"}})
        self.assertFalse(ap.owner_job_live("owner-job-7", RID, self.now), "occurrence done")
        # A snooze moves a long overdue wake back into the future.
        overdue = self.wake("owner-job-7", -timedelta(hours=7))
        self.sched(overdue, snooze={f"{overdue['id']}|{overdue['at']}": (self.now + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%MZ")})
        self.assertTrue(ap.owner_job_live("owner-job-7", RID, self.now))

    def test_pending_sched_without_parked_line_is_not_enough(self) -> None:
        self.job("owner-job-8", "# STATE\n- 5fa1a5f0 working\n", age=timedelta(hours=7))
        self.sched(self.wake("owner-job-8", timedelta(hours=3)))
        self.assertFalse(ap.owner_job_live("owner-job-8", RID, self.now))

    def test_unreadable_sched_is_not_live(self) -> None:
        self.job("owner-job-9", "# STATE\n- 5fa1a5f0 waiting\n- PARKED\n", age=timedelta(hours=7))
        (self.home / "schedule").mkdir()
        (self.home / "schedule" / "events.jsonl").write_text(json.dumps(self.wake("owner-job-9", timedelta(hours=3))) + "\n{broken\n", encoding="utf-8")
        (self.home / "schedule" / "state.json").write_text("{not json", encoding="utf-8")
        self.assertFalse(ap.owner_job_live("owner-job-9", RID, self.now))

    def test_owner_state_must_name_the_order(self) -> None:
        self.job("owner-job-4", "# STATE\n- working on something else\n")
        self.assertFalse(ap.owner_job_live("owner-job-4", RID, self.now))

    def test_systemctl_failure_is_not_live(self) -> None:
        self.job("owner-job-5", "# STATE\n- 5fa1a5f0 parked\n", age=timedelta(hours=7))
        self.run.side_effect = subprocess.TimeoutExpired("systemctl", 15)
        self.assertFalse(ap.owner_job_live("owner-job-5", RID, self.now))

    def test_missing_or_unsafe_owner_is_not_live(self) -> None:
        for owner in (None, "", "../etc", "Owner Job", "no-such-job", 7):
            self.assertFalse(ap.owner_job_live(owner, RID, self.now), owner)


if __name__ == "__main__":
    unittest.main()
