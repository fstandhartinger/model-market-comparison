// Supplement the exact v1.7.0 40-list site comparison with capped composites, axes and frozen/off values.
// Off values use preserved previous blocks, plus pinned original off outputs for v1.7.0-new and GPU remeasured rows.
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2]??process.cwd(),J=new URL('.',import.meta.url).pathname;
const imp=p=>import(pathToFileURL(path.join(root,p)));
const {jevClassRows,JEV_V16_CLASS_OPTIONS}=await imp('lib/jevbench-jev-class.mjs');
const {jevScopeClassifier}=await imp('lib/jevbench-scope.mjs');
const load=p=>JSON.parse(readFileSync(p));
const data=path.join(root,'data/raw/benchmarks/jevbench/v1.7');
const before=load(path.join(data,'jevbench-v1.7.0-results.json'));
const after=load(path.join(data,'jevbench-v1.7.1-results.json'));
const inputs=load(path.join(J,'src/inputs.json'));
const carriedOff=load(path.join(J,'src/carried-off.json'));
const isApi=jevScopeClassifier(before.systems,load(path.join(data,'jevbench-v1.7.0-carry.json')).rows,[],[]);
const off=s=>{
 if(inputs[s.key])return {...s,...inputs[s.key]['v17-off']};
 if(carriedOff[s.key])return {...s,...carriedOff[s.key]};
 if(!s.previous?.axes)return s;
 const v={...s};for(const f of ['axes','scores','views','jevbench_score','capability','speed'])if(s.previous[f]!=null)v[f]=s.previous[f];return v;
};
const rows=[];
for(const variant of ['share','off'])for(const scope of ['all','open','api'])for(const caps of ['official','none']) {
 const pick=art=>{
  let r=art.systems.filter(s=>s.ranked).map(s=>variant==='off'?off(s):s).filter(s=>scope==='all'||(scope==='api'?isApi(s):!isApi(s)));
  if(caps==='official')r=jevClassRows(r,JEV_V16_CLASS_OPTIONS).rows.filter(s=>s.inClass).map(s=>s.row);
  return r;
 };
 const b=pick(before),a=pick(after);
 const metrics={A:s=>s.scores.A,B:s=>s.scores.B,C:s=>s.scores.C,capability:s=>s.capability,intelligence:s=>s.axes.intelligence,calibration:s=>s.axes.calibration,speed:s=>s.axes.speed,cost:s=>s.axes.cost};
 // All published frozen scorer weighting presets, in addition to the A/B/C composites.
 for(const view of Object.keys(a[0].views??{}))metrics['view/'+view]=s=>s.views?.[view];
 for(const [metric,val]of Object.entries(metrics)){
  const ord=r=>r.filter(s=>Number.isFinite(val(s))).slice().sort((a,b)=>val(b)-val(a)||(a.ranks?.A??999999)-(b.ranks?.A??999999)).map(s=>s.key).slice(0,5);
  const x=ord(b),y=ord(a);rows.push({variant,scope,caps,metric,before:x,after:y,changed:JSON.stringify(x)!==JSON.stringify(y)});
 }
}
const result={method:'Insertion comparison using preserved off values, pinned off outputs for the v1.7.0-new/GPU rows and already-scored new off/share values; no scoring or inference performed. The authoritative site assembly comparison is topfive-diff.json.',lists:rows.length,changed_lists:rows.filter(r=>r.changed).length,changed_labels:rows.filter(r=>r.changed).map(r=>`${r.variant}/${r.scope}/${r.caps}/${r.metric}`),rows};
writeFileSync(path.join(J,'receipts/topfive-extended.json'),JSON.stringify(result,null,1)+'\n');
console.log('Extended off/share, scopes, caps, composites, axes and weighted views:',result.lists,'lists;',result.changed_lists,'changed');
