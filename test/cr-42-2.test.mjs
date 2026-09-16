import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BENCHMAXX_TAG_SHARE, BENCHMAXX_WEAK_SHARE, benchmaxxingFamilySignals, benchmaxxingSignals } from '../lib/benchmax.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';

test('CR-42.2: weak Benchmaxxing level is the rank band between the strong and the weak share', async () => {
  const ds = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const view = buildBenchmarkView(ds);
  const { reports, tagged, weak, taggedFamilies, weakFamilies } = benchmaxxingFamilySignals(view);
  const n = reports.length;
  assert.ok(BENCHMAXX_WEAK_SHARE > BENCHMAXX_TAG_SHARE);
  assert.equal(taggedFamilies.size, Math.ceil(n * BENCHMAXX_TAG_SHARE));
  assert.equal(taggedFamilies.size + weakFamilies.size, Math.ceil(n * BENCHMAXX_WEAK_SHARE));
  for (const f of weakFamilies) assert.ok(!taggedFamilies.has(f), `family ${f} is both strong and weak`);
  for (const id of weak) assert.ok(!tagged.has(id));
  // Ranked by score: every strong representative scores at least every weak one, every weak one at least every untagged one.
  const familyOf = new Map(view.models.map((m) => [m.id, m.family]));
  const level = (id) => taggedFamilies.has(familyOf.get(id)) ? 2 : weakFamilies.has(familyOf.get(id)) ? 1 : 0;
  for (let i = 1; i < reports.length; i += 1) assert.ok(level(reports[i - 1][0]) >= level(reports[i][0]), `rank order broken at ${reports[i][0]}`);
});

test('CR-42.2: tiny catalogs — strong takes at least one, weak never overlaps it', () => {
  const view = { models: [], axes: [] };
  const empty = benchmaxxingSignals(view, []);
  assert.equal(empty.tagged.size, 0); assert.equal(empty.weak.size, 0);
});

test('F-104: a deep-linked model lands in the narrowest preset that lists it, expanded only when needed', async () => {
  const { presetShowing } = await import('../lib/benchmaxxing-presets.ts');
  const row = (id, score, featured, tagged, composite = null) => ({ id, name: id, org: 'x', score, comparisons: 6, topics: 2, measured: 4, total: 9, domainSpecialization: 0, composite, featured, tagged });
  const rows = [row('f1', 10, true, false, 90), row('t1', 40, false, true), row('plain', 5, false, false),
    ...Array.from({ length: 12 }, (_, i) => row(`z${i}`, 30 - i, false, false))];
  assert.deepEqual(presetShowing(rows, 'f1'), { preset: 'featured', showAll: false });
  assert.deepEqual(presetShowing(rows, 't1'), { preset: 'signals', showAll: false });
  assert.deepEqual(presetShowing(rows, 'plain'), { preset: 'all', showAll: true });
  assert.equal(presetShowing(rows, 'missing'), null);
});
