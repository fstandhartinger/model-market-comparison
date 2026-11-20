import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import native_stage_launcher as launcher


class NativeStageLauncherTests(unittest.TestCase):
    def packet_fixture(self, stage="adapter_smoke"):
        paths = {launcher.ROOT / "scripts" / name for name in launcher.STAGES[stage]["scripts"]}
        paths.add(launcher.RUNTIME / "native_stage_launcher.py")
        content = {path: b"approved candidate bytes\n" for path in paths}
        entries = "\n".join(
            f"{hashlib.sha256(content[path]).hexdigest()}  {path}"
            for path in sorted(paths)
        )
        stage_header = (f", stage adapter_smoke" if stage == "adapter_smoke" else "")
        packet = (f"# Order {launcher.ORDER_ID}{stage_header}, worker install {'a' * 40}\n"
                  "# Exact path allow-list\n" + entries + "\n").encode()
        return packet, content

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

    def test_one_use_marker_blocks_each_stage_before_preflight(self):
        for stage in launcher.STAGES:
            with tempfile.TemporaryDirectory() as tmp:
                marker = Path(tmp) / "one-use-marker"
                marker.touch()
                with patch.dict(launcher.STAGES[stage], {"one_use_files": (marker,)}), \
                        self.subTest(stage=stage), self.assertRaisesRegex(ValueError, "one-use stage marker"):
                    launcher.require_unused_stage(stage)

    def test_preliminary_authority_binds_deputy_to_the_exact_custody_packet(self):
        packet_sha = "a" * 64
        custody_scope = {"order": launcher.ORDER_ID, "stage": "adapter_smoke",
                         "packet_sha256": packet_sha, "expires": "2026-11-20T22:00:00Z"}
        custody_body = "HASH CONFIRMED + UNSPENT " + json.dumps(custody_scope)
        custody = {"id": 10, "thread_id": 11, "author": "codex:jevbench-item-reserve-20261007",
                   "kind": "decision", "created_at": "2026-11-20T20:30:00Z", "body": custody_body}
        approval = {"order": launcher.ORDER_ID, "packet_sha256": packet_sha, "provider": "verda",
                    "instance_type": "1RTXPRO6000.30V", "location": "FIN-02",
                    "offer_id": "1RTXPRO6000.30V@FIN-02", "ttl_h": 1.20, "attempts": 1,
                    "max_usd_h": 3, "max_os_volume_usd_h": 0.25, "expires": "2026-11-20T21:05:00Z",
                    "custody_id": 10, "custody_sha256": "", "clearance_id": 8, "reaper_id": 9}
        word = f"#10 {custody['author']} {custody['created_at']}\n{custody_body}".encode()
        approval["custody_sha256"] = hashlib.sha256(word).hexdigest()
        deputy = {"id": 12, "thread_id": 11, "author": "codex:cos-deputy-opus",
                  "kind": "decision", "created_at": "2026-11-20T20:45:00Z",
                  "body": "GO ADAPTER SMOKE " + json.dumps(approval)}
        now = datetime(2026, 11, 20, 20, 50, tzinfo=timezone.utc)
        with patch.object(launcher, "board_entry", side_effect=[deputy, custody]), \
                patch.object(launcher, "read_regular_file", return_value=(word, None)):
            result = launcher.preliminary_authority("adapter_smoke", 12, now=now)
        self.assertEqual(result["packet_sha256"], packet_sha)

        bad_custody_scope = dict(custody_scope, packet_sha256="b" * 64)
        bad_custody_body = "HASH CONFIRMED + UNSPENT " + json.dumps(bad_custody_scope)
        bad_word = f"#10 {custody['author']} {custody['created_at']}\n{bad_custody_body}".encode()
        bad_custody = dict(custody, body=bad_custody_body)
        bad_approval = dict(approval, custody_sha256=hashlib.sha256(bad_word).hexdigest())
        deputy_again = dict(deputy, body="GO ADAPTER SMOKE " + json.dumps(bad_approval))
        with patch.object(launcher, "board_entry", side_effect=[deputy_again, bad_custody]), \
                patch.object(launcher, "read_regular_file", return_value=(bad_word, None)), \
                self.assertRaisesRegex(ValueError, "bound to different packet"):
            launcher.preliminary_authority("adapter_smoke", 12, now=now)


if __name__ == "__main__":
    unittest.main()
