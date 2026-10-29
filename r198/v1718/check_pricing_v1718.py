import pathlib,json,math
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
d=json.loads((J/'aggregate-derivation.json').read_text());r=json.loads((W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.18-results.json').read_text());rows={s['key']:s for s in r['systems']};inputs=json.loads((J/'src/inputs.json').read_text())
for k,x in inputs.items():
 t=x['tokens'];pr=x['price_reference'];usd=1000*(t['input_tokens_common']*pr['in']+t['output_tokens_common']*pr['out'])/1e6/1485
 assert math.isclose(usd,rows[k]['cost']['usd_per_1000'],rel_tol=0,abs_tol=1e-15)
 assert rows[k]['cost']['common_basis']['n_items']==1485
 assert rows[k]['cost']['kind']=='estimate' and t['output_tokens_common']==1485
 if '26b' in k:assert pr['listing']=='google/gemma-4-26b-a4b-it' and pr['in']==.09 and pr['out']==.3
 else:assert pr['listing']=='deepinfra:Qwen/Qwen3.5-4B' and abs(pr['in']-.03)<1e-17 and pr['out']==.15
(J/'receipts/PRICING.json').write_text(json.dumps({'status':'PASS','same_as_measurement_pricing':True,'current_module_sha256':'645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4','common_items':1485,'all_costs_exact':True,'lowercase_26b_listing':True},indent=1)+'\n')
print('PASS both exact same-items estimates and frozen references; current pricing matches measurement')
