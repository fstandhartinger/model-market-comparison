// Fable pass 30 (2026-09-22): the surfaces that changed after pass 29 — the JevBench page after v1.3.0 (CR-118) and the multimodal
// preview (CR-119). F-157: the "What changed in the score" note follows the board it explains instead of standing between the page
// head and the ranking. F-158: the preview's ranking has no column whose every cell reads "Not measured", and the warning banner
// carries the candidate/release-pending label. F-159: the preview exposes the frozen public/sealed aggregates and top-five cut.
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

test('F-158: the candidate preview banner is clear, multi-axis results are labelled, and noindex remains', () => {
  assert.match(mm, /data-bh-mm-preview-banner/);
  assert.match(mm, /Preview — Image JevBench v0\.1 candidate; not part of the JevBench Score/);
  assert.match(mm, /Calibration<\/th>/, 'calibration is a measured candidate axis');
  assert.match(mm, /Results and the release decision remain under review/);
  assert.match(mm, /robots: \{ index: false, follow: false/, 'CR-119.1 noindex unchanged');
});

test('F-159: the candidate rankings show public and sealed aggregates, receipt coverage and the top-five review cut', () => {
  assert.match(mm, /data-bh-mm-ranking=\{track\}/);
  assert.match(mm, /Public accuracy/);
  assert.match(mm, /Sealed accuracy/);
  assert.match(mm, /Cost coverage/);
  assert.match(mm, /Current top five by candidate composite/);
  assert.match(mm, /data-bh-djev-spark-sealed-photo/);
});

test('F-160: the JevBench eyebrow that hosts CustomEvaluationOffer is a <div>, not a <p> (the offer mounts a <div> toast inside it)', () => {
  assert.match(jev, /<div className="bh-eyebrow flex flex-nowrap items-center">[^]*?<CustomEvaluationOffer \/><\/div>/);
  assert.doesNotMatch(jev, /<p className="bh-eyebrow flex flex-nowrap items-center">/);
});
