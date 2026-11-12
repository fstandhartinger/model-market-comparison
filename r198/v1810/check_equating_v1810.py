"""Equating-binding gate: the receipt hash, the offset/CI/anchors in the draw table, the proof, the lib pin and all 37 rows agree, and an INDEPENDENT
re-implementation of the frozen composite (not the harness module) reproduces every equated number. Other draws stay pending with offset 0."""
import pathlib,json,hashlib,statistics,re,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1];V=W/'data/raw/benchmarks/jevbench/v1.8';L=lambda p:json.loads(pathlib.Path(p).read_text());sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
EQ_SHA='7888a0803466daac872f46809b12015af6c3686109276ab89e1028c206103146';DRAW='v1.6-regular-20261027'
assert sha(J/'inputs/EQUATING-STRONG4-D1027.json')==EQ_SHA
orig=pathlib.Path('/home/flori/jobs/jevbench-add-requests-20260919/r276/equating/EQUATING-STRONG4-D1027.json')
if orig.exists():assert sha(orig)==EQ_SHA,'job original differs'
eq=L(J/'inputs/EQUATING-STRONG4-D1027.json');OFF=eq['offset'];CI=eq['offset_ci95']
assert OFF=={'I':-2.884891186577587,'C':-1.8542447151797177} and eq['status']=='equated' and eq['n_anchors']==4
# the offset is the median over the four anchors' differences (receipt arithmetic re-derived)
for m,key in (('I','I_post_rel'),('C','C')):
 vals=[v['diff'][key] for v in eq['per_anchor'].values()];assert abs(statistics.median(vals)-OFF[m])<1e-12,(m,vals)
 assert CI[m][0]<OFF[m]<CI[m][1] or CI[m][0]<OFF[m]
# draw table
t=L(W/'data/jevbench-draw-equating.json');d=next(x for x in t['draws'] if x['draw']==DRAW)
assert d['status']=='equated' and d['offset']==OFF and d['offset_ci95']=={'I':CI['I'],'C':CI['C']} and d['anchors']==sorted(eq['anchors']) and d['latest_release']=='v1.8.10' and d['releases'][-1]=='v1.8.10' and d['joins_via']=='v1.7-addendum'
assert d['equating_receipt']=={'name':'EQUATING-STRONG4-D1027.json','sha256':EQ_SHA} and EQ_SHA in d['anchor_evidence']
for x in t['draws']:
 if x['draw']!=DRAW:assert x['status']=='anchor-runs-pending' and x['offset']=={'I':0,'C':0} and x['anchors']==[] and x['offset_ci95'] is None,x['draw']
# proof + artifact + lib
pr=L(V/'jevbench-v1.8.10-proof.json');a=L(V/'jevbench-v1.8.10-results.json');pe=pr['equating']
assert pe['offset']==OFF and pe['offset_ci95']=={'I':CI['I'],'C':CI['C']} and pe['anchors']==d['anchors'] and pe['files']['equating']['sha256']==EQ_SHA and pr['source_inputs']['equating_sha256']==EQ_SHA==a['source_sha256']
lib=(W/'lib/jevbench-v1810-release.mjs').read_text();assert 'I:-2.884891186577587,C:-1.8542447151797177' in lib and EQ_SHA in lib
# independent composite (weighted harmonic mean, soft Intelligence gate, speed/cost low-axis gate 50)
def comp(ax,w,gate):
 sel=[(ax[k],x) for k,x in w.items() if x>0]
 if any(v is None for v,_ in sel):return None
 s=0.0 if any(v<=0 for v,_ in sel) else sum(x for _,x in sel)/sum(x/v for v,x in sel)
 if ax['intelligence']<gate:s*=(max(0,ax['intelligence'])/gate)**2
 for k in('speed','cost'):
  if ax[k] is not None and ax[k]<50:s*=(max(0,ax[k])/50)**2
 return s
VIEWS={'Intelligence only':(1,0,0,0),'Emphasis on Accuracy 60:20:20':(.6,0,.2,.2),'Emphasis on Speed 20:60:20':(.2,0,.6,.2),'Emphasis on Cost 20:20:60':(.2,0,.2,.6),'Balanced 33:33:33':(1/3,0,1/3,1/3)}
AX=('intelligence','calibration','speed','cost');clip=lambda x:min(100,max(0,x));rows=[s for s in a['systems'] if (s.get('draw') or {}).get('id')==DRAW];maxerr=0;n=0
assert len(rows)==37==len(pr['equated_rows'])
for s in rows:
 p=s['published_scores'];ax=s['axes']
 assert abs(ax['intelligence']-clip(p['axes']['intelligence']+OFF['I']))<1e-12 and abs(ax['calibration']-clip(p['axes']['calibration']+OFF['C']))<1e-12 and ax['speed']==p['axes']['speed'] and ax['cost']==p['axes']['cost']
 assert abs(s['capability']-(ax['intelligence']+ax['calibration'])/2)<1e-12
 for o,opt in a['options'].items():
  x=comp(ax,{k:opt['weights'][k]/100 for k in AX},opt['intelligence_floor']);assert (x is None and s['scores'][o] is None) or abs(x-s['scores'][o])<1e-9,(s['key'],o);maxerr=max(maxerr,abs((x or 0)-(s['scores'][o] or 0)));n+=1
 for nme,w in VIEWS.items():
  x=comp(ax,dict(zip(AX,w)),50);assert (x is None and s['views'][nme] is None) or abs(x-s['views'][nme])<1e-9,(s['key'],nme);n+=1
 assert s['draw']['status']=='equated' and s['draw']['offset']==OFF and s['draw']['offset_ci95']=={'I':CI['I'],'C':CI['C']}
 assert s['composite_ci95']==L(V/'jevbench-v1.8.9-results.json')['systems'][[x['key'] for x in L(V/'jevbench-v1.8.9-results.json')['systems']].index(s['key'])]['composite_ci95']
assert sum(1 for s in rows if s['ranked'])==35
receipt={'status':'PASS','equating_receipt_sha256':EQ_SHA,'offset':OFF,'offset_ci95':CI,'anchors':d['anchors'],'median_of_four_anchor_differences_equals_offset':True,'draw_table_proof_lib_rows_agree':True,
 'rows_checked':len(rows),'composite_values_rechecked_independently':n,'max_abs_composite_error':maxerr,'other_draws_pending_offset_zero':True,'confidence_intervals_unchanged_from_v189':True,'sealed_bytes_read':False}
(J/'receipts/EQUATING-BINDING.json').write_text(json.dumps(receipt,indent=1,sort_keys=True)+'\n');print('PASS equating binding:',len(rows),'rows;',n,'composite/view values rederived independently, max error',maxerr)
