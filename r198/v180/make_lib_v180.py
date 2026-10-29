import pathlib,json
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];D=W/'data/raw/benchmarks/jevbench/v1.8'
m=json.loads((D/'jevbench-v1.8.0-publication.json').read_text());p=json.loads((D/'jevbench-v1.8.0-proof.json').read_text());c=json.loads((J/'inputs/config.json').read_text());note=json.loads((J/'receipts/summary.json').read_text())['note']
s=(J/'lib-v180.template.mjs').read_text().replace('PREVIOUS',c['previous']).replace('PREV','V'+c['previous'].replace('.','')[1:])
# PREV denotes the numeric suffix (1723); public function names require V1723.
s=s.replace("'./jevbench-V","'./jevbench-v")
for key,val in [('HASHES',{k:v['sha256'] for k,v in m['files'].items()}),('EXCEPTIONS',p['exceptions']),('BOARDEXCEPTIONS',p['board_exceptions']),('COSTSPEC',p['repriced_rows']),('NOTE',note)]:s=s.replace('/*'+key+'*/',json.dumps(val,sort_keys=True,ensure_ascii=False))
(W/'lib/jevbench-v180-release.mjs').write_text(s)
