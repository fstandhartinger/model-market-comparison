// Fable pass 42, the three directed rows, implemented by iteration 269 (claude-opus):
//   F-223 one ranking, one figure — the interactive chart carries the 95% intervals and the tie sentence, and the two
//         static repeats of the same ranking fold;
//   F-224 the per-system table fits its panel at 1440 by splitting into two views of what is compared;
//   F-225 a phone label never covers the data it names.
// The live acceptance is `ops/ux-2026-09-12/bin/verify-fable-pass42-directed.mjs`; these are the unit and source pins.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jevV15BoardRow } from '../lib/jevbench-v15-board.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const preview = read('../components/JevBenchV15Preview.tsx');
const board = read('../components/JevBoardInteractive.tsx');
const shared = read('../components/JevBoardShared.tsx');
const axesViews = read('../components/JevAxesViews.tsx');
const bubble = read('../components/JevBubbleChart.tsx');

const system = (over = {}) => ({
  key: 'sys', display: 'Sys 1', author: 'Someone', class: 'jev', rank: 1, ranked: true, listing: 'ranked',
  jevbench_score: 70, axes: { intelligence: 70, calibration: 70, speed: 70, cost: 70 },
  cost: { kind: 'estimate', usd_per_1000: 1, basis: 'b' }, speed: { p50_s_raw: 1 }, ...over,
});

test('F-223: a board row carries the headline option interval, ordered low-high, and none without a headline', () => {
  const row = jevV15BoardRow(system({ composite_ci95: { A: [74.5, 72.4], B: [1, 2] } }), { headline: 'A' });
  assert.deepEqual(row.ci, [72.4, 74.5], 'the pair is ordered, and it is the headline option that is read');
  assert.equal(jevV15BoardRow(system({ composite_ci95: { A: [72.4, 74.5] } })).ci, null, 'no headline, no interval');
  assert.equal(jevV15BoardRow(system({ composite_ci95: null }), { headline: 'A' }).ci, null);
  assert.equal(jevV15BoardRow(system({ composite_ci95: { A: [null, 74.5] } }), { headline: 'A' }).ci, null, 'a half-published interval is not drawn');
  assert.equal(jevV15BoardRow(system(), { headline: 'A' }).ci, null);
});

test('F-223: the interval is drawn only under the official weights and the Overall view', () => {
  assert.match(board, /const officialOverall = !custom && view === 'overall';/);
  assert.match(board, /ci=\{officialOverall \? row\.ci \?\? null : null\}/);
  assert.match(shared, /data-bh-jev14-ci=\{row\.key\}/, 'the whisker names its system so a verifier can pair it with the official order');
  assert.match(shared, /95% interval \$\{one\(ciLo\)\} to \$\{one\(ciHi\)\}/, 'the interval is in the accessible name too');
});

test('F-223: the whisker-and-tie sentence is one string, under the chart leader sentence and in the folded order', () => {
  assert.match(preview, /function tieSentence\(a: JevV15Artifact\)/);
  assert.match(preview, /Whiskers are 95% bootstrap intervals\. \$\{ties\} of \$\{pairs\} adjacent pairs with published paired-bootstrap comparisons are statistical ties/);
  assert.match(preview, /No paired comparison is published for the other \$\{untested\} adjacent pairs, so no tie classification is inferred/);
  assert.match(preview, /tieNote=\{tieSentence\(a\)\}/, 'the interactive chart gets it');
  assert.match(preview, /data-bh-jev15-ties>\{tieSentence\(a\) \?\?/, 'the folded official order prints the same string');
  assert.match(board, /\{tieNote && officialOverall && <p [^>]*data-bh-jev14-ties>\{tieNote\}<\/p>\}/);
  // One whisker sentence, not two spellings of it. (The Findings list keeps its own tie bullet, which is prose about
  // the run rather than a caption for the figure, and the directive leaves it alone.)
  assert.equal((preview.match(/Whiskers are 95% bootstrap intervals/g) || []).length, 1);
});

test('F-223: the two static repeats of the official ranking fold, and every marker stays', () => {
  assert.match(preview, /<details className="mt-10" data-bh-jev15-bars-fold>/);
  assert.match(preview, /Official order with 95% intervals \(\{ranked\.length\} systems\)/);
  assert.match(preview, /<details className="mt-10" data-bh-jev15-options-fold>/);
  assert.match(preview, /All three weight options \(\{ranked\.length\} systems\)/);
  for (const marker of ['data-bh-jev15-board={headline}', 'data-bh-jev15-bars', 'data-bh-jev15-bar={row.key}', 'data-bh-jev15-ci={row.key}', 'data-bh-jev15-options', 'data-bh-jev15-option-row={row.key}']) {
    assert.ok(preview.includes(marker), `the fold keeps ${marker}`);
  }
  for (const open of ['data-bh-jev15-honorable', 'data-bh-jev15-addendum', 'data-bh-jev15-not-measured']) {
    assert.ok(preview.includes(open), `${open} is not a duplicate and stays open`);
  }
  // The pass-39 verifier reads the folded bars; it has to open them rather than read a collapsed box.
  const verifier = read('../ops/ux-2026-09-12/bin/verify-fable-pass39-design.mjs');
  assert.match(verifier, /data-bh-jev15-bars-fold[^)]*\)\) d\.open = true/);
});

