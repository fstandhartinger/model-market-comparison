import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateBenchmarkRegistry, benchmarkById, aaMappingApplies } from '../lib/benchmark-registry.mjs';
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

test('AA discovery reads the reviewed Terminal-Bench renames into the registry field names, and refuses a page carrying both', () => {
  const { terminalbenchV21, terminalbenchV40, ...rest } = row;
  const s = parseAaBenchmarkFields(flight([{ ...rest, terminalBench21: 0.4, terminalBench40: 0.1 }]), provenance);
  assert.equal(s.rows[0].fields.terminalbenchV21, 0.4);
  assert.equal(s.rows[0].fields.terminalbenchV40, 0.1);
  assert.equal(Object.hasOwn(s.rows[0].fields, 'terminalBench21'), false);
  assert.equal(s.inventory.find((f) => f.field === 'terminalbenchV40').numeric, 1);
  assert.throws(() => parseAaBenchmarkFields(flight([{ ...row, terminalBench21: 0.4 }]), provenance), /both terminalbenchV21 and terminalBench21/);
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

// 2026-09-21: AA re-fitted GDPval-AA (v2 → v2.1) and AA-Briefcase (→ v1.1) Elo under the same source fields and
// changed GDP.pdf's document delivery. The old identity reads only the 2026-09-10 snapshot, the successor only
// snapshots from 2026-09-21; nothing in between is attributed to either.
test('AA re-versioned fields: one identity per collection window, never both, never overlapping', async () => {
  const registry = validateBenchmarkRegistry(JSON.parse(await readFile(new URL('../data/raw/benchmarks/registry.json', import.meta.url))));
  const pairs = [['gdpval', 'aa-gdpval::2', 'aa-gdpval::2.1'], ['briefcaseBreakdown.overall.elo', 'aa-briefcase::snapshot-2026-09-10', 'aa-briefcase::1.1'],
    ['gdpPdfAllPass', 'aa-gdp-pdf::snapshot-2026-09-10', 'aa-gdp-pdf::snapshot-2026-09-21'],
    // Iteration 148: same task set, but AA dropped the mini-SWE-agent v2.4.6 pin and the 30 s command timeout.
    ['terminalbenchV40', 'aa-terminal-bench::4.0', 'aa-terminal-bench::4.0-upstream-timeouts']];
  for (const [field, oldId, newId] of pairs) {
    const maps = registry.aa_field_map.filter((m) => m.field === field);
    assert.deepEqual(maps.map((m) => m.benchmark_id).sort(), [oldId, newId].sort());
    const reading = (at) => maps.filter((m) => aaMappingApplies(m, at)).map((m) => m.benchmark_id);
    assert.deepEqual(reading('2026-09-10T21:47:16.627Z'), [oldId], `${field}: the retained snapshot`);
    assert.deepEqual(reading('2026-09-21T05:20:00Z'), [newId], `${field}: the next daily snapshot`);
    assert.deepEqual(reading('2026-09-15T00:00:00Z'), [], `${field}: an unreviewed in-between snapshot feeds neither`);
    assert.equal(benchmarkById(registry, oldId).superseded_by, newId);
    assert.equal(benchmarkById(registry, oldId).status, 'retained');
  }
  // Every other field keeps exactly one unbounded mapping.
  for (const m of registry.aa_field_map.filter((x) => !pairs.some(([f]) => f === x.field))) {
    assert.equal(m.collected_from ?? m.collected_until, undefined, m.field);
    assert.equal(registry.aa_field_map.filter((x) => x.field === m.field).length, 1, m.field);
  }
  const overlap = structuredClone(registry);
  delete overlap.aa_field_map.find((m) => m.benchmark_id === 'aa-gdpval::2.1').collected_from;
  assert.throws(() => validateBenchmarkRegistry(overlap), /overlapping AA field mapping gdpval/);
  const duplicate = structuredClone(registry);
  duplicate.aa_field_map.push({ ...duplicate.aa_field_map.find((m) => m.field === 'hle') });
  assert.throws(() => validateBenchmarkRegistry(duplicate), /overlapping AA field mapping hle/);
  const badDate = structuredClone(registry);
  badDate.aa_field_map.find((m) => m.benchmark_id === 'aa-gdpval::2').collected_until = 'soon';
  assert.throws(() => validateBenchmarkRegistry(badDate), /window gdpval/);
  assert.throws(() => aaMappingApplies({ field: 'x' }, 'not a date'), /collection time/);
});

test('AA methodology evidence: every active AA identity quotes a passage present in the capture it names', async () => {
  // AA edits this page in place (2026-09-21: sentence-final periods and a rewritten Terminal-Bench 4.0 harness
  // paragraph between 02:24 and 07:46), so each excerpt is checked against its own recorded capture and hash.
  // Terminal-Bench 4.0's rewrite became a new identity (aa-terminal-bench::4.0-upstream-timeouts, iteration 148); the old one
  // is out of window from 2026-09-21 and keeps its original passage.
  const { execFileSync } = await import('node:child_process');
  const { createHash } = await import('node:crypto');
  const registry = JSON.parse(await readFile(new URL('../data/raw/benchmarks/registry.json', import.meta.url)));
  const url = 'https://artificialanalysis.ai/methodology/intelligence-benchmarking';
  const texts = new Map();
  const mapped = new Set(registry.aa_field_map.filter((m) => aaMappingApplies(m, '2026-09-21T05:20:00Z')).map((m) => m.benchmark_id));
  let checked = 0;
  for (const e of registry.entries.filter((x) => mapped.has(x.id))) for (const s of e.evidence) {
    if (s.url !== url || s.source_sha256) continue;
    if (!texts.has(s.file)) texts.set(s.file, {
      sha256: createHash('sha256').update(await readFile(new URL(`../${s.file}`, import.meta.url))).digest('hex'),
      text: execFileSync('python3', ['ops/daily/public-candidate.py', 'text', s.file], { maxBuffer: 64_000_000 }).toString().replace(/\s+/g, ' '),
    });
    assert.equal(texts.get(s.file).sha256, s.sha256, `${e.id}: ${s.file} hash`);
    assert.ok(texts.get(s.file).text.includes(s.excerpt.replace(/\s+/g, ' ').trim()), `${e.id}: excerpt not verbatim in ${s.file}`);
    checked++;
  }
  assert.ok(checked >= 24, `only ${checked} excerpts checked`);
});
