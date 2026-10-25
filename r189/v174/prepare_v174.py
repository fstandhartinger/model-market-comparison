"""Verify source bytes in place and capture scored aggregates only. Preserve editable prose."""
import copy,hashlib,json,pathlib,re
J=pathlib.Path(__file__).resolve().parent
I=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r24-score');K='dopest-1.0-31b'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
ep=I/'ENTRIES-R12A-LEAD.json';assert sha(ep)=='48a056a3e8ea066cf6ee30cf1939adf2075db5be3c2a27083d93c4f325705ab7'
e=L(ep)[K];raw=pathlib.Path(e['raw']);assert sha(raw)=='33fe1dc0d85a195fe0bd65d1d0a0fb21c9d78abc1d6c72631eceec306bf33ee8'
reg=L(I/'field-r12a2/REGISTRY.json')[K]
p=J/'inputs/ENTRY-DOPEST.json'
if not p.exists():
 local=copy.deepcopy(e);en=local['entry']
 en['code_revision']=en['code_revision'].split(' Florian code gate:')[0]+" Source reviewed before measurement; only the six-module serving closure was executed in an offline, credential-free disposable environment. The upstream DOPEST-studio/dopest-model repository became private (HTTP 401) on 25 Oct 2026 after review; the measured vendored bytes remain pinned above. No server code is redistributed by this release. Weights are a BF16 base plus adapter, not a merged checkpoint."
 en['cost_basis']=en['cost_basis'].replace(', r168 re-freeze of 22 Oct 2026',', snapshot of 22 Oct 2026').replace('; release-owner handoff #26108','').replace('release-owner convention #25647, as applied to Vera and, by release-owner ruling #26107, to Turion','the published native-probability convention, as applied to Vera and Turion').replace('{REF}','google/gemma-4-31b-it USD 0.09/M input and USD 0.34/M output; the output term is zero because output usage is zero')
 en['disclosure']=re.sub(r' \(zero-based 65,.*?1418\)','',en['disclosure'])
 en['disclosure']=en['disclosure'].replace('counted and frozen by the lead before launch (plan sha256 357796ef…, preregistered, PREREG Amendment 1)','counted and frozen before launch in the preregistered truncation plan')
 en['disclosure']=en['disclosure'].split(' ATTEMPT HISTORY:')[0]+" ATTEMPT HISTORY: three attempts, one measured. Attempt 1 stopped with no scored output, most likely because of an evaluator strict-wrapper import-path defect; missing driver logs prevent definitive attribution. Input was staged but no item reached the model. Attempt 2 was stopped before any item was processed for a usage-gate check. Neither attempt produced a sealed item result; the measured third attempt answered all 1,500 rows. These attempts belong to one admitted measurement."
 en['endpoint_condition']=re.sub(r', instance type .*?, USD ', ', USD ',en['endpoint_condition'])
 en['licence']=en['licence'].replace('(release owner decides licence and redistribution)','(no serving code redistributed here)')
 put(p,{K:local})
d={'registry':{f:v for f,v in reg.items() if f not in ['disclosure','cost_basis','code_revision','endpoint_condition']},'measured_on':'2026-10-25','raw_sha256':sha(raw)}
r={'entry_path':str(ep),'entry_sha256':sha(ep),'registry_sha256':sha(I/'field-r12a2/REGISTRY.json'),'raw_sha256':sha(raw),'raw_verified_in_place':True,'handoff_sha256':sha(I/'HANDOFF-R12A.md'),'scored_source_note':'field-r12a2 has no out-* directories; field-r12a aggregate outputs used, with reviewed entry text and field-r12a2 registry/runs. All required scored numbers independently asserted.'}
expected={'frozen':(82.43,67.84),'v17-off':(82.43,67.84),'v17-share':(81.97,67.76)}
for mode,(speed,comp) in expected.items():
 p=I/f'field-r12a/out-{mode}/jevbench-v1.6.0-results.json';s=copy.deepcopy(next(s for s in L(p)['systems'] if s['key']==K));d[mode]=s;r[mode]={'path':str(p),'sha256':sha(p)}
 assert round(s['capability'],2)==82.03 and round(s['axes']['intelligence'],2)==73.86 and round(s['axes']['calibration'],2)==90.20 and round(s['axes']['cost'],2)==49.20 and round(s['axes']['speed'],2)==speed and round(s['scores']['A'],2)==comp, 'STOP: scored numbers differ'
 assert s['cost']['usd_per_1000']==0.049372545454545454 and s['cost']['common_basis']['usd_per_1000_all_items']==0.05941758
 assert s['cost']['kind']=='estimate' and s['decision_limit']['n_over_limit']==0 if mode=='v17-share' else s['cost']['kind']=='estimate'
for f in ['axes','scores','views','jevbench_score','capability','composite_ci95','intelligence','calibration','validity','cost','status','support']:assert d['frozen'][f]==d['v17-off'][f],f
assert d['v17-share']['v16']['ci95']['B']==1000 and d['v17-share']['v16']['ci95']['seed']==29
put(J/'src/inputs.json',{K:d});put(J/'receipts/INPUTS.json',{K:r})
print('PASS source entry/raw SHA; required numeric values; frozen/off equality; editable public prose retained')
