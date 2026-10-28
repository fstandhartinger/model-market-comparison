import copy, hashlib, importlib.util, json, math, pathlib, sys
J=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919'); A=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r24-score'); W=pathlib.Path(__file__).resolve().parents[2]; OUT=pathlib.Path(__file__).resolve().parent
L=lambda p:json.loads(pathlib.Path(p).read_text())
P=pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
spec=importlib.util.spec_from_file_location('pricing',P); pricing=importlib.util.module_from_spec(spec);spec.loader.exec_module(pricing)
catalog=pricing.catalog_rates(); cap=0.06459465517241379
# Pure frozen scorer helpers; this file never invokes their CLI or reads a raw/gold file.
S=pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/score_v15.py')
spec=importlib.util.spec_from_file_location('frozen_score',S); score=importlib.util.module_from_spec(spec);sys.modules[spec.name]=score;spec.loader.exec_module(score)
keys=['knowline-4b-gen5.5','knowline-26b-a4b-gen2.5']; control='knowline-31b-gen1'
pub=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.15-results.json'); live={s['key']:s for s in pub['systems']}
cat=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.15-categories.json')
rows={}; checks={}; candidates={}
for k in keys+[control]:
 tag='r9f' if k==control else 'r8c'; f=A/f'field-{tag}'; r=L(f/f'out-v17-share/{k}.json'); sm=L(f/'ROWS.json')[k];e=L(A/f'ENTRIES-{tag.upper()}-LEAD.json')[k]
 ref=pricing.reference(k,{'base_model':e['pricing_base']},catalog); pin,pout=ref[1]
 usd=1000*(sm['input_tokens_common']*pin+sm['output_tokens_common']*pout)/1e6/sm['n_common']; allusd=1000*(sm['input_tokens']*pin+sm['output_tokens']*pout)/1e6/sm['ok']
 axes=copy.deepcopy(r['axes']);axes['cost']=score.cost_score(usd);axes['speed']=score.speed(r['speed']['p50_s_raw'],r['speed']['p95_s_raw'],r['endpoint_kind'])
 scores={o:score.composite(axes,w,g) for o,(w,g) in score.OPTIONS.items()}
 cells={d:{kk:{'n':v['n'],'competence':round(v['score'],2)} for kk,v in r['v16']['breakdowns'][src].items() if v['n']>=15} for d,src in [('families','family'),('languages','lang'),('authoring_usecases','usecase')]}
 nl=r['calibration']['parts']['noul']; n=r['v16']['per_type']['noul']['n']; failed=round(nl['time_limit_failed_share']*n);dec_orig=round((1-nl['abstention_rate'])*nl['n']);correct=round(r['v16']['per_type']['noul']['accuracy']*n)
 nd={'supported':True,'n':n,'valid':nl['n']-failed,'decisive':dec_orig if failed==0 else None,'decisive_rate':dec_orig/nl['n'] if failed==0 else None,'acc_among_decisive':correct/dec_orig if failed==0 else None,'original_decisive':dec_orig,'timeout_noul':failed,'correct_post_rule':correct,'decisive_post_rule_bounds':[max(0,dec_orig-failed),dec_orig]}
 checks[k]={'current_price_reference_matches_stored':list(ref[1])==sm['ref'][1] and ref[0]==sm['ref'][0], 'common_cost_exact':usd==r['cost']['usd_per_1000'],'all_cost_exact':allusd==r['cost']['common_basis']['usd_per_1000_all_items'],'axes_exact':axes==r['axes'],'scores_exact':scores==r['scores'],'capability_exact':(axes['intelligence']+axes['calibration'])/2==r['capability'],'off_equals_frozen':all(L(f/f'out-frozen/{k}.json')[fld]==L(f/f'out-v17-off/{k}.json')[fld] for fld in ['axes','scores','capability','composite_ci95','speed','cost','intelligence','calibration','validity','status','support','views'])}
 rows[k]={**{fld:r[fld] for fld in ['axes','capability','scores','composite_ci95','speed','decision_limit','status','intelligence','calibration','validity','support','views','v16']},'pricing':{'module_sha256':hashlib.sha256(P.read_bytes()).hexdigest(),'reference':ref,'base':e['pricing_base'],'same_as_23_oct':checks[k]['current_price_reference_matches_stored']},'cost_usd_per_1000':usd,'cost_usd_per_1000_all_items':allusd,'cap_ratio':usd/cap,'cap_ratio_all_items':allusd/cap,'tokens':{fld:sm[fld] for fld in ['input_tokens','output_tokens','input_tokens_common','output_tokens_common','n_common']},'latency_max_s':sm['latency_max'],'raw_sha256_recorded':sm['raw_sha256'],'ranked':True,'treatment':sm['treatment'],'cells':cells,'noul_decisive':nd,'checks':checks[k]}
 if k!=control:candidates[k]=r
 else:
  fields=['axes','capability','scores','composite_ci95','speed','decision_limit','intelligence','calibration','validity','support','views','status']
  checks[k]['published_fields_exact']={fld:r[fld]==live[k][fld] for fld in fields};checks[k]['published_v16_exact']=r['v16']==live[k]['v16'];checks[k]['published_cost_numbers_exact']=usd==live[k]['cost']['usd_per_1000'] and allusd==live[k]['cost']['common_basis']['usd_per_1000_all_items'];checks[k]['published_cells_exact']={d:cells[d]==cat['systems'][k].get(d) for d in ['families','languages']};checks[k]['published_noul_decisive']=live[k]['noul_decisive'];checks[k]['noul_decisive_not_unique_from_aggregates']=failed>0
(OUT/'aggregate-derivation.json').write_text(json.dumps({'rows':rows,'checks':checks},indent=1,sort_keys=True)+'\n');(OUT/'candidate-rows.json').write_text(json.dumps(candidates,indent=1)+'\n')
print(json.dumps(checks,indent=1));print('Saved all aggregate-derived numeric fields; no raw or gold file read.')
