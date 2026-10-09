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
                  B=1000,bootstrap_seed=16,G_med=2.5)
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
            with self.assertRaisesRegex(ValueError,'baseline'):
                official_score.jevbench_v16(meta,raw,refs,{**base,'noul_method':'O0'})
            rows=[json.loads(x) for x in raw.read_text().splitlines()];rows[1]['usage']={}
            raw.write_text('\n'.join(map(json.dumps,rows))+'\n')
            with self.assertRaisesRegex(ValueError,'token usage'):
                official_score.jevbench_v16(meta,raw,refs,base)

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
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);rid='1c027833-1c49-408d-b4a0-63a4d654249b';job=root/rid
            for sub in ('review','source','trusted-runner'):(job/sub).mkdir(parents=True)
            def put(path,value):
                path.write_text(json.dumps(value));return hashlib.sha256(path.read_bytes()).hexdigest()
            for name in ('RUNTIME.json','MEASUREMENT-META.json','POD-RECIPE.json','UPSTREAM-MANIFEST.json'):
                put(job/'trusted-runner'/name,{})
            source={name:{'receipt_sha256':put(job/'source'/f'FETCH-RECEIPT-{name}.json',{})} for name in ('model','code')}
            measured={'profile':{'method':'jevbench-v16','inputs':{'jevbench':{'count':1500,'items':{'path':'synthetic','sha256':'input'}}},
                       'code':{'pod_drivers/pod_driver.py':{'sha256':v16_profiles._sha(Path(v16_profiles.__file__).parent/'pod_drivers/pod_driver_v16.py')}}}}
            scored={'profiles':{'jevbench':{'version_prefix':'v1.6.','files':{'gold.jsonl':{'sha256':'gold'}}}}}
            references={}
            for name in ('measurement','scoring','id_map'):
                path=root/f'{name}.json';references[name]={'path':str(path),'sha256':put(path,{})}
            freeze=root/'freeze.json'
            references['freeze']={'path':str(freeze),'sha256':put(freeze,{'release':'synthetic','counts':{'selfhosted_input':1500},
                   'input_sha256':{'selfhosted':'input'},'file_sha256':{'frozen/gold.jsonl':'gold','frozen/id-map.json':references['id_map']['sha256']}})}
            trusted={'manifest_sha256':v16_profiles._sha(job/'trusted-runner/UPSTREAM-MANIFEST.json'),
                     'files':{name:v16_profiles._sha(job/'trusted-runner'/name) for name in ('RUNTIME.json','MEASUREMENT-META.json','POD-RECIPE.json')}}
            pins={**source,'official_measurement':measured,'official_methods':scored,'trusted_runner':trusted}
            reviewsha=put(job/'review/CODE-REVIEW.md',{})
            gate={'verdict':'PASS','review_sha256':reviewsha,'source_pins':pins};put(job/'review/GATE.json',gate)
            admission={'schema_version':1,'verdict':'ACCEPTED','order_id':rid,'generation':'synthetic','draw_release':'synthetic',
                       'source_pins':source,'references':references,'rotation_tool_sha256':v16_profiles._sha(v16_profiles.ROTATION_TOOL),
                       'recipe_sha256':v16_profiles._sha(job/'trusted-runner/POD-RECIPE.json')}
            admission_sha=put(job/'review/V16-PROFILE-ADMISSION.json',admission)
            review_sha=put(job/'review/V16-PROFILE-REVIEW.json',{'verdict':'ACCEPTED','reviewer_engine':'claude','admission_sha256':admission_sha})
            state={'source_review_gate':gate,'v16_profile_admission':{'verdict':'ACCEPTED','receipt_sha256':admission_sha,'independent_review_sha256':review_sha}}
            (root/'requests').mkdir();put(root/'requests'/f'{rid}.json',state)
            with patch.object(v16_profiles,'STATE_ROOT',root), patch.object(v16_profiles,'measurement_pins',return_value=measured), \
                    patch.object(v16_profiles.official_scoring,'pins',return_value=scored),patch.object(v16_profiles.measurement_dispatch,'checked'):
                self.assertEqual(v16_profiles.accepted(job)[0],admission)
                # A stale on-disk gate cannot piggyback on host acceptance.
                put(job/'review/GATE.json',{**gate,'verdict':'FAIL'})
                with self.assertRaisesRegex(ValueError,'stale method pins'):v16_profiles.accepted(job)
                put(job/'review/GATE.json',gate)
                measured['profile']['method']='jevbench-v15'
                with self.assertRaisesRegex(ValueError,'mixed v16'):v16_profiles.accepted(job)
