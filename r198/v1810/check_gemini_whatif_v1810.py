"""Gate: the added row's ranks in the built artifact equal the release owner's what-if (r277/gemini/WHATIF-GEMINI.json, sha 0342c2ab) in every list
it reports (all-systems, open-weights and API boards: Composite A/B/C, Capability with the official caps, plain Capability) for the point offset and every
CI / leave-one-out scenario both files share; the equated axes and composites agree to 1e-9. STOP (exit 1) on any mismatch."""
import json,pathlib,hashlib
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];L=lambda p:json.loads(pathlib.Path(p).read_text())
WG=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r277/gemini/WHATIF-GEMINI.json');assert hashlib.sha256(WG.read_bytes()).hexdigest()=='0342c2abc9e8630b10f05d9e410678bbe070e9572d044e30e08ec43d7ad81272'
GK='gemini-decision-1';wg=L(WG);wi=L(J/'receipts/WHATIF.json')['rows'][GK]['scenarios'];res=L(W/'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.10-results.json');s=next(x for x in res['systems'] if x['key']==GK)
mism=[];checked=0
for name,sc in wg['scenarios'].items():
 if name=='as_measured':continue
 mine=wi[name]
 for v,ls in sc['lists'].items():
  for m,x in ls.items():
   checked+=1
   if mine['ranks'][v][m]!=x['rank']:mism.append((name,v,m,mine['ranks'][v][m],x['rank']))
 for ax in ['intelligence','calibration']:
  if abs(mine[ax]-sc['axes'][ax])>1e-9:mism.append((name,ax,mine[ax],sc['axes'][ax]))
 for o in 'ABC':
  if abs(mine['composite'][o]-sc['composite'][o])>1e-9:mism.append((name,o,mine['composite'][o],sc['composite'][o]))
p=wg['scenarios']['point']
for ax in ['intelligence','calibration','speed','cost']:assert abs(s['axes'][ax]-p['axes'][ax])<1e-9,ax
assert all(abs(s['scores'][o]-p['composite'][o])<1e-9 for o in 'ABC') and abs(s['capability']-p['capability'])<1e-9
assert {'A':s['ranks']['A'],'B':s['ranks']['B'],'C':s['ranks']['C'],'capability':s['ranks']['capability']}=={'A':p['lists']['all']['A']['rank'],'B':p['lists']['all']['B']['rank'],'C':p['lists']['all']['C']['rank'],'capability':p['lists']['all']['capability']['rank']}
pt={v:{m:x['rank'] for m,x in ls.items()} for v,ls in p['lists'].items()};sizes={v:{m:x['size'] for m,x in ls.items()} for v,ls in p['lists'].items()}
rec={'status':'PASS' if not mism else 'FAIL','whatif_sha256':'0342c2abc9e8630b10f05d9e410678bbe070e9572d044e30e08ec43d7ad81272','scenarios_compared':[n for n in wg['scenarios'] if n!='as_measured'],'list_ranks_compared':checked,'mismatches':mism,
 'point_ranks':pt,'point_list_sizes':sizes,'point_equated':{'axes':p['axes'],'composite':p['composite'],'capability':p['capability']},'artifact_ranks':s['ranks']}
(J/'receipts/GEMINI-WHATIF-MATCH.json').write_text(json.dumps(rec,indent=1,sort_keys=True)+'\n')
assert not mism,('STOP: added-row ranks differ from WHATIF-GEMINI.json',mism[:10])
print('PASS gemini what-if match:',checked,'list ranks over',len(rec['scenarios_compared']),'scenarios; point API A',pt['api']['A'],'of',sizes['api']['A'],'| Capability caps',pt['api']['capability_caps'],'of',sizes['api']['capability_caps'],'| all A',pt['all']['A'],'of',sizes['all']['A'])
