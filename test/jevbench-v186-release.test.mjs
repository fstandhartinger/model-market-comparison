import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  hasPublishedJevbenchV186Release,
  readJevbenchV186ForBoard,
  V186_NEW_KEYS,
  V186_NOTE,
} from '../lib/jevbench-v186-release.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
import {jevMethodLabel, JEV_METHOD_LABEL} from '../lib/jev-decision-limit.mjs';

const root='data/raw/benchmarks/jevbench/v1.8/';
const load=(version,name)=>JSON.parse(readFileSync(`${root}jevbench-${version}-${name}.json`));

test('v1.8.6 carries all v1.8.5 rows, categories and order lists exactly',()=>{
  const base=load('v1.8.5','results');
  const release=load('v1.8.6','results');
  const byKey=new Map(release.systems.map(row=>[row.key,row]));
  const cleaned=JSON.parse(readFileSync('r198/v186/inputs/CLEANED-ROWS.json'));
  for(const row of base.systems)assert.deepEqual(byKey.get(row.key),cleaned[row.key]??row);
  assert.deepEqual(release.board,base.board);
  assert.equal(release.systems.length,base.systems.length+V186_NEW_KEYS.length);
  assert.equal(release.roster_count,base.roster_count+V186_NEW_KEYS.length);
  assert.equal(release.n_ranked,base.n_ranked);
  const oldCategories=load('v1.8.5','categories').systems;
  const newCategories=load('v1.8.6','categories').systems;
  for(const [key,cells] of Object.entries(oldCategories))assert.deepEqual(newCategories[key],cells);
});

test('the one paid addition is unranked with bound serving code and dense-Gemma cost',()=>{
  assert.deepEqual(V186_NEW_KEYS,['metadecision-31b-rain']);
  const row=load('v1.8.6','results').systems.find(item=>item.key===V186_NEW_KEYS[0]);
  const usage=JSON.parse(readFileSync('r198/v186/src/usage.json'))[row.key];
  assert.equal(row.display,'MetaDecision-31B-Rain');
  assert.equal(row.author,'MeTask-Rain');
  assert.equal(row.ranked,false);assert.equal(row.rank,null);assert.equal(row.not_ranked_because,V186_NOTE);
  assert.deepEqual(row.ranks,{A:null,B:null,C:null,capability:null});
  assert.equal(row.paid_fast_lane,true);
  assert.equal(row.repo,'https://huggingface.co/MeTask-Rain/MetaDecision-31B-Rain');
  assert.equal(row.model_pin,'MeTask-Rain/MetaDecision-31B-Rain@068cb1420d40b06e48895f2fc75f29e6da37748b');
  assert.equal(row.draw.release,'v1.8.6');assert.equal(row.draw.status,'anchor-runs-pending');
  assert.deepEqual(row.draw.offset,{I:0,C:0});
  assert.equal(row.cost.common_basis.n_items,1489);
  assert.equal(usage.weights_pin,'MeTask-Rain/metask-jev-rain-31B-trained@2feff076f07711fe2fefe7a6fdcedfe4132b773e');
  assert.equal(usage.ref.base,'google/gemma-4-31B-it');assert.equal(usage.ref.in,.09);assert.equal(usage.ref.out,.34);
  assert.equal(usage.gpu.architecture_class,'dense gemma');
  assert.equal(usage.cost_common,Math.min(usage.list_common,usage.gpu_common));
  assert.equal(row.cost.usd_per_1000,usage.cost_common);
  assert.equal(row.cost.common_basis.usd_per_1000_all_items,usage.cost_all);
  for(const phrase of ['same SHA-256-bound weights','per-type temperatures','840-token drafting-prompt limit','1/50 argmax flip','time-based 9-second','597,680 processed tokens','964,173 untrimmed','5 trimmed items'])assert.ok(row.disclosure.includes(phrase),phrase);
  for(const phrase of ['FIN-03','network access cut','2,422 seconds','753,547 input and 72,602 output tokens','6,653 tokens','60% of the head and 40% of the tail'])assert.ok(row.endpoint_condition.includes(phrase),phrase);
});

test('v1.8.6 visibility and the All-data loader follow independent review',async()=>{
  const visible=load('v1.8.6','publication').review.verdict==='PASS';
  assert.equal(await hasPublishedJevbenchV186Release(),visible);
  assert.equal(Boolean(await readJevbenchV186ForBoard()),visible);
  assert.equal(Boolean(await readJevAllDataInput('v1.8.6')),visible);
  assert.equal(readFileSync('lib/jevbench-alldata-input.mjs','utf8').split("'v1.8.6':").length-1,1);
});

test('method labels preserve v1.7 behavior and label v1.8.6 consistently',()=>{
  for(let i=0;i<=23;i++)assert.equal(jevMethodLabel(`v1.7.${i}`),JEV_METHOD_LABEL);
  assert.equal(jevMethodLabel('v1.8.5'),'method v1.8 (10 s rule, GPU-time cost basis)');
  assert.equal(jevMethodLabel('v1.8.6'),'method v1.8 (10 s rule, GPU-time cost basis)');
});

test('the 27 Oct draw release registry points at v1.8.6',()=>{
  const draw=JSON.parse(readFileSync('data/jevbench-draw-equating.json')).draws.find(item=>item.draw==='v1.6-regular-20261027');
  const previous=load('v1.8.5','proof').revision;
  assert.equal(previous,'v1.8.5');
  assert.equal(draw.latest_release,'v1.8.6');
  assert.deepEqual(draw.releases.slice(-2),[previous,'v1.8.6']);
});

test('release page names its one-row addition and links v1.8.5',()=>{
  const page=readFileSync('app/jev-models/v1.8.6/page.tsx','utf8');
  assert.ok(page.includes('href="/jev-models/v1.8.5">Previous v1.8.5</a>'));
  assert.ok(page.includes('one unranked row'));
  assert.ok(page.includes('One more row on the 27 Oct regular draw (MetaDecision-31B-Rain, paid evaluation), shown unranked until the draw is equated to the reference scale.'));
  assert.ok(!page.includes('four unranked rows')&&!page.includes('five unranked rows'));
});
