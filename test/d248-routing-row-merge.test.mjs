// D248 (iteration 263, 2026-09-28). Five catalog families held one product on two rows: an
// Artificial Analysis row carrying the benchmarks and an `::openrouter` routing row carrying the
// price. Two of them split for HuggingFace reasons, and both are repaired here:
//
//   command-a+                  AA links `CohereLabs/command-a-plus-05-2026-bf16`; the route
//                               `cohere/command-a-plus` publishes no repository at all. A
//                               repository on the row cannot be evidence against a route that
//                               names none, so it must not block the merge.
//   nemotron-3-super-120b-a12b  AA links the `-BF16` repository, OpenRouter serves the `-FP8`
//                               one. Same release, different serving precision.
//
// The three that remain open have other causes (two live Google `-preview` SKUs, and an AA row
// that retains a slug for a different OpenAI product); see PROGRESS.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stableHuggingFaceId, weightsHuggingFaceId, sameHuggingFaceModel } from '../lib/huggingface-identity.mjs';

const dataset = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url), 'utf8'));
const openRouter = JSON.parse(readFileSync(new URL('../data/raw/openrouter.json', import.meta.url), 'utf8'));
const rowsOf = (familyKey) => dataset.models.filter((m) => m.family_key === familyKey);

test('a serving-precision suffix is not part of the model identity', () => {
  assert.equal(
    weightsHuggingFaceId('https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16'),
    weightsHuggingFaceId('nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8'),
  );
  assert.ok(sameHuggingFaceModel('nvidia/X-BF16', 'nvidia/X-fp8'));
  // The normalized spelling keeps the suffix: only the identity comparison drops it.
  assert.equal(stableHuggingFaceId('https://huggingface.co/Nvidia/X-BF16/'), 'nvidia/x-bf16');
  // A missing repository matches nothing, in either position.
  assert.equal(sameHuggingFaceModel('', ''), false);
  assert.equal(sameHuggingFaceModel('nvidia/x', null), false);
  assert.equal(sameHuggingFaceModel(undefined, 'nvidia/x'), false);
  // Two different releases stay different; the suffix list is closed, not a general last-token strip.
  assert.equal(sameHuggingFaceModel('nvidia/x-120b', 'nvidia/x-70b'), false);
  assert.equal(sameHuggingFaceModel('meta/llama-4-scout', 'meta/llama-4-maverick'), false);
});

test('dropping the precision suffix collapses exactly one pair in the live catalog', () => {
  const byWeights = new Map();
  const note = (id) => {
    if (!id) return;
    const key = weightsHuggingFaceId(id);
    if (!byWeights.has(key)) byWeights.set(key, new Set());
    byWeights.get(key).add(stableHuggingFaceId(id));
  };
  for (const m of dataset.models) {
    note(m.aa_metadata?.huggingface_url);
    note(m.openrouter_metadata?.hugging_face_id);
  }
  for (const route of openRouter.models || []) note(route.hugging_face_id);
  const collapsed = [...byWeights].filter(([, spellings]) => spellings.size > 1).map(([key]) => key);
  assert.deepEqual(collapsed, ['nvidia/nvidia-nemotron-3-super-120b-a12b']);
});

test('D248: the two HuggingFace-caused routing rows are gone and their prices moved to the benchmarked row', () => {
  for (const familyKey of ['command-a+', 'nemotron-3-super-120b-a12b']) {
    const rows = rowsOf(familyKey);
    assert.equal(rows.length, 1, `${familyKey} is held on one row`);
    assert.ok(!rows[0].id.endsWith('::openrouter'), rows[0].id);
    // The row that carries the benchmarks now carries the price, which is the whole point.
    assert.ok(Object.values(rows[0].benchmarks || {}).some((v) => v != null), `${familyKey} has benchmarks`);
    assert.ok(rows[0].offers.length > 0, `${familyKey} has offers`);
    assert.equal(rows[0].has_pricing, true, `${familyKey} has pricing`);
  }
});

test('D248: every OpenRouter route of the two repaired families is still reachable', () => {
  const reachable = (familyKey) => new Set(
    rowsOf(familyKey).flatMap((r) => r.offers).filter((o) => o.or_model_id).map((o) => o.or_model_id),
  );
  assert.deepEqual([...reachable('command-a+')].sort(), ['cohere/command-a-plus']);
  assert.deepEqual([...reachable('nemotron-3-super-120b-a12b')].sort(), [
    'nvidia/nemotron-3-super-120b-a12b', 'nvidia/nemotron-3-super-120b-a12b:free',
  ]);
});
