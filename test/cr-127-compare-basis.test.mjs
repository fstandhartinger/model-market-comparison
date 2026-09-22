// CR-127 (open item raised by the CR-126 launch-ingest job, 2026-09-22): in the Compare table a
// *collapsed* cell showed a developer's own report exactly like an independent measurement — no †,
// no label, just the number under a row subtitled "Published board". The basis only became visible
// after expanding the row, which is not where a reader looks first.
//
// This suite pins the two halves of the fix:
//   1. the data invariant the wording rests on — a self-reported value never earns a catalog
//      percentile, so "developer's claim" is what belongs where the bar would be;
//   2. that the component and the Compare legend actually say so, with the marks the rest of the
//      site already uses († and the sentence in TableLegend's matrix legend).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildBenchmarkView, selectFamilyBenchmarkView, latestScores, normalize } from '../lib/benchmark-view.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const ds = JSON.parse(read('../data/dataset.json'));
const view = buildBenchmarkView(ds);
const COMPARE = read('../components/BenchmarkCompare.tsx');
const LEGEND = read('../components/TableLegend.tsx');

test('the Compare table has vendor claims to mark: self-reported rows reach its axes', () => {
  const rows = view.axes.flatMap((a) => a.scores.filter((r) => r.basis === 'self_reported' && r.modelId));
  assert.ok(rows.length > 100, `expected a substantial self-reported population, got ${rows.length}`);
  const axes = new Set(view.axes.filter((a) => a.scores.some((r) => r.basis === 'self_reported')).map((a) => a.id));
  assert.ok(axes.size > 50, `expected many axes to carry one, got ${axes.size}`);
});

test('CR-126 and CR-123 launch rows are the case that was rendering unmarked', () => {
  for (const [modelId, min] of [['gpt-6-sol::max', 3], ['claude-opus-5.5::max', 10]]) {
    const picked = selectFamilyBenchmarkView(view, [modelId]);
    const own = picked.axes.flatMap((a) => a.scores.filter((r) => r.modelId === modelId));
    const self = own.filter((r) => r.basis === 'self_reported');
    assert.ok(self.length >= min, `${modelId}: expected >= ${min} self-reported rows in the compare view, got ${self.length}`);
    // The complaint named the row subtitle: these axes really are labelled with the generic cohort,
    // which is why the basis has to be carried by the cell itself.
    const generic = picked.axes.filter((a) => a.scores.some((r) => r.modelId === modelId && r.basis === 'self_reported') && a.cohort === 'Published board');
    assert.ok(generic.length > 0, `${modelId}: expected the generic "Published board" cohort on a vendor-claim row`);
  }
});

test('the measured-basis gate is what keeps a non-measured value out of the percentile and the tint', () => {
  // `distribution()` is computed over measured rows only, so `normalize()` will happily place a
  // non-measured value inside a measured field. That is not a bug in `normalize` — it is why the
  // Compare cell must gate on the basis, which is the rule this asserts (and which the source guard
  // below pins). `exposed` proves the gate is not vacuous: without it these rows would earn a
  // percentile bar and could tie for the cell tint the legend calls the "best measured" position.
  const gated = (row, axis) => (row.basis === 'measured' && !row.lowSample ? normalize(row.value, axis.stats, axis.higherBetter) : null);
  const offenders = [], exposed = [];
  for (const axis of [...view.axes, ...(view.indexAxes ?? [])]) {
    for (const row of latestScores(axis.scores, 'all')) {
      if (row.basis === 'measured' || !row.modelId) continue;
      if (gated(row, axis) != null) offenders.push(`${axis.id} / ${row.modelId} / ${row.basis}`);
      if (normalize(row.value, axis.stats, axis.higherBetter) != null) exposed.push(`${axis.id} / ${row.modelId} / ${row.basis}`);
    }
  }
  assert.deepEqual(offenders, [], 'a non-measured row must never carry a position under the gate');
  assert.ok(exposed.length > 0, 'the gate would be untested if no non-measured row sat in a measured field');
  // Today only CR-60.2's chart-read Union Alpha rows sit in a measured field; no axis yet holds both a
  // measured and a self-reported result. The gate is written so that the day one does, the vendor
  // claim still gets "developer's claim" rather than a bar.
  assert.ok(exposed.every((e) => e.endsWith('preliminary')), `unexpected exposed bases: ${exposed.join(', ')}`);
  const mixed = view.axes.filter((a) => a.scores.some((r) => r.basis === 'self_reported') && a.scores.some((r) => r.basis === 'measured'));
  assert.equal(mixed.length, 0, `axes now mix bases (${mixed.map((a) => a.id).join(', ')}); re-read this suite's note`);
});

test('Compare prefers a measured row over the same model\'s vendor claim', () => {
  const rows = [
    { id: 'a', modelId: 'm', basis: 'self_reported', value: 99, date: '2026-09-22' },
    { id: 'b', modelId: 'm', basis: 'measured', value: 40, date: '2026-09-20' },
  ];
  const [chosen] = latestScores(rows, 'all');
  assert.equal(chosen.basis, 'measured', 'a later, higher vendor claim must not displace a measured result');
});

test('the collapsed Compare cell marks a developer\'s own report with † and names it', () => {
  assert.match(COMPARE, /row\.basis === 'self_reported' && <sup[^>]*data-bh-self-reported[^>]*title="Self-reported by the developer, not an independent measurement">†/,
    'the cell must render the house † mark with its title');
  assert.match(COMPARE, /sr-only"> self-reported by the developer<\/span>/, 'the mark needs a screen-reader equivalent');
  assert.match(COMPARE, /data-bh-percentile-note[^>]*>\{row\.basis === 'self_reported' \? "developer's claim" : 'no percentile'\}/,
    'a cell without a percentile must say why instead of drawing an empty bar track');
});

test('only a measured value is normalized, so the tint stays what the legend calls it', () => {
  assert.match(COMPARE, /const normalized = row && !row\.lowSample && row\.basis === 'measured' \? normalize\(/,
    'the compare cell must gate the percentile on a measured basis, not merely exclude preliminary');
  assert.match(COMPARE, /Best measured relative position in this row/);
});

test('the Compare legend explains †, because a phone reader cannot reach the mark\'s title', () => {
  const compareLegend = LEGEND.slice(LEGEND.indexOf('export function CompareLegend'));
  assert.match(compareLegend, /id="self-reported" term=\{<span aria-hidden="true">†<\/span>\}/);
  assert.match(compareLegend, /A developer&apos;s own report, not an independent measurement\./,
    'the sentence must be the one the matrix legend already uses');
  assert.match(compareLegend, /earns no percentile and no tint/);
  // The matrix legend keeps its own line unchanged.
  assert.match(LEGEND.slice(0, LEGEND.indexOf('export function CompareLegend')), /id="self-reported" term=\{<span aria-hidden="true">†<\/span>\}/);
});
