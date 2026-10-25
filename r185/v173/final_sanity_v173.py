import pathlib,json,hashlib,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.7';K='chon-1.0-e4b'
L=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for name,digest in L(J/'receipts/CARRIED-OFF-SOURCES.json')['inherited'].items():assert sha(W/name)==digest,name
pub=L(V/'jevbench-v1.7.3-publication.json');assert pub['review']=={'engine':'PENDING','verdict':'PENDING','receipt_sha256':None}
for n,r in pub['files'].items():assert sha(W/r['path'])==r['sha256'],n
for n in ['history','history-carry','carry']:assert (V/f'jevbench-v1.7.3-{n}.json').read_bytes()==(V/f'jevbench-v1.7.2-{n}.json').read_bytes(),n
proof=L(V/'jevbench-v1.7.3-proof.json')
for n,path in {'scored_rows_sha256':'src/inputs.json','entry_sha256':'inputs/ENTRY-CHON-E4B.json','cells_sha256':'src/cells.json','sd_entry_sha256':'inputs/ENTRY-SCALEDOWN.json'}.items():assert proof['source_inputs'][n]==sha(J/path),n
old={s['key']:s for s in L(V/'jevbench-v1.7.2-results.json')['systems']};new={s['key']:s for s in L(V/'jevbench-v1.7.3-results.json')['systems']}
assert set(old)|{'scaledown-classify-1'}==set(new) and len(new)==290
strip=lambda s:{f:v for f,v in s.items() if f not in ['rank','ranks']}
for k in old:
 if k!=K:assert strip(old[k])==strip(new[k]),k
s=new[K];i=L(J/'src/inputs.json')[K];cells=L(J/'src/cells.json')[K]
for f in ['axes','scores','views','jevbench_score','capability','composite_ci95','decision_limit','speed','v16','intelligence','calibration','validity']:assert s[f]==i['v17-share'][f],f
assert s['cost']=={**i['v17-share']['cost'],'kind':'estimate'}=={**old[K]['cost'],'kind':'estimate'}
sd=new['scaledown-classify-1'];supplied=L(J/'src/inputs.json')['scaledown-classify-1']['v17-share']
for f in ['axes','scores','views','jevbench_score','capability','composite_ci95','decision_limit','speed','v16','intelligence','calibration','validity']:assert sd[f]==supplied[f],f
assert {k:v for k,v in sd['cost'].items() if k!='basis'}=={k:v for k,v in supplied['cost'].items() if k!='basis'}
assert L(V/'jevbench-v1.7.3-categories.json')['systems'][K]==cells['cells_share']
assert s['noul_decisive']=={f:cells['noul_share'][f] for f in ['acc_among_decisive','decisive','decisive_rate','n','supported','valid']}
assert s['previous']['endpoint_kind']=='cpu' and s['endpoint_kind']=='gpu' and K not in [r['key'] for r in L(V/'jevbench-v1.7.3-carry.json')['rows']]
d=L(J/'receipts/topfive-diff.json');e=L(J/'receipts/topfive-extended.json')
assert d['lists']==40 and d['changed_labels']==['open/composites/A']
assert e['lists']==252 and e['changed_lists']==28
assert {v:sum(r['changed'] for r in e['rows'] if r['variant']==v) for v in ['frozen','off','share']}=={'frozen':10,'off':10,'share':8}
for name,digest in d['snapshots_sha256'].items():assert sha(J/'receipts'/name)==digest,name
assert (J/'receipts/topfive-after-final.json').read_bytes()==(J/'receipts/topfive-after.json').read_bytes()
if (J/'receipts/REPRO.json').exists():
 r=L(J/'receipts/REPRO.json');assert r['identical']
 for name,digest in r['hashes'].items():assert sha(W/name)==digest,name
subprocess.run(['node',str(J/'validate_v173.mjs'),str(W)],check=True)
print('PASS: 288 carried rows equal; exact GPU numbers/CIs/cells; CPU history; 40 site + 252 variant lists; 28 changes; PENDING hidden')
