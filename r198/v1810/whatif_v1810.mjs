// WHATIF: for every row of the 27 Oct draw, its equated Intelligence/Calibration/Capability/composites and its ranks in the primary lists
// (all-systems and open-weights boards: Composite A/B/C, Capability with the official caps, plain Capability; API board A/B/C) at the offset point,
// at the CI ends (Intelligence and Calibration separately and jointly) and at each leave-one-out offset. Uses the production helpers
// (jevComposite, jevClassRows, jevScopeClassifier/jevbenchScopeArtifact/jevLiveAllArtifact) on the v1.8.10 artifact; the point scenario is
// asserted equal to the site assembly in receipts/topfive-after.json. Aggregates only.
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2]??process.cwd(),out=process.argv[3]??path.join(root,'r198/v1810/receipts/WHATIF.json');process.chdir(root);
const imp=p=>import(pathToFileURL(path.join(root,p)));
const {jevComposite,jevLiveAllArtifact}=await imp('lib/jevbench-cohort-merge.mjs');
const {jevClassRows,JEV_V16_CLASS_OPTIONS}=await imp('lib/jevbench-jev-class.mjs');
const {jevScopeClassifier,jevbenchScopeArtifact}=await imp('lib/jevbench-scope.mjs');
const load=p=>JSON.parse(readFileSync(p));
const V='data/raw/benchmarks/jevbench/v1.8/',a=load(V+'jevbench-v1.8.10-results.json'),before=load(V+'jevbench-v1.8.9-results.json'),proof=load(V+'jevbench-v1.8.10-proof.json');
const J=path.join(root,'r198/v1810/'),topfive=load(J+'receipts/topfive-after.json').full_rankings;
const eq=proof.equating,DRAW=Object.keys(proof.equated_rows).sort(),RANKED=new Set(proof.ranked_rows);
const isApi=jevScopeClassifier(before.systems,load(V+'jevbench-v1.8.9-carry.json').rows,[],[]);
const AX=['intelligence','calibration','speed','cost'],clip=x=>Math.min(100,Math.max(0,x));
const scen={point:eq.offset,I_ci_low:{I:eq.offset_ci95.I[0],C:eq.offset.C},I_ci_high:{I:eq.offset_ci95.I[1],C:eq.offset.C},C_ci_low:{I:eq.offset.I,C:eq.offset_ci95.C[0]},C_ci_high:{I:eq.offset.I,C:eq.offset_ci95.C[1]},
 joint_ci_low:{I:eq.offset_ci95.I[0],C:eq.offset_ci95.C[0]},joint_ci_high:{I:eq.offset_ci95.I[1],C:eq.offset_ci95.C[1]}};
for(const [k,v] of Object.entries(eq.sensitivity_leave_one_out))scen['leave_out_'+k]={I:v.I,C:v.C};
const equate=(s,off)=>{const p=s.published_scores,axes={...p.axes,intelligence:clip(p.axes.intelligence+off.I),calibration:clip(p.axes.calibration+off.C)};
 const scores=Object.fromEntries(Object.entries(a.options).map(([o,{weights,intelligence_floor}])=>[o,jevComposite(axes,Object.fromEntries(AX.map(x=>[x,weights[x]/100])),intelligence_floor)]));
 return {...s,axes,scores,jevbench_score:scores.A,capability:(axes.intelligence+axes.calibration)/2};};
