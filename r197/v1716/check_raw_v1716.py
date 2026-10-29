"""Raw binding (aggregates only, nothing printed per item): strike-1's sealed raw is hashed in place and bound to its custody CONSUMED
receipt; row order = the draw input; 1,495 x 200 (served strike-1, native probabilities, output 0) + 5 x 400 (exactly the 5 longest
items, the 5 over-limit refusals); token totals and latency recomputed. The common set is recomputed from all 8 d1027 raws and must equal
the pinned size and set hash; every carried row's raw hash equals the pin its own release recorded."""
import hashlib,json,pathlib
J=pathlib.Path(__file__).resolve().parent;L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
D=pathlib.Path('/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027');K='strike-1';V=J.parents[1]/'data/raw/benchmarks/jevbench/v1.7'
raw=D/'runs-auto-intake/strike-1/strike-1.raw.jsonl';cons=D/'runs-auto-intake/strike-1/CONSUMED.json';inp=D/'inputs/input-selfhosted-1500.jsonl'
pins=L(J/'receipts/INPUTS.json');proof=L(V/'jevbench-v1.7.16-proof.json');pk=pins[K];nr=proof['new_rows'][K]
assert sha(raw)==pk['raw_sha256']==nr['raw_sha256']=='4c6c7ab25b11432f8934425a44806ec5a2499241a9c5790216a11651473f2027'
assert sha(cons)==pk['consumed_sha256'] and L(cons)['raw_sha256']==pk['raw_sha256'] and sha(inp)==pk['input_sha256'] and sha(D/'inputs/manifest.json')==pk['manifest_sha256'] and sha(D/'frozen/gold.jsonl')==pk['gold_sha256']
assert (raw.stat().st_mode&0o777)==0o600 and raw.stat().st_nlink==1
rows=[json.loads(l) for l in raw.read_text().splitlines() if l.strip()];ids=[json.loads(l)['task_id'] for l in inp.read_text().splitlines() if l.strip()]
assert len(rows)==1500 and [r['task_id'] for r in rows]==ids
codes={};[codes.__setitem__(r['status_code'],codes.get(r['status_code'],0)+1) for r in rows];assert codes=={200:1495,400:5},codes
ok=[r for r in rows if r['status_code']==200]
assert all(r['ok'] and r['error'] is None and r['served_model']=='strike-1' and r['probs_source']=='native' and r['usage']['output_tokens']==0 for r in ok)
tin=sum(r['usage']['input_tokens'] for r in ok);lat=sorted(r['latency_s'] for r in rows)
assert tin==nr['cost']['input_tokens_all'] and sum(v>10 for v in lat)==0
# the 5 refusals are the 5 longest items (by every other row's own input count, e.g. Elf's)
elf=[json.loads(l) for l in (D/'runs-auto-intake/arcbright-elf-1-12b-r2.raw.jsonl').read_text().splitlines() if l.strip()]
et={r['task_id']:r['usage']['input_tokens'] for r in elf};longest=set(sorted(et,key=lambda t:-et[t])[:5])
assert {r['task_id'] for r in rows if r['status_code']==400}==longest
# common set recomputed from the 8 raws
RAWS={'h2o-lightning-4b-v1.4.1':'runs-fastlane/h2o-lightning-4b-v1.4.1.raw.jsonl','torchcast-decision-31b-v1.0':'runs-fastlane/torchcast-decision-31b-v1.0.raw.jsonl','arcbright-elf-1-12b-r2':'runs-auto-intake/arcbright-elf-1-12b-r2.raw.jsonl',
      'jeff_1_1_qwen_4b':'runs-auto-intake/jgeuter-jeff-1-1-qwen-4b.raw.jsonl','jeff_1_1_large':'runs-auto-intake/jgeuter-jeff-1-1-large.raw.jsonl','decisio-gemma-4-12b-tuned-commit-think':'runs-auto-intake/tachara-ai-decisio-12b-tuned-commit-think.raw.jsonl',
      'microsoft-decision-1-r2':'runs-fastlane/microsoft-decision-1-r2/microsoft-decision-1-r2.jsonl','strike-1':'runs-auto-intake/strike-1/strike-1.raw.jsonl'}
mem=proof['cost_basis']['per_row_membership'];sets=[]
for k,p in RAWS.items():
 assert sha(D/p)==mem[k]['raw_sha256'],k
 rr=[json.loads(l) for l in (D/p).read_text().splitlines() if l.strip()];sets.append({r['task_id'] for r in rr if r.get('ok') and r.get('status_code')==200 and not r.get('error')})
common=set.intersection(*sets);h=hashlib.sha256(json.dumps(sorted(common),separators=(',',':')).encode()).hexdigest()
assert len(common)==proof['cost_basis']['n_items']==1489 and h==proof['cost_basis']['set_sha256'] and longest.isdisjoint(common)
out={'status':'PASS','rows':1500,'http':{str(k):v for k,v in codes.items()},'input_tokens_all':tin,'output_tokens':0,'over_10s':0,'latency_max_s':round(lat[-1],3),'raw_sha256':pk['raw_sha256'],'consumed_sha256':pk['consumed_sha256'],
     'refusals_are_the_5_longest_items':True,'raw_order_equals_input_order':True,'common_set_recomputed':{'n':len(common),'set_sha256':h,'equals_proof':True},'carried_raw_pins_match':True}
(J/'receipts/RAW-BINDING.json').write_text(json.dumps(out,indent=1,sort_keys=True)+'\n');print('PASS raw/consumed/input/manifest binding for',K,'(1,500 rows in input order, 1,495 x 200 + 5 x 400 = the 5 longest items, output 0, 0 over 10 s); common set recomputed from 8 raws:',len(common),'items, sha',h[:8],'= proof')
