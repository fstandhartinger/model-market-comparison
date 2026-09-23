// D187 (2026-09-23): kernelbench.com re-adjudicated six runs. The run ids and their "clean" annotations are
// unchanged, but the board's own result flipped from `correct: true` with a `peak_fraction` to `correct: false`
// with `peak_fraction: null` on 2026-09-22 — and the registry protocol for these boards scores only correct
// audited cells. So the source publishes no value for those cells any more, while we were still serving six of
// them as measured percent-of-roofline numbers (one of them 106.27).
//
// Two halves, and the second is the one that is easy to get wrong:
//  1. the six rows are withdrawn with their evidence, and republished as withheld rejections, so a retained
//     state cannot bridge a retracted value back as a "no longer published" estimate;
//  2. the KernelBench locator is row-numbered *per board* — "source row 9; or-opus/anthropic/claude-opus-5
//     [max]; field peak_fraction" is row 9 of each of the four problems — so a withheld locator may only hold
//     on its own board. Matching it everywhere suppressed 19 legitimate estimates on the other three boards.
//     OpenRouter's `own_data row …` locator does name one source row and must still reach the cost twin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { buildState, datedEstimates } from '../lib/benchmark-history.mjs';

const readJson = async (name) => JSON.parse(await readFile(new URL(`../${name}`, import.meta.url), 'utf8'));
const BOARD_URL = 'https://raw.githubusercontent.com/Infatoshi/kernelbench.com/master/benchmarks/cuda/results/leaderboard.json';
const PROBLEM = {
  'kernelbench-cuda-glm52-fused-moe::rtx-pro-6000': '01_glm52_fused_moe',
  'kernelbench-cuda-deepseek-nsa::rtx-pro-6000': '02_deepseek_nsa',
  'kernelbench-cuda-megaqwen-decode::rtx-pro-6000': '03_megaqwen_decode',
  'kernelbench-cuda-grid-mingru-sps::rtx-pro-6000': '04_grid_mingru_sps',
};

/** The board as captured. The digest is re-derived from the bytes and checked against the run manifest — no
 *  hash is typed into this file; the withdrawal reasons are then required to cite the digests we computed. */
const board = async (dir) => {
  const manifest = JSON.parse(await readFile(new URL(`../data/raw/benchmarks/daily-evidence/${dir}/manifest.json`, import.meta.url), 'utf8'));
  const entry = manifest.find((e) => e.url === BOARD_URL);
  const bytes = gunzipSync(await readFile(new URL(`../${entry.file}`, import.meta.url)));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256, entry.sha256, `capture digest: ${entry.file}`);
  const parsed = JSON.parse(bytes.toString('utf8'));
  const read = (label, problem) => (parsed.models.find((m) => m.label === label)?.results ?? {})[problem] ?? null;
  read.sha256 = sha256;
  return read;
};

test('the six withdrawn KernelBench rows are the ones the board retracted', async () => {
  const observations = await readJson('data/raw/benchmarks/public-observations.json');
  const withdrawn = (observations.withdrawn_observations ?? [])
    .filter((o) => PROBLEM[o.benchmark_id] && /D187/.test(o.withdrawn_reason ?? ''));
  assert.equal(withdrawn.length, 6, 'the six D187 rows; a later retraction writes its own record');
  const before = await board('2026-09-21T07-46-30-273Z');
  const flipped = await board('2026-09-22T07-47-17-816Z');
  const after = await board('2026-09-23T10-16-55-034Z');

  for (const row of withdrawn) {
    const problem = PROBLEM[row.benchmark_id];
    const label = row.subject.source_id;
    const was = before(label, problem), now = after(label, problem);
    assert.ok(row.withdrawn_reason.includes('D187'), `${label} states its reason`);
    // The reason's prose must cite the captures this test just hashed, not some other run.
    for (const digest of [before.sha256, flipped.sha256, after.sha256]) assert.ok(row.withdrawn_reason.includes(digest), `${label} cites ${digest.slice(0, 12)}`);
    assert.equal(flipped(label, problem).correct, false, 'the flip is in the 2026-09-22 capture');
    // Scored then, unscored now, same run: a retraction, not a new run and not a relabel.
    assert.equal(was.correct, true);
    assert.equal(Math.round(was.peak_fraction * 10000) / 100, Math.round(row.value * 100) / 100);
    assert.equal(now.correct, false);
    assert.equal(now.peak_fraction, null);
    assert.equal(was.run_id, now.run_id);
  }

  // Nothing else was swept up: every row we publish has a value in the capture *it* cites. Reading each row's
  // own evidence rather than this pinned capture keeps the check true after the next refresh, which rebuilds
  // these boards from a newer one and may add rows that today's capture does not contain.
  const published = observations.observations.filter((o) => PROBLEM[o.benchmark_id]);
  assert.ok(published.length > 30, `${published.length} rows across the four boards`);
  const byFile = new Map();
  for (const row of published) {
    if (!byFile.has(row.source.file)) {
      const bytes = gunzipSync(await readFile(new URL(`../${row.source.file}`, import.meta.url)));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), row.source.sha256, `row evidence digest: ${row.source.file}`);
      byFile.set(row.source.file, JSON.parse(bytes.toString('utf8')));
    }
    const parsed = byFile.get(row.source.file);
    const result = (parsed.models.find((m) => m.label === row.subject.source_id)?.results ?? {})[PROBLEM[row.benchmark_id]];
    assert.ok(result && result.peak_fraction !== null, `${row.benchmark_id} ${row.subject.source_id} has a value in its own capture`);
    assert.equal(result.correct, true, `${row.subject.source_id} is a correct cell`);
    assert.equal(Math.round(result.peak_fraction * 10000) / 100, Math.round(row.value * 100) / 100);
  }
});

