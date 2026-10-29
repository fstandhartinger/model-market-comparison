import pathlib,json
from texts_v1723 import HIST
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.7'
m=json.loads((D/'jevbench-v1.7.23-publication.json').read_text());p=json.loads((D/'jevbench-v1.7.23-proof.json').read_text())
s=(J/'lib-v1723.template.mjs').read_text().replace('/*HASHES*/',json.dumps({k:v['sha256'] for k,v in m['files'].items()},sort_keys=True)).replace('/*EXCEPTIONS*/',json.dumps(p['exceptions'],ensure_ascii=False,sort_keys=True)).replace('/*HIST*/',json.dumps(HIST))
(W/'lib/jevbench-v1723-release.mjs').write_text(s)
