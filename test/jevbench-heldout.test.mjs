import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { jevbenchV12HeldoutView } from '../lib/jevbench-v12-heldout.mjs';

const artifact = JSON.parse(await readFile(new URL('../ops/ux-2026-09-12/jevbench/v1.2.14/jevbench-v1.2-per-task.json', import.meta.url)));

test('hard held-out diagnostic recomputes from frozen answers and totals', () => {
  const view = jevbenchV12HeldoutView(artifact);
  assert.equal(view.publicItems, 111);
  assert.equal(view.heldoutItems, 109);
  assert.ok(view.fieldN >= 25);
  const semif = view.rows.find((r) => r.key === 'semif-qwen3.5-4b');
  assert.deepEqual([semif.publicCorrect, semif.publicN, semif.heldoutCorrect, semif.heldoutN], [68, 111, 63, 109]);
  assert.ok(Math.abs(semif.gap - (68 / 111 - 63 / 109)) < 1e-12);
  assert.ok(semif.ciLow < semif.gap && semif.gap < semif.ciHigh);
});

test('page keeps the diagnostic out of the main table and uses neutral wording', async () => {
  const page = await readFile(new URL('../app/jev-models/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /id="held-out-diagnostic"/);
  assert.match(page, /Training on JevBench(?:&apos;|’|')s public split is allowed/);
  assert.doesNotMatch(page, /contaminated/i);
});
