import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertReleaseHistory} from './helpers/release-history.mjs';
import {
  hasPublishedJevbenchV187Release,
  readJevbenchV187ForBoard,
  V187_NEW_KEYS,
  V187_NOTE,
} from '../lib/jevbench-v187-release.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
import {jevMethodLabel, JEV_METHOD_LABEL} from '../lib/jev-decision-limit.mjs';

const root='data/raw/benchmarks/jevbench/v1.8/';
const load=(version,name)=>JSON.parse(readFileSync(`${root}jevbench-${version}-${name}.json`));

test('v1.8.7 carries all v1.8.6 rows, categories and order lists exactly',()=>{
  const base=load('v1.8.6','results');
  const release=load('v1.8.7','results');
  const byKey=new Map(release.systems.map(row=>[row.key,row]));
  const cleaned=JSON.parse(readFileSync('r198/v187/inputs/CLEANED-ROWS.json'));
  for(const row of base.systems)assert.deepEqual(byKey.get(row.key),cleaned[row.key]??row);
  assert.deepEqual(release.board,base.board);
  assert.equal(release.systems.length,base.systems.length+V187_NEW_KEYS.length);
  assert.equal(release.roster_count,base.roster_count+V187_NEW_KEYS.length);
  assert.equal(release.n_ranked,base.n_ranked);
  const oldCategories=load('v1.8.6','categories').systems;
  const newCategories=load('v1.8.7','categories').systems;
  for(const [key,cells] of Object.entries(oldCategories))assert.deepEqual(newCategories[key],cells);
});

test('the one hosted addition is unranked, pinned to the OpenRouter page, and priced at the published tariff',()=>{
  assert.deepEqual(V187_NEW_KEYS,['nvidia/nemotron-3.5-super-vl']);
  const row=load('v1.8.7','results').systems.find(item=>item.key===V187_NEW_KEYS[0]);
  const usage=JSON.parse(readFileSync('r198/v187/src/usage.json'))[row.key];
  assert.equal(row.display,'NVIDIA Nemotron 3.5 Super VL');
  assert.equal(row.author,'NVIDIA');
  assert.equal(row.ranked,false);assert.equal(row.rank,null);assert.equal(row.not_ranked_because,V187_NOTE);
  assert.deepEqual(row.ranks,{A:null,B:null,C:null,capability:null});
  assert.equal(row.paid_fast_lane,false);assert.equal(row.api_flag,true);assert.equal(row.endpoint_kind,'api');
  assert.equal(row.repo,'https://openrouter.ai/nvidia/nemotron-3.5-super-vl');
  assert.equal(row.model_pin,row.repo);
  assert.equal(row.draw.release,'v1.8.7');assert.equal(row.draw.status,'anchor-runs-pending');
  assert.deepEqual(row.draw.offset,{I:0,C:0});
  assert.equal(row.cost.kind,'tariff');assert.equal(row.cost.common_basis.n_items,1489);
  assert.equal(usage.ref.in,.1);assert.equal(usage.ref.out,.4);
  assert.equal(usage.ref.module_sha256,'2f52370fe1dba73d75a770a386df350cc76a0898304aeba9e29c91f6e4d3738b');
  assert.equal(usage.cost_common,usage.list_common);assert.equal(usage.cost_all,usage.list_all);
  assert.equal(row.cost.usd_per_1000,usage.cost_common);
  assert.equal(row.cost.common_basis.usd_per_1000_all_items,usage.cost_all);
  assert.equal(usage.input_tokens_all,1015566);assert.equal(usage.output_tokens_all,62716);
  for(const phrase of ['REASONING DISABLED','reasoning.enabled=false','a reasoning-on configuration could score differently','published OpenRouter tariff','USD 0.10 per million input tokens','USD 0.40 per million output tokens'])assert.ok(row.disclosure.includes(phrase),phrase);
  for(const phrase of ['provider Crusoe','fallbacks off','Every one of the 1,500 responses','Strict json_schema','temperature 0','max_tokens 4096','You are a calibration engine.','56 upstream rate-limit responses','not counted as answers','from our server in Germany over OpenRouter'])assert.ok(row.endpoint_condition.includes(phrase),phrase);
  assert.ok(row.cost.basis.includes('2f52370fe1dba73d75a770a386df350cc76a0898304aeba9e29c91f6e4d3738b'));
  assert.ok(row.cost.basis.includes('2026-11-03T05:45:33Z'));
});

test('v1.8.7 visibility and the All-data loader follow independent review',async()=>{
  const visible=load('v1.8.7','publication').review.verdict==='PASS';
  assert.equal(await hasPublishedJevbenchV187Release(),visible);
  assert.equal(Boolean(await readJevbenchV187ForBoard()),visible);
  assert.equal(Boolean(await readJevAllDataInput('v1.8.7')),visible);
  assert.equal(readFileSync('lib/jevbench-alldata-input.mjs','utf8').split("'v1.8.7':").length-1,1);
});

test('method labels preserve v1.7 behavior and label v1.8.7 consistently',()=>{
  for(let i=0;i<=23;i++)assert.equal(jevMethodLabel(`v1.7.${i}`),JEV_METHOD_LABEL);
  assert.equal(jevMethodLabel('v1.8.6'),'method v1.8 (10 s rule, GPU-time cost basis)');
  assert.equal(jevMethodLabel('v1.8.7'),'method v1.8 (10 s rule, GPU-time cost basis)');
});

test('the 27 Oct draw release registry lists v1.8.7 right after v1.8.6',()=>{
  const draw=JSON.parse(readFileSync('data/jevbench-draw-equating.json')).draws.find(item=>item.draw==='v1.6-regular-20261027');
  const previous=load('v1.8.6','proof').revision;
  assert.equal(previous,'v1.8.6');
  assertReleaseHistory(assert,draw,['v1.7.13','v1.7.14','v1.7.15','v1.7.16','v1.7.17','v1.7.19','v1.7.21','v1.7.22','v1.8.1','v1.8.2','v1.8.3','v1.8.4','v1.8.5',previous,'v1.8.7']);
});

test('release page names its one-row addition and links v1.8.6',()=>{
  const page=readFileSync('app/jev-models/v1.8.7/page.tsx','utf8');
  assert.ok(page.includes('href="/jev-models/v1.8.6">Previous v1.8.6</a>'));
  assert.ok(page.includes('one unranked row'));
  assert.ok(page.includes('One more row on the 27 Oct regular draw (NVIDIA Nemotron 3.5 Super VL, hosted, reasoning off), shown unranked until the draw is equated to the reference scale.'));
  assert.ok(!page.includes('four unranked rows')&&!page.includes('five unranked rows'));
});
