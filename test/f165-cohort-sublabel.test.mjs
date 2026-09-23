// F-165(b): the sub-line under a benchmark name prints the cohort only when it says something.
//
// "Published board" is the default `cohortOf` assigns to every axis with nothing more specific to
// report, so Compare printed it on every row — which is why two rows with the same name read
// identically there while the matrix and the ranking page already dropped it. These pin the rule
// itself and the fact that all three surfaces now share one implementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cohortSubLabel, cohortLabel, cohortOf } from '../lib/benchmark-view.mjs';
import { cohortSubLabel as matrixCohortSubLabel } from '../lib/benchmark-matrix.mjs';

test('the default cohort produces no sub-line', () => {
  assert.equal(cohortSubLabel('Published board'), null);
  assert.equal(cohortSubLabel(''), null);
  assert.equal(cohortSubLabel(null), null);
  assert.equal(cohortSubLabel(undefined), null);
});

test('a cohort that names something keeps its reader-facing label', () => {
  assert.equal(cohortSubLabel('claude-code'), 'Claude Code');
  assert.equal(cohortSubLabel('grok-build'), 'Grok Build');
  // Anything unlisted is shown as the source spells it, exactly as cohortLabel does.
  assert.equal(cohortSubLabel('Vals: compute_effort max'), cohortLabel('Vals: compute_effort max'));
  assert.equal(cohortSubLabel("Anthropic's launch post"), "Anthropic's launch post");
});

test('the matrix re-exports the same rule, so the surfaces cannot drift apart', () => {
  for (const cohort of ['Published board', null, 'claude-code', 'musecode', 'some board split']) {
    assert.equal(matrixCohortSubLabel(cohort), cohortSubLabel(cohort), `disagreement on ${JSON.stringify(cohort)}`);
  }
});

test('a row with no harness and no stated configuration still lands on the default cohort', () => {
  // The guard that makes the rule worth having: this is what the vendor launch rows produce today,
  // which is why F-165(a) — naming the runner — is still open.
  const observation = {
    id: 'self-reported:example-launch-row',
    benchmark_id: 'anthropic-terminal-bench-4-0::4.0',
    protocol: 'Vendor-reported by Anthropic for Claude Opus 5.5 in the Claude Opus 5.5 launch post.',
    subject: { harness: null },
  };
  assert.equal(cohortOf(observation), 'Published board');
  assert.equal(cohortSubLabel(cohortOf(observation)), null);
});
