"""Tariff reference check for the new row with mismatch negatives: the advertised Azure Foundry tariff (0.042/0) of the live
microsoft-decision-1 row is the basis (decision msft-r2-cost-basis-tariff); the frozen module's strict estimate is recorded, not used."""
import copy,json,pathlib,re
from pricing_reference_v1715 import reference, PIN
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7';L=lambda p:json.loads(p.read_text())
K='microsoft-decision-1-r2';res={r['key']:r for r in L(V/'jevbench-v1.7.15-results.json')['systems']};proof=L(V/'jevbench-v1.7.15-proof.json')
reg=L(J/'src/inputs.json')[K]['registry'];ref=reference(K,reg)
assert proof['new_rows'][K]['price_reference']==ref and ref['in']==0.042 and ref['out']==0.0 and ref['kind']=='tariff'
live=res['microsoft-decision-1'];assert live['cost']['kind']=='tariff' and '.042/M input, output free' in live['cost']['basis'],'the live row uses the same tariff'
assert ref['frozen_module_not_used']=={'listing':'qwen/qwen3.5-9b','in':0.1,'out':0.15},'frozen module result recorded as information'
dec=pathlib.Path('/home/flori/DECISIONS.md').read_text();assert 'resolved-keys: msft-r2-cost-basis-tariff' in dec
basis=res[K]['cost']['basis'];assert re.search(r'Advertised Azure Foundry tariff USD 0\.042 per million input tokens, output free',basis)
neg=0
for mut in [lambda b:b.replace('0.042','0.10'),lambda b:b.replace('output free','output USD 0.15'),lambda b:b.replace('Advertised Azure Foundry tariff','ESTIMATE')]:
 bad=mut(basis)
 if not re.search(r'Advertised Azure Foundry tariff USD 0\.042 per million input tokens, output free',bad):neg+=1
 else:raise AssertionError('mismatch accepted')
(J/'receipts/PRICING-REFERENCES.json').write_text(json.dumps({'status':'PASS','pricing_module_sha256':PIN,'rows':{K:ref},'negatives_rejected':neg},indent=1,sort_keys=True)+'\n')
print('PASS tariff reference 0.042/0 (kind tariff) for',K,'= live row basis; decision msft-r2-cost-basis-tariff present; frozen estimate recorded, not used;',neg,'mismatch negatives rejected')
