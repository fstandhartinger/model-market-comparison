// 17 Sep 2026: single source changes (an AA rename, a renamed score subject) must not cost the whole day's refresh.
import test from 'node:test';
import assert from 'node:assert/strict';
import { aaKeyFrozen, stickyAaFamilyKey } from '../lib/aa-identity.mjs';
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

// 17 Sep 2026, second lesson (found by the CR-73.1 prices dry run): the first freeze lasted one
// build. The 13:36 run published `deepseek-v4-pro::max` under AA's new name, so the next build saw
// the names agree again, renamed the row, and seven tests plus every stored score row and public
// URL of that family broke. A freeze is recorded and holds.
test('a freeze holds after the renamed name itself is published', () => {
  const frozen = (over = {}) => aaKeyFrozen({ publishedKey: 'deepseek-v4-pro', publishedName: 'DeepSeek V4 Pro 0424 (Reasoning, Max Effort)',
    currentName: 'DeepSeek V4 Pro 0424 (Reasoning, Max Effort)', publishedNaturalKey: 'deepseek-v4-pro-0424',
    publishedFreeze: { aa_model_id: PRO, family_key: 'deepseek-v4-pro' }, knownFreezes: true, ...over });
  assert.equal(frozen(), true, 'the recorded freeze decides, not the name');
  assert.equal(frozen({ publishedFreeze: undefined, knownFreezes: false }), true,
    'a dataset published before the record is read back through its own key: the published name no longer derives it');
  assert.equal(frozen({ publishedFreeze: undefined, knownFreezes: true }), false,
    'once freezes are recorded, an unrecorded row follows its name again');
  assert.equal(frozen({ publishedFreeze: { aa_model_id: PRO, family_key: 'some-older-key' } }), false,
    'a stale record for a key we no longer publish does not freeze anything');
});

test('the first build after a rename freezes, and an unrenamed model never does', () => {
  assert.equal(aaKeyFrozen({ publishedKey: 'deepseek-v4-pro', publishedName: 'DeepSeek V4 Pro (Reasoning, Max Effort)',
    currentName: 'DeepSeek V4 Pro 0424 (Reasoning, Max Effort)', publishedNaturalKey: 'deepseek-v4-pro', knownFreezes: true }), true);
  // Same name, key derives from it: our own normalization or alias changes still take effect.
  assert.equal(aaKeyFrozen({ publishedKey: 'glm-5.2', publishedName: 'GLM-5.2', currentName: 'GLM-5.2', publishedNaturalKey: 'glm-5.2', knownFreezes: true }), false);
  assert.equal(aaKeyFrozen({ publishedKey: undefined, publishedName: undefined, currentName: 'Brand New Model', publishedNaturalKey: null, knownFreezes: true }), false);
});
