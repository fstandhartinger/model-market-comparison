"""Raw binding for the new row: the sealed raw and the private 1,493-item gold view are hashed in place (never copied, never printed);
row count, status codes, token totals and latency aggregates are recomputed from the raw; the 7 excluded ids are absent and the view is a
subset of the pinned draw gold. Prints aggregates only."""
import hashlib,json,pathlib
J=pathlib.Path(__file__).resolve().parent;L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
D=pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027');K='microsoft-decision-1-r2'
raw=D/'runs-fastlane/microsoft-decision-1-r2/microsoft-decision-1-r2.jsonl';view=D/'runs-fastlane/microsoft-decision-1-r2-scoreview-1493/frozen/gold.jsonl';gold=D/'frozen/gold.jsonl'
pins=L(J/'receipts/INPUTS.json')[K];proof=L(J.parents[1]/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.15-proof.json')['new_rows'][K]
assert sha(raw)==pins['raw_sha256']==proof['raw_sha256']=='1f069818cdc069a532a4c4965d306fbd302bb819dde4aa3c48a9bd676c4a981e'
assert sha(view)==pins['gold_view_sha256'] and sha(gold)==pins['gold_sha256'] and sha(D/'inputs/manifest.json')==pins['manifest_sha256']
assert (raw.stat().st_mode&0o777)==0o600 and (view.stat().st_mode&0o777)==0o600
rows=[json.loads(l) for l in raw.read_text().splitlines() if l.strip()]
vid=[json.loads(l)['opaque_id'] for l in view.read_text().splitlines() if l.strip()];gid=set(json.loads(l)['opaque_id'] for l in gold.read_text().splitlines() if l.strip())
assert len(rows)==len(vid)==1493 and [r['task_id'] for r in rows]==vid and set(vid)<=gid and len(gid)==1500
codes={};[codes.__setitem__(r['status_code'],codes.get(r['status_code'],0)+1) for r in rows]
assert codes=={200:1489,422:4},codes
ok=[r for r in rows if r['ok']];tin=sum(r['usage']['input_tokens'] for r in ok);tout=sum(r['usage']['output_tokens'] for r in ok);lat=sorted(r['latency_s'] for r in rows)
assert (len(ok),tin,tout)==(1489,467021,1489)==(1489,proof['cost']['input_tokens'],proof['cost']['output_tokens']) and sum(v>10 for v in lat)==0
out={'status':'PASS','rows':1493,'http':{str(k):v for k,v in codes.items()},'input_tokens':tin,'output_tokens':tout,'over_10s':0,'latency_max_s':round(lat[-1],3),'raw_sha256':pins['raw_sha256'],'gold_view_sha256':pins['gold_view_sha256'],'view_subset_of_draw_gold':True,'excluded_items':1500-1493,'raw_order_equals_view_order':True}
(J/'receipts/RAW-BINDING.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print('PASS raw/gold-view/manifest hash binding for',K,'(1,493 rows in view order, 1,489 x 200 + 4 x 422, 467,021/1,489 tokens, 0 over 10 s, view = draw gold minus 7)')
