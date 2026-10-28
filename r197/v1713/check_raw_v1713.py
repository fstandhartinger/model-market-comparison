"""Raw/entry hash binding for the new row: sealed raw hashed in place (never copied, never printed), sealed input order,
status/token totals and latency aggregates recomputed. Prints aggregates only."""
import hashlib,json,pathlib
J=pathlib.Path(__file__).resolve().parent;L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
D=pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027');K='h2o-lightning-4b-v1.4.1'
pins=L(J/'receipts/INPUTS.json')[K];proof=L(J.parents[1]/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.13-proof.json')['new_rows'][K]
raw=D/'runs-fastlane/h2o-lightning-4b-v1.4.1.raw.jsonl';inp=D/'inputs/input-selfhosted-1500.jsonl'
assert sha(raw)==pins['raw_sha256']==proof['raw_sha256']=='96d26bb3c0486ecbee832e309db4099b3a616b1540b4a92eff09dec81b719335'
assert sha(pins['entry_path'])==pins['entry_sha256']=='62f71cdc1b376b2b402d0935bbff7fae10c9237df76761a706116abf0396e551'
assert sha(inp)==pins['input_sha256'] and sha(D/'inputs/manifest.json')==pins['manifest_sha256']
assert proof['scored_input_sha256']==pins['v17-share']['sha256']==sha(pins['v17-share']['path'])
assert (raw.stat().st_mode&0o777)==0o600
rows=[json.loads(l) for l in raw.read_text().splitlines() if l.strip()];ids=[json.loads(l)['task_id'] for l in inp.read_text().splitlines() if l.strip()]
assert [r['task_id'] for r in rows]==ids,'raw not in sealed input order'
assert all(r['ok'] and r['status_code']==200 for r in rows)
tin=sum(r['usage']['input_tokens'] for r in rows);tout=sum(r['usage']['output_tokens'] for r in rows);lat=sorted(r['latency_s'] for r in rows)
assert (len(rows),tin,tout)==(1500,944694,1500) and sum(v>10 for v in lat)==0
out={'status':'PASS','rows':1500,'http_200':1500,'untrimmed_input_tokens':tin,'output_tokens':tout,'over_10s':0,'latency_max_s':round(lat[-1],3),'raw_sha256':pins['raw_sha256'],'entry_sha256':pins['entry_sha256'],'input_order':True,'raw_mode':'0600'}
(J/'receipts/RAW-BINDING.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print('PASS raw/entry/input/manifest hash binding, sealed input order, 1500 x 200, token totals, 0 over 10 s')
