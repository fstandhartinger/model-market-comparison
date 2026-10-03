import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { baseModelFor, isBaseModelDisclosed } from '../lib/jev-base-model.mjs';
import { readJevbenchV155Release, readJevbenchV156Release } from '../lib/jevbench-v15-release.mjs';
import { jevBoardAlternative, jevV15BoardScore } from '../lib/jevbench-v15-board.mjs';
import { jevV15FilterRows } from '../lib/jevbench-v15-filter-rows.mjs';
import { jevbenchCategoryView, JEVBENCH_CATEGORY_REVISIONS } from '../lib/jevbench-categories.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const { artifact: v155, sha256: v155Sha } = await readJevbenchV155Release();
const { artifact, bytes } = await readJevbenchV156Release();
const vansa = artifact.systems.find((row) => row.key === 'vansa-3.4');

test('CR-277 v1.5.6 adds only the measured Vansa-3.4 row; every v1.5.5 row keeps its numbers', () => {
  assert.equal(artifact.revision, 'v1.5.6');
  assert.deepEqual(artifact.parent_release, { revision: 'v1.5.5', sha256: v155Sha });
  assert.deepEqual(artifact.systems.map((row) => row.key), [...v155.systems.map((row) => row.key), 'vansa-3.4']);
  assert.deepEqual(artifact.not_measured, v155.not_measured);
  for (const old of v155.systems) {
    const now = artifact.systems.find((row) => row.key === old.key);
    for (const field of ['axes', 'scores', 'cost', 'speed', 'intelligence', 'calibration', 'composite_ci95', 'alt', 'listing']) {
      assert.deepEqual(now[field], old[field], `${old.key}.${field}`);
    }
  }
  assert.equal(artifact.n_ranked, v155.n_ranked + 1);
  assert.equal(artifact.G_med, v155.G_med);
});

test('CR-277 Vansa row carries the delivered paid fast-lane aggregate exactly', () => {
  assert.ok(vansa);
  assert.equal(vansa.scores.A, 71.59061278658044);
  assert.equal(vansa.axes.intelligence, 58.038138517840565);
  assert.equal(vansa.axes.calibration, 87.62340118994128);
  assert.equal(vansa.axes.speed, 91.27886810559414);
  assert.equal(vansa.axes.cost, 61.44286408313903);
  assert.equal(vansa.cost.usd_per_1000, 0.019285809113300495);
  assert.deepEqual(vansa.composite_ci95.A, [69.69685121205671, 72.64149201912215]);
  assert.equal(vansa.status.answered_ok, 1624);
  assert.equal(vansa.api_flag, true);
  assert.equal(vansa.addendum.id, 'A7');
  assert.equal(vansa.provenance.raw_sha256, '1db31aad28eb71d5a12f01ffe7f168825d55d1d3584f991a6783ff7ea7f17d1f');
  assert.equal(vansa.provenance.result_sha256, '9616f8e433bbcc5f1d06ea8bb5b031cdeb81e1acea1f024c1be610f98bcbae5d');
  for (const o of ['A', 'B', 'C']) assert.equal(artifact.board[o].order.indexOf('vansa-3.4') + 1, vansa.ranks[o]);
  // No item-level text, intermediate fine-tune name or similarity claim reaches the public artifact.
  assert.doesNotMatch(JSON.stringify(vansa), /jevk5|JevK5|task_id|"prompt"|"answer"/);
  assert.equal(createHash('sha256').update(bytes).digest('hex').length, 64);
});

test('CR-277 Vansa is priced at its stated API price with a labelled base-reference alternative', () => {
  assert.match(vansa.cost.basis, /USD 0\.034 per 1M input tokens/);
  assert.doesNotMatch(vansa.cost.basis, /undisclosed/i);
  assert.doesNotMatch(read('../ops/jevbench-v156-cr277/RESCORE-RECEIPT.json'), /undisclosed/i);
  assert.equal(vansa.alt.label, 'Qwen3.5-4B base-model reference price');
  assert.equal(vansa.alt.usd_per_1000, 0.01701689039408867);
  assert.equal(vansa.alt.axes.intelligence, vansa.axes.intelligence);
  assert.equal(vansa.alt.axes.speed, vansa.axes.speed);
  const alt = jevBoardAlternative(vansa, artifact.systems, { intelligence: 1, calibration: 1, speed: 1, cost: 1 }, jevV15BoardScore);
  assert.ok(alt && Number.isFinite(alt.score));
  const filter = jevV15FilterRows(artifact, { previousKeys: v155.systems.map((row) => row.key), revisionHref: '/jev-models/v1.5.6' })
    .find((row) => row.key === 'vansa-3.4');
  assert.equal(filter.apiPricePer1000, vansa.cost.usd_per_1000);
  assert.equal(filter.basePricePer1000, null);
  assert.equal(filter.alternativePricePer1000, vansa.alt.usd_per_1000);
  assert.equal(filter.newInVersion, true);
});

test('CR-277 base model is shown as developer self-reported, never as a cited public disclosure', () => {
  const base = baseModelFor('jevbench', 'vansa-3.4');
  assert.equal(base.status, 'self-reported');
  assert.equal(base.label, 'Qwen3.5-4B (self-reported)');
  assert.match(base.note, /Developer-reported.*independently verified/s);
  assert.equal(isBaseModelDisclosed(base), false);
  const fixture = { benchmarks: { jevbench: {
    noNote: { status: 'self-reported', label: 'Qwen3.5-4B', sources: [] },
    noLabel: { status: 'self-reported', label: ' ', sources: [], note: 'x' },
  } } };
  for (const key of ['noNote', 'noLabel']) assert.equal(baseModelFor('jevbench', key, fixture).label, 'undisclosed');
});

test('CR-277 both category radars include Vansa from the stored per-item aggregation', () => {
  assert.ok(JEVBENCH_CATEGORY_REVISIONS.includes('v1.5.6'));
  const cats = JSON.parse(read('../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.6-categories.json'));
  const old = JSON.parse(read('../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.5-categories.json'));
  assert.equal(cats.revision, 'v1.5.6');
  for (const key of Object.keys(old.systems)) assert.deepEqual(cats.systems[key], old.systems[key], key);
  assert.ok(Object.keys(cats.systems['vansa-3.4'].topics).length > 0);
  assert.ok(Object.keys(cats.systems['vansa-3.4'].usecases).length > 0);
  const view = jevbenchCategoryView('v1.5.6', ['vansa-3.4']);
  assert.ok(JSON.stringify(view).includes('vansa-3.4'));
});
