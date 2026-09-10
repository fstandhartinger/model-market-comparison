import json
from pathlib import Path
reg=json.load(open('data/raw/benchmarks/registry.json'));manifest=json.load(open('ops/rebuild-2026-09/evidence/phase-04/source-manifest.json'))+json.load(open('ops/rebuild-2026-09/evidence/phase-05/public-sources/manifest.json'))+json.load(open('ops/rebuild-2026-09/evidence/phase-05/public-extra/manifest.json'))+json.load(open('ops/rebuild-2026-09/evidence/phase-05/public-final/manifest.json'))+[json.load(open('ops/rebuild-2026-09/evidence/phase-05/public-final/convex-receipt.json'))]
def source(key):
    matches=[s for s in manifest if s['url']==key and s.get('status')==200] or [s for s in manifest if key in s['url'] and s.get('status')==200]
    assert len(matches)==1,(key,len(matches))
    s=matches[0];return {k:s[k] for k in ['url','file','sha256',('retrieved_at' if 'retrieved_at' in s else 'fetched_at')]}
entries={e['id']:{'benchmark_id':e['id'],'parser':None,'status':'manual_required','reason':'No safely attributable current result parsed from captured evidence. '+e['how_to_collect']['locator'],'recipe':e['how_to_collect'],'cadence':'daily, at most one capture per source; stop on access restrictions','version_guard':e['how_to_collect']['version_guard']} for e in reg['entries'] if not e['id'].startswith('aa-')}
def put(prefix,url,rule,protocol=None,basis='measured'):
    ids=[k for k in entries if k.split('::')[0]==prefix];assert len(ids)==1,(prefix,ids)
    k=ids[0];entries[k].update(source=source(url),parser=rule,protocol=protocol or next(e['scoring']['metric'] for e in reg['entries'] if e['id']==k),basis=basis,status='collected',minimum_rows=1)
    entries[k]['recipe']['command']='python3 scripts/capture-benchmark-sources.py URL_LIST.json CAPTURE_DIR; review protocol; update candidate collection plan source receipt; python3 scripts/collect-public-benchmarks.py CANDIDATE.json'

def table(index,namecol,valcol,width,heads,headers=1):return {'kind':'html_table','table_index':index,'name_field':'name','value_field':'value','name_column':namecol,'value_column':valcol,'width':width,'header_contains':heads,'header_rows':headers}
def md(header,namecol,valcol,**extra):return {'kind':'markdown_table','header_contains':header,'name_column':namecol,'value_column':valcol,'name_field':'name','value_field':'value',**extra}
put('aider-polyglot','aider.chat/docs/leaderboards/',table(0,1,2,7,['Percent correct']), '225-exercise Polyglot benchmark; percent correct after edits; edit format and command retained per row; not a single-model run when an editor model is specified.')
put('vending-bench','andonlabs.com/evals/vending-bench-2',table(0,1,2,3,['Model','Money Balance']))
put('terminal-bench','https://www.tbench.ai/',{'kind':'terminalbench','name_field':'name','id_field':'id','value_field':'value','harness_field':'harness','context_fields':['effort','trials']},basis='self_reported')
put('pingpong-english','ping_pong_bench/en_v2',table(0,1,6,16,['Model name','Avg score']), 'English v2, unadjusted Avg score; data-weight=0.333_0.333_0.333, column 6. Source header and per-row components/uncertainty retained. Judge and interrogator protocol from the versioned publication.')
put('longbench','longbench2.github.io/',{**table(0,1,6,17,['Overall (%)'],2),'value_columns':[[5,'without CoT'],[6,'with CoT']]}, 'LongBench 2; 503 questions; overall without CoT (column 5) and with CoT (column 6) are separate observations, never merged.')
put('critpt','CritPt-Benchmark/CritPt/main/README',md('Challenge Accuracy',0,1))
put('japanese-rp-bench-aratako','Aratako/Japanese-RP-Bench/main/README',md('Overall Average',0,1))
put('japanese-rp-bench-tegnike','tegnike/Japanese-RP-Bench/main/README',md('RP Summary (95% CI)',1,4))
put('mazur-creative-story-writing','lechmazur/writing/main/README',md('Comparison score',1,2))
put('mazur-divergent-thinking','lechmazur/divergent/main/README',md('| Score |',0,1))
put('mazur-elimination-game','lechmazur/elimination_game/main/README',md('Exposed (&mu;)',1,4))
put('ruler','NVIDIA/RULER/main/README',md('|Models|',0,9,allow_ragged=True),'Published Avg across 13 tasks and context lengths. Source asterisk/length annotations retained; ragged missing Avg is not inferred.')
put('eq-bench','eqbench4_data.js',{'kind':'json_assignment','variable':'EQBENCH4_DATA','row_path':'models','name_field':'display','id_field':'model','value_field':'elo'})
for prefix,url,var,name,val,scale in [
 ('eqbench-creative-writing','creative_writing.js?','leaderboardDataCreativeWritingV3','model_name','elo_score',1),
 ('eqbench-longform-writing','creative_writing_longform.js?','leaderboardDataLongformV3','model_name','overall_score_100',1),
 ('eqbench-judgemark','judgemark-v4.js?','leaderboardDataJudgemarkV4','model','score',100),
 ('buzzbench','eqbench.com/buzzbench.js','leaderboardDataBuzzbench','model','score',1),
 ('spiral-bench','spiral-bench.js?','leaderboardDataDelusion','model_name','score_0_100',1)]:
 put(prefix,url,{'kind':'template_csv','variable':var,'name_field':name,'value_field':val,'scale':scale})
