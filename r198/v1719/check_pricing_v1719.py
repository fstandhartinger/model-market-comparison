"""Re-run the frozen resolver on numeric aggregate usage only. No tariff is supplied or computed."""
import pathlib,json,hashlib,importlib.util
from rows_v1719 import KEYS,PIN
J=pathlib.Path(__file__).resolve().parent;P=pathlib.Path('/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py');assert hashlib.sha256(P.read_bytes()).hexdigest()==PIN
s=importlib.util.spec_from_file_location('frozen_pricing',P);pr=importlib.util.module_from_spec(s);s.loader.exec_module(pr)
inputs=json.loads((J/'src/inputs.json').read_text());receipts={}
for k in KEYS:
 d=inputs[k];en=d['registry'];assert en['source']=='api' and not en.get('base_model') and k not in pr.LAUNCH_LIST_PRICE_API|pr.AGE_QUALIFIED_API
 # Same totals and decision count as raw resolution, with no string fields from raw records.
 rows=[{'usage':{'input_tokens':d['input_tokens_all'] if i==0 else 0,'output_tokens':0}} for i in range(1500)]
 r=pr.resolve(k,en,rows,pr.catalog_rates());assert r==d['price_reference'] and r['rankable'] is False and r['market_reference'] is None and r['usd_per_1000'] is None and not r['counting_list_price'];receipts[k]=r
(J/'receipts/PRICING-RECHECK.json').write_text(json.dumps({'status':'PASS','module_sha256':PIN,'receipts':receipts,'cost_computed':False},indent=1,sort_keys=True)+'\n');print('PASS frozen resolve() recheck for both keys: not priced, no reference or tariff cost')
