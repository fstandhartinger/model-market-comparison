import os
import pathlib,json
J=pathlib.Path(__file__).resolve().parent;W=pathlib.Path(os.environ.get('WT',str(J.parents[1])))
L=lambda p:json.loads(p.read_text())
pub=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.11-publication.json')
s=(J/'lib-v1711.template.mjs').read_text().replace('/*HASHES*/',json.dumps({k:v['sha256'] for k,v in pub['files'].items()},sort_keys=True)).replace('/*ROWS*/',json.dumps(L(J/'receipts/REMEASURED-ROW-SPEC.json'),sort_keys=True,ensure_ascii=False))
s=s.replace('/*NEWROWS*/',json.dumps(L(J/'receipts/NEW-ROW-SPEC.json'),sort_keys=True,ensure_ascii=False))
pins=L(J/'receipts/INPUTS.json')
s=s.replace('/*REFERENCES*/',json.dumps({k:v['price_reference'] for k,v in pins.items()},sort_keys=True)).replace('/*RECOUNTS*/',json.dumps({k:v['audit_sha256'] for k,v in pins.items()},sort_keys=True))
(W/'lib/jevbench-v1711-release.mjs').write_text(s)
print('v1711 loader generated')
