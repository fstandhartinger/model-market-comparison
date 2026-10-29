import os
import pathlib,json
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])))
L=lambda p:json.loads(p.read_text())
pub=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.22-publication.json');proof=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.22-proof.json')
s=(J/'lib-v1722.template.mjs').read_text().replace('/*HASHES*/',json.dumps({k:v['sha256'] for k,v in pub['files'].items()},sort_keys=True))
s=s.replace('/*NEWROWS*/',json.dumps(L(J/'receipts/NEW-ROW-SPEC.json'),sort_keys=True,ensure_ascii=False))
s=s.replace('/*SCORERS*/',json.dumps(L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.21-proof.json')['scorers'],sort_keys=True)).replace('/*BOUNDS*/',json.dumps(L(J/'receipts/NEW-ROW-BOUNDS.json'),sort_keys=True))
s=s.replace('/*PRICES*/',json.dumps({k:v['price_reference'] for k,v in proof['new_rows'].items()},sort_keys=True))
prev={r['key']:r for r in L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.21-results.json')['systems']};now={r['key']:r for r in L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.22-results.json')['systems']}
rep={k:{f:{'before':prev[k][f],'after':now[k][f]} for f in fs} for k,fs in proof['exceptions'].items()}
s=s.replace('/*REPRICED*/',json.dumps(rep,sort_keys=True,ensure_ascii=False)).replace('/*COMMONSET*/',json.dumps({'n':proof['cost_basis']['n_items'],'set_sha256':proof['cost_basis']['set_sha256']},sort_keys=True))
s=s.replace('/*TEXTFIX*/',json.dumps(proof['exceptions'],sort_keys=True)).replace('/*TEXTEXCEPT*/',json.dumps(proof['carried_rows_equal_except'],ensure_ascii=False))
for marker in ['/*REPRICED*/','/*COMMONSET*/','/*HASHES*/','/*NEWROWS*/','/*BOUNDS*/','/*SCORERS*/','/*PRICES*/','/*TEXTFIX*/','/*TEXTEXCEPT*/']:assert marker not in s,marker
(W/'lib/jevbench-v1722-release.mjs').write_text(s)
print('v1722 loader generated')
