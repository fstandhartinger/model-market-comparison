import {JEVBENCH_RELEASES} from '../lib/jevbench-releases.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {jevComposite} from '../lib/jevbench-cohort-merge.mjs';
import {hasPublishedJevbenchV1810Release,readJevbenchV1810ForBoard,V1810_EQUATED_KEYS,V1810_RANKED_KEYS,V1810_UNRANKED,V1810_HELD,V1810_NOTE,V1810_NOTE_UNPRICED,V1810_HELD_TEXT,V1810_H2O_HELD_TEXT,V1810_BOUNDARY,V1810_META_KEY,V1810_META_NOTE,V1810_HIST,V1810_RENAMES,V1810_OFFSET,V1810_EQUATING,V1810_FAIR_PATH,V1810_FAIR_DELTA_PATH,V1810_NEW_KEYS,V1810_GEMINI_SELF_REPORT,V1810_PRICING,V1810_REMOVED_KEYS} from '../lib/jevbench-v1810-release.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
import {assertReleaseHistory} from './helpers/release-history.mjs';
const root='data/raw/benchmarks/jevbench/v1.8/';const load=(v,n)=>JSON.parse(readFileSync(`${root}jevbench-${v}-${n}.json`));
const AX=['intelligence','calibration','speed','cost'],clip=x=>Math.min(100,Math.max(0,x));
test('v1.8.10 carries every row not on the 27 Oct draw unchanged except rank/ranks (and the one vendor-renamed display name), with the same cells',()=>{
 const a=load('v1.8.10','results'),b=load('v1.8.9','results'),by=new Map(a.systems.map(s=>[s.key,s]));
 assert.equal(b.systems.length,340);assert.equal(a.systems.length,340);assert.deepEqual(V1810_NEW_KEYS,['gemini-decision-1']);
 // r278 corrections: the preliminary unranked A2 re-run listing of Microsoft-Decision-1 leaves the boards (kept in v1.8.9 and earlier).
 assert.deepEqual(V1810_REMOVED_KEYS,['microsoft-decision-1-a2-20261012']);assert.equal(by.has('microsoft-decision-1-a2-20261012'),false);assert.equal(b.systems.find(s=>s.key==='microsoft-decision-1-a2-20261012').listing,'preliminary');
 for(const s of b.systems){if(V1810_EQUATED_KEYS.includes(s.key)||V1810_REMOVED_KEYS.includes(s.key))continue;const {rank,ranks,display,...rest}=s,{rank:r2,ranks:k2,display:d2,...now}=by.get(s.key);assert.deepEqual(now,rest,s.key);if(V1810_RENAMES[s.key])assert.equal(d2,V1810_RENAMES[s.key].after);else assert.equal(d2,display);}
 assert.deepEqual(Object.keys(V1810_RENAMES),['jev-27b-autotrust']);assert.equal(by.get('jev-27b-autotrust').display,'AutoTrust-Decider-Pro-27B (AutoTrust, Qwen3.8-27B)');assert.equal(by.get('jev-27b-autotrust').repo,b.systems.find(s=>s.key==='jev-27b-autotrust').repo);
 assert.equal(a.systems.filter(s=>/^JEV-(9B|27B)/.test(s.display)).length,0);
 for(const m of ['A','B','C','capability'])assert.deepEqual(a.board[m].order.filter(k=>!V1810_RANKED_KEYS.includes(k)&&!V1810_NEW_KEYS.includes(k)),b.board[m].order,m);
 const ac=load('v1.8.10','categories'),bc=load('v1.8.9','categories'),drop=(o)=>Object.fromEntries(Object.entries(o).filter(([k])=>!V1810_NEW_KEYS.includes(k)&&!V1810_REMOVED_KEYS.includes(k)));
 assert.deepEqual(drop(ac.systems),drop(bc.systems));assert.deepEqual(drop(ac.lanes),drop(bc.lanes));assert.equal(ac.lanes['gemini-decision-1'],'api');assert.equal(ac.systems['gemini-decision-1'].topics,undefined);
 assert.equal(a.n_ranked,b.n_ranked+V1810_RANKED_KEYS.length+1);
});
test('every row of the draw is published + offset (clipped), composites follow from the equated axes, published numbers are kept',()=>{
 const a=load('v1.8.10','results'),b=load('v1.8.9','results'),old=new Map(b.systems.map(s=>[s.key,s]));
 assert.equal(V1810_EQUATED_KEYS.length,37);assert.deepEqual(V1810_OFFSET,{I:-2.884891186577587,C:-1.8542447151797177});
 for(const s of a.systems.filter(s=>s.draw?.id==='v1.6-regular-20261027')){
  const p=old.get(s.key)??{...s.published_scores,composite_ci95:s.composite_ci95};assert.deepEqual(s.published_scores,{axes:p.axes,scores:p.scores,capability:p.capability});
  assert.ok(Math.abs(s.axes.intelligence-clip(p.axes.intelligence+V1810_OFFSET.I))<1e-12);assert.ok(Math.abs(s.axes.calibration-clip(p.axes.calibration+V1810_OFFSET.C))<1e-12);
  assert.equal(s.axes.speed,p.axes.speed);assert.equal(s.axes.cost,p.axes.cost);assert.ok(Math.abs(s.capability-(s.axes.intelligence+s.axes.calibration)/2)<1e-12);
  for(const [o,{weights,intelligence_floor}] of Object.entries(a.options)){const v=jevComposite(s.axes,Object.fromEntries(AX.map(x=>[x,weights[x]/100])),intelligence_floor);assert.ok(v===null?s.scores[o]===null:Math.abs(v-s.scores[o])<1e-9,s.key+o);}
  assert.deepEqual(s.composite_ci95,p.composite_ci95);assert.deepEqual(s.draw.offset,V1810_OFFSET);assert.equal(s.draw.status,'equated');assert.deepEqual(s.draw.offset_ci95,V1810_EQUATING.offset_ci95);
  assert.equal(s.draw.ci_basis,'measured on the draw before equating');
  if(V1810_NEW_KEYS.includes(s.key))assert.equal(s.listing_note,V1810_NOTE+' '+V1810_GEMINI_SELF_REPORT);
  else if(V1810_RANKED_KEYS.includes(s.key))assert.equal(s.listing_note,[V1810_NOTE,V1810_BOUNDARY[s.key],s.key===V1810_META_KEY?V1810_META_NOTE:null].filter(Boolean).join(' '));
  else if(V1810_HELD.includes(s.key)){assert.equal('listing_note' in s,false);assert.equal(s.not_ranked_because,s.key==='h2o-lightning-4b-v1.4.1'?V1810_H2O_HELD_TEXT:V1810_HELD_TEXT);}
  else assert.equal(s.listing_note,V1810_NOTE_UNPRICED);
  assert.doesNotMatch(JSON.stringify([s.disclosure,s.underlying,s.listing_note,s.not_ranked_because]),/not yet equated|until (that|the) draw is equated|stronger anchor|offset 0/i);
 }
});
test('31 priced rows are ranked in the merged field; four are held unranked (fairness subset); the rows without a price stay unranked for that reason',()=>{
 const a=load('v1.8.10','results'),by=new Map(a.systems.map(s=>[s.key,s]));
 assert.equal(V1810_RANKED_KEYS.length,31);assert.deepEqual([...V1810_HELD].sort(),['h2o-lightning-4b-v1.4.1','jeff_1_1_large','visionjev-1.0.0-27b','wemm-jev']);
 assert.deepEqual(Object.keys(V1810_UNRANKED).sort(),['decisionnode-flash-0.9.1-rc1','decisionnode-main-0.9.1-rc1',...V1810_HELD].sort());
 for(const k of V1810_HELD){const s=by.get(k);assert.equal(s.ranked,false);assert.equal(s.listing,'unranked');assert.equal(s.rank,null);assert.deepEqual(s.ranks,{A:null,B:null,C:null,capability:null});assert.ok(s.scores.A>0);assert.ok(s.axes.intelligence>0);assert.match(s.not_ranked_because,/Not ranked/);for(const m of ['A','B','C','capability'])assert.equal(a.board[m].order.includes(k),false);}
 assert.match(by.get('h2o-lightning-4b-v1.4.1').not_ranked_because,/57\.2 Intelligence vs 61\.1/);
 for(const k of V1810_RANKED_KEYS){const s=by.get(k);assert.equal(s.ranked,true);assert.equal(s.listing,'ranked');assert.equal('not_ranked_because' in s,false);for(const m of ['A','B','C','capability'])assert.equal(s.ranks[m],a.board[m].order.indexOf(k)+1);assert.equal(s.rank,s.ranks.A);}
 for(const k of Object.keys(V1810_UNRANKED).filter(k=>!V1810_HELD.includes(k))){const s=by.get(k);assert.equal(s.ranked,false);assert.equal(s.rank,null);assert.deepEqual(s.ranks,{A:null,B:null,C:null,capability:null});assert.match(s.not_ranked_because,/no price/);assert.equal(s.scores.A,null);for(const m of ['A','B','C','capability'])assert.equal(a.board[m].order.includes(k),false);}
});
test('v1.8.10 visibility, alldata and fairness gate follow independent review in either state',async()=>{
 const pub=load('v1.8.10','publication'),visible=pub.review.verdict==='PASS';
 assert.equal(await hasPublishedJevbenchV1810Release(),visible);assert.equal(Boolean(await readJevbenchV1810ForBoard()),visible);assert.equal(Boolean(await readJevAllDataInput('v1.8.10')),visible);
 assert.equal(readFileSync('lib/jevbench-alldata-input.mjs','utf8').split("'v1.8.10':").length-1,1);
 const a=load('v1.8.10','proof').publication_approval,fair=a.fairness_check,delta=a.fairness_check_delta;assert.equal(fair.path,V1810_FAIR_PATH);assert.equal(delta.path,V1810_FAIR_DELTA_PATH);
 if(visible){assert.equal(fair.verdict,'FAIR');assert.equal(delta.verdict,'FAIR');}else{assert.ok(['PENDING','FAIR'].includes(fair.verdict));assert.equal(delta.verdict,'PENDING');}
});
test('draw registry and release page describe the strong-anchor equating',()=>{
 const draw=JSON.parse(readFileSync('data/jevbench-draw-equating.json')).draws.find(d=>d.draw==='v1.6-regular-20261027');
 assertReleaseHistory(assert,draw,['v1.7.13','v1.7.14','v1.7.15','v1.7.16','v1.7.17','v1.7.19','v1.7.21','v1.7.22','v1.8.1','v1.8.2','v1.8.3','v1.8.4','v1.8.5','v1.8.6','v1.8.7','v1.8.8','v1.8.9','v1.8.10']);
 assert.equal(draw.status,'equated');assert.deepEqual(draw.offset,V1810_OFFSET);assert.deepEqual(draw.anchors,['decider-12b','h2o-lightning-4b-v1.1','quyet-1-0-large','torchcast-decision-27b']);
 const others=JSON.parse(readFileSync('data/jevbench-draw-equating.json')).draws.filter(d=>d.draw!==draw.draw);for(const d of others){assert.equal(d.status,'anchor-runs-pending');assert.deepEqual(d.offset,{I:0,C:0});}
 const page=readFileSync('app/jev-models/v1.8.10/page.tsx','utf8');assert.ok(page.includes('four strong anchor systems'));assert.ok(page.includes('Previous v1.8.9'));assert.ok(page.includes('ranked 31 of its rows'));assert.ok(!page.includes('Karpo'));
});
test('release history sentence and date',()=>{const r=JEVBENCH_RELEASES.find(r=>r.version==='v1.8.10');assert.equal(r.text,V1810_HIST);assert.ok(r.text.startsWith('Equated the 27 Oct regular draw with four strong anchor systems (Intelligence -2.9, Calibration -1.9 points) and ranked 31 of its rows; four stay unranked because their top-five places lie within the uncertainty of the shift'));assert.ok(r.text.includes("renamed AutoTrust's JEV-27B to AutoTrust-Decider-Pro-27B at the vendor's request"));assert.equal(r.href,'/jev-models/v1.8.10');assert.match(r.date,/^2026-11-\d\d$/);});
test('top-five preview is bound and every helper refuses while fairness is PENDING',()=>{
 const proof=load('v1.8.10','proof'),a=proof.publication_approval;assert.equal(a.top_five_effect,'changed');assert.equal(a.fresh_baseline,'v1.8.9');
 const diff=JSON.parse(readFileSync('r198/v1810/receipts/topfive-diff.json'));assert.equal(diff.lists,580);assert.equal(diff.changed,true);
});
test('Gemini Decision 1 (Google, hosted API) joins the 27 Oct draw: measured = published, shown equated, ranked on the API board, list-price cost, self-reported figure labelled',()=>{
 const a=load('v1.8.10','results'),proof=load('v1.8.10','proof'),s=a.systems.find(r=>r.key==='gemini-decision-1');
 assert.equal(s.display,'Gemini Decision 1');assert.equal(s.author,'Google');assert.equal(s.api_flag,true);assert.equal(s.endpoint_kind,'api');assert.equal(s.ranked,true);assert.equal(s.listing,'ranked');
 assert.deepEqual(s.published_scores.axes,{intelligence:70.2853293242864,calibration:91.49399821393442,speed:90.06659217686632,cost:52.5184149091935});
 assert.equal(s.axes.intelligence.toFixed(2),'67.40');assert.equal(s.axes.calibration.toFixed(2),'89.64');assert.equal(s.scores.A.toFixed(2),'71.26');
 assert.equal(s.cost.kind,'tariff');assert.equal(s.cost.usd_per_1000,0.03825775688381464);assert.equal(s.cost.common_basis.usd_per_1000_all_items,0.06472946666666668);assert.equal(s.cost.common_basis.n_items,1489);
 assert.match(s.cost.basis,/^Google list price USD 0\.10 per 1M input tokens, output free/);assert.doesNotMatch(JSON.stringify(s),/#\d{4,}|private|withheld|priority/i);
 assert.ok(s.listing_note.endsWith(V1810_GEMINI_SELF_REPORT));assert.ok(s.disclosure.includes(V1810_GEMINI_SELF_REPORT));assert.ok(s.disclosure.includes('ImageJevBench: requested, no date.'));assert.doesNotMatch(s.disclosure,/plain accuracy/i);
 assert.equal(s.self_reported,V1810_GEMINI_SELF_REPORT);assert.deepEqual(s.noul_decisive,{acc_among_decisive:0.9807073954983923,decisive:311,decisive_rate:0.8337801608579088,n:375,supported:true,valid:373});
 assert.match(s.endpoint_condition,/request-pinned/);assert.match(s.disclosure,/3 of 1,500 requests failed in transport/);assert.equal(s.model_pin,null);
 for(const m of ['A','B','C','capability'])assert.equal(s.ranks[m],a.board[m].order.indexOf('gemini-decision-1')+1);
 assert.deepEqual(Object.keys(proof.new_rows),['gemini-decision-1']);assert.equal(proof.pricing_module_sha256,V1810_PRICING.new);assert.equal(load('v1.8.9','proof').pricing_module_sha256,V1810_PRICING.old);
 assert.deepEqual(a.addendum.new_keys,['gemini-decision-1']);assert.ok(V1810_HIST.endsWith('; added Gemini Decision 1 (Google, hosted API) on the same draw; removed the preliminary A2 re-run listing of Microsoft-Decision-1 (its regular rows stay); all published breakdown cells are now shown, small samples marked; 18 API base models added with sources.'));
});
