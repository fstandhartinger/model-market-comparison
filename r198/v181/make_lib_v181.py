import pathlib,json
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8';L=lambda p:json.loads(p.read_text());pr=L(D/'jevbench-v1.8.1-proof.json');pub=L(D/'jevbench-v1.8.1-publication.json')
s=(J/'lib-v181.template.mjs').read_text()
for key,v in {'HASHES':{k:v['sha256'] for k,v in pub['files'].items()},'ROWS':L(J/'receipts/NEW-ROWS.json'),'BOUNDS':L(J/'receipts/BOUNDS.json'),'PROOF':pr}.items():s=s.replace('/*'+key+'*/',json.dumps(v,sort_keys=True,ensure_ascii=False))
(W/'lib/jevbench-v181-release.mjs').write_text(s)
