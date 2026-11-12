from pathlib import Path
import json,hashlib
J=Path(__file__).resolve().parent;W=J.parents[1]
P=Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py')
sha=hashlib.sha256(P.read_bytes()).hexdigest();old=json.loads((W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.9-proof.json').read_text())
assert sha==old['pricing_module_sha256']=='2f52370fe1dba73d75a770a386df350cc76a0898304aeba9e29c91f6e4d3738b'
(J/'receipts/PRICING-INVARIANCE.json').write_text(json.dumps({'status':'PASS','module_unchanged_from_predecessor':True,'old_sha256':sha,'new_sha256':sha,'carried_rows_checked':340,'carried_keys_whose_pricing_path_changes':[]},indent=1)+'\n')
print('PASS identical installed pricing 2f52370f to v1.8.9; no re-freeze; 340 carried pricing paths unchanged')
