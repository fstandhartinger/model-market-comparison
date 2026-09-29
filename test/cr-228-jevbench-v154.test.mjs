import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readJevbenchV153Release, readJevbenchV154Release } from '../lib/jevbench-v15-release.mjs';
const { artifact: before, sha256: parentHash } = await readJevbenchV153Release();
const { artifact: after } = await readJevbenchV154Release();
const newKeys = ['manchego-v21-v15'];
test('CR-228 preserves all existing measurements and all three top fives', () => {
  assert.equal(parentHash, '5c3d97440ebb1463133ce1049df78cf3fd829c5f735c053c92cf707e7b3f7b24');
  assert.deepEqual(after.parent_release, { revision: 'v1.5.3', sha256: parentHash });
  assert.equal(after.n_ranked, 106); assert.equal(after.roster_count, 112);
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

test('CR-228 binds complete native Manchego coverage, exposure, estimated cost and independent provenance', async () => {
  const r = after.systems.find(r => r.key === 'manchego-v21-v15');
  assert.deepEqual(r.ranks, {A:11, B:14, C:20});
  assert.equal(r.status.answered_ok,1624); assert.equal(r.full_coverage,true);
  assert.deepEqual(r.support,{choice:'native',noul:'native',score:'native'});
  assert.equal(r.api_flag,false); assert.equal(r.endpoint_kind,'gpu');
  assert.equal(r.cost.kind,'estimate'); assert.match(r.cost.basis,/already marked deprecated/);
  assert.match(r.underlying,/public aggregate\/family results/);
  assert.match(r.underlying,/Jev-assisted phrase filter/);
  assert.match(r.underlying,/Jev-labelled development group/);
  assert.match(r.underlying,/not a claim of fully independent development/);
  assert.equal(r.provenance.raw_sha256,'c11f5566b9e8f76bf3f82e4ebdb8ae9eb5584b4a81f726714fd82ffe6f177354');
  assert.equal(after.addendum_sources_sha256.A5_independent_recompute,'c3cf1fadaed043126363f7710bdf5dcfd2cb282dd4bd0624e2991ab94bb0565d');
  const bytes = await readFile('data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-a5-addendum.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),after.addendum_sources_sha256.A5_projected_rows);
  const partial = after.systems.find(r => r.key === 'evalengine-decision-4b');
  assert.equal(partial.ranked,false); assert.equal(partial.jevbench_score,null);
});
