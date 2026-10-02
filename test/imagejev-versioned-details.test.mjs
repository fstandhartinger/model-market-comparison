import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readMultimodalPreview, readMultimodalPreviewV02, readArchivedMultimodalPreviewV014 } from '../lib/jevbench-multimodal-preview.mjs';
import { imageJevDetailsFromArtifact, readImageJevDetails, findImageJevDetail } from '../lib/imagejev-details.mjs';
import { imageJevSystemPath, imageJevBoardPath, imageJevSourceUrl, IMAGE_JEV_DETAIL_VERSIONS } from '../lib/imagejev-system-links.mjs';

const {artifact:v02} = await readMultimodalPreviewV02();
const v015 = await readMultimodalPreview();
const {artifact:v014} = await readArchivedMultimodalPreviewV014();

test('actual 51 v02 identities resolve independently from both pinned 50-row archives', async () => {
  const sourceSnapshots = [v02,v015,v014].map(a=>JSON.stringify(a));
  const bundles = await Promise.all(IMAGE_JEV_DETAIL_VERSIONS.map(v=>readImageJevDetails(v)));
  assert.deepEqual(bundles.map(b=>b.systems.length),[51,50,50]);
  for(const [i,artifact] of [v02,v015,v014].entries()) {
    const bundle=bundles[i];
    assert.equal(new Set(bundle.systems.map(r=>r.key)).size,bundle.systems.length);
    for(const original of [...artifact.ranking,...(artifact.measured_unrankable_rows??[])]) {
      const detail=bundle.systems.find(r=>r.key===original.key);
      const track=original.tracks[i===0?'core':'all'];
      assert.equal(detail.revision,IMAGE_JEV_DETAIL_VERSIONS[i]);
      assert.equal(detail.rank,original.rank);
      assert.equal(detail.jevbench_score,track.composite?.score??null);
      assert.deepEqual(detail.axes,track.axes);
      assert.equal(detail.cost.usd_per_1000,track.cost?.usd_per_1000??null);
      for(const [name,field] of [['p50_s_raw','raw_p50_s'],['p95_s_raw','raw_p95_s'],['p50_s_adjusted','adjusted_p50_s'],['p95_s_adjusted','adjusted_p95_s']]) {
        assert.equal(detail.speed[name],track.speed[field],`${detail.revision}/${detail.key}/${name}`);
      }
    }
  }
  assert.deepEqual([v02,v015,v014].map(a=>JSON.stringify(a)),sourceSnapshots);
  const wity=bundles.map(b=>b.systems.find(r=>r.key==='wity_1'));
  assert.notEqual(wity[0].jevbench_score,wity[1].jevbench_score);
  assert.notEqual(wity[1].jevbench_score,wity[2].jevbench_score);
});

