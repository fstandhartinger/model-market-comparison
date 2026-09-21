// CR-38.1 (iteration-150 follow-up): the AA protocol arm's packet may carry this run's own
// added/changed-value summary so `status: "active"` is decidable when the maintainer's
// methodology text never says the board is still reported.
import test from 'node:test';
import assert from 'node:assert/strict';
import { aaFieldActivity, aaActivitySource, PROTOCOL_REVIEW_CRITERIA } from '../ops/daily/refresh-benchmarks.mjs';

const row = (id, fields) => ({ source_id: id, fields });

test('aaFieldActivity counts added, changed and removed values per field, not model rows', () => {
  const old = new Map([
    ['m1', row('m1', { critpt: 0.4 })],
    ['m2', row('m2', { critpt: 0.5 })],
    ['m3', row('m3', { critpt: null })],
  ]);
  const changed = [
    row('m1', { critpt: 0.41 }),          // changed value
    row('m2', { critpt: null }),           // newly null → removed, not affirmative
    row('m4', { critpt: 0.6 }),            // new model with a value → added
    row('m3', { critpt: null }),           // listed but identical → not counted
  ];
  assert.deepEqual(aaFieldActivity('critpt', changed, old),
    { field: 'critpt', models: 3, added: 1, changed: 1, removed: 1, affirmative: 2 });
});

test('deep-equal structured values are not activity; a missing old row means added', () => {
  const old = new Map([['m1', row('m1', { briefcaseBreakdown: { overall: { elo: 10 } } })]]);
  const changed = [
    row('m1', { briefcaseBreakdown: { overall: { elo: 10 } } }),   // deep equal → skip
    row('m2', { briefcaseBreakdown: { overall: { elo: 11 } } }),   // absent before → added
    row('m1', { briefcaseBreakdown: undefined }),                  // field key gone with a value before → removed
  ];
  const activity = aaFieldActivity('briefcaseBreakdown', changed, old);
  assert.equal(activity.added, 1);
  assert.equal(activity.removed, 1);
  assert.equal(activity.changed, 0);
  assert.equal(activity.affirmative, 1);
  assert.equal(activity.models, 2);
});

test('the summary rides the real receipt hash and describes itself as generated', () => {
  const receipt = { url: 'https://artificialanalysis.ai/models/gpt-5-6-sol', file: 'x.gz', sha256: 'a'.repeat(64), retrieved_at: '2026-09-21T10:31:33.582Z' };
  const source = aaActivitySource(receipt, { field: 'critpt', models: 4, added: 2, changed: 1, removed: 1, affirmative: 3 });
  // gauntlet source contract (ops/daily/gauntlet.mjs): url, sha256, content all present.
  assert.equal(source.url, receipt.url);
  assert.equal(source.sha256, receipt.sha256);
  assert.ok(source.content.length > 100);
  assert.ok(source.content.includes(receipt.sha256), 'the capture is named by its full hash');
  assert.match(source.locator, /generated summary/i);
  assert.match(source.content, /2 value\(s\) on model rows that had none before, 1 changed value\(s\), 1 value\(s\) newly null/);
  assert.match(source.content, /still running and reporting this board/);
});

test('a removals-only day never claims the board is still reported', () => {
  const source = aaActivitySource({ url: 'u', file: 'x.gz', sha256: 'b'.repeat(64) },
    { field: 'critpt', models: 2, added: 0, changed: 0, removed: 2, affirmative: 0 });
  assert.match(source.content, /does not by itself establish/);
  assert.doesNotMatch(source.content, /still running and reporting/);
});

test('the lifecycle criterion admits the count for active only, and never for retained', () => {
  assert.equal(PROTOCOL_REVIEW_CRITERIA.length, 2, 'still two criteria — the sentence joins the lifecycle one');
  const [, lifecycle] = PROTOCOL_REVIEW_CRITERIA;
  assert.match(lifecycle, /nonzero count of added or changed values is affirmative evidence for `status: "active"`/);
  assert.match(lifecycle, /settles nothing about the methodology, task set, harness, judges or version/);
  assert.match(lifecycle, /can never establish `"retained"`/);
  // The criterion is conditional on the summary being present: public boards never carry one.
  assert.match(lifecycle, /When the packet additionally carries/);
});
