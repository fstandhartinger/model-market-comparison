"""Row-only approval shared by release-owner helpers; no fairness waiver for ranked changes."""
import json,copy,hashlib

def check_approval(W,proof):
 a=json.loads((W/'r198/v1821/inputs/APPROVAL.json').read_text())
 assert a['status'].startswith('GO ('), 'the release owner binds the GO text in inputs/APPROVAL.json and rebuilds before any flip'
 assert proof['publication_approval']==a and a['scope'].split(':')[0]=='row-only' and a['fairness_review_required'] is False
 D=W/'data/raw/benchmarks/jevbench/v1.8'
 old=json.loads((D/'jevbench-v1.8.20-results.json').read_text());new=json.loads((D/'jevbench-v1.8.21-results.json').read_text())
 keys=set(proof['new_rows']);assert keys=={'basal-omni-2.0-mini-preview','strands-decider-12b-gemma4-v2-2611','strands-decider-26b-a4b-gemma4-v2-2611','strands-decider-31b-gemma4-v2-2611','strands-decider-e2b-gemma4-v2-2611','strands-decider-e4b-gemma4-v2-2611'}=={*json.loads((W/'r198/v1821/src/new-keys.json').read_text())}
 assert new['board']==old['board'] and new['n_ranked']==old['n_ranked']
 carried=copy.deepcopy([s for s in new['systems'] if s['key'] not in keys]);by={s['key']:s for s in carried}
 ex=json.loads((W/'r198/v1821/inputs/TEXT-EXCEPTIONS.json').read_text())
 assert all(e['key']=='gemini-decision-1' and e['path'] in ('disclosure','underlying') for e in ex), 'v1.8.21 permits only the ImageJevBench disclosure text fix on gemini-decision-1'
 for e in ex:
  assert by[e['key']][e['path']]==e['after']
  for f in ['before','after']:assert hashlib.sha256(e[f].encode()).hexdigest()==e[f+'_sha256']
  by[e['key']][e['path']]=e['before']
 assert carried==old['systems']
 for s in new['systems']:
  if s['key'] in keys:assert s['ranked'] is False and s['rank'] is None
 return True
