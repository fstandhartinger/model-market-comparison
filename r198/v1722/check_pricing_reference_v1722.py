import pathlib,json,re
from pricing_reference_v1722 import reference,PIN
from rows_v1722 import KEY
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(p.read_text());d=L(J/'src/inputs.json')[KEY];r=reference(KEY,d['registry']);p=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.22-proof.json')
assert r==p['new_rows'][KEY]['price_reference'] and r['in']==.3125 and r['out']==1.25 and r['listing']=='qwen/qwen3.5-35b-a3b' and r['kind']=='estimate'
s=d['v17-share']['cost']['basis'];pat=r'Qwen/Qwen3\.5-35B-A3B at USD 0\.3125/M input and 1\.25/M output';assert re.search(pat,s)
for a,b in [('0.3125/M','0.3126/M'),('1.25/M','1.26/M'),('Qwen3.5-35B-A3B','Qwen3.5-4B')]:assert not re.search(pat,s.replace(a,b))
(J/'receipts/PRICING-REFERENCES.json').write_text(json.dumps({'status':'PASS','reference':r,'pricing_module_sha256':PIN,'mismatch_negatives':3},indent=1)+'\n');print('PASS explicit class reference Qwen3.5-35B-A3B 0.3125/1.25 estimate, native output 0; 3 mismatch negatives rejected')
