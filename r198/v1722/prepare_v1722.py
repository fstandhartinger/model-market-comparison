"""Capture only trusted aggregate scorer output; sealed records are never rendered."""
import pathlib,json,hashlib,copy
from rows_v1722 import *
from pricing_reference_v1722 import reference,PIN
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];B=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919');S=B/'workers/r198-v1722-build/score';F=S/'field/fnew';P=S/'private';D=pathlib.Path('/home/flori/jevbench-sealed/v1.6-run')/DRAW_ID
L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
put=lambda p,d:pathlib.Path(p).write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
assert sha('/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py')=='02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9'
assert sha(B/'r160/scorer/score_v17.py')=='6363458d208a52f4ad5aaf73027cad1b7e0358ff962e581d57a3cc462c8f1978'
cs=L(P/'COMMON-SET.json');oldcs=L(B/'r197/v1716/score/private/COMMON-SET.json')
assert (cs['common_n'],cs['common_set_sha256'])==(oldcs['common_n'],oldcs['common_set_sha256'])==(1489,'4e912731e63369e1b3066b0b4afa87b44f1094aea079c5b41dc6d02e7f235537'), 'STOP common set changed; do not re-cost'
assert len(cs['rows'])==8
for k,v in oldcs['rows'].items():assert cs['rows'][k]['raw_sha256']==v['raw_sha256'], ('carried raw pin',k)
N=cs['common_n'];raw=D/'runs-auto-intake/ezoushen-umpire-35b-a3b-bf16.raw.jsonl';rh='d1568cc82b893339bc4b5bc21c49a036190851cfcd7d10cd2a343dab910711ad';assert sha(raw)==rh
kit=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r81-umpire');assert L(kit/'out/umpire/pull-sha256.json')['raw.jsonl']==rh
assert sha(kit/'SHAS.txt')=='bd6ae6818815b861f3cb7bf144f2fd3a0a78b4fac50e0359020d91650a99d806'
kit_entries={line.split(maxsplit=1)[1].lstrip('*'):line.split()[0] for line in (kit/'SHAS.txt').read_text().splitlines() if line.strip()}
for name in ['PREREG-UMPIRE.md','rows.json']:
 path=next(n for n in kit_entries if n.lstrip('./')==name);assert sha(kit/path)==kit_entries[path], ('frozen kit document',name)
inp=D/'inputs/input-selfhosted-1500.jsonl';assert sha(inp)=='9b2f32edaccb29afd726af8cd54cf1a22d85e8b1824566924045d83c6f828426'
rows=[json.loads(l) for l in raw.read_text().splitlines() if l.strip()];ids=[json.loads(l)['task_id'] for l in inp.read_text().splitlines() if l.strip()];assert [r['task_id'] for r in rows]==ids
ok=[r for r in rows if r['ok'] and r['status_code']==200 and not r.get('error')];refused=[r for r in rows if r['status_code']==400];assert len(rows)==1500 and len(ok)==1495 and len(refused)==5
assert all(not r['ok'] and r['error'] and r['probs_as_returned'] is None for r in refused)
assert all(r['usage']['output_tokens']==0 and r['probs_source']=='native' for r in ok)
assert sha(P/'cost-basis-v1722.json')==cs['cost_basis_sha256']=='b83bdfd14c263ffacfa572b304084154afca84c1f00083101a33783ae6f8b356'
excluded=set(L(P/'cost-basis-v1722.json')['exclude_opaque_ids'])
assert len(excluded)==11 and len(set(ids)-excluded)==1489
assert hashlib.sha256(json.dumps(sorted(set(ids)-excluded),separators=(',',':')).encode()).hexdigest()==cs['common_set_sha256']
tin=sum(r['usage']['input_tokens'] for r in ok);tc=sum(r['usage']['input_tokens'] for r in ok if r['task_id'] not in excluded);lat=sorted(r['latency_s'] for r in rows);assert sum(x>10 for x in lat)==0
reg=L(F/'REGISTRY.json')[KEY];price=reference(KEY,reg);assert price['in']==0.3125 and price['out']==1.25
usd=1000*tc*price['in']/1e6/N;ua=1000*tin*price['in']/1e6/1500
assert tin==621390
assert sha('/home/flori/jobs/jevbench-auto-intake/workers/entries-umpire/ENTRIES-UMPIRE.json')=='2e8c6ff845a608344f6725d6b86682a64433ce012b6de271b81e40b886517d83'
draft=L('/home/flori/jobs/jevbench-auto-intake/workers/entries-umpire/ENTRIES-UMPIRE.json')[KEY]
assert draft['expect']=={'failed':5,'input_tokens':tin,'ok':1495,'output_tokens':0,'status_counts':{'200':1495,'400':5}}
pins={'common_set':{'n':N,'set_sha256':cs['common_set_sha256'],'set_hash_rule':cs['set_hash_rule'],'cost_basis_sha256':cs['cost_basis_sha256'],'cost_basis_msft_view_sha256':cs['cost_basis_msft_sha256'],'common_set_receipt_sha256':sha(P/'COMMON-SET.json'),'per_row_membership':{k:{'answered_ok':r['ok'],'rows':r['rows'],'answered_not_in_common':r['answered_not_in_common'],'raw_sha256':r['raw_sha256']} for k,r in cs['rows'].items()}},KEY:{}}
pins['common_set']['per_row_membership']=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.21-proof.json')['cost_basis']['per_row_membership']
pins['common_set']['per_row_membership'][KEY]={'answered_ok':1495,'rows':1500,'answered_not_in_common':sum(r['task_id'] in excluded for r in ok),'raw_sha256':rh}
d={};pp=pins[KEY]
for mode in ['frozen','v17-off','v17-share']:
 p=F/f'out-{mode}/jevbench-v1.6.0-results.json';res=L(p);assert res['G_med']==2.573387642438244 and res['bootstrap']['B']==1000 and res['bootstrap']['bootstrap_seed']==16
 assert res['v16']['cost_basis']['file_sha256']==cs['cost_basis_sha256'], ('scorer cost-basis pin',mode)
 s=res['systems'][0];assert len(res['systems'])==1 and s['key']==KEY and s['v16']['n_items']==1500
 assert s['status']=={'answered_ok':1495,'missing':0,'rows':1500,'status':'complete'}
 assert abs(s['cost']['usd_per_1000']-usd)<1e-15 and s['cost']['common_basis']['n_items']==N and abs(s['cost']['common_basis']['usd_per_1000_all_items']-ua)<1e-15
 ua=s['cost']['common_basis']['usd_per_1000_all_items']
 d[mode]=copy.deepcopy(s);pp[mode]={'path':str(p),'sha256':sha(p)}
