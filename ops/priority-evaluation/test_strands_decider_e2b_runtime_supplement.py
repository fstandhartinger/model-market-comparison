"""First-party tests with synthetic receipts and no submitted code execution."""
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import tarfile
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock, patch

import autopickup
import measurement_dispatch
import native_owner
import pod_runner
import strands_decider_e2b_runtime_supplement as supplement
import v16_adoption
import v16_profiles


ORDER = native_owner.STRANDS_E2B_ORDER
OTHER = "0616c39d-e505-4365-b9e8-db157fc67538"
HOLD = "separate_native_measurement_wrapper_required"


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def write_json(path, payload):
    raw = json.dumps(payload, sort_keys=True).encode()
    path.write_bytes(raw)
    return digest(raw)


class StrandsRuntimeTests(unittest.TestCase):
    def setUp(self):
        temp = TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.job = self.root / ORDER

    def test_supplement_selects_exact_order_and_recipe(self):
        recipe = {"image": supplement.BASE_IMAGE, "kind": "http_typesafe"}
        with patch.object(supplement, "RECIPE_SHA", digest(json.dumps(recipe, sort_keys=True).encode())):
            self.assertTrue(supplement.active(self.job, recipe))
            self.assertFalse(supplement.active(self.root / OTHER, recipe))
            self.assertFalse(supplement.active(self.job, {**recipe, "kind": "python_inprocess"}))
            self.assertFalse(supplement.active(self.job, {**recipe, "image": "latest"}))

    def test_context_uses_exact_archive_and_member_pins(self):
        path = self.root / "context.tar"
        payload = b"synthetic"
        info = tarfile.TarInfo("Dockerfile.runtime-supplement")
        info.size = len(payload)
        with tarfile.open(path, "w") as archive:
            archive.addfile(info, io.BytesIO(payload))
        with patch.object(supplement, "CONTEXT_SHA", digest(path.read_bytes())):
            with patch.object(supplement, "FILES", {info.name: digest(payload)}):
                supplement.check_context(path)
            with patch.object(supplement, "FILES", {info.name: "a" * 64}):
                with self.assertRaisesRegex(measurement_dispatch.OperationalHold, "runtime_supplement_unaccepted"):
                    supplement.verify_context(path)

    def test_public_release_exec_and_checkpoint_provenance_are_distinct(self):
        source = self.job / "source"
        bundle = self.job / "trusted-runner"
        bundle.mkdir(parents=True)
        pins = {}
        for which, letter in (("model", "a"), ("code", "c")):
            (source / which / ".git").mkdir(parents=True)
            data = {"commit": letter * 40, "tree": "b" * 40, "which": which}
            receipt = source / f"FETCH-RECEIPT-{which}.json"
            pins[which] = {**data, "receipt_sha256": write_json(receipt, data)}
        wheel = {"path": "test.whl", "sha256": "d" * 64, "size": 5}
        listing = {**pins["model"], "files": [{"path": wheel["path"], "lfs_oid_sha256": wheel["sha256"],
                                              "lfs_size": wheel["size"]}]}
        contract = {"order_id": ORDER, "execution_source": "code", "model_checkpoint_source": "model",
                    "release_wheel": {"path": "release.whl", "sha256": "e" * 64},
                    "source_pins": pins, "model_wheel": wheel,
                    "model_tree_listing_sha256": write_json(source / "TREE-LISTING-model.json", listing)}
        pin = write_json(bundle / "EXECUTION-SOURCE.json", contract)
        recipe = {"code": {"source": "code", "commit": "c" * 40, "tree": "b" * 40}}
        with patch.object(supplement, "SOURCE_CONTRACT_SHA", pin), \
                patch.object(supplement, "FILES", {"wheels/release.whl": "e" * 64}):
            supplement.verify_sources(self.job, recipe)
            with self.assertRaisesRegex(measurement_dispatch.OperationalHold, "strands_e2b_source_contract_mismatch"):
                supplement.verify_sources(self.job, {"code": {**recipe["code"], "source": "model"}})
            extra = source / "FETCH-RECEIPT-extra.json"
            extra.touch()
            with self.assertRaisesRegex(measurement_dispatch.OperationalHold, "strands_e2b_source_contract_mismatch"):
                supplement.verify_sources(self.job, recipe)
            extra.unlink()
            (source / "FETCH-RECEIPT-code.json").write_text("{}")
            with self.assertRaisesRegex(measurement_dispatch.OperationalHold, "strands_e2b_source_contract_mismatch"):
                supplement.verify_sources(self.job, recipe)

    def test_runtime_requires_native_path_before_profile_read(self):
        pins = Mock(side_effect=AssertionError("profile read"))
        output = self.root / "output"
        with self.assertRaisesRegex(measurement_dispatch.OperationalHold, "strands_e2b_native_admission_required"):
            pod_runner.run(ORDER, self.job, {}, output, {}, 15, measurement_pins_factory=pins)
        pins.assert_not_called()
        self.assertFalse(output.exists())

    def test_generic_entrypoints_do_not_run_for_order(self):
        unexpected = Mock(side_effect=AssertionError("generic gate was reached"))
        with patch.object(autopickup, "load_row", unexpected), \
                patch.object(autopickup, "validate_review_gate", unexpected), \
                patch.object(v16_profiles, "accepted", unexpected):
            with self.assertRaisesRegex(autopickup.PickupError, HOLD):
                autopickup.evaluate(ORDER)
            with self.assertRaisesRegex(autopickup.PickupError, HOLD):
                autopickup.evaluate_v16_generation(ORDER, self.job)
            with self.assertRaisesRegex(measurement_dispatch.OperationalHold, HOLD):
                autopickup.dispatch_measurement(ORDER, self.job)
            with self.assertRaisesRegex(measurement_dispatch.OperationalHold, HOLD):
                v16_profiles.measure(self.job)
            with self.assertRaisesRegex(ValueError, HOLD):
                v16_adoption.adopt_raw(self.job, ())
            unexpected.assert_not_called()
            with self.assertRaisesRegex(AssertionError, "generic gate was reached"):
                v16_profiles.measure(self.root / OTHER)

    def test_timer_and_delivery_fenced_but_operational_escalation_preserved(self):
        for status in ("pending", "failed", "running", "ready_for_release"):
            with self.subTest(status=status):
                row = {"id": ORDER, "status": "paid", "evaluation_status": status, "review_passed_at": "present"}
                hold = {"reason": "unsupported_measurement_backend"}
                state = {"source_review_gate": {"verdict": "PASS"}, "operational_hold": hold}
                now = datetime.now(timezone.utc)
                effects = Mock()
                escalate = Mock()
                unexpected = Mock(side_effect=AssertionError("timer or delivery effect"))
                with patch.object(autopickup, "operational_escalate", escalate), \
                        patch.object(autopickup, "update_row", unexpected), \
                        patch.object(autopickup, "send_tracked_mail", unexpected), \
                        patch.object(autopickup, "gate", unexpected):
                    autopickup.manage_evaluation(row, state, effects, now)
                    autopickup.advance_delivery(row, state, self.job, effects, now)
                escalate.assert_called_once_with(row, state, effects, now, hold["reason"], exhausted=False)
                unexpected.assert_not_called()
                self.assertFalse(effects.mock_calls)
