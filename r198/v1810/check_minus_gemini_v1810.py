"""Combined-candidate gate: the v1.8.10 candidate minus the added row (gemini-decision-1) equals the reviewed candidate 87b6ffa4f (31 ranked, 4 held)
for every other row: same fields except rank/ranks, same ranks once the added row is taken out of the order lists, same order lists, same category
cells and lanes, and the same site-assembly rankings (receipts/topfive-after.json full rankings and release lists, minus the added row). The
low-sample caveat fix (dd3b51eab) changes no score or rank. Expected differences outside the rows are listed, not hidden."""
import json,pathlib,subprocess,hashlib
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];REF='87b6ffa4f';D='data/raw/benchmarks/jevbench/v1.8/'
L=lambda p:json.loads(pathlib.Path(p).read_text());ref=lambda p:json.loads(subprocess.check_output(['git','show',f'{REF}:{p}'],cwd=W))
NEW=L(J/'src/new-keys.json');assert NEW==['gemini-decision-1']
a=L(W/D/'jevbench-v1.8.10-results.json');r=ref(D+'jevbench-v1.8.10-results.json');by={s['key']:s for s in a['systems']};rb={s['key']:s for s in r['systems']}
assert sorted(by)==sorted([*rb,*NEW])
n=0;shift=0
for k,s in rb.items():
 now=by[k];assert {f:v for f,v in now.items() if f not in('rank','ranks')}=={f:v for f,v in s.items() if f not in('rank','ranks')},('row differs beyond rank/ranks',k)
 if s['ranked']:
  back={m:[x for x in a['board'][m]['order'] if x not in NEW].index(k)+1 for m in ['A','B','C','capability']};assert back==s['ranks'] and back['A']==s['rank'],k
  shift+=now['ranks']!=s['ranks']
 else:assert now.get('ranks')==s.get('ranks') and now.get('rank')==s.get('rank'),k
 n+=1
for m in ['A','B','C','capability']:
 assert [x for x in a['board'][m]['order'] if x not in NEW]==r['board'][m]['order'],m
 assert {f:v for f,v in a['board'][m].items() if f!='order'}=={f:v for f,v in r['board'][m].items() if f!='order'},m
expected_top={'systems','board','n_ranked','roster_count','label','source_note','measurement_notes','addendum'}
diff_top=sorted(f for f in set(a)|set(r) if a.get(f)!=r.get(f));assert set(diff_top)<=expected_top,diff_top
assert a['n_ranked']==r['n_ranked']+1 and a['roster_count']==r['roster_count']+1
assert {f:v for f,v in a['addendum'].items() if f!='new_keys'}=={f:v for f,v in r['addendum'].items() if f!='new_keys'} and a['addendum']['new_keys']==NEW and r['addendum']['new_keys']==[]
assert a['measurement_notes'][:-1]==r['measurement_notes'][:-1] and a['measurement_notes'][-1].startswith(r['measurement_notes'][-1].split(' Four strong anchor')[0].rstrip('.'))
ca=L(W/D/'jevbench-v1.8.10-categories.json');cr=ref(D+'jevbench-v1.8.10-categories.json')
drop=lambda c:{**{f:v for f,v in c.items() if f not in('systems','lanes','results_sha256')},'systems':{k:v for k,v in c['systems'].items() if k not in NEW},'lanes':{k:v for k,v in c['lanes'].items() if k not in NEW}}
assert drop(ca)==drop(cr)
for f in ['carry','history','history-carry']:assert (W/D/f'jevbench-v1.8.10-{f}.json').read_bytes()==subprocess.check_output(['git','show',f'{REF}:{D}jevbench-v1.8.10-{f}.json'],cwd=W)
# site assembly: every full ranking and release list minus the added row equals the reviewed candidate's
ta=L(J/'receipts/topfive-after.json');tr=ref('r198/v1810/receipts/topfive-after.json');lists=0;top_equal=0
for v,groups in tr['full_rankings'].items():
 for g,metrics in groups.items():
  for m,arr in metrics.items():
   x=[q['key'] for q in ta['full_rankings'][v][g][m] if q['key'] not in NEW];y=[q['key'] for q in arr];assert x==y,(v,g,m);lists+=1
   top_equal+=[q['key'] for q in ta['full_rankings'][v][g][m][:5]]==y[:5]
for m,o in tr['release_lists'].items():assert [k for k in ta['release_lists'][m] if k not in NEW]==o,m;lists+=1
gem_top=[(v,g,m,[q['key'] for q in ta['full_rankings'][v][g][m]].index(NEW[0])+1) for v,groups in ta['full_rankings'].items() for g,metrics in groups.items() for m,arr in metrics.items() if NEW[0] in [q['key'] for q in arr[:5]]]
assert not gem_top,gem_top
rec={'status':'PASS','reference_commit':REF,'rows_equal_except_rank':n,'rows_rank_shifted_by_added_row':shift,'order_lists_minus_added_equal':True,'categories_minus_added_equal':True,
 'carry_history_byte_equal':True,'site_assembly_lists_minus_added_equal':lists,'primary_full_rankings_with_unchanged_top_five':top_equal,'added_row_in_any_site_top_five':False,
 'expected_artifact_differences':diff_top,'lowsample_fix_changes_scores_or_ranks':False}
(J/'receipts/MINUS-GEMINI.json').write_text(json.dumps(rec,indent=1,sort_keys=True)+'\n')
print('PASS minus-gemini == 87b6ffa4f:',n,'rows equal except rank (',shift,'shifted by the added row); order lists, cells, carry/history and',lists,'site lists minus the added row equal; added row in no site top five')
