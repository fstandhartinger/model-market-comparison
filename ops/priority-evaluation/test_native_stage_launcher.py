import hashlib
import os
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import native_stage_launcher as launcher


_REAL_RUN = subprocess.run


class NativeStageLauncherTests(unittest.TestCase):
    def packet_fixture(self, stage="adapter_smoke", additional_paths=()):
        paths = {launcher.ROOT / "scripts" / name for name in launcher.STAGES[stage]["scripts"]}
        paths.add(launcher.RUNTIME / "native_stage_launcher.py")
        paths.update(additional_paths)
        content = {path: b"approved candidate bytes\n" for path in paths}
        entries = "\n".join(
            f"{hashlib.sha256(content[path]).hexdigest()}  {path}"
            for path in sorted(paths)
        )
        stage_header = (f", stage adapter_smoke" if stage == "adapter_smoke" else "")
        packet = (f"# Order {launcher.ORDER_ID}{stage_header}, worker install {'a' * 40}\n"
                  "# Exact path allow-list\n" + entries + "\n").encode()
        return packet, content

    def start_fixture(self, stage):
        temp = tempfile.TemporaryDirectory(prefix="native-stage-launch-test.", dir="/var/tmp")
        base = Path(temp.name)
        root, runtime, board_dir = base / "order", base / "runtime", base / "board"
        tool_root = root / "host-tools"
        scripts = root / "scripts"
        stage_dir = root / ("public-smoke" if stage == "adapter_smoke" else "v16")
        for directory in (scripts, stage_dir, runtime, board_dir, tool_root):
            directory.mkdir(parents=True, exist_ok=True)
        preflight_name = "smoke.py" if stage == "adapter_smoke" else "measure_v16.py"
        admission_name = "public_smoke_admission.py" if stage == "adapter_smoke" else "sealed_admission.py"
        run_name = "run_child.sh"
        preflight_path = scripts / preflight_name
        admission_path = scripts / admission_name
        run_path = scripts / run_name
        runtime_path = runtime / "native_stage_launcher.py"
        content = {
            preflight_path: (
                "import hashlib, os\nfrom pathlib import Path\n"
                "packet = Path(os.environ['FASTLANE_NATIVE_AUTHENTICATED_PACKET_PATH'])\n"
                "assert hashlib.sha256(packet.read_bytes()).hexdigest() == "
                "os.environ['FASTLANE_NATIVE_AUTHENTICATED_PACKET_SHA256']\n"
                "target = Path(__file__).with_name('" + admission_name + "')\n"
                "try:\n    target.write_bytes(b'tampered')\n"
                "except OSError:\n    pass\n"
                "else:\n    raise SystemExit('snapshot closure was writable during preflight')\n"
            ).encode(),
            admission_path: b"fixture admission bytes\n",
            run_path: (
                "#!/bin/bash\nset -euo pipefail\n"
                f"[[ ${{FASTLANE_NATIVE_STAGE}} == {stage} ]]\n"
                "[[ $FASTLANE_NATIVE_AUTHENTICATED_PACKET_PATH == \"$1/PACKET-HASHES.txt\" ]]\n"
                "/usr/bin/python3 - \"$FASTLANE_NATIVE_AUTHENTICATED_PACKET_PATH\" <<'PY'\n"
                "import hashlib, os, sys\nfrom pathlib import Path\n"
                "data = Path(sys.argv[1]).read_bytes()\n"
                "assert hashlib.sha256(data).hexdigest() == "
                "os.environ['FASTLANE_NATIVE_AUTHENTICATED_PACKET_SHA256']\n"
                "print('CHILD_PACKET_OK')\nPY\n"
            ).encode(),
            runtime_path: b"fixture trusted launcher bytes\n",
        }
        content.update({tool_root / name: f"fixture tool {name}\n".encode() for name in launcher.TOOL_NAMES})
        if stage == "sealed":
            profile_path = root / "v16/measurement-profiles-v1.6-regular-20261027.json"
            profile_path.parent.mkdir(parents=True, exist_ok=True)
            content[profile_path] = b"fixture sealed profile pin\n"
        packet_path = stage_dir / "PACKET-HASHES.txt"
        word_path = stage_dir / "CUSTODY-WORD.txt"
        policy = {
            "go_prefix": "GO ADAPTER SMOKE " if stage == "adapter_smoke" else "GO SEALED ",
            "word": word_path, "packet": packet_path,
            "ttl_h": 1.20 if stage == "adapter_smoke" else 2.75,
            "max_usd_h": 3 if stage == "adapter_smoke" else 5,
            "max_reservation_usd": 4.35 if stage == "adapter_smoke" else 13.75,
            "unit": "fl9aa-test-stage", "run_script": run_name,
            "preflight_script": preflight_name, "admission_script": admission_name,
            "runtime_max_sec": 4320,
            "one_use_files": (stage_dir / "ONE-USE-A", stage_dir / "ONE-USE-B"),
            "scripts": (preflight_name, admission_name, run_name),
        }
        header = f"# Order {launcher.ORDER_ID}"
        if stage == "adapter_smoke":
            header += ", stage adapter_smoke"
        header += f", worker install {'a' * 40}\n"
        entries = "\n".join(f"{hashlib.sha256(data).hexdigest()}  {path}"
                            for path, data in sorted(content.items()))
        packet = (header + "# Exact path allow-list\n" + entries + "\n").encode()
        packet_path.write_bytes(packet)
        for path, data in content.items():
            path.write_bytes(data)
        return temp, root, runtime, board_dir, packet_path, admission_path, packet, policy

    def run_start_fixture(self, stage, fixture, authority, *, mutate_packet=False, recorded_calls=None):
        temp, root, runtime, board_dir, packet_path, admission_path, packet, policy = fixture
        packet_sha = hashlib.sha256(packet).hexdigest()
        calls = recorded_calls if recorded_calls is not None else []

        def runner(argv, **kwargs):
            calls.append(list(argv))
            if argv[0] == "/usr/bin/bwrap":
                result = _REAL_RUN(argv, **kwargs)
                if mutate_packet:
                    packet_path.write_bytes(packet + b"# changed after preflight\n")
                return result
            if argv[0] == "systemd-run":
                snapshot = Path(argv[-2])
                self.assertIn(f"--property=ReadOnlyPaths={snapshot}", argv)
                child = [
                    "/usr/bin/bwrap", "--unshare-all", "--die-with-parent", "--clearenv",
                    "--ro-bind", "/", "/", "--dev", "/dev", "--proc", "/proc", "--tmpfs", "/tmp",
                    "--ro-bind", str(snapshot), str(snapshot), "--setenv", "PATH", "/usr/bin:/bin",
                    "--setenv", "FASTLANE_NATIVE_STAGE", stage,
                    "--setenv", "FASTLANE_NATIVE_AUTHENTICATED_PACKET_PATH",
                    str(snapshot / "PACKET-HASHES.txt"),
                    "--setenv", "FASTLANE_NATIVE_AUTHENTICATED_PACKET_SHA256", packet_sha,
                    "--setenv", "FASTLANE_NATIVE_VERIFIED_RUNTIME_ROOT", str(snapshot / "runtime"),
                    "--", *argv[-4:],
                ]
                completed = _REAL_RUN(child, capture_output=True, text=True, check=True, timeout=30)
                self.assertIn("CHILD_PACKET_OK", completed.stdout)
                return subprocess.CompletedProcess(argv, 0, completed.stdout, completed.stderr)
            raise AssertionError(f"unexpected launcher subprocess: {argv[0]}")

        auth_calls = 0

        def auth(_stage, _deputy):
            nonlocal auth_calls
            auth_calls += 1
            return authority(auth_calls, packet_sha)

        patches = (
            patch.object(launcher, "ROOT", root),
            patch.object(launcher, "RUNTIME", runtime),
            patch.object(launcher, "TOOLS", root / "host-tools"),
            patch.object(launcher, "SEALED_PROFILE",
                         root / "v16/measurement-profiles-v1.6-regular-20261027.json"),
            patch.object(launcher, "BOARD_DIR", board_dir),
            patch.object(launcher, "STAGES", {**launcher.STAGES, stage: policy}),
            patch.object(launcher, "preliminary_authority", side_effect=auth),
            patch.object(launcher.subprocess, "run", side_effect=runner),
        )
        with patches[0], patches[1], patches[2], patches[3], patches[4], patches[5], patches[6], patches[7]:
            launcher.start_stage(stage, 12345)
        return calls, auth_calls

    def test_launcher_to_child_path_runs_from_read_only_packet_snapshot_for_both_stages(self):
        for stage in launcher.STAGES:
            fixture = self.start_fixture(stage)
            try:
                calls, auth_calls = self.run_start_fixture(
                    stage, fixture, lambda _count, digest: {"packet_sha256": digest},
                )
                self.assertEqual(auth_calls, 3)
                self.assertEqual(sum(call[0] == "systemd-run" for call in calls), 1)
                self.assertEqual(sum(call[0] == "/usr/bin/bwrap" for call in calls), 1)
            finally:
                for call in locals().get("calls", []):
                    if call and call[0] == "systemd-run":
                        launcher._remove_snapshot(Path(call[-2]))
                fixture[0].cleanup()

    def test_launcher_rejects_altered_admission_before_preflight_for_both_stages(self):
        for stage in launcher.STAGES:
            fixture = self.start_fixture(stage)
            temp, root, runtime, board_dir, packet_path, admission_path, packet, policy = fixture
            admission_path.write_bytes(b"altered admission bytes\n")
            try:
                with patch.object(launcher, "ROOT", root), patch.object(launcher, "RUNTIME", runtime), \
                        patch.object(launcher, "TOOLS", root / "host-tools"), \
                        patch.object(launcher, "SEALED_PROFILE",
                                     root / "v16/measurement-profiles-v1.6-regular-20261027.json"), \
                        patch.object(launcher, "BOARD_DIR", board_dir), \
                        patch.object(launcher, "STAGES", {**launcher.STAGES, stage: policy}), \
                        patch.object(launcher, "preliminary_authority",
                                     return_value={"packet_sha256": hashlib.sha256(packet).hexdigest()}), \
                        patch.object(launcher.subprocess, "run") as run:
                    with self.subTest(stage=stage), self.assertRaisesRegex(ValueError, "packet pin mismatch"):
                        launcher.start_stage(stage, 12345)
                    run.assert_not_called()
            finally:
                temp.cleanup()

    def test_launcher_rejects_changed_live_packet_after_preflight_for_both_stages(self):
        for stage in launcher.STAGES:
            fixture = self.start_fixture(stage)
            calls = []
            try:
                with self.subTest(stage=stage), self.assertRaisesRegex(ValueError, "live packet changed"):
                    calls, _ = self.run_start_fixture(
                        stage, fixture, lambda _count, digest: {"packet_sha256": digest},
                        mutate_packet=True, recorded_calls=calls,
                    )
                self.assertFalse(any(call[0] == "systemd-run" for call in calls))
            finally:
                fixture[0].cleanup()

    def test_launcher_rechecks_withdrawn_authority_before_full_packet_member_pass(self):
        for stage in launcher.STAGES:
            fixture = self.start_fixture(stage)
            try:
                def authority(count, digest):
                    if count == 2:
                        raise ValueError("stage authority withdrawn")
                    return {"packet_sha256": digest}

                with self.subTest(stage=stage), self.assertRaisesRegex(ValueError, "withdrawn"):
                    self.run_start_fixture(stage, fixture, authority)
            finally:
                fixture[0].cleanup()

    def test_altered_preflight_or_admission_is_refused_before_execute(self):
        cases = (
            ("adapter_smoke", "smoke.py"),
            ("adapter_smoke", "public_smoke_admission.py"),
            ("sealed", "measure_v16.py"),
            ("sealed", "sealed_admission.py"),
        )
        for stage, module in cases:
            packet, approved_files = self.packet_fixture(stage)
            admission_path = launcher.ROOT / "scripts" / module
            with tempfile.TemporaryDirectory() as tmp:
                marker = Path(tmp) / "candidate-code-ran"
                content = dict(approved_files)
                content[admission_path] = b"open('candidate-code-ran', 'w').write('ran')\n"

                def reader(path, capture):
                    value = content[path]
                    return hashlib.sha256(value).hexdigest(), value if capture else None

                def execute(_pins, _captured):
                    marker.write_text("ran")

                expected = hashlib.sha256(packet).hexdigest()
                with self.subTest(stage=stage, module=module), \
                        self.assertRaisesRegex(ValueError, "packet pin mismatch"):
                    launcher.execute_after_authentication(stage, packet, expected, reader, execute)
                self.assertFalse(marker.exists())

    def test_authenticated_packet_captures_all_order_scripts_and_trusted_runtime(self):
        packet, content = self.packet_fixture()

        def reader(path, capture):
            value = content[path]
            return hashlib.sha256(value).hexdigest(), value if capture else None

        pins, captured = launcher.authenticate_packet(
            "adapter_smoke", packet, hashlib.sha256(packet).hexdigest(), reader=reader,
        )
        self.assertIn(launcher.ROOT / "scripts/smoke.py", captured)
        self.assertIn(launcher.ROOT / "scripts/public_smoke_admission.py", captured)
        self.assertIn(launcher.RUNTIME / "native_stage_launcher.py", captured)
        self.assertEqual(set(pins), set(content))

    def test_sealed_packet_requires_its_full_stage_closure(self):
        packet, content = self.packet_fixture("sealed")

        def reader(path, capture):
            value = content[path]
            return hashlib.sha256(value).hexdigest(), value if capture else None

        pins, captured = launcher.authenticate_packet(
            "sealed", packet, hashlib.sha256(packet).hexdigest(), reader=reader,
        )
        self.assertIn(launcher.ROOT / "scripts/measure_v16.py", captured)
        self.assertIn(launcher.ROOT / "scripts/sealed_admission.py", captured)
        self.assertEqual(set(pins), set(content))

    def test_wrong_packet_digest_is_refused(self):
        packet, content = self.packet_fixture()
        with self.assertRaisesRegex(ValueError, "approved digest"):
            launcher.parse_packet("adapter_smoke", packet, "0" * 64)

    def test_public_packet_rejects_protected_paths_before_opening_any_member(self):
        packet, content = self.packet_fixture()
        protected = launcher.ROOT / "v16/measurement-profiles-v1.6-regular-20261027.json"
        content[protected] = b"protected bytes must not be opened by adapter smoke\n"
        lines = packet.decode().splitlines()
        lines.append(f"{hashlib.sha256(content[protected]).hexdigest()}  {protected}")
        contaminated = ("\n".join(lines) + "\n").encode()
        opened = []

        def reader(path, capture):
            opened.append(path)
            value = content[path]
            return hashlib.sha256(value).hexdigest(), value if capture else None

        with self.assertRaisesRegex(ValueError, "public-only path policy"):
            launcher.authenticate_packet(
                "adapter_smoke", contaminated, hashlib.sha256(contaminated).hexdigest(), reader=reader,
            )
        self.assertEqual(opened, [])

    def test_exact_host_tool_inventory_and_sealed_profile_paths_are_allowed_only_for_their_stage(self):
        with tempfile.TemporaryDirectory(prefix="native-stage-paths.", dir="/var/tmp") as temp:
            base = Path(temp)
            root, runtime, tools = base / "order", base / "runtime", base / "bin"
            profile = root / "v16/measurement-profiles-v1.6-regular-20261027.json"
            for stage in launcher.STAGES:
                with self.subTest(stage=stage), \
                        patch.object(launcher, "ROOT", root), \
                        patch.object(launcher, "RUNTIME", runtime), \
                        patch.object(launcher, "TOOLS", tools), \
                        patch.object(launcher, "SEALED_PROFILE", profile):
                    allowed = {tools / name for name in launcher.TOOL_NAMES}
                    if stage == "sealed":
                        allowed.add(profile)
                    packet, _ = self.packet_fixture(stage, allowed)
                    pins = launcher.parse_packet(stage, packet, hashlib.sha256(packet).hexdigest())
                    self.assertTrue(allowed <= pins.keys())

                    extra = tools / "unlisted-helper"
                    packet_with_extra, _ = self.packet_fixture(stage, allowed | {extra})
                    opened = []

                    def reader(path, capture):
                        opened.append(path)
                        data = b"unused member bytes\n"
                        return hashlib.sha256(data).hexdigest(), data if capture else None

                    with self.assertRaisesRegex(ValueError, "outside the exact order source roots"):
                        launcher.authenticate_packet(
                            stage, packet_with_extra, hashlib.sha256(packet_with_extra).hexdigest(), reader=reader,
                        )
                    self.assertEqual(opened, [])

            with patch.object(launcher, "ROOT", root), patch.object(launcher, "RUNTIME", runtime), \
                    patch.object(launcher, "TOOLS", tools), patch.object(launcher, "SEALED_PROFILE", profile):
                public_packet, _ = self.packet_fixture("adapter_smoke", {profile})
                opened = []
                with self.assertRaisesRegex(ValueError, "public-only path policy"):
                    launcher.authenticate_packet(
                        "adapter_smoke", public_packet, hashlib.sha256(public_packet).hexdigest(),
                        reader=lambda path, capture: (opened.append(path) or ("0" * 64, None)),
                    )
                self.assertEqual(opened, [])

    def test_stage_holds_validate_the_full_stage_enum_before_filtering(self):
        def hold(entry_id, scope):
            return {
                "id": entry_id, "author": "codex:jevbench-item-reserve-20261007", "kind": "decision",
                "body": f"{launcher.HOLD_PREFIX}{json.dumps({'stage': scope})}",
            }

        for stage, other_stage in (("adapter_smoke", "sealed"), ("sealed", "adapter_smoke")):
            with self.subTest(stage=stage, hold=other_stage):
                launcher.validate_stage_holds(stage, [hold(72610, other_stage)], set())
            with self.subTest(stage=stage, hold="current"), \
                    self.assertRaisesRegex(ValueError, "unresolved cross-channel HOLD"):
                launcher.validate_stage_holds(stage, [hold(72611, stage)], set())
            with self.subTest(stage=stage, hold="all"), \
                    self.assertRaisesRegex(ValueError, "unresolved cross-channel HOLD"):
                launcher.validate_stage_holds(stage, [hold(72612, "all")], set())
            with self.subTest(stage=stage, hold="invalid"), \
                    self.assertRaisesRegex(ValueError, "invalid fast-lane HOLD"):
                launcher.validate_stage_holds(stage, [hold(72613, "measurement")], set())

    def test_preliminary_authority_rejects_missing_live_clearance_before_packet_member_io(self):
        packet_sha = "a" * 64
        custody_scope = {"order": launcher.ORDER_ID, "stage": "adapter_smoke",
                         "packet_sha256": packet_sha, "expires": "2026-11-20T22:00:00Z"}
        custody_body = "HASH CONFIRMED + UNSPENT " + json.dumps(custody_scope)
        custody = {"id": 70753, "thread_id": 11, "author": "codex:jevbench-item-reserve-20261007",
                   "kind": "decision", "created_at": "2026-11-20T20:30:00Z", "body": custody_body}
        approval = {"order": launcher.ORDER_ID, "packet_sha256": packet_sha, "provider": "verda",
                    "instance_type": "1RTXPRO6000.30V", "location": "FIN-02",
                    "offer_id": "1RTXPRO6000.30V@FIN-02", "ttl_h": 1.20, "attempts": 1,
                    "max_usd_h": 3, "max_os_volume_usd_h": 0.25, "expires": "2026-11-20T21:05:00Z",
                    "custody_id": 70753, "custody_sha256": "", "clearance_id": 70750, "reaper_id": 70751,
                    "prior_charge_sha256": "d" * 64}
        word = f"#70753 {custody['author']} {custody['created_at']}\n{custody_body}".encode()
        approval["custody_sha256"] = hashlib.sha256(word).hexdigest()
        deputy = {"id": 70754, "thread_id": 11, "author": "codex:cos-deputy-opus",
                  "kind": "decision", "created_at": "2026-11-20T20:45:00Z",
                  "body": "GO ADAPTER SMOKE " + json.dumps(approval)}
        now = datetime(2026, 11, 20, 20, 50, tzinfo=timezone.utc)
        def lookup(entry_id):
            if entry_id == 70754:
                return deputy
            if entry_id == 70753:
                return custody
            raise ValueError("hold clearance missing")

        with patch.object(launcher, "board_entry", side_effect=lookup), \
                patch.object(launcher, "read_regular_file", return_value=(word, None)), \
                self.assertRaisesRegex(ValueError, "clearance"):
            launcher.preliminary_authority("adapter_smoke", 70754, now=now)

    def test_one_use_marker_blocks_each_stage_before_preflight(self):
        for stage in launcher.STAGES:
            fixture = self.start_fixture(stage)
            temp, root, runtime, board_dir, packet_path, _admission, packet, policy = fixture
            marker = packet_path.parent / "one-use-marker"
            marker.touch()
            policy = {**policy, "one_use_files": (marker,)}
            try:
                with patch.object(launcher, "ROOT", root), patch.object(launcher, "RUNTIME", runtime), \
                        patch.object(launcher, "BOARD_DIR", board_dir), \
                        patch.object(launcher, "STAGES", {**launcher.STAGES, stage: policy}), \
                        patch.object(launcher, "preliminary_authority",
                                     return_value={"packet_sha256": hashlib.sha256(packet).hexdigest()}), \
                        patch.object(launcher, "read_regular_file") as read_file, \
                        patch.object(launcher.subprocess, "run") as run, \
                        self.subTest(stage=stage), self.assertRaisesRegex(ValueError, "one-use stage marker"):
                    launcher.start_stage(stage, 12345)
                read_file.assert_not_called()
                run.assert_not_called()
            finally:
                temp.cleanup()

    def test_unused_stage_check_is_repeated_at_launch_to_close_marker_race(self):
        for stage in launcher.STAGES:
            fixture = self.start_fixture(stage)
            try:
                calls = []

                def runner(argv, **kwargs):
                    calls.append(list(argv))
                    if argv[0] == "/usr/bin/bwrap":
                        fixture[7]["one_use_files"][0].touch()
                        return _REAL_RUN(argv, **kwargs)
                    raise AssertionError(f"unexpected launcher subprocess: {argv[0]}")

                with patch.object(launcher, "ROOT", fixture[1]), \
                        patch.object(launcher, "RUNTIME", fixture[2]), \
                        patch.object(launcher, "TOOLS", fixture[1] / "host-tools"), \
                        patch.object(launcher, "SEALED_PROFILE",
                                     fixture[1] / "v16/measurement-profiles-v1.6-regular-20261027.json"), \
                        patch.object(launcher, "BOARD_DIR", fixture[3]), \
                        patch.object(launcher, "STAGES", {**launcher.STAGES, stage: fixture[7]}), \
                        patch.object(launcher, "preliminary_authority",
                                     side_effect=lambda _stage, _deputy: {
                                         "packet_sha256": hashlib.sha256(fixture[6]).hexdigest()}), \
                        patch.object(launcher.subprocess, "run", side_effect=runner), \
                        self.subTest(stage=stage), self.assertRaisesRegex(ValueError, "one-use stage marker"):
                    launcher.start_stage(stage, 12345)
                self.assertEqual(sum(call[0] == "systemd-run" for call in calls), 0)
            finally:
                fixture[0].cleanup()

    def test_preliminary_authority_binds_deputy_to_the_exact_custody_packet(self):
        packet_sha = "a" * 64
        custody_scope = {"order": launcher.ORDER_ID, "stage": "adapter_smoke",
                         "packet_sha256": packet_sha, "expires": "2026-11-20T23:30:00Z"}
        custody_body = "HASH CONFIRMED + UNSPENT " + json.dumps(custody_scope)
        custody = {"id": 72602, "thread_id": 11, "author": "codex:jevbench-item-reserve-20261007",
                   "kind": "decision", "created_at": "2026-11-20T23:08:00Z", "body": custody_body}
        approval = {"order": launcher.ORDER_ID, "packet_sha256": packet_sha, "provider": "verda",
                    "instance_type": "1RTXPRO6000.30V", "location": "FIN-02",
                    "offer_id": "1RTXPRO6000.30V@FIN-02", "ttl_h": 1.20, "attempts": 1,
                    "max_usd_h": 3, "max_os_volume_usd_h": 0.25, "expires": "2026-11-20T23:20:00Z",
                    "custody_id": 72602, "custody_sha256": "", "clearance_id": 72600, "reaper_id": 72601,
                    "prior_charge_sha256": "d" * 64}
        word = f"#72602 {custody['author']} {custody['created_at']}\n{custody_body}".encode()
        approval["custody_sha256"] = hashlib.sha256(word).hexdigest()
        deputy = {"id": 72603, "thread_id": 11, "author": "codex:cos-deputy-opus",
                  "kind": "decision", "created_at": "2026-11-20T23:09:00Z",
                  "body": "GO ADAPTER SMOKE " + json.dumps(approval)}
        known_holds = sorted(launcher.EXISTING_HOLDS)
        clearance_scope = {"order": launcher.ORDER_ID, "stage": "adapter_smoke", "packet_sha256": packet_sha,
                           "decisions_sha256": "c" * 64, "resolved_holds": known_holds}
        clearance = {"id": 72600, "thread_id": 11, "author": "codex:cos-deputy-opus", "kind": "decision",
                     "created_at": "2026-11-20T23:05:00Z",
                     "body": "CLEAR FASTLANE " + json.dumps(clearance_scope)}
        reaper = {"id": 72601, "thread_id": 11, "author": "codex:gpu-broker-20261026", "kind": "decision",
                  "created_at": "2026-11-20T23:06:00Z",
                  "body": "REAPER CONFIRMED " + json.dumps({"order": launcher.ORDER_ID,
                      "stage": "adapter_smoke", "packet_sha256": packet_sha, "ttl_h": 1.20})}
        now = datetime(2026, 11, 20, 23, 10, tzinfo=timezone.utc)
        with patch.object(launcher, "board_entry", side_effect=[deputy, custody, clearance, reaper]), \
                patch.object(launcher, "board_since", return_value=[reaper, custody, deputy]), \
                patch.object(launcher, "board_holds", return_value=[{
                    "id": 72610, "thread_id": 11, "author": "codex:jevbench-item-reserve-20261007",
                    "kind": "decision", "body": launcher.HOLD_PREFIX + json.dumps({"stage": "sealed"}),
                }]), \
                patch.object(launcher, "scoped_decisions_digest", return_value="c" * 64), \
                patch.object(launcher, "read_regular_file", return_value=(word, None)):
            result = launcher.preliminary_authority("adapter_smoke", 72603, now=now)
        self.assertEqual(result["packet_sha256"], packet_sha)

        superseding_clearance = {"id": 72604, "thread_id": 11, "author": "codex:cos-deputy-opus",
                                 "kind": "decision", "created_at": "2026-11-20T23:07:00Z",
                                 "body": "CLEAR FASTLANE " + json.dumps(clearance_scope)}
        with patch.object(launcher, "board_entry", side_effect=[deputy, custody, clearance, reaper]), \
                patch.object(launcher, "board_since",
                             return_value=[reaper, superseding_clearance, custody, deputy]), \
                patch.object(launcher, "board_holds", return_value=[]), \
                patch.object(launcher, "scoped_decisions_digest", return_value="c" * 64), \
                patch.object(launcher, "read_regular_file", return_value=(word, None)), \
                self.assertRaisesRegex(ValueError, "superseded"):
            launcher.preliminary_authority("adapter_smoke", 72603, now=now)

        superseding_go = {"id": 72605, "thread_id": 11, "author": "codex:cos-deputy-opus",
                          "kind": "decision", "created_at": "2026-11-20T23:11:00Z",
                          "body": "GO SEALED " + json.dumps({"order": launcher.ORDER_ID})}
        with patch.object(launcher, "board_entry", side_effect=[deputy, custody, clearance, reaper]), \
                patch.object(launcher, "board_since", return_value=[reaper, custody, deputy, superseding_go]), \
                patch.object(launcher, "board_holds", return_value=[]), \
                patch.object(launcher, "scoped_decisions_digest", return_value="c" * 64), \
                patch.object(launcher, "read_regular_file", return_value=(word, None)), \
                self.assertRaisesRegex(ValueError, "superseded"):
            launcher.preliminary_authority("adapter_smoke", 72603, now=now)

        bad_custody_scope = dict(custody_scope, packet_sha256="b" * 64)
        bad_custody_body = "HASH CONFIRMED + UNSPENT " + json.dumps(bad_custody_scope)
        bad_word = f"#72602 {custody['author']} {custody['created_at']}\n{bad_custody_body}".encode()
        bad_custody = dict(custody, body=bad_custody_body)
        bad_approval = dict(approval, custody_sha256=hashlib.sha256(bad_word).hexdigest())
        deputy_again = dict(deputy, body="GO ADAPTER SMOKE " + json.dumps(bad_approval))
        with patch.object(launcher, "board_entry", side_effect=[deputy_again, bad_custody]), \
                patch.object(launcher, "read_regular_file", return_value=(bad_word, None)), \
                self.assertRaisesRegex(ValueError, "bound to different packet"):
            launcher.preliminary_authority("adapter_smoke", 72603, now=now)


if __name__ == "__main__":
    unittest.main()
