// Full result diff and all 580 list checks against the frozen preview commit.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as eq} from 'node:util';
import {jevLiveAllArtifact} from '../../lib/jevbench-cohort-merge.mjs';
import {jevClassRows,JEV_V16_CLASS_OPTIONS} from '../../lib/jevbench-jev-class.mjs';
import {jevScopeClassifier,jevbenchScopeArtifact} from '../../lib/jevbench-scope.mjs';
const J=new URL('.',import.meta.url).pathname,load=p=>JSON.parse(readFileSync(p)),sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const base=J+'fix-round/',preview=load(base+'preview-results.json'),fixed=load('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.0-results.json'),previous=load('data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.23-results.json');
for(const [name,source]of Object.entries(load(base+'SOURCES.json')))assert.equal(sha(base+name),source.sha256);
const saved=load(base+'preview-lists.json'),current=load(J+'receipts/topfive-diff.json'),headlineBefore=load(base+'preview-headlines.json'),headlineAfter=load(J+'receipts/topfive-after.json');
const diffs=[];
function diff(a,b,path){
 if(eq(a,b))return;
 if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b))for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],path+'.'+k);
 else if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length)for(let i=0;i<a.length;i++)diff(a[i],b[i],`${path}[${i}]`);
 else diffs.push({path,before:a,after:b});
}
diff(preview,fixed,'results');
const oldBy=new Map(previous.systems.map(s=>[s.key,s])),previewBy=new Map(preview.systems.map(s=>[s.key,s]));
const textKeys=['knowline-31b-gen1','jeffan-31b-1710','knowline-35b-a3b-gen1.5','vera-large'],listingKeys=['knowline-26b-a4b-gen2.5','lychee-27b'];
const replacement='Over the cost cap under the earlier list-price basis; inside both caps from v1.8.0 (GPU-time cost basis).';
const unexpected=[];
for(const d of diffs){
 let allowed=false,finding;
 const m=d.path.match(/^results.systems\[(\d+)\]\.(.*)$/);
 if(m){const s=fixed.systems[+m[1]],f=m[2];
  if(f==='ranks.capability'){allowed=eq(d.after,oldBy.get(s.key).ranks.capability);finding='F1';}
  if(f==='listing'&&listingKeys.includes(s.key)){allowed=d.before==='ranked_over_cap'&&d.after==='ranked';finding='F3';}
  if(f==='underlying'&&textKeys.includes(s.key)){const i=d.before.indexOf('OVER COST CAP:');allowed=i>=0&&d.after===d.before.slice(0,i)+replacement;finding='F3';}
 }else if(d.path==='results.board.capability.order'){allowed=eq(d.after,previous.board.capability.order);finding='F1';}
 else if(d.path==='results.source_note'||/^results.measurement_notes\[\d+\]$/.test(d.path)){allowed=d.before.replace('unresolved architectures','architectures outside the six calibrated Gemma/Qwen classes')+' Throughput was calibrated on prompt processing (prefill); generated tokens are counted at the same rate. Three diffusion-readout rows are priced with the closest calibrated class (MoE Gemma); this is an approximation.'===d.after;finding='F7';}
 else if(d.path==='results.addendum.text_fixed_keys'){allowed=eq(d.after,[...textKeys,...listingKeys].sort());finding='F3';}
 d.finding=finding;d.allowed=allowed;if(!allowed)unexpected.push(d);
}
assert.deepEqual(fixed.board.capability,previous.board.capability);
for(const s of fixed.systems)assert.equal(s.ranks?.capability,oldBy.get(s.key).ranks?.capability);
assert.equal(fixed.systems.find(s=>s.key==='apus-openjev-v1-35b-a3b').ranks.capability,66);
assert.equal(fixed.systems.find(s=>s.key==='bb-qwen3.5-4b-lora').ranks.capability,65);
// Check every score/axis/cost/latency/eligibility input and all composite ranks, including nested history.
const numericChecks=[];
for(const s of fixed.systems){const before=previewBy.get(s.key);assert.ok(before);
 const fields=['scores','axes','cost','capability','intelligence','calibration','speed','rank','ranked','jevbench_score','views','decision_limit','composite_ci95','v16'];
 for(const f of fields)assert.deepEqual(s[f],before[f],s.key+': '+f);
 for(const f of ['A','B','C'])assert.equal(s.ranks?.[f],before.ranks?.[f]);
 numericChecks.push(s.key);
}
const carry=load('data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.23-carry.json');
const isApi=jevScopeClassifier(previous.systems,carry.rows,[],[]);
function classify(a){return Object.fromEntries(['all','open','api'].map(scope=>{
 const systems=(scope==='all'?jevLiveAllArtifact(a,isApi):jevbenchScopeArtifact(a,scope,isApi)).systems.filter(s=>s.ranked);
 return [scope,jevClassRows(systems,JEV_V16_CLASS_OPTIONS).rows.map(r=>({key:r.row.key,inClass:r.inClass,cost:r.cost,latency:r.latency,capability:r.capability}))];
}));}
const eligibilityBefore=classify(preview),eligibilityAfter=classify(fixed);assert.deepEqual(eligibilityAfter,eligibilityBefore);
const listMap=new Map(saved.rows.map(r=>[r.label,r]));assert.equal(current.rows.length,580);assert.equal(listMap.size,580);
const capabilityList=a=>jevLiveAllArtifact(a,()=>false).systems.filter(s=>s.ranked).sort((x,y)=>x.ranks.capability-y.ranks.capability).map(s=>s.key);
const restored=capabilityList(fixed),prior=capabilityList(previous);assert.deepEqual(restored,prior);
const lists=current.rows.map(r=>{
 const p=listMap.get(r.label);assert.ok(p,r.label);
 const exempt=r.label==='release/capability',expected=exempt?prior.slice(0,10):p.after;
 const top5=eq(r.after.slice(0,5),expected.slice(0,5)),top10=eq(r.after,expected);
 assert.ok(top5&&top10,r.label);
 return {label:r.label,baseline:exempt?'v1.7.23':'preview 254236610',exempt_from_preview_equality:exempt,top5_equal:top5,top10_equal:top10,expected_top10:expected,actual_top10:r.after};
});
const headlines={};
for(const scope of ['open','all']){
 const b=headlineBefore.full_rankings[scope].capability.official_caps.slice(0,10).map(r=>r.key),a=headlineAfter.full_rankings[scope].capability.official_caps.slice(0,10).map(r=>r.key);
 assert.deepEqual(a,b);assert.deepEqual(a,eligibilityAfter[scope].filter(r=>r.inClass).slice(0,10).map(r=>r.key));
 headlines[scope]={method:'page jevClassRows, official caps',preview_top10:b,fixed_top10:a,equal:true};
}
const stale=[];
for(const s of fixed.systems){
 const inClass=eligibilityAfter.all.find(r=>r.key===s.key)?.inClass;
 if(inClass&&(s.listing==='ranked_over_cap'||/OVER COST CAP:/i.test(s.underlying??'')))stale.push(s.key);
}
assert.deepEqual(stale,[]);
const resultPath='data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.0-results.json';
const receipt={status:unexpected.length?'FAIL_STOP':'PASS',preview_commit:'254236610d5065ac48548e64aa926f5244f29a07',base_origin_main_sha:'3d3a848118537bd8331d64a05da33f01ebc2e345',preview_results_sha256:sha(base+'preview-results.json'),fixed_results_sha256:sha(resultPath),row_count:fixed.systems.length,all_scores_costs_caps_eligibility_composite_ranks_identical:true,row_checks:numericChecks.length,caps:JEV_V16_CLASS_OPTIONS.limits,eligibility_counts:Object.fromEntries(Object.entries(eligibilityAfter).map(([scope,rows])=>[scope,rows.filter(r=>r.inClass).length])),capability:{board_byte_equal_to_v1723:JSON.stringify(fixed.board.capability)===JSON.stringify(previous.board.capability),all_ranks_equal_to_v1723:true,board_entries:fixed.board.capability.order.length,nonnull_ranks:fixed.systems.filter(s=>s.ranks?.capability!=null).length,full_order_equal:true,expected_full_order:prior,actual_full_order:restored},list_count:580,preview_equal_lists:579,exemptions:[{label:'release/capability',reason:'Lead ruling: preview list reflects wiped ranks; restore v1.7.23 full order, top five and top ten',top5_equal_to_v1723:true,top10_equal_to_v1723:true,full_order_equal_to_v1723:true}],headlines,allowed_result_differences:diffs,unexpected_differences:unexpected,other_over_cap_rows_fixed:[],stale_in_cap_rows:stale,lists};
writeFileSync(J+'FIX-ROUND-EQUALITY.json',JSON.stringify(receipt,null,1)+'\n');
assert.deepEqual(unexpected,[],'Unexpected result differences; STOP');
console.log(JSON.stringify({status:receipt.status,rows:receipt.row_count,lists:580,preview_equal:579,capability_equal_to_v1723:true,headline_top_tens_equal:true,unexpected_differences:unexpected.length}));
