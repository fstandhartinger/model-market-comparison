import pathlib,json,re
from pricing_reference_v1717 import reference,PIN
from rows_v1717 import KEY
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(p.read_text());d=L(J/'src/inputs.json')[KEY];r=reference(KEY,d['registry']);p=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.17-proof.json')
assert r==p['new_rows'][KEY]['price_reference'] and r['in']==.02 and r['out']==.1 and r['listing']=='deepinfra:Qwen/Qwen3.5-2B' and r['kind']=='estimate'
s=d['v17-share']['cost']['basis'];pat=r'deepinfra:Qwen/Qwen3\.5-2B, USD 0\.02 per million input tokens and USD 0\.10 per million output tokens';assert re.search(pat,s)
for a,b in [('0.02 per million','0.03 per million'),('0.10 per million','0.15 per million'),('Qwen3.5-2B','Qwen3.5-4B')]:assert not re.search(pat,s.replace(a,b))
(J/'receipts/PRICING-REFERENCES.json').write_text(json.dumps({'status':'PASS','reference':r,'pricing_module_sha256':PIN,'mismatch_negatives':3},indent=1)+'\n');print('PASS frozen reference Qwen3.5-2B 0.02/0.10 estimate, native output 0; 3 mismatch negatives rejected')
