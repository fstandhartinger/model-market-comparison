import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMultimodalPreviewV02MeasuredUnrankableRows } from '../lib/jevbench-multimodal-preview.mjs';

const COUNTS = { core: [157, 261], 'computer-use': [19, 67], 'browser-use': [15, 54] };

function aggregateTrack(name, [publicCount, sealedCount]) {
  const summary = (n) => ({
    n, correct: Math.floor(n * 0.7), accuracy: Math.floor(n * 0.7) / n, chance: 0.25,
    chance_corrected_intelligence: 55, ece: null, probability_coverage: 0, valid_answer_count: n,
  });
  const core = name === 'core';
  const axes = { intelligence: 60, calibration: 0, speed: core ? 70 : null, cost: null };
  return {
    public: summary(publicCount), sealed: summary(sealedCount), intelligence_before_penalty: 60,
    raw_overall_gap_pp: null, matched_gap_pp: null, matched_gap_detail: null,
    penalty_points: 0, penalty_multiplier: 1, axes,
    speed: core ? { score: 70, raw_p50_s: 0.5, raw_p95_s: 1, adjusted_p50_s: 1.15, adjusted_p95_s: 2.15, latency_coverage: 1 } : null,
    cost: null, composite: null, failures: 0, gap_unavailable: true,
  };
}

function freshUnrankableRow() {
  return {
    key: 'wity_1', name: 'Wity-1', kind: 'api', api_flag: true,
    tracks: Object.fromEntries(Object.entries(COUNTS).map(([name, counts]) => [name, aggregateTrack(name, counts)])),
    score: null, rank: null, reason: 'GPU seconds cost receipt is unavailable',
    inference_setting: 'pinned standard configuration', prior_exposure: 'Public smoke only',
    measurement_source: 'Synthetic aggregate fixture for validator coverage',
  };
}

function referenceFor(row) {
  return {
    key: row.key, name: row.name, kind: row.kind, reference_revision: 'v0.1.4', reference_score: 42.5,
    reason: `Fresh v0.2 run complete, but unrankable: ${row.reason}; v0.1.4 reference only.`,
  };
}

function validate(rows, overrides = {}) {
  const row = rows[0] ?? freshUnrankableRow();
  return validateMultimodalPreviewV02MeasuredUnrankableRows(rows, {
    ranking: [], referenceRows: [referenceFor(row)], status: 'preview',
    releaseProvenance: { 'Configuration receipts': [{ key: row.key, status: 'measured-unrankable' }] },
    ...overrides,
  });
}

test('v0.2 measured axes without a composite validate without gaining score or rank', () => {
  const row = freshUnrankableRow();
  assert.deepEqual([...validate([row])], ['wity_1']);
});

test('v0.2 unrankable validation rejects ranked overlap, duplicate keys, fake scores, and lost CORE axes', () => {
  const row = freshUnrankableRow();
  assert.throws(() => validate([row], { ranking: [{ key: row.key }] }), /appears more than once as measured/);
  assert.throws(() => validate([row, structuredClone(row)]), /appears more than once as measured/);
  assert.throws(() => validate([{ ...row, score: 1 }]), /invalid identity or score values/);
  const missingSpeed = structuredClone(row);
  missingSpeed.tracks.core.speed = null;
  missingSpeed.tracks.core.axes.speed = null;
  assert.throws(() => validate([missingSpeed]), /without a cost-backed composite/);
});

test('v0.2 unrankable rows bind to the exact prior reference reason and preview receipt status', () => {
  const row = freshUnrankableRow();
  assert.throws(() => validate([row], { referenceRows: [{ ...referenceFor(row), reason: 'Unavailable' }] }), /matching v0.1.4 reference reason/);
  assert.throws(() => validate([row], { releaseProvenance: { 'Configuration receipts': [{ key: row.key, status: 'measured' }] } }), /lacks a measured-unrankable configuration receipt/);
  assert.throws(() => validate([{ ...row, key: 'not-in-v0.1.4' }]), /invalid identity or score values/);
});

test('historical addition can retain fresh unrankable axes without inventing a v0.1.4 reference', () => {
  const row = { ...freshUnrankableRow(), key: 'imajev_4b_20260926', name: 'Imajev-4B (26 Sep snapshot)' };
  assert.deepEqual([...validate([row], { referenceRows: [] })], [row.key]);
  assert.throws(() => validate([row]), /has no v0.1.4 reference configuration/);
  assert.throws(() => validate([{ ...row, key: 'unknown-historical-model' }], { referenceRows: [] }), /invalid identity or score values/);
});
