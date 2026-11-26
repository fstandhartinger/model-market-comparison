import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {imageJevBoardSystems,imageJevCompareRows} from '../lib/imagejev-board.mjs';
import {withTs20} from '../lib/imagejev-ts20.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const a=read('data/imagejev-v03.json'),key='minimodels_vision_one',row=a.ranking.find(r=>r.key===key);

test('CR-866: Minimodels Vision One is a ranked normal v0.3.0 row (board #9 #86269)',()=>{
 assert.equal(row.ranked,true);assert.equal(row.rank,34);assert.equal(row.listing,'ranked');assert.equal(row.not_ranked_because,null);
 assert.equal(row.name,'Minimodels Vision One');assert.equal(row.kind,'gpu');
 for(const rows of [imageJevBoardSystems(a),imageJevCompareRows(a)])assert.equal(rows.find(r=>r.key===key).rank,34);
 assert.equal(a.ranking.filter(r=>r.ranked).length,66);
 const c=row.tracks.core;
 assert.equal(c.capability,70.77834055676654);
 assert.equal(c.composite.score,13.84336467356838);
 assert.equal(c.cost.usd_per_1000,0.28339626980023225);
 assert.equal(c.speed.raw_p50_s,0.6785887199998797);assert.equal(c.speed.raw_p95_s,2.916704440000103);
 assert.equal(c.failures,0);assert.equal(c.n_public+c.n_sealed,1174);
 assert.equal(row.tracks['computer-use'].capability,95.43479710690384);
 assert.equal(row.tracks['computer-use'].composite.score,37.89826137225245);
 assert.equal(row.last_measured_utc.slice(0,10),'2026-11-26');
});

test('CR-866: pinned open weights, no invented base checkpoint',()=>{
 assert.match(row.repo,/minimodels-ai\/vision-one\/tree\/a3e9376db22e0b31474c1eb41233735f3aa05b22$/);
 assert.equal(row.licence,'Apache-2.0');assert.equal(row.open,true);
 assert.equal(row.underlying??null,null,'the author names no base checkpoint');
 const b=read('data/jevbench-base-models.json').benchmarks.imagejevbench[key];
 assert.equal(b.status,'undisclosed');assert.equal(b.label,'undisclosed');
 assert.match(b.note,/not named by the author/);assert.match(b.note,/Gemma4ForConditionalGeneration/);
 assert.match(b.sources[0].url,/a3e9376db22e0b31474c1eb41233735f3aa05b22\/README\.md$/);
});

test('CR-866: serving, hardware, routing-budget and reasoning-share disclosures (#86269)',()=>{
 for(const s of ['vllm/vllm-openai:v0.34.0','20fdb089454afbb324efa4110a2c025ff7b27cc1a086e07aa580b18df8ad1ce1','/v1/systemone server.py, unmodified',
  'Online FP8 W8A8 quantization of the BF16 weights (the author\'s setting)','dspark_b8','RTX PRO 6000',
  'Measured on one RTX PRO 6000 at the server\'s 9.15 s routing budget; results can differ on faster or slower hardware.',
  'A reasoning pass started on 258 of 1,500 items (17.2 %, usage output_tokens > 0) and its readout was used on 129 (8.6 %, server cot_requests)',
  'require_complete_cot','Server latency mean 0.75 s, max 3.8 s','1,500 of 1,500 answered, 0 errors'])assert.ok(row.measurement_source.includes(s),s);
 assert.match(row.pricing_note,/USD 1\.19 per GPU-hour/);assert.match(row.pricing_note,/USD 3\.12 per hour/);
 assert.equal(row.tracks.core.cost.source,'measured GPU seconds x $1.19/GPU-hour');
 const page=readFileSync('components/ImageJevV03Page.tsx','utf8');
 assert.match(page,/26 Nov 2026 addendum, new row:<\/b> adds Minimodels Vision One/);
 assert.match(page,/results can differ on faster or slower hardware/);
 assert.match(page,/The core composite top five and the capped core Capability top five are unchanged/);
 assert.match(page,/Existing composite ranks from #34 down move down one place/);
});

test('CR-866: TS20 absent under a temporary exception with a visible disclosure',()=>{
 const ts=read('data/imagejev-ts20-categories.json');assert.equal(ts.systems[key],undefined);assert.equal(ts.summary[key],undefined);
 const cats=withTs20(a.categories,ts);assert.equal(cats.systems[key].typesafe,undefined);
 assert.equal(cats.missing[key],'TypeSafe-20 not run in the paid core session; a follow-up adds the cells');
 const ex=read('data/jevbench-breakdown-exceptions.json').entries.filter(e=>e.key===key);assert.equal(ex.length,1);
 assert.equal(ex[0].board,'imagejevbench');assert.deepEqual(ex[0].dims,['typesafe']);
 assert.equal(ex[0].reason,'temporary: TS20 bank not run in the paid core session; follow-up CR adds the cells');
 assert.match(ex[0].decision,/board #9 #86260/);assert.match(ex[0].decision,/#86269/);
 assert.match(readFileSync('components/ImageJevV03Page.tsx','utf8'),/For Minimodels Vision One, TypeSafe-20 was not run in the paid core session; a follow-up adds the cells \(temporary gap\)\./);
});

test('CR-866: one-read coverage, cell floor n >= 30 and no small-sample treatment',()=>{
 const c=read('data/raw/benchmarks/jevbench/multimodal-preview/answered-coverage-v0.3.json').systems[key];
 assert.equal(c.source.output_sha256,'29e132a3a7c8963cbe45bd3c7cbdf054d0df00be70941023ad9120da5c0a9550');assert.equal(c.source.public_score_sha256,row.source_sha256);
 const s=a.categories.systems[key];assert.equal(s.capabilities.surface_inspection,undefined,'19-item cell withheld under the 30-item floor');
 for(const dim of ['capabilities','usecases']){
  assert.equal(Object.values(s[dim]).reduce((n,v)=>n+v[1],0),dim==='capabilities'?1481:1500);
  for(const v of Object.values(s[dim]))assert.ok(v[1]>=30&&v[2]>=30);
 }
 assert.ok(row.tracks.core.n_public+row.tracks.core.n_sealed>=30&&row.tracks['computer-use'].n_public+row.tracks['computer-use'].n_sealed>=30);
 assert.ok(!('small_sample' in row)&&!('low_sample' in row));
});

test('CR-866: existing rows keep their dates; the new row shares the recomputed field metadata',()=>{
 const prev=a.ranking.find(r=>r.key==='h2o_lightning_31b_v134_image');
 for(const t of ['core','computer-use'])assert.equal(row.tracks[t].rotation_adjustment.field_median_gap_pp,prev.tracks[t].rotation_adjustment.field_median_gap_pp);
 assert.equal(row.tracks.core.rotation_adjustment.field_median_gap_pp,-1.6622426006391429);
 assert.equal(row.tracks.core.rotation_adjustment.penalty_points,0);
});
