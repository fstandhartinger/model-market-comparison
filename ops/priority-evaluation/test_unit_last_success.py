#!/usr/bin/env python3
"""One failed timer run must not read as a stale unit (urgent-autofix-499).

Run: python3 -m unittest ops/priority-evaluation/test_unit_last_success.py -v
"""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

os.environ["FASTLANE_HOST_EVIDENCE_OFFLINE"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parent))
import autopickup as ap  # noqa: E402

UNIT = "jevbench-priority-mail-watcher.service"
OK = {"Result": "success", "ExecMainStatus": "0", "ExecMainExitTimestamp": "Thu 2026-10-29 17:35:55 UTC"}
FAILED = {"Result": "exit-code", "ExecMainStatus": "1", "ExecMainExitTimestamp": "Thu 2026-10-29 17:51:18 UTC"}
SUCCESS_AT = datetime(2026, 10, 29, 17, 35, 55, tzinfo=timezone.utc)


class FakeEffects:
    def __init__(self, dry_run: bool = False) -> None:
        self.dry_run = dry_run
        self.state: dict[str, str] = {}
        self.sequence: list[dict[str, str]] = []

    def unit_state(self, unit: str) -> dict[str, str]:
        if self.sequence:
            self.state = self.sequence.pop(0)
        return self.state


class UnitLastSuccessTests(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="unit-last-success-"))
        self.patch = mock.patch.object(ap, "STATE_ROOT", self.root)
        self.patch.start()

    def tearDown(self) -> None:
        self.patch.stop()

    def test_failure_after_success_keeps_last_success(self) -> None:
        effects = FakeEffects()
        effects.state = OK
        self.assertEqual(ap.systemd_last_success(effects, UNIT), SUCCESS_AT)
        effects.state = FAILED
        self.assertEqual(ap.systemd_last_success(effects, UNIT), SUCCESS_AT)

    def test_failure_without_memory_is_unknown(self) -> None:
        effects = FakeEffects()
        effects.state = FAILED
        self.assertIsNone(ap.systemd_last_success(effects, UNIT))

    def test_dry_run_does_not_write_memory(self) -> None:
        effects = FakeEffects(dry_run=True)
        effects.state = OK
        self.assertEqual(ap.systemd_last_success(effects, UNIT), SUCCESS_AT)
        self.assertFalse((self.root / "unit-last-success.json").exists())

    def test_corrupt_memory_is_ignored(self) -> None:
        (self.root / "unit-last-success.json").write_text("[1]", encoding="utf-8")
        effects = FakeEffects()
        effects.state = FAILED
        self.assertIsNone(ap.systemd_last_success(effects, UNIT))
        effects.state = OK
        self.assertEqual(ap.systemd_last_success(effects, UNIT), SUCCESS_AT)

    def test_in_flight_run_is_awaited_not_judged_stale(self) -> None:
        # card a1794161102: the health check ran while the worker unit was activating (no exit result yet).
        effects = FakeEffects()
        activating = {"ActiveState": "activating", "Result": "success", "ExecMainStatus": "0", "ExecMainExitTimestamp": ""}
        effects.sequence = [activating, activating, dict(OK, ActiveState="inactive")]
        with mock.patch.object(ap.time, "sleep") as sleep:
            self.assertEqual(ap.systemd_last_success(effects, UNIT), SUCCESS_AT)
        self.assertEqual(sum(1 for c in sleep.call_args_list if c.args == (3,)), 2)

    def test_wait_is_bounded(self) -> None:
        effects = FakeEffects()
        effects.state = {"ActiveState": "activating", "Result": "success", "ExecMainStatus": "0", "ExecMainExitTimestamp": ""}
        clock = iter(range(0, 10_000, 60))
        with mock.patch.object(ap.time, "sleep"), mock.patch.object(ap.time, "monotonic", lambda: next(clock)):
            self.assertIsNone(ap.systemd_last_success(effects, UNIT))


if __name__ == "__main__":
    unittest.main()
