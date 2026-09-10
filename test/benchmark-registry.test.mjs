import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateBenchmarkRegistry, benchmarkById } from '../lib/benchmark-registry.mjs';
import { parseAaBenchmarkFields, assertAaBenchmarkContinuity } from '../lib/aa-benchmark-fields.mjs';

// Synthetic Flight data: demonstrates units/zero/null/reference and duplicate behavior.
const id = '00000000-0000-4000-8000-000000000001';
const row = { id, slug: 'example-high', name: 'Example (high)', effort: '$b', intelligenceIndex: 40, gpqa: 0, hle: null, omniscience: -32, terminalbenchV21: 0.4, terminalbenchV40: 0.1, briefcaseBreakdown: '$c' };
const flight = (data) => `<script>self.__next_f.push(${JSON.stringify([1, `a:${JSON.stringify(data)}\nb:{"slug":"high"}\nc:{"overall":{"elo":1234}}\n`])})</script>`;
const provenance = { source_url: 'https://artificialanalysis.ai/models/example', collected_at: '2026-09-10T12:00:00Z', source_sha256: 'a'.repeat(64), minimumRows: 1 };

test('AA discovery preserves exact identity, zero, null, negative score, version fields and references', () => {
  const s = parseAaBenchmarkFields(flight([row]), provenance);
  assert.equal(s.count, 1);
  assert.equal(s.rows[0].variant, 'high');
  assert.equal(s.rows[0].fields.gpqa, 0);
  assert.equal(s.rows[0].fields.hle, null);
  assert.equal(s.rows[0].fields.omniscience, -32);
  assert.equal(s.rows[0].fields.terminalbenchV21, 0.4);
  assert.equal(s.rows[0].fields.terminalbenchV40, 0.1);
  assert.deepEqual(s.rows[0].fields.briefcaseBreakdown, { overall: { elo: 1234 } });
  assert.equal(Object.hasOwn(s.rows[0].fields, 'tau2'), false);
});

test('AA discovery rejects incomplete, conflicting and nonnumeric source data', () => {
  assert.throws(() => parseAaBenchmarkFields(flight([row]), { ...provenance, minimumRows: 2 }), /incomplete/);
  assert.throws(() => parseAaBenchmarkFields(flight([row, { ...row, gpqa: 0.9 }]), provenance), /conflicting/);
  assert.throws(() => parseAaBenchmarkFields(flight([{ ...row, gpqa: '0.9' }]), provenance), /unexpected/);
  assert.throws(() => parseAaBenchmarkFields(flight([{ ...row, gpqa: true }]), provenance), /unexpected/);
  assert.throws(() => parseAaBenchmarkFields(flight([{ ...row, gpqa: {} }]), provenance), /unexpected/);
  assert.throws(() => parseAaBenchmarkFields(flight([{ ...row, effort: true }]), provenance), /effort/);
  assert.throws(() => parseAaBenchmarkFields(flight([row]), { ...provenance, source_sha256: null }), /provenance/);
  assert.throws(() => parseAaBenchmarkFields(flight([{ ...row, effort: '$d' }]), provenance), /unresolved/);
});

test('AA source continuity rejects field loss even when model count is unchanged', () => {
  const before = parseAaBenchmarkFields(flight([row]), provenance);
  const after = parseAaBenchmarkFields(flight([{ ...row, gpqa: null }]), provenance);
  assert.throws(() => assertAaBenchmarkContinuity(before, after), /coverage shrank: gpqa/);
  assert.doesNotThrow(() => assertAaBenchmarkContinuity(before, before));
});

test('accepted registry is complete and exact version lookup never falls back to family', async () => {
  const registry = validateBenchmarkRegistry(JSON.parse(await readFile(new URL('../data/raw/benchmarks/registry.json', import.meta.url))));
  const old = benchmarkById(registry, 'aa-coding-agent-index::1.4');
  const current = benchmarkById(registry, 'aa-coding-agent-index::1.5');
  assert.notEqual(old.id, current.id);
  assert.equal(old.status, 'retained');
  assert.equal(old.superseded_by, current.id);
  assert.throws(() => benchmarkById(registry, old.family), /Unknown benchmark version/);
  const clone = structuredClone(registry);
  clone.entries.push(structuredClone(clone.entries[0]));
  assert.throws(() => validateBenchmarkRegistry(clone), /duplicate/);
  const missing = structuredClone(registry);
  missing.entries[0].evidence = [];
  assert.throws(() => validateBenchmarkRegistry(missing), /evidence/);
  const mixed = structuredClone(registry);
  mixed.aa_field_map[0].benchmark_id = 'terminal-bench';
  assert.throws(() => validateBenchmarkRegistry(mixed), /field mapping/);
});

test('Coding Agent legacy observation date and current source version remain isolated', async () => {
  const old = JSON.parse(await readFile(new URL('../data/raw/aa-coding-agents.json', import.meta.url)));
  const current = JSON.parse(await readFile(new URL('../data/raw/aa-coding-agents-v1.5.json', import.meta.url)));
  assert.equal(old.collected_at, '2026-09-09');
  assert.equal(current.version, '1.5');
  assert.equal(old.count, 68);
  assert.ok(current.rows.every((r) => r.components.some((c) => c.id === 'terminal-bench-v4')));
});
