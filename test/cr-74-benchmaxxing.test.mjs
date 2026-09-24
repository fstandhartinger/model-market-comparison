import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { importTsModule } from './helpers/transpile-ts.mjs';
import { BENCHMAXX_LEVELS, BENCHMAXX_TAG_MIN_COMPARISONS, benchmaxxingFamilySignals, benchmaxxingLevelFor, benchmaxxingSignals } from '../lib/benchmax.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';

const { BENCHMAXXING_PRESETS, DEFAULT_BENCHMAXXING_PRESET, presetLimit, presetRows, presetShowing } = await importTsModule(new URL('../lib/benchmaxxing-presets.ts', import.meta.url));

// CR-74.1 (Florian 2026-09-17, supersedes CR-42.2 rank bands and CR-71.3): three tag levels on the signed score —
// light ≥ +3.0, medium ≥ +6.0, very strong ≥ +12.0 (inclusive, on the one-decimal published score).
// CR-77.1 (same day): the score alone decides; the old guards (n ≥ 10, interval above zero) only mark a tag uncertain.
const src = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('CR-74.1: level edges 2.9 none, 3.0 light, 5.9 light, 6.0 medium, 11.9 medium, 12.0 strong', () => {
  for (const [score, expected] of [[2.9, null], [3.0, 'light'], [5.9, 'light'], [6.0, 'medium'], [11.9, 'medium'], [12.0, 'strong'],
    [30, 'strong'], [0, null], [-12, null], [NaN, null], [null, null], [11.96, 'strong'], [11.94, 'medium'], [2.95, 'light']]) {
    assert.equal(benchmaxxingLevelFor(score), expected, `score ${score}`);
  }
  assert.deepEqual(BENCHMAXX_LEVELS.map((x) => [x.level, x.min, x.label]), [['light', 3, 'light'], ['medium', 6, 'medium'], ['strong', 12, 'very strong']]);
});

