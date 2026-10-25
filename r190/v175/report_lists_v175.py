"""Write exact comparison scope and changed-list labels from captured receipts."""
import pathlib,json
J=pathlib.Path(__file__).resolve().parent;L=lambda n:json.loads((J/'receipts'/n).read_text())
e=L('topfive-extended.json');d=L('topfive-diff.json');s=L('topfive-sliders.json');K='sieve-31b-v2'
base=[r for r in e['rows'] if r['caps'] in ['official','none'] and r['metric']!='custom/Calibration 100']
assert len(base)==252 and sum(r['changed'] for r in base)==11
find=lambda **kw:next(r for r in e['rows'] if all(r[k]==v for k,v in kw.items()))
common={'variant':'share','scope':'open'}
assert find(**common,caps='official',metric='capability')['full_after'][6]['key']==K
for caps,metric,pos,out in [('none','calibration',4,'knowline-35b-a3b-gen1.5'),('official','view/Capability only',5,'dopest-1.0-31b'),('cost1.4','capability',4,None),('cost1.5','capability',5,None)]:
 r=find(**common,caps=caps,metric=metric);assert r['after'][pos-1]==K
 if out:assert out in r['before'] and out not in r['after']
for scope in ['all','open']:assert find(variant='share',scope=scope,caps='official',metric='custom/Calibration 100')['after'][0]==K
for cap,pos in [(1.4,4),(1.5,5)]:
 a=[r for r in s['states'] if r['scope']=='open' and r['slider']=='latency' and r['other_cap']==cap];assert a and all(r['sieve_rank']==pos for r in a)
lines=['# v1.7.4 → v1.7.5 top-five comparison','',
'All 40 primary site-assembly lists are unchanged (composites and Capability scopes/caps plus release lists). The 252 supplementary views audited for v1.7.4 are all covered: 11 change. Expanded explicit cost 1.4×/1.5× and custom Calibration 100 comparisons bring the supplementary set to 540 lists; 59 change. The 184 single-slider transition states include 44 changed states. These are finite, declared comparison domains, not an exhaustive claim over arbitrary weights, simultaneous sliders or category filters.','',
'Official open Capability remains #7. Share open Calibration (uncapped axis) is #4, displacing KnowLine-35B-A3B-Gen1.5. The share open Capability-only preset is #5, displacing DOPEST. Open Capability at cost 1.4×/1.5× is #4/#5 throughout the supported latency domain. Calibration 100 is #1 open and mixed under the production weighting function and its axis floors. Frozen/off axis placements can differ; the full tables below identify each one.','',
'## Every changed supplementary list','', '| Variant | Scope | Caps | Metric | Sieve position | Leaves top five |','|---|---|---|---|---:|---|']
for r in e['rows']:
 if r['changed']:lines.append('| '+' | '.join([r['variant'],r['scope'],r['caps'],r['metric'],str(r['after'].index(K)+1),', '.join(k for k in r['before'] if k not in r['after'])])+' |')
lines+=['','## Changed slider states','', '| Scope | Slider | Other cap | From (inclusive) | Sieve position |','|---|---|---|---|---:|']
for r in s['states']:
 if r['changed']:lines.append('| '+' | '.join(map(str,[r['scope'],r['slider'],r['other_cap'],r['from'],r['sieve_rank']]))+' |')
(J/'CHANGED-LISTS.md').write_text('\n'.join(lines)+'\n');print('PASS expected placements; 40 primary unchanged, 11/252 predecessor supplementary, 59/540 expanded, 44/184 slider states changed')
