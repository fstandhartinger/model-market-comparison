import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// 2026-09-16: the daily refresh of 16 Sep reached the last gate and died there. The critic
// (GLM-5.3-Flash) returned verdict "pass", zero findings and zero errors on the aa_efficiency
// contract — and then used `missing_evidence` for a methodological caveat whose own text says
// "that is an owner-side limitation, not missing source evidence". `clean` requires an empty
// `missing_evidence`, so a review that found nothing wrong discarded the day's publication.
// The gate is unchanged; the field contract it depends on is now stated in the prompt.
// (The prompt is a template literal: names are written bare, never in backticks.)
test('the critic prompt says what missing_evidence is for, and what it is not for', async () => {
  const src = await readFile(new URL('../ops/daily/gauntlet.mjs', import.meta.url), 'utf8');
  const task = /const CRITIC_TASK = `([\s\S]*?)`;/.exec(src)?.[1];
  assert.ok(task, 'the critic task is a single template literal');
  assert.match(task, /The missing_evidence array lists ONLY relevant source values that are absent from the packet/);
  assert.match(task, /a non-empty missing_evidence fails the review, so leave it EMPTY when nothing relevant is missing/);
  assert.match(task, /belong in uncertainties, never in missing_evidence/);
  // The gate itself must still treat a non-empty missing_evidence as not clean.
  assert.match(src, /const clean = review\.verdict === 'pass' && review\.errors_found === 0 && !review\.missing_evidence\.length && coverageComplete/);
  // And the prompt must not have gained any licence to pass with unresolved findings.
  assert.match(task, /An unresolved finding or missing relevant evidence prevents pass/);
});
