// Exact single-slider top-five transition boundaries using the production classifier.
import {readFileSync,writeFileSync} from 'node:fs';
import {jevClassRows,JEV_V16_CLASS_OPTIONS} from '../../lib/jevbench-jev-class.mjs';
import {jevScopeClassifier,jevbenchScopeArtifact} from '../../lib/jevbench-scope.mjs';
const J=new URL('.',import.meta.url).pathname,load=p=>JSON.parse(readFileSync(p));
const V='data/raw/benchmarks/jevbench/v1.7/',before=load(V+'jevbench-v1.7.15-results.json'),after=load(V+'jevbench-v1.7.16-results.json');
const isApi=jevScopeClassifier(before.systems,load(V+'jevbench-v1.7.15-carry.json').rows,[],[]),KEYS=['arcbright-elf-1-12b-r2','decisio-gemma-4-12b-tuned-commit-think','h2o-lightning-4b-v1.4.1','jeff_1_1_large','jeff_1_1_qwen_4b','microsoft-decision-1-r2','strike-1','torchcast-decision-31b-v1.0'];
const states=[];
for(const scope of ['all','open','api'])for(const slider of ['cost','latency'])for(const other of [1,1.01,1.4,1.5,2,Infinity]){
 const pick=a=>(scope==='all'?a:jevbenchScopeArtifact(a,scope,isApi)).systems.filter(s=>s.ranked);
 const b=pick(before),a=pick(after),all=jevClassRows(a,JEV_V16_CLASS_OPTIONS).rows;
 const vals=[1,...all.map(r=>slider==='cost'?r.costRatio:r.latencyRatio).filter(v=>Number.isFinite(v)&&v>=1&&v<=10)].sort((x,y)=>x-y);
 const points=[...new Set(vals),10,Infinity];let previous;
 for(let i=0;i<points.length;i++){
  const x=points[i],opts={...JEV_V16_CLASS_OPTIONS,...(slider==='cost'?{costFactor:x,latencyFactor:other}:{latencyFactor:x,costFactor:other})};
  const order=r=>jevClassRows(r,opts).rows.filter(r=>r.inClass).map(r=>r.row.key),bo=order(b),ao=order(a),top=r=>r.slice(0,5),signature=JSON.stringify([top(bo),top(ao)]);
  if(signature===previous)continue;previous=signature;
  states.push({scope,slider,other_cap:Number.isFinite(other)?other:'none',from:Number.isFinite(x)?x:'none',before:top(bo),after:top(ao),changed:JSON.stringify(top(bo))!==JSON.stringify(top(ao)),entrant_ranks:Object.fromEntries(KEYS.map(K=>[K,ao.indexOf(K)+1||null]))});
 }
}
const result={method:'Production jevClassRows; every cost/median-latency admission breakpoint within the supported 1x-10x slider domain, plus no cap; each slider swept independently with the other at 1x, 1.01x, 1.4x, 1.5x, official 2x and no cap. From boundaries are inclusive, ending at the next state in the same sweep. Not a claim about arbitrary simultaneous slider settings or arbitrary subfilters.',states,changed_states:states.filter(s=>s.changed).length};
writeFileSync(J+'receipts/topfive-sliders.json',JSON.stringify(result,null,1)+'\n');console.log('Slider transitions:',states.length,'states;',result.changed_states,'changed');
