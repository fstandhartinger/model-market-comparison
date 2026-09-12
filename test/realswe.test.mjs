import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REALS_WE_ACCESS_URL, REALS_WE_RUNS_PER_TASK, REALS_WE_CI_LEVEL,
  parseRealSwe, parseChunkTruth, buildRealSweSnapshot, sha256Hex,
} from '../lib/realswe.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

async function lockedBytes() {
  const lock = JSON.parse(await readFile(join(ROOT, 'data', 'raw', 'benchmarks', 'ingestion-lock.json'), 'utf8')).realswe;
  return {
    lock,
    html: gunzipSync(await readFile(join(ROOT, lock.source_file))).toString('utf8'),
    chunk: gunzipSync(await readFile(join(ROOT, lock.chunk_file))).toString('utf8'),
  };
}

test('Real-SWE evidence is hash-bound to the lock and never fetched at parse time', async () => {
  const { lock, html, chunk } = await lockedBytes();
  assert.equal(sha256Hex(html), lock.source_sha256, 'page bytes match the locked uncompressed hash');
  assert.equal(sha256Hex(chunk), lock.chunk_sha256, 'chunk bytes match the locked uncompressed hash');
  const rawPage = createHash('sha256').update(await readFile(join(ROOT, lock.source_file))).digest('hex');
  assert.equal(rawPage, lock.source_file_sha256, 'the stored gzip file itself matches its locked hash');
  const rawChunk = createHash('sha256').update(await readFile(join(ROOT, lock.chunk_file))).digest('hex');
  assert.equal(rawChunk, lock.chunk_file_sha256);
});

test('Real-SWE parses the full public sample: 8 configurations x 10 tasks x 8 runs', async () => {
  const { html, chunk } = await lockedBytes();
  const parsed = parseRealSwe(html, { chunk });
  assert.deepEqual(parsed.probe, {
    configurations: 8,
    tasks: 10,
    runs_per_task: REALS_WE_RUNS_PER_TASK,
    rollouts: 640,
    expected_rollouts: 640,
    passes: 172,
    outcomes: { PASS: 172, MISSED_REQUIREMENT: 190, UNVERIFIED_ASSUMPTION: 118, INTEGRATION_ERROR: 136, REGRESSION: 18, WRONG_FILE: 6 },
  });
  assert.equal(parsed.configs.length, 8);
  assert.ok(parsed.configs.every((c) => c.valid === 80));
});

test('Real-SWE exact scores are the pass rate, not the rounded display value', async () => {
  const { html, chunk } = await lockedBytes();
  const parsed = parseRealSwe(html, { chunk });
  const bySlug = new Map(parsed.configs.map((c) => [c.slug, c]));
  const expected = { fable: 31, astra: 27, gemini: 25, glm: 23, grok: 19, meta: 19, kimi: 15, gpt: 13 };
  for (const [slug, passes] of Object.entries(expected)) {
    const config = bySlug.get(slug);
    assert.ok(config, `${slug} is present`);
    assert.equal(config.passes, passes);
    assert.equal(config.exact_score, (passes / 80) * 100);
  }
  const fable = bySlug.get('fable');
  assert.equal(fable.exact_score, 38.75);
  assert.equal(fable.ci.level, REALS_WE_CI_LEVEL);
  assert.equal(fable.ci.lower, 32.13694473030809);
  assert.equal(fable.ci.upper, 45.36305526969191);
});

test('Real-SWE chunk independently repeats passes/valid and the page cross-check holds', async () => {
  const { html, chunk } = await lockedBytes();
  const truth = parseChunkTruth(chunk);
  assert.equal(truth.size, 8);
  assert.equal(truth.get('fable').passes, 31);
  assert.equal(truth.get('gpt').passes, 13);
  const parsed = parseRealSwe(html, { chunk });
  for (const config of parsed.configs) {
    const t = truth.get(config.slug);
    assert.equal(t.passes, config.passes, `${config.slug} passes agree`);
    assert.equal(t.valid, config.valid, `${config.slug} valid agree`);
  }
});

test('Real-SWE snapshot is additive: eight score rows and eight cost rows, model_id stays null', async () => {
  const { lock, html, chunk } = await lockedBytes();
  const parsed = parseRealSwe(html, { chunk });
  const snap = buildRealSweSnapshot(parsed, {
    date: lock.snapshot_date, retrievedAt: lock.retrieved_at,
    sourceFile: lock.source_file, sourceSha256: lock.source_sha256,
    chunkUrl: lock.chunk_url, chunkFile: lock.chunk_file, chunkSha256: lock.chunk_sha256,
    chunkLocator: 'test',
  });
  assert.equal(snap.scoreId, 'realswe::snapshot-2026-09-12');
  assert.equal(snap.costId, 'realswe-cost::snapshot-2026-09-12');
  assert.equal(snap.observations.length, 16);

  const scores = snap.observations.filter((o) => o.benchmark_id === snap.scoreId);
  const costs = snap.observations.filter((o) => o.benchmark_id === snap.costId);
  assert.equal(scores.length, 8);
  assert.equal(costs.length, 8);
  for (const o of [...scores, ...costs]) {
    assert.equal(o.subject.model_id, null, 'no catalog model id is asserted that the source does not publish');
    assert.ok(o.subject.harness, 'the harness is part of the configuration identity');
    assert.equal(o.basis, 'measured');
    assert.equal(o.comparison_key, null);
    assert.equal(o.source.url, REALS_WE_ACCESS_URL);
    assert.ok(o.supporting_sources?.[0]?.url.includes('/_next/static/chunks/'));
  }
  assert.ok(scores.every((o) => o.confidence_interval && o.confidence_interval.level === REALS_WE_CI_LEVEL));
  const costBySlug = new Map(costs.map((o) => [o.id.split(':').pop(), o.value]));
  assert.deepEqual(Object.fromEntries(costBySlug), { fable: 6.96, astra: 4.67, gemini: 2.5, glm: 5.12, grok: 3.44, meta: 2.74, kimi: 3.9, gpt: 2.65 });
});

