// Supplement the exact v1.7.23 40-list site comparison with capped composites, axes and frozen/off values.
// Off values use preserved previous blocks (src/carried-off.json, copied from v1.7.22; numerically identical to v1.7.23), plus the already-scored off outputs of the carried rows.
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2]??process.cwd(),J=new URL('.',import.meta.url).pathname;
const imp=p=>import(pathToFileURL(path.join(root,p)));
const {jevClassRows,JEV_V16_CLASS_OPTIONS}=await imp('lib/jevbench-jev-class.mjs');
const {jevComposite}=await imp('lib/jevbench-cohort-merge.mjs');
const {jevV15BoardScore}=await imp('lib/jevbench-v15-board.mjs');
const {jevScopeClassifier,jevbenchScopeArtifact}=await imp('lib/jevbench-scope.mjs');
const load=p=>JSON.parse(readFileSync(p));
const data=path.join(root,'data/raw/benchmarks/jevbench/v1.7');
const before=load(path.join(data,'jevbench-v1.7.23-results.json'));
const after=load(path.join(root,'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.0-results.json'));
const inputs=load(path.join(J,'src/inputs.json'));
const carriedOff=load(path.join(J,'src/carried-off.json'));
const isApi=jevScopeClassifier(before.systems,load(path.join(data,'jevbench-v1.7.23-carry.json')).rows,[],[]);
const oldOff=(s,variant,isAfter)=>{
 if(isAfter&&inputs[s.key])return {...s,...inputs[s.key][variant==='frozen'?'frozen':'v17-off']};
 if(carriedOff[s.key])return {...s,...carriedOff[s.key]};
 if(!s.previous?.axes)return s;
 const v={...s};for(const f of ['axes','scores','views','jevbench_score','capability','speed'])if(s.previous[f]!=null)v[f]=s.previous[f];return v;
};
const off=(s,variant,isAfter)=>{
 const r=oldOff(s,variant,isAfter);if(!isAfter)return r;
 const current=after.systems.find(x=>x.key===s.key);if(current.cost.usd_per_1000===before.systems.find(x=>x.key===s.key).cost.usd_per_1000)return r;
 const axes={...r.axes,cost:current.axes.cost};
 const score=w=>jevV15BoardScore(axes,w);
 const scores={A:score({intelligence:25,calibration:25,speed:25,cost:25}),B:score({intelligence:40,calibration:20,speed:20,cost:20})};
 scores.C=jevComposite(axes,{intelligence:25,calibration:25,speed:25,cost:25},60);
 const presets={'Intelligence only':[1,0,0,0],'Emphasis on Accuracy 60:20:20':[.6,0,.2,.2],'Emphasis on Speed 20:60:20':[.2,0,.6,.2],'Emphasis on Cost 20:20:60':[.2,0,.2,.6],'Balanced 33:33:33':[1/3,0,1/3,1/3]};
 const views=Object.fromEntries(Object.entries(presets).map(([n,w])=>[n,score(Object.fromEntries(['intelligence','calibration','speed','cost'].map((k,i)=>[k,w[i]])))]));
 return {...r,axes,scores,views,cost:current.cost,jevbench_score:scores.A};
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
