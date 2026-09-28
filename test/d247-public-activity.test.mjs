// D247 (2026-09-28): a public board arm's protocol packet may carry this run's own added/changed-value
// summary, the same affirmative evidence for `status: "active"` that CR-38.1 built for the AA arm.
// Two UGI arms failed closed in the 00:41 run for want of it, and both critics named it:
// "Attach this run's generated summary of added/changed values for the board's source field from the
// captured maintainer payload". A protocol review still judges methodology and not values, so the
// packet carries counts and never a number off the board.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicValueActivity, activitySource } from '../ops/daily/refresh-benchmarks.mjs';

const obs = (id, value, extra = {}) => ({ id, value, benchmark_id: 'ugi-natint::snapshot-2026-09-10', ...extra });

test('added, changed and removed values are counted on the reconciled row id', () => {
  const prior = new Map([
    ['r1', obs('r1', 27.1)],
    ['r2', obs('r2', 31.4)],
    ['r3', obs('r3', 12.0)],
  ]);
  const activity = publicValueActivity('NatInt 💡', [
    obs('r1', 27.1),                    // unchanged
    obs('r2', 31.9),                    // changed value
    obs('r3', null),                    // value withdrawn in place
    obs('r4', 44.2),                    // a row the board did not carry before
  ], prior, [], 'DontPlanToEnd');
  assert.deepEqual(activity, { field: 'NatInt 💡', models: 3, added: 1, changed: 1, removed: 1, affirmative: 2,
    payload: "DontPlanToEnd's published results payload for this board",
    removed_phrase: 'value(s) the board no longer publishes' });
  // The invariant the prose depends on: every counted row lands in exactly one bucket.
  assert.equal(activity.models, activity.added + activity.changed + activity.removed);
});

test('a row whose value is unchanged is not activity however much of its context moved', () => {
  const prior = new Map([['r1', obs('r1', 27.1, { protocol: 'Test Date=9/6/2025' })]]);
  const activity = publicValueActivity('NatInt 💡', [obs('r1', 27.1, { protocol: 'Test Date=9/26/2026' })], prior, [], 'DontPlanToEnd');
  assert.deepEqual([activity.models, activity.affirmative], [0, 0]);
});

test('a row the board stopped publishing is a removal, and never affirmative', () => {
  const prior = new Map([['r1', obs('r1', 27.1)], ['r2', obs('r2', 31.4)]]);
  const activity = publicValueActivity('NatInt 💡', [obs('r1', 27.1)], prior, [obs('r2', 31.4)], 'DontPlanToEnd');
  assert.deepEqual([activity.models, activity.added, activity.changed, activity.removed, activity.affirmative], [1, 0, 0, 1, 0]);
  const source = activitySource({ url: 'u', file: 'x.gz', sha256: 'a'.repeat(64), retrieved_at: '2026-09-28T00:45:00Z' }, activity);
  assert.match(source.content, /does not by itself establish/);
  assert.doesNotMatch(source.content, /still running and reporting/);
});

test('a withdrawn row already counted in place is not counted twice', () => {
  const prior = new Map([['r1', obs('r1', 27.1)]]);
  const activity = publicValueActivity('NatInt 💡', [obs('r1', null)], prior, [obs('r1', 27.1)], 'DontPlanToEnd');
  assert.equal(activity.removed, 1);
  assert.equal(activity.models, 1);
});

test('the summary names the maintainer, its own field and the capture it compared — and no value', () => {
  const prior = new Map([['r1', obs('r1', 27.1)]]);
  const activity = publicValueActivity('NatInt 💡', [obs('r1', 27.9), obs('r2', 40.0)], prior, [], 'DontPlanToEnd');
  const receipt = { url: 'https://huggingface.co/spaces/DontPlanToEnd/UGI-Leaderboard/raw/main/ugi-leaderboard-data.csv',
    file: 'x.gz', sha256: 'b'.repeat(64), retrieved_at: '2026-09-28T00:45:00Z' };
  const source = activitySource(receipt, activity);
  assert.equal(source.url, receipt.url);
  assert.equal(source.sha256, receipt.sha256);
  assert.match(source.locator, /generated summary/i);
  assert.match(source.content, /Generated activity summary for the maintainer's source field "NatInt 💡"/);
  assert.match(source.content, /today's captured DontPlanToEnd's published results payload for this board \(sha256 b{64}, retrieved 2026-09-28T00:45:00Z\)/);
  assert.match(source.content, /1 value\(s\) on model rows that had none before, 1 changed value\(s\), 0 value\(s\) the board no longer publishes/);
  assert.match(source.content, /still running and reporting this board/);
  // A protocol review judges methodology, not values: no score from the board may appear.
  for (const value of ['27.1', '27.9', '40']) assert.ok(!source.content.includes(value), `${value} must not reach the packet`);
});

test('an unknown maintainer still describes the payload truthfully', () => {
  const activity = publicValueActivity('x', [obs('r1', 1)], new Map(), [], null);
  assert.equal(activity.payload, "the maintainer's published results payload for this board");
});

test('the withheld arms are exactly the multi-capture and non-active ones', async () => {
  const plan = JSON.parse(await readFile('data/raw/benchmarks/collection-plan.json', 'utf8'));
  const registry = new Map(JSON.parse(await readFile('data/raw/benchmarks/registry.json', 'utf8'))
    .entries.map((e) => [e.id, e]));
  const parsed = plan.entries.filter((e) => e.parser);
  // The production condition, restated: the summary is for settling `status: "active"` and the
  // criterion says it can never establish `"retained"`, so a non-active row gets none.
  const withheld = parsed.filter((e) => e.parser.runs || !e.parser.value_field
    || registry.get(e.benchmark_id)?.status !== 'active').map((e) => e.benchmark_id).sort();
  assert.deepEqual(withheld, [
    'bu-bench-v1::snapshot-2026-09-09', 'hyper-tau-bench::release-v1',
    'matharena-aime::2026', 'matharena-apex-shortlist::2025', 'matharena-apex::2025',
    'matharena-hmmt::2025-11', 'matharena-hmmt::2026-02', 'matharena-usamo::2026',
    'toolathlon::pre-verified',
  ]);
  assert.ok(parsed.length - withheld.length > 100, 'every other collected arm carries one');
});

test('every collected public arm has the value_field the summary names', async () => {
  const plan = JSON.parse(await readFile('data/raw/benchmarks/collection-plan.json', 'utf8'));
  const parsed = plan.entries.filter((e) => e.parser);
  assert.ok(parsed.length > 100);
  const missing = parsed.filter((e) => !e.parser.value_field).map((e) => e.benchmark_id);
  assert.deepEqual(missing, [], 'an arm without value_field would get no summary at all');
  // The arms deliberately withheld: their rows come from several captures, and the summary names
  // the one capture its counts were computed from.
  assert.deepEqual(parsed.filter((e) => e.parser.runs).map((e) => e.benchmark_id).sort(),
    ['bu-bench-v1::snapshot-2026-09-09', 'hyper-tau-bench::release-v1']);
});
