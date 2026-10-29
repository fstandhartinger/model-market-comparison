import {readFileSync,writeFileSync} from 'node:fs';
import {jevComposite} from '../../lib/jevbench-cohort-merge.mjs';
import {jevV15BoardScore} from '../../lib/jevbench-v15-board.mjs';
const J=new URL('.',import.meta.url).pathname,load=p=>JSON.parse(readFileSync(p));
const a=load(J+'inputs/candidate-unscored.json'),rest=load(J+'receipts/restatement.json').rows;
const sorts={'Intelligence only':[1,0,0,0],'Emphasis on Accuracy 60:20:20':[.6,0,.2,.2],'Emphasis on Speed 20:60:20':[.2,0,.6,.2],'Emphasis on Cost 20:20:60':[.2,0,.2,.6],'Balanced 33:33:33':[1/3,0,1/3,1/3]};
for(const s of a.systems){
 if(!rest[s.key]||rest[s.key].new_cost===rest[s.key].old_cost)continue;
 s.axes.cost=Math.min(100,Math.max(0,100-30*Math.log10(s.cost.usd_per_1000/.001)));
 for(const [k,o]of Object.entries(a.options))s.scores[k]=jevComposite(s.axes,o.weights,o.intelligence_floor);
 for(const k of Object.keys(s.views??{}))if(sorts[k])s.views[k]=jevV15BoardScore(s.axes,Object.fromEntries(['intelligence','calibration','speed','cost'].map((v,i)=>[v,sorts[k][i]])));
 s.jevbench_score=s.scores[a.headline];
}
for(const o of Object.keys(a.board)){
 const rows=a.systems.filter(s=>s.ranked&&Number.isFinite(s.scores?.[o])).sort((x,y)=>y.scores[o]-x.scores[o]||x.key.localeCompare(y.key));
 a.board[o].order=rows.map(s=>s.key);
 for(const s of a.systems)if(s.ranks&&o in s.ranks)s.ranks[o]=s.ranked?(a.board[o].order.indexOf(s.key)+1||null):null;
}
for(const s of a.systems)s.rank=s.ranked?(s.ranks?.[a.headline]??null):null;
a.n_ranked=a.systems.filter(s=>s.ranked).length;
writeFileSync(J+'inputs/candidate-scored.json',JSON.stringify(a,null,1)+'\n');
console.log('Cost axes, composites, weighting presets and composite ranks recomputed with site score functions.');
