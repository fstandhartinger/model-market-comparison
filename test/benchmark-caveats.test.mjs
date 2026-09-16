// CR-38.2 (saturation and freshness metadata) and CR-38.3 (preference/judge scores kept apart from
// task accuracy), with design directive F-98 (one tag each, no new colour).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  saturationOf, scaleCeiling, isJudged, freshnessOf, freshnessDefaults, versionLine, rowTags, categoryComposite,
  SATURATION_MIN_MODELS, SATURATION_THRESHOLD, SATURATED_WEIGHT, CAVEAT_TAGS, buildBenchmarkMatrix,
} from '../lib/benchmark-matrix.mjs';
import { computeCategoryScores, resolveAnchors, assertNoJudgedAnchors } from '../lib/category-scores.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';
import { COMPOSITE_DEFINITION } from '../lib/composite.mjs';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const caveats = read('../data/benchmark-caveats.json');
const taxonomy = read('../data/benchmark-taxonomy.json');
const registry = read('../data/raw/benchmarks/registry.json');
const anchors = read('../data/category-score-anchors.json');

const byFamily = new Map();
for (const e of registry.entries) if (!byFamily.has(e.family)) byFamily.set(e.family, e);

/** The text of one cited field, flattened the way the file's `quote_rule` describes. */
function fieldText(key, field) {
  if (field.startsWith('taxonomy.')) return JSON.stringify(taxonomy[field.split('.')[1]] ?? null);
  const entries = registry.entries.filter((e) => e.family === key);
  if (!entries.length) return '';
  if (field === 'evidence.excerpt') return JSON.stringify(entries.map((e) => e.evidence)).replaceAll('\\n', ' ');
  return JSON.stringify(entries.map((e) => {
    const [head, tail] = field.split('.');
    return tail ? e[head]?.[tail] : e[head];
  })).replaceAll('\\n', ' ');
}

test('CR-38.3: every judged classification quotes its own source verbatim', () => {
  const entries = Object.entries(caveats.judged);
  assert.ok(entries.length >= 20, `expected a real classification, got ${entries.length}`);
  for (const [key, e] of entries) {
    assert.ok(e.quote && e.field && e.why, `${key}: quote, field and why are required`);
    assert.ok(fieldText(key, e.field).includes(e.quote), `${key}: quote not found verbatim in ${e.field}: "${e.quote}"`);
  }
});

test('CR-38.2: every freshness entry quotes its own source verbatim', () => {
  for (const [key, e] of Object.entries(caveats.freshness)) {
    assert.ok(e.quote && e.field, `${key}: quote and field are required`);
    assert.ok(fieldText(key, e.field).includes(e.quote), `${key}: quote not found verbatim in ${e.field}: "${e.quote}"`);
    if (e.task_window) assert.match(e.task_window.from, /^\d{4}/, `${key}: a task window starts with a year`);
  }
});

test('CR-38.2: the freshness fields exist for every benchmark, stating the unknown when it is unknown', () => {
  const known = freshnessOf('aa-aime', caveats);
  assert.deepEqual(known.taskWindow, { from: '2025', to: '2025', label: 'AIME I and II 2025' });
  assert.equal(known.contamination, null);
  // An uncurated benchmark has no per-row freshness; the sentence for "the source says nothing" is the
  // same for all of them and travels once on the matrix, not 120 times.
  assert.equal(freshnessOf('a-benchmark-nobody-curated', caveats), null);
  const defaults = freshnessDefaults(caveats);
  assert.match(defaults.taskWindowNote, /does not state/);
  assert.match(defaults.contaminationNote, /no contamination control/);
});

test('CR-38.2: scaleCeiling only accepts bounded, higher-is-better scales', () => {
  assert.equal(scaleCeiling({ unit: 'fraction', range: [0, 1], higherBetter: true }), 1);
  assert.equal(scaleCeiling({ unit: 'percent', range: [0, 100], higherBetter: true }), 100);
  assert.equal(scaleCeiling({ unit: 'points', range: [0, 100], higherBetter: true }), 100);
  assert.equal(scaleCeiling({ unit: 'Elo', range: null, higherBetter: true }), null);
  assert.equal(scaleCeiling({ unit: 'points', range: null, higherBetter: true }), null);
  assert.equal(scaleCeiling({ unit: 'USD', range: null, higherBetter: false }), null);
  assert.equal(scaleCeiling({ unit: 'percent', range: [0, 100], higherBetter: false }), null);
});

