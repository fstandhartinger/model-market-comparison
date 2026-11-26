"""Row-only approval shared by release-owner helpers; no fairness waiver for ranked changes."""
import json,copy,hashlib

def check_approval(W,proof):
 a=json.loads((W/'r198/v1822/inputs/APPROVAL.json').read_text())
 assert a['status'].startswith('GO ('), 'the release owner binds the GO text in inputs/APPROVAL.json and rebuilds before any flip'
 assert proof['publication_approval']==a and a['scope'].split(':')[0]=='row-only' and a['fairness_review_required'] is False
 D=W/'data/raw/benchmarks/jevbench/v1.8'
 old=json.loads((D/'jevbench-v1.8.21-results.json').read_text());new=json.loads((D/'jevbench-v1.8.22-results.json').read_text())
 keys=set(proof['new_rows']);assert len(keys)==8 and keys=={*json.loads((W/'r198/v1822/src/new-keys.json').read_text())}
 assert new['board']==old['board'] and new['n_ranked']==old['n_ranked']
 carried=copy.deepcopy([s for s in new['systems'] if s['key'] not in keys]);by={s['key']:s for s in carried}
 ex=json.loads((W/'r198/v1822/inputs/TEXT-EXCEPTIONS.json').read_text())
 assert ex==[], 'v1.8.22 permits no carried-system changes'
 assert new['not_measured']==[r for r in old['not_measured'] if r['key']!='mica-v01-4b']
 for e in ex), 'v1.8.22 permits only the ImageJevBench disclosure text fix on gemini-decision-1'
 for e in ex:
  assert by[e['key']][e['path']]==e['after']
  for f in ['before','after']:assert hashlib.sha256(e[f].encode()).hexdigest()==e[f+'_sha256']
  by[e['key']][e['path']]=e['before']
 assert carried==old['systems']
 for s in new['systems']:
  if s['key'] in keys:assert s['ranked'] is False and s['rank'] is None
 return True
