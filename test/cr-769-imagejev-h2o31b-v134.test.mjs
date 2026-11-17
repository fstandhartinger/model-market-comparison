import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {imageJevBoardSystems,imageJevCompareRows} from '../lib/imagejev-board.mjs';
import {withTs20} from '../lib/imagejev-ts20.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const a=read('data/imagejev-v03.json'), key='h2o_lightning_31b_v134_image',row=a.ranking.find(r=>r.key===key);
test('CR-769: new weights get a distinct ranked image row; published v1.0.7 stays byte-identical',()=>{
 assert.equal(row.ranked,true);assert.equal(row.rank,7);assert.equal(row.listing,'ranked');
 assert.equal(row.name,'H2O-Lightning-31B v1.3.4 @c35ed950 (image)');
 assert.equal(createHash('sha256').update(JSON.stringify(a.ranking.find(r=>r.key==='h2o_lightning_31b_image'))).digest('hex'),'ab4b463175e72f8b219c6f95460ea2c2935911c5c2e9932b49d5535c760ccf60');
 for(const rows of [imageJevBoardSystems(a),imageJevCompareRows(a)])assert.equal(rows.find(r=>r.key===key).rank,7);
 assert.equal(row.tracks.core.capability,80.3429262759744);
 assert.equal(row.tracks.core.composite.score,50.964947278496204);
 assert.equal(row.tracks.core.cost.usd_per_1000,0.07542846756647015);
 assert.equal(row.tracks.core.speed.raw_p50_s,0.22006232899980205);assert.equal(row.tracks.core.failures,0);
});
test('CR-769: TS20 is absent with its own temporary exception and visible revision-specific explanation',()=>{
 const ts=read('data/imagejev-ts20-categories.json');assert.equal(ts.systems[key],undefined);assert.equal(ts.summary[key],undefined);
 assert.ok(ts.systems.h2o_lightning_31b_image);const cats=withTs20(a.categories,ts);assert.equal(cats.systems[key].typesafe,undefined);
 assert.equal(cats.missing[key],'TypeSafe-20 not measured for this revision');
 const ex=read('data/jevbench-breakdown-exceptions.json').entries.filter(e=>e.key===key);assert.equal(ex.length,1);
 assert.equal(ex[0].board,'imagejevbench');assert.deepEqual(ex[0].dims,['typesafe']);assert.equal(ex[0].decision,'board #56386');assert.match(ex[0].reason,/TEMPORARY.*container error.*17 Nov 2026/);
});
test('CR-769: pinned provenance, serving changes, one-read coverage and standard measured GPU cost',()=>{
 assert.match(row.repo,/c35ed9505f6744770dc0d74bd3f468791a7984af$/);assert.equal(row.underlying,'google/gemma-4-31B-it');assert.equal(row.licence,'H2O Model Non-Commercial Licence v1.1');
 for(const s of ['--profile two-way','8a69ffad','a36449a1','readout_orders 1','560 soft tokens','20 MiB','no max_pixels override','Image temperature 0.9','1,500 of 1,500 answered, 0 errors','Decision Index 0.3','router'])assert.ok(row.measurement_source.includes(s),s);
 assert.match(row.pricing_note,/USD 1.19 per GPU-hour/);assert.match(row.pricing_note,/USD 3.519 per hour/);
 const c=read('data/raw/benchmarks/jevbench/multimodal-preview/answered-coverage-v0.3.json').systems[key];assert.equal(c.source.output_sha256,'a30d122d03be69eb70b3a7ce667d73d6ead3ffed15501a671799ded395e9c387');assert.equal(c.source.public_score_sha256,row.source_sha256);
 assert.equal(a.categories.systems[key].capabilities.surface_inspection,undefined,'19-item cell is withheld from every display');
 for(const dim of ['capabilities','usecases']){assert.equal(Object.values(a.categories.systems[key][dim]).reduce((n,v)=>n+v[1],0),dim==='capabilities'?1481:1500);for(const v of Object.values(a.categories.systems[key][dim]))assert.ok(v[1]>=30 && v[2]>=30);}
 const page=readFileSync('components/ImageJevV03Page.tsx','utf8');assert.match(page,/17 Nov 2026 addendum, new weights/);assert.match(page,/capped Capability top five becomes/);assert.match(page,/core field-median gap/);
});
