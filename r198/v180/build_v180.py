"""Deterministic, aggregate-only v1.8.0 cost restatement. No inference or vault writes."""
import copy,csv,hashlib,json,math,pathlib,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
C=json.loads((J/'inputs/config.json').read_text());PREV=C['previous'];REV='v1.8.0';D=W/'data/raw/benchmarks/jevbench/v1.8';D.mkdir(parents=True,exist_ok=True)
PD=W/'data/raw/benchmarks/jevbench/v1.7';S=J/'inputs'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
hj=lambda x:hashlib.sha256(json.dumps(x,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
def put(p,v):p.write_text(json.dumps(v,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
def load(n):return json.loads((PD/f'jevbench-{PREV}-{n}.json').read_text())
old=load('results');r=copy.deepcopy(old);usage=json.loads((S/'usage.json').read_text());spec=json.loads((S/'architecture.json').read_text());meas=json.loads((S/'measurements.json').read_text())
restated={};unchanged={};valid=[]
for row in r['systems']:
 k=row['key'];m=spec.get(k);cost=row.get('cost') or {};c=cost.get('usd_per_1000')
 if not m:unchanged[k]='api';continue
 if k.startswith('jev-1.') or k=='jev-1.13.0':unchanged[k]='reference';continue
 if m['cls']=='encoder':unchanged[k]='encoder';continue
 if m['cls'] not in ['dense','small','moe'] or not m.get('verified_architecture'):unchanged[k]='unresolvable';continue
 if c is None:unchanged[k]='unpriced';continue
 u=usage['verified'].get(k)
 if not u:unchanged[k]='missing token basis';continue
 assert math.isclose(u['old_cost'],c,rel_tol=0,abs_tol=1e-12),(k,'wrong original cost')
 fam,cls,p=m['fam'],m['cls'],float(m['active_b']);constants={('dense','gemma'):313302,('dense','qwen'):317601,('small','gemma'):322343,('small','qwen'):246100,('moe','gemma'):138650,('moe','qwen'):113999}
 ts_class=min(100000,constants[cls,fam]/p);direct=meas.get(k);ts=direct['throughput'] if direct else ts_class
 gpu=1.5235*u['tokens_per_decision']*1000/(3600*ts*0.70);new=min(c,gpu)
 source=f"direct measurement, 29 Oct 2026, stock vLLM 0.32.0 EFF, fresh 200 public decisions; load_mode={direct['load_mode']}" if direct else 'architecture-class calibration, 29 Oct 2026, efficient-engine prefill; capped at 100,000 tokens/s'
 cost['usd_per_1000']=new
 cost['basis']=(f'GPU-time estimate from v1.8.0: one monthly-rented RTX PRO 6000 96 GB, EUR 999/month / 730 hours, ECB USD 1.1133/EUR dated 28 Oct 2026, USD 1.5235/hour; average load 70%. '
 f'Architecture: {cls} {fam}, {p:g}B active parameters; throughput {ts:.12g} tokens/s ({source}). '
 f'The row\'s own scored cost basis: {u["input_tokens"]:,} input + {u["output_tokens"]:,} output tokens over {u["n_items"]:,} decisions = {u["tokens_per_decision"]:.12g} tokens/decision. '
 f'GPU-time cost USD {gpu:.15g}/1,000; old list-price cost USD {c:.15g}/1,000; applied min(old list-price cost, GPU-time cost) = USD {new:.15g}/1,000. '
 +('The old list-price cost is lower, so min() keeps it. ' if c<gpu else 'The GPU-time estimate is lower. ')
 +'Estimated, not a bill. Intelligence, Calibration, measured latency and the common cost-item membership are unchanged. Prior prices remain in the archived v1.7 releases.')
 restated[k]={'old_cost':c,'new_cost':new,'gpu_cost':gpu,'tok_s':ts,'class_tok_s':ts_class,'throughput_source':'D5' if direct else 'class','load_mode':direct['load_mode'] if direct else None,'architecture_class':cls,'family':fam,'active_b':p,'usage':u,'min_applied':c<gpu}
 # Old composite intervals cannot describe the new cost. Never fabricate a bootstrap from aggregate intervals.
 if new!=c:
  row['composite_ci95']=None
  if isinstance(row.get('v16',{}).get('ci95'),dict):
   ci=row['v16']['ci95'];ci['composite']=None
  row['cost']['composite_interval_note']='Composite intervals withheld for this cost restatement; the archived intervals use the old cost. Intelligence and Calibration intervals are unchanged.'
put(J/'receipts/restatement.json',{'rows':restated,'unchanged':unchanged})
put(J/'inputs/candidate-unscored.json',r)
subprocess.run(['node',str(J/'score_v180.mjs')],cwd=W,check=True)
r=json.loads((J/'inputs/candidate-scored.json').read_text())
newly=sum(1 for s in r['systems'] if s['key'] in restated and restated[s['key']]['old_cost']>0.06459465517241379>=restated[s['key']]['new_cost'] and s['ranked'] and s['speed']['p50_s_adjusted'] is not None and s['speed']['p50_s_adjusted']<=1.2329566404223442)
NOTE=f'Cost basis for self-hosted open weights changed from base-model list prices to GPU time on a monthly-rented RTX PRO 6000 with an efficient inference engine. {len(restated)} rows have verified scored usage and a resolvable architecture; {newly} additional open-weight rows fall within both official caps. Intelligence, Calibration and latency are unchanged; API costs and both caps are unchanged. Encoders, unresolved architectures and rows without a verified token basis retain their old costs. Composite intervals affected by the cost change are withheld; the archived v1.7 intervals use the old cost. Old values remain available in v1.7.x.'
r.update(revision=REV,label='JevBench v1.8.0: GPU-time cost basis',source_note=NOTE,source_sha256=hj(restated));r['measurement_notes']=old['measurement_notes']+[NOTE]
r['addendum']=copy.deepcopy(old['addendum']);r['addendum'].update(predecessor=PREV,new_keys=[],remeasured_keys=[],repriced_keys=sorted(restated),link_fixed_keys=[],text_fixed_keys=[],method_change=True)
put(D/f'jevbench-{REV}-results.json',r)
for n in ['carry','history','history-carry']:put(D/f'jevbench-{REV}-{n}.json',load(n))
cat=load('categories');cat.update(revision=REV,results_sha256=sha(D/f'jevbench-{REV}-results.json'),source_results_sha256=r['source_sha256'],results_sha256_note='All category cells and lanes unchanged; GPU-time cost restatement.')
put(D/f'jevbench-{REV}-categories.json',cat)
changes=[]
def pin(a,b,path,key):
 if a==b:return
 if isinstance(a,dict) and isinstance(b,dict) and a.keys()==b.keys():
  for f in sorted(a):pin(a[f],b[f],path+'.'+f,key)
 else:changes.append({'path':path,'row':key,'old':a,'new':b,'before_sha256':hj(a),'after_sha256':hj(b),'reason':'v1.8.0 GPU-time cost basis'})
for i,(a,b) in enumerate(zip(old['systems'],r['systems'])):
 assert a['key']==b['key'];pin(a,b,f'results.systems[{i}]',a['key'])
board_changes=[{'path':'results.board.'+o+'.order','old':old['board'][o]['order'],'new':r['board'][o]['order'],'before_sha256':hj(old['board'][o]['order']),'after_sha256':hj(r['board'][o]['order']),'reason':'v1.8.0 GPU-time cost basis'} for o in old['board'] if old['board'][o]['order']!=r['board'][o]['order']]
pr=load('proof');pr.update(revision=REV,predecessor={'revision':PREV,'publication_sha256':sha(PD/f'jevbench-{PREV}-publication.json')},carried_rows=len(r['systems']),new_rows={},remeasured_rows={},repriced_rows=restated,exceptions=changes,carried_rows_equal_except=[x['path'] for x in changes],publication_approval=json.loads((S/'approval.json').read_text()) if (S/'approval.json').exists() else {'status':'PENDING','top_five_effect':'changed','card':None,'selection':None,'recorded_at':None,'go_quote':None})
pr['board_exceptions']=board_changes
pr['gpu_time_cost_basis']={'gpu_usd_h':1.5235,'load':0.70,'cap_tok_s':100000,'cap_cost_unchanged':0.06459465517241379,'cap_latency_unchanged':1.2329566404223442,'architecture_constants':{'dense_gemma':313302,'dense_qwen':317601,'small_gemma':322343,'small_qwen':246100,'moe_gemma':138650,'moe_qwen':113999},'unchanged':unchanged,'usage_receipt_sha256':sha(S/'usage.json'),'architecture_receipt_sha256':sha(S/'architecture.json'),'d5_receipt_sha256':sha(S/'measurements.json'),'bootstrap':'Affected composite intervals withheld; previous cost intervals are not repurposed.'}
pr['gpu_time_cost_basis']['sources']={str(p.relative_to(W)):sha(p) for p in [J/'build_v180.py',J/'score_v180.mjs',S/'usage.json',S/'architecture.json',S/'measurements.json',S/'reference-rows.csv',S/'reference-boards.json',S/'reference-params.json',S/'class-calibration.csv']}
pr.pop('top_five_comparison',None);pr.pop('topfive_diff_sha256',None)
if (J/'receipts/topfive-diff.json').exists():pr['top_five_comparison']={'base':'v1.7.22','receipt_sha256':sha(J/'receipts/topfive-diff.json')}
put(D/f'jevbench-{REV}-proof.json',pr)
md=load('publication');md.update(revision=REV,predecessor=pr['predecessor'],review={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None});md['files']={n:{'path':f'data/raw/benchmarks/jevbench/v1.8/jevbench-{REV}-{n}.json','sha256':sha(D/f'jevbench-{REV}-{n}.json')} for n in ['results','categories','carry','proof','history','history-carry']};put(D/f'jevbench-{REV}-publication.json',md)
# All rows, including unchanged rows, receive an explicit reference comparison.
for s in r['systems']:
 k=s['key'];m=spec.get(k)
 if not m:
  valid.append({'key':k,'reference_cost':s['cost']['usd_per_1000'],'release_cost':s['cost']['usd_per_1000'],'diff_pct':0,'explanation':'API row unchanged; the reference CSV covers open weights only.'});continue
 expected=float(m['cost_c']) if m.get('cost_c') else None;actual=s['cost']['usd_per_1000'];diff=(actual/expected-1)*100 if expected not in (None,0) and actual is not None else None
 if k in restated:
  rr=restated[k];uu=rr['usage'];why=f'Own scored basis: {uu["input_tokens"]} input + {uu["output_tokens"]} output / {uu["n_items"]} decisions = {uu["tokens_per_decision"]:.12g} tokens/decision; reproduces old USD {rr["old_cost"]:.15g}. Reference architecture={m.get("reference_architecture",{}).get("cls",m.get("cls"))}, active_B={m.get("reference_architecture",{}).get("active_b",m.get("active_b"))}. Reference tokens/decision={m.get("tpd") or "not recovered"}, token source={m.get("tpd_src") or "absent"}, throughput={m.get("tok_s_eff")}; actual throughput={rr["tok_s"]:.12g} ({rr["throughput_source"]}, {rr["architecture_class"]} {rr["family"]}, {rr["active_b"]:g}B). '
  if not m.get('tpd'):why+='The reference omitted recoverable original scored usage. '
  if rr['min_applied']:why+='The old list-price cost is lower, so min() preserves it. '
  why+='The release uses verified scored token totals rather than cost/input-rate inference; input and output token counts both enter GPU time.'

 else:
  reason=unchanged.get(k,'unchanged');why='Old cost retained: '+reason+'. '
  if reason=='unresolvable':why+='Declared base '+str(m.get('architecture_evidence',{}).get('base_model') or 'not resolved')+' has no verified mapping to the six calibrated Gemma/Qwen classes; a pricing proxy alone is not architecture evidence.'
  elif reason=='encoder':why+='BERT-class encoders are explicitly excluded from the GPU-time restatement.'
  elif reason=='missing token basis':why+=usage.get('unresolved',{}).get(k,'Own original scored token totals could not be independently verified; no input/output split is inferred from cost.')

 valid.append({'key':k,'reference_cost':expected,'release_cost':actual,'diff_pct':diff,'explanation':why})
with (J/'receipts/rows-validation.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=list(valid[0]));w.writeheader();w.writerows(valid)
put(J/'receipts/summary.json',{'restated':len(restated),'cost_changed':sum(x['old_cost']!=x['new_cost'] for x in restated.values()),'unchanged':unchanged,'newly_eligible':newly,'note':NOTE,'max_diff_pct':max([abs(x['diff_pct']) for x in valid if x['diff_pct'] is not None] or [0]),'rows_over_2pct':[x for x in valid if x['diff_pct'] is not None and abs(x['diff_pct'])>2]})
print('Built PENDING v1.8.0:',len(restated),'restated,',newly,'newly eligible;',len(changes),'SHA-pinned row exceptions')
# Derived working copies are recreated by each build; they are not release inputs.
for name in ['candidate-unscored.json','candidate-scored.json']:(S/name).unlink()
