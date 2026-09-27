// D220 (2026-09-27, iteration 243): a bare re-run of ops/benchmark-table-2026-09-15/build-identity-map.mjs used to
// delete the reviewed joins of rows a maintainer had retracted. Those entries are not leftovers: D180/D187 keep a
// retracted row's join rule so the value stays *withheld* instead of resurfacing as a "no longer published"
// history estimate, and test/coding-sources.test.mjs accepts exactly two records as the reason an entry has no
// observation. Silently dropping them would have republished six KernelBench values and one MathArena value the
// sources no longer stand behind — and it would have happened on whichever future run someone regenerated the map.
//
// Two properties are pinned here: the builder carries those entries over, and it refuses to write a map that
// loses a reviewed join for any *other* reason (the house rule for a vanished public row is to fail closed).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

const withdrawnRows = () => new Set([
  ...json('data/raw/benchmarks/public-withdrawals.json').withdrawals.map((w) => `${w.benchmark_id}\0${w.source_id}`),
  ...(json('data/raw/benchmarks/public-observations.json').withdrawn_observations ?? [])
    .filter((w) => w.withdrawn_reason).map((w) => `${w.benchmark_id}\0${w.subject.source_id}`),
]);

test('every observation-less map entry is a row a recorded withdrawal explains', () => {
  const map = json('data/raw/benchmarks/identity-map.json').entries;
  const live = new Set(json('data/raw/benchmarks/public-observations.json').observations
    .map((o) => `${o.benchmark_id}\0${o.subject.source_id}`));
  const withdrawn = withdrawnRows();
  const orphans = map.filter((e) => e.basis !== 'self_reported'
    && !live.has(`${e.benchmark_id}\0${e.source_id}`) && !withdrawn.has(`${e.benchmark_id}\0${e.source_id}`));
  assert.deepEqual(orphans, [], 'a join with neither an observation nor a withdrawal record is a lost row');
});

test('the retracted KernelBench and MathArena rows still hold their reviewed join', () => {
  const map = json('data/raw/benchmarks/identity-map.json').entries;
  const has = (benchmark_id, source_id, model_id) =>
    map.some((e) => e.benchmark_id === benchmark_id && e.source_id === source_id && e.model_id === model_id);
  // The five D187/withdrawal rows a bare regeneration dropped on 2026-09-26. Their entry is what keeps the
  // retracted value withheld; without it the history bridge republishes it as a dated estimate.
  assert.ok(has('matharena-brokenarxiv::2026-06', 'Claude-Fable-5.1 (max)', 'claude-fable-5.1::max'));
  assert.ok(has('kernelbench-cuda-glm52-fused-moe::rtx-pro-6000', 'or-opus/anthropic/claude-opus-5 [max]', 'claude-opus-5::max'));
  assert.ok(has('kernelbench-cuda-deepseek-nsa::rtx-pro-6000', 'or-fable/anthropic/claude-fable-5-1 [max]', 'claude-fable-5.1::max'));
  assert.ok(has('kernelbench-cuda-deepseek-nsa::rtx-pro-6000', 'or-opus/anthropic/claude-opus-5 [max]', 'claude-opus-5::max'));
  assert.ok(has('kernelbench-cuda-deepseek-nsa::rtx-pro-6000', 'grok/grok-4.6 [xhigh]', 'grok-4.6::xhigh'));
});

test('the builder carries withdrawn joins over and fails closed on any other loss', () => {
  const src = readFileSync('ops/benchmark-table-2026-09-15/build-identity-map.mjs', 'utf8');
  assert.match(src, /withdrawnRows/, 'the builder reads the withdrawal records');
  assert.match(src, /droppedWithoutWithdrawal/, 'the builder collects reviewed joins that would disappear');
  assert.match(src, /process\.exit\(2\)/, 'and refuses to write the map when it finds one');
  assert.match(src, /ALLOW_DROPS/, 'with a deliberate override for a rule change that really does drop a join');
  // The refusal must come before the write, or it refuses a file it has already overwritten.
  assert.ok(src.indexOf('droppedWithoutWithdrawal.length') < src.indexOf("writeFileSync('data/raw/benchmarks/identity-map.json'"),
    'the guard runs before identity-map.json is written');
});
