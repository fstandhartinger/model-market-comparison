import pathlib,json,hashlib,os,importlib.util
J=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r198/v1719/score');D=pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027');W=pathlib.Path('/home/flori/wt/jevbench-v1719-20261028')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
keys=['decisionnode-flash-0.9.1-rc1','decisionnode-main-0.9.1-rc1'];shas=['6dfe974f9f90568b8f60a1c0edc096066b5608d975c2d891de5874f9cd1ec5e6','9e2b8c464130e86d61af0b17e38531103a1f960c073b95ea9b3f23f31fe6bac2']
F=J/'field';F.mkdir(exist_ok=True);(F/'runs').mkdir(exist_ok=True)
P=pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py');assert sha(P)=='645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4'
spec=importlib.util.spec_from_file_location('pricing',P);pr=importlib.util.module_from_spec(spec);spec.loader.exec_module(pr)
reg={};receipts={}
for k,h in zip(keys,shas):
 p=D/'runs-auto-intake'/k/('attempt2/decisionnode.raw.jsonl' if 'main' in k else 'decisionnode.raw.jsonl');assert sha(p)==h
 en=dict(display='DecisionNode' if 'main' in k else 'DecisionNode Flash',author='Bynn',source='api',lane='api',api_subset='S',endpoint_kind='api',provider='bynn',ranked=False,cost_kind='unpriced',cost_basis='NOT PRICED',measured_on='2026-10-28',support={t:'native' for t in ['choice','noul','score']})
 rows=[json.loads(l) for l in p.read_text().splitlines()];assert len(rows)==1500
 assert k not in pr.LAUNCH_LIST_PRICE_API|pr.AGE_QUALIFIED_API and pr.reference(k,en,pr.catalog_rates()) is None
 res=pr.resolve(k,en,rows,pr.catalog_rates());assert res['rankable'] is False and res['usd_per_1000'] is None and res['market_reference'] is None and res['counting_list_price'] is False
 receipts[k]=res;reg[k]=en
 q=F/'runs'/f'{k}.jsonl'
 if not q.exists():q.symlink_to(p)
(F/'REGISTRY.json').write_text(json.dumps(reg,indent=1,sort_keys=True)+'\n');(J/'PRICING.json').write_text(json.dumps(receipts,indent=1,sort_keys=True)+'\n')
print('PASS frozen resolve(): both unpriced, no reference; complete raw hashes verified')
