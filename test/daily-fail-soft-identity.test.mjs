// 17 Sep 2026: single source changes (an AA rename, a renamed score subject) must not cost the whole day's refresh.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stickyAaFamilyKey } from '../lib/aa-identity.mjs';
import { reconcileScoreModelIds } from '../lib/benchmark-scores.mjs';

const PRO = 'bf220674-68bd-43cc-a1b8-ce5ed4d2f18d';

test('an AA rename keeps the published family key (DeepSeek V4 Pro → "DeepSeek V4 Pro 0424")', () => {
  const naturalRowIds = new Map([['deepseek-v4-pro-0424::max', PRO], ['deepseek-v4-pro-0813::max', 'other']]);
  assert.equal(stickyAaFamilyKey({ aaId: PRO, naturalKey: 'deepseek-v4-pro-0424', variant: 'max', publishedKey: 'deepseek-v4-pro', naturalRowIds }), 'deepseek-v4-pro');
  // Unpublished model: its own name decides.
  assert.equal(stickyAaFamilyKey({ aaId: 'new', naturalKey: 'deepseek-v4-pro-0813', variant: 'max', publishedKey: undefined, naturalRowIds }), 'deepseek-v4-pro-0813');
});

test('a genuine split is not treated as a rename: another model that now derives the published id keeps it', () => {
  const naturalRowIds = new Map([['deepseek-v4-pro-0424::max', PRO], ['deepseek-v4-pro::max', 'a-new-uuid']]);
  assert.equal(stickyAaFamilyKey({ aaId: PRO, naturalKey: 'deepseek-v4-pro-0424', variant: 'max', publishedKey: 'deepseek-v4-pro', naturalRowIds }), 'deepseek-v4-pro-0424');
});

test('score rows under a renamed catalog id are re-keyed by AA UUID; unresolvable rows are withheld, not fatal', () => {
  const models = [{ id: 'deepseek-v4-pro-0424::max', aa_model_id: PRO, variant: 'max' }, { id: 'glm-5.2::default', aa_model_id: 'g', variant: 'default' }];
  // An OpenRouter row of the renamed model follows the rename learned from the AA row.
  const obs = (id, modelId, sourceId, variant = 'max') => ({ id, benchmark_id: 'b', subject: { source_id: sourceId, name: 'x', model_id: modelId, variant, harness: null } });
  const snapshot = { schema_version: 1, observations: [obs('o1', 'deepseek-v4-pro::max', PRO), obs('o2', 'gone::max', 'unknown-uuid'), obs('o3', 'glm-5.2::default', 'g', 'default'), obs('o4', null, 'x'), obs('o5', 'deepseek-v4-pro::max', 'openrouter:deepseek/deepseek-v4-pro')],
    missing: [{ model_id: 'deepseek-v4-pro::max', benchmark_id: 'c', status: 'unknown' }, { model_id: 'gone::max', benchmark_id: 'c', status: 'unknown' }], collections: [], rejected: [] };
  const { snapshot: out, remapped, withheld } = reconcileScoreModelIds(snapshot, models);
  assert.deepEqual(out.observations.map((o) => [o.id, o.subject.model_id]), [['o1', 'deepseek-v4-pro-0424::max'], ['o3', 'glm-5.2::default'], ['o4', null], ['o5', 'deepseek-v4-pro-0424::max']]);
  assert.deepEqual(out.missing.map((m) => m.model_id), ['deepseek-v4-pro-0424::max']);
  assert.deepEqual(remapped, ['deepseek-v4-pro::max → deepseek-v4-pro-0424::max']);
  assert.deepEqual(withheld, ['o2', 'missing:gone::max:c']);
  assert.equal(snapshot.observations[0].subject.model_id, 'deepseek-v4-pro::max', 'input snapshot is not mutated');
});

test('nothing to reconcile returns the snapshot itself', () => {
  const snapshot = { schema_version: 1, observations: [{ id: 'o', benchmark_id: 'b', subject: { source_id: 'g', model_id: 'glm-5.2::default' } }], missing: [], collections: [], rejected: [] };
  assert.equal(reconcileScoreModelIds(snapshot, [{ id: 'glm-5.2::default', aa_model_id: 'g' }]).snapshot, snapshot);
});
