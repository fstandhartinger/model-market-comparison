import pathlib,json,re
from pricing_reference_v1721 import reference,PIN
from rows_v1721 import KEY
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(p.read_text());d=L(J/'src/inputs.json')[KEY];r=reference(KEY,d['registry']);p=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.21-proof.json')
assert r==p['new_rows'][KEY]['price_reference'] and r['in']==.42 and r['out']==3 and r['listing']=='qwen/qwen3.8-27b' and r['kind']=='estimate'
s=d['v17-share']['cost']['basis'];pat=r'Qwen/Qwen3\.8-27B at USD 0\.42/M input and 3\.00/M output';assert re.search(pat,s)
for a,b in [('0.42/M','0.43/M'),('3.00/M','3.01/M'),('Qwen3.8-27B','Qwen3.5-4B')]:assert not re.search(pat,s.replace(a,b))
(J/'receipts/PRICING-REFERENCES.json').write_text(json.dumps({'status':'PASS','reference':r,'pricing_module_sha256':PIN,'mismatch_negatives':3},indent=1)+'\n');print('PASS frozen reference Qwen3.8-27B 0.42/3.00 estimate, native output 0; 3 mismatch negatives rejected')
