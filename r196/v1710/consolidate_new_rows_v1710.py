import pathlib,json
J=pathlib.Path(__file__).resolve().parent;L=lambda p:json.loads(p.read_text());rows={}
for k in L(J/'src/inputs.json'):
 rows[k]={}
 for mode in ['off','share']:
  b=J/f'cells/new-rows/{k}/{mode}';cat=L(b/'categories-with-topics.json')['systems'][k]
  rows[k]['cells_'+mode]={d:cat[d] for d in ['families','languages','topics','usecases']};rows[k]['noul_'+mode]=L(b/'decisive.json')[k]
(J/'src/cells.json').write_text(json.dumps(rows,indent=1,sort_keys=True)+'\n')
print('PASS three rows category and decisive aggregates')
