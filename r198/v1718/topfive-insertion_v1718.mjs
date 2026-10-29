import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const J=new URL('.',import.meta.url).pathname,W=path.resolve(J,'../..'),L=p=>JSON.parse(readFileSync(p));
const {jevClassRows,JEV_V16_CLASS_OPTIONS}=await import(W+'/lib/jevbench-jev-class.mjs');
const {jevV15BoardScore}=await import(W+'/lib/jevbench-v15-board.mjs');
const {jevScopeClassifier,jevbenchScopeArtifact}=await import(W+'/lib/jevbench-scope.mjs');
const V=W+'/data/raw/benchmarks/jevbench/v1.7/',before=L(V+'jevbench-v1.7.17-results.json'),newRows=L(J+'candidate-rows.json'),keys=Object.keys(newRows),after={...before,systems:[...before.systems,...Object.values(newRows)]};
const isApi=jevScopeClassifier(before.systems,L(V+'jevbench-v1.7.17-carry.json').rows,[],[]),carriedOff=L(J+'src/carried-off.json');
const off=(s,v)=>keys.includes(s.key)?L(J+'src/inputs.json')[s.key][v==='frozen'?'frozen':'v17-off']:{...s,...(carriedOff[s.key]??s.previous??{})};
const pick=(a,scope,v='share')=>(scope==='all'?a:jevbenchScopeArtifact(a,scope,isApi)).systems.filter(s=>s.ranked).map(s=>v==='share'?s:off(s,v));
const ord=(rs,fn)=>rs.filter(s=>Number.isFinite(fn(s))).slice().sort((a,b)=>fn(b)-fn(a)||(a.ranks?.A??999999)-(b.ranks?.A??999999)).map(s=>s.key);
const ranked=(rs,opts)=>jevClassRows(rs,{...JEV_V16_CLASS_OPTIONS,...opts}).rows.filter(r=>r.inClass).map(r=>r.row.key);
const lists=[];function record(label,b,a){lists.push({label,before:b.slice(0,5),after:a.slice(0,5),changed:JSON.stringify(b.slice(0,5))!==JSON.stringify(a.slice(0,5)),entrant_positions:Object.fromEntries(keys.map(k=>[k,a.indexOf(k)+1||null]))});}
for(const scope of ['all','open','api']){
 const b=pick(before,scope),a=pick(after,scope);
 for(const o of ['A','B','C'])record(scope+'/composites/'+o,ord(b,s=>s.scores[o]),ord(a,s=>s.scores[o]));
 for(const [label,opt]of [['official_caps',{}],['no_caps',{costFactor:Infinity,latencyFactor:Infinity}],['cost_off_latency_2x',{costFactor:Infinity}],['latency_none',{latencyFactor:Infinity}],['cost_7x',{costFactor:7}],['cost_10x',{costFactor:10}],['rank_field',{costFactor:Infinity,latencyFactor:Infinity}],['cost_7x_latency_none',{costFactor:7,latencyFactor:Infinity}],['cost_10x_latency_none',{costFactor:10,latencyFactor:Infinity}]])record(scope+'/capability/'+label,ranked(b,opt),ranked(a,opt));
}
for(const m of ['A','B','C','capability'])record('release/'+m,ord(pick(before,'all'),s=>m==='capability'?s.capability:s.scores[m]),ord(pick(after,'all'),s=>m==='capability'?s.capability:s.scores[m]));
for(const v of ['frozen','off','share'])for(const scope of ['all','open','api'])for(const caps of ['official','none','cost1.4','cost1.5']){
 const p=art=>{let r=pick(art,scope,v);if(caps!=='none'){const allowed=new Set(ranked(r,caps.startsWith('cost')?{costFactor:Number(caps.slice(4))}:{}));r=r.filter(s=>allowed.has(s.key));}return r;};const b=p(before),a=p(after);
 const metrics={A:s=>s.scores.A,B:s=>s.scores.B,C:s=>s.scores.C,capability:s=>s.capability,...Object.fromEntries(['intelligence','calibration','speed','cost'].map(k=>[k,s=>s.axes[k]]))};
 for(const name of Object.keys(a[0].views??{}))metrics['view/'+name]=s=>s.views?.[name];
 metrics['view/Capability only']=s=>jevV15BoardScore(s.axes,{intelligence:50,calibration:50,speed:0,cost:0});metrics['custom/Calibration 100']=s=>jevV15BoardScore(s.axes,{intelligence:0,calibration:100,speed:0,cost:0});
 for(const [m,fn]of Object.entries(metrics))record(v+'/'+scope+'/'+caps+'/'+m,ord(b,fn),ord(a,fn));
}
const states=[];
for(const scope of ['all','open','api'])for(const slider of ['cost','latency'])for(const other of [1,1.01,1.4,1.5,2,Infinity]){
 const b=pick(before,scope),a=pick(after,scope),ratios=jevClassRows(a,JEV_V16_CLASS_OPTIONS).rows.map(r=>slider==='cost'?r.costRatio:r.latencyRatio);
 const points=[...new Set([1,10,...ratios.filter(x=>Number.isFinite(x)&&x>=1&&x<=10)])].sort((a,b)=>a-b);points.push(Infinity);
 for(const x of points){const opt=slider==='cost'?{costFactor:x,latencyFactor:other}:{latencyFactor:x,costFactor:other},bo=ranked(b,opt).slice(0,5),ao=ranked(a,opt).slice(0,5);states.push({scope,slider,other:Number.isFinite(other)?other:'none',from:Number.isFinite(x)?x:'none',before:bo,after:ao,changed:JSON.stringify(bo)!==JSON.stringify(ao)});}
}
const custom=[];for(const weights of [{intelligence:50,calibration:50,speed:0,cost:0},{intelligence:100,calibration:0,speed:0,cost:0},{intelligence:0,calibration:50,speed:10,cost:5},{intelligence:10,calibration:60,speed:0,cost:20}]){
 const fn=s=>jevV15BoardScore(s.axes,weights),b=ord(pick(before,'open'),fn),a=ord(pick(after,'open'),fn);custom.push({weights,before:b.slice(0,5),after:a.slice(0,5),changed:JSON.stringify(b.slice(0,5))!==JSON.stringify(a.slice(0,5))});}
