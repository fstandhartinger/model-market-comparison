import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { languageCoverage, jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import { validateRadarSpokeGate } from '../lib/jevbench-radar-spoke-gate.mjs';
const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const key='mercury-decide', path='ops/evidence/mercury-language-category-20261009.json';
const evidence=read(path), language=read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-language-cells.json');
const category=read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-category-cells.json');
const sha='67315b62bf10244bef77ccfc5d108c35bed2c29bc1ef11bf808508fe995e31ce';
test('Mercury cells copy the official offline aggregate exactly',()=>{
 assert.equal(createHash('sha256').update(readFileSync(new URL(`../${path}`,import.meta.url))).digest('hex'),sha);
 assert.deepEqual(language.systems[key].languages,evidence.languages);
 for(const dim of ['families','topics','usecases','category_spoke_n','category_n_items']) assert.deepEqual(category.systems[key][dim],evidence[dim]);
 for(const source of [language,category]) assert.equal(source.row_provenance[key].sha256,sha);
});
test('All27 category spokes are finite and covered while language coverage remains partial',()=>{
 const view=jevbenchCategoryView('v1.6.1',[key],{supplement:true});
 validateRadarSpokeGate(view,[key],[]);
 for(const [dim,n] of [['topics',7],['usecases',20]]){
  assert.equal(Object.keys(evidence[dim]).length,n);
  for(const [name,cell] of Object.entries(evidence[dim])){
   assert.ok(Number.isFinite(cell.competence));assert.ok(cell.coverage_n>=30);
   assert.deepEqual(view.systems[key][dim][name],[cell.competence,cell.n,cell.coverage_n]);
  }
 }
 assert.equal(read('data/jevbench-radar-spoke-exceptions.json').some(x=>x.key===key),false);
 const cells=Object.values(evidence.languages);
 assert.equal(cells.length,23);assert.equal(Math.min(...cells.map(c=>c.coverage_n)),47);
 assert.equal(cells.filter(c=>c.coverage_n<60).length,18);
 assert.equal(evidence.gates.languages23_ge60,false);
 assert.equal(language.systems[key].language_target_complete,false);
 assert.match(languageCoverage(language.systems[key]),/L3 partial/);
});
test('Success, reviewed422 coverage and spent429 remain distinct without a completion claim',()=>{
 assert.deepEqual(evidence.L3,{complete:false,denominator:1418,never_issued:550,operational429:1,reviewed422:3,spent_records:868,successful200:864,unanswered_success:554});
 for(const dim of ['languages','topics','usecases']) for(const cell of Object.values(evidence[dim])){
  assert.equal(cell.n,cell.response_n+cell.refusal_n+cell.operational_failure_n);
  assert.equal(cell.coverage_n,cell.response_n+cell.refusal_n);
 }
 for(const source of [language,category]){
  assert.equal(source.systems[key].native_complete_claim,false);
  assert.equal(source.systems[key].L3_complete_claim,false);
  assert.equal(source.systems[key].new_full_S1200_API_exposure,false);
  assert.equal(source.row_provenance[key].headline_or_rank_changed,false);
 }
});
test('Public handoff contains only aggregates and honest original-history provenance',()=>{
 const raw=readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
 assert.doesNotMatch(raw,/"(?:item_ids?|question|gold|prediction|task_id|per_item)"|\/home\/flori\/jevbench-sealed/i);
 assert.equal(evidence.method,'official O1S');assert.equal(evidence.parent_public_precedence_unchanged,true);
 assert.equal(evidence.headline_changed,false);assert.equal(evidence.native_complete_claim,false);
 assert.equal(language.row_provenance[key].historical_S_observed,1200);
});
