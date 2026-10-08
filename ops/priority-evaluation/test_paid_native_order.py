"""Synthetic dual-benchmark orchestration; no customer code, inputs or provider."""
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

import measurement_dispatch as md
import pod_runner as pr
import autopickup as ap
from test_autopickup import _FakeProvider, TORCHCAST_RECIPE, pod_git_source, pod_job, pod_test_pins


class NativeOrderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.job = pod_job()
        commit, tree = pod_git_source(self.job, 'model')
        self.recipe = copy.deepcopy(TORCHCAST_RECIPE)
        for name in ('services', 'endpoint'):
            self.recipe.pop(name)
        self.recipe.update(kind='aplomb_native', model_dir='torchcast', hourly_usd=1.30,
                           code={'source': 'model', 'commit': commit, 'tree': tree})
        self.recipe['weights'][0]['revision'] = commit
        receipt_path = self.job / 'source/FETCH-RECEIPT-model.json'
        receipt = json.loads(receipt_path.read_text())
        receipt['url'] = 'https://huggingface.co/' + self.recipe['weights'][0]['repo']
        receipt_path.write_text(json.dumps(receipt))
        self.pins = pod_test_pins(self.root)
        self.pins['profile']['inputs']['jevbench']['count'] = 2
        self.pins['profile']['inputs']['imagejevbench'] = {'count': 2}
        source = Path(__file__).parent
        for name in ('pod_order_driver.py', 'native_image.py', 'aplomb_loader.py'):
            path = source / 'pod_drivers' / name
            self.pins['profile']['code']['pod_drivers/' + name] = {
                'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
        self.parts = []
        for part in ('public', 'sealed'):
            root = self.root / part
            (root / 'images').mkdir(parents=True)
            (root / 'items.jsonl').write_text(json.dumps({'token': part, 'question': 'synthetic',
                'options': [{'label': 'a'}, {'label': 'b'}], 'image': 'images/fixture.png'})+'\n')
            (root / 'images/fixture.png').write_bytes(b'synthetic image bytes')
            self.parts.append((root, '/inputs/' + part))

    def tearDown(self):
        self.temp.cleanup()
        import shutil
        shutil.rmtree(self.job)

    def test_native_text_missing_or_invalid_quote_holds_before_pod(self):
        for rate in (None, True, 2.00):
            runtime = {'backend': 'gpu_pod'}
            if rate is not None:
                runtime['gpu_usd_h'] = rate
            with self.subTest(rate=rate), \
                 mock.patch.object(ap, 'validate_review_gate', return_value={'source_pins': {}}), \
                 mock.patch.object(ap, 'load_row', return_value={'benchmarks': ['jevbench']}), \
                 mock.patch.object(ap, 'load_state', return_value={}), \
                 mock.patch.object(ap, 'load_json_file', side_effect=[{'jevbench': runtime}, {'jevbench': {}}, self.recipe, self.recipe]), \
                 mock.patch.object(md, 'runtime_spec'), \
                 mock.patch.object(md, 'validate_api_meta'), \
                 mock.patch.object(pr.native_admission, 'validate_native_admission'), \
                 mock.patch.object(pr, 'run') as run:
                with self.assertRaisesRegex(md.OperationalHold, 'reviewed_runtime_metadata_invalid'):
                    ap.dispatch_measurement('synthetic', self.job)
                run.assert_not_called()

    def test_dual_staging_contains_only_pinned_input_parts_and_fixed_code(self):
        with mock.patch.object(md, 'input_mounts', return_value=(self.parts, [], 2)):
            stage = pr.build_staging(self.recipe, self.pins, b'code fixture', ('jevbench', 'imagejevbench'))
        config = json.loads(stage['work/input/run-config.json'])
        self.assertEqual(config['counts'], {'jevbench': 2, 'imagejevbench': 2})
        self.assertEqual(stage['work/inputs/public/images/fixture.png'], b'synthetic image bytes')
        self.assertFalse(any('gold' in key or 'credential' in key for key in stage))

    def test_image_only_staging_has_no_text_input(self):
        with mock.patch.object(md,'input_mounts',return_value=(self.parts,[],2)):
            stage=pr.build_staging(self.recipe,self.pins,b'fixture',('imagejevbench',))
        self.assertNotIn('work/inputs/items.jsonl',stage)
        self.assertEqual(json.loads(stage['work/input/run-config.json'])['benchmarks'],['imagejevbench'])

    def test_legacy_driver_has_all_staged_dependencies(self):
        import subprocess
        pins=copy.deepcopy(self.pins)
        source=Path(__file__).parent/'pod_drivers/pod_driver.py'
        pins['profile']['code']['pod_drivers/pod_driver.py']={'path':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()}
        stage=pr.build_staging(TORCHCAST_RECIPE,pins,b'fixture')
        isolated=self.root/'staged-driver';isolated.mkdir()
        for name,data in stage.items():
            if name.startswith('work/driver/'):
                (isolated/Path(name).name).write_bytes(data)
        result=subprocess.run(['python3','-I','-c','import sys;sys.path.insert(0,sys.argv[1]);import pod_driver;from scored_marker import ScoredDispatchMarker',str(isolated)],capture_output=True)
        self.assertEqual(result.returncode,0,result.stderr.decode())
        self.assertNotIn('work/driver/pod_order_driver.py',stage)

    def test_one_offline_pod_yields_separate_receipts_with_cost_counted_once(self):
        class Fake(_FakeProvider):
            def scp_from(self, pod, remote, local):
                if '/jevbench/' in remote or '/imagejevbench/' in remote:
                    if remote.endswith('raw.jsonl'):
                        Path(local).write_text('{"fixture":1}\n{"fixture":2}\n')
                    else:
                        Path(local).write_text('{"rows":2}')
                else:
                    super().scp_from(pod, remote, local)
        fake = Fake()
        with mock.patch.object(md, 'pins', return_value=self.pins), \
             mock.patch.object(md, 'input_mounts', return_value=(self.parts, [], 2)), \
             mock.patch.object(pr, 'PODS_DIR', self.root / 'pods'), \
             mock.patch.object(pr, 'STATE_ROOT', self.root / 'state'), \
             mock.patch.object(pr.native_admission, 'validate_native_admission', return_value='a'*64):
            request = self.root / 'state/requests/00000000-0000-4000-8000-000000000088.json'
            request.parent.mkdir(parents=True)
            request.write_text('{}')
            receipt = pr.run('00000000-0000-4000-8000-000000000088', self.job, self.recipe,
                self.root / 'out', self.pins, 20, provider=fake, alert=lambda x: None,
                benchmarks=('jevbench', 'imagejevbench'), native_source_pins={'official_measurement':self.pins})
        self.assertEqual(set(receipt['benchmarks']), {'jevbench', 'imagejevbench'})
        self.assertEqual(sum(x['charged_or_reserved_usd'] for x in receipt['benchmarks'].values()),
                         receipt['charged_or_reserved_usd'])
        self.assertEqual(fake.removed, ['pod-1'])
        self.assertEqual(fake.next_pod, 1)
        state = json.loads((self.root / 'pods/00000000-0000-4000-8000-000000000088.json').read_text())
        self.assertEqual(state['creation_attempts'], 1)
        self.assertGreaterEqual(state['spent_upper_bound_usd'], 0)

    def test_gated_weights_fail_before_reservation_without_credential_route(self):
        path = self.job / 'source/FETCH-RECEIPT-model.json'
        receipt = json.loads(path.read_text())
        receipt['credential_repository'] = 'example/model'
        path.write_text(json.dumps(receipt))
        fake = _FakeProvider()
        with mock.patch.object(md, 'pins', return_value=self.pins), \
             self.assertRaisesRegex(md.OperationalHold, 'gated_weights_require_host_acquisition'):
            pr.run('00000000-0000-4000-8000-000000000088', self.job, self.recipe,
                self.root / 'out', self.pins, 20, provider=fake,
                benchmarks=('jevbench', 'imagejevbench'))
        self.assertEqual(fake.calls, [])

    def test_native_requires_full_admission_before_any_reservation(self):
        fake = _FakeProvider()
        with mock.patch.object(md, 'pins', return_value=self.pins), self.assertRaisesRegex(md.OperationalHold, 'native_admission_pin_mismatch'):
            pr.run('00000000-0000-4000-8000-000000000088', self.job, self.recipe,
                   self.root / 'out', self.pins, 20, provider=fake)
        self.assertEqual(fake.calls, [])

    def test_unknown_creation_crash_retains_full_ttl_charge_and_never_reserves(self):
        # Legacy fixture: no exact ID and no precharged field. Restart conservatively
        # charges the original maximum TTL, then holds for owned reconciliation.
        fake = _FakeProvider()
        state_path = self.root / 'pods/00000000-0000-4000-8000-000000000088.json'
        state_path.parent.mkdir()
        state_path.write_text(json.dumps({'creation_attempts':1, 'attempt_started_at':'2026-10-08T00:00:00+00:00'}))
        recipe = copy.deepcopy(TORCHCAST_RECIPE)
        commit, tree = pod_git_source(self.job)
        recipe['code'] = {'commit':commit,'tree':tree}
        recipe['weights'][0]['revision'] = self.recipe['weights'][0]['revision']
        with mock.patch.object(md,'pins',return_value=self.pins), mock.patch.object(pr,'PODS_DIR',self.root/'pods'), self.assertRaisesRegex(md.OperationalHold,'gpu_pod_cleanup_requires_reconciliation'):
            pr.run('00000000-0000-4000-8000-000000000088',self.job,recipe,self.root/'out',self.pins,20,provider=fake)
        self.assertEqual(json.loads(state_path.read_text())['spent_upper_bound_usd'],15)
        self.assertEqual(fake.calls,[])

    def test_uncertain_teardown_retains_precharged_ttl_and_no_fresh_retry(self):
        class Fake(_FakeProvider):
            def rm(self,pod):
                raise RuntimeError('synthetic removal unavailable')
        fake=Fake({'sha_bad':True})
        output=self.root/'out';output.mkdir()
        state={}
        with self.assertRaisesRegex(md.OperationalHold,'gpu_pod_teardown_uncertain'):
            pr._lifecycle(fake,'fixture',self.recipe,self.root/'stage.tar',output,state,('H100',80),3,20,lambda x:None,lambda:None)
        self.assertEqual(state['spent_upper_bound_usd'],15)
        self.assertTrue(state['cleanup_uncertain'])
        self.assertEqual(fake.next_pod,1)
        self.assertEqual(fake.releases,0)

    def test_caller_remaining_budget_is_cumulative_across_infrastructure_retry(self):
        class Fake(_FakeProvider):
            def exec(self,pod,command,timeout=600):
                if pod=='pod-1' and command[:2]==['docker','pull']:
                    raise pr.PodRunError('invented pre-dispatch infrastructure failure')
                return super().exec(pod,command,timeout)
        recipe=copy.deepcopy(TORCHCAST_RECIPE)
        commit,tree=pod_git_source(self.job)
        recipe['code']={'commit':commit,'tree':tree}
        recipe['weights'][0]['revision']=self.recipe['weights'][0]['revision']
        for cap,expected_creations in ((15,1),(20,2)):
            fake=Fake();pods=self.root/f'budget-pods-{cap}'
            with mock.patch.object(md,'pins',return_value=self.pins), mock.patch.object(pr,'PODS_DIR',pods):
                if cap==15:
                    with self.assertRaisesRegex(md.OperationalHold,'gpu_pod_budget_exhausted'):
                        pr.run('00000000-0000-4000-8000-000000000088',self.job,recipe,self.root/f'budget-out-{cap}',self.pins,cap,provider=fake,alert=lambda x:None)
                else:
                    record=pr.run('00000000-0000-4000-8000-000000000088',self.job,recipe,self.root/f'budget-out-{cap}',self.pins,cap,provider=fake,alert=lambda x:None)
                    self.assertEqual(record['charged_or_reserved_usd'],20)
                    self.assertIn(('create','A100',1.0,5.0),fake.calls)
            self.assertEqual(fake.next_pod,expected_creations)

    def _legacy_recipe(self):
        recipe=copy.deepcopy(TORCHCAST_RECIPE)
        commit,tree=pod_git_source(self.job)
        recipe['code']={'commit':commit,'tree':tree}
        recipe['weights'][0]['revision']=self.recipe['weights'][0]['revision']
        return recipe

    def test_restart_carries_prior_spend_and_full_order_receipt(self):
        recipe=self._legacy_recipe()
        for cap in (15,20):
            pods=self.root/f'restart-budget-{cap}';pods.mkdir()
            statefile=pods/'00000000-0000-4000-8000-000000000088.json'
            statefile.write_text(json.dumps({'creation_attempts':1,'spent_upper_bound_usd':15,'torn_down_at':'2026-10-08T00:00:00+00:00'}))
            fake=_FakeProvider()
            with mock.patch.object(md,'pins',return_value=self.pins),mock.patch.object(pr,'PODS_DIR',pods):
                if cap==15:
                    with self.assertRaisesRegex(md.OperationalHold,'gpu_pod_budget_exhausted'):
                        pr.run('00000000-0000-4000-8000-000000000088',self.job,recipe,self.root/f'restart-out-{cap}',self.pins,cap,provider=fake,alert=lambda x:None)
                    self.assertEqual(fake.calls,[])
                else:
                    record=pr.run('00000000-0000-4000-8000-000000000088',self.job,recipe,self.root/f'restart-out-{cap}',self.pins,cap,provider=fake,alert=lambda x:None)
                    self.assertEqual(record['charged_or_reserved_usd'],20)
                    self.assertIn(('create','H100',1.0,5.0),fake.calls)

    def test_restart_cleans_exact_pod_before_partial_hold_and_preserves_raw(self):
        recipe=self._legacy_recipe();pods=self.root/'known-crash';pods.mkdir()
        statefile=pods/'00000000-0000-4000-8000-000000000088.json'
        statefile.write_text(json.dumps({'creation_attempts':1,'spent_upper_bound_usd':15,'attempt_reserved_upper_bound_usd':15,'pod_id':'pod-owned','cleanup_uncertain':True,'input_dispatched':True,'reservation_id':'owned-reservation'}))
        output=self.root/'known-out';output.mkdir();raw=output/'raw.jsonl';raw.write_bytes(b'original partial evidence\n')
        class Fake(_FakeProvider):
            def scp_from(self,pod,remote,local):
                self.calls.append(('scp_from',pod,remote))
                if remote.endswith('scored-loop-started.json'):
                    Path(local).write_text('{"scored_loop_started":true}')
                else:
                    raise AssertionError('must not overwrite existingraw')
        fake=Fake();fake.pods['pod-owned']=True
        with mock.patch.object(md,'pins',return_value=self.pins),mock.patch.object(pr,'PODS_DIR',pods),self.assertRaisesRegex(md.OperationalHold,'gpu_pod_cleanup_requires_reconciliation'):
            pr.run('00000000-0000-4000-8000-000000000088',self.job,recipe,output,self.pins,20,provider=fake,alert=lambda x:None)
        self.assertEqual(fake.removed,['pod-owned']);self.assertEqual(fake.releases,1)
        self.assertEqual(fake.next_pod,0);self.assertEqual(raw.read_bytes(),b'original partial evidence\n')
        self.assertTrue((output/'scored-loop-started.json').is_file())
        self.assertIsNone(json.loads(statefile.read_text())['pod_id'])

    def test_image_price_is_source_reviewed_and_cannot_override_scorer(self):
        runtime = {'backend': 'gpu_pod', 'model': 'fixture', 'credential': 'none',
            'price_input_per_m': .03, 'price_output_per_m': .03, 'gpu_usd_h': 1.30}
        meta = {'system_key': 'fixture', 'system': {'kind': 'local', 'gpu_usd_h': 1.30}}
        md.validate_api_meta('imagejevbench', meta, runtime)
        with self.assertRaises(ValueError):
            md.validate_api_meta('imagejevbench', {'system_key':'fixture',
                'system': {'kind':'local', 'gpu_usd_h':0}}, runtime)

    def test_uncertain_teardown_keeps_reservation_and_blocks_any_retry(self):
        class Fake(_FakeProvider):
            def rm(self, pod):
                self.removed.append(pod)  # no removal: this simulates uncertainty
        fake = Fake()
        fake.pods['pod-1'] = True
        with self.assertRaisesRegex(md.OperationalHold, 'gpu_pod_teardown_uncertain'):
            pr._teardown(fake, 'fixture', 'pod-1', 'reservation', lambda x: None)
        self.assertEqual(fake.releases, 0)

    def test_original_fresh_pod_creation_budget_is_not_reset(self):
        fake = _FakeProvider()
        state = {'creation_attempts':2, 'spent_upper_bound_usd':3.0}
        with self.assertRaises(pr.PodRunError):
            pr._lifecycle(fake, 'fixture', self.recipe, self.root/'stage.tar',
                self.root/'out', state, ('H100',80), 3, 17, lambda x:None, lambda:None)
        self.assertEqual(fake.next_pod, 0)
        self.assertEqual(state['creation_attempts'], 2)
        self.assertEqual(state['spent_upper_bound_usd'], 3.0)


if __name__ == '__main__':
    unittest.main()