function field(off){
 const systems=a.systems.map(s=>DRAW.includes(s.key)?equate(s,off):s);
 const by=new Map(systems.map(s=>[s.key,s])),pos=Object.fromEntries(['A','B','C','capability'].map(m=>[m,new Map(a.board[m].order.map((k,i)=>[k,i]))]));
 const board={...a.board};
 for(const m of ['A','B','C','capability']){const v=k=>m==='capability'?by.get(k).capability:by.get(k).scores[m];board[m]={...a.board[m],order:[...a.board[m].order].sort((x,y)=>v(y)-v(x)||pos[m].get(x)-pos[m].get(y))};}
 const ranked=systems.map(s=>s.ranked?{...s,ranks:Object.fromEntries(['A','B','C','capability'].map(m=>[m,board[m].order.indexOf(s.key)+1]))}:s);
 ranked.forEach(s=>{if(s.ranked)s.rank=s.ranks.A});
 return {...a,systems:ranked,board};
}
const lists=art=>{
 const rk=art.systems.filter(s=>s.ranked),by=new Map(art.systems.map(s=>[s.key,s])),r={};
 for(const o of ['A','B','C'])r[o]=art.board[o].order.filter(k=>by.get(k)?.ranked);
 r.capability_caps=jevClassRows(rk,JEV_V16_CLASS_OPTIONS).rows.filter(x=>x.inClass).map(x=>x.row.key);
 r.capability=rk.slice().sort((x,y)=>y.capability-x.capability||x.ranks.capability-y.ranks.capability).map(s=>s.key);
 return r;
};
const result={method:'Offset what-if on the v1.8.10 artifact: the 35 ranked rows of the 27 Oct draw are re-derived as published + offset (clipped) with the frozen composite (jevComposite); every other row is unchanged; lists are re-sorted (stable) and scoped with the production helpers. Ranks are 1-based positions in the named list of the named board. capability_caps = Capability class list with the official cost/latency caps. Row ranks in the two unranked rows are null.',
 board_sizes:{},offset_point:eq.offset,offset_ci95:eq.offset_ci95,scenarios:Object.fromEntries(Object.entries(scen).map(([k,v])=>[k,v])),offsets_source:'r198/v1810/inputs/EQUATING-STRONG4-D1027.json (sha256 '+eq.files.equating.sha256+')',rows:{},top_fives:{}};
for(const k of DRAW)result.rows[k]={display:a.systems.find(s=>s.key===k).display,ranked:RANKED.has(k),published:a.systems.find(s=>s.key===k).published_scores,scenarios:{}};
let first=true;
for(const [name,off] of Object.entries(scen)){
 const art=field(off),views={all:jevLiveAllArtifact(art,isApi),open:jevbenchScopeArtifact(art,'open',isApi),api:jevbenchScopeArtifact(art,'api',isApi)};
 const L={};for(const [v,x] of Object.entries(views))L[v]=lists(x);
 if(name==='point'){ // the point scenario equals the site assembly
  for(const v of ['all','open'])for(const o of ['A','B','C'])if(JSON.stringify(L[v][o])!==JSON.stringify(topfive[v].composites[o].map(r=>r.key)))throw new Error('point scenario differs from the site assembly '+v+o);
  for(const v of ['all','open'])if(JSON.stringify(L[v].capability_caps)!==JSON.stringify(topfive[v].capability.official_caps.map(r=>r.key)))throw new Error('capability caps differ from the site assembly '+v);
 }
 result.top_fives[name]=Object.fromEntries(Object.entries(L).map(([v,l])=>[v,Object.fromEntries(Object.entries(l).map(([m,o])=>[m,o.slice(0,5)]))]));
 if(first){for(const [v,l] of Object.entries(L))result.board_sizes[v]={composite:l.A.length,capability_caps:l.capability_caps.length,capability:l.capability.length};first=false;}
 for(const k of DRAW){
  const s=art.systems.find(x=>x.key===k),ranks=Object.fromEntries(Object.entries(L).map(([v,l])=>[v,Object.fromEntries(Object.entries(l).map(([m,o])=>[m,o.indexOf(k)+1||null]))]));
  result.rows[k].scenarios[name]={offset:off,intelligence:s.axes.intelligence,calibration:s.axes.calibration,capability:s.capability,composite:{A:s.scores.A,B:s.scores.B,C:s.scores.C},ranks,in_top5:Object.fromEntries(Object.entries(ranks).map(([v,r])=>[v,Object.entries(r).filter(([,p])=>p&&p<=5).map(([m])=>m)]))};
 }
}
writeFileSync(out,JSON.stringify(result,null,1)+'\n');
console.log('WHATIF',DRAW.length,'rows x',Object.keys(scen).length,'scenarios ->',out);
