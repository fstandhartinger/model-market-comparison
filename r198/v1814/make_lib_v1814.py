import pathlib,json
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8';L=lambda p:json.loads(p.read_text());pr=L(D/'jevbench-v1.8.14-proof.json');pub=L(D/'jevbench-v1.8.14-publication.json')
s=(J/'lib-v1814.template.mjs').read_text()
for key,v in {'KARPO_ROW':L(J/'inputs/KARPO-ROW.json'),'KARPO_CELLS':L(J/'inputs/KARPO-CELLS.json'),'CELLS':L(J/'src/cells.json'),'SCOPE':L(J/'inputs/BREAKDOWN-POLICY.json'),'HASHES':{k:v['sha256'] for k,v in pub['files'].items()},'ROWS':L(J/'receipts/NEW-ROWS.json'),'BOUNDS':L(J/'receipts/BOUNDS.json'),'PROOF':pr,'TEXT_EXCEPTIONS':L(J/'inputs/TEXT-EXCEPTIONS.json')}.items():s=s.replace('/*'+key+'*/',json.dumps(v,sort_keys=True,ensure_ascii=False))
(W/'lib/jevbench-v1814-release.mjs').write_text(s)
