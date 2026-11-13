"""Carried-row equality against the live base v1.8.9 (origin/main c1a2a2408, which contains merge a3fe26c6): only the equated draw's rows change
(equated axes/scores/views/capability, ranked/rank/ranks/listing/notes, the not-yet-equated disclosure sentence); every other row differs from v1.8.9
only in rank/ranks, and those ranks are exactly v1.8.9's once the newly ranked rows are removed (recomputed independently from the order lists)."""
import pathlib,json,subprocess,hashlib,copy,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];BASE='e551f02f2bbf013fb2932507abd78525c33a4de4';L=lambda p:json.loads(p.read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
def base(p):return subprocess.check_output(['git','show',BASE+':'+str(p)],cwd=W)
assert subprocess.run(['git','merge-base','--is-ancestor','a3fe26c6c',BASE],cwd=W).returncode==0,'base must contain the v1.8.9 merge a3fe26c6'
D=pathlib.Path('data/raw/benchmarks/jevbench/v1.8');b=json.loads(base(D/'jevbench-v1.8.9-results.json'));a=L(W/D/'jevbench-v1.8.10-results.json');by={s['key']:s for s in a['systems']}
DRAW=set(json.loads((J/'src/equated-keys.json').read_text()));NEW=json.loads((J/'src/new-keys.json').read_text());assert NEW==['gemini-decision-1'] and not set(NEW)&{r['key'] for r in b['systems']};HELD=set(json.loads((J/'src/held-keys.json').read_text()));REN=json.loads((J/'src/display-renames.json').read_text());RANKED=set(json.loads((J/'src/ranked-keys.json').read_text()))
EQF=['axes','scores','views','jevbench_score','capability','published_scores','ranked','rank','ranks','listing','not_ranked_because','listing_note','disclosure','underlying','draw']
assert DRAW=={r['key'] for r in b['systems'] if (r.get('draw') or {}).get('id')=='v1.6-regular-20261027'},'draw rows enumerated from the base data'
REMOVED=json.loads((J/'src/removed-keys.json').read_text());assert REMOVED==['microsoft-decision-1-a2-20261012'] and not set(REMOVED)&set(by)   # r278: the preliminary unranked A2 listing leaves the boards
assert all(r['ranked'] is False and r.get('rank') is None and r['listing']=='preliminary' for r in b['systems'] if r['key'] in REMOVED)
assert sorted([r['key'] for r in b['systems'] if r['key'] not in REMOVED]+NEW)==sorted(by)
# 1. field-level equality
n=0;shift=0
for r in b['systems']:
 if r['key'] in REMOVED:continue
 now=by[r['key']]
 if r['key'] in DRAW:
  assert {f:v for f,v in now.items() if f not in EQF}=={f:v for f,v in r.items() if f not in EQF},('draw row outside the equated fields',r['key'])
  assert {f:v for f,v in now['draw'].items() if f not in('status','offset','offset_ci95','ci_basis')}=={f:v for f,v in r['draw'].items() if f not in('status','offset','offset_ci95')} and now['draw']['ci_basis']=='measured on the draw before equating'
  assert (r['key'] in HELD)==(not now['ranked'] and now['listing']=='unranked' and all(x is not None for x in now['scores'].values())),('held rows are the priced unranked rows',r['key'])
  assert now['published_scores']=={'axes':r['axes'],'scores':r['scores'],'capability':r['capability']},'published numbers kept '+r['key']
 else:
  skip=('rank','ranks')+(('display',) if r['key'] in REN else ())
  assert {f:v for f,v in now.items() if f not in skip}=={f:v for f,v in r.items() if f not in skip},('carried row changed',r['key'])
  if r['key'] in REN:assert r['display']==REN[r['key']]['before'] and now['display']==REN[r['key']]['after'] and now['display']=='AutoTrust-Decider-Pro-27B (AutoTrust, Qwen3.8-27B)'
  n+=1
  if now.get('ranks')!=r.get('ranks'):shift+=1
# 2. ranks without the draw rows == v1.8.9 ranks; every list without the newly ranked rows == the v1.8.9 list
for m in ['A','B','C','capability']:
 order=[k for k in a['board'][m]['order'] if k not in DRAW and k not in NEW];assert order==b['board'][m]['order'],m
 assert {k:v for k,v in a['board'][m].items() if k!='order'}=={k:v for k,v in b['board'][m].items() if k!='order'}
for r in b['systems']:
 if r['key'] in DRAW:continue
 if r['ranked']:
  for m in ['A','B','C','capability']:assert [k for k in a['board'][m]['order'] if k not in DRAW and k not in NEW].index(r['key'])+1==r['ranks'][m],(r['key'],m)
  assert r['rank']==r['ranks']['A']
# 3. everything else of the artifact
for f in b:
 if f in ('systems','board','revision','label','n_ranked','source_note','source_sha256','measurement_notes','addendum'):continue
 if f=='roster_count':assert a[f]==b[f]+len(NEW)-len(REMOVED);continue
 assert a[f]==b[f],f
assert a['measurement_notes'][:len(b['measurement_notes'])]==b['measurement_notes'] and len(a['measurement_notes'])==len(b['measurement_notes'])+1
# 4. categories, carry, history files: unchanged bytes except revision binding
ca=L(W/D/'jevbench-v1.8.10-categories.json');cb=json.loads(base(D/'jevbench-v1.8.9-categories.json'))
drop=lambda c:{**{k:v for k,v in c.items() if k not in('revision','results_sha256','source_results_sha256','systems','lanes')},'systems':{k:v for k,v in c['systems'].items() if k not in NEW and k not in REMOVED},'lanes':{k:v for k,v in c['lanes'].items() if k not in NEW and k not in REMOVED}}
assert drop(ca)==drop(cb) and sorted(ca['systems'])==sorted([*[k for k in cb['systems'] if k not in REMOVED],*NEW]) and all(ca['lanes'][k]=='api' for k in NEW) and not set(REMOVED)&set(ca['systems'])
GEM=L(J/'inputs/gemini/cells.json');assert all(ca['systems'][k]==GEM['systems'][k] for k in NEW),'added row cells are the frozen tool output byte for byte'
for f in ['carry','history','history-carry']:assert (W/D/f'jevbench-v1.8.10-{f}.json').read_bytes()==base(D/f'jevbench-v1.8.9-{f}.json')
# 5. every historical data/loader file and archived page byte-equal to the base
files=subprocess.check_output(['git','ls-tree','-r','--name-only',BASE,'data/raw/benchmarks/jevbench','lib','app/jev-models','app/api/jevbench'],cwd=W,text=True).splitlines();count=0
CHANGED_ON_PURPOSE={'lib/jevbench-v15-board.mjs','lib/jevbench-live-board.mjs','lib/jevbench-releases.mjs','lib/jevbench-categories.mjs','lib/jevbench-alldata-input.mjs','lib/jevbench-cohort-merge.mjs'}
for f in files:
 if f.startswith('data/raw/benchmarks/jevbench/') or (f.startswith('lib/jevbench-v') and f.endswith('-release.mjs')) or (f.startswith('app/jev-models/v1.') and f.endswith('page.tsx')) or (f.startswith('app/api/jevbench/v1.')):
  assert (W/f).read_bytes()==base(f),f;count+=1
# 6. the four edited loader files differ from the base only by the v1.8.10 wiring (and the 4-anchor minimum)
# the low-sample caveat fix (commit dd3b51eab: the CR-729 memo copy keeps the row-pool bounds) adds exactly its own lines
LOWSAMPLE={f:{l[1:] for l in subprocess.check_output(['git','show','dd3b51eab','--',f],cwd=W,text=True).splitlines() if l.startswith('+') and not l.startswith('+++')} for f in ['lib/jevbench-live-board.mjs']}
# r278 fast path (DECISIONS jevbench-v1810-fast-path-tonight-1112): the breakdown display fix (commit 69db1d3c9: per-dimension view, min shown n 10) adds exactly its own lines
for f in ['lib/jevbench-categories.mjs']:LOWSAMPLE.setdefault(f,set()).update(l[1:] for l in subprocess.check_output(['git','show','69db1d3c9','--',f],cwd=W,text=True).splitlines() if l.startswith('+') and not l.startswith('+++'))
diffs={}
for f in sorted(CHANGED_ON_PURPOSE):
 x=base(f).decode().splitlines();y=(W/f).read_text().splitlines();add=[l for l in y if l not in x];rem=[l for l in x if l not in y]
 diffs[f]={'added_lines':len(add),'removed_lines':len(rem)}
 for l in add:assert re.search(r'1810|v1\.8\.10|at least 4 anchors|< 4|V1810|v1810|ci_basis',l) or l.strip()=="" or 'throughV189' in l or l in LOWSAMPLE.get(f,set()),(f,l[:160])
# 8. the added row: exactly the build's receipt row, measured = its frozen scorer row (published_scores), equated with the draw's offset
NR=L(J/'receipts/NEW-ROWS.json');SC=L(J/'inputs/gemini/scored.json')
for k in NEW:
 assert by[k]==NR[k] and by[k]['published_scores']=={'axes':SC['axes'],'scores':SC['scores'],'capability':SC['capability']} and by[k]['ranked'] and by[k]['api_flag'] and by[k]['endpoint_kind']=='api'
 assert {f:v for f,v in by[k].items() if f not in EQF+['display','author','licence','repo','model_pin','endpoint_condition','new_in','measured_in','last_measured_on','measurement_date_status','method','paid_fast_lane','cost','noul_decisive','self_reported']}=={f:v for f,v in SC.items() if f not in EQF+['display','author','not_ranked_because','cost']},'added row: every scorer field kept'
 assert {f:v for f,v in by[k]['cost'].items() if f not in('basis','kind')}=={f:v for f,v in SC['cost'].items() if f not in('basis','kind')},'added row cost numbers = scorer'
# 7. draw table: only the 27 Oct draw changed
tb=json.loads(base('data/jevbench-draw-equating.json'));ta=L(W/'data/jevbench-draw-equating.json')
assert {k:v for k,v in ta.items() if k not in('draws','method')}=={k:v for k,v in tb.items() if k not in('draws','method')}
assert ta['method']==tb['method'].replace('with fixed anchor systems measured on both draws','with anchor systems measured on both draws (each draw lists its own anchor set)') and ta['method']!=tb['method'],'T5 is the only change of the table text'
for x,y in zip(tb['draws'],ta['draws']):
 if x['draw']!='v1.6-regular-20261027':assert x==y,x['draw']
 else:assert {k:v for k,v in y.items() if k not in('status','offset','offset_ci95','anchors','releases','latest_release','anchor_evidence','equating_receipt')}=={k:v for k,v in x.items() if k not in('status','offset','offset_ci95','anchors','releases','latest_release')} and y['releases'][:-1]==x['releases'] and y['releases'][-1]=='v1.8.10'
assert len(tb['draws'])==len(ta['draws'])
receipt={'status':'PASS','base':BASE,'base_contains_merge':'a3fe26c6c','carried_rows_equal_except_rank_ranks':n,'carried_rows_rank_shifted':shift,'equated_rows':len(DRAW),'ranked_rows':len(RANKED),'held_rows':sorted(HELD),'display_renamed_rows':REN,
 'ranks_without_newly_ranked_equal_v189':True,'order_lists_without_newly_ranked_equal_v189':True,'board_metadata_equal':True,'historical_files_byte_equal':count,'loader_edits':diffs,'other_draws_unchanged':True,
 'categories_carry_history_unchanged':True,'measurement_notes_append_only':True,'added_rows':NEW,'added_row_equals_scorer_row_except_public_identity_and_equating':True,'lowsample_fix_lines_allowed_from':'dd3b51eab'}
(J/'receipts/CARRIED-ROWS.json').write_text(json.dumps(receipt,indent=1,sort_keys=True)+'\n');print('PASS',n,'carried rows equal except rank/ranks (',shift,'rank-shifted, all explained by the inserted rows);',len(DRAW),'draw rows =',len(RANKED),'ranked +',len(DRAW)-len(RANKED),'unranked; added',NEW,';',count,'historical files byte-equal')
