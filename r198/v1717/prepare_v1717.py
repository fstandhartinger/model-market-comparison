"""Capture only trusted aggregate scorer output; sealed records are never rendered."""
import pathlib,json,hashlib,copy
from rows_v1717 import *
from pricing_reference_v1717 import reference,PIN
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];B=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919');S=B/'r198/v1717/score';F=S/'field/fnew';P=S/'private';D=pathlib.Path('/home/flori/jevbench-sealed/v1.6-run')/DRAW_ID
L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
put=lambda p,d:pathlib.Path(p).write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
assert sha('/home/flori/jobs/jevbench-v16-run-20261001/harness/score_v16.py')=='02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9'
assert sha(B/'r160/scorer/score_v17.py')=='6363458d208a52f4ad5aaf73027cad1b7e0358ff962e581d57a3cc462c8f1978'
cs=L(P/'COMMON-SET.json');oldcs=L(B/'r197/v1716/score/private/COMMON-SET.json')
assert (cs['common_n'],cs['common_set_sha256'])==(oldcs['common_n'],oldcs['common_set_sha256'])==(1489,'4e912731e63369e1b3066b0b4afa87b44f1094aea079c5b41dc6d02e7f235537'), 'STOP common set changed; do not re-cost'
assert len(cs['rows'])==9
for k,v in oldcs['rows'].items():assert cs['rows'][k]['raw_sha256']==v['raw_sha256'], ('carried raw pin',k)
N=cs['common_n'];raw=D/f'runs-auto-intake/{KEY}.raw.jsonl';rh='96e11049d1593d75ee84fe258f6a6c4020c9e37ebe299c7d18a3b6846fbacf81';assert sha(raw)==rh
kit=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r63-jevstyle2b');assert L(kit/'out/jevstyle2b/pull-sha256.json')['raw.jsonl']==rh
assert sha(kit/'SHAS.txt')=='9ae16901690e06f5328caa4da6f5ee6b66d14b796cd8e681f6a3c498505f21d5'
kit_entries={line.split(maxsplit=1)[1].lstrip('*'):line.split()[0] for line in (kit/'SHAS.txt').read_text().splitlines() if line.strip()}
for name in ['PREREG-JEVSTYLE2B.md','rows.json']:
 path=next(n for n in kit_entries if n.lstrip('./')==name);assert sha(kit/path)==kit_entries[path], ('frozen kit document',name)
inp=D/'inputs/input-selfhosted-1500.jsonl';assert sha(inp)=='9b2f32edaccb29afd726af8cd54cf1a22d85e8b1824566924045d83c6f828426'
rows=[json.loads(l) for l in raw.read_text().splitlines() if l.strip()];ids=[json.loads(l)['task_id'] for l in inp.read_text().splitlines() if l.strip()];assert [r['task_id'] for r in rows]==ids
ok=[r for r in rows if r['ok'] and r['status_code']==200 and not r.get('error')];refused=[r for r in rows if r['status_code']==400];assert len(rows)==1500 and len(ok)==1495 and len(refused)==5
assert all(not r['ok'] and r['error'] and r['probs_as_returned'] is None for r in refused)
assert hashlib.sha256(json.dumps(sorted(r['task_id'] for r in refused),separators=(',',':')).encode()).hexdigest()=='8d7957c3ee9da390b38a249dc2bc72db04fa26b185ce600beb1ffcb1aa47b543'
assert all(r['usage']['output_tokens']==0 and r['probs_source']=='native' for r in ok)
excluded=set(L(P/'cost-basis-v1717.json')['exclude_opaque_ids']);tin=sum(r['usage']['input_tokens'] for r in ok);tc=sum(r['usage']['input_tokens'] for r in ok if r['task_id'] not in excluded);lat=sorted(r['latency_s'] for r in rows);assert sum(x>10 for x in lat)==0
reg=L(F/'REGISTRY.json')[KEY];price=reference(KEY,reg);assert price['in']==0.02 and price['out']==0.1
usd=1000*tc*price['in']/1e6/N;ua=1000*tin*price['in']/1e6/1500
pins={'common_set':{'n':N,'set_sha256':cs['common_set_sha256'],'set_hash_rule':cs['set_hash_rule'],'cost_basis_sha256':cs['cost_basis_sha256'],'cost_basis_msft_view_sha256':cs['cost_basis_msft_sha256'],'common_set_receipt_sha256':sha(P/'COMMON-SET.json'),'per_row_membership':{k:{'answered_ok':r['ok'],'rows':r['rows'],'answered_not_in_common':r['answered_not_in_common'],'raw_sha256':r['raw_sha256']} for k,r in cs['rows'].items()}},KEY:{}}
d={};pp=pins[KEY]
for mode in ['frozen','v17-off','v17-share']:
 p=F/f'out-{mode}/jevbench-v1.6.0-results.json';res=L(p);assert res['G_med']==2.573387642438244 and res['bootstrap']['B']==1000 and res['bootstrap']['bootstrap_seed']==16
 assert res['v16']['cost_basis']['file_sha256']==cs['cost_basis_sha256'], ('scorer cost-basis pin',mode)
 s=res['systems'][0];assert len(res['systems'])==1 and s['key']==KEY and s['v16']['n_items']==1500
 assert s['status']=={'answered_ok':1495,'missing':0,'rows':1500,'status':'complete'}
 assert abs(s['cost']['usd_per_1000']-usd)<1e-15 and s['cost']['common_basis']=={'n_items':N,'rule':'common','usd_per_1000_all_items':ua}
 d[mode]=copy.deepcopy(s);pp[mode]={'path':str(p),'sha256':sha(p)}
