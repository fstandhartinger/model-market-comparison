import json,pathlib
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];a=json.loads((W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.9-results.json').read_text());s=next(s for s in a['systems'] if s['key']=='karpo_decision_31b')
assert s['model_pin']=='MachinePulseAI/karpo-decision-31B@221bf1a011093807e29b77859f09499c2c365e34'
assert s['repo']=='https://huggingface.co/MachinePulseAI/karpo-decision-31B'
assert '25c38826' in s['endpoint_condition']
(J/'receipts/REF-PIN.json').write_text(json.dumps({'status':'PASS','model_pin':s['model_pin'],'code_commit':'25c38826'})+'\n')
print('PASS pinned model and code')
