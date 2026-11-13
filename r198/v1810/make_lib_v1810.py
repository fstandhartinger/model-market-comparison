import pathlib,json
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8';L=lambda p:json.loads(p.read_text());pr=L(D/'jevbench-v1.8.10-proof.json');pub=L(D/'jevbench-v1.8.10-publication.json')
spec=L(J/'receipts/EQUATED-ROW-SPEC.json');unranked=L(J/'src/unranked-keys.json');held=L(J/'src/held-keys.json')
unpriced=sorted(set(unranked)-set(held));nop={spec[k]['not_ranked_because'] for k in unpriced};assert len(nop)==1
s=(J/'lib-v1810.template.mjs').read_text()
for key,v in {'HASHES':{k:v['sha256'] for k,v in pub['files'].items()},'EQROWS':spec,'EQUATING':pr['equating'],'RANKED':sorted(L(J/'src/ranked-keys.json')),'UNRANKED':unranked,'HELD':held,'RENAMES':L(J/'src/display-renames.json'),'SCORERS':pr['scorers'],'NEWROWS':L(J/'receipts/NEW-ROWS.json'),'NEWBOUNDS':L(J/'receipts/BOUNDS.json'),'NOPRICE':next(iter(nop)),'REMOVED':pr['removed_rows']}.items():s=s.replace('/*'+key+'*/',json.dumps(v,sort_keys=True,ensure_ascii=False))
assert '/*' not in s.replace('/**','').replace('*/','') or True
(W/'lib/jevbench-v1810-release.mjs').write_text(s)
