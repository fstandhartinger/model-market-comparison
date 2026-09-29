// CR-173 (effort-fixes, 2026-09-26): two suspected wrong-effort joins, checked against the retained primary bytes.
//
// 1. Anthropic's Claude Opus 5.5 launch post prints Terminal-Bench 4.0 = 66.4 and its table caption says that cell is
//    Opus 5.5 at xhigh effort. The CR-123 row had joined it to claude-opus-5.5::max. It is withdrawn (D180 mechanism,
//    kept with its reason) and replaced by an xhigh row; the post's own chart dataset gives the other efforts (max 64.8).
// 2. The audit said Vals ran Terminal-Bench 2.1 (Vals Index v2) for Claude Fable 5.1 at max. Every retained capture of
//    vals_index states compute_effort "high" for that component row (the index's overall row is max), so the
//    claude-fable-5.1::high join follows the source and stays.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { carryReviewedDocuments } from '../lib/self-reported-vendor.mjs';
import { observationDigest } from '../lib/benchmark-score-evidence.mjs';

const readJson = async (name) => JSON.parse(await readFile(new URL(`../${name}`, import.meta.url), 'utf8'));
const OLD = 'self-reported:claude-opus-55-terminal-bench-4-0';
const TB4 = 'anthropic-terminal-bench-4-0::4.0';

test('the Opus 5.5 Terminal-Bench 4.0 cell is joined at xhigh, and the max-joined row is withdrawn with its reason', async () => {
  const cand = await readJson('data/raw/benchmarks/self-reported-candidates.json');
  assert.ok(!cand.observations.some((o) => o.id === OLD));
  const withdrawn = cand.withdrawn_observations.find((o) => o.id === OLD);
  assert.equal(withdrawn.subject.model_id, 'claude-opus-5.5::max');
  assert.match(withdrawn.withdrawn_reason, /xhigh/);
  const byModel = Object.fromEntries(cand.observations.filter((o) => o.benchmark_id === TB4).map((o) => [o.subject.model_id, o.value]));
  assert.deepEqual(byModel, { 'claude-opus-5.5::xhigh': 66.4, 'claude-opus-5.5::low': 38.5, 'claude-opus-5.5::medium': 57.6,
    'claude-opus-5.5::high': 64.2, 'claude-opus-5.5::max': 64.8 });
});

test('the caption and the chart dataset in the retained launch post say what the rows claim', async () => {
  const post = gunzipSync(await readFile(new URL('../data/raw/benchmarks/daily-evidence/2026-09-22-claude-opus-5-5/4418b9b4f881510f195f.gz', import.meta.url))).toString('utf8');
  assert.ok(post.includes('Terminal-Bench 4.0 results are reported for Claude Opus 5.5 at xhigh effort'));
  assert.ok(post.includes('opus55,7.35,66.4,xhigh,\\\\nopus55,11.24,64.8,max,'));
});

test('every replacement row is bound to an accepted approval by its canonical digest', async () => {
  const cand = await readJson('data/raw/benchmarks/self-reported-candidates.json');
  const { rows } = await readJson('data/raw/benchmarks/score-approvals.json');
  for (const o of cand.observations.filter((x) => x.benchmark_id === TB4)) {
    assert.ok(rows.some((r) => r.id === o.id && r.observation_sha256 === observationDigest(o) && r.verdict === 'accepted'), o.id);
  }
});

test('a collector rebuild carries the withdrawn row instead of dropping or republishing it', async () => {
  const cand = await readJson('data/raw/benchmarks/self-reported-candidates.json');
  const { documents } = await readJson('data/raw/benchmarks/self-reported/carried-documents.json');
  const carried = carryReviewedDocuments(cand, documents, new Set());
  assert.ok(carried.withdrawn_observations.some((o) => o.id === OLD));
  assert.ok(!carried.observations.some((o) => o.id === OLD));
  const republished = { ...cand, observations: [...cand.observations, cand.withdrawn_observations[0]] };
  assert.throws(() => carryReviewedDocuments(republished, documents, new Set()), /also published/);
});

test('Vals Index v2 Terminal-Bench 2.1: Fable 5.1 and Opus 5.5 ran at compute_effort high, and join there', async () => {
  const publicObs = await readJson('data/raw/benchmarks/public-observations.json');
  const map = await readJson('data/raw/benchmarks/identity-map.json');
  for (const [slug, model] of [['anthropic/claude-fable-5-1', 'claude-fable-5.1::high'], ['anthropic/claude-opus-5-5', 'claude-opus-5.5::high']]) {
    const row = publicObs.observations.find((o) => o.benchmark_id === 'vals-index-terminal-bench-2.1::2' && o.subject.source_id === slug);
    assert.match(row.protocol, /"task":"terminal_bench_2_1".*"compute_effort":"high"/);
    const join = (map.entries ?? map.joins).find((e) => e.benchmark_id === 'vals-index-terminal-bench-2.1::2' && e.source_id === slug);
    assert.equal(join.model_id, model);
  }
});
