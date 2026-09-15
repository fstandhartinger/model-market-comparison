// P2 follow-up (2026-09-15): retained states keep the catalog ids of their day. Renamed ids
// are mapped when states are read, and a row retained while unmatched is not a drop-out once
// the matcher joins the same source row. Synthetic fixture values: not production claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildState, canonicalRetainedRow, datedEstimates } from '../lib/benchmark-history.mjs';

const obs = (i, value, subject) => ({
  id: `o${i}`, value, benchmark_id: 'bench::1', basis: 'measured', unit: 'fraction',
  subject: { name: `Model ${i}`, harness: 'Claude Code', variant: null, model_id: null, source_id: `src${i}`, ...subject },
  source: { url: 'https://example.org', retrieved_at: '2026-09-01', published_at: null, file: 'f.json', locator: `rows[${i}]` },
});
const anchors = (scale) => [1, 2, 3, 4].map((i) => obs(i, 0.1 * i * scale, { model_id: `anchor-${i}::max`, variant: 'max' }));
const registry = { entries: [{ id: 'bench::1', family: 'bench', version: '1', status: 'active', scoring: { unit: 'fraction', higher_better: true } }] };
const state = (rows) => buildState(rows, { state_id: '20260912-aaaaaaaa', source: 'synthetic', collected_at: '2026-09-12T00:00:00.000Z' });

test('renamed harness-only catalog ids map to the catalog configuration', () => {
  const r = canonicalRetainedRow({ model_key: 'opus-5::max|Claude Code|max', model_id: 'opus-5::max', catalog_model_id: null });
  assert.equal(r.model_key, 'claude-opus-5::max|Claude Code|max');
  assert.equal(r.model_id, 'claude-opus-5::max');
  assert.equal(canonicalRetainedRow({ model_key: 'fable-5.1-with-fallback::max||', model_id: 'fable-5.1-with-fallback::max' }).model_id, 'claude-fable-5.1::max');
  const untouched = { model_key: 'claude-opus-4.7::medium||', model_id: 'claude-opus-4.7::medium', catalog_model_id: null };
  assert.equal(canonicalRetainedRow(untouched), untouched);
});

test('a retained row under a renamed id is not a drop-out', () => {
  const old = state([...anchors(1), obs(9, 0.5, { model_id: 'opus-5::max', variant: 'max' })]);
  const live = [...anchors(1), obs(9, 0.5, { model_id: 'claude-opus-5::max', variant: 'max' })];
  assert.deepEqual(datedEstimates(live, registry, [old]), []);
});

test('a row retained unmatched is not a drop-out once the same source row is joined', () => {
  const old = state([...anchors(1), obs(9, 0.5, {})]);
  const live = [...anchors(1), obs(9, 0.5, { model_id: 'glm-5.2::max', variant: 'max' })];
  assert.deepEqual(datedEstimates(live, registry, [old]), []);
});

test('a configuration that really vanished still gets an estimate', () => {
  const old = state([...anchors(1), obs(9, 0.5, { model_id: 'gone::max', variant: 'max' })]);
  const out = datedEstimates(anchors(1.1), registry, [old]);
  assert.equal(out.length, 1);
  assert.equal(out[0].status, 'estimated');
});