test('CR-38.2: saturation is measured, and "not assessable" is not "not saturated"', () => {
  const pct = { unit: 'percent', range: [0, 100], higherBetter: true };
  assert.equal(saturationOf([96, 95, 94, 93, 92, 40], pct).saturated, true);
  assert.equal(saturationOf([80, 79, 78, 77, 76, 10], pct).saturated, false);
  // Exactly at the threshold counts as saturated; just below does not.
  assert.equal(saturationOf([90, 90, 90, 90, 90], pct).saturated, true);
  assert.equal(saturationOf([89.9, 89.9, 89.9, 89.9, 89.9], pct).saturated, false);
  // Only the best SATURATION_TOP_N results matter, so a long tail of weak models cannot hide saturation.
  assert.equal(saturationOf([99, 98, 97, 96, 95, ...Array(50).fill(1)], pct).saturated, true);
  // Too few models, or a scale without a ceiling: null, never `{ saturated: false }`.
  assert.equal(saturationOf([99, 99, 99, 99], pct), null);
  assert.equal(saturationOf(Array(10).fill(1800), { unit: 'Elo', range: null, higherBetter: true }), null);
  const s = saturationOf([0.98, 0.97, 0.96, 0.95, 0.94, null], { unit: 'fraction', range: [0, 1], higherBetter: true });
  assert.equal(s.models, 5);
  assert.equal(s.ceiling, 1);
  assert.ok(s.share > SATURATION_THRESHOLD);
  assert.equal(saturationOf(Array(SATURATION_MIN_MODELS - 1).fill(1), pct), null);
});

test('F-98: the two caveat tags join the existing tag set, last, and both are declared', () => {
  for (const tag of CAVEAT_TAGS) {
    assert.ok(taxonomy.tags[tag], `taxonomy must declare the ${tag} tag`);
    assert.ok(taxonomy.tags[tag].tip.length > 20, `${tag} needs its one-sentence tooltip`);
  }
  assert.equal(taxonomy.tags.saturated.tip, "Top models sit near this benchmark's ceiling; it separates weaker models, not the best.");
  assert.equal(taxonomy.tags.judged.tip, 'A preference or judge score, not task accuracy.');
  const tags = rowTags('aa-harvey-lab', 'Artificial Analysis', taxonomy, caveats, { saturated: true });
  assert.deepEqual(tags.slice(-2), ['saturated', 'judged']);
  assert.ok(tags.includes('aa'), 'the source tags still come first');
  assert.deepEqual(rowTags('aa-hle', 'Artificial Analysis', taxonomy, caveats, { saturated: false }).filter((t) => CAVEAT_TAGS.includes(t)), []);
  assert.equal(isJudged('frontend', caveats), true);
  assert.equal(isJudged('aa-hle', caveats), false);
});

test('F-98: the (i) second line names the version, the read date and a known task window', () => {
  assert.equal(versionLine({ version: '2025', asOf: '2026-09-11', freshness: freshnessOf('aa-aime', caveats) }),
    'Version 2025 · results as of 2026-09-11 · tasks from 2025');
  assert.equal(versionLine({ version: '1.1', asOf: '2026-09-13', freshness: freshnessOf('otis-mock-aime', caveats) }),
    'Version 1.1 · results as of 2026-09-13 · tasks from 2024 to 2025');
  assert.equal(versionLine({ version: 'snapshot-2026-09-15', asOf: null, freshness: freshnessOf('nothing-known', caveats) }),
    'Version snapshot 2026-09-15');
  assert.equal(versionLine({ version: '', asOf: null, freshness: null }), '');
});

const pctRow = (name, extra = {}) => ({ name, unit: 'percent', range: [0, 100], higherBetter: true, ...extra });

test('CR-38.3: a judged row never averages with task accuracy in a category composite', () => {
  const entries = [
    { row: pctRow('Accuracy A'), vals: [60, 40] },
    { row: pctRow('Accuracy B'), vals: [70, 50] },
    { row: pctRow('Preference C', { judged: true }), vals: [10, 90] },
  ];
  const c = categoryComposite(entries, 2);
  assert.deepEqual(c.values, [65, 45]);
  assert.equal(c.judgedExcluded, 1);
  assert.equal(c.kind, 'measured');
  assert.deepEqual(c.rows.map((r) => r.name), ['Accuracy A', 'Accuracy B']);
});

test('CR-38.3: a category whose qualifying rows are all judged gets a judged composite, and says so', () => {
  const c = categoryComposite([
    { row: pctRow('Preference A', { judged: true }), vals: [80, 40] },
    { row: pctRow('Preference B', { judged: true }), vals: [60, 20] },
  ], 2);
  assert.deepEqual(c.values, [70, 30]);
  assert.equal(c.kind, 'judged');
  assert.equal(c.judgedExcluded, 0);
});

