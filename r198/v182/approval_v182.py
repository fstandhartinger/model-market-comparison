"""Standing GO is valid only with a bound no-change comparison and no carried-row change."""
import pathlib,json,hashlib
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def check_approval(W,proof):
 a=proof['publication_approval'];assert a['status']=='GO (standing; no top-five change)' and a['fresh_baseline']=='v1.8.1' and a['top_five_effect']=='unchanged'
 p=W/'r198/v182/receipts/topfive-diff.json';d=json.loads(p.read_text());assert sha(p)==proof['topfive_diff_sha256']
 assert d['lists']==580 and d['changed_lists']==0 and not d['changed'] and d['slider_changed_states']==0 and d['explicit_slider_grid_changed']==0 and not d['custom_changed_labels'],'REFUSED: top-five change outside standing approval'
 assert d['candidate_results_sha256']==sha(W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.2-results.json')
 assert proof['exceptions']=={'text_only_sha256':sha(W/'r198/v182/inputs/TEXT-EXCEPTIONS.json')} and proof['carried_rows_equal_except']==json.loads((W/'r198/v182/inputs/TEXT-EXCEPTIONS.json').read_text()) and proof['repriced_rows']=={}
 assert all(r['treatment']=='unranked' for r in proof['new_rows'].values())
 return a
