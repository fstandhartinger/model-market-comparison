"""Source digest and non-prose registry agreement, without reading item payloads."""
import pathlib,json,hashlib
J=pathlib.Path(__file__).resolve().parent;I=pathlib.Path('/home/flori/jobs/jevbench-auto-intake/r24-score');K='sieve-31b-v2'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
e=L(I/'ENTRIES-R13A-LEAD.json')[K]['entry'];r=L(I/'field-r13a/REGISTRY.json')[K];meta=L(I/'field-r13a/BUILD-META.json')
prose={'code_revision','cost_basis','disclosure','endpoint_condition'}
assert all(v==e[k] for k,v in r.items() if k in e and k not in prose)
a=L(J/'src/inputs.json')[K]
rows=L(I/'field-r13a/ROWS.json')[K]
assert rows['raw_sha256']==a['raw_sha256']==sha(I/'field-r13a/runs/sieve-31b-v2.jsonl')
assert rows['input_tokens']==rows['input_tokens_common']==714573 and rows['output_tokens']==0 and rows['ok']==rows['n_common']==1485 and rows['n_over_10s']==0
assert round(rows['cap_ratio'],3)==0.670 and round(rows['cap_ratio_all_rows'],3)==0.664
assert rows['ref'][0]=='google/gemma-4-31b-it' and round(rows['ref'][1][0],2)==0.09 and round(rows['ref'][1][1],2)==0.34

for mode in ['frozen','v17-off','v17-share']:
 src=next(s for s in L(I/f'field-r13a/out-{mode}/jevbench-v1.6.0-results.json')['systems'] if s['key']==K)
 for f in ['axes','scores','views','jevbench_score','capability','speed','v16','intelligence','calibration','validity','composite_ci95','decision_limit','status','support']:assert a[mode].get(f)==src.get(f),(mode,f)
 assert {k:v for k,v in a[mode]['cost'].items() if k!='basis'}=={k:v for k,v in src['cost'].items() if k!='basis'}
result={'status':'PASS','source_registry_sha256':sha(I/'field-r13a/REGISTRY.json'),'source_build_meta_sha256':sha(I/'field-r13a/BUILD-META.json'),'source_entry_sha256':sha(I/'ENTRIES-R13A-LEAD.json'),'registry_nonprose_equal_to_reviewed_entry':True,'all_numeric_aggregates_equal_to_scored_field':True,'original_ci_seed_preserved':71,'build_meta_entry_digest_before_reviewed_prose_fixes':meta['entries'],'raw_verified_in_place':L(J/'receipts/INPUTS.json')[K]['raw_verified_in_place']}
(J/'receipts/SOURCE-CHECK.json').write_text(json.dumps(result,indent=1,sort_keys=True)+'\n');print(json.dumps(result))