test('CORE NULLs, historical references and historical Imajev cannot inherit a rank or current identity', () => {
  const rows=imageJevDetailsFromArtifact(v02);
  assert.deepEqual(['ranked','measured-unrankable','historical-reference'].map(s=>rows.filter(r=>r.status===s).length),[45,3,3]);
  for(const row of rows.filter(r=>r.status!=='ranked')) {
    assert.equal(row.rank,null); assert.equal(row.jevbench_score,null); assert.equal(row.ranked,false);
    assert.equal(row.axes.cost,null); assert.equal(row.cost.usd_per_1000,null);
    assert.ok(row.reason);
  }
  for(const row of rows.filter(r=>r.status==='historical-reference')) {
    assert.deepEqual(Object.values(row.axes),[null,null,null,null]);
    assert.deepEqual(Object.values(row.speed).slice(0,4),[null,null,null,null]);
    assert.equal(row.source_url,null);
    assert.equal(row.reference.revision,'v0.1.4');
    assert.equal(row.reference.score,v014.ranking.find(r=>r.key===row.key).score);
    assert.equal(imageJevSourceUrl(row.key,'https://available.example/current','v0.2.0'),null);
  }
  const historical=rows.find(r=>r.key==='imajev_4b_20260926');
  const current=rows.find(r=>r.key==='imajev_4b');
  assert.ok(current.ranked); assert.equal(historical.reference,null);
  assert.equal(historical.status,'measured-unrankable'); assert.equal(historical.axes.intelligence,0);
  assert.equal(historical.source_url,null);
  assert.match(historical.inference_setting,/Do not substitute current adapter c9e5f132/);
  assert.match(historical.reason,/573 explicit item inference errors/);
  assert.notEqual(imageJevSystemPath(current.key,'v0.2.0'),imageJevSystemPath(historical.key,'v0.2.0'));
  for(const key of ['standard_one_8b','standard_one_3b']) {
    const r=rows.find(r=>r.key===key); assert.equal(r.status,'measured-unrankable');
    assert.equal(r.reference.score,v014.ranking.find(r=>r.key===key).score);
    assert.notEqual(r.speed.p50_s_raw,r.speed.p50_s_adjusted);
  }
  const duplicate=structuredClone(v02);duplicate.measured_unrankable_rows.push(duplicate.ranking[0]);
  assert.throws(()=>imageJevDetailsFromArtifact(duplicate),/Duplicate/);
});

test('explicit static routes have no sibling dynamic-slug collision; legacy route defaults to v02', async () => {
  assert.equal((await readImageJevDetails()).revision,'v0.2.0');
  assert.equal(await findImageJevDetail('imajev_4b_20260926','v0.1.5'),null);
  assert.equal(await findImageJevDetail('missing'),null);
  assert.equal(await readImageJevDetails('v0.1.3'),null);
  assert.equal(imageJevSystemPath('key / spaced'),'/image-jev-bench/key%20%2F%20spaced');
  assert.throws(()=>imageJevSystemPath('a','v0.1.3'),/Unsupported/);
  assert.throws(()=>imageJevBoardPath('v0.1.3'),/Unsupported/);
  for(const revision of IMAGE_JEV_DETAIL_VERSIONS) {
    assert.equal(imageJevSystemPath('wity_1',revision),`/image-jev-bench/${revision}/wity_1`);
    assert.equal(imageJevBoardPath(revision),`/image-jev-bench?version=${revision}`);
    const route=await readFile(new URL(`../app/image-jev-bench/${revision}/[system]/page.tsx`,import.meta.url),'utf8');
    assert.ok(route.includes(`readImageJevDetails('${revision}')`));
    assert.ok(route.includes(`revision: '${revision}'`)); assert.match(route,/dynamicParams = false/);
  }
  const legacy=await readFile(new URL('../app/image-jev-bench/[system]/page.tsx',import.meta.url),'utf8');
  assert.match(legacy,/readImageJevDetails\(\)/); assert.match(legacy,/'v0.2.0', true/);
});

test('selected-version Wity tariffs retain primary/alternative cost scores, basis and source', () => {
  for(const artifact of [v02,v015,v014]) {
    const original=artifact.ranking.find(r=>r.key==='wity_1');
    const row=imageJevDetailsFromArtifact(artifact).find(r=>r.key==='wity_1');
    assert.deepEqual(row.pricing_alternative,original.pricing_alternative??null);
    assert.equal(row.cost.basis,original.tracks[row.track].cost.source);
  }
  const wity=imageJevDetailsFromArtifact(v02).find(r=>r.key==='wity_1');
  assert.equal(wity.jevbench_score,69.64955383096422);
  assert.equal(wity.cost.usd_per_1000,0.00990818181818182);
  assert.equal(wity.pricing_alternative.tracks.core.composite.score,64.67412023103621);
  assert.equal(wity.pricing_alternative.tracks.core.cost.usd_per_1000,0.03538636363636363);
  assert.match(wity.cost.basis,/Wity stated API tariff/);
  assert.match(wity.pricing_alternative.source,/Frozen 30 Sep 2026 reviewed candidate/);
});