test('Real-SWE cost provenance flags the lower-bound configurations', async () => {
  const { lock, html, chunk } = await lockedBytes();
  const parsed = parseRealSwe(html, { chunk });
  const snap = buildRealSweSnapshot(parsed, {
    date: lock.snapshot_date, retrievedAt: lock.retrieved_at,
    sourceFile: lock.source_file, sourceSha256: lock.source_sha256,
    chunkUrl: lock.chunk_url, chunkFile: lock.chunk_file, chunkSha256: lock.chunk_sha256, chunkLocator: 'test',
  });
  const provenance = snap.details[snap.costId].cost_provenance;
  assert.equal(provenance.grok.lower_bound, true);
  assert.equal(provenance.kimi.lower_bound, true);
  assert.equal(provenance.astra.lower_bound, false);
  assert.equal(provenance.fable.displayed_cost_usd, 6.96);
  assert.ok(snap.details[snap.scoreId].tasks.length === 10);
  assert.equal(Object.keys(snap.details[snap.scoreId].failures).length, 8);
});

test('Real-SWE refuses drifted bytes instead of publishing a wrong number', async () => {
  const { html, chunk } = await lockedBytes();
  const dropped = html.replaceAll(' data-pareto-point="fable"', '');
  assert.throws(() => parseRealSwe(dropped, { chunk }), /leaderboard rows but 7 Pareto/);

  const tamperedChunk = chunk.replace('valid:80', 'valid:79');
  assert.throws(() => parseRealSwe(html, { chunk: tamperedChunk }), /chunk says/);

  assert.throws(() => parseChunkTruth('not the dataset'), /does not look like the Real-SWE dataset/);
});

test('Real-SWE parsing is deterministic', async () => {
  const { html, chunk } = await lockedBytes();
  const a = JSON.stringify(parseRealSwe(html, { chunk }));
  const b = JSON.stringify(parseRealSwe(html, { chunk }));
  assert.equal(a, b);
});

test('Real-SWE is additive: Composite slots and the AA v1.4/v1.5 Coding entries are untouched', async () => {
  const ds = JSON.parse(await readFile(join(ROOT, 'data', 'dataset.json'), 'utf8'));
  const obs = ds.benchmark_results.observations;
  const realswe = obs.filter((o) => o.benchmark_id.startsWith('realswe'));
  assert.equal(realswe.length, 16, 'eight score rows and eight cost rows');
  assert.ok(realswe.every((o) => o.subject.model_id === null), 'no catalog model id is asserted for a model+harness board');
  assert.ok(realswe.every((o) => o.comparison_key === null));

  // Composite is computed only from model.benchmarks fields; Real-SWE lives in
  // benchmark_results and must never leak into a model row.
  for (const model of ds.models) {
    for (const key of Object.keys(model.benchmarks || {})) {
      assert.ok(!key.toLowerCase().includes('realswe'), `${model.id} has a Real-SWE Composite input: ${key}`);
    }
  }

  // The existing Coding entries survive alongside the new rows and keep their
  // source values, so a Real-SWE refresh can never silently rebase them.
  for (const version of ['aa-coding-agent-index::1.4', 'aa-coding-agent-index::1.5']) {
    const rows = obs.filter((o) => o.benchmark_id === version);
    assert.ok(rows.length > 0, `${version} is retained`);
    const files = new Map();
    for (const o of rows) if (o.source?.file) files.set(o.source.file, null);
    for (const file of files.keys()) {
      try { files.set(file, JSON.parse(await readFile(join(ROOT, file), 'utf8'))); } catch { /* evidence may have rotated */ }
    }
    const sourceScores = new Map();
    for (const data of files.values()) for (const r of data?.rows ?? []) {
      if (r.score == null) continue;
      if (!sourceScores.has(r.model_name)) sourceScores.set(r.model_name, new Set());
      sourceScores.get(r.model_name).add(r.score);
    }
    for (const o of rows) {
      const scores = sourceScores.get(o.subject.name);
      if (!scores) continue;
      assert.ok(scores.has(o.value), `${version} value drifted for ${o.subject.name}: ${o.value}`);
    }
  }
});
