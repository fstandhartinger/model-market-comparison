"""Resolve only the NEW API entry under the installed module (review condition C3)."""
import json,pathlib,hashlib,importlib.util,sys
sys.dont_write_bytecode=True
J=pathlib.Path(__file__).resolve().parent;M=pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();assert sha(M)=='645fd82eac728d597048bec0995ecd3ac896566e269fb6c9a1fdb84c171a9ac4'
spec=importlib.util.spec_from_file_location('price179',M);P=importlib.util.module_from_spec(spec);spec.loader.exec_module(P);k='launchables-myles-g-12b';e=json.loads((J/'inputs/MYLESG12-REGISTRY.json').read_text())[k];assert e['source']=='api' and (e['price_in_per_m'],e['price_out_per_m'])==(0.0020020,0.0)
out={}
for label,n,it,ot,expected in [('common',1485,779294,1485,0.00105060),('all',1500,989607,1500,0.00132080)]:
 rows=[{'ok':True,'usage':{'input_tokens':it if i==0 else 0,'output_tokens':ot if i==0 else 0}} for i in range(n)]
 r=P.resolve(k,e,rows,P.catalog_rates());assert r['counting_list_price'] is True and r['rankable'] and round(r['usd_per_1000'],8)==expected;out[label]=r
(J/'receipts/MYLESG12-PRICE.json').write_text(json.dumps({'module_sha256':sha(M),'registry_sha256':sha(J/'inputs/MYLESG12-REGISTRY.json'),'old_source_pod_never_resolved':True,'results':out},indent=1,sort_keys=True)+'\n');print('PASS installed list-price resolution, counting_list_price=true, exact aggregate costs; old pod entry not resolved')
