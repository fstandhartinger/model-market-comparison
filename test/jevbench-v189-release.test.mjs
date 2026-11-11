import {JEVBENCH_RELEASES} from '../lib/jevbench-releases.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hasPublishedJevbenchV189Release,readJevbenchV189ForBoard,V189_NEW_KEYS,V189_NOTE} from '../lib/jevbench-v189-release.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
import {assertReleaseHistory} from './helpers/release-history.mjs';
const root='data/raw/benchmarks/jevbench/v1.8/';const load=(v,n)=>JSON.parse(readFileSync(`${root}jevbench-${v}-${n}.json`));
test('v1.8.9 carries all 339 predecessor rows and cells byte-equivalently',()=>{
 const a=load('v1.8.9','results'),b=load('v1.8.8','results'),by=new Map(a.systems.map(s=>[s.key,s]));
 assert.equal(b.systems.length,339);for(const s of b.systems)assert.deepEqual(by.get(s.key),s);
 assert.deepEqual(a.board,b.board);assert.equal(a.systems.length,b.systems.length+1);assert.equal(a.n_ranked,b.n_ranked);
 const ac=load('v1.8.9','categories'),bc=load('v1.8.8','categories');for(const[k,v]of Object.entries(bc.systems))assert.deepEqual(ac.systems[k],v);
});
test('self-hosted restricted row retains approved scores, pin and standard speed adjustment',()=>{
 assert.deepEqual(V189_NEW_KEYS,['karpo_decision_31b']);const s=load('v1.8.9','results').systems.find(s=>s.key===V189_NEW_KEYS[0]);
 assert.equal(s.display,'Karpo-Decision-31B');assert.equal(s.author,'MachinePulse AI');assert.equal(s.ranked,false);assert.equal(s.rank,null);assert.equal(s.not_ranked_because,V189_NOTE);
 assert.deepEqual(s.ranks,{A:null,B:null,C:null,capability:null});assert.equal(s.endpoint_kind,'gpu');assert.equal(s.api_flag,false);assert.equal(s.speed.adjustment,'x2 + 0.15 s (assumption, not measured)');
 assert.equal(s.model_pin,'MachinePulseAI/karpo-decision-31B@221bf1a011093807e29b77859f09499c2c365e34');
 assert.equal(s.scores.A,78.36721515667831);assert.equal(s.scores.B,79.26301778954858);assert.equal(s.scores.C,78.36721515667831);assert.equal(s.capability,89.52907173641972);assert.equal(s.cost.usd_per_1000,0.025234774673846376);
 assert.deepEqual(s.status,{status:'complete'});assert.equal(s.new_in,'v1.8.9');assert.equal(s.draw.measured_on,'2026-11-10');assert.ok(s.disclosure.endsWith('Failed or unanswered requests count as wrong answers.'));
});
test('v1.8.9 visibility and alldata follow independent review in either state',async()=>{
 const visible=load('v1.8.9','publication').review.verdict==='PASS';assert.equal(await hasPublishedJevbenchV189Release(),visible);assert.equal(Boolean(await readJevbenchV189ForBoard()),visible);assert.equal(Boolean(await readJevAllDataInput('v1.8.9')),visible);
 assert.equal(readFileSync('lib/jevbench-alldata-input.mjs','utf8').split("'v1.8.9':").length-1,1);
});
test('draw registry and release page describe one self-hosted addition',()=>{
 const draw=JSON.parse(readFileSync('data/jevbench-draw-equating.json')).draws.find(d=>d.draw==='v1.6-regular-20261027');
 assertReleaseHistory(assert,draw,['v1.7.13','v1.7.14','v1.7.15','v1.7.16','v1.7.17','v1.7.19','v1.7.21','v1.7.22','v1.8.1','v1.8.2','v1.8.3','v1.8.4','v1.8.5','v1.8.6','v1.8.7','v1.8.8','v1.8.9']);
 const page=readFileSync('app/jev-models/v1.8.9/page.tsx','utf8');assert.ok(page.includes('Karpo-Decision-31B, self-hosted'));assert.ok(page.includes('Previous v1.8.8'));assert.ok(page.includes('one unranked row'));assert.ok(!page.includes('sd-jev-4b-v12.1.0-aligned-s42-step0256'));
});

test('release date is 11 November while measurement remains 10 November',()=>{assert.equal(JEVBENCH_RELEASES.find(r=>r.version==='v1.8.9').date,'2026-11-11');assert.equal(load('v1.8.9','results').systems.find(s=>s.key==='karpo_decision_31b').last_measured_on,'2026-11-10');});
