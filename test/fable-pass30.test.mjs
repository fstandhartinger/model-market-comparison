// Fable pass 30 (2026-09-22): the surfaces that changed after pass 29 — the JevBench page after v1.3.0 (CR-118) and the multimodal
// preview (CR-119). F-157: the "What changed in the score" note follows the board it explains instead of standing between the page
// head and the ranking. F-158: the preview's ranking has no column whose every cell reads "Not measured", and the warning banner
// carries the required sentence once. F-159: the preview's overall ranking draws each system's real-item share as a bar.
// Source-level pins, like test/fable-pass29.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p) => readFile(new URL(p, import.meta.url), 'utf8');
const [jev, mm] = await Promise.all([read('../app/jev-models/page.tsx'), read('../app/jev-models/multimodal-preview/page.tsx')]);

test('F-157: the CR-118.4 note is rendered inside the board, after the ranking chart, with its wording intact', () => {
  const board = jev.indexOf('<JevModelsV12Board view={view} tasks={tasks}>');
  const note = jev.indexOf('data-bh-jev-score-change');
  const findings = jev.indexOf('aria-labelledby="jev12-headline"');
  assert.ok(board > 0 && note > 0 && findings > 0, 'board, note and findings section exist');
  assert.ok(board < note && note < findings, 'the note is the first child of the board, before "What the run says"');
  assert.match(jev, /What changed in the score<\/h2>/);
  assert.match(jev, /barely better than guessing could rank high; intelligence is now measured above chance, and systems below half-way get a growing penalty\. The tasks, Calibration, Speed, Cost and ranking eligibility are unchanged\./);
  assert.equal(jev.match(/data-bh-jev-score-change/g).length, 1, 'exactly one note');
});

test('F-158: the preview banner is the one required sentence; the ranking has no Calibration column', () => {
  assert.match(mm, /data-bh-mm-preview-banner>\s*\{\/\*[^]*?\*\/\}\s*<p className="text-lg font-bold">Preview — multimodal JevBench, results may change; not part of the JevBench Score<\/p>/);
  assert.doesNotMatch(mm, /uppercase tracking-\[\.12em\]">Preview<\/p>/, 'no second "Preview" eyebrow inside the banner');
  assert.doesNotMatch(mm, /<th className="p-3 text-right">Calibration<\/th>/, 'no Calibration column');
  assert.doesNotMatch(mm, /<td className="p-3 text-right">Not measured<\/td>/, 'no constant "Not measured" cell');
  assert.match(mm, /Calibration was not measured because these runs returned labels rather than probability distributions\./, 'the sentence above the table still says it');
  assert.match(mm, /robots: \{ index: false, follow: false/, 'CR-119.1 noindex unchanged');
});

test('F-159: the "All real" cell carries the share as a bar (width = accuracy %, floor 2 %) and exposes the value', () => {
  assert.match(mm, /data-bh-mm-real=\{s\.overall\.accuracy\.toFixed\(4\)\}/);
  assert.match(mm, /<span className="block h-full rounded-full bg-accent" style=\{\{ width: `\$\{Math\.max\(2, s\.overall\.accuracy \* 100\)\}%` \}\} \/>/);
  assert.match(mm, /aria-hidden="true"/, 'the bar is decorative; the number is the accessible value');
});

test('F-160: the JevBench eyebrow that hosts CustomEvaluationOffer is a <div>, not a <p> (the offer mounts a <div> toast inside it)', () => {
  assert.match(jev, /<div className="bh-eyebrow flex flex-nowrap items-center">[^]*?<CustomEvaluationOffer \/><\/div>/);
  assert.doesNotMatch(jev, /<p className="bh-eyebrow flex flex-nowrap items-center">/);
});
