import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readJevAllDataInput } from '../lib/jevbench-alldata-input.mjs';
import {
  hasPublishedJevbenchV1824Release, readJevbenchV1824Candidate,
  readJevbenchV1824ForBoard, V1824_NEW_KEYS, V1824_NOTE, V1824_COST_NOTE,
} from '../lib/jevbench-v1824-release.mjs';

const load = path => JSON.parse(readFileSync(path));
const data = (rev, kind) => load(`data/raw/benchmarks/jevbench/v1.8/jevbench-${rev}-${kind}.json`);
const NOTE = 'Measured on a 600-item supplementary set (300 sealed and 300 public items). This set has no equated reference yet, so Intelligence, Calibration and the composite score are not shown and the row is not ranked.';
const COST_NOTE = "Cost uses the provider's published list price. Free quotas, free previews and launch credits are not counted.";

test('v1.8.24 adds exactly two priced, unranked hosted API rows and preserves the predecessor field', () => {
  const current = data('v1.8.24', 'results');
  const previous = data('v1.8.23', 'results');
  const scored = load('r198/v1824/src/scored.json');
  const usage = load('r198/v1824/src/usage.json');
  assert.deepEqual(V1824_NEW_KEYS, ['alibaba-decision-model-sg', 'urun-sense']);
  assert.equal(V1824_NOTE, NOTE);
  assert.equal(V1824_COST_NOTE, COST_NOTE);
  assert.equal(current.systems.length, 371);
  assert.equal(current.roster_count, 371);
  assert.deepEqual(current.systems.filter(row => !V1824_NEW_KEYS.includes(row.key)), previous.systems, 'all 369 carried rows deep-equal');
  assert.deepEqual(current.not_measured, previous.not_measured);
  assert.deepEqual(current.board, previous.board, 'order lists and top fives unchanged');
  assert.equal(current.n_ranked, previous.n_ranked);
  for (const key of V1824_NEW_KEYS) {
    const row = current.systems.find(system => system.key === key);
    const source = scored[key]['v17-share'];
    // Numbers come from the pinned scorer artifact; only cost (cost proof) and the cost axis (frozen formula over it) differ.
    for (const field of ['speed', 'decision_limit', 'support']) assert.deepEqual(row[field], source[field], `${key} ${field}`);
    for (const axis of ['speed', 'intelligence', 'calibration']) assert.deepEqual(row.axes[axis], source.axes[axis], `${key} axis ${axis}`);
    assert.equal(row.axes.cost, usage[key].cost_axis.exact_axis);
    assert.equal(row.cost.usd_per_1000, usage[key].cost_all);
    assert.equal(row.axes.intelligence, null);
    assert.equal(row.axes.calibration, null);
    assert.equal(row.capability, null);
    assert.equal(row.jevbench_score, null);
    assert.equal(row.composite_ci95, null);
    assert.ok(Object.values(row.scores).every(v => v === null));
    assert.ok(Object.values(row.views).every(v => v === null));
    assert.deepEqual(row.ranks, { A: null, B: null, C: null, capability: null });
    assert.equal(row.rank, null);
    assert.equal(row.ranked, false);
    assert.equal(row.listing, 'unranked');
    assert.equal(row.not_ranked_because, NOTE);
    assert.equal(row.base_model, null);
    assert.equal(row.draw, undefined);
    assert.ok(Number.isFinite(row.axes.speed) && Number.isFinite(row.axes.cost));
    for (const board of Object.values(current.board)) assert.ok(!board.order.includes(key), 'not on any order list');
    assert.ok(!/est\b|estimate/i.test(row.cost.basis), 'no estimate label');
    assert.ok(row.cost.basis.startsWith(COST_NOTE));
    assert.notEqual(row.cost.kind, 'estimate');
  }
});

test('v1.8.24 cost matches the frozen pricing proof and carries the approved texts', () => {
  const rows = Object.fromEntries(data('v1.8.24', 'results').systems.filter(r => V1824_NEW_KEYS.includes(r.key)).map(r => [r.key, r]));
  const u = rows['urun-sense'], a = rows['alibaba-decision-model-sg'];
  assert.equal(u.cost.usd_per_1000, 0.012922875);
  assert.equal(a.cost.usd_per_1000, 0.03364263);
  for (const r of [u, a]) { assert.equal(r.cost.kind, 'tariff'); assert.equal(r.cost.common_basis, null); assert.equal(r.cost.usage_estimated_rows, 0); assert.equal(r.api_flag, true); assert.equal(r.endpoint_kind, 'api'); assert.equal(r.speed.n, 600); }
  assert.ok(u.cost.basis.includes('310,149 input tokens over 600 decisions') && u.cost.basis.includes('USD 0.025 per million input tokens'));
  assert.ok(a.cost.basis.includes('480,609 input tokens over 600 decisions') && a.cost.basis.includes('USD 0.042 per million input tokens'));
  assert.ok(a.cost.basis.includes('The API bills input tokens only and reports no output token count; cost uses input tokens.'));
  assert.ok(u.disclosure.includes("Measured through the provider's sense-latest model alias."));
  assert.ok(u.disclosure.includes('3 of 600 requests returned HTTP 502; they count as wrong answers and all 600 items remain in the denominator.'));
  assert.deepEqual(u.http_status, { '200': 597, '502': 3 });
  assert.deepEqual(a.http_status, { '200': 600 });
  assert.equal(u.v16.n_items, 600); assert.equal(a.v16.n_items, 600);
  assert.equal(u.decision_limit.speed_n, 600);
  // The cost-axis recomputation is the only published figure that differs from the artifact.
  const usage = load('r198/v1824/src/usage.json');
  assert.ok(Math.abs(usage['urun-sense'].cost_axis.axis_delta) < 1e-5 && usage['alibaba-decision-model-sg'].cost_axis.axis_delta === 0);
  assert.equal(u.axes.cost, usage['urun-sense'].cost_axis.exact_axis);
  assert.equal(a.axes.cost, usage['alibaba-decision-model-sg'].cost_axis.artifact_axis);
  // No internal wording on the public rows.
  const strings = v => v && typeof v === 'object' ? Object.values(v).flatMap(strings) : typeof v === 'string' ? [v] : [];
  for (const r of [u, a]) for (const text of strings(r)) assert.ok(!/A2 pool|G_med|custody|deputy|PREREG|ledger|#\d{4,}|handoff|worker|\/home\//i.test(text), 'internal wording in a public string: ' + text.slice(0, 80));
});

test('v1.8.24 public readers depend on the published review manifest and it is PENDING', async () => {
  const candidate = await readJevbenchV1824Candidate();
  assert.deepEqual(candidate.manifest.review, { engine: 'PENDING', verdict: 'PENDING', receipt_sha256: null });
  assert.equal(load('r198/v1824/inputs/APPROVAL.json').status, 'PENDING');
  const visible = candidate.manifest.review.verdict === 'PASS';
  assert.equal(await hasPublishedJevbenchV1824Release(), visible);
  assert.equal(await readJevbenchV1824ForBoard(), null);
  assert.equal(Boolean(await readJevAllDataInput('v1.8.24')), visible);
  assert.deepEqual(candidate.manifest.predecessor.revision, 'v1.8.23');
  // The 22 Nov draw table is untouched: these rows are on the supplementary set, not on that draw.
  const draw = load('data/jevbench-draw-equating.json').draws.find(row => row.draw === 'v1.6-regular-20261122');
  assert.equal(draw.latest_release, 'v1.8.23');
  assert.ok(!draw.releases.includes('v1.8.24'));
});
