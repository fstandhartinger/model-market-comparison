import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertReleaseHistory} from './helpers/release-history.mjs';
import {
  hasPublishedJevbenchV188Release,
  readJevbenchV188ForBoard,
  V188_NEW_KEYS,
  V188_NOTE,
} from '../lib/jevbench-v188-release.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
import {jevMethodLabel, JEV_METHOD_LABEL} from '../lib/jev-decision-limit.mjs';

const root='data/raw/benchmarks/jevbench/v1.8/';
const load=(version,name)=>JSON.parse(readFileSync(`${root}jevbench-${version}-${name}.json`));

test('v1.8.8 carries all v1.8.7 rows, categories and order lists exactly',()=>{
  const base=load('v1.8.7','results');
  const release=load('v1.8.8','results');
  const byKey=new Map(release.systems.map(row=>[row.key,row]));
  const cleaned=JSON.parse(readFileSync('r198/v188/inputs/CLEANED-ROWS.json'));
  for(const row of base.systems)assert.deepEqual(byKey.get(row.key),cleaned[row.key]??row);
  assert.deepEqual(release.board,base.board);
  assert.equal(release.systems.length,base.systems.length+V188_NEW_KEYS.length);
  assert.equal(release.roster_count,base.roster_count+V188_NEW_KEYS.length);
  assert.equal(release.n_ranked,base.n_ranked);
  const oldCategories=load('v1.8.7','categories').systems;
  const newCategories=load('v1.8.8','categories').systems;
  for(const [key,cells] of Object.entries(oldCategories))assert.deepEqual(newCategories[key],cells);
});

test('author-hosted row uses an unverified base estimate, frozen refusal policy and no weights pin',()=>{
 const row=load('v1.8.8','results').systems.find(r=>r.key===V188_NEW_KEYS[0]);
 const u=JSON.parse(readFileSync('r198/v188/src/usage.json'))[row.key];
 assert.deepEqual(V188_NEW_KEYS,['sd-jev-4b-v12.1.0-aligned-s42-step0256']);
 assert.equal(row.display,'SD-JEV-4B-v12.1.0 (Kego, author-hosted API)');assert.equal(row.author,'Kego');
 assert.equal(row.ranked,false);assert.equal(row.rank,null);assert.equal(row.not_ranked_because,V188_NOTE);
 assert.deepEqual(row.ranks,{A:null,B:null,C:null,capability:null});
 assert.equal(row.paid_fast_lane,true);assert.equal(row.api_flag,true);assert.equal(row.endpoint_kind,'api');
 assert.equal(row.repo,null);assert.equal(row.model_pin,null);assert.equal(row.draw.release,'v1.8.8');
 assert.equal(row.cost.kind,'estimate');assert.equal(row.cost.common_basis.n_items,1489);
 assert.equal(u.input_tokens_all,535592);assert.equal(u.output_tokens_all,0);
 assert.equal(row.cost.usd_per_1000,Math.min(u.list_common,u.gpu_common));
 assert.equal(row.status.answered_ok,1495);assert.equal(row.v16.n_items,1500);
 assert.ok(row.disclosure.includes('Calibration is computed on the 1,495 answered items, as for every row with refused requests.'));
 assert.ok(row.cost.basis.includes('NOT verified (API-only)'));assert.ok(row.cost.basis.includes('no public tariff exists'));
});

test('v1.8.8 visibility and the All-data loader follow independent review',async()=>{
  const visible=load('v1.8.8','publication').review.verdict==='PASS';
  assert.equal(await hasPublishedJevbenchV188Release(),visible);
  assert.equal(Boolean(await readJevbenchV188ForBoard()),visible);
  assert.equal(Boolean(await readJevAllDataInput('v1.8.8')),visible);
  assert.equal(readFileSync('lib/jevbench-alldata-input.mjs','utf8').split("'v1.8.8':").length-1,1);
});

test('method labels preserve v1.7 behavior and label v1.8.8 consistently',()=>{
  for(let i=0;i<=23;i++)assert.equal(jevMethodLabel(`v1.7.${i}`),JEV_METHOD_LABEL);
  assert.equal(jevMethodLabel('v1.8.7'),'method v1.8 (10 s rule, GPU-time cost basis)');
  assert.equal(jevMethodLabel('v1.8.8'),'method v1.8 (10 s rule, GPU-time cost basis)');
});

test('the 27 Oct draw release registry lists v1.8.8 right after v1.8.7',()=>{
  const draw=JSON.parse(readFileSync('data/jevbench-draw-equating.json')).draws.find(item=>item.draw==='v1.6-regular-20261027');
  const previous=load('v1.8.7','proof').revision;
  assert.equal(previous,'v1.8.7');
  assertReleaseHistory(assert,draw,['v1.7.13','v1.7.14','v1.7.15','v1.7.16','v1.7.17','v1.7.19','v1.7.21','v1.7.22','v1.8.1','v1.8.2','v1.8.3','v1.8.4','v1.8.5','v1.8.6',previous,'v1.8.8']);
});

test('release page names its one-row addition and links v1.8.7',()=>{
  const page=readFileSync('app/jev-models/v1.8.8/page.tsx','utf8');
  assert.ok(page.includes('href="/jev-models/v1.8.7">Previous v1.8.7</a>'));
  assert.ok(page.includes('one unranked row'));
  assert.ok(page.includes('One more row on the 27 Oct regular draw (SD-JEV-4B-v12.1.0, an author-hosted API), shown unranked until the draw is equated to the reference scale.'));
  assert.ok(!page.includes('four unranked rows')&&!page.includes('five unranked rows'));
});