test('CR-38.2: a saturated row still counts, at half weight, and the composite reports it', () => {
  const c = categoryComposite([
    { row: pctRow('Fresh'), vals: [60, 40] },
    { row: pctRow('Ceiling', { saturation: { saturated: true } }), vals: [90, 90] },
  ], 2);
  // (60 + 0.5·90) / 1.5 = 70 ; (40 + 0.5·90) / 1.5 ≈ 56.67
  assert.equal(Math.round(c.values[0] * 100) / 100, 70);
  assert.equal(Math.round(c.values[1] * 100) / 100, 56.67);
  assert.deepEqual(c.saturated.map((r) => r.name), ['Ceiling']);
  assert.equal(SATURATED_WEIGHT, 0.5);
  // Without the saturated row's discount it would be a plain mean.
  const plain = categoryComposite([{ row: pctRow('Fresh'), vals: [60, 40] }, { row: pctRow('Ceiling'), vals: [90, 90] }], 2);
  assert.deepEqual(plain.values, [75, 65]);
  assert.deepEqual(plain.saturated, []);
});

test('CR-38.3: no selectable category score rests on a judged benchmark', () => {
  const ds = read('../data/dataset.json');
  const matrix = buildBenchmarkMatrix(buildBenchmarkView(ds), ds, taxonomy, caveats);
  const resolved = resolveAnchors(matrix, anchors);
  assert.ok(resolved.length >= 2, 'the anchor categories still resolve');
  assert.doesNotThrow(() => assertNoJudgedAnchors(resolved));
  // The guard is real: a judged anchor must fail the build, not silently change a published score.
  assert.throws(() => assertNoJudgedAnchors([{ label: 'Coding', rows: [{ name: 'X', judged: true }] }]), /CR-38.3/);
});

test('CR-38.2: the live dataset\'s saturated benchmarks are the ones at their ceiling, and no Composite slot is one', () => {
  const ds = read('../data/dataset.json');
  const matrix = buildBenchmarkMatrix(buildBenchmarkView(ds), ds, taxonomy, caveats);
  const saturated = matrix.rows.filter((r) => r.saturation?.saturated);
  assert.ok(saturated.length > 0, 'at least one benchmark is at its ceiling today');
  for (const row of saturated) {
    assert.ok(row.saturation.share >= SATURATION_THRESHOLD);
    assert.ok(row.saturation.models >= SATURATION_MIN_MODELS);
    assert.ok(row.tags.includes('saturated'), `${row.id} carries the tag`);
  }
  // Benchmarks everybody knows are saturated must be caught by the rule, not by a hand-written list.
  const keys = new Set(saturated.map((r) => r.key));
  for (const key of ['aa-aime', 'aa-gpqa-diamond']) assert.ok(keys.has(key), `${key} is at its ceiling and must be tagged`);
  // Every row either has a measured verdict or is honestly "not assessable" — never a guessed false.
  for (const row of matrix.rows) assert.ok(row.saturation === null || typeof row.saturation.saturated === 'boolean');
  // The Main Composite's slots: a saturated slot would need a documented decision, so assert none is.
  const slotKeys = new Set(COMPOSITE_DEFINITION.slots);
  for (const row of saturated) assert.equal(slotKeys.has(row.key), false, `${row.key} is a Composite slot and is saturated — revisit the weighting`);
});

test('CR-38.2: category scores weigh a saturated anchor half', () => {
  const ds = read('../data/dataset.json');
  const matrix = buildBenchmarkMatrix(buildBenchmarkView(ds), ds, taxonomy, caveats);
  const { scores, resolved } = computeCategoryScores(matrix, anchors);
  const science = resolved.find((c) => c.key === 'cat_science');
  assert.ok(science, 'the Science category still resolves');
  const saturatedAnchors = science.rows.filter((r) => r.saturation?.saturated);
  assert.ok(saturatedAnchors.length >= 1, 'GPQA Diamond is the saturated Science anchor today');
  // Recompute one model by hand from the matrix values, with the documented weights.
  const [modelId, row] = [...scores.entries()].find(([, v]) => v.cat_science != null);
  const byIndex = new Map(matrix.values[modelId].map(([i, v]) => [i, v]));
  const asPercent = (v, unit) => (unit === 'fraction' ? v * 100 : v);
  const weight = (r) => (r.saturation?.saturated ? SATURATED_WEIGHT : 1);
  const expected = science.rows.reduce((sum, r) => sum + weight(r) * asPercent(byIndex.get(r.index), r.unit), 0)
    / science.rows.reduce((sum, r) => sum + weight(r), 0);
  assert.equal(row.cat_science, Number(expected.toFixed(1)));
});