sh=d['v17-share'];en=copy.deepcopy(ROW);en['disclosure']=en['disclosure'].format(P50=f"{sh['speed']['p50_s_raw']:.3f} s",P95=f"{sh['speed']['p95_s_raw']:.3f} s",MAX=f'{lat[-1]:.3f} s');en['cost_basis']=en['cost_basis'].replace('{TIN}',f'{tc:,}').replace('{N}',f'{N:,}').replace('{FIG}',cost_figures(usd,N,ua))
d.update(registry=reg,measured_on='2026-10-29',raw_sha256=rh,usd_per_1000=usd,usd_per_1000_all_items=ua,input_tokens_all=tin,input_tokens_common=tc,output_tokens=0,n_items=1500,n_answered=1495,n_refused=5,latency_max_s=lat[-1])
for mode in ['frozen','v17-off','v17-share']:
 for f in ['display','author','disclosure','endpoint_condition']:d[mode][f]=en[f]
 d[mode]['cost']['basis']=en['cost_basis']
assert en['cost_basis'].count('COST FIGURES:')==1
pp.update(raw_sha256=rh,raw_verified_in_place=True,kit_shas_sha256=sha(kit/'SHAS.txt'),gold_sha256=sha(D/'frozen/gold.jsonl'),manifest_sha256=sha(D/'inputs/manifest.json'),input_sha256=sha(inp),registry_sha256=sha(F/'REGISTRY.json'),pull_receipt_sha256=sha(kit/'out/umpire/pull-sha256.json'))
cells={}
for mode in ['off','share']:
 p=F/f'cells/{mode}/categories.json';dp=F/f'cells/{mode}/decisive.json';cj=L(p);assert cj['source_results_sha256']==pp['v17-'+mode]['sha256'] and 'topics' not in cj['systems'][KEY]
 cells['cells_'+mode]=cj['systems'][KEY];cells['noul_'+mode]=L(dp)[KEY];cells['pool_'+mode]={dim:{x['key']:x['n'] for x in cj[dim]} for dim in ['families','usecases','languages']};pp['cells_'+mode]={'categories_sha256':sha(p),'decisive_sha256':sha(dp)}
assert cells['pool_off']==cells['pool_share'] and sum(cells['pool_share']['languages'].values())==1500
co=L(W/'r198/v1717/src/carried-off.json');FLD=['axes','capability','jevbench_score','scores','speed','views']
for n in [1717,1718,1719,1720,1721]:
 for k,v in L(W/f'r198/v{n}/src/inputs.json').items():co[k]={f:v['v17-off'][f] for f in FLD}
put(J/'inputs/ENTRIES.json',{KEY:{'entry':en}});put(J/'src/inputs.json',{KEY:d});put(J/'src/cells.json',{KEY:cells});put(J/'src/recost.json',{});put(J/'src/carried-off.json',co);put(J/'receipts/INPUTS.json',pins)
put(J/'receipts/PRECONDITIONS.json',{'status':'PASS','common_set_unchanged':True,'raw_sha256':rh,'pricing_sha256':PIN,'n':N,'set_sha256':cs['common_set_sha256']})
print('PASS three scorer views, 1500 denominator, 1495 answered, 5 pre-registered misses; frozen common basis',N,cs['common_set_sha256'][:8],'; native input',tin,'common',tc,'output 0; USD/1000',usd,'all-items',ua)
