// Fable pass 21 directives F-112 and F-114, as re-judged in iteration 101 for CR-69's signed score:
// the Benchmaxxing Signal bar diverges around a shared zero line on one catalog-wide scale, and the
// Benchmaxxing page carries one explainer with the status line in the reader's order.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { signalBarDomain, signalBarGeometry } from '../lib/signal-bar.mjs';

const src = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('F-112: the domain spans the signed catalog and always contains zero', () => {
  const d = signalBarDomain([-8.5, -0.1, 0.2, 5.1, 20.7]);
  assert.equal(d.min, -8.5);
  assert.equal(d.max, 20.7);
  assert.equal(d.span, 29.2);
  assert.ok(Math.abs(d.zero - 8.5 / 29.2) < 1e-12);
  // An all-positive catalog keeps zero pinned at the left edge; an all-negative one at the right.
  assert.deepEqual(signalBarDomain([2, 9]).min, 0);
  assert.equal(signalBarDomain([2, 9]).zero, 0);
  assert.equal(signalBarDomain([-2, -9]).zero, 1);
});

test('F-112: a degenerate or empty catalog draws nothing rather than dividing by zero', () => {
  const d = signalBarDomain([]);
  assert.equal(d.span, 0);
  assert.deepEqual(signalBarGeometry(3, d), { sign: 'zero', width: 0, from: 0, fraction: 0 });
  assert.deepEqual(signalBarGeometry(0, signalBarDomain([0, 0])), { sign: 'zero', width: 0, from: 0, fraction: 0 });
});

test('F-112: every non-zero score draws a bar, on the side its sign says', () => {
  const d = signalBarDomain([-10, 30]);
  const pos = signalBarGeometry(15, d);
  assert.equal(pos.sign, 'pos');
  assert.equal(pos.from, d.zero, 'a positive bar starts at the shared zero line');
  assert.ok(Math.abs(pos.width - 15 / 40) < 1e-12);

  const neg = signalBarGeometry(-5, d);
  assert.equal(neg.sign, 'neg');
  assert.ok(Math.abs(neg.width - 5 / 40) < 1e-12);
  assert.ok(Math.abs(neg.from + neg.width - d.zero) < 1e-12, 'a negative bar ends at the shared zero line');

  // The live 17 Sep defect: on a 0 → max bar these two rows were both blank and indistinguishable.
  assert.notDeepEqual(signalBarGeometry(-0.1, d).width, signalBarGeometry(-7.3, d).width);
  assert.equal(signalBarGeometry(0, d).sign, 'zero', 'zero means no sign, so it draws no bar');
});

test('F-112: the scale does not depend on the visible list', () => {
  const catalog = [-8.5, -2.4, -0.1, 0.2, 2.3, 5.1, 20.7];
  const d = signalBarDomain(catalog);
  // Featured (a subset) and All scored share the catalog domain, so one model's bar keeps one geometry.
  const featured = signalBarGeometry(2.3, signalBarDomain(catalog));
  const all = signalBarGeometry(2.3, d);
  assert.deepEqual(featured, all);
});

test('F-112: the table renders the diverging bar and a zero line, not a 0 → max fill', async () => {
  const overview = await src('components/BenchmaxxingOverview.tsx');
  assert.match(overview, /bh-magnitude-diverge/);
  assert.match(overview, /data-signal-sign=\{bar\.sign\}/);
  assert.match(overview, /className="bh-magnitude-zero"/);
  assert.match(overview, /const domain = signalBarDomain\(rows\.map\(\(row\) => row\.score\)\)/,
    'the domain comes from every scored row, never from the visible slice');
  assert.doesNotMatch(overview, /maxScore/, 'the old one-sided scale is gone');
  const css = await src('app/globals.css');
  assert.match(css, /\.bh-magnitude-zero \{/);
  assert.match(css, /\.bh-magnitude-diverge \.bh-magnitude-fill\[data-sign="neg"\]/);
  assert.match(css, /min-width: 2px/, 'the smallest non-zero signal still paints');
});

test('F-114: the Benchmaxxing card holds one instruction line, not a second explainer', async () => {
  const overview = await src('components/BenchmaxxingOverview.tsx');
  assert.match(overview, /data-bmx-instruction>Select a row to open its report below, or ▸ for a quick look\.<\/p>/);
  // The meaning of the signal and the screening-flag caveat are said once, in the page intro (CR-63.4).
  assert.doesNotMatch(overview.replace(/<InfoTip[\s\S]*?<\/InfoTip>/g, ''), /screening flag/);
  assert.match(await src('app/benchmaxxing/page.tsx'), /screening flag, not proof of leakage/);
});

test('F-114: one status line carries the counts, the levels and the rule, in that order', async () => {
  const overview = await src('components/BenchmaxxingOverview.tsx');
  // The counts and the level legend were two stacked rows saying the same three words; they are now one row.
  assert.equal(overview.match(/data-bmx-level-legend/g).length, 1);
  assert.match(overview, /data-bmx-level-legend>[\s\S]{0,200}<span className="font-semibold">Tagged:<\/span>/);
  assert.match(overview, /<b>\{levelCounts\[x\.level\] \?\? 0\}<\/b> \{x\.label\} ≥ \+\{x\.min\}/,
    'each level shows its pill, its count and its threshold together');
  assert.match(overview, /data-bmx-uncertain-count title=\{BENCHMAXX_UNCERTAIN_TEXT\}/,
    'CR-77.2: the marker stays in the legend; the full reason moves into its tooltip so the line stays one line');
  assert.match(overview, /<b>\{uncertainCount\}<\/b> marked uncertain<\/span>/);
  assert.match(overview, /<span>— \{BENCHMAXX_TAG_RULE_TEXT\}<\/span>/, 'the rule closes the line');
  assert.doesNotMatch(overview, /rounded-lg border border-line px-4/, 'the separate status box is gone');
  // The scoring floor moved into the Signal (i).
  assert.doesNotMatch(overview.replace(/<InfoTip[\s\S]*?<\/InfoTip>/g, ''), /scored from n =/);
  assert.match(overview, /A model is scored once it has at least \{minComparisons\} comparisons in \{minTopics\} topics\./);
});

test('CR-63.4(b)/F-114: the page intro is one short paragraph, with the detail left to Advanced method', async () => {
  const page = await src('app/benchmaxxing/page.tsx');
  assert.match(page, /Does a model rank higher on famous public benchmarks than on held-out ones of the same topic\? Plus = yes, zero = no sign — a screening flag, not proof of leakage\./);
  assert.doesNotMatch(page.split('<details')[0], /whose questions are private, brand-new or newer than the models/,
    'the held-out definition is said once, in Advanced method');
  // CR-64.2's one-line exclusion survives, in the wording its check looks for.
  assert.match(page, /cost, token and speed metrics are left out by design/);
});
