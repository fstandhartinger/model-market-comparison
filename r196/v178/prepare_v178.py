"""Read pinned scored aggregates and raw hash only; preserve editable public entry prose."""
import copy,hashlib,json,pathlib,re
J=pathlib.Path(__file__).resolve().parent;I=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r24-score');F=I/'field-r16a'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
ep=I/'ENTRIES-R16A-REVIEWED.json';assert sha(ep)=='c7e71affeb9c44f021e516e5f8281c2a2a1e3f0a0bf52d780e13b8f239c341f6'
source=L(ep);local=L(J/'inputs/ENTRY-JEFF11M.json');kitpath=I.parent/'r45-jeff11/rows.json';kit=L(kitpath)['rows']['medium'];D={};R={}
for k,e in source.items():
 raw=pathlib.Path(e['raw']);expected='9fdf4800785147b1c7b308cecbc07362e7726fb7f2481910cbdaa76b75c6bb89';assert sha(raw)==expected
 en=local[k]['entry'];assert en['revision']==kit['rev'] and en['repo'].removeprefix('https://huggingface.co/')==kit['repo'] and 'base_model' not in en
 basis=L(F/f'out-v17-share/{k}.json')['cost']['basis']
 basis=basis.replace('release-owner price handoff, ','').replace('r168 re-freeze','re-freeze')
 # Public wording is an editable build input; keep the scorer's resolved reference.
 en['cost_basis']=re.sub(r'\{REF\}',lambda m: re.search(r'(?:deepinfra|openrouter):[^ ,;]+',basis)[0],en['cost_basis']) if '{REF}' in en['cost_basis'] else en['cost_basis']
 d={'registry':{f:v for f,v in L(F/'REGISTRY.json')[k].items() if f not in ['disclosure','cost_basis','code_revision','endpoint_condition']},'measured_on':'2026-10-26','raw_sha256':expected,'model_pin':kit['repo']+'@'+kit['rev']}
 d['registry']['licence']=en['licence']
 r={'entry_path':str(ep),'entry_sha256':sha(ep),'raw_sha256':expected,'raw_verified_in_place':True,'registry_sha256':sha(F/'REGISTRY.json'),'rows_sha256':sha(kitpath),'resolved_cost_basis':basis}
 for mode in ['frozen','v17-off','v17-share']:
  p=F/f'out-{mode}/jevbench-v1.6.0-results.json';s=copy.deepcopy(next(s for s in L(p)['systems'] if s['key']==k))
  assert [round(x,2) for x in [s['capability'],s['axes']['intelligence'],s['axes']['calibration'],s['axes']['speed'],s['axes']['cost'],s['scores']['A']]]==[81.89,74.49,89.28,73.98 if mode=='v17-share' else 74.07,53.79,70.51 if mode=='v17-share' else 70.53],'STOP scored numbers differ'
  assert round(s['axes']['speed'],4)==(73.9815 if mode=='v17-share' else 74.0682),'STOP precise Speed differs'
  assert s['status']['rows']==s['status']['answered_ok']==1500 and s['cost']['kind']=='estimate' and 'base_model' not in s
  s['cost']['basis']=en['cost_basis'];s.update({f:en[f] for f in ['display','author','licence','disclosure','code_revision','endpoint_condition'] if f in s});d[mode]=s;r[mode]={'path':str(p),'sha256':sha(p)}
 assert d['v17-share']['decision_limit']['n_over_limit']==0
 assert round(d['v17-share']['cost']['usd_per_1000'],5)==0.03469
 assert round(d['v17-share']['cost']['common_basis']['usd_per_1000_all_items'],5)==0.03758
 assert local[k]['explicit_ref']=={'in':0.05,'out':0.15,'key':'google/gemma-3-12b-it'}
 for f in ['axes','scores','views','capability','composite_ci95','intelligence','calibration','validity','cost','status','support']:assert d['frozen'][f]==d['v17-off'][f],f
 D[k]=d;R[k]=r
assert not re.search(r'\{[A-Za-z_][A-Za-z0-9_]*\}',json.dumps([local,D]))
put(J/'inputs/ENTRY-JEFF11M.json',local);put(J/'src/inputs.json',D);put(J/'receipts/INPUTS.json',R)
print('PASS source/raw SHA pins, model revision from rows.json, exact scores, 1500 answers, zero timeouts, frozen/off parity, resolved public cost text')
