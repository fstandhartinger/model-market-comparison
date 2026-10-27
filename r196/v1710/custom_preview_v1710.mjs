// Specific custom-weight and slider settings from prescore, recomputed against live v1.7.9.
import {readFileSync,writeFileSync} from 'node:fs';
import {jevV15BoardScore} from '../../lib/jevbench-v15-board.mjs';
import {jevClassRows,JEV_V16_CLASS_OPTIONS} from '../../lib/jevbench-jev-class.mjs';
import {jevScopeClassifier,jevbenchScopeArtifact} from '../../lib/jevbench-scope.mjs';
const J=new URL('.',import.meta.url).pathname,V='data/raw/benchmarks/jevbench/v1.7/',load=p=>JSON.parse(readFileSync(p));
const before=load(V+'jevbench-v1.7.9-results.json'),after=load(V+'jevbench-v1.7.10-results.json'),K='phillylabs_philly_decider_v2';
const isApi=jevScopeClassifier(before.systems,load(V+'jevbench-v1.7.9-carry.json').rows,[],[]),pick=a=>jevbenchScopeArtifact(a,'open',isApi).systems.filter(s=>s.ranked),weights={intelligence:50,calibration:50,speed:0,cost:0};
const order=a=>pick(a).map(s=>({key:s.key,score:jevV15BoardScore(s.axes,weights)})).sort((a,b)=>b.score-a.score).map((s,i)=>({...s,rank:i+1}));
const full_before=order(before),full_after=order(after),top=x=>x.slice(0,5).map(s=>s.key);
const row={variant:'share',scope:'open',caps:'none',metric:'custom/Capability only',weights,full_before,full_after,before:top(full_before),after:top(full_after),changed:JSON.stringify(top(full_before))!==JSON.stringify(top(full_after))};
const weights3={intelligence:100,calibration:0,speed:0,cost:0};
const order3=a=>pick(a).map(s=>({key:s.key,score:jevV15BoardScore(s.axes,weights3)})).sort((a,b)=>b.score-a.score).map((s,i)=>({...s,rank:i+1}));
const b3=order3(before),a3=order3(after),row3={variant:'share',scope:'open',caps:'none',metric:'custom/Intelligence only',weights:weights3,full_before:b3,full_after:a3,before:top(b3),after:top(a3),changed:JSON.stringify(top(b3))!==JSON.stringify(top(a3))};
// Preserve both predecessor custom presets in addition to the entrant-specific presets.
const legacy=[['custom/I0 Calibration50 Speed10 Cost5',{intelligence:0,calibration:50,speed:10,cost:5}],['custom/I10 Calibration60 Speed0 Cost20',{intelligence:10,calibration:60,speed:0,cost:20}]].map(([metric,weights])=>{
 const order=a=>pick(a).map(s=>({key:s.key,score:jevV15BoardScore(s.axes,weights)})).sort((a,b)=>b.score-a.score).map((s,i)=>({...s,rank:i+1}));
 const full_before=order(before),full_after=order(after);return {variant:'share',scope:'open',caps:'none',metric,weights,full_before,full_after,before:top(full_before),after:top(full_after),changed:JSON.stringify(top(full_before))!==JSON.stringify(top(full_after))};
});
const grid=[];
for(const costFactor of [1,1.1,1.2,1.3])for(const latencyFactor of [...Array.from({length:91},(_,i)=>(10+i)/10),Infinity]){
 const rank=a=>jevClassRows(pick(a),{...JEV_V16_CLASS_OPTIONS,costFactor,latencyFactor}).rows.filter(r=>r.inClass).map(r=>r.row.key);
 const b=rank(before),a=rank(after),pos=a.indexOf(K)+1;
 grid.push({cost:costFactor,latency:Number.isFinite(latencyFactor)?latencyFactor:'none',before:b.slice(0,5),after:a.slice(0,5),rank:pos,changed:JSON.stringify(b.slice(0,5))!==JSON.stringify(a.slice(0,5))});
}
writeFileSync(J+'receipts/topfive-custom.json',JSON.stringify({status:'PASS',weights,rows:[row,row3,...legacy],slider_grid:grid,slider_grid_states:grid.length,slider_grid_changed:grid.filter(s=>s.changed).length,method:'Production jevV15BoardScore and jevClassRows; specific custom-weight example and all 368 cost/latency grid settings from prescore checked against carried live v1.7.9 rows.'},null,1)+'\n');
console.log('Custom weighting and slider grid:',grid.length,'states;',grid.filter(s=>s.changed).length,'changed');
