import os
import pathlib,json
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])))
L=lambda p:json.loads(p.read_text())
pub=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.14-publication.json');proof=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.14-proof.json')
s=(J/'lib-v1714.template.mjs').read_text().replace('/*HASHES*/',json.dumps({k:v['sha256'] for k,v in pub['files'].items()},sort_keys=True))
s=s.replace('/*NEWROWS*/',json.dumps(L(J/'receipts/NEW-ROW-SPEC.json'),sort_keys=True,ensure_ascii=False)).replace('/*SCORERS*/',json.dumps(L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.13-proof.json')['scorers'],sort_keys=True)).replace('/*BOUNDS*/',json.dumps(L(J/'receipts/NEW-ROW-BOUNDS.json'),sort_keys=True))
s=s.replace('/*PRICES*/',json.dumps({k:v['price_reference'] for k,v in proof['new_rows'].items()},sort_keys=True))
s=s.replace('/*TEXTFIX*/',json.dumps(proof['exceptions'],sort_keys=True)).replace('/*TEXTEXCEPT*/',json.dumps(proof['carried_rows_equal_except'],ensure_ascii=False))
for marker in ['/*HASHES*/','/*NEWROWS*/','/*BOUNDS*/','/*SCORERS*/','/*PRICES*/','/*TEXTFIX*/','/*TEXTEXCEPT*/']:assert marker not in s,marker
(W/'lib/jevbench-v1714-release.mjs').write_text(s)
print('v1714 loader generated')
