import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { symlink, mkdir } from 'node:fs/promises';
import { validateBenchmarkScores, computeDivergences, buildBenchmarkResults, benchmarkCell } from '../lib/benchmark-scores.mjs';
import { verifyScoreEvidence, sha256, observationDigest } from '../lib/benchmark-score-evidence.mjs';
import { computeCompositeScores } from '../lib/composite.mjs';

// Synthetic fixture values: not production benchmark claims.
const entry = (version) => ({ id: `bench::${version}`, version, family: 'bench', scoring: { unit: 'fraction', range: [0, 1] } });
const registry = { entries: [entry('1'), entry('2')] };
const source = { url: 'https://example.org/results', retrieved_at: '2026-09-10', published_at: null, sha256: sha256('primary'), file: 'source.txt', locator: 'model row / accuracy' };
const row = (id, value, basis = 'measured', benchmark_id = 'bench::1') => ({ id, value, basis, benchmark_id, unit: 'fraction',
  subject: { source_id: 'model-source-id', name: 'model', model_id: 'model::high', variant: 'high', harness: null },
  source: { ...source, url: basis === 'measured' ? source.url : 'https://vendor.example.org/release' }, protocol: 'same test set and settings',
  comparison_key: 'confirmed-protocol', comparison_note: 'Synthetic matching-protocol fixture' });
const snapshot = (observations = []) => ({ schema_version: 1, observations, missing: [], rejected: [],
  collections: registry.entries.map((e) => ({ benchmark_id: e.id, status: 'collected', reason: 'Captured source', source_url: source.url })) });
const models = [{ id: 'model::high' }, { id: 'other::default' }];

test('schema rejects sourceless, nonfinite, mismatched-scale and unversioned scores', () => {
  for (const patch of [{ source: null }, { value: null }, { value: NaN }, { value: Infinity }, { value: 2 }, { unit: 'percent' }, { benchmark_id: 'bench' }, { basis: 'assumed' }]) {
    assert.throws(() => validateBenchmarkScores(snapshot([{ ...row('one', 0), ...patch }]), registry));
  }
  assert.doesNotThrow(() => validateBenchmarkScores(snapshot([row('zero', 0)]), registry));
  assert.throws(() => validateBenchmarkScores(snapshot([row('same', .1), row('same', .2)]), registry), /duplicate/);
  assert.throws(() => validateBenchmarkScores(snapshot([row('one', .1)]), registry, new Set()), /unknown model/);
  assert.throws(() => validateBenchmarkScores(snapshot([{ ...row('one', .1), source_basis: 'self_reported' }]), registry), /derived basis/);
  assert.throws(() => validateBenchmarkScores(snapshot([{ ...row('one', .1), source: { ...source, retrieved_at: '2026-02-30' } }]), registry), /provenance/);
});

test('divergence isolates versions, effort, harness, audited compatibility and sources', () => {
  const claim = row('claim', .8, 'self_reported'), measured = row('measured', .6);
  const delta = computeDivergences([claim, measured])[0];
  assert.ok(Math.abs(delta.delta - .2) < 1e-15);
  assert.ok(Math.abs(delta.relative_percent - 100 / 3) < 1e-12);
  assert.deepEqual(delta.source_urls, [claim.source.url, measured.source.url]);
  for (const patch of [{ benchmark_id: 'bench::2' }, { comparison_key: null }, { comparison_key: 'other' },
    { subject: { ...claim.subject, variant: 'low' } }, { subject: { ...claim.subject, model_id: null } },
    { subject: { ...claim.subject, harness: 'another' } }, { source: measured.source }]) {
    assert.deepEqual(computeDivergences([{ ...claim, ...patch }, measured]), []);
  }
  assert.equal(computeDivergences([claim, row('zero', 0)])[0].relative_percent, null);
  assert.equal(computeDivergences([row('low', .1, 'self_reported'), measured])[0].delta, -.5);
  const derived = { ...claim, basis: 'derived', source_basis: 'self_reported', derivation: { formula: '80 / 100', inputs: [80] } };
  assert.equal(computeDivergences([derived, measured]).length, 1);
  assert.doesNotThrow(() => validateBenchmarkScores(snapshot([derived]), registry));
});

test('sparse cells do not infer not-tested from absence; coverage counts cells once', () => {
  const input = snapshot([row('one', .3), row('two', .4), row('claim', .5, 'self_reported'), { ...row('unmatched', .2), subject: { ...row('x', 0).subject, model_id: null }, comparison_key: null }]);
  const results = buildBenchmarkResults(input, registry, models);
  assert.equal(results.coverage.by_model['model::high'].available, 1);
  assert.equal(results.coverage.by_model['model::high'].measured, 1);
  assert.equal(results.coverage.by_model['model::high'].self_reported, 1);
  assert.equal(results.coverage.by_benchmark['bench::1'].unmatched_observations, 1);
  assert.equal(benchmarkCell(results, 'other::default', 'bench::1').status, 'unknown');
  assert.throws(() => benchmarkCell(results, 'model::high', 'bench'), /version/);
  for (const status of ['not_tested', 'not_published', 'source_unreachable', 'contested']) {
    const fixture = snapshot();
    fixture.missing.push({ model_id: 'model::high', benchmark_id: 'bench::1', status, reason: 'Explicit primary-source statement', source });
    const r = buildBenchmarkResults(fixture, registry, models);
    assert.equal(benchmarkCell(r, 'model::high', 'bench::1').status, status);
    assert.equal(r.coverage.by_model['model::high'][status], 1);
  }
  const failed = snapshot(); failed.collections[0].status = 'source_unreachable';
  assert.equal(benchmarkCell(buildBenchmarkResults(failed, registry, models), 'other::default', 'bench::1').status, 'source_unreachable');
});

