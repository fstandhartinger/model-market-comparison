"""Synthetic v16 regressions; no sealed rows, pods or external requests."""
import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

import official_scoring_v16 as official_scoring
import official_score_v16 as official_score
import v16_profiles

HARNESS = Path('/home/flori/jobs/jevbench-v16-run-20261001/harness')


def fixture(root):
    refs = root / 'refs'; refs.mkdir()
    for name in ('score_v16.py','score_v15.py','score_v15_headlineA.py','noul_method_v16.py'):
        shutil.copyfile(HARNESS / name, refs / name)
    gold, rows = [], []
    for index in range(1500):
        typ = ('choice','noul','score')[index % 3]
        labels = ['no','yes'] if typ == 'noul' else ['0','1']
        ident = f'synthetic-{index}'
        gold.append(dict(opaque_id=ident, item_id=ident, split='open' if index < 300 else 'sealed',
                         type=typ, tier=('easy','standard','judge','hard')[(index // 3) % 4],
                         labels=labels, expected=1 if typ=='score' else labels[1],
                         in_A=False, family='synthetic', lang='en', usecase='synthetic'))
        rows.append(dict(task_id=ident, ok=True, probs_as_returned={labels[0]:.05,labels[1]:.95},
                         latency_s=.1, usage={'input_tokens':10,'output_tokens':1}))
    (refs / 'gold.jsonl').write_text('\n'.join(map(json.dumps,gold))+'\n')
    baseline=dict(method='jevbench-v16',protocol='jevbench::v1.6',noul_method='O1S',count=1500,
                  B=1000,bootstrap_seed=16,G_med=2.5,phase='completed_cohort')
    (refs / 'baseline.json').write_text(json.dumps(baseline))
    (refs / 'cost-basis.json').write_text(json.dumps({'exclude_opaque_ids':['synthetic-0'],
                                                   'rule':'common','reference':'synthetic'}))
    files={p.name:{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in refs.iterdir()}
    manifest=root / 'profiles.json'
    manifest.write_text(json.dumps({'schema_version':1,'profiles':{'jevbench':{'version_prefix':'v1.6.','files':files}}}))
    raw=root/'raw.jsonl'; raw.write_text('\n'.join(map(json.dumps,rows))+'\n')
    meta={'system_key':'synthetic','system':{'support':dict.fromkeys(('choice','noul','score'),'native'),
                 'endpoint_kind':'gpu','price_in_per_m':.03,'price_out_per_m':.15,'price_kind':'estimate'}}
    return refs,baseline,manifest,raw,meta


class V16Tests(unittest.TestCase):
    def test_v16_offline_adapter_matches_pinned_scorer_and_rejects_duplicate(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); refs,base,manifest,raw,meta=fixture(root)
            pins=official_scoring.pins(['jevbench'],manifest)
            result=official_scoring.run('jevbench',raw,meta,pins,manifest=manifest)
            # Direct call is solely synthetic and uses exactly the official scorer;
            # equality verifies the isolated mount/import and result conversion path.
            direct=official_score.jevbench_v16(meta,raw,refs,base)
            self.assertEqual(result,direct)
            self.assertEqual(result['aggregate']['status']['rows'],1500)
            self.assertEqual(result['aggregate']['cost']['common_basis']['n_items'],1499)
            self.assertIn('breakdowns',result['aggregate']['v16'])
            rows=raw.read_text().splitlines();rows[-1]=rows[0];raw.write_text('\n'.join(rows)+'\n')
            with self.assertRaisesRegex(ValueError,'coverage'):
                official_score.jevbench_v16(meta,raw,refs,base)

    def test_v16_rejects_wrong_method_and_missing_usage(self):
        with tempfile.TemporaryDirectory() as directory:
            refs,base,manifest,raw,meta=fixture(Path(directory))
            with self.assertRaisesRegex(ValueError,'completed independently'):
                official_score.jevbench_v16(meta,raw,refs,{**base,'G_med':None,'phase':'measurement_plan'})
            with self.assertRaisesRegex(ValueError,'baseline'):
                official_score.jevbench_v16(meta,raw,refs,{**base,'noul_method':'O0'})
            rows=[json.loads(x) for x in raw.read_text().splitlines()];rows[1]['usage']={}
            raw.write_text('\n'.join(map(json.dumps,rows))+'\n')
            with self.assertRaisesRegex(ValueError,'token usage'):
                official_score.jevbench_v16(meta,raw,refs,base)

    def test_measurement_only_baseline_has_no_invented_gap(self):
        with tempfile.TemporaryDirectory() as directory:
            refs,base,manifest,raw,meta=fixture(Path(directory))
            def phase(value):
                (refs/'baseline.json').write_text(json.dumps(value))
                spec=json.loads(manifest.read_text())
                spec['profiles']['jevbench']['files']['baseline.json']['sha256']=hashlib.sha256((refs/'baseline.json').read_bytes()).hexdigest()
                manifest.write_text(json.dumps(spec))
            phase({**base,'phase':'measurement_plan','G_med':None})
            official_scoring.pins(['jevbench'],manifest)
            phase({**base,'phase':'measurement_plan','G_med':0})
            with self.assertRaisesRegex(ValueError,'must not invent'):
                official_scoring.pins(['jevbench'],manifest)

    def test_unaccepted_host_profile_refused_before_reference_or_dispatch(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);rid='1c027833-1c49-408d-b4a0-63a4d654249b'
            job=root/rid; (job/'review').mkdir(parents=True)
            (job/'review/V16-PROFILE-ADMISSION.json').write_text('{}')
            (root/'requests').mkdir(); (root/'requests'/f'{rid}.json').write_text('{}')
            with patch.object(v16_profiles,'STATE_ROOT',root), patch.object(v16_profiles.pod_runner,'run') as run:
                with self.assertRaisesRegex(ValueError,'not accepted'):
                    v16_profiles.measure(job)
                run.assert_not_called()

class AdmissionBindingTests(unittest.TestCase):
    def test_accepted_package_rejects_stale_gate_and_mixed_method(self):
        for selector in ('model', 'code', None):
            with self.subTest(selector=selector):
                self._check_accepted_package(selector)

    def _check_accepted_package(self, selector):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);rid='1c027833-1c49-408d-b4a0-63a4d654249b';job=root/rid
            for sub in ('review','source','trusted-runner'):(job/sub).mkdir(parents=True)
            def put(path,value):
                path.write_text(json.dumps(value));return hashlib.sha256(path.read_bytes()).hexdigest()
            for name in ('RUNTIME.json', 'MEASUREMENT-META.json', 'UPSTREAM-MANIFEST.json'):
                put(job/'trusted-runner'/name, {})
            source = {}
            names = ('model',) if selector == 'model' else ('model', 'code')
            for index, name in enumerate(names):
                pin = {'commit': str(index + 1) * 40, 'tree': str(index + 3) * 40}
                digest = put(job/'source'/f'FETCH-RECEIPT-{name}.json', {**pin, 'which': name})
                source[name] = {**pin, 'receipt_sha256': digest}
            execution_pin = source[selector or 'code']
            code = {key: execution_pin[key] for key in ('commit', 'tree')}
            if selector is not None:
                code['source'] = selector
            recipe_path = job/'trusted-runner/POD-RECIPE.json'
            put(recipe_path, {'code': code})
            rotation_tool = root/'rotation.py'
            rotation_tool.write_text('# synthetic')
            measured={'profile':{'method':'jevbench-v16','inputs':{'jevbench':{'count':1500,'items':{'path':'synthetic','sha256':'input'}}},
                       'code':{'pod_drivers/pod_driver.py':{'sha256':v16_profiles._sha(Path(v16_profiles.__file__).parent/'pod_drivers/pod_driver_v16.py')}}}}
            scored={'profiles':{'jevbench':{'version_prefix':'v1.6.','files':{'gold.jsonl':{'sha256':'gold'}}}}}
            references={}
            for name in ('measurement','scoring','id_map'):
                path=root/f'{name}.json';references[name]={'path':str(path),'sha256':put(path,{})}
            measured['manifest_sha256'] = references['measurement']['sha256']
            scored['manifest_sha256'] = references['scoring']['sha256']
            freeze=root/'freeze.json'
            references['freeze']={'path':str(freeze),'sha256':put(freeze,{'release':'synthetic','counts':{'selfhosted_input':1500},
                   'input_sha256':{'selfhosted':'input'},'file_sha256':{'frozen/gold.jsonl':'gold','frozen/id-map.json':references['id_map']['sha256']}})}
            trusted={'manifest_sha256':v16_profiles._sha(job/'trusted-runner/UPSTREAM-MANIFEST.json'),
                     'files':{name:v16_profiles._sha(job/'trusted-runner'/name) for name in ('RUNTIME.json','MEASUREMENT-META.json','POD-RECIPE.json')}}
            pins={**source,'official_measurement':measured,'official_methods':scored,'trusted_runner':trusted}
            reviewsha=put(job/'review/CODE-REVIEW.md',{})
            gate={'verdict':'PASS','review_sha256':reviewsha,'source_pins':pins};put(job/'review/GATE.json',gate)
            admission={'schema_version':1,'verdict':'ACCEPTED','order_id':rid,'generation':'synthetic','draw_release':'synthetic',
                       'source_pins':source,'references':references,'rotation_tool_sha256':v16_profiles._sha(rotation_tool),
                       'recipe_sha256':v16_profiles._sha(job/'trusted-runner/POD-RECIPE.json')}
            state_path = root/'requests'/f'{rid}.json'
            state_path.parent.mkdir()
            def register(candidate, source_gate):
                admission_sha = put(job/'review/V16-PROFILE-ADMISSION.json', candidate)
                review_sha = put(job/'review/V16-PROFILE-REVIEW.json', {
                    'verdict': 'ACCEPTED', 'reviewer_engine': 'claude', 'admission_sha256': admission_sha,
                })
                put(job/'review/GATE.json', source_gate)
                put(state_path, {'source_review_gate': source_gate, 'v16_profile_admission': {
                    'verdict': 'ACCEPTED', 'receipt_sha256': admission_sha,
                    'independent_review_sha256': review_sha,
                }})
            register(admission, gate)
            with patch.object(v16_profiles, 'STATE_ROOT', root), \
                    patch.object(v16_profiles, 'ROTATION_TOOL', rotation_tool), \
                    patch.object(v16_profiles, 'measurement_pins', return_value=measured) as read_measurement, \
                    patch.object(v16_profiles.official_scoring, 'pins', return_value=scored) as read_scoring, \
                    patch.object(v16_profiles.measurement_dispatch, 'checked'):
                self.assertEqual(v16_profiles.accepted(job)[0], admission)
                read_measurement.reset_mock()
                read_scoring.reset_mock()
                protected_paths = {Path(ref['path']) for ref in references.values()}
                read_bytes = v16_profiles._reference_bytes
                def check_read(path):
                    self.assertNotIn(Path(path), protected_paths)
                    return read_bytes(path)
                with patch.object(v16_profiles, '_reference_bytes', side_effect=check_read):
                    put(job/'review/GATE.json', {**gate, 'verdict': 'FAIL'})
                    with self.assertRaisesRegex(ValueError, 'gate is missing or stale'):
                        v16_profiles.accepted(job)

                    wrong_source = dict(source)
                    if selector == 'model':
                        wrong_source['code'] = source['model']
                    else:
                        del wrong_source['code']
                    register({**admission, 'source_pins': wrong_source}, gate)
                    with self.assertRaisesRegex(ValueError, 'source inventory'):
                        v16_profiles.accepted(job)

                    register(admission, gate)
                    if selector == 'model':
                        extra = job/'source/FETCH-RECEIPT-code.json'
                        put(extra, {})
                        with self.assertRaisesRegex(ValueError, 'source inventory'):
                            v16_profiles.accepted(job)
                        extra.unlink()
                    receipt = job/'source'/f'FETCH-RECEIPT-{selector or "code"}.json'
                    receipt_bytes = receipt.read_bytes()
                    put(receipt, {'which': selector or 'code'})
                    with self.assertRaisesRegex(ValueError, 'source receipt changed'):
                        v16_profiles.accepted(job)
                    receipt.write_bytes(receipt_bytes)

                    recipe_sha = put(recipe_path, {'code': {**code, 'tree': 'f' * 40}})
                    wrong_runner = {**trusted, 'files': {**trusted['files'], 'POD-RECIPE.json': recipe_sha}}
                    register({**admission, 'recipe_sha256': recipe_sha},
                             {**gate, 'source_pins': {**pins, 'trusted_runner': wrong_runner}})
                    with self.assertRaisesRegex(ValueError, 'recipe uses different commit or tree'):
                        v16_profiles.accepted(job)

                read_measurement.assert_not_called()
                read_scoring.assert_not_called()
                put(recipe_path, {'code': code})
                register(admission, gate)
                measured['profile']['method']='jevbench-v15'
                with self.assertRaisesRegex(ValueError, 'mixed v16'):
                    v16_profiles.accepted(job)


class ManifestReadTests(unittest.TestCase):
    def test_measurement_authenticates_single_read_before_following_links(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'measurement.json'
            profile = {'schema_version': 1, 'code': {
                'trusted.py': {'path': 'trusted.py', 'sha256': 'trusted'},
            }}
            data = json.dumps(profile).encode()
            digest = hashlib.sha256(data).hexdigest()
            path.write_bytes(data)
            with patch.object(v16_profiles.measurement_dispatch, 'checked') as checked:
                with self.assertRaisesRegex(ValueError, 'manifest changed'):
                    v16_profiles.measurement_pins(path, expected_sha256='wrong', expected_profile=profile)
                with self.assertRaisesRegex(ValueError, 'profile differs'):
                    v16_profiles.measurement_pins(path, expected_sha256=digest, expected_profile={})
                checked.assert_not_called()
                read_bytes = Path.read_bytes
                reads = []
                def read_once(candidate):
                    if candidate == path:
                        reads.append(candidate)
                        self.assertEqual(len(reads), 1)
                    return read_bytes(candidate)
                with patch.object(Path, 'read_bytes', read_once):
                    actual = v16_profiles.measurement_pins(path, expected_sha256=digest, expected_profile=profile)
                self.assertEqual(actual['manifest_sha256'], digest)
                self.assertEqual(actual['profile'], profile)
                checked.assert_called_once_with(profile['code']['trusted.py'])

    def test_scoring_authenticates_manifest_before_following_links(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            baseline = root / 'baseline.json'
            baseline.write_text(json.dumps({'phase': 'measurement_plan', 'G_med': None}))
            manifest = root / 'scoring.json'
            profile = {'version_prefix': 'v1.6.', 'files': {'baseline.json': {
                'path': str(baseline), 'sha256': official_scoring.digest(baseline),
            }}}
            manifest.write_text(json.dumps({'schema_version': 1, 'profiles': {'jevbench': profile}}))
            pins = official_scoring.pins(['jevbench'], manifest)
            with patch.object(official_scoring, '_validate_profile') as follow_references:
                with self.assertRaisesRegex(ValueError, 'manifest changed'):
                    official_scoring.pins(['jevbench'], manifest, expected_pins={**pins, 'manifest_sha256': 'wrong'})
                with self.assertRaisesRegex(ValueError, 'pins differ'):
                    official_scoring.pins(['jevbench'], manifest, expected_pins={**pins, 'profiles': {}})
                follow_references.assert_not_called()
            read_bytes = Path.read_bytes
            reads = []
            def read_once(candidate):
                if candidate in (manifest, baseline):
                    self.assertNotIn(candidate, reads)
                    reads.append(candidate)
                return read_bytes(candidate)
            with patch.object(Path, 'read_bytes', read_once):
                self.assertEqual(official_scoring.pins(['jevbench'], manifest, expected_pins=pins), pins)
            self.assertEqual(reads, [manifest, baseline])


class UploadBoundaryTests(unittest.TestCase):
    def test_v16_driver_requires_exact_config_before_loading_customer_code(self):
        import importlib.util
        spec=importlib.util.spec_from_file_location('synthetic_v16_driver',Path(__file__).parent/'pod_drivers/pod_driver_v16.py')
        driver=importlib.util.module_from_spec(spec);spec.loader.exec_module(driver)
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'text-config.json'
            with self.assertRaisesRegex(ValueError,'missing host'):driver.configured_count(path)
            path.write_text(json.dumps({'method':'jevbench-v16','count':1624}))
            with self.assertRaisesRegex(ValueError,'invalid host'):driver.configured_count(path)
            path.write_text(json.dumps({'method':'jevbench-v16','count':1500}))
            self.assertEqual(driver.configured_count(path),1500)

    def test_current_retirement_rechecked_under_canonical_lock(self):
        import fcntl
        with tempfile.TemporaryDirectory() as directory:
            tool=Path(directory)/'rotation.py';tool.write_text('# synthetic')
            checks=[]
            def check(admission):
                with (tool.parent/'.lock').open('a') as other:
                    with self.assertRaises(BlockingIOError):fcntl.flock(other,fcntl.LOCK_EX|fcntl.LOCK_NB)
                checks.append(admission)
                if len(checks)>1:raise ValueError('new retirement')
            with patch.object(v16_profiles,'ROTATION_TOOL',tool),patch.object(v16_profiles,'_retirement_unlocked',side_effect=check):
                with v16_profiles.retirement_lock({'generation':'synthetic'}):pass
                with self.assertRaisesRegex(ValueError,'new retirement'):
                    with v16_profiles.retirement_lock({'generation':'synthetic'}):self.fail('must refuse transfer')
                self.assertEqual(len(checks),2)

    def test_new_provider_retirement_is_detected_from_current_ledger(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);tool=root/'rotation.py'
            shutil.copyfile(v16_profiles.ROTATION_TOOL,tool)
            sealed=[f's{i}' for i in range(1200)];public=[f'p{i}' for i in range(300)]
            (root/'reserve-index.jsonl').write_text('\n'.join(json.dumps({'id':i,'sha256':i}) for i in sealed+public)+'\n')
            draw={'type':'draw','release':'synthetic','S':sealed,'P':public,'A':[]}
            ledger=root/'ledger.jsonl';ledger.write_text(json.dumps(draw)+'\n')
            mapping=root/'map.json';mapping.write_text(json.dumps({i:{'item_id':i} for i in sealed+public}))
            admission={'draw_release':'synthetic','rotation_tool_sha256':v16_profiles._sha(tool),
                       'references':{'id_map':{'path':str(mapping)}}}
            with patch.object(v16_profiles,'ROTATION_TOOL',tool):
                v16_profiles.retirement(admission)
                with ledger.open('a') as stream:
                    stream.write(json.dumps({'type':'legacy_exposed','ids':['s0'],'providers':['provider-one','provider-two']})+'\n')
                with self.assertRaisesRegex(ValueError,'currently retired'):
                    v16_profiles.retirement(admission)

    def test_upload_gate_refusal_precedes_dispatch_state_and_scp(self):
        from contextlib import contextmanager
        from types import SimpleNamespace
        from unittest.mock import Mock
        import pod_runner as pr
        @contextmanager
        def gate():
            raise ValueError('retired at upload boundary')
            yield
        provider=SimpleNamespace(preflight=lambda *a:None,reserve=lambda *a:'reservation',
                    create=lambda *a:{'pod_id':'synthetic-pod','hourly_usd':1},attach=lambda *a:None,scp_to=Mock())
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);out=root/'out';out.mkdir();state={'request_id':'1c027833-1c49-408d-b4a0-63a4d654249b'}
            recipe={'kind':'http_typesafe','image':'synthetic@sha256:abc','weights':[]}
            with patch.object(pr,'_exec',return_value=SimpleNamespace(stdout='sha256:abc')),patch.object(pr,'_teardown'):
                with self.assertRaisesRegex(ValueError,'retired at upload'):
                    pr._lifecycle(provider,'synthetic',recipe,root/'stage',out,state,('H100',80),.5,2.5,None,lambda:None,
                                  pre_upload_gate=gate)
            provider.scp_to.assert_not_called()
            self.assertIs(state['input_dispatched'],False)
            self.assertIs(state['execution_started'],False)
