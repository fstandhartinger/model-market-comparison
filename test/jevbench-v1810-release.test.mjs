import {JEVBENCH_RELEASES} from '../lib/jevbench-releases.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {jevComposite} from '../lib/jevbench-cohort-merge.mjs';
import {hasPublishedJevbenchV1810Release,readJevbenchV1810ForBoard,V1810_EQUATED_KEYS,V1810_RANKED_KEYS,V1810_UNRANKED,V1810_NOTE,V1810_H2O_EXTRA,V1810_OFFSET,V1810_EQUATING,V1810_FAIR_PATH} from '../lib/jevbench-v1810-release.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
import {assertReleaseHistory} from './helpers/release-history.mjs';
const root='data/raw/benchmarks/jevbench/v1.8/';const load=(v,n)=>JSON.parse(readFileSync(`${root}jevbench-${v}-${n}.json`));
const AX=['intelligence','calibration','speed','cost'],clip=x=>Math.min(100,Math.max(0,x));
test('v1.8.10 carries every row not on the 27 Oct draw unchanged except rank/ranks, with the same cells',()=>{
 const a=load('v1.8.10','results'),b=load('v1.8.9','results'),by=new Map(a.systems.map(s=>[s.key,s]));
 assert.equal(b.systems.length,340);assert.equal(a.systems.length,340);
 for(const s of b.systems){if(V1810_EQUATED_KEYS.includes(s.key))continue;const {rank,ranks,...rest}=s,{rank:r2,ranks:k2,...now}=by.get(s.key);assert.deepEqual(now,rest,s.key);}
 for(const m of ['A','B','C','capability'])assert.deepEqual(a.board[m].order.filter(k=>!V1810_RANKED_KEYS.includes(k)),b.board[m].order,m);
 const ac=load('v1.8.10','categories'),bc=load('v1.8.9','categories');assert.deepEqual(ac.systems,bc.systems);assert.deepEqual(ac.lanes,bc.lanes);
 assert.equal(a.n_ranked,b.n_ranked+V1810_RANKED_KEYS.length);
});
test('every row of the draw is published + offset (clipped), composites follow from the equated axes, published numbers are kept',()=>{
 const a=load('v1.8.10','results'),b=load('v1.8.9','results'),old=new Map(b.systems.map(s=>[s.key,s]));
 assert.equal(V1810_EQUATED_KEYS.length,37);assert.deepEqual(V1810_OFFSET,{I:-2.884891186577587,C:-1.8542447151797177});
 for(const s of a.systems.filter(s=>s.draw?.id==='v1.6-regular-20261027')){
  const p=old.get(s.key);assert.deepEqual(s.published_scores,{axes:p.axes,scores:p.scores,capability:p.capability});
  assert.ok(Math.abs(s.axes.intelligence-clip(p.axes.intelligence+V1810_OFFSET.I))<1e-12);assert.ok(Math.abs(s.axes.calibration-clip(p.axes.calibration+V1810_OFFSET.C))<1e-12);
  assert.equal(s.axes.speed,p.axes.speed);assert.equal(s.axes.cost,p.axes.cost);assert.ok(Math.abs(s.capability-(s.axes.intelligence+s.axes.calibration)/2)<1e-12);
  for(const [o,{weights,intelligence_floor}] of Object.entries(a.options)){const v=jevComposite(s.axes,Object.fromEntries(AX.map(x=>[x,weights[x]/100])),intelligence_floor);assert.ok(v===null?s.scores[o]===null:Math.abs(v-s.scores[o])<1e-9,s.key+o);}
  assert.deepEqual(s.composite_ci95,p.composite_ci95);assert.deepEqual(s.draw.offset,V1810_OFFSET);assert.equal(s.draw.status,'equated');assert.deepEqual(s.draw.offset_ci95,V1810_EQUATING.offset_ci95);
  assert.equal(s.listing_note,V1810_NOTE+(s.key==='h2o-lightning-4b-v1.4.1'?' '+V1810_H2O_EXTRA:''));
  assert.doesNotMatch(JSON.stringify([s.disclosure,s.underlying,s.listing_note,s.not_ranked_because]),/not yet equated|until (that|the) draw is equated|stronger anchor|offset 0/i);
 }
});
test('priced rows are ranked in the merged field; the rows without a price stay unranked for that reason',()=>{
 const a=load('v1.8.10','results'),by=new Map(a.systems.map(s=>[s.key,s]));
 assert.deepEqual(Object.keys(V1810_UNRANKED).sort(),['decisionnode-flash-0.9.1-rc1','decisionnode-main-0.9.1-rc1']);
 for(const k of V1810_RANKED_KEYS){const s=by.get(k);assert.equal(s.ranked,true);assert.equal(s.listing,'ranked');assert.equal('not_ranked_because' in s,false);for(const m of ['A','B','C','capability'])assert.equal(s.ranks[m],a.board[m].order.indexOf(k)+1);assert.equal(s.rank,s.ranks.A);}
 for(const k of Object.keys(V1810_UNRANKED)){const s=by.get(k);assert.equal(s.ranked,false);assert.equal(s.rank,null);assert.deepEqual(s.ranks,{A:null,B:null,C:null,capability:null});assert.match(s.not_ranked_because,/no price/);assert.equal(s.scores.A,null);for(const m of ['A','B','C','capability'])assert.equal(a.board[m].order.includes(k),false);}
});
test('v1.8.10 visibility, alldata and fairness gate follow independent review in either state',async()=>{
 const pub=load('v1.8.10','publication'),visible=pub.review.verdict==='PASS';
 assert.equal(await hasPublishedJevbenchV1810Release(),visible);assert.equal(Boolean(await readJevbenchV1810ForBoard()),visible);assert.equal(Boolean(await readJevAllDataInput('v1.8.10')),visible);
 assert.equal(readFileSync('lib/jevbench-alldata-input.mjs','utf8').split("'v1.8.10':").length-1,1);
 const fair=load('v1.8.10','proof').publication_approval.fairness_check;assert.equal(fair.path,V1810_FAIR_PATH);
 if(visible)assert.equal(fair.verdict,'FAIR');else assert.equal(fair.verdict,'PENDING');
});
test('draw registry and release page describe the strong-anchor equating',()=>{
 const draw=JSON.parse(readFileSync('data/jevbench-draw-equating.json')).draws.find(d=>d.draw==='v1.6-regular-20261027');
 assertReleaseHistory(assert,draw,['v1.7.13','v1.7.14','v1.7.15','v1.7.16','v1.7.17','v1.7.19','v1.7.21','v1.7.22','v1.8.1','v1.8.2','v1.8.3','v1.8.4','v1.8.5','v1.8.6','v1.8.7','v1.8.8','v1.8.9','v1.8.10']);
 assert.equal(draw.status,'equated');assert.deepEqual(draw.offset,V1810_OFFSET);assert.deepEqual(draw.anchors,['decider-12b','h2o-lightning-4b-v1.1','quyet-1-0-large','torchcast-decision-27b']);
 const others=JSON.parse(readFileSync('data/jevbench-draw-equating.json')).draws.filter(d=>d.draw!==draw.draw);for(const d of others){assert.equal(d.status,'anchor-runs-pending');assert.deepEqual(d.offset,{I:0,C:0});}
 const page=readFileSync('app/jev-models/v1.8.10/page.tsx','utf8');assert.ok(page.includes('four strong anchor systems'));assert.ok(page.includes('Previous v1.8.9'));assert.ok(page.includes('ranked its rows'));assert.ok(!page.includes('Karpo'));
});
test('release history sentence and date',()=>{const r=JEVBENCH_RELEASES.find(r=>r.version==='v1.8.10');assert.equal(r.text,'Equated the 27 Oct regular draw with four strong anchor systems (Intelligence -2.9, Calibration -1.9 points) and ranked its rows.');assert.equal(r.href,'/jev-models/v1.8.10');assert.match(r.date,/^2026-11-\d\d$/);});
test('top-five preview is bound and every helper refuses while fairness is PENDING',()=>{
 const proof=load('v1.8.10','proof'),a=proof.publication_approval;assert.equal(a.top_five_effect,'changed');assert.equal(a.fresh_baseline,'v1.8.9');
 const diff=JSON.parse(readFileSync('r198/v1810/receipts/topfive-diff.json'));assert.equal(diff.lists,580);assert.equal(diff.changed,true);
});
