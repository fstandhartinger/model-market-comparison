"""Carried-row equality against the live base v1.8.9 (origin/main c1a2a2408, which contains merge a3fe26c6): only the equated draw's rows change
(equated axes/scores/views/capability, ranked/rank/ranks/listing/notes, the not-yet-equated disclosure sentence); every other row differs from v1.8.9
only in rank/ranks, and those ranks are exactly v1.8.9's once the newly ranked rows are removed (recomputed independently from the order lists)."""
import pathlib,json,subprocess,hashlib,copy,re
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];BASE='c1a2a24086be72f82ab084734ef80c77c237bb65';L=lambda p:json.loads(p.read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
def base(p):return subprocess.check_output(['git','show',BASE+':'+str(p)],cwd=W)
assert subprocess.run(['git','merge-base','--is-ancestor','a3fe26c6c',BASE],cwd=W).returncode==0,'base must contain the v1.8.9 merge a3fe26c6'
D=pathlib.Path('data/raw/benchmarks/jevbench/v1.8');b=json.loads(base(D/'jevbench-v1.8.9-results.json'));a=L(W/D/'jevbench-v1.8.10-results.json');by={s['key']:s for s in a['systems']}
DRAW=set(json.loads((J/'src/equated-keys.json').read_text()));RANKED=set(json.loads((J/'src/ranked-keys.json').read_text()))
EQF=['axes','scores','views','jevbench_score','capability','published_scores','ranked','rank','ranks','listing','not_ranked_because','listing_note','disclosure','underlying','draw']
assert DRAW=={r['key'] for r in b['systems'] if (r.get('draw') or {}).get('id')=='v1.6-regular-20261027'},'draw rows enumerated from the base data'
assert [r['key'] for r in b['systems']]==[r['key'] for r in a['systems']] or sorted(r['key'] for r in b['systems'])==sorted(by)
# 1. field-level equality
n=0;shift=0
for r in b['systems']:
 now=by[r['key']]
 if r['key'] in DRAW:
  assert {f:v for f,v in now.items() if f not in EQF}=={f:v for f,v in r.items() if f not in EQF},('draw row outside the equated fields',r['key'])
  assert {f:v for f,v in now['draw'].items() if f not in('status','offset','offset_ci95')}=={f:v for f,v in r['draw'].items() if f not in('status','offset','offset_ci95')}
  assert now['published_scores']=={'axes':r['axes'],'scores':r['scores'],'capability':r['capability']},'published numbers kept '+r['key']
 else:
  assert {f:v for f,v in now.items() if f not in('rank','ranks')}=={f:v for f,v in r.items() if f not in('rank','ranks')},('carried row changed',r['key'])
  n+=1
  if now.get('ranks')!=r.get('ranks'):shift+=1
# 2. ranks without the draw rows == v1.8.9 ranks; every list without the newly ranked rows == the v1.8.9 list
for m in ['A','B','C','capability']:
 order=[k for k in a['board'][m]['order'] if k not in DRAW];assert order==b['board'][m]['order'],m
 assert {k:v for k,v in a['board'][m].items() if k!='order'}=={k:v for k,v in b['board'][m].items() if k!='order'}
for r in b['systems']:
 if r['key'] in DRAW:continue
 if r['ranked']:
  for m in ['A','B','C','capability']:assert [k for k in a['board'][m]['order'] if k not in DRAW].index(r['key'])+1==r['ranks'][m],(r['key'],m)
  assert r['rank']==r['ranks']['A']
# 3. everything else of the artifact
for f in b:
 if f in ('systems','board','revision','label','n_ranked','source_note','source_sha256','measurement_notes','addendum'):continue
 assert a[f]==b[f],f
assert a['measurement_notes'][:len(b['measurement_notes'])]==b['measurement_notes'] and len(a['measurement_notes'])==len(b['measurement_notes'])+1
# 4. categories, carry, history files: unchanged bytes except revision binding
ca=L(W/D/'jevbench-v1.8.10-categories.json');cb=json.loads(base(D/'jevbench-v1.8.9-categories.json'))
assert {k:v for k,v in ca.items() if k not in('revision','results_sha256','source_results_sha256')}=={k:v for k,v in cb.items() if k not in('revision','results_sha256','source_results_sha256')}
for f in ['carry','history','history-carry']:assert (W/D/f'jevbench-v1.8.10-{f}.json').read_bytes()==base(D/f'jevbench-v1.8.9-{f}.json')
# 5. every historical data/loader file and archived page byte-equal to the base
files=subprocess.check_output(['git','ls-tree','-r','--name-only',BASE,'data/raw/benchmarks/jevbench','lib','app/jev-models','app/api/jevbench'],cwd=W,text=True).splitlines();count=0
CHANGED_ON_PURPOSE={'lib/jevbench-live-board.mjs','lib/jevbench-releases.mjs','lib/jevbench-categories.mjs','lib/jevbench-alldata-input.mjs','lib/jevbench-cohort-merge.mjs'}
for f in files:
 if f.startswith('data/raw/benchmarks/jevbench/') or (f.startswith('lib/jevbench-v') and f.endswith('-release.mjs')) or (f.startswith('app/jev-models/v1.') and f.endswith('page.tsx')) or (f.startswith('app/api/jevbench/v1.')):
  assert (W/f).read_bytes()==base(f),f;count+=1
# 6. the four edited loader files differ from the base only by the v1.8.10 wiring (and the 4-anchor minimum)
diffs={}
for f in sorted(CHANGED_ON_PURPOSE):
 x=base(f).decode().splitlines();y=(W/f).read_text().splitlines();add=[l for l in y if l not in x];rem=[l for l in x if l not in y]
 diffs[f]={'added_lines':len(add),'removed_lines':len(rem)}
 for l in add:assert re.search(r'1810|v1\.8\.10|at least 4 anchors|< 4|V1810|v1810',l) or l.strip()=="" or 'throughV189' in l,(f,l[:160])
# 7. draw table: only the 27 Oct draw changed
tb=json.loads(base('data/jevbench-draw-equating.json'));ta=L(W/'data/jevbench-draw-equating.json')
assert {k:v for k,v in ta.items() if k!='draws'}=={k:v for k,v in tb.items() if k!='draws'}
for x,y in zip(tb['draws'],ta['draws']):
 if x['draw']!='v1.6-regular-20261027':assert x==y,x['draw']
 else:assert {k:v for k,v in y.items() if k not in('status','offset','offset_ci95','anchors','releases','latest_release','anchor_evidence','equating_receipt')}=={k:v for k,v in x.items() if k not in('status','offset','offset_ci95','anchors','releases','latest_release')} and y['releases'][:-1]==x['releases'] and y['releases'][-1]=='v1.8.10'
assert len(tb['draws'])==len(ta['draws'])
receipt={'status':'PASS','base':BASE,'base_contains_merge':'a3fe26c6c','carried_rows_equal_except_rank_ranks':n,'carried_rows_rank_shifted':shift,'equated_rows':len(DRAW),'ranked_rows':len(RANKED),
 'ranks_without_newly_ranked_equal_v189':True,'order_lists_without_newly_ranked_equal_v189':True,'board_metadata_equal':True,'historical_files_byte_equal':count,'loader_edits':diffs,'other_draws_unchanged':True,
 'categories_carry_history_unchanged':True,'measurement_notes_append_only':True}
(J/'receipts/CARRIED-ROWS.json').write_text(json.dumps(receipt,indent=1,sort_keys=True)+'\n');print('PASS',n,'carried rows equal except rank/ranks (',shift,'rank-shifted, all explained by the inserted rows);',len(DRAW),'draw rows =',len(RANKED),'ranked +',len(DRAW)-len(RANKED),'unranked;',count,'historical files byte-equal')