sh=d['v17-share'];en=copy.deepcopy(ROW);en['disclosure']=en['disclosure'].format(P50=f"{sh['speed']['p50_s_raw']:.3f} s",P95=f"{sh['speed']['p95_s_raw']:.3f} s",MAX=f'{lat[-1]:.3f} s');en['cost_basis']=en['cost_basis'].replace('{TIN}',f'{tc:,}').replace('{N}',f'{N:,}').replace('{FIG}',cost_figures(usd,N,ua))
d.update(registry=reg,measured_on='2026-10-28',raw_sha256=rh,usd_per_1000=usd,usd_per_1000_all_items=ua,input_tokens_all=tin,input_tokens_common=tc,output_tokens=0,n_items=1500,n_answered=1495,n_refused=5,latency_max_s=lat[-1])
for mode in ['frozen','v17-off','v17-share']:
 for f in ['display','author','disclosure','endpoint_condition']:d[mode][f]=en[f]
 d[mode]['cost']['basis']=en['cost_basis']
pp.update(raw_sha256=rh,raw_verified_in_place=True,kit_shas_sha256=sha(kit/'SHAS.txt'),gold_sha256=sha(D/'frozen/gold.jsonl'),manifest_sha256=sha(D/'inputs/manifest.json'),input_sha256=sha(inp),registry_sha256=sha(F/'REGISTRY.json'),pull_receipt_sha256=sha(kit/'out/jevstyle2b/pull-sha256.json'))
cells={}
for mode in ['off','share']:
 p=F/f'cells/{mode}/categories.json';dp=F/f'cells/{mode}/decisive.json';cj=L(p);assert cj['source_results_sha256']==pp['v17-'+mode]['sha256'] and 'topics' not in cj['systems'][KEY]
 cells['cells_'+mode]=cj['systems'][KEY];cells['noul_'+mode]=L(dp)[KEY];cells['pool_'+mode]={dim:{x['key']:x['n'] for x in cj[dim]} for dim in ['families','usecases','languages']};pp['cells_'+mode]={'categories_sha256':sha(p),'decisive_sha256':sha(dp)}
assert cells['pool_off']==cells['pool_share'] and sum(cells['pool_share']['languages'].values())==1500
co=L(W/'r197/v1716/src/carried-off.json');i16=L(W/'r197/v1716/src/inputs.json');FLD=['axes','capability','jevbench_score','scores','speed','views']
for k,v in i16.items():co[k]={f:v['v17-off'][f] for f in FLD}
put(J/'inputs/ENTRIES.json',{KEY:{'entry':en}});put(J/'src/inputs.json',{KEY:d});put(J/'src/cells.json',{KEY:cells});put(J/'src/recost.json',{});put(J/'src/carried-off.json',co);put(J/'receipts/INPUTS.json',pins)
put(J/'receipts/PRECONDITIONS.json',{'status':'PASS','common_set_unchanged':True,'raw_sha256':rh,'pricing_sha256':PIN,'n':N,'set_sha256':cs['common_set_sha256']})
print('PASS three scorer views, 1500 denominator, 1495 answered, 5 pre-registered misses; unchanged nine-raw set',N,cs['common_set_sha256'][:8],'; native input',tin,'common',tc,'output 0; USD/1000',usd,'all-items',ua)
