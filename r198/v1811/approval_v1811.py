"""Row-only approval shared by release-owner helpers; no fairness waiver for ranked changes."""
import json

def check_approval(W,proof):
 a=json.loads((W/'r198/v1811/inputs/APPROVAL.json').read_text())
 assert proof['publication_approval']==a and a['scope']=='row-only' and a['fairness_review_required'] is False
 D=W/'data/raw/benchmarks/jevbench/v1.8'
 old=json.loads((D/'jevbench-v1.8.10-results.json').read_text());new=json.loads((D/'jevbench-v1.8.11-results.json').read_text())
 keys=set(proof['new_rows']);assert keys=={'minimodels-decision-1.0-candy-cane'}
 assert new['board']==old['board'] and new['n_ranked']==old['n_ranked']
 assert [s for s in new['systems'] if s['key'] not in keys]==old['systems']
 for s in new['systems']:
  if s['key'] in keys:assert s['ranked'] is False and s['rank'] is None
 return True