test('a retracted value is neither published nor bridged back as an estimate', async () => {
  const observations = await readJson('data/raw/benchmarks/public-observations.json');
  const withdrawn = (observations.withdrawn_observations ?? []).filter((o) => PROBLEM[o.benchmark_id]);
  const scores = await readJson('data/raw/benchmarks/scores.json');
  const dataset = await readJson('data/dataset.json');

  for (const row of withdrawn) {
    const key = (o) => o.benchmark_id === row.benchmark_id && o.subject?.source_id === row.subject.source_id;
    assert.ok(!scores.observations.some(key), `${row.subject.source_id} is not published`);
    assert.ok(!dataset.benchmark_results.observations.some(key), `${row.subject.source_id} is not in the dataset`);
    const rejection = scores.rejected.find((r) => r.withheld && r.benchmark_id === row.benchmark_id && r.locator === row.source.locator);
    assert.ok(rejection, `${row.benchmark_id} ${row.subject.source_id} is republished as a withheld rejection`);
    assert.equal(rejection.model_id, null, 'only the locator may suppress it');
    const estimates = dataset.benchmark_results.historical.estimates
      .filter((e) => e.benchmark_id === row.benchmark_id && e.subject_name === row.subject.source_id);
    assert.deepEqual(estimates, [], 'a retracted value must not return as an estimate');
  }
});

test('a withheld board-scoped locator holds on its board only; a source-row locator reaches the cost twin', () => {
  const board1 = 'kernelbench-cuda-glm52-fused-moe::rtx-pro-6000';
  const board2 = 'kernelbench-cuda-deepseek-nsa::rtx-pro-6000';
  const locator = 'kernelbench_cuda_board; source row 9; or-opus/anthropic/claude-opus-5 [max]; field peak_fraction';
  const entry = (id) => ({ id, family: id.split('::')[0], scoring: { unit: 'percent', higher_better: true } });
  const registry = { entries: [entry(board1), entry(board2)] };
  const retained = (benchmark_id, source_id, value, source_locator) => ({
    id: `${benchmark_id}|${source_id}`, benchmark_id, basis: 'measured', value,
    subject: { source_id, name: source_id, model_id: null, variant: null, harness: null },
    source: { url: 'https://x', retrieved_at: '2026-09-21', locator: source_locator },
  });
  const anchors = (offset) => ['a', 'b', 'c', 'd'].map((n, i) => retained(board1, n, 10 + i + offset, `anchor ${n}`));
  const old = [...anchors(0), retained(board1, 'or-opus/anthropic/claude-opus-5 [max]', 10.72, locator)];
  const states = [buildState(old, { state_id: 'S1', source: 'fixture', collected_at: '2026-09-21T00:00:00.000Z' })];
  const live = anchors(0.1);

  assert.equal(datedEstimates(live, registry, states).length, 1, 'without a withholding the retained row becomes an estimate');
  assert.equal(datedEstimates(live, registry, states, [{ benchmark_id: board1, locator }]).length, 0, 'withheld on its own board');
  assert.equal(datedEstimates(live, registry, states, [{ benchmark_id: board2, locator }]).length, 1,
    'the same row number on another board is another row and must not be suppressed');

  const rowLocator = 'own_data row model_permaslug=amazon/nova-micro-v1, benchmark_type=gpqa_diamond';
  const costOld = [...anchors(0), retained(board1, 'Amazon: Nova Micro 1.0', 0.21, rowLocator)];
  const costStates = [buildState(costOld, { state_id: 'S1', source: 'fixture', collected_at: '2026-09-21T00:00:00.000Z' })];
  assert.equal(datedEstimates(live, registry, costStates, [{ benchmark_id: board2, locator: rowLocator }]).length, 0,
    'a locator that names one source row withholds that row wherever it was published');
});
