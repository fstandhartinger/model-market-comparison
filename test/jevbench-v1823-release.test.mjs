import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readJevAllDataInput } from '../lib/jevbench-alldata-input.mjs';
import {
  hasPublishedJevbenchV1823Release, readJevbenchV1823Candidate,
  readJevbenchV1823ForBoard, V1823_NEW_KEYS,
} from '../lib/jevbench-v1823-release.mjs';

const load = path => JSON.parse(readFileSync(path));
const data = (rev, kind) => load(`data/raw/benchmarks/jevbench/v1.8/jevbench-${rev}-${kind}.json`);

test('v1.8.23 adds three exact unranked aggregates and preserves the predecessor field', () => {
  const current = data('v1.8.23', 'results');
  const previous = data('v1.8.22', 'results');
  const scored = load('r198/v1823/src/scored.json');
  const usage = load('r198/v1823/src/usage.json');
  const disclosures = load('r198/v1823/inputs/PUBLIC-ROWS.json');
  assert.deepEqual(V1823_NEW_KEYS, ['sieve-31b-v4', 'starlord-27b-v2-2-preview', 'starlord-4b-v2.2-preview']);
  assert.equal(current.systems.length, 369);
  assert.deepEqual(current.systems.filter(row => !V1823_NEW_KEYS.includes(row.key)), previous.systems);
  assert.deepEqual(current.not_measured, previous.not_measured);
  assert.deepEqual(current.board, previous.board);
  assert.equal(current.n_ranked, previous.n_ranked);
  for (const key of V1823_NEW_KEYS) {
    const row = current.systems.find(system => system.key === key);
    const source = scored[key]['v17-share'];
    for (const field of ['axes', 'scores', 'capability', 'composite_ci95', 'speed', 'decision_limit', 'v16']) {
      assert.deepEqual(row[field], source[field], `${key} ${field}`);
    }
    assert.deepEqual(row.http_status, { '200': 1500 });
    assert.equal(row.decision_limit.n_over_limit, 5);
    assert.equal(row.cost.usd_per_1000, Math.min(usage[key].gpu_all, usage[key].list_all));
    assert.equal(row.rank, null);
    assert.equal(row.ranked, false);
    assert.deepEqual(row.disclosures, disclosures[key].disclosures);
  }
});

test('v1.8.23 public readers depend on the published review manifest', async () => {
  const candidate = await readJevbenchV1823Candidate();
  const visible = candidate.manifest.review.verdict === 'PASS';
  assert.equal(await hasPublishedJevbenchV1823Release(), visible);
  assert.equal(Boolean(await readJevbenchV1823ForBoard()), visible);
  assert.equal(Boolean(await readJevAllDataInput('v1.8.23')), visible);
  const draw = load('data/jevbench-draw-equating.json').draws.find(row => row.draw === 'v1.6-regular-20261122');
  assert.equal(draw.latest_release, 'v1.8.23');
  assert.deepEqual(draw.offset, { I: 0, C: 0 });
  assert.deepEqual(draw.anchors, []);
});
