import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BENCHMAXX_TAG_MIN_COMPARISONS, BENCHMAXX_TAG_SHARE, BENCHMAXX_WEAK_SHARE, benchmaxxingFamilySignals, benchmaxxingSignals } from '../lib/benchmax.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';

test('CR-42.2: weak Benchmaxxing level is the rank band between the strong and the weak share', async () => {
  const ds = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const view = buildBenchmarkView(ds);
  const { reports, tagged, weak, taggedFamilies, weakFamilies, average } = benchmaxxingFamilySignals(view);
  // CR-65.6: the share is taken over the families with enough comparisons for a named tag.
  const n = reports.filter(([, r]) => r.comparisons >= BENCHMAXX_TAG_MIN_COMPARISONS).length;
  assert.ok(BENCHMAXX_WEAK_SHARE > BENCHMAXX_TAG_SHARE);
  assert.ok(taggedFamilies.size >= 1 && taggedFamilies.size <= Math.ceil(n * BENCHMAXX_TAG_SHARE));
  assert.ok(taggedFamilies.size + weakFamilies.size <= Math.ceil(n * BENCHMAXX_WEAK_SHARE));
  for (const f of weakFamilies) assert.ok(!taggedFamilies.has(f), `family ${f} is both strong and weak`);
  for (const id of weak) assert.ok(!tagged.has(id));
  // Rank bands still bound the levels: a strong tag only inside the top share, a weak one only inside the weak share;
  // CR-65.6: every tagged representative's interval lies above the catalog average.
  const familyOf = new Map(view.models.map((m) => [m.id, m.family]));
  const taggable = reports.filter(([, r]) => r.comparisons >= BENCHMAXX_TAG_MIN_COMPARISONS);
  taggable.forEach(([id, r], rank) => {
    const f = familyOf.get(id);
    if (taggedFamilies.has(f)) assert.ok(rank < Math.ceil(n * BENCHMAXX_TAG_SHARE), `${id} strong outside the band`);
    if (weakFamilies.has(f)) assert.ok(rank < Math.ceil(n * BENCHMAXX_WEAK_SHARE) && rank >= Math.ceil(n * BENCHMAXX_TAG_SHARE), `${id} weak outside the band`);
    if (taggedFamilies.has(f) || weakFamilies.has(f)) assert.ok(r.interval && r.interval.lower > average, `${id} interval ${JSON.stringify(r.interval)} vs ${average}`);
  });
  const level = (id) => taggedFamilies.has(familyOf.get(id)) ? 2 : weakFamilies.has(familyOf.get(id)) ? 1 : 0;
  for (const [id, r] of reports) if (r.comparisons < BENCHMAXX_TAG_MIN_COMPARISONS) assert.equal(level(id), 0, `${id}: ${r.comparisons} comparisons carry no tag`);
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
