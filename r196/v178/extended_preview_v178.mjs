// Supplement the exact v1.7.7 40-list site comparison with capped composites, axes and frozen/off values.
// Off values use preserved previous blocks, plus pinned original off outputs for v1.7.7-new and GPU remeasured rows.
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2]??process.cwd(),J=new URL('.',import.meta.url).pathname;
const imp=p=>import(pathToFileURL(path.join(root,p)));
const {jevClassRows,JEV_V16_CLASS_OPTIONS}=await imp('lib/jevbench-jev-class.mjs');
const {jevV15BoardScore}=await imp('lib/jevbench-v15-board.mjs');
const {jevScopeClassifier,jevbenchScopeArtifact}=await imp('lib/jevbench-scope.mjs');
const load=p=>JSON.parse(readFileSync(p));
const data=path.join(root,'data/raw/benchmarks/jevbench/v1.7');
const before=load(path.join(data,'jevbench-v1.7.7-results.json'));
const after=load(path.join(data,'jevbench-v1.7.8-results.json'));
const inputs=load(path.join(J,'src/inputs.json'));
const carriedOff=load(path.join(J,'src/carried-off.json'));
const isApi=jevScopeClassifier(before.systems,load(path.join(data,'jevbench-v1.7.7-carry.json')).rows,[],[]);
const off=(s,variant,isAfter)=>{
 if(isAfter&&inputs[s.key])return {...s,...inputs[s.key][variant==='frozen'?'frozen':'v17-off']};
 if(carriedOff[s.key])return {...s,...carriedOff[s.key]};
 if(!s.previous?.axes)return s;
 const v={...s};for(const f of ['axes','scores','views','jevbench_score','capability','speed'])if(s.previous[f]!=null)v[f]=s.previous[f];return v;
};
const rows=[];
for(const variant of ['frozen','off','share'])for(const scope of ['all','open','api'])for(const caps of ['official','none','cost1.4','cost1.5']) {
 const pick=(art,isAfter)=>{
  let r=(scope==='all'?art:jevbenchScopeArtifact(art,scope,isApi)).systems.filter(s=>s.ranked).map(s=>variant==='share'?s:off(s,variant,isAfter));
  if(caps!=='none')r=jevClassRows(r,{...JEV_V16_CLASS_OPTIONS,...(caps.startsWith('cost')?{costFactor:Number(caps.slice(4))}:{})}).rows.filter(s=>s.inClass).map(s=>s.row);
  return r;
 };
 const b=pick(before,false),a=pick(after,true);
 const metrics={A:s=>s.scores.A,B:s=>s.scores.B,C:s=>s.scores.C,capability:s=>s.capability,intelligence:s=>s.axes.intelligence,calibration:s=>s.axes.calibration,speed:s=>s.axes.speed,cost:s=>s.axes.cost};
 // All published frozen scorer weighting presets, in addition to the A/B/C composites.
 for(const view of Object.keys(a[0].views??{}))metrics['view/'+view]=s=>s.views?.[view];
 metrics['view/Capability only']=s=>jevV15BoardScore(s.axes,{intelligence:50,calibration:50,speed:0,cost:0});
 metrics['custom/Calibration 100']=s=>jevV15BoardScore(s.axes,{intelligence:0,calibration:100,speed:0,cost:0});
 for(const [metric,val]of Object.entries(metrics)){
  const ord=r=>r.filter(s=>Number.isFinite(val(s))).slice().sort((a,b)=>val(b)-val(a)||(a.ranks?.A??999999)-(b.ranks?.A??999999)).map((s,i)=>({rank:i+1,key:s.key,score:val(s)}));
  const keys=r=>r.slice(0,5).map(s=>s.key);
  const full_before=ord(b),full_after=ord(a),x=keys(full_before),y=keys(full_after);rows.push({variant,scope,caps,metric,before:x,after:y,full_before,full_after,changed:JSON.stringify(x)!==JSON.stringify(y)});
 }
}
const models=Object.fromEntries(['frozen','off','share'].map(variant=>[variant,Object.fromEntries([['before',before],['after',after]].map(([side,art])=>[side,Object.fromEntries(art.systems.map(s=>{const r=variant==='share'?s:off(s,variant,side==='after');return [s.key,{display:s.display,axes:r.axes}]}))]))]));
const result={models,method:'Insertion comparison using site jevV15BoardScore for Capability-only weighting and preserved off values, pinned predecessor off outputs for its new/GPU rows and already-scored new off/share values; no scoring or inference performed. The authoritative site assembly comparison is topfive-diff.json.',lists:rows.length,changed_lists:rows.filter(r=>r.changed).length,changed_labels:rows.filter(r=>r.changed).map(r=>`${r.variant}/${r.scope}/${r.caps}/${r.metric}`),rows};
writeFileSync(path.join(J,'receipts/topfive-extended.json'),JSON.stringify(result,null,1)+'\n');
console.log('Extended frozen/off/share, scopes, caps, composites, axes and weighted views:',result.lists,'lists;',result.changed_lists,'changed');
