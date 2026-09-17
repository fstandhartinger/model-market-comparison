import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BENCHMAXX_TAG_MIN_COMPARISONS, BENCHMAXX_STRONG_THRESHOLD, BENCHMAXX_WEAK_THRESHOLD, benchmaxxingFamilySignals, benchmaxxingSignals } from '../lib/benchmax.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';

// CR-71.3 (Florian 2026-09-17, superseding the CR-65.6 rank bands): tag levels are absolute signed-gap
// scores — > +5 weak, ≥ +10 strong. The honesty guards stay: n ≥ 10 for a named tag, and a model is
// tagged only when its 80 % bootstrap interval stays above zero.

test('CR-71.3 (was CR-42.2): published levels follow the absolute thresholds, guards intact', async () => {
  const ds = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const view = buildBenchmarkView(ds);
  const { reports, tagged, weak, taggedFamilies, weakFamilies, average } = benchmaxxingFamilySignals(view);
  assert.equal(average, 0);
  for (const id of weak) assert.ok(!tagged.has(id), `${id} is both strong and weak`);
  const familyOf = new Map(view.models.map((m) => [m.id, m.family]));
  const level = (id) => taggedFamilies.has(familyOf.get(id)) ? 'strong' : weakFamilies.has(familyOf.get(id)) ? 'weak' : null;
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
    } else if (r.comparisons >= BENCHMAXX_TAG_MIN_COMPARISONS && r.score > BENCHMAXX_WEAK_THRESHOLD) {
      // Untagged but over the threshold: only acceptable when the interval does not stay above zero.
      assert.ok(!(r.interval && r.interval.lower > 0), `${id}: score ${r.score} over the weak threshold stays untagged only via the interval guard`);
    }
  }
});

test('CR-71.3: tiny catalogs — nothing crashes, nothing tagged', () => {
  const view = { models: [], axes: [] };
  const empty = benchmaxxingSignals(view, []);
  assert.equal(empty.tagged.size, 0); assert.equal(empty.weak.size, 0);
});