test('F-224: the per-system table is two views of what is compared, Axes first', () => {
  assert.match(preview, /<JevAxesViews axes=\{<AxesView a=\{a\} rows=\{rows\} view="axes" \/>\} types=\{<AxesView a=\{a\} rows=\{rows\} view="types" \/>\} \/>/);
  assert.match(preview, /<AxesTable a=\{a\} rows=\{\[\.\.\.new Map\(\[\.\.\.ranked[\s\S]*?\.map\(\(row\) => \[row\.key, row\]\)\)\.values\(\)\]\}/, 'the full table deduplicates rows by system key while retaining AxesTable in its pinned section');
  assert.match(axesViews, /useState<'axes' \| 'types'>\('axes'\)/, 'Axes is the default');
  assert.match(axesViews, /params\.get\('axes'\) === 'types'/, '?axes=types deep-links the second view');
  assert.match(axesViews, /url\.searchParams\.set\('axes', 'types'\)/, 'and choosing it writes the link back');
  // The columns each view carries, as the directive lists them.
  const axesCols = preview.slice(preview.indexOf('{isAxes ? <><Th>Score'), preview.indexOf('</> : <>', preview.indexOf('{isAxes ? <><Th>Score')));
  for (const col of ['Score', 'Intel.', 'Calib.', 'Speed', 'Cost', 'Gap', 'Penalty']) assert.ok(axesCols.includes(`>${col}<`), `the Axes view has ${col}`);
  for (const col of ['I open', 'I sealed', 'p50 / p95', '$/1k decisions', 'Endpoint']) assert.ok(preview.includes(`>${col}<`), `the Types & cost view has ${col}`);
  assert.doesNotMatch(preview, /min-w-\[1480px\]/, 'the 17-column width is gone');
  assert.match(preview, /min-w-\[680px\]' : 'min-w-\[940px\]/);
  // The cost legend and the API note belong to the columns only the second view prints.
  assert.match(preview, /\{!isAxes && <>\s*\n\s*<p className="bh-muted mt-2 text-xs" data-bh-jev15-cost-legend>/);
  assert.match(preview, /<span className="sm:hidden"> On a phone the name column stays put/, 'the phone sentence is said only on a phone');
});

test('F-225: the phone label column picks the emptier side and never sits on the attractive-quadrant plate with a labelled point', () => {
  assert.match(bubble, /const leftPts = placed\.filter\(\(o\) => inBand\(o\.cy\) && o\.cx <= L \+ third\)\.length;/);
  assert.match(bubble, /const rightPts = placed\.filter\(\(o\) => inBand\(o\.cy\) && o\.cx >= W - R - third\)\.length;/);
  assert.match(bubble, /const plateHoldsLabel = leaders\.some\(\(d\) => d\.cx >= plotCenterX && d\.cy <= plotCenterY\);/);
  assert.match(bubble, /leftPts < rightPts \|\| \(plateHoldsLabel && leftPts <= rightPts\) \? 'left' : 'right'/);
  assert.match(bubble, /anchor: \(side === 'left' \? 'start' : 'end'\)/, 'a left column is left-aligned');
  assert.match(bubble, /side === 'left' \? Math\.min\(W - R - 4, xStart \+ widest \+ 6\)/, 'and its leader lines leave from its right edge');
});

test('F-225: a tick never reads under the limit caption, and the caption clears a left-hand label column', () => {
  assert.match(bubble, /sepX - L <= 48/, 'the rule only applies while the line is close to the axis');
  assert.match(bubble, /const hiddenYTick = tickCollision != null && tickCollision !== yTickMax \? tickCollision : null;/);
  assert.match(bubble, /\{t !== hiddenYTick && <text/, 'the covered tick loses its number, not its gridline');
  assert.match(bubble, /tickCollision != null && tickCollision === yTickMax \? Math\.round\(gridPitch\) : 0/, 'the axis maximum moves the caption instead');
  assert.match(bubble, /const sepLabelBaseY = H - B - 6;/, 'the caption stays left of the line and moves to its foot');
});
