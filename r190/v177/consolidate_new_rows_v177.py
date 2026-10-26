import pathlib,json
J=pathlib.Path(__file__).resolve().parent;L=lambda p:json.loads(p.read_text());rows={}
for k in ['d1a-gemma4-e4b','d1a-gemma4-e2b']:
 rows[k]={}
 for mode in ['off','share']:
  base=J/f'cells/new-rows/d1a/{mode}';cat=L(base/'categories-with-topics.json')['systems'][k]
  rows[k]['cells_'+mode]={d:cat[d] for d in ['families','languages','topics','usecases']};rows[k]['noul_'+mode]=L(base/'decisive.json')[k]
(J/'src/cells.json').write_text(json.dumps(rows,indent=1,sort_keys=True)+'\n')
print('PASS two rows, off/share, category and decisive aggregates')