put('simple-bench','simple-bench.com/static/js/leaderboard-data.js',{'kind':'simplebench','name_field':'model','value_field':'score'},'SimpleBench MCQ AVG@5 board only; human baselines and open-ended board excluded.')
put('slop-index','theslopindex.com/bench.json',{'kind':'json','row_path':'models','name_field':'name','id_field':'id','value_field':'overall'})
put('weirdml','htihle.github.io/data/weirdml_data.csv',{'kind':'csv','name_field':'display_name','id_field':'internal_model_name','value_field':'avg_acc','scale':100})
for prefix,field in [('ugi','UGI 🏆'),('ugi-natint','NatInt 💡'),('ugi-willingness','W/10 👍'),('ugi-writing','Writing ✍️')]:
 put(prefix,'ugi-leaderboard-data.csv',{'kind':'csv','name_field':'author/model_name','plain_text_names':True,'value_field':field,'context_fields':['Prompt Template','Test Date','Model Link','Is Thinking Model']})
put('livebench','table_2026_06_25.csv',{'kind':'livebench','name_field':'model','value_field':'value','categories_source':source('categories_2026_06_25.json'),'frontend_source':source('main.ac6b12ef.js')}, 'Release 2026-06-25; seven category means with equal category weights, published 2-decimal overall and explicit Grok-3 exceptions. Complete task scores required.')
for version in ['1','2','3']:
 key='arc-agi::'+version;entries[key].update(source=source('/leaderboard/v'+version+'.json'),parser={'kind':'json','row_path':'evaluations','name_field':'modelDisplayName','id_field':'modelId','value_field':'score','scale':100,'filter_field':'datasetId','filter_value':'v'+version+'_Semi_Private','skip_field':'modelGroup','skip_values':['Human'],'display_only':True,'context_fields':['modelType','modelGroup','providerId','display','resultsUrl','costPerTask','cost','modelReleaseDate']},protocol='ARC-AGI '+version+'; v'+version+'_Semi_Private; source system/configuration retained. Evaluation independence not assumed for board submissions.',basis='self_reported',status='collected',minimum_rows=1)
