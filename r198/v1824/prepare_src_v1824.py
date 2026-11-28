"""One-off intake for v1.8.24: copies the two pinned scorer rows, the pinned category cells and the cost-proof figures into src/.
Reads only aggregate artifacts from the job folder (no sealed raw, no sealed release dir). Asserts every full sha256 first."""
import pathlib,json,hashlib,importlib.util,sys
J=pathlib.Path(__file__).resolve().parent;JOB=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919')
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest();L=lambda p:json.loads(pathlib.Path(p).read_text())
put=lambda p,v:pathlib.Path(p).write_text(json.dumps(v,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
ROWS={
 'urun-sense':{'dir':JOB/'r257/urun/score/out-v17-share','file':'urun-sense.json','row':'f6fed716585c3b99dfc9b475f9ac7abddd95cca7a8925d8565055a1e657c38e8','results':'b5b62665479f2538ae7fd69954d7f7660b8f8500f588f36053ca53297d05a83f','summary_prefix':'9b71e50b','n30_prefix':'2b1a76a9','cells_prefix':'c126b505'},
 'alibaba-decision-model-sg':{'dir':JOB/'r253b/alibaba/score/out-v17-share','file':'alibaba-decision-model-sg.json','row':'7c2f79b479a0376f688080e2945029eb5d64e13fdd4e0e39c92d7488ed4fa67e','results':'8f76856d430a4450faa7b23ebef58924e350dc2041e633cdf6629f32fb4e6453','summary_prefix':'9c3012e7','n30_prefix':'2b1a76a9','cells_prefix':'c862cb11'}}
COST=JOB/'r201i/receipts/COST-PROOF-R201I.json';assert sha(COST).startswith('21007f15')
FROZEN=JOB/'r230i/frozen/score_v15.py';assert sha(FROZEN)=='0931e05c6410b1b971201834397cb609cdb25f942723c50375632952f6dcc447'
sp=importlib.util.spec_from_file_location('frozen_composite',FROZEN);S15=importlib.util.module_from_spec(sp);sys.modules['frozen_composite']=S15;sp.loader.exec_module(S15)
cp=L(COST);assert cp['pricing_v15_sha256'].startswith('29d90b4d')
scored={};cells={};usage={};pins={}
for k,c in ROWS.items():
 d=c['dir'];assert sha(d/c['file'])==c['row'],k+' row sha';assert sha(d/'jevbench-v1.6.0-results.json')==c['results'],k+' results sha'
 assert sha(d/'NON-COST-SUMMARY.json').startswith(c['summary_prefix']) and sha(d/'N30.json').startswith(c['n30_prefix']),k+' siblings'
 cf=JOB/f'r201i/cells/{k}/categories.json';assert sha(cf).startswith(c['cells_prefix']),k+' cells sha';cat=L(cf);assert cat['source_results_sha256']==c['results'],k+' cells source';assert list(cat['systems'])==[k]
 row=L(d/c['file']);assert row['key']==k
 p=cp['rows'][k];r=p['resolve'];assert r['usd_per_1000']==p['check_arithmetic'] and r['counting_list_price'] is True and r['floor_binds'] is False and r['rankable'] is True
 assert p['release_entry_rates']['base_model'] is None and p['release_entry_rates']['source']=='api'
 usd=r['usd_per_1000'];artifact_usd=row['cost']['usd_per_1000'];artifact_axis=row['axes']['cost']
 assert S15.cost_score(artifact_usd)==artifact_axis,k+': frozen axis formula does not reproduce the artifact axis exactly'
 new_axis=S15.cost_score(usd)
 scored[k]={'v17-share':row,'pins':{'v17-share':c['row'],'results':c['results']}}
 cells[k]=cat['systems'][k]
 usage[k]={'api_pricing_v15_sha256':cp['pricing_v15_sha256'],'check_arithmetic':p['check_arithmetic'],'cost_all':usd,'cost_axis':{'artifact_usd_per_1000':artifact_usd,'artifact_axis':artifact_axis,'exact_axis':new_axis,'axis_delta':new_axis-artifact_axis,'usd_delta':usd-artifact_usd,'formula':'score_v15.cost_score: clip(100 - 30*log10(usd_per_1000/0.001), 0, 100); reproduces the artifact axis exactly from the artifact USD figure'},
  'in_per_m':p['release_entry_rates']['in_per_m'],'out_per_m':p['release_entry_rates']['out_per_m'],'input_tokens':p['token_totals'][0],'output_tokens':p['token_totals'][1],'n_items':p['n_release_set'],'ok_rows':p['ok_rows'],'non_ok_rows_in_denominator':p['non_ok_rows_in_denominator'],
  'raw_sha256':p['raw_sha256'],'registry_sha256':p['registry_sha256'],'view':p['view'],'source':'api','base_model':None,'snapshot_sha256':r['snapshot_sha256'],'note':r['note']}
 pins[k]=c['row']
put(J/'src/scored.json',scored);put(J/'src/cells.json',cells);put(J/'src/usage.json',usage);put(J/'src/new-keys.json',sorted(ROWS))
put(J/'inputs/SOURCE-PINS.json',{**{f"{('r257/urun' if k=='urun-sense' else 'r253b/alibaba')}/score/out-v17-share/{c['file']}":c['row'] for k,c in ROWS.items()},'r201i/receipts/COST-PROOF-R201I.json':sha(COST),'r230i/frozen/score_v15.py':sha(FROZEN)})
print('src written;',{k:(u['cost_all'],u['cost_axis']['axis_delta']) for k,u in usage.items()})
