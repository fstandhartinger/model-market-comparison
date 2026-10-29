import pathlib,json,hashlib,subprocess
from rows_v1720 import KEYS,CAP,LICENCE,DISCLOSURE
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];B=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919');V=W/'data/raw/benchmarks/jevbench/v1.7';L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();proof=L(V/'jevbench-v1.7.20-proof.json');H=pathlib.Path('/home/flori/jobs/jevbench-v16-run-20261001/harness');S17=B/'r160/scorer'
paths={n:(S17/('PINS-v17.json' if n=='pins_v17' else n+'.py') if n in ['pins_v17','run_under_v17','score_v17'] else H/(n+'.py')) for n in proof['scorers']};assert all(sha(p)==proof['scorers'][n] for n,p in paths.items())
assert proof['scorers']['score_v16'].startswith('02132271') and proof['scorers']['score_v17'].startswith('6363458d')
P=pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py');assert sha(P)==proof['pricing_module_sha256']=='645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4'
import importlib.util
sp=importlib.util.spec_from_file_location('pr',P);pr=importlib.util.module_from_spec(sp);sp.loader.exec_module(pr)
orig=L(B/'r110/private-lychee/REGISTRY-PRIVATE.json')['lychee_27b'];raw=B/'r110/private-lychee/runs/lychee_27b.jsonl';assert sha(raw)==L(J/'receipts/RAW-BINDING.json')['sha256']=='692e430e1df69ded64c52022b2dff8697e001f106a2d4bd458fba15702242670'
d=L(J/'src/inputs.json')['lychee-27b'];assert all(d['registry'][f]==orig[f] for f in ['author','base_model','endpoint_condition','support']);entry=L(J/'inputs/ENTRIES.json')['lychee-27b']['entry'];assert entry['model_pin']['base']==orig['base_model'] and entry['model_pin']['revision']==orig['revision'];assert tuple(pr.reference('lychee-27b',d['registry'],pr.catalog_rates())[1])==(.42,3.)
t=d['tokens'];cost=t['input_tokens_common']*.42/1e6*1000/1485;assert abs(cost-d['v17-share']['cost']['usd_per_1000'])<1e-12 and cost>CAP
assert proof['cost_basis']['cost_basis_sha256']==L(V/'jevbench-v1.7.18-proof.json')['cost_basis']['cost_basis_sha256']
assert d['v17-share']['decision_limit']['n_over_limit']==L(J/'receipts/RAW-BINDING.json')['n_over_10s']==15
r=next(s for s in L(V/'jevbench-v1.7.20-results.json')['systems'] if s['key']=='lychee-27b');assert r['licence']==LICENCE and r['disclosure']==DISCLOSURE and r['paid_fast_lane'] and r['ranked'] and r['listing']=='ranked_over_cap';assert r['decision_limit']['limit_s']==10 and r['decision_limit']['treatment']=='share' and r['v16']['g_med_used']==9.839526770355711
assert r['v16']['ci95']['B']==1000
files=[]
for v in ['16','17','18','19']:
 files += [f'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.{v}-{n}.json' for n in ['results','categories','proof','publication','carry','history','history-carry']]+[f'lib/jevbench-v17{v}-release.mjs']
for f in files:assert (W/f).read_bytes()==subprocess.check_output(['git','show','65a8810ea:'+f],cwd=W),f
receipt={'status':'PASS','tools_verified':{n:sha(p) for n,p in paths.items()},'pricing_sha256':sha(P),'frozen_reference':[.42,3.],'usd_per_1000':cost,'cap_ratio':cost/CAP,'predecessor_files_byte_equal':len(files),'consent':'Original fastlane owner confirms Gmail uid35123, accepted by release owner #32063/#32071; no new publication authorized here.'};(J/'receipts/SOURCE-PRICING.json').write_text(json.dumps(receipt,indent=1)+'\n');print('PASS frozen scorer/cell tools, pricing, ranked over-cap paid row, original consent and 32 predecessor files byte equal')
