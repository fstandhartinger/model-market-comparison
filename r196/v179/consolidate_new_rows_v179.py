import pathlib,json
J=pathlib.Path(__file__).resolve().parent;L=lambda p:json.loads(p.read_text());rows={}
for k in ['knowledgator_gliclass_v4_9b']:
 rows[k]={}
 for mode in ['off','share']:
  base=J/f'cells/new-rows/gliclass9b/{mode}';cat=L(base/'categories-with-topics.json')['systems'][k]
  rows[k]['cells_'+mode]={d:cat[d] for d in ['families','languages','topics','usecases']};rows[k]['noul_'+mode]=L(base/'decisive.json')[k]
(J/'src/cells.json').write_text(json.dumps(rows,indent=1,sort_keys=True)+'\n')
print('PASS one row, off/share, category and decisive aggregates')
