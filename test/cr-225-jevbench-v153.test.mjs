import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readJevbenchV152Release, readJevbenchV153Release } from '../lib/jevbench-v15-release.mjs';
const { artifact: before, sha256: parentHash } = await readJevbenchV152Release();
const { artifact: after } = await readJevbenchV153Release();
const newKeys = ['bev-bonsai-27b', 'bosun-v31-0.6b', 'deem-0.8-v1', 'evalengine-decision-4b', 'instinct-dual-4b', 'laya-multilingual', 'laya-typed-decisions'];
test('CR-225 preserves all existing measurements and all three top fives', () => {
  assert.equal(parentHash, '01e1f0019ca3bd3b1183f5b701f069ba0c7bf52462d1103f88a03e01339c968b');
  assert.deepEqual(after.parent_release, { revision: 'v1.5.2', sha256: parentHash });
  assert.equal(after.n_ranked, 105); assert.equal(after.roster_count, 111);
  for (const key of ['G_med', 'method_sha256', 'pricing_addendum_sha256', 'headline_method_addendum_sha256', 'sample', 'options', 'not_measured']) assert.deepEqual(after[key], before[key]);
  for (const old of before.systems) {
    const now = after.systems.find(r => r.key === old.key);
    for (const key of Object.keys(old).filter(k => !['ranks','rank'].includes(k))) assert.deepEqual(now[key],old[key],`${old.key}.${key}`);
  }
  assert.deepEqual(after.systems.filter(r => !before.systems.some(o => o.key === r.key)).map(r => r.key).sort(),newKeys);
  for (const o of ['A','B','C']) {
    assert.deepEqual(after.board[o].order.slice(0,5),before.board[o].order.slice(0,5));
    for (const [i,k] of after.board[o].order.entries()) assert.equal(after.systems.find(r => r.key===k).ranks[o],i+1);
    for (const marker of after.board[o].markers) {
      assert.ok(before.board[o].markers.some(m => JSON.stringify(m)===JSON.stringify(marker)));
      assert.equal(after.board[o].order.indexOf(marker.lower),after.board[o].order.indexOf(marker.upper)+1);
    }
    assert.ok(!after.board[o].order.includes('classifier-dev-fast'));
  }
});
test('CR-225 partial Decision-4B has no score/rank/axes and is distinct from FlyMyJev', () => {
  const r=after.systems.find(r=>r.key==='evalengine-decision-4b');
  assert.equal(r.listing,'unranked');assert.equal(r.ranked,false);assert.equal(r.status.status,'partial');
  assert.equal(r.status.answered_ok,1550);assert.equal(r.status.rows,1624);assert.equal(r.full_coverage,false);
  assert.equal(r.jevbench_score,null);assert.equal(r.rank,null);assert.equal(r.composite_ci95,null);assert.equal(r.intelligence,null);
  for(const x of [...Object.values(r.scores),...Object.values(r.ranks),...Object.values(r.axes)])assert.equal(x,null);
  assert.match(r.not_ranked_because,/PARTIAL \/ UNRANKED/);assert.match(r.underlying,/our evaluator|Our H100/);
  assert.equal(r.api_flag,false);assert.ok(after.systems.some(r=>r.key==='decision-4b-v12'));
});
test('CR-225 binds independent mmBERT release adoption and honest API/CPU disclosures', async () => {
  const side=JSON.parse(await readFile('data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.3-a4-addendum.json','utf8'));
  const d=side.release_base_listing_adoption;
  assert.equal(d.adopted_by,'allout-jevbench-addendum-20260929 release owner');assert.equal(d.absolute_delta,0);
  assert.deepEqual(d.snapshot_counts,{openrouter:458,deepinfra:383});assert.deepEqual(d.no_match,{openrouter:[],deepinfra:[]});
  const rows=after.systems.filter(r=>newKeys.includes(r.key));
  assert.deepEqual(rows.filter(r=>r.api_flag).map(r=>r.key),['instinct-dual-4b']);
  for(const key of ['laya-multilingual','laya-typed-decisions','bosun-v31-0.6b']){
    const r=rows.find(r=>r.key===key);assert.equal(r.endpoint_kind,'cpu');assert.equal(r.cost.kind,'estimate');assert.match(r.underlying,/shared/i);
  }
  const bytes=await readFile('data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.3-a4-addendum.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),after.addendum_sources_sha256.A4_projected_rows);
});
