"""Verify source hashes and aggregate runtime claims; never emit item content."""
import json,pathlib,hashlib,re
J=pathlib.Path(__file__).resolve().parent;M=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r45-jeff11/attempt5-medium-measured/out')
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
meta=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r24-score/field-r16a/BUILD-META.json');predecessor=J.parents[1]/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.7-proof.json'
assert L(meta)['pricing_v15_sha256']==L(predecessor)['pricing_module_sha256']
source=L(J/'receipts/INPUTS.json')['jeff_1_1_medium'];runtime=L(M/'runtime-summary-final.json')
assert runtime['items']==1500 and runtime['latency_ge_10s']==0 and runtime['input_tokens']==910751 and runtime['output_tokens']==72216
assert runtime['reasoned']==324 and runtime['reasoning_dropped']==3
assert L(M/'node-model-verify.json')['verified']
# Streaming raw verification in place: no item-level data are copied or printed.
raw=pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012/runs-auto-intake/jeff-1-1-medium.raw.jsonl')
n=over=it=ot=0
for line in raw.open():
 r=json.loads(line);assert r['ok'] and r['status_code']==200 and not r['error'];n+=1;over+=r['latency_s']>10;it+=r['usage']['input_tokens'];ot+=r['usage']['output_tokens']
assert (n,over,it,ot)==(1500,0,910751,72216) and sha(raw)==source['raw_sha256']
files=['runtime-summary-final.json','node-model-verify.json','usage-count-summary-final.json','scored-process.json','offline-proof.json']
(J/'receipts/SOURCE.json').write_text(json.dumps({'build_meta_sha256':sha(meta),'pricing_pin_equal_predecessor':True,'rows':n,'over_10s':over,'input_tokens':it,'output_tokens':ot,'raw_sha256':sha(raw),'runtime_receipts_sha256':{f:sha(M/f) for f in files}},indent=1,sort_keys=True)+'\n')
print('PASS source raw SHA, 1500 HTTP 200 answers, zero timeouts, native usage, reasoning counts and weight verification')
