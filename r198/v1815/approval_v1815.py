"""Row-only approval shared by release-owner helpers; no fairness waiver for ranked changes."""
import json,copy,hashlib

def check_approval(W,proof):
 a=json.loads((W/'r198/v1815/inputs/APPROVAL.json').read_text())
 assert proof['publication_approval']==a and a['scope'].split(':')[0]=='row-only' and a['fairness_review_required'] is False
 D=W/'data/raw/benchmarks/jevbench/v1.8'
 old=json.loads((D/'jevbench-v1.8.14-results.json').read_text());new=json.loads((D/'jevbench-v1.8.15-results.json').read_text())
 keys=set(proof['new_rows']);assert keys=={'starlord-4b-preview'}=={*json.loads((W/'r198/v1815/src/new-keys.json').read_text())}
 assert new['board']==old['board'] and new['n_ranked']==old['n_ranked']
 carried=copy.deepcopy([s for s in new['systems'] if s['key'] not in keys]);by={s['key']:s for s in carried}
 ex=json.loads((W/'r198/v1815/inputs/TEXT-EXCEPTIONS.json').read_text())
 assert ex==[], 'v1.8.15 permits no carried-row exceptions'
 for e in ex:
  assert by[e['key']][e['path']]==e['after']
  for f in ['before','after']:assert hashlib.sha256(e[f].encode()).hexdigest()==e[f+'_sha256']
  by[e['key']][e['path']]=e['before']
 assert carried==old['systems']
 for s in new['systems']:
  if s['key'] in keys:assert s['ranked'] is False and s['rank'] is None
 return True