test('source and critic receipts must match; any edited self-report loses approval', async () => {
  const root = await mkdtemp(join(tmpdir(), 'benchmark-evidence-'));
  try {
    await writeFile(join(root, 'source.txt'), 'primary');
    const claim = row('claim', .8, 'self_reported');
    const artifact = JSON.stringify([claim]);
    const review = JSON.stringify({ verdict: 'pass', artifact_sha256: sha256(artifact), coverage_checked: [1], errors_found: 0, findings: [], fixed: [], missing_evidence: [] });
    await writeFile(join(root, 'artifact.json'), artifact);
    await writeFile(join(root, 'review.json'), review);
    await assert.rejects(verifyScoreEvidence(snapshot([claim]), registry, { root }), /Unreviewed/);
    const approval = { id: claim.id, observation_sha256: observationDigest(claim), critic_model: 'critic/model', producer_models: ['producer/model'],
      review_file: 'review.json', review_sha256: sha256(review), artifact_file: 'artifact.json', review_row: 1, verdict: 'accepted', evidence_locator: 'claim row' };
    const approvals = { rows: [approval] };
    const receipt = { actual_model: 'critic/model', producers: ['producer/model'], output_sha256: sha256(review) };
    await writeFile(join(root, 'review.json.meta.json'), JSON.stringify(receipt));
    assert.equal((await verifyScoreEvidence(snapshot([claim]), registry, { root, approvals })).self_reported_verified, 1);
    const aliased = { ...approval, critic_model: 'z-ai/critic', producer_models: ['chutes/zai-org/producer'] };
    await assert.rejects(verifyScoreEvidence(snapshot([claim]), registry, { root, approvals: { rows: [aliased] } }), /Unreviewed vendor score/);
    await writeFile(join(root, 'review.json.meta.json'), JSON.stringify({ ...receipt, actual_model: 'wrong/critic' }));
    await assert.rejects(verifyScoreEvidence(snapshot([claim]), registry, { root, approvals }), /receipt mismatch/);
    await writeFile(join(root, 'review.json.meta.json'), JSON.stringify(receipt));
    await assert.rejects(verifyScoreEvidence(snapshot([{ ...claim, value: .9 }]), registry, { root, approvals }), /Unreviewed/);
    const unrelated = { ...claim, value: .9 };
    await assert.rejects(verifyScoreEvidence(snapshot([unrelated]), registry, { root, approvals: { rows: [{ ...approval, observation_sha256: observationDigest(unrelated) }] } }), /differs from critic artifact/);
    await writeFile(join(root, 'source.txt'), 'changed');
    await assert.rejects(verifyScoreEvidence(snapshot([claim]), registry, { root, approvals }), /digest/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('Composite slot list and v1.4 source identity are explicit; registry scores cannot enter it', async () => {
  const code = await readFile(new URL('../lib/composite.mjs', import.meta.url), 'utf8');
  const keys = JSON.parse(code.match(/const SLOT_KEYS = (\[[\s\S]*?\]);/)[1].replace(/,\s*\]/, ']'));
  assert.deepEqual(keys, ['aa_coding_index', 'aa_coding_agent', 'aa_intelligence_index', 'epoch_eci', 'epoch_eci_software', 'designarena_frontend', 'designarena_fullstack']);
  const legacy = await readFile(new URL('../data/raw/aa-coding-agents.json', import.meta.url));
  assert.equal(sha256(legacy), 'e3b39c00dfff19717d8da6a875ff44e999b5255300da26f174c5bdcea843368b');
  assert.equal(JSON.parse(legacy).version, '1.4');
  assert.equal(JSON.parse(legacy).collected_at, '2026-09-09');
  const rows = [{ id: 'a', scores: { aa_coding_index: 10 } }, { id: 'b', scores: { aa_coding_index: 20 } }];
  const expected = computeCompositeScores(rows);
  const injected = rows.map((m) => ({ ...m, scores: { ...m.scores, aa_coding_agent_v1_5: 100, 'terminal-bench::4.0': 99 }, benchmark_results: { observations: [row('new', 1)] } }));
  assert.deepEqual(computeCompositeScores(injected), expected);
});

test('the actual npm build hook refuses a score without a source before Next runs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'benchmark-build-guard-'));
  try {
    await mkdir(join(root, 'data/raw/benchmarks'), { recursive: true });
    await symlink(new URL('../scripts', import.meta.url).pathname, join(root, 'scripts'));
    await writeFile(join(root, 'package.json'), await readFile(new URL('../package.json', import.meta.url)));
    const invalid = snapshot([{ ...row('missing-source', .5), source: null }]);
    for (const [name, value] of [['registry', registry], ['scores', invalid], ['score-approvals', { rows: [] }]]) {
      await writeFile(join(root, `data/raw/benchmarks/${name}.json`), JSON.stringify(value));
    }
    const run = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8', timeout: 15000 });
    assert.notEqual(run.status, 0);
    assert.match(run.stdout + run.stderr, /missing-source: missing or invalid source provenance/);
    assert.doesNotMatch(run.stdout, /> next build/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
