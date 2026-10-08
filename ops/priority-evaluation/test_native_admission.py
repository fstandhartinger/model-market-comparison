"""Synthetic admission contract fixtures; no actual custody grants or inputs."""
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import measurement_dispatch
import native_admission as admission


def sha(value):
    return hashlib.sha256(value).hexdigest()


class AdmissionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.job = Path(self.temp.name) / 'synthetic-job'
        self.job.mkdir()
        self.root = Path(self.temp.name) / 'synthetic-drivers'
        self.root.mkdir()
        self.patcher = patch.object(admission, 'ROOT', self.root)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        code = {}
        for name in admission.DRIVERS:
            path = self.root / name
            path.parent.mkdir(exist_ok=True)
            path.write_bytes(b'# synthetic first-party fixture')
            code[name] = {'path': name, 'sha256': sha(path.read_bytes())}
        fetched = {'which': 'model', 'url': 'https://example.invalid/synthetic/model',
                   'commit': 'a' * 40, 'tree': 'b' * 40}
        fetch_sha = self.write('source/FETCH-RECEIPT-model.json', fetched)
        self.pins = {'model': {key: fetched[key] for key in ('url', 'commit', 'tree')},
                     'official_measurement': {'manifest_sha256': 'c' * 64,
                       'driver_sha256': 'd' * 64, 'profile': {'code': code}},
                     'official_methods': {'synthetic_method': 'e' * 64}}
        self.pins['model']['receipt_sha256'] = fetch_sha
        review = self.job / 'review/CODE-REVIEW.md'
        review.parent.mkdir()
        review.write_bytes(b'Synthetic independent source review. Not authorization.')
        gate = {'verdict': 'PASS', 'source_pins': self.pins, 'review_sha256': sha(review.read_bytes())}
        self.write('review/GATE.json', gate)
        self.state = {'source_review_gate': gate}
        self.recipe = {'kind': 'aplomb_native', 'code': {'source': 'model', 'commit': 'a' * 40,
                       'tree': 'b' * 40}, 'hourly_usd': 1.25, 'synthetic_recipe_only': True}
        self.benchmarks = ['jevbench']
        self.binding = {'model': self.pins['model'], 'official_measurement': self.pins['official_measurement'],
                        'official_methods': self.pins['official_methods'], 'benchmarks': self.benchmarks,
                        'recipe_sha256': admission._canonical({'recipe': self.recipe, 'benchmarks': self.benchmarks}),
                        'hourly_usd': 1.25, 'driver_sha256': {name: code[name]['sha256'] for name in code},
                        'source_review_sha256': gate['review_sha256']}
        evidence = {'verified': True, 'evidence_sha256': 'f' * 64,
                    'verification_contract': 'Synthetic authenticated custody fixture only'}
        self.receipt = {'schema_version': 1, 'verdict': 'ACCEPTED', 'binding': self.binding,
                        'issuer': 'synthetic-custodian', 'authentication_evidence_sha256': 'f' * 64}
        input_sha = self.write('review/OFFICIAL-INPUT-ADMISSION.json', self.receipt)
        method_sha = self.write('review/NATIVE-METHOD-ACCEPTANCE.json', self.receipt)
        self.state['official_input_admission'] = {'verdict': 'ACCEPTED', 'binding': self.binding,
                                                  'custodian_receipt_sha256': input_sha}
        self.state['method_acceptance'] = {'verdict': 'ACCEPTED', 'binding': self.binding,
                                           'receipt_sha256': method_sha}
        accepted = {'official_input_admission': input_sha, 'method_acceptance': method_sha}
        self.contract = {'schema_version': 1, 'verdict': 'ACCEPTED', 'binding': self.binding,
                         'authenticated_receipts': accepted, 'authorized_issuers': ['synthetic-custodian'],
                         'custodian_authentication': evidence}
        contract_sha = self.write('review/NATIVE-CUSTODY-CONTRACT.json', self.contract)
        self.independent = {'schema_version': 1, 'verdict': 'ACCEPTED', 'reviewer_engine': 'claude',
                            'contract_sha256': contract_sha, 'authenticated_receipts': accepted,
                            'custodian_authentication': evidence, 'authorized_issuers': ['synthetic-custodian'],
                            'authentic_custodian_receipts_verified': True, 'schema_accepted': True}
        independent_sha = self.write('review/NATIVE-CUSTODY-REVIEW.json', self.independent)
        self.state['native_custody_contract'] = {'verdict': 'ACCEPTED', 'contract_sha256': contract_sha,
                                                'independent_review_sha256': independent_sha}

    def write(self, relative, value):
        path = self.job / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        raw = json.dumps(value, sort_keys=True).encode()
        path.write_bytes(raw)
        return sha(raw)

    def validate(self, **changes):
        values = {'job': self.job, 'state': self.state, 'recipe': self.recipe,
                  'benchmarks': self.benchmarks, 'pins': self.pins}
        values.update(changes)
        return admission.validate_native_admission(**values)

    def test_exact_synthetic_contract_returns_binding_hash(self):
        digest = self.validate()
        self.assertRegex(digest, r'^[0-9a-f]{64}$')
        self.assertEqual(digest, self.validate())

    def test_each_missing_fixed_receipt_holds(self):
        for relative in ('review/OFFICIAL-INPUT-ADMISSION.json', 'review/NATIVE-METHOD-ACCEPTANCE.json',
                         'review/NATIVE-CUSTODY-CONTRACT.json', 'review/NATIVE-CUSTODY-REVIEW.json'):
            path = self.job / relative
            raw = path.read_bytes()
            path.unlink()
            with self.subTest(relative=relative), self.assertRaises(measurement_dispatch.OperationalHold):
                self.validate()
            path.write_bytes(raw)

    def test_recipe_selection_quote_and_model_pin_changes_hold(self):
        for recipe in ({**self.recipe, 'hourly_usd': 1.5},
                       {**self.recipe, 'code': {'source': 'model', 'commit': '0' * 40, 'tree': 'b' * 40}},
                       {**self.recipe, 'new_inference_switch': True}):
            with self.subTest(recipe=recipe), self.assertRaises(measurement_dispatch.OperationalHold):
                self.validate(recipe=recipe)
        with self.assertRaises(measurement_dispatch.OperationalHold):
            self.validate(benchmarks=['jevbench', 'imagejevbench'])
        with self.assertRaises(measurement_dispatch.OperationalHold):
            self.validate(pins=self.pins['official_measurement'])

    def test_missing_model_cannot_compare_equal_to_none(self):
        changed = copy.deepcopy(self.state)
        changed['source_review_gate']['source_pins']['model'] = None
        self.write('review/GATE.json', changed['source_review_gate'])
        with self.assertRaises(measurement_dispatch.OperationalHold):
            self.validate(state=changed, pins=changed['source_review_gate']['source_pins'])

    def test_hash_shaped_acceptance_is_not_enough(self):
        state = copy.deepcopy(self.state)
        state['official_input_admission']['custodian_receipt_sha256'] = '1' * 64
        with self.assertRaises(measurement_dispatch.OperationalHold):
            self.validate(state=state)

    def test_issuer_only_cannot_self_grant(self):
        state = copy.deepcopy(self.state)
        del state['native_custody_contract']
        with self.assertRaises(measurement_dispatch.OperationalHold):
            self.validate(state=state)

    def test_receipt_tampering_even_with_state_hash_update_holds(self):
        receipt = {**self.receipt, 'issuer': 'self-appointed'}
        digest = self.write('review/OFFICIAL-INPUT-ADMISSION.json', receipt)
        state = copy.deepcopy(self.state)
        state['official_input_admission']['custodian_receipt_sha256'] = digest
        with self.assertRaises(measurement_dispatch.OperationalHold):
            self.validate(state=state)

    def test_independent_evidence_must_explicitly_accept_schema_and_authenticity(self):
        for key in ('schema_accepted', 'authentic_custodian_receipts_verified'):
            review = {**self.independent, key: False}
            digest = self.write('review/NATIVE-CUSTODY-REVIEW.json', review)
            state = copy.deepcopy(self.state)
            state['native_custody_contract']['independent_review_sha256'] = digest
            with self.subTest(key=key), self.assertRaises(measurement_dispatch.OperationalHold):
                self.validate(state=state)

    def test_driver_and_source_review_bytes_are_bound(self):
        path = self.root / admission.DRIVERS[0]
        path.write_bytes(b'changed')
        with self.assertRaises(measurement_dispatch.OperationalHold):
            self.validate()

    def test_symlink_receipt_holds(self):
        path = self.job / 'review/OFFICIAL-INPUT-ADMISSION.json'
        raw = path.read_bytes()
        outside = Path(self.temp.name) / 'outside.json'
        outside.write_bytes(raw)
        path.unlink()
        path.symlink_to(outside)
        with self.assertRaises(measurement_dispatch.OperationalHold):
            self.validate()

    def dispatch_patches(self):
        import autopickup
        runtime = {'jevbench': {'backend': 'gpu_pod', 'credential': 'none',
                               'model': 'synthetic/model', 'gpu_usd_h': 1.25}}
        files = {'RUNTIME.json': runtime, 'MEASUREMENT-META.json': {'jevbench': {}},
                 'POD-RECIPE.json': self.recipe}
        return autopickup, [
            patch.object(autopickup, 'validate_review_gate', return_value={'source_pins': self.pins}),
            patch.object(autopickup, 'load_row', return_value={'benchmarks': ['jevbench']}),
            patch.object(autopickup, 'load_state', return_value=self.state),
            patch.object(autopickup, 'load_json_file', side_effect=lambda path, cap: files[path.name]),
            patch.object(autopickup.measurement_dispatch, 'runtime_spec'),
            patch.object(autopickup.measurement_dispatch, 'validate_api_meta'),
            patch.object(autopickup, 'STATE_ROOT', Path(self.temp.name) / 'host-state'),
            patch.object(autopickup, 'save_state'),
            patch.object(autopickup, 'score_measurement'),
        ]

    def test_text_only_dispatch_holds_before_pod_run_when_admission_absent(self):
        from contextlib import ExitStack
        autopickup, patches = self.dispatch_patches()
        self.state.pop('method_acceptance')
        with ExitStack() as stack:
            for item in patches:
                stack.enter_context(item)
            runner = stack.enter_context(patch.object(autopickup.pod_runner, 'run'))
            with self.assertRaises(measurement_dispatch.OperationalHold):
                autopickup.dispatch_measurement('synthetic-order', self.job)
            runner.assert_not_called()

    def test_text_only_native_dispatch_uses_combined_receipt_and_raw_path(self):
        from contextlib import ExitStack
        autopickup, patches = self.dispatch_patches()
        record = {'raw_sha256': '1' * 64, 'charged_or_reserved_usd': 0}
        with ExitStack() as stack:
            for item in patches:
                stack.enter_context(item)
            runner = stack.enter_context(patch.object(autopickup.pod_runner, 'run',
                return_value={'benchmarks': {'jevbench': record}}))
            copied = stack.enter_context(patch.object(autopickup.shutil, 'copyfile'))
            autopickup.dispatch_measurement('synthetic-order', self.job)
            self.assertEqual(runner.call_args.kwargs['benchmarks'], ('jevbench',))
            self.assertEqual(runner.call_args.kwargs['native_source_pins'], self.pins)
            self.assertEqual(copied.call_args.args[0], Path(self.temp.name) /
                'host-state/measurements/synthetic-order/gpu-order/jevbench/raw.jsonl')
            self.assertEqual(self.state['host_measurement']['jevbench'], record)


if __name__ == '__main__':
    unittest.main()
