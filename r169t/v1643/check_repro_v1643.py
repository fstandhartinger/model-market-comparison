"""Verify repeated frozen field outputs; emit filenames and hashes only."""
import pathlib,hashlib,json
J=pathlib.Path(__file__).resolve().parent
names=['jevbench-v1.6.0-results.json','categories.json','noul-decisive.json']
rows=[]
for name in names:
 a=J/'batch/out-v1643'/name;b=J/'batch/out-repro'/name
 x=hashlib.sha256(a.read_bytes()).hexdigest();y=hashlib.sha256(b.read_bytes()).hexdigest()
 assert x==y, ('repeated scorer bytes differ',name)
 rows.append(dict(file=name,sha256=x,identical=True))
(J/'receipts/FIELD-REPRO.json').write_text(json.dumps(rows,indent=2)+'\n')
print('PASS: repeated B=1000 field results, categories and Noul diagnostics byte-identical')
