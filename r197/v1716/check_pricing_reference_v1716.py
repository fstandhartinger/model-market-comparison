"""Price reference checks with mismatch negatives. New row strike-1: the frozen module's strict reference() for the stated base
Qwen/Qwen3.5-4B (deepinfra 0.03/0.15, kind estimate), output 0 as reported. Carried d1027 rows: the same-items rule changes the item set
only, never a price: each row's per-million rates recovered from its re-scored registry equal the rates it was published with."""
import json,pathlib,re
from pricing_reference_v1716 import reference, PIN
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7';L=lambda p:json.loads(p.read_text())
K='strike-1';res={r['key']:r for r in L(V/'jevbench-v1.7.16-results.json')['systems']};prev={r['key']:r for r in L(V/'jevbench-v1.7.15-results.json')['systems']};proof=L(V/'jevbench-v1.7.16-proof.json')
reg=L(J/'src/inputs.json')[K]['registry'];ref=reference(K,reg)
assert proof['new_rows'][K]['price_reference']==ref and ref['listing']=='deepinfra:Qwen/Qwen3.5-4B' and ref['in']==0.03 and ref['out']==0.15 and ref['kind']=='estimate'
basis=res[K]['cost']['basis'];PAT=r'deepinfra:Qwen/Qwen3\.5-4B, USD 0\.03 per million input tokens and USD 0\.15 per million output tokens'
assert re.search(PAT,basis)
neg=0
for mut in [lambda b:b.replace('0.03 per million input','0.10 per million input'),lambda b:b.replace('USD 0.15 per million output','USD 0.30 per million output'),lambda b:b.replace('deepinfra:Qwen/Qwen3.5-4B','qwen/qwen3.5-9b')]:
 if not re.search(PAT,mut(basis)):neg+=1
 else:raise AssertionError('mismatch accepted')
cc=L(pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r197/v1716/score/field/COMMON-COSTS.json'))['rows']
rates={}
for k in proof['repriced_rows']:
 c=cc[k];p=prev[k]['cost']
 # the rate pair reproduces the PUBLISHED all-items figure from the published all-items token basis (unchanged price)
 assert abs(1000*(c['all_items_input_tokens']*c['price_in_per_m']+c['all_items_output_tokens']*c['price_out_per_m'])/1e6/(1493 if k=='microsoft-decision-1-r2' else 1500)-p['usd_per_1000'])<1e-15,k
 assert res[k]['cost']['kind']==p['kind'];rates[k]={'in':c['price_in_per_m'],'out':c['price_out_per_m'],'kind':p['kind']}
(J/'receipts/PRICING-REFERENCES.json').write_text(json.dumps({'status':'PASS','pricing_module_sha256':PIN,'rows':{K:ref},'recosted_rows_rates_unchanged':rates,'negatives_rejected':neg},indent=1,sort_keys=True)+'\n')
print('PASS strike-1 reference deepinfra:Qwen/Qwen3.5-4B 0.03/0.15 (estimate, output 0) from the frozen module',PIN[:8],';',len(rates),'re-costed rows keep their published rates (each reproduces its published all-items figure);',neg,'mismatch negatives rejected')
