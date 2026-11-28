import pathlib,json
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8';L=lambda p:json.loads(p.read_text());pr=L(D/'jevbench-v1.8.24-proof.json');pub=L(D/'jevbench-v1.8.24-publication.json')
s=(J/'lib-v1824.template.mjs').read_text()
for key,v in {'CELLS':L(J/'src/cells.json'),'SCOPE':L(J/'inputs/BREAKDOWN-POLICY.json'),'HASHES':{k:v['sha256'] for k,v in pub['files'].items()},'ROWS':L(J/'receipts/NEW-ROWS.json'),'BOUNDS':L(J/'receipts/BOUNDS.json'),'PROOF':pr,'TEXT_EXCEPTIONS':L(J/'inputs/TEXT-EXCEPTIONS.json'),'NOTE':L(J/'inputs/NOT-RANKED-TEXT.json')['NOTE'],'COST_NOTE':"Cost uses the provider's published list price. Free quotas, free previews and launch credits are not counted."}.items():s=s.replace('/*'+key+'*/',json.dumps(v,sort_keys=True,ensure_ascii=False))
target=W/'lib/jevbench-v1824-release.mjs';tmp=target.with_name(target.name+'.v1824-tmp');tmp.write_text(s);tmp.replace(target)
