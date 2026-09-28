// D251.3 (2026-09-28): an AA board's `unit` and `range` describe the scale the maintainer serves on,
// and a methodology page states the scoring rule without ever stating that scale. AutomationBench-AA
// was retained from 2026-09-25 on exactly that gap — AA writes "the percentage of objectives the
// model completed" and serves it as a decimal on 0-1 — so the protocol packet now carries this run's
// own read of the served values, and criterion c1 admits it for that one judgement.
import test from 'node:test';
import assert from 'node:assert/strict';
import { aaFieldScale, scaleSource, PROTOCOL_REVIEW_CRITERIA } from '../ops/daily/refresh-benchmarks.mjs';

const row = (id, fields) => ({ source_id: id, fields });

test('aaFieldScale reads the full dotted path over every served row', () => {
  const rows = [
    row('m1', { automationBenchPartialScore: 0.0019 }),
    row('m2', { automationBenchPartialScore: 0.6954 }),
    row('m3', { automationBenchPartialScore: 0.25 }),
  ];
  assert.deepEqual(aaFieldScale('automationBenchPartialScore', rows),
    { field: 'automationBenchPartialScore', count: 3, min: 0.0019, max: 0.6954,
      payload: 'Artificial Analysis model-page payload' });
});

test('a structured field is read at its leaf, never at its root object', () => {
  const rows = [
    row('m1', { briefcaseBreakdown: { overall: { elo: 1412.5 } } }),
    row('m2', { briefcaseBreakdown: { overall: { elo: 988.25 } } }),
  ];
  assert.deepEqual(aaFieldScale('briefcaseBreakdown.overall.elo', rows),
    { field: 'briefcaseBreakdown.overall.elo', count: 2, min: 988.25, max: 1412.5,
      payload: 'Artificial Analysis model-page payload' });
  // The root object itself carries no number, so asking for it yields nothing rather than a guess.
  assert.equal(aaFieldScale('briefcaseBreakdown', rows), null);
});

test('nulls, missing keys and non-numbers are not values; no value at all yields no summary', () => {
  const rows = [
    row('m1', { critpt: null }),
    row('m2', {}),
    row('m3', { critpt: 'n/a' }),
    row('m4', { critpt: 0.32 }),
  ];
  assert.deepEqual(aaFieldScale('critpt', rows), { field: 'critpt', count: 1, min: 0.32, max: 0.32,
    payload: 'Artificial Analysis model-page payload' });
  assert.equal(aaFieldScale('critpt', rows.slice(0, 3)), null);
});

test('the summary rides the capture receipt, names itself generated and states its own limit', () => {
  const receipt = { url: 'https://artificialanalysis.ai/models/gpt-5-6-sol', file: 'x.gz',
    sha256: '8'.repeat(64), retrieved_at: '2026-09-28T05:17:24.556Z' };
  const source = scaleSource(receipt, aaFieldScale('automationBenchPartialScore',
    [row('m1', { automationBenchPartialScore: 0.0019 }), row('m2', { automationBenchPartialScore: 0.6954 })]));
  // gauntlet source contract (ops/daily/gauntlet.mjs): url, sha256, content all present.
  assert.equal(source.url, receipt.url);
  assert.equal(source.sha256, receipt.sha256);
  assert.ok(source.content.includes(receipt.sha256), 'the capture is named by its full hash');
  assert.match(source.locator, /generated summary of this run's own read of the capture, not maintainer text/);
  assert.match(source.content, /2 value\(s\), the lowest 0\.0019 and the highest 0\.6954/);
  assert.match(source.content, /cannot establish what the metric means/);
});

test('a summary without its payload description is an error, not an AA claim', () => {
  assert.throws(() => scaleSource({ sha256: 'a'.repeat(64) }, { field: 'x', count: 1, min: 0, max: 1 }),
    /payload that describes the capture/);
});

test('criterion c1 admits the served scale for the unit and range question only', () => {
  assert.equal(PROTOCOL_REVIEW_CRITERIA.length, 2, 'still two criteria — the sentence joins the identity one');
  const [identity] = PROTOCOL_REVIEW_CRITERIA;
  assert.match(identity, /whether the row's `unit` and `range` describe the scale the board is actually served on/);
  assert.match(identity, /a row whose `unit` and `range` agree with the served values is correct on this point even when the protocol text says nothing about it/);
  assert.match(identity, /settles nothing about what the metric means, how it is computed, or which task set, harness, judges or version produced it/);
});
