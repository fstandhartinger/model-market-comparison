"""Verify aggregate source and pricing pins without emitting item data."""
import pathlib,json,hashlib
J=pathlib.Path(__file__).resolve().parent;L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
mod=pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py');assert sha(mod)=='645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4'
source=L(J/'receipts/INPUTS.json')['knowledgator_gliclass_v4_9b'];p=pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012/runs-auto-intake/knowledgator-gliclass-v4-9b.raw.jsonl');assert sha(p)==source['raw_sha256']
n=ok=over=it=ot=0;status={}
for line in p.open():
 r=json.loads(line);n+=1;ok+=bool(r['ok']);over+=r['latency_s']>10;u=r.get('usage') or {};it+=(u.get('input_tokens') or 0);ot+=(u.get('output_tokens') or 0);code=str(r['status_code']);status[code]=status.get(code,0)+1
assert (n,ok,over,it,ot)==(1500,1485,0,626409,0) and status=={'200':1485,'422':15}
assert L(J/'receipts/GLICLASS-PRICING-EQUIV.json')['equal']
(J/'receipts/SOURCE.json').write_text(json.dumps({'rows':n,'answered':ok,'over_10s':over,'input_tokens':it,'output_tokens':ot,'status_counts':status,'raw_sha256':sha(p),'pricing_module_sha256':sha(mod),'pricing_equivalence':True},indent=1,sort_keys=True)+'\n');print('PASS source/raw and pricing pins; aggregate coverage, native usage and pricing equivalence')
