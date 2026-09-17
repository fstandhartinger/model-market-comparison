import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BENCHMAXX_TAG_MIN_COMPARISONS, BENCHMAXX_STRONG_THRESHOLD, BENCHMAXX_WEAK_THRESHOLD, benchmaxxingFamilySignals, benchmaxxingLevelFor, benchmaxxingSignals } from '../lib/benchmax.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';

// CR-71.3 (Florian 2026-09-17): tag levels are absolute signed-gap scores — > +5 weak, ≥ +10 strong — not
// rank bands. The honesty guards from CR-65.6/69.3 stay: n ≥ 10 for a named tag, 80 % bootstrap lower end > 0.

test('CR-71.3: strong needs ≥ +10, weak is > +5 and < +10, both gated on n ≥ 10 and interval > 0', async () => {
  const ds = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const view = buildBenchmarkView(ds);
  const { reports, tagged, weak, taggedFamilies, weakFamilies, average } = benchmaxxingFamilySignals(view);
  assert.equal(average, 0);
  const familyOf = new Map(view.models.map((m) => [m.id, m.family]));
  const level = (id) => taggedFamilies.has(familyOf.get(id)) ? 'strong' : weakFamilies.has(familyOf.get(id)) ? 'weak' : null;
  const taggable = reports.filter(([, r]) => r.comparisons >= BENCHMAXX_TAG_MIN_COMPARISONS);
  // Every published level matches the absolute thresholds and the guards.
  for (const [id, r] of reports) {
    const lvl = level(id);
    if (lvl === 'strong') {
      assert.ok(r.score >= BENCHMAXX_STRONG_THRESHOLD, `${id}: strong tag below +${BENCHMAXX_STRONG_THRESHOLD} (score ${r.score})`);
      assert.ok(r.comparisons >= BENCHMAXX_TAG_MIN_COMPARISONS, `${id}: strong tag with n = ${r.comparisons}`);
      assert.ok(r.interval && r.interval.lower > 0, `${id}: strong tag with interval ${JSON.stringify(r.interval)}`);
    } else if (lvl === 'weak') {
      assert.ok(r.score > BENCHMAXX_WEAK_THRESHOLD && r.score < BENCHMAXX_STRONG_THRESHOLD, `${id}: weak tag outside (+5, +10) (score ${r.score})`);
      assert.ok(r.comparisons >= BENCHMAXX_TAG_MIN_COMPARISONS, `${id}: weak tag with n = ${r.comparisons}`);
      assert.ok(r.interval && r.interval.lower > 0, `${id}: weak tag with interval ${JSON.stringify(r.interval)}`);
    }
  }
  // The threshold boundaries themselves: +5.0 → no tag, +5.1 → weak, +9.9 → weak, +10.0 → strong.
  // CR-71.3: the level rule is a pure function of the absolute score; the interval guard is separate.
  for (const [score, expected] of [[5.0, null], [5.1, 'weak'], [9.9, 'weak'], [10.0, 'strong'], [10.1, 'strong'], [4.9, null], [-3, null]]) {
    assert.equal(benchmaxxingLevelFor(score), expected, `score ${score}`);
  }
});

test('CR-71.3: tiny catalogs — nothing crashes, nothing tagged', () => {
  const view = { models: [], axes: [] };
  const empty = benchmaxxingSignals(view, []);
  assert.equal(empty.tagged.size, 0); assert.equal(empty.weak.size, 0);
});

test('F-104: a deep-linked model lands in the narrowest preset that lists it, expanded only when needed', async () => {
  const { presetShowing, presetRows } = await import('../lib/benchmaxxing-presets.ts');
  const row = (id, score, featured, tagged, composite = null) => ({ id, name: id, org: 'x', score, comparisons: 6, topics: 2, measured: 4, total: 9, domainSpecialization: 0, composite, featured, tagged });
  const rows = [row('f1', 10, true, false, 90), row('t1', 40, false, true), row('plain', 5, false, false),
    ...Array.from({ length: 12 }, (_, i) => row(`z${i}`, 30 - i, false, false))];
  assert.deepEqual(presetShowing(rows, 'f1'), { preset: 'featured', showAll: false });
  // CR-71.1: the "Strongest signals" preset is gone — a tagged model outside Featured falls back to "all".
  assert.deepEqual(presetShowing(rows, 't1'), { preset: 'all', showAll: false });
  assert.deepEqual(presetShowing(rows, 'plain'), { preset: 'all', showAll: false });
  assert.equal(presetShowing(rows, 'missing'), null);
  // CR-71.2: Featured is the default preset; "All scored" keeps every scored model in the same composite order.
  assert.deepEqual(presetRows(rows, 'featured').map((r) => r.id), ['f1']);
  assert.ok(presetRows(rows, 'all').map((r) => r.id).includes('t1'));
});

test('CR-71.4: expanded Benchmaxxing rows are independent toggles, not an accordion', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../components/BenchmaxxingOverview.tsx', import.meta.url), 'utf8');
  assert.ok(/useState<Set<string>>\(new Set\(\)\)/.test(src), 'expanded state must hold multiple rows');
  assert.ok(!/expanded === row\.id \? null : row\.id/.test(src), 'the accordion replacement must be gone');
});