const grid=[];for(const costFactor of [1,1.1,1.2,1.3])for(const latencyFactor of [...Array.from({length:91},(_,i)=>(10+i)/10),Infinity]){const opt={costFactor,latencyFactor},b=ranked(pick(before,'open'),opt).slice(0,5),a=ranked(pick(after,'open'),opt).slice(0,5);grid.push({costFactor,latencyFactor:Number.isFinite(latencyFactor)?latencyFactor:'none',before:b,after:a,changed:JSON.stringify(b)!==JSON.stringify(a)});}
const result={baseline:'v1.7.17',method:'Read-only insertion into published v1.7.17 results; production scope, cap and weighting functions. Preserved predecessor off aggregates for extended frozen/off checks. No assembly/build or scorer run.',lists:lists.length,changed_lists:lists.filter(r=>r.changed),top5_changed:lists.some(r=>r.changed)||states.some(r=>r.changed)||custom.some(r=>r.changed)||grid.some(r=>r.changed),rows:lists,slider_states:states.length,slider_changed:states.filter(r=>r.changed),grid_states:grid.length,grid_changed:grid.filter(r=>r.changed),custom,states,grid};
writeFileSync(J+'topfive-comparison.json',JSON.stringify(result,null,1)+'\n');console.log(JSON.stringify({lists:result.lists,changed:result.changed_lists.length,sliders:states.length,slider_changed:result.slider_changed.length,grid:grid.length,grid_changed:result.grid_changed.length,custom_changed:custom.filter(r=>r.changed).length}));
