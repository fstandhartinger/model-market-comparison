import pathlib,json
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7'
L=lambda p:json.loads(p.read_text())
pub=L(V/'jevbench-v1.7.18-publication.json');proof=L(V/'jevbench-v1.7.18-proof.json');cells=L(V/'jevbench-v1.7.18-categories.json')['systems']
s=(J/'lib-v1718.template.mjs').read_text()
for k,v in {'HASHES':{k:v['sha256'] for k,v in pub['files'].items()},'PROOF':proof,'NEWROWS':L(J/'receipts/NEW-ROW-SPEC.json'),'BOUNDS':L(J/'receipts/NEW-ROW-BOUNDS.json'),'CELLS':{k:cells[k] for k in proof['new_rows']}}.items():s=s.replace('/*'+k+'*/',json.dumps(v,sort_keys=True,ensure_ascii=False))
(W/'lib/jevbench-v1718-release.mjs').write_text(s)
print('v1718 loader generated')
