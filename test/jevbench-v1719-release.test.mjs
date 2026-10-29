import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bundle} from '../r198/v1719/validate_v1719.mjs';
import {validateJevbenchV1719Bundle,readJevbenchV1719ForBoard,V1719_NEW_KEYS} from '../lib/jevbench-v1719-release.mjs';
test('v1.7.19 hosted unranked and unpriced candidate and release negatives',()=>assert.equal(validateJevbenchV1719Bundle(bundle,{candidate:true}),true));
test('PENDING is hidden; synthetic PASS exposes v1.7.19',async()=>{const r=await readJevbenchV1719ForBoard();assert.equal(r?.artifact.revision??null,bundle.manifest.review.verdict==='PASS'?'v1.7.19':null)});
test('new hosted rows have the same absent cost fields as the unpriced precedent',()=>{
 const precedent=bundle.previous.artifact.systems.find(s=>s.key==='tde-general-large');
 for(const k of V1719_NEW_KEYS){const s=bundle.artifact.systems.find(s=>s.key===k);for(const f of ['kind','usd_per_1000','common_basis'])assert.deepEqual(s.cost[f],precedent.cost[f]);assert.deepEqual(s.scores,precedent.scores);assert.deepEqual(s.composite_ci95,precedent.composite_ci95);assert.equal(s.axes.cost,null);assert.match(s.cost.basis,/NOT PRICED/);}
});
test('new rows have measured use-case and language cells; only topics are excepted',()=>{
 const entries=JSON.parse(readFileSync('data/jevbench-breakdown-exceptions.json')).entries;
 for(const k of V1719_NEW_KEYS){assert.deepEqual(entries.find(x=>x.key===k).dims,['topics']);for(const d of ['families','usecases','languages'])assert.ok(Object.keys(bundle.categories.systems[k][d]).length);assert.equal(bundle.categories.systems[k].topics,undefined);}
});
test('release page and draw metadata use the 27 Oct draw and complete predecessor navigation',()=>{
 const page=readFileSync('app/jev-models/v1.7.19/page.tsx','utf8');assert.match(page,/Previous v1\.7\.18/);assert.match(page,/27 Oct regular draw/);assert.match(page,/not priced/);assert.match(page,/harness resend bug/);assert.doesNotMatch(page,/answer file was lost|KnowLine/);
 const draw=JSON.parse(readFileSync('data/jevbench-draw-equating.json')).draws.find(d=>d.draw==='v1.6-regular-20261027');assert.equal(draw.status,'anchor-runs-pending');assert.deepEqual(draw.offset,{I:0,C:0});assert.ok(draw.releases.includes('v1.7.19'));
});
