"""Build from pinned d1012 scorer aggregates; original raw bound separately."""
import pathlib,json,hashlib,copy,shutil,argparse,subprocess
from rows_v1720 import *
ap=argparse.ArgumentParser();ap.add_argument('--comparison-only',action='store_true');args=ap.parse_args()
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7';REV='v1.7.20';PREV='v1.7.19'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();cp=copy.deepcopy
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
old={n:L(V/f'jevbench-{PREV}-{n}.json') for n in ['results','categories','proof','publication']};r=cp(old['results']);by={s['key']:s for s in r['systems']};prior=cp(by);cat=cp(old['categories']);inputs=L(J/'src/inputs.json');cells=L(J/'src/cells.json');entries=L(J/'inputs/ENTRIES.json');pins=L(J/'receipts/INPUTS.json');new={};bounds={}
for k in KEYS:
 d=inputs[k];e=entries[k]['entry'];s=cp(d['v17-share']);assert k not in by
 for f in ['display','author','repo','endpoint_condition','disclosure','model_pin','licence']:s[f]=cp(e[f])
 s.update(provider='self-hosted',method='v1.7',new_in=REV,measured_in=REV,last_measured_on='2026-10-13',measurement_date_status='measured',paid_fast_lane=True,ranked=True,full_coverage=True)
 s['cost']['basis']=e['cost_basis'];s['listing']='ranked_over_cap' if s['cost']['usd_per_1000']>CAP else 'ranked'
 s['noul_decisive']=cells[k]['noul_share'];sib=prior['knowline-31b-gen1'];s['draw']={**cp(sib['draw']),'release':REV,'measured_on':'2026-10-13','results_sha256':pins[k]['v17-share']['sha256']}
 assert s['v16']['g_med_used']==s['draw']['g_med']==9.839526770355711
 assert s['cost']['common_basis']['n_items']==1485
 cat['systems'][k]=cells[k]['cells_share'];cat['lanes'][k]='selfhosted';bounds[k]=cells[k]['pool_share']
 by[k]=s;new[k]={'raw_sha256':d['raw_sha256'],'raw_binding':pins[k],'scored_input_sha256':pins[k]['v17-share']['sha256'],'model_pin':s['model_pin'],'price_reference':d['price_reference'],'axes':s['axes'],'composite_ci95':s['composite_ci95'],'decision_limit':s['decision_limit'],'treatment':s['listing'],'cost':{'usd_per_1000':d['usd_per_1000'],'usd_per_1000_all_items':d['usd_per_1000_all_items'],**d['tokens'],'kind':'estimate'},'category_pool_bounds':bounds[k]}
rank_changes={}
for metric in ['A','B','C','capability']:
 value=lambda s:s['capability'] if metric=='capability' else s['scores'][metric]
 ordered=sorted([s for s in by.values() if s['ranked']],key=lambda s:(-value(s),s.get('ranks',{}).get(metric) or 999999,s['key']))
 r['board'][metric]['order']=[s['key'] for s in ordered]
 for i,s in enumerate(ordered):
  s.setdefault('ranks',{})[metric]=i+1
  if metric=='A':s['rank']=i+1
for k,s in prior.items():
 now=cp(by[k]);before=cp(s)
 for f in ['rank','ranks']:now.pop(f,None);before.pop(f,None)
 assert now==before,('carried scored row changed',k)
 if by[k].get('ranks')!=s.get('ranks'):rank_changes[k]={'before':s.get('ranks'),'after':by[k].get('ranks')}
source_inputs={f:sha(J/p) for f,p in {'scored_rows_sha256':'src/inputs.json','entry_sha256':'inputs/ENTRIES.json','cells_sha256':'src/cells.json','recost_sha256':'src/recost.json'}.items()}
r.update(revision=REV,label='JevBench v1.7.20: Lychee-27B',systems=sorted(by.values(),key=lambda s:s['key']),n_ranked=sum(bool(s['ranked']) for s in by.values()),roster_count=len(by),run_kind='same-draw-addendum',source_sha256=hashlib.sha256(json.dumps(source_inputs,sort_keys=True).encode()).hexdigest(),source_note=HIST)
r['measurement_notes']=old['results']['measurement_notes']+[HIST]+[by[k]['disclosure'] for k in KEYS]
r['addendum']={'predecessor':PREV,'new_keys':KEYS,'remeasured_keys':[],'repriced_keys':[],'link_fixed_keys':[],'text_fixed_keys':[],'method_change':False,'same_draw':DRAW_ID,'cost_basis':{'rule':'common','n_items':1485,'cost_basis_sha256':L(J/'inputs/FIELD-META.json')['cost_basis_sha256']}}
put(V/f'jevbench-{REV}-results.json',r);cat.update(revision=REV,results_sha256=sha(V/f'jevbench-{REV}-results.json'),source_results_sha256=r['source_sha256'],results_sha256_note='Carried cells unchanged; new family, language, subject-topic and use-case cells scored from the original raw on the 12 Oct draw.');put(V/f'jevbench-{REV}-categories.json',cat)
for n in ['carry','history','history-carry']:shutil.copyfile(V/f'jevbench-{PREV}-{n}.json',V/f'jevbench-{REV}-{n}.json')
a=L(J/'inputs/APPROVAL.json');tf=J/'receipts/topfive-diff.json'
if tf.exists() and not args.comparison_only:
 diff=L(tf);assert diff['lists']==580, 'incomplete top-five comparison'
proof={'schema_version':1,'revision':REV,'predecessor':{'revision':PREV,'publication_sha256':sha(V/f'jevbench-{PREV}-publication.json')},'source_inputs':source_inputs,'method':r['method'],'pricing_module_sha256':'645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4','scorers':old['proof']['scorers'],'carried_rows':len(prior),'carried_rows_equal_except':['rank','ranks'],'rank_changes':rank_changes,'exceptions':{k:{f:{'before':prior[k].get(f),'after':by[k].get(f)} for f in ['rank','ranks'] if prior[k].get(f)!=by[k].get(f)} for k in rank_changes},'cost_basis':r['addendum']['cost_basis'],'same_draw':by[KEYS[0]]['draw'],'new_rows':new,'remeasured_rows':{},'repriced_rows':{},'link_fixed_rows':[],'text_fixed_rows':[],'publication_approval':a,'topfive_diff_sha256':sha(tf) if tf.exists() else a['top_five_preview']['sha256'],'omissions':{},'raw_binding':'Original 13 Oct raw SHA-256 verified against retained private run and original fast-lane handoff; rescored with frozen d1012 tools.', 'consent':a['consent']}
proof['derived_rank_exceptions']=json.loads(subprocess.run(['node',str(J/'derived_ranks_v1720.mjs')],check=True,capture_output=True,text=True,cwd=W).stdout)
proof['derived_rank_fields']=['rank','open_board_rank','api_board_rank','capability.rank','capability.open_board_rank','capability.api_board_rank']
put(V/f'jevbench-{REV}-proof.json',proof);pub=cp(old['publication']);pub.update(revision=REV,predecessor=proof['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None});pub['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.7/jevbench-{REV}-{n}.json','sha256':sha(V/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']};put(V/f'jevbench-{REV}-publication.json',pub)
put(J/'receipts/NEW-ROW-SPEC.json',{k:by[k] for k in KEYS});put(J/'receipts/NEW-ROW-BOUNDS.json',bounds);put(J/'receipts/RANK-CHANGES.json',rank_changes)
print('PENDING candidate built;',len(prior),'carried scored rows/cells unchanged;',len(rank_changes),'carried rank records updated by insertion; scoring captured separately')
