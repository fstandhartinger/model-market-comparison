"""Raw/entry hash binding for the five new rows: sealed raws hashed in place (never copied, never printed), sealed input order,
status/token totals and latency aggregates recomputed; Decisio engine recount bound by file and script hash. Prints aggregates only."""
import hashlib,json,pathlib
J=pathlib.Path(__file__).resolve().parent;L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
D=pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027')
EXPECT={'torchcast-decision-31b-v1.0':('runs-fastlane/torchcast-decision-31b-v1.0.raw.jsonl','e51a1c22336050368336c996d7cb32181bad5e854024f07844b2a8577a0dda7d','f36373abe1a01b3fbf0e19e6ebb4fddfe0615f472e1528c9906fa9eb0f2b454a',645268,0),
 'arcbright-elf-1-12b-r2':('runs-auto-intake/arcbright-elf-1-12b-r2.raw.jsonl','84f08ebb6ff92af453b75cda042f617ea89c5be6a2176c7c69e11f2521da6f08','bb53dc42a9e16169bd2e7f33e527b8780037cef386263f109e50285cde3be20f',610840,1500),
 'jeff_1_1_qwen_4b':('runs-auto-intake/jgeuter-jeff-1-1-qwen-4b.raw.jsonl','c37fada15a2021cf744b2031acb964508caf48873a2bcda5da6d6ac4a5e7c288','bb53dc42a9e16169bd2e7f33e527b8780037cef386263f109e50285cde3be20f',629951,69580),
 'decisio-gemma-4-12b-tuned-commit-think':('runs-auto-intake/tachara-ai-decisio-12b-tuned-commit-think.raw.jsonl','d7396dd680e13af9ba26c4526007fee3647d03eee7673bf88075ac510f39cc3c','bb53dc42a9e16169bd2e7f33e527b8780037cef386263f109e50285cde3be20f',727045,9121),
 'jeff_1_1_large':('runs-auto-intake/jgeuter-jeff-1-1-large.raw.jsonl','1f1fdc2df674da00128ae7b47d5ea3429cf1124383a077577e7c68c7d9cc0e72','094aedba39685e9a0949d381746a50dd274ef145c8aadf3d2d4889581d6ea7c0',620215,21830)}
pins=L(J/'receipts/INPUTS.json');proof=L(J.parents[1]/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.14-proof.json')['new_rows']
inp=D/'inputs/input-selfhosted-1500.jsonl';ids=[json.loads(l)['task_id'] for l in inp.read_text().splitlines() if l.strip()]
assert set(pins)==set(proof)==set(EXPECT);out={}
for k,(rel,rh,eh,nin,nout) in EXPECT.items():
 raw=D/rel;p=pins[k];pr=proof[k]
 assert sha(raw)==p['raw_sha256']==pr['raw_sha256']==rh,k
 assert sha(p['entry_path'])==p['entry_sha256']==eh,k
 assert sha(inp)==p['input_sha256'] and sha(D/'inputs/manifest.json')==p['manifest_sha256']
 assert pr['scored_input_sha256']==p['v17-share']['sha256']==sha(p['v17-share']['path'])
 assert (raw.stat().st_mode&0o777)==0o600,k
 rows=[json.loads(l) for l in raw.read_text().splitlines() if l.strip()]
 assert [r['task_id'] for r in rows]==ids,(k,'raw not in sealed input order')
 assert all(r['ok'] and r['status_code']==200 and r['error'] is None for r in rows)
 tin=sum(r['usage']['input_tokens'] for r in rows);tout=sum(r['usage']['output_tokens'] for r in rows);lat=sorted(r['latency_s'] for r in rows)
 assert (len(rows),tin,tout)==(1500,nin,nout) and sum(v>10 for v in lat)==0,k
 out[k]={'rows':1500,'http_200':1500,'native_input_tokens':tin,'output_tokens':tout,'priced_input_tokens':pr['cost']['priced_input_tokens'],'over_10s':0,'latency_max_s':round(lat[-1],3),'raw_sha256':rh,'entry_sha256':eh,'input_order':True,'raw_mode':'0600'}
rc=pins['decisio-gemma-4-12b-tuned-commit-think']['engine_recount'];AI=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r47-decisio-think')
assert sha(AI/'state/engine-recount-20261027/engine-recount.json')==rc['file_sha256']=='8c9f4691551a99a23c2763783278727f6f6fd7ca5c9fc24467c2dec8b144b646'
assert sha(AI/'engine_recount.py')==rc['engine_recount_sha256']=='07b69b7a71ba53f1e3b6d22d64803c9bfa97496479c0205e613484e673401319' and rc['answered_engine_input_tokens']==844031 and rc['answered_native_input_tokens']==727045
out['decisio-gemma-4-12b-tuned-commit-think']['engine_recount']=rc
(J/'receipts/RAW-BINDING.json').write_text(json.dumps({'status':'PASS','rows':out},indent=1,sort_keys=True)+'\n');print('PASS raw/entry/input/manifest hash binding for 5 rows, sealed input order, 1500 x 200 each, token totals, 0 over 10 s; Decisio engine recount bound (file + script hash)')
