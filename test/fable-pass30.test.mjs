// Fable pass 30 (2026-09-22): the surfaces that changed after pass 29 — the JevBench page after v1.3.0 (CR-118) and the multimodal
// preview (CR-119). F-157: the "What changed in the score" note follows the board it explains instead of standing between the page
// head and the ranking. F-158: the image ranking retains measured axes and the legacy route stays noindex after release.
// F-159: the page exposes the frozen public/sealed aggregates and top-five cut.
// Source-level pins, like test/fable-pass29.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p) => readFile(new URL(p, import.meta.url), 'utf8');
const [jev, history, mm] = await Promise.all([read('../app/jev-models/page.tsx'), read('../components/JevHistoryContent.tsx'), read('../app/jev-models/multimodal-preview/page.tsx')]);

test('F-157: the CR-118.4 note is rendered inside the board, after the ranking chart, with its wording intact', () => {
  const board = history.indexOf('<JevModelsV12Board view={view} tasks={tasks}>');
  const note = history.indexOf('data-bh-jev-score-change');
  const findings = history.indexOf('aria-labelledby="jev12-headline"');
  assert.ok(board > 0 && note > 0 && findings > 0, 'board, note and findings section exist');
  assert.ok(board < note && note < findings, 'the note is the first child of the board, before "What the run says"');
  assert.match(history, /What changed in the score<\/h2>/);
  assert.match(history, /barely better than guessing could rank high; intelligence is now measured above chance, and systems below half-way get a growing penalty\. The tasks, Calibration, Speed, Cost and ranking eligibility are unchanged\./);
  assert.equal(history.match(/data-bh-jev-score-change/g).length, 1, 'exactly one note');
});

test('F-158: the released image page labels measured axes and the legacy preview remains noindex', () => {
  assert.match(mm, /Calibration<\/th>/, 'calibration is a measured axis');
  assert.match(mm, /Top five by composite score/);
  assert.doesNotMatch(mm, /Results and the release decision remain under review/);
  assert.match(mm, /robots: \{ index: false, follow: false/, 'legacy preview remains noindex');
});

test('F-159: the candidate rankings show public and sealed aggregates, receipt coverage and the top-five review cut', () => {
  assert.match(mm, /data-bh-mm-ranking=\{track\}/);
  assert.match(mm, /Public accuracy/);
  assert.match(mm, /Sealed accuracy/);
  assert.match(mm, /Cost coverage/);
  assert.match(mm, /Top five by composite score/);
  assert.match(mm, /data-bh-djev-spark-sealed-photo/);
});

test('F-160: the JevBench eyebrow that hosts CustomEvaluationOffer is a <div>, not a <p> (the offer mounts a <div> toast inside it)', () => {
  assert.match(jev, /<div className="bh-eyebrow flex flex-nowrap items-center">[^]*?<CustomEvaluationOffer \/><\/div>/);
  assert.doesNotMatch(jev, /<p className="bh-eyebrow flex flex-nowrap items-center">/);
});
