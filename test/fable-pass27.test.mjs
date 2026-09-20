// Fable pass 27 (2026-09-20): the surfaces that changed after pass 26 — the custom-evaluation pill beside the JevBench eyebrow on
// phones (F-147), the runner-disagreement footnote on the Benchmaxxing report (F-148), a vendor row of the benchmark sheet saying
// "developer's claim" once (F-146 follow-up), the Cost bullet's unit note without its repeated sentence and the table's
// honorable-mention row with the rule's first sentence only (F-142/F-141 follow-ups). Source-level pins, like test/fable-pass25.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p) => readFile(new URL(p, import.meta.url), 'utf8');
const [page, css, sheet, report, jev] = await Promise.all([
  read('../app/jev-models/page.tsx'), read('../app/globals.css'), read('../components/BenchmarkSheetLazy.tsx'),
  read('../components/BenchmaxxingReport.tsx'), read('../components/JevModelsV12.tsx'),
]);

test('F-147: below sm the eyebrow is "JevBench v1.2" and the pill text is never smaller than 10 px', () => {
  assert.match(page, /<span className="sm:hidden">JevBench v1\.2<\/span><span className="hidden sm:inline">JevBench v1\.2 · our own benchmark<\/span>/);
  const phone = css.match(/@media \(max-width: 639px\) \{\s*\.bh-custom-evaluation-badge \{[^}]*\}/)?.[0];
  assert.ok(phone, 'the phone rule for the badge exists');
  assert.match(phone, /font-size: 10px; line-height: 14px/);
  assert.doesNotMatch(css, /font-size: 8px/, 'no 8 px text anywhere in the stylesheet');
});

test('F-148: the runner-disagreement footnote is two short sentences; each runner name carries its harness as a title', () => {
  const note = report.match(/data-bmx-runner-disagreement-note>([\s\S]*?)<\/p>/)?.[1];
  assert.ok(note);
  assert.equal((note.match(/[.!?](?=\s|$)/g) || []).length, 2, 'two sentences');
  assert.doesNotMatch(note, /\{large\[0\]/, 'the harness descriptions are no longer printed in the note');
  assert.match(report, /<span title=\{`\$\{d\.a\.runner\}: \$\{d\.a\.harness\}`\} data-bmx-runner-a>\{d\.a\.runner\}<\/span>/);
  assert.match(report, /<span title=\{`\$\{d\.b\.runner\}: \$\{d\.b\.harness\}`\} data-bmx-runner-b>\{d\.b\.runner\}<\/span>/);
  assert.match(note, /never paired/); assert.match(note, /not part of the score/);
});

test("F-146 follow-up: a vendor row says developer's claim where a measured row shows its percentile — once, not beside 'no percentile'", () => {
  assert.match(sheet, /\{a\.basis === 'self_reported' \? "developer's claim" : 'no percentile'\}/);
  assert.match(sheet, /\{a\.pct != null && <span className="bh-muted ml-1 text-xs font-normal">developer&apos;s claim<\/span>\}/, 'the trailing words appear only when a bar is shown instead');
});

test('F-142 follow-up: the full cost-unit note does not say "one decision is a whole question" twice', () => {
  const full = jev.match(/\? <>💲 [\s\S]*?<\/>/)?.[0];
  assert.ok(full);
  assert.doesNotMatch(full, /its state, its rubric and its options/, 'the hand-written clause is gone; worked_example opens with the same sentence');
  assert.match(full, /\{view\.costUnit\.worked_example\}/);
});

test('F-141 follow-up: the table honorable-mention row carries the first sentence of the rule only', () => {
  assert.match(jev, /shown, not ranked: \{firstSentence\(view\.honorableMentions\?\.rule \?\? ''\)\}/);
});