test('CR-74.1 + CR-77.1: on the real dataset every scored model that reaches a threshold carries exactly that level', async () => {
  const view = buildBenchmarkView(JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8')));
  const fam = benchmaxxingFamilySignals(view);
  assert.equal(fam.average, 0);
  const familyOf = new Map(view.models.map((m) => [m.id, m.family ?? m.id]));
  const lines = [];
  for (const [id, r] of fam.reports) {
    const level = fam.familyLevels.get(familyOf.get(id)) ?? null;
    const reached = benchmaxxingLevelFor(r.score);
    // CR-77.1: nothing between the score and the tag — a representative reaching a threshold is tagged, and a
    // representative below +3.0 never is.
    assert.equal(level, reached, `${id}: level ${level} vs score ${r.score}`);
    if (!level) continue;
    lines.push(`${level} ${familyOf.get(id)} ${r.score.toFixed(1)}`);
    // CR-77.2: the old guards survive as the uncertainty note, exactly when they would have suppressed the tag.
    const guarded = r.comparisons >= BENCHMAXX_TAG_MIN_COMPARISONS && Boolean(r.interval && r.interval.lower > 0);
    assert.equal(fam.uncertain.has(id), !guarded, `${id}: n = ${r.comparisons}, interval ${JSON.stringify(r.interval)}`);
    if (!guarded) assert.match(fam.uncertain.get(id).note, /treat this tag as uncertain$/);
  }
  // Variants share their family's level; the representative-level map and the per-model map agree.
  for (const m of view.models) assert.equal(fam.levels.get(m.id) ?? null, fam.familyLevels.get(familyOf.get(m.id)) ?? null, m.id);
  assert.ok(lines.length >= 1);
});

test('CR-74.1: tiny catalogs — nothing crashes, nothing tagged', () => {
  const empty = benchmaxxingSignals({ models: [], axes: [] }, []);
  assert.equal(empty.tagged.size, 0); assert.equal(empty.levels.size, 0); assert.equal(empty.average, null);
});

test('CR-74.1: every surface reads the shared level module; no two-level leftovers', () => {
  for (const path of ['components/SignalValue.tsx', 'components/ModelExplorer.tsx', 'components/BenchmaxxingOverview.tsx', 'lib/benchmaxxing-interpretation.mjs', 'lib/page-data.ts', 'app/benchmaxxing/page.tsx']) {
    const text = src(path);
    assert.match(text, /benchmaxxing-levels\.mjs|BENCHMAXX_LEVELS/, `${path} uses the shared levels`);
    assert.ok(!/"weak" : null|level === ["']weak["']|weakFamilies|weakCount|△/.test(text), `${path} still has the weak level`);
  }
  assert.match(src('app/globals.css'), /\.bh-bmx-tag\[data-level="light"\][\s\S]*\.bh-bmx-tag\[data-level="strong"\]/);
  assert.match(src('app/about/page.tsx'), /light<\/b> from\s+\+3\.0, <b>medium<\/b> from \+6\.0 and <b>very strong<\/b> from \+12\.0/);
});

const row = (id, composite, featured = false, score = 1) => ({ id, name: id, org: 'x', score, comparisons: 10, topics: 2, measured: 4, total: 9, domainSpecialization: 0, composite, featured, tagged: false, level: null });

test('CR-74.2: exactly three presets — Featured (default) · Top 50 · All scored; no Strongest signals', () => {
  assert.deepEqual(BENCHMAXXING_PRESETS.map((p) => p.label), ['Featured models', 'Top 50', 'All scored']);
  assert.equal(DEFAULT_BENCHMAXXING_PRESET, 'featured');
  for (const path of ['lib/benchmaxxing-presets.ts', 'components/BenchmaxxingOverview.tsx', 'components/BenchmaxxingWorkbench.tsx', 'lib/page-data.ts']) {
    assert.ok(!/Strongest signals|"signals"/.test(src(path)), `${path} mentions Strongest signals`);
  }
  assert.equal(presetLimit('featured'), Infinity); assert.equal(presetLimit('top50'), Infinity); assert.equal(presetLimit('all'), 50);
});

test('CR-74.2: Top 50 = the 50 highest composites, composite-less rows excluded, ordered through the compositeOf accessor', () => {
  const rows = [...Array.from({ length: 60 }, (_, i) => row(`m${i}`, 100 - i, i % 7 === 0)), row('nocomp', null, true)];
  const top = presetRows(rows, 'top50');
  assert.equal(top.length, 50);
  assert.deepEqual(top.map((r) => r.id), Array.from({ length: 50 }, (_, i) => `m${i}`));
  assert.ok(!top.some((r) => r.id === 'nocomp'));
  assert.equal(presetRows(rows, 'all').length, 61);
  assert.equal(presetRows(rows, 'all').at(-1).id, 'nocomp');
  // Featured shows every featured row, composite order.
  assert.deepEqual(presetRows(rows, 'featured').map((r) => r.id), ['m0', 'm7', 'm14', 'm21', 'm28', 'm35', 'm42', 'm49', 'm56', 'nocomp']);
  // An accessor (e.g. the CR-74.4 Benchmaxxing penalty) re-orders and re-cuts every preset.
  const penalised = (r) => (r.composite == null ? null : r.composite - (r.id === 'm0' ? 60 : 0));
  assert.equal(presetRows(rows, 'top50', penalised).some((r) => r.id === 'm0'), false);
  assert.equal(presetRows(rows, 'top50', penalised)[0].id, 'm1');
  assert.equal(presetRows(rows, 'featured', penalised)[0].id, 'm7');
});

test('F-104 (CR-74.2): a deep link lands in the narrowest preset listing the model (featured → top50 → all)', () => {
  const rows = [row('f1', 90, true), ...Array.from({ length: 70 }, (_, i) => row(`z${i}`, 80 - i)), row('nocomp', null)];
  assert.deepEqual(presetShowing(rows, 'f1'), { preset: 'featured', showAll: false });
  assert.deepEqual(presetShowing(rows, 'z3'), { preset: 'top50', showAll: false });
  assert.deepEqual(presetShowing(rows, 'z48'), { preset: 'top50', showAll: false });
  assert.deepEqual(presetShowing(rows, 'z60'), { preset: 'all', showAll: true });
  assert.deepEqual(presetShowing(rows, 'nocomp'), { preset: 'all', showAll: true });
  assert.deepEqual(presetShowing(rows, 'z3', 'all'), { preset: 'all', showAll: false });
  assert.equal(presetShowing(rows, 'missing'), null);
});

test('CR-74.2: the report has no "Show all axes" checkbox; CR-71.4: rows expand independently', () => {
  const report = src('components/BenchmaxxingReport.tsx');
  assert.ok(!/showAllAxes|Show all .* axes|type="checkbox"/.test(report));
  const overview = src('components/BenchmaxxingOverview.tsx');
  assert.match(overview, /useState<Set<string>>\(new Set\(\)\)/);
  assert.match(overview, /aria-expanded=\{open\} aria-controls=\{panelId\}/);
  assert.ok(!/expanded === row\.id/.test(overview));
  assert.ok(!/slice\(0, 10\)|Show first 10/.test(overview));
});