for prefix,board in [('swe-bench-verified','Verified'),('swe-bench-multilingual','Multilingual'),('swe-bench-multimodal','Multimodal')]:
 put(prefix,'https://www.swebench.com/',{'kind':'swebench','board':board,'name_field':'name','id_field':'folder','value_field':'resolved','harness_field':'agent','context_fields':['agent_org','model_display','date','reasoning_effort','checked','warning','mini-swe-agent_version']},'SWE-bench '+board+' official submission board; preserved system/model/harness identity. checked is submission verification, not an assertion of independent measurement.',basis='self_reported')
for prefix,index in [('tau2-bench',2),('tau3-banking',0),('tau3-voice',1)]:
 put(prefix,'https://taubench.com/',table(index,1,2,3,['Model','Pass^1']), 'Separate '+prefix+' headline board only; no mixing text, banking or voice protocols.',basis='self_reported')
put('eqbench-slop-score','eqbench.com/data/leaderboard_results.json',{'kind':'slop_composite','name_field':'name','value_field':'value','method_source':source('https://eqbench.com/slop-score.html')},'Published Slop Score composite reconstructed from the three measured metrics and published source formula; raw precision retained, not source display rounding.')
put('mmmu','mmmu-benchmark.github.io/leaderboard_data.json',{'kind':'mmmu','name_field':'name','id_field':'id','value_field':'value'},'MMMU validation/test splits stay separate per observation; MMMU-Pro and human baselines excluded. Submission scores do not imply independent measurement.',basis='self_reported')
put('rp-bench-community','analysis/community_arena_bayesian.json',{'kind':'json','row_path':'leaderboard','name_field':'model','value_field':'elo_mean'},'Bayesian community arena Elo mean, raw precision; not multi-turn arena, frequentist Elo or model-judge likelihood.')
put('scicode','scicode-bench.github.io/leaderboard/',table(0,0,1,3,['Models','Main Problem Resolve Rate']),'Official SciCode leaderboard Main Problem Resolve Rate; background setting is not stated on this table, so no cross-source equivalence or delta is asserted.')
put('swe-bench-pro-public','labs.scale.com/leaderboard/swe_bench_pro_public',{'kind':'scale_swepro','name_field':'model','value_field':'score','context_fields':['version','contaminationMessage']},'SWE-bench Pro Public; source model asterisks identify mini-swe-agent. Preserve source turn/cost annotations; private/held-out boards are excluded.',basis='self_reported')
put('slopbench','https://uncommon-sandpiper-321.convex.cloud/api/query',{'kind':'json','row_path':'value','name_field':'model','id_field':'_id','value_field':'pure_slop_rate','filter_field':'status','filter_value':'complete','context_fields':['run_date']},'53-prompt SlopBench complete runs; pure_slop_rate as displayed Slop Rate (not slop_score).')
# Source recipe includes specific raw source locators for the remaining private or derived boards.
for k in entries:
 if entries[k].get('source'):entries[k]['source_urls']=[entries[k]['source']['url']]
 else:
  entries[k]['source_urls']=[next(e['primary_url'] for e in reg['entries'] if e['id']==k)]
  entries[k]['recipe']['phase05_recipe']='docs/benchmark-ingestion.md#five-sources-requiring-a-collection-recipe'
  entries[k]['reason']={'helmet':'Suite uses heterogeneous task/context metrics; no universal headline is published.', 'hle':'README sample output is not attributable to a model and is not a current result.', 'ifbench':'Captured README specifies evaluation, not a named-model result.', 'otis-mock-aime':'Captured July-2025 result predates the registered exact-match grading protocol; withheld.', 'towards-ai-editorial-writing':'Private protocol and visually reported X values require xplainervideo capture and primary evidence review.'}[k.split('::')[0]]
  if k.startswith('otis-'):entries[k]['status']='contested'
Path('data/raw/benchmarks/collection-plan.json').write_text(json.dumps({'schema_version':1,'entries':list(entries.values())},indent=2,ensure_ascii=False)+'\n')
print('parsers',sum(e['parser'] is not None for e in entries.values()),'recipes',len(entries))
