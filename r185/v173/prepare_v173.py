"""Capture the supplied scored GPU replacement. Verify raw in place; copy aggregates only."""
import copy,hashlib,json,pathlib
J=pathlib.Path(__file__).resolve().parent
I=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/workers/r185-e4b-score')
L=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
k='chon-1.0-e4b';ep=I/'ENTRIES-CHONE4B-R185.json';e=L(ep)[k];reg=L(I/'field-chone4b/REGISTRY.json')[k]
rmt=e['entry']['remeasure'];raw=pathlib.Path(e['raw'])
assert sha(raw)==rmt['new_raw_sha256']=='a48a935bd4857c5790239cfc39c28f4fd75c52a52051deb3f01d25ff2a5484b0'
assert rmt['supersedes_base_row']=={'key':k,'raw_sha256':'e5258cc6e1d4cfa34fd4b2ee2ee1602941e3848b10012e7b3273db704f05d42f','endpoint_kind':'cpu'}
assert rmt['draw']=='v1.6-regular-20261012' and e['zero_output'] and e['entry']['ranked'] and e['expect']['ok']==1500
# Pin entry as an editable input: any prescore wording fix is captured by rerunning this step.
put(J/'inputs/ENTRIES-CHONE4B-R185.json',L(ep))
d={'entry':copy.deepcopy(e['entry']),'registry':{f:v for f,v in reg.items() if f not in ['disclosure','cost_basis','code_revision','endpoint_condition']},'measured_on':'2026-10-25','raw_sha256':sha(raw)}
r={'entry_path':str(ep),'entry_sha256':sha(ep),'registry_sha256':sha(I/'field-chone4b/REGISTRY.json'),'raw_sha256':sha(raw),'raw_verified_in_place':True,'raw_hash_source':'in-place verification; raw not copied','handoff_sha256':sha(I/'HANDOFF-CHONE4B-R185.md')}
for mode in ['frozen','v17-off','v17-share']:
 p=I/f'field-chone4b/out-{mode}/jevbench-v1.6.0-results.json'
 d[mode]=copy.deepcopy(next(s for s in L(p)['systems'] if s['key']==k));r[mode]={'path':str(p),'sha256':sha(p)}
for f in ['axes','scores','views','jevbench_score','capability','composite_ci95','intelligence','calibration','validity','cost','status','support']:
 assert d['frozen'][f]==d['v17-off'][f],f
assert d['v17-share']['v16']['ci95']['B']==1000 and d['v17-share']['v16']['ci95']['seed']==26
assert d['v17-share']['decision_limit']['n_over_limit']==0
put(J/'src/inputs.json',{k:d});put(J/'receipts/INPUTS.json',{k:r})
print('Captured GPU aggregate replacement; raw verified in place; frozen/off exact parity; B=1000 seed=26')
