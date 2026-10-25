import pathlib,json
J=pathlib.Path(__file__).resolve().parent
L=lambda p:json.loads(p.read_text())
rows={}
for tag,k in [('r10a','amazon-strands-decider-26b-a4b'),('r10b','turion-jev-31b'),('chonfast','chon-1.0-12b-fast')]:
 rows[k]={}
 for mode in ['off','share']:
  base=J/f'cells/new-rows/{tag}/{mode}'
  cat=L(base/'categories-with-topics.json')['systems'][k]
  rows[k]['cells_'+mode]={d:cat[d] for d in ['families','languages','topics','usecases']}
  rows[k]['noul_'+mode]=L(base/'decisive.json')[k]
(J/'src/cells.json').write_text(json.dumps(rows,indent=1,sort_keys=True)+'\n')
print('Consolidated 3 rows, off/share, 4 category dimensions and noul decisive')
