"""First-party tests with synthetic receipts and no submitted code execution."""
from datetime import datetime, timedelta, timezone
import hashlib
import io
import json
from pathlib import Path
import subprocess
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

    def test_protected_read_waits_for_authority_even_with_native_arguments(self):
        pins = Mock(side_effect=AssertionError("first protected input read"))
        with patch.object(supplement, "require"):
            for disposition in ("missing", "revoked", "expired", "mismatched"):
                with self.subTest(disposition=disposition):
                    checker = Mock(side_effect=measurement_dispatch.OperationalHold(disposition))
                    with self.assertRaisesRegex(measurement_dispatch.OperationalHold, disposition):
                        pod_runner.run(ORDER, self.job, {}, self.root / "output", {}, 15,
                                       allocation_gate=checker, measurement_pins_factory=pins)
                    checker.assert_called_once_with("before_protected_read", {})
        pins.assert_not_called()
        self.assertFalse((self.root / "output").exists())

    def test_revocation_after_source_export_stops_staging(self):
        from verda_provider import VerdaProvider

        approval = {"approval_sha256": "b" * 64, "packet_sha256": "c" * 64, "location": "FIN-02"}
        gate = Mock(side_effect=[approval, None])
        gate.max_new_usd = 15
        recipe = {"kind": "http_typesafe", "min_vram_gb": 24, "code": {"commit": "a", "tree": "b"}}
        source = self.job / "source"
        source.mkdir(parents=True)
        write_json(source / "FETCH-RECEIPT-model.json", {})
        provider = Mock(spec=VerdaProvider)
        provider.sealed_custody_ok = True
        with patch.object(supplement, "require"), patch.object(pod_runner, "validate_recipe"), \
                patch.object(pod_runner, "PODS_DIR", self.root / "pods"), \
                patch.object(pod_runner, "export_source"), patch.object(pod_runner, "build_staging") as stage:
            with self.assertRaisesRegex(measurement_dispatch.OperationalHold, "strands_e2b_native_admission_required"):
                pod_runner.run(ORDER, self.job, recipe, self.root / "output", {}, 15, provider=provider,
                               allocation_gate=gate, measurement_pins_factory=lambda: {})
        self.assertEqual([call.args[0] for call in gate.call_args_list],
                         ["before_protected_read", "before_protected_read"])
        stage.assert_not_called()
        provider.reserve.assert_not_called()

    def test_runtime_receipt_matches_pinned_image_and_exact_attempt(self):
        runtime = dict(supplement.binding(), effective_image="sha256:" + "a" * 64)
        approval = {"approval_sha256": "b" * 64, "packet_sha256": "c" * 64, "location": "FIN-02"}
        pod_id = "cb5728c3-6db8-4f6a-a932-a5b0b2265062"
        cleanup = {"job": "fastlane-eval-0616c39d", "pod_id": pod_id, "reservation_id": "gpu-" + "d" * 24,
                   "packet_sha256": approval["packet_sha256"], "attempt_id": "ab7222e2-ade6-4289-898f-87094f556065",
                   "volume_id": "0134df30-60c4-4aa9-b59a-e05350ee0da9", "terminal_at": 100, "hard_end": 120,
                   "guard_released": True}
        state = {"last_pod_id": pod_id, "reservation_id": cleanup["reservation_id"],
                 "runtime_supplement": runtime, "native_launch": approval, "native_teardown": dict(cleanup)}
        receipt = {"pod_id": pod_id, "runtime_supplement": dict(runtime), "native_launch": approval,
                   "native_teardown": cleanup}
        provider = Mock()
        provider.teardown_exact.return_value = cleanup
        self.assertEqual(supplement.teardown(provider, cleanup["job"], pod_id, cleanup["reservation_id"], approval),
                         cleanup)
        provider.rm.assert_not_called()
        provider.teardown_exact.return_value = dict(cleanup, guard_released=False)
        with self.assertRaisesRegex(measurement_dispatch.OperationalHold, "gpu_pod_teardown_uncertain"):
            supplement.teardown(provider, cleanup["job"], pod_id, cleanup["reservation_id"], approval)
        supplement.verify_receipt(receipt, state, approval)
        for drift in ({"runtime_supplement": None}, {"pod_id": "another-instance"},
                      {"native_teardown": dict(cleanup, guard_released=False)},
                      {"native_teardown": dict(cleanup, attempt_id=pod_id)},
                      {"native_launch": dict(approval, location="FIN-03")},
                      {"runtime_supplement": dict(runtime, effective_image="sha256:" + "b" * 64)}):
            with self.subTest(drift=drift), self.assertRaisesRegex(
                    measurement_dispatch.OperationalHold, "existing_measurement_receipt_changed"):
                supplement.verify_receipt(dict(receipt, **drift), state, approval)
        with self.assertRaisesRegex(measurement_dispatch.OperationalHold, "existing_measurement_receipt_changed"):
            supplement.verify_receipt(receipt, state, dict(approval, approval_sha256="d" * 64))

    def test_pending_order_bindings_block_hardware_drift(self):
        approval = {"approval_sha256": "b" * 64, "packet_sha256": "c" * 64, "location": "FIN-02"}
        pod = {"gpu": "RTXPRO6000", "gpu_count": 1, "instance_type": "1RTXPRO6000.30V",
               "location": "FIN-02"}
        self.assertEqual(supplement.launch_binding(approval), approval)
        with self.assertRaisesRegex(measurement_dispatch.OperationalHold, "strands_e2b_native_admission_required"):
            supplement.launch_binding(dict(approval, location="ICE-01"))
        supplement.verify_created_pod(pod, approval)
        supplement.verify_created_pod(dict(pod, instance_type="1RTXPRO6000.30V.CC"), approval)
        self.assertEqual(supplement.INSTANCE_TYPES, ("1RTXPRO6000.30V", "1RTXPRO6000.30V.CC"))
        for drift in ({"gpu_count": True}, {"gpu_count": 2}, {"location": "FIN-03"},
                      {"gpu": "H100"}, {"instance_type": "1H100.80S.30V"},
                      {"instance_type": "2RTXPRO6000.60V"}, {"instance_type": "1RTXPRO6000.30V.cc"},
                      {"instance_type": "1RTXPRO6000.30V.CC.INTEL"}, {"instance_type": None}):
            with self.subTest(drift=drift), self.assertRaisesRegex(
                    measurement_dispatch.OperationalHold, "gpu_pod_quote_changed"):
                supplement.verify_created_pod(dict(pod, **drift), approval)

    def test_lifecycle_keeps_full_lease_and_uses_exact_teardown_after_attach_error(self):
        from pod_runner import PodRunError

        pod = {"pod_id": "2d8ef6c1-9258-459d-a9e5-83be4c0f7cf8", "gpu": "RTXPRO6000",
               "gpu_count": 1, "instance_type": "1RTXPRO6000.30V", "location": "FIN-02", "hourly_usd": 2}
        reservation = "gpu-" + "d" * 24
        approval = {"approval_sha256": "b" * 64, "packet_sha256": "c" * 64, "location": "FIN-02"}
        state = {"request_id": ORDER, "native_launch": approval}
        provider = Mock()
        provider.preflight.return_value = None
        provider.reserve.return_value = reservation
        provider.create.return_value = pod
        provider.attach.side_effect = PodRunError("attach inconclusive")
        provider.teardown_exact.side_effect = TimeoutError("slow cleanup")
        with patch.object(supplement, "active", return_value=True), \
                patch.object(pod_runner.pod_capacity, "allocation_count", return_value=0):
            with self.assertRaisesRegex(measurement_dispatch.OperationalHold, "gpu_pod_teardown_uncertain"):
                pod_runner._lifecycle(provider, "fastlane-eval-0616c39d", {}, None, self.root, state,
                                      supplement.GPU, 2.75, 15, None, Mock(), job_dir=self.job)
        provider.reserve.assert_called_once_with("fastlane-eval-0616c39d", "pod-measure", 5, 15, 3)
        provider.create.assert_called_once_with("RTXPRO6000", 2.75, 13.75)
        provider.teardown_exact.assert_called_once_with("fastlane-eval-0616c39d", pod["pod_id"], reservation, approval)
        provider.rm.assert_not_called()
        provider.release.assert_not_called()
        self.assertEqual(state["pod_id"], pod["pod_id"])
        self.assertEqual(state["reservation_id"], reservation)
        self.assertTrue(state["cleanup_uncertain"])
        self.assertEqual(state["spent_upper_bound_usd"], 15)
        self.assertNotIn("native_teardown", state)

    def test_dispatch_and_wait_use_the_earlier_cutoff_and_reserve(self):
        start = datetime(2026, 11, 21, 10, tzinfo=timezone.utc)
        state = {"attempt_started_at": start.isoformat()}
        clock = lambda: start + timedelta(minutes=20)
        check = Mock(return_value=1800)
        self.assertEqual(supplement.bounded_seconds(check, state, clock, 1.5, 300, 3600), 1500)
        check.assert_called_once_with("remaining_seconds", state)
        check.return_value = 9999
        self.assertEqual(supplement.bounded_seconds(check, state, clock, 1, 300, 3600), 2100)
        self.assertEqual(supplement.bounded_seconds(check, state, clock, 1.5, 300, 100), 100)
        for live in (None, True, float("nan"), 300, -10):
            with self.subTest(live=live), self.assertRaisesRegex(pod_runner.PodRunError, "cleanup_margin"):
                supplement.bounded_seconds(Mock(return_value=live), state, clock, 1.5, 300, 3600)
        with self.assertRaisesRegex(pod_runner.PodRunError, "cleanup_margin"):
            supplement.bounded_seconds(check, state, clock, 1.5, pod_runner.HOST_RUN_RESERVE_S, 900)

    def test_time_expiry_between_post_upload_prep_and_launch(self):
        now = datetime(2026, 11, 21, 10, tzinfo=timezone.utc)
        gate = Mock(side_effect=[350, 301, 300])
        provider = Mock()
        provider.exec_bounded.return_value.returncode = 0
        attempt = supplement.AttemptIO(provider, "pod", gate, {"attempt_started_at": now.isoformat()},
                                       lambda: now, 1.5)
        attempt.exec(["tar", "-xf", "/work/stage.tar"])
        attempt.timeout(600, supplement.RESULT_COLLECTION_RESERVE_S)
        with self.assertRaisesRegex(pod_runner.PodRunError, "cleanup_margin"):
            attempt.exec(["docker", "run"])
        provider.exec_bounded.assert_called_once_with("pod", ["tar", "-xf", "/work/stage.tar"], 50)

    def test_wait_expiry_and_partial_receipt_fetch_yield_to_cleanup(self):
        now = datetime(2026, 11, 21, 10, tzinfo=timezone.utc)
        gate = Mock(side_effect=[320, 65, 15])
        provider = Mock()
        provider.exec_bounded.return_value.returncode = 124
        attempt = supplement.AttemptIO(provider, "pod", gate, {"attempt_started_at": now.isoformat()},
                                       lambda: now, 1.5)
        with self.assertRaisesRegex(pod_runner.PodRunError, "exit 124"):
            attempt.exec(["docker", "wait"], 3600)
        provider.exec_bounded.assert_called_once_with("pod", ["docker", "wait"], 20)

        def transfer(_pod, _remote, partial, _timeout):
            Path(partial).write_bytes(b"fixture evidence")

        provider.scp_from_bounded.side_effect = transfer
        attempt.fetch("/work/out/raw.jsonl", self.root / "raw.jsonl")
        with self.assertRaisesRegex(pod_runner.PodRunError, "cleanup_margin"):
            attempt.fetch("/work/out/receipt.json", self.root / "pod-receipt.json")
        provider.scp_from_bounded.assert_called_once_with("pod", "/work/out/raw.jsonl",
                                                         str(self.root / "raw.jsonl.partial"), 50)
        self.assertFalse((self.root / "pod-receipt.json").exists())
        self.assertEqual((self.root / "raw.jsonl").read_bytes(), b"fixture evidence")

    def test_verda_bounded_transport_has_no_extra_minute_or_lookup(self):
        from verda_provider import VerdaProvider

        provider = VerdaProvider(ORDER, "fixture")
        self.addCleanup(provider._tmp.cleanup)
        provider._hosts["pod"] = "192.0.2.1"
        with patch("verda_provider.subprocess.run", return_value=subprocess.CompletedProcess([], 0)) as run:
            provider.exec_bounded("pod", ["docker", "wait", "container"], 20)
            self.assertEqual(run.call_args.kwargs["timeout"], 20)
            self.assertEqual(run.call_args.args[0][-1], "timeout --kill-after=1s 19s docker wait container")
            provider.scp_from_bounded("pod", "/work/raw", str(self.root / "raw"), 37)
            self.assertEqual(run.call_args.kwargs["timeout"], 37)
            with self.assertRaisesRegex(pod_runner.PodRunError, "verified endpoint"):
                provider.exec_bounded("other", ["true"], 20)
            self.assertEqual(run.call_count, 2)

    def test_timed_out_raw_transfer_preserves_noncanonical_partial_data(self):
        now = datetime(2026, 11, 21, 10, tzinfo=timezone.utc)
        gate = Mock(side_effect=[45, 15])
        provider = Mock()
        attempt = supplement.AttemptIO(provider, "pod", gate, {"attempt_started_at": now.isoformat()},
                                       lambda: now, 1.5)

        def timed_out(_pod, _remote, partial, _timeout):
            Path(partial).write_bytes(b"partial")
            raise pod_runner.PodRunError("transfer timed out")

        provider.scp_from_bounded.side_effect = timed_out
        with self.assertRaisesRegex(pod_runner.PodRunError, "transfer timed out"):
            attempt.fetch("/work/out/raw.jsonl", self.root / "raw.jsonl")
        with self.assertRaisesRegex(pod_runner.PodRunError, "cleanup_margin"):
            attempt.fetch("/work/out/scored-loop-started.json", self.root / "started.json", maximum=90)
        self.assertFalse((self.root / "raw.jsonl").exists())
        self.assertEqual((self.root / "raw.jsonl.partial").read_bytes(), b"partial")
        provider.scp_from_bounded.assert_called_once_with("pod", "/work/out/raw.jsonl",
                                                         str(self.root / "raw.jsonl.partial"), 30)

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

    def test_equivalent_uuids_stop_before_generic_or_native_admission_reads(self):
        unopened = Mock(side_effect=AssertionError("unexpected gate or profile read"))
        with patch.object(v16_profiles, "accepted", unopened), \
                patch.object(v16_profiles, "_sha", unopened), \
                patch.object(autopickup, "validate_review_gate", unopened), \
                patch.object(pod_runner, "validate_recipe", unopened):
            for alias in (ORDER.upper(), ORDER.replace("-", ""), "{" + ORDER + "}"):
                with self.subTest(alias=alias):
                    job = self.root / alias
                    with self.assertRaisesRegex(measurement_dispatch.OperationalHold, HOLD):
                        v16_profiles.measure(job)
                    with self.assertRaisesRegex(ValueError, HOLD):
                        v16_adoption.adopt_raw(job, ({"generation": "fixture"}, {}, {}))
                    with self.assertRaisesRegex(measurement_dispatch.OperationalHold, HOLD):
                        autopickup.dispatch_measurement(OTHER, job)
                    with self.assertRaisesRegex(autopickup.PickupError, HOLD):
                        autopickup.evaluate_v16_generation(alias, self.root / OTHER)
                    for rid, directory in ((alias, self.root / OTHER), (OTHER, job)):
                        with self.assertRaisesRegex(measurement_dispatch.OperationalHold,
                                                    "strands_e2b_native_admission_required"):
                            pod_runner.run(rid, directory, {}, self.root / "output", {}, 15,
                                           measurement_pins_factory=unopened)
        unopened.assert_not_called()

    def test_existing_review_passed_mail_remains_available(self):
        row = {"id": ORDER, "status": "review_passed", "review_passed_at": "present"}
        state = {"source_review_gate": {"verdict": "PASS"}}
        effects = Mock()
        now = datetime.now(timezone.utc)
        with patch.object(autopickup, "read_template", return_value="Review passed"), \
                patch.object(autopickup, "send_tracked_mail") as send:
            autopickup.manage_evaluation(row, state, effects, now)
        send.assert_called_once()
        self.assertEqual(send.call_args.args[2:4], ("review_passed", "review_email_status"))
        self.assertFalse(effects.mock_calls)

    def test_verified_public_state_never_enters_generic_delivery_or_x(self):
        row = {"id": ORDER, "status": "paid", "visibility": "public", "release_status": "verified"}
        summary = {"outcome": "delivered", "visibility": "public", "results": []}
        state = {"verified": summary, "v16_finalization": {"recorded_by": native_owner.owner_name(ORDER)}}
        effects = Mock()
        now = datetime.now(timezone.utc)
        forbidden = Mock(side_effect=AssertionError("public or generic delivery effect"))
        with patch.object(autopickup, "gate", forbidden), \
                patch.object(autopickup, "xpost_text", forbidden), \
                patch.object(autopickup, "load_row", forbidden):
            autopickup.advance_delivery(row, state, self.job, effects, now)
            autopickup.advance_xpost(row, state, self.job, summary, effects, now)
            with self.assertRaisesRegex(autopickup.PickupError, "separate_native_public_release_required"):
                autopickup.xpost(ORDER)
        forbidden.assert_not_called()
        self.assertFalse(effects.mock_calls)

    def test_stale_sending_lease_has_no_generic_reconciliation(self):
        now = datetime.now(timezone.utc)
        row = {"id": ORDER, "status": "paid", "visibility": "public", "delivery_email_status": "sending"}
        summary = {"outcome": "delivered", "visibility": "public",
                   "results": [{"public_url": "https://example.invalid/embargoed"}]}
        state = {"verified": summary}
        effects = Mock(dry_run=False)
        forbidden = Mock(side_effect=AssertionError("generic mail recovery or public URL write"))
        with patch.object(autopickup, "managed_predicate", return_value="TRUE"), \
                patch.object(autopickup, "sql_rows", return_value=[row]) as select, \
                patch.object(autopickup, "load_state", forbidden), \
                patch.object(autopickup, "mail_sent_at", forbidden), \
                patch.object(autopickup, "update_row", forbidden):
            autopickup.recover_result_email_leases(None, self.root, effects)
            self.assertFalse(autopickup.record_result_delivery(row, state, summary, now))
        self.assertIn(f"r.id <> '{ORDER}'::uuid", select.call_args.args[0])
        forbidden.assert_not_called()

    def test_timer_and_delivery_fenced_but_operational_escalation_preserved(self):
        for status in ("pending", "failed", "running", "ready_for_release"):
            with self.subTest(status=status):
                row = {"id": ORDER, "status": "paid", "evaluation_status": status}
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
