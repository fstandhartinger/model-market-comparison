#!/usr/bin/env python3
"""Owner liveness for owned operational holds in the health sweep (urgent-autofix-443).

Run: python3 -m unittest ops/priority-evaluation/test_owned_hold_health.py -v
"""

from __future__ import annotations

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
