import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {readJevbenchV1818Candidate,hasPublishedJevbenchV1818Release,readJevbenchV1818ForBoard} from '../lib/jevbench-v1818-release.mjs';
import {baseModelFor} from '../lib/jev-base-model.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
const load=(v,n)=>JSON.parse(readFileSync(`data/raw/benchmarks/jevbench/v1.8/jevbench-${v}-${n}.json`));
const r=load('v1.8.18','results'),p=load('v1.8.17','results'),by=new Map(r.systems.map(s=>[s.key,s]));
const cfg=JSON.parse(readFileSync('r198/v1818/inputs/RANKING-CONFIG.json'));
const notes=JSON.parse(readFileSync('r198/v1818/inputs/TEXT-EXCEPTIONS.json'));
test('committed PASS manifest never carries a synthetic or pending review engine',()=>{
 const manifest=JSON.parse(execFileSync('git',['show','HEAD:data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.18-publication.json'],{encoding:'utf8'}));
 if(manifest.review.verdict==='PASS'){
  assert.ok(manifest.review.engine);
  assert.doesNotMatch(manifest.review.engine,/synthetic|pending/i);
 }
});
test('v1.8.18 preserves all non-ranking measurement fields and all carried cells',()=>{
 const reviewed=new Set([...cfg.ranked,...cfg.held]);
 for(const prior of p.systems){
  const fields=['rank','ranks'];if(reviewed.has(prior.key))fields.push('ranked','listing','listing_note','not_ranked_because');
  const note=notes.find(e=>e.key===prior.key);if(note){fields.push('listing_note');assert.equal(by.get(prior.key).listing_note,note.after);assert.equal(prior.listing_note,note.before);}
  const strip=s=>Object.fromEntries(Object.entries(s).filter(([k])=>!fields.includes(k)));
  assert.deepEqual(strip(by.get(prior.key)),strip(prior),prior.key);
 }
 const c=load('v1.8.18','categories'),d=load('v1.8.17','categories');
 for(const[k,v]of Object.entries(d.systems))assert.deepEqual(c.systems[k],v);
 assert.equal(r.n_ranked,p.n_ranked+cfg.ranked.length);assert.equal(r.roster_count,p.roster_count+1);
});
test('v1.8.18 is a gated candidate; visibility follows PENDING/PASS',async()=>{
 const bundle=await readJevbenchV1818Candidate(),visible=bundle.manifest.review.verdict==='PASS';
 assert.equal(await hasPublishedJevbenchV1818Release(),visible);assert.equal(Boolean(await readJevbenchV1818ForBoard()),visible);assert.equal(Boolean(await readJevAllDataInput('v1.8.18')),visible);
 assert.deepEqual(bundle.proof.equating,load('v1.8.17','proof').equating);
});
test('mechanical R1–R3 disposition and carried T3 notes match the retained WHATIF',()=>{
 const wa=JSON.parse(readFileSync('r198/v1818/analysis/WHATIF-V1818.json'));
 for(const k of [...cfg.ranked,...cfg.held]){
  const places=Object.values(wa.summary[k].places).filter(v=>v.point&&v.point<=5);
  const boundary=places.map(v=>wa.robust_scenarios.filter(s=>v.scenarios[s]>5||v.scenarios[s]===null)).filter(v=>v.length);
  const rank=boundary.length===0||(boundary.length===1&&boundary[0].length===1&&boundary[0][0]==='I_ci_low');
  assert.equal(by.get(k).ranked,rank,k);
 }
 assert.match(by.get('starlord-27b-v2-0-preview').listing_note,/Its #5 place on the open-weights Composite B list/);
 assert.doesNotMatch(by.get('karpo_decision_31b').listing_note,/Composite B among all systems/);
 assert.match(by.get('karpo_decision_31b').listing_note,/Its #4 place on the Capability Score among all systems is within the uncertainty of the draw shift\.$/);
 assert.match(by.get('decide-1.1').listing_note,/Its #4 place on Composite B among all systems is within the uncertainty of the draw shift\.$/);
 assert.match(by.get('sd-jev-4b-v12.1.0-aligned-s42-step0256').listing_note,/Its #5 place on the API Composite A list is within the uncertainty of the draw shift\.$/);
 assert.match(by.get('arcbright-elf-1-12b-r2').listing_note,/Its #5 place on the open-weights Composite A and C lists/);
 assert.equal(by.get('subq-snap-1.2').endpoint_kind,'api');
});
test('Cue binds accepted measurement, disclosed confidence rule, cost and cited base; Starlord base is disclosed',()=>{
 const s=by.get('cue-reflex-4b-v0.2');assert.equal(s.author,'OidLabs Team (oidlabs)');assert.equal(s.endpoint_kind,'gpu');assert.equal(s.v16.lane,'selfhosted');
 assert.equal(s.model_pin,'oidlabs/cue-reflex-4B@a36bd3ec3020f567d43ffb95ba6323a44d6a0ccf');
 assert.match(s.notes,/yes\/no confidence rule/);assert.match(s.notes,/0\.199/);assert.match(s.notes,/0\.801/);
 assert.ok(Math.abs(s.scores.A-72.67225103253114)<1e-9);assert.ok(Math.abs(s.cost.usd_per_1000-0.0026224196606677587)<1e-9);
 for(const[k,label]of [['cue-reflex-4b-v0.2','google/gemma-4-E4B-it'],['starlord-4b-preview','Qwen/Qwen3.5-4B']]){
  const b=baseModelFor('jevbench',k);assert.equal(b.status,'disclosed');assert.equal(b.label,label);assert.ok(b.sources.length);assert.match(b.sources[0].url,/\/blob\/[a-f0-9]{40}\/README\.md$/);
 }
});
