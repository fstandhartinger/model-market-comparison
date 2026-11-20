// Scoring-free ranking analysis. Frozen accepted aggregates only; production list helpers.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const B=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root='/home/flori/wt/jevbench-v1818-20261120';
const imp=p=>import(pathToFileURL(path.join(root,p)));
const {jevComposite,jevLiveAllArtifact}=await imp('lib/jevbench-cohort-merge.mjs');
const {jevClassRows,JEV_V16_CLASS_OPTIONS}=await imp('lib/jevbench-jev-class.mjs');
const {jevScopeClassifier,jevbenchScopeArtifact}=await imp('lib/jevbench-scope.mjs');
const load=p=>JSON.parse(readFileSync(p));
const V=root+'/data/raw/benchmarks/jevbench/v1.8/';
const before=load(V+'jevbench-v1.8.17-results.json'),proof=load(V+'jevbench-v1.8.17-proof.json');
assert.equal(load(V+'jevbench-v1.8.17-publication.json').review.verdict,'PASS');
const cue=load(B+'/CUE-ANALYSIS-ROW.json');
const CAND=['minimodels-decision-1.0-candy-cane','starlord-27b-v2-0-preview','h2o-lightning-31b-v1.3.4','quyet-1-2-large','quyet-1-2-small','starlord-4b-preview','sieve-31b-v3','subq-snap-1.2',cue.key];
assert.equal(before.n_ranked,315);
for(const k of CAND.filter(k=>k!==cue.key)){
 const s=before.systems.find(s=>s.key===k);assert(s&&!s.ranked&&s.not_ranked_because==='Added after the v1.8.10 ranking review; it is ranked at the next review.',k);
}
const eq=proof.equating,AX=['intelligence','calibration','speed','cost'];
assert(Math.abs(eq.offset.I-(-2.884891186577587))<1e-9);
assert(Math.abs(eq.offset.C-(-1.8542447151797177))<1e-9);
const receipt=load('/home/flori/jobs/jevbench-add-requests-20260919/r276/equating/EQUATING-STRONG4-D1027.json');
for(const axis of ['I','C']){assert(Math.abs(eq.offset[axis]-receipt.offset[axis])<1e-9);for(let i=0;i<2;i++)assert(Math.abs(eq.offset_ci95[axis][i]-receipt.offset_ci95[axis][i])<1e-9);}
const systems=[...before.systems,cue].sort((x,y)=>x.key.localeCompare(y.key));
const DRAW=systems.filter(s=>s.draw?.id==='v1.6-regular-20261027'&&s.published_scores).map(s=>s.key).sort();
const isApi=jevScopeClassifier(before.systems,load(V+'jevbench-v1.8.17-carry.json').rows,[],[]);
const clip=x=>Math.min(100,Math.max(0,x));
const scen={point:eq.offset,I_ci_low:{I:eq.offset_ci95.I[0],C:eq.offset.C},I_ci_high:{I:eq.offset_ci95.I[1],C:eq.offset.C},C_ci_low:{I:eq.offset.I,C:eq.offset_ci95.C[0]},C_ci_high:{I:eq.offset.I,C:eq.offset_ci95.C[1]},joint_ci_low:{I:eq.offset_ci95.I[0],C:eq.offset_ci95.C[0]},joint_ci_high:{I:eq.offset_ci95.I[1],C:eq.offset_ci95.C[1]}};
for(const[k,v]of Object.entries(receipt.sensitivity_leave_one_out))scen['leave_out_'+k]={I:v.I,C:v.C};
const ROBUST=Object.keys(scen).filter(n=>!n.startsWith('joint_'));
const comps=axes=>Object.fromEntries(Object.entries(before.options).map(([o,{weights,intelligence_floor}])=>[o,jevComposite(axes,Object.fromEntries(AX.map(x=>[x,weights[x]/100])),intelligence_floor)]));
function equate(s,off){const p=s.published_scores,axes={...p.axes,intelligence:clip(p.axes.intelligence+off.I),calibration:clip(p.axes.calibration+off.C)};const scores=comps(axes);return{...s,axes,scores,jevbench_score:scores.A,capability:(axes.intelligence+axes.calibration)/2};}
for(const s of systems.filter(s=>DRAW.includes(s.key))){const q=equate(s,eq.offset);for(const k of ['A','B','C'])assert(Math.abs(q.scores[k]-s.scores[k])<1e-9,s.key+k);}
function field(off,rankedCandidates){
 const cs=new Set(rankedCandidates),ss=systems.map(s=>{let row=DRAW.includes(s.key)?equate(s,off):structuredClone(s);if(CAND.includes(s.key))row={...row,ranked:cs.has(s.key),listing:cs.has(s.key)?'ranked':'unranked'};return row;});
 const by=new Map(ss.map(s=>[s.key,s])),board={...before.board};
 for(const m of ['A','B','C','capability']){
  const prior=before.board[m].order;const init=[...prior.filter(k=>by.get(k).ranked),...rankedCandidates.filter(k=>!prior.includes(k))];const pos=new Map(init.map((k,i)=>[k,i]));
  const val=k=>m==='capability'?by.get(k).capability:by.get(k).scores[m];
  board[m]={...board[m],order:init.sort((x,y)=>val(y)-val(x)||pos.get(x)-pos.get(y))};
 }
 const ranks=Object.fromEntries(Object.entries(board).filter(([,b])=>b.order).map(([m,b])=>[m,new Map(b.order.map((k,i)=>[k,i+1]))]));
 for(const s of ss){s.ranks=Object.fromEntries(['A','B','C','capability'].map(m=>[m,ranks[m].get(s.key)??null]));s.rank=s.ranks.A;}
 return{...before,systems:ss,board,n_ranked:ss.filter(s=>s.ranked).length};
}
function listSet(art){
 const rk=art.systems.filter(s=>s.ranked),by=new Map(art.systems.map(s=>[s.key,s])),r={};
 for(const o of ['A','B','C'])r['composites/'+o]=art.board[o].order.filter(k=>by.get(k)?.ranked);
 for(const[label,opt]of [['capability/official_caps',{}],['capability/no_caps',{costFactor:Infinity,latencyFactor:Infinity}],['capability/cost_off_latency_2x',{costFactor:Infinity}],['capability/latency_none',{latencyFactor:Infinity}],['extra_capability/cost_7x',{costFactor:7}],['extra_capability/cost_10x',{costFactor:10}],['extra_capability/rank_field',{costFactor:Infinity,latencyFactor:Infinity}],['extra_capability/cost_7x_latency_none',{costFactor:7,latencyFactor:Infinity}],['extra_capability/cost_10x_latency_none',{costFactor:10,latencyFactor:Infinity}]])r[label]=jevClassRows(rk,{...JEV_V16_CLASS_OPTIONS,...opt}).rows.filter(x=>x.inClass).map(x=>x.row.key);
 return r;
}
function allLists(art){
 const views={all:jevLiveAllArtifact(art,isApi),open:jevbenchScopeArtifact(art,'open',isApi),api:jevbenchScopeArtifact(art,'api',isApi)},out={};
 for(const[v,x]of Object.entries(views))for(const[m,arr]of Object.entries(listSet(x)))out[v+'/'+m]=arr;
 for(const m of ['A','B','C','capability'])out['release/'+m]=views.all.board[m].order.filter(k=>views.all.systems.find(s=>s.key===k)?.ranked);
 return out;
}
const beforeLists=allLists(before),baseRepro=allLists(field(eq.offset,[]));
assert.deepEqual(beforeLists,baseRepro,'zero promoted candidate point reproduces all 40 predecessor lists');
assert.equal(Object.keys(beforeLists).length,40);
writeFileSync(B+'/BEFORE-LISTS.json',JSON.stringify(beforeLists,null,1)+'\n');
function run(rankedCandidates,label){
 const out={configuration:label,method:'Accepted aggregates only, no measurement or re-score. Every ranked 27 Oct draw row is re-derived as published + offset (clipped); every other row is unchanged. Frozen jevComposite; production scope and Jev-class helpers; stable re-sort preserving predecessor order at ties. All 40 primary lists include 36 scoped lists and 4 release lists. Joint CI ends are reported stress tests, not part of precedent robust rule. Family/language re-scoring was not authorized and is not performed.',board_sizes:{},offset_point:eq.offset,offset_ci95:eq.offset_ci95,scenarios:scen,offsets_source:'r276/equating/EQUATING-STRONG4-D1027.json sha256 7888a0803466daac872f46809b12015af6c3686109276ab89e1028c206103146',rows:{},top_fives:{},primary_rankings:{},primary_top_fives:{},robust_scenarios:ROBUST,stress_scenarios:Object.keys(scen).filter(n=>n.startsWith('joint_')),candidate_keys:CAND,summary:{},carried_topfive_changes:[]};
 for(const k of DRAW)out.rows[k]={display:systems.find(s=>s.key===k).display,ranked:rankedCandidates.includes(k)||before.systems.find(s=>s.key===k)?.ranked===true,held:!rankedCandidates.includes(k)&&CAND.includes(k),published:systems.find(s=>s.key===k).published_scores,scenarios:{}};
 for(const[name,off]of Object.entries(scen)){
  const art=field(off,rankedCandidates),L=allLists(art),by=new Map(art.systems.map(s=>[s.key,s]));out.primary_rankings[name]=L;out.primary_top_fives[name]=Object.fromEntries(Object.entries(L).map(([k,a])=>[k,a.slice(0,5)]));
  out.top_fives[name]={};for(const v of ['all','open','api'])out.top_fives[name][v]=Object.fromEntries([['A','composites/A'],['B','composites/B'],['C','composites/C'],['capability_caps','capability/official_caps'],['capability','extra_capability/rank_field']].map(([m,l])=>[m,L[v+'/'+l].slice(0,5)]));
  if(name==='point')for(const v of ['all','open','api'])out.board_sizes[v]={composite:L[v+'/composites/A'].length,capability_caps:L[v+'/capability/official_caps'].length,capability:L[v+'/extra_capability/rank_field'].length};
  for(const k of DRAW){const s=by.get(k),ranks=Object.fromEntries(['all','open','api'].map(v=>[v,Object.fromEntries([['A','composites/A'],['B','composites/B'],['C','composites/C'],['capability_caps','capability/official_caps'],['capability','extra_capability/rank_field']].map(([m,l])=>[m,L[v+'/'+l].indexOf(k)+1||null]))]));
   out.rows[k].scenarios[name]={offset:off,intelligence:s.axes.intelligence,calibration:s.axes.calibration,capability:s.capability,composite:s.scores,ranks,in_top5:Object.fromEntries(Object.entries(ranks).map(([v,r])=>[v,Object.entries(r).filter(([,p])=>p&&p<=5).map(([m])=>m)])),primary_ranks:Object.fromEntries(Object.entries(L).map(([l,a])=>[l,a.indexOf(k)+1||null]))};
  }
 }
 for(const k of CAND){let places={};for(const l of Object.keys(beforeLists)){const rr=Object.fromEntries(Object.keys(scen).map(n=>[n,out.primary_rankings[n][l].indexOf(k)+1||null])),nums=Object.values(rr).filter(n=>n!==null),rob=ROBUST.map(n=>rr[n]).filter(n=>n!==null);const cross=a=>a.some(n=>n<=5)&&a.some(n=>n>5);
  places[l]={point:rr.point,range:nums.length?[Math.min(...nums),Math.max(...nums)]:null,robust_range:rob.length?[Math.min(...rob),Math.max(...rob)]:null,crosses_top5:cross(rob),stress_crosses_top5:cross(nums),scenarios:rr};}
 const vals=Object.values(places),pointTop=vals.filter(v=>v.point&&v.point<=5),boundary=vals.filter(v=>v.crosses_top5),stress=vals.filter(v=>v.stress_crosses_top5);
 out.summary[k]={display:out.rows[k].display,axes:systems.find(s=>s.key===k).axes,scores:systems.find(s=>s.key===k).scores,capability:systems.find(s=>s.key===k).capability,classification:boundary.length?'BOUNDARY':pointTop.length?'ROBUST_IN_TOP5':'ROBUST_OUT',primary_point_top5:pointTop.length,nonrobust_point_top5:pointTop.filter(v=>v.crosses_top5).length,any_crossing_places:boundary.length,stress_crossing_places:stress.length,places};}
 for(const[name,L]of Object.entries(out.primary_rankings)){
  const baseline=allLists(field(scen[name],[]));
  for(const[l,arr]of Object.entries(L))for(const k of new Set([...baseline[l].slice(0,5),...arr.slice(0,5)])){if(CAND.includes(k))continue;const p0=baseline[l].indexOf(k)+1||null,p1=arr.indexOf(k)+1||null;if(p0!==p1)out.carried_topfive_changes.push({scenario:name,list:l,key:k,display:systems.find(s=>s.key===k).display,before:p0,after:p1,in_before:p0&&p0<=5,in_after:p1&&p1<=5});}
 }
 return out;
}
const all=run(CAND,'WHAT-IF ONLY: all nine candidates provisionally ranked; no release data edits');
writeFileSync(B+'/WHATIF-V1818.json',JSON.stringify(all,null,1)+'\n');
// Final dispositions are bound separately by inputs/RANKING-CONFIG.json under lead R1–R3.
// The retained original WHATIF was not rerun by the continuation worker.
console.log('Retained all-nine scenario analysis; use CLASSIFICATION.json for amended point-membership rulings.');
