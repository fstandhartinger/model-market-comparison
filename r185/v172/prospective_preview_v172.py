"""Prepare aggregate-only numeric preview. This never builds a release or category cells."""
import copy,json,pathlib,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
L=lambda p:json.loads(p.read_text())
put=lambda p,d:p.write_text(json.dumps(d,indent=1,sort_keys=True,ensure_ascii=False)+'\n')
b=L(W/'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.1-results.json');a=copy.deepcopy(b)
s=copy.deepcopy(L(J/'src/inputs.json')['jeetu-decider-2b']['v17-share'])
assert s['ranked'] and s['listing']=='ranked' and s['cost']['usd_per_1000']<0.06459465517241379
rows={x['key']:x for x in a['systems']};assert s['key'] not in rows;rows[s['key']]=s
for m in ['A','B','C','capability']:
 order=list(b['board'][m]['order']) if m!='capability' else [x['key'] for x in sorted(b['systems'],key=lambda x:x.get('ranks',{}).get('capability') or 999999) if x['ranked']]
 val=lambda k:rows[k]['capability'] if m=='capability' else rows[k]['scores'][m]
 order.insert(next((i for i,k in enumerate(order) if val(k)<val(s['key'])),len(order)),s['key'])
 a['board'].setdefault(m,{})['order']=order
 for i,k in enumerate(order):rows[k]['ranks'][m]=i+1
for x in rows.values():
 if x['ranked']:x['rank']=x['ranks']['A']
for x in b['systems']:assert {k:v for k,v in x.items() if k not in ['rank','ranks']}=={k:v for k,v in rows[x['key']].items() if k not in ['rank','ranks']},x['key']
a.update(systems=sorted(rows.values(),key=lambda s:s['key']),roster_count=289,n_ranked=sum(bool(x['ranked']) for x in rows.values()))
put(J/'receipts/prospective-results.json',a)
# Same site assembly and list tools as v171. Injection is explicit and never pretends a release has passed validation.
source=(J/'topfive_v172.mjs').read_text()
source=source.replace('const { published, publishedCarry } = board;', '''if(process.env.PROSPECTIVE_RESULTS) {
 const artifact=JSON.parse(readFileSync(process.env.PROSPECTIVE_RESULTS,'utf8'));
 board.published={...board.published,...artifact,restated_by:'v1.7.2'};
}
const { published, publishedCarry } = board;''')
(J/'prospective_topfive_v172.mjs').write_text(source)
subprocess.run(['node',str(J/'topfive_v172.mjs')],cwd=W,stdout=(J/'receipts/topfive-before.json').open('w'),check=True,timeout=180)
import os
subprocess.run(['node',str(J/'prospective_topfive_v172.mjs')],cwd=W,env={**os.environ,'PROSPECTIVE_RESULTS':str(J/'receipts/prospective-results.json')},stdout=(J/'receipts/topfive-after.json').open('w'),check=True,timeout=180)
subprocess.run(['python3','-B',str(J/'topfive_diff_v172.py')],check=True,timeout=180)
source=(J/'extended_preview_v172.mjs').read_text().replace("load(path.join(data,'jevbench-v1.7.2-results.json'))","load(path.join(J,'receipts/prospective-results.json'))")
(J/'prospective_extended_v172.mjs').write_text(source)
subprocess.run(['node',str(J/'prospective_extended_v172.mjs'),str(W)],cwd=W,check=True,timeout=180)
print('Prospective numeric preview only; 288 carried rows equal except ranks. Candidate build and category verification remain required.')
