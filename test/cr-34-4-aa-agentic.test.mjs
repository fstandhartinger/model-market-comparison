// CR-34.4 (Florian 2026-09-17): attach Artificial Analysis's Agentic Index — relayed
// by OpenRouter's Benchmarks API because AA's own free API has no agentic field — to
// the catalog at family scope on the deterministic representative, and never guess
// joins: an unmatched or ambiguous display name stays out, and a matched value is
// attached exactly once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { agenticRowsFromRelay, joinAgenticRow, aaNameIndex, buildAgenticAttachment, effortSuffix, normalizeAaName } from '../lib/aa-agentic-index.mjs';
import { buildHeadlineObservations, HEADLINE_REGISTRY } from '../lib/headline-history.mjs';

const aaModels = [
  { id: 'aa-fable', name: 'Claude Fable 5.1 (Adaptive Reasoning, High Effort)' },
  { id: 'aa-deepseek-pro', name: 'DeepSeek V4 Pro 0424 (Reasoning, Max Effort)' },
  { id: 'aa-deepseek-pro-high', name: 'DeepSeek V4 Pro 0424 (Reasoning, High Effort)' },
  { id: 'aa-glm', name: 'GLM-5.3 Flash' },
  { id: 'aa-plain', name: 'Plain Model' },
];
const catalogRows = [
  { id: 'claude-fable-5.1::high', aa_model_id: 'aa-fable', family_key: 'claude-fable-5.1', variant: 'high' },
  { id: 'deepseek-v4-pro::max', aa_model_id: 'aa-deepseek-pro', family_key: 'deepseek-v4-pro', variant: 'max' },
  { id: 'deepseek-v4-pro::high', aa_model_id: 'aa-deepseek-pro-high', family_key: 'deepseek-v4-pro', variant: 'high' },
  { id: 'glm-5.3-flash::default', aa_model_id: 'aa-glm', family_key: 'glm-5.3-flash', variant: 'default' },
  { id: 'plain-model::default', aa_model_id: 'aa-plain', family_key: 'plain-model', variant: 'default' },
];
const names = aaNameIndex(aaModels);
const relay = {
  retrieved_at: '2026-09-18T00:02:02Z', sha256: 'x'.repeat(64),
  data_code: undefined,
  data: [
    { source: 'artificial-analysis', display_name: 'Claude Fable 5.1 (Adaptive Reasoning, High Effort)', agentic_index: 58, model_permaslug: 'anthropic/claude-fable-5.1' },
    { source: 'artificial-analysis', display_name: 'DeepSeek V4 Pro (Reasoning, Max Effort)', agentic_index: 27.7, model_permaslug: 'deepseek/deepseek-v4-pro-20260423' },
    { source: 'artificial-analysis', display_name: 'GLM-5.3-Flash', agentic_index: 51.2, model_permaslug: 'zhipu/glm-5.3-flash' },
    { source: 'artificial-analysis', display_name: 'Ambiguous Name', agentic_index: 1, model_permaslug: 'x/y' },
    { source: 'artificial-analysis', display_name: 'Unknown Model', agentic_index: 9, model_permaslug: 'unknown/x' },
    { source: 'openrouter', display_name: 'Not AA', agentic_index: 42, model_permaslug: 'o/r' },
  ],
};

test('relay rows keep only artificial-analysis agentic_index values', () => {
  const rows = [...agenticRowsFromRelay(relay).values()];
  assert.equal(rows.length, 5);
  assert.ok(rows.every((r) => typeof r.value === 'number' && r.value > 0));
  assert.equal(rows.filter((r) => r.name === 'GLM-5.3-Flash').length, 1);
});

test('exact names join; normalized aliases join; permaslug resolves dated-AA aliases; unmatched names are rejected', () => {
  const fable = joinAgenticRow({ name: 'Claude Fable 5.1 (Adaptive Reasoning, High Effort)', value: 58, permaslug: 'anthropic/claude-fable-5.1' }, names);
  assert.equal(fable.aaId, 'aa-fable');
  const rejectedUnknown = joinAgenticRow({ name: 'Unknown Model', value: 9, permaslug: 'unknown/x' }, names);
  assert.equal(rejectedUnknown.aaId, null);
  assert.match(rejectedUnknown.reason, /not in the current AA snapshot/);
});

test('the attachment is one value per family, on the deterministic representative, with an honest note', () => {
  const familyOfAaId = (id) => catalogRows.find((r) => r.aa_model_id === id)?.family_key ?? null;
  const familyRows = (familyKey) => catalogRows.filter((r) => r.family_key === familyKey);
  const out = buildAgenticAttachment({
    relay, aaModels, familyOfAaId, familyRows,
    aaFamilyOfSlug: (slug) => ({ 'anthropic/claude-fable-5.1': 'claude-fable-5.1', 'deepseek/deepseek-v4-pro-20260423': 'deepseek-v4-pro', 'zhipu/glm-5.3-flash': 'glm-5.3-flash' })[slug] ?? null,
  });
  assert.equal(out.measured.length, 3);
  assert.equal(out.rejected.length, 2);
  for (const m of out.measured) assert.match(m.note, /deterministic family representative/);
  const reps = out.measured.map((m) => m.rep_id);
  assert.equal(reps.length, new Set(reps).size);
  const fable = out.measured.find((m) => m.name.startsWith('Claude Fable'));
  assert.equal(fable.via, 'exact-name');
  assert.equal(fable.rep_id, 'claude-fable-5.1::high');
  const deepseek = out.measured.find((m) => m.name === 'DeepSeek V4 Pro (Reasoning, Max Effort)');
  assert.equal(deepseek.via, 'permaslug');
  assert.equal(deepseek.rep_id, 'deepseek-v4-pro::max');
  const glm = out.measured.find((m) => m.name === 'GLM-5.3-Flash');
  assert.equal(glm.via, 'normalized-name');
});

test('effortSuffix understands trailing parentheticals only', () => {
  assert.equal(effortSuffix('DeepSeek V4 Pro (Reasoning, Max Effort)'), 'reasoning, max effort');
  assert.equal(effortSuffix('GLM-5.3-Flash'), '');
});

test('the agentic board enters the headline registry and observations without breaking the 3-way call sites', () => {
  assert.ok(HEADLINE_REGISTRY.some((b) => b.id === 'aa-agentic-index::snapshot'));
  const rows = buildHeadlineObservations({ modelRows: catalogRows, agentic: { measured: [{ aa_id: 'aa-fable', name: 'Claude Fable 5.1 (Adaptive Reasoning, High Effort)', value: 58, via: 'exact' }], retrieved_at: '2026-09-18T00:02:02Z', source_file: 'capture.gz', sha256: 'y'.repeat(64) } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].benchmark_id, 'aa-agentic-index::snapshot');
  assert.equal(rows[0].subject.model_id, 'aa-fable');
  assert.equal(rows[0].subject.catalog_model_id, 'claude-fable-5.1::high');
  assert.match(rows[0].protocol, /relayed by OpenRouter/);
});
