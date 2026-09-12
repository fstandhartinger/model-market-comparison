import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BRIDGE_POLICY, buildState, modelKey, computeBridgeComparison, computeRankShift,
  estimateFromRankShift, crossVersionEstimates, datedEstimates,
} from '../lib/benchmark-history.mjs';
import { appendState, writeStateOnce, readHistory } from '../scripts/build-benchmark-history.mjs';
import { buildBenchmarkView, selectBenchmarkView } from '../lib/benchmark-view.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Synthetic fixture values throughout: not production benchmark claims.
const observation = (id, value, benchmark_id = 'bench::1', over = {}) => ({
  id, value, benchmark_id, basis: 'measured',
  subject: { model_id: `model:${id}`, source_id: `src:${id}`, name: `Model ${id}`, harness: null, variant: null },
  source: { url: 'https://example.org/results', retrieved_at: '2026-09-01', published_at: null, file: 'fixture.json', locator: `row ${id}` },
  unit: 'fraction', protocol: 'synthetic same-protocol fixture', comparison_key: 'synthetic', comparison_note: 'synthetic',
  ...over,
});
const registryEntry = (id, over = {}) => ({
  id, family: id.split('::')[0], version: id.split('::')[1] ?? '1', status: 'active',
  scoring: { unit: 'fraction', higher_better: true }, ...over,
});
const state = (id, collected_at, observations) => buildState(observations, { state_id: id, source: `synthetic-${id}`, collected_at });
const registry = (entries) => ({ entries });
const title = (row) => `Model ${row}`;

test('bridge ratio is exact: a uniform factor-2 board doubles the retained historical value', () => {
  const bridges = ['b1', 'b2', 'b3', 'b4', 'b5'];
  const old = [...bridges.map((id) => observation(id, 1)), observation('h', 3)];
  const live = bridges.map((id) => observation(id, 2));

  const direct = computeBridgeComparison(bridges.map((id) => ({ model_key: id, old_value: 1, new_value: 2 })));
  assert.equal(direct.comparable, true);
  assert.equal(direct.bridge_count, 5);
  assert.equal(direct.aggregate, 2);
  assert.equal(direct.spread.iqr_relative, 0);
  assert.equal(direct.cause, null, 'a comparable bridge has no refusal cause');
  assert.equal(direct.cause_value, null);

  const estimates = datedEstimates(live, registry([registryEntry('bench::1')]), [state('S1', '2026-09-01T00:00:00.000Z', old)]);
  assert.equal(estimates.length, 1);
  const h = estimates[0];
  assert.equal(h.method, 'bridge-median-ratio');
  assert.equal(h.status, 'estimated');
  assert.equal(h.comparison.bridge_count, 5);
  assert.equal(h.source_value, 3);
  assert.equal(h.value, 6, 'estimate must equal old value times the exact bridge aggregate');
  assert.equal(h.value, h.source_value * direct.aggregate);
  assert.deepEqual([h.uncertainty.lower, h.uncertainty.upper], [6, 6]);
  assert.match(h.note, /estimate/i);
});

test('naive old/new juxtaposition is impossible: no bridges means no number', () => {
  const empty = computeBridgeComparison([]);
  assert.equal(empty.comparable, false);
  assert.equal(empty.aggregate, null);
  assert.equal(empty.bridge_count, 0);
  assert.equal(empty.cause, 'insufficient_bridges');
  assert.equal(empty.cause_value, 0);
  assert.match(empty.reason, /at least 3 required/);

  // The historical model existed before but only two bridge configurations remain:
  // it must be reported as not comparable with a null value, never as a raw number.
  const old = [...['b1', 'b2', 'b3', 'b4', 'b5'].map((id) => observation(id, 1)), observation('h', 3)];
  const live = ['b1', 'b2'].map((id) => observation(id, 2));
  const h = datedEstimates(live, registry([registryEntry('bench::1')]), [state('S1', '2026-09-01T00:00:00.000Z', old)])
    .find((e) => e.subject_name === title('h'));
  assert.ok(h, 'the retained model is still reported');
  assert.equal(h.status, 'not_comparable');
  assert.equal(h.value, null);
  assert.equal(h.uncertainty, null);
  assert.equal(h.comparison.cause, 'insufficient_bridges');
  assert.equal(h.comparison.cause_value, 2, 'the cause carries the concrete bridge count');
  assert.match(h.comparison.reason, /only 2 bridge/);
  assert.match(h.note, /not comparable/i);
});

test('a wide bridge spread is refused instead of published as a number', () => {
  const c = computeBridgeComparison([
    { model_key: 'a', old_value: 1, new_value: 0.05 },
    { model_key: 'b', old_value: 1, new_value: 1.0 },
    { model_key: 'c', old_value: 1, new_value: 2.5 },
    { model_key: 'd', old_value: 1, new_value: 9.0 },
  ]);
  assert.equal(c.bridge_count, 4);
  assert.equal(c.comparable, false);
  assert.match(c.reason, /IQR is/);
  assert.ok(c.spread.iqr_relative > BRIDGE_POLICY.maxIqrRelative);
  assert.equal(c.cause, 'spread_too_wide');
  assert.equal(c.cause_value, c.spread.iqr_relative, 'the cause carries the concrete relative IQR');
  assert.ok(c.cause_value > BRIDGE_POLICY.maxIqrRelative);
});

test('every refusal exposes a machine-readable cause with its concrete value', () => {
  const tooFew = computeBridgeComparison([{ model_key: 'a', old_value: 1, new_value: 2 }]);
  assert.equal(tooFew.cause, 'insufficient_bridges');
  assert.equal(tooFew.cause_value, 1);

  const tooWide = computeBridgeComparison([
    { model_key: 'a', old_value: 1, new_value: 0.1 },
    { model_key: 'b', old_value: 1, new_value: 1.0 },
    { model_key: 'c', old_value: 1, new_value: 8.0 },
  ]);
  assert.equal(tooWide.cause, 'spread_too_wide');
  assert.equal(tooWide.cause_value, tooWide.spread.iqr_relative);

  const rankTooFew = computeRankShift([{ value: 1 }, { value: 2 }], [{ value: 1 }, { value: 2 }, { value: 3 }], []);
  assert.equal(rankTooFew.cause, 'insufficient_bridges');
  assert.equal(rankTooFew.cause_value, 0);
  const rankWide = computeRankShift(
    [100, 90, 80, 70, 60].map((value) => ({ value })),
    [1000, 900, 800, 700, 600].map((value) => ({ value })),
    [{ old_value: 100, new_value: 600 }, { old_value: 90, new_value: 700 }, { old_value: 80, new_value: 800 }],
  );
  assert.equal(rankWide.cause, 'spread_too_wide');
  assert.equal(rankWide.cause_value, rankWide.spread.iqr);

  // Only refusals carry a cause; a published estimate must not look like a refusal.
  const bridges = ['b1', 'b2', 'b3'];
  const live = bridges.map((id) => observation(id, 2));
  const old = [...bridges.map((id) => observation(id, 1)), observation('h', 3)];
  const h = datedEstimates(live, registry([registryEntry('bench::1')]), [state('S1', '2026-09-01T00:00:00.000Z', old)])
    .find((e) => e.subject_name === title('h'));
  assert.equal(h.status, 'estimated');
  assert.equal(h.comparison.cause, null);
  assert.equal(h.comparison.cause_value, null);
});

test('zero old values are floored out of ratio bridges (no division blow-up)', () => {
  const c = computeBridgeComparison([
    { model_key: 'zero', old_value: 0, new_value: 5 },
    { model_key: 'a', old_value: 1, new_value: 2 },
    { model_key: 'b', old_value: 2, new_value: 4 },
    { model_key: 'c', old_value: 3, new_value: 6 },
  ]);
  assert.equal(c.bridge_count, 3);
  assert.equal(c.aggregate, 2);
  assert.ok(c.bridges.every((b) => b.old_value !== 0));
});

test('Elo / battle boards shift ranks instead of scaling values', () => {
  const old = [1000, 900, 800, 700, 600, 500].map((value) => ({ value }));
  const next = [1100, 1000, 900, 800, 700, 650].map((value) => ({ value }));
  const pairs = [1000, 900, 800, 700, 600].map((v) => ({ old_value: v, new_value: v + 100 }));
  const c = computeRankShift(old, next, pairs);
  assert.equal(c.comparable, true);
  assert.equal(c.bridge_count, 5);
  assert.equal(c.shift, 0);
  assert.equal(estimateFromRankShift(1000, old, next, { shift: c.shift }), 1100);
  assert.equal(estimateFromRankShift(500, old, next, { shift: c.shift }), 650);

  const eloEntry = (version) => ({ id: `elo::${version}`, family: 'elo', version, status: 'active', scoring: { unit: 'Elo', higher_better: true, metric: 'Elo' } });
  const observations = [
    ...['p0', 'p1', 'p2', 'p3', 'p4'].map((id, i) => observation(id, old[i].value, 'elo::1')),
    observation('h', 500, 'elo::1'),
    ...['p0', 'p1', 'p2', 'p3', 'p4'].map((id, i) => observation(id, next[i].value, 'elo::2')),
    observation('q', 650, 'elo::2'),
  ];
  const h = crossVersionEstimates(observations, registry([eloEntry('1'), eloEntry('2')]))
    .find((e) => e.subject_name === title('h'));
  assert.ok(h);
  assert.equal(h.method, 'bridge-rank-shift');
  assert.equal(h.status, 'estimated');
  assert.equal(h.comparison.bridge_count, 5);
  assert.equal(h.comparison.aggregate, 0);
  assert.equal(h.value, 650);
});

test('rank shift drops bridge pairs whose values are absent from the published boards', () => {
  const old = [1000, 900, 800, 700, 600, 500].map((value) => ({ value }));
  const next = [1100, 1000, 900, 800, 700, 650].map((value) => ({ value }));
  const pairs = [
    ...[1000, 900, 800, 700, 600].map((v) => ({ old_value: v, new_value: v + 100 })),
    { old_value: 12345, new_value: 99999 },
    { old_value: 800, new_value: 54321 },
  ];
  const c = computeRankShift(old, next, pairs);
  assert.equal(c.comparable, true);
  assert.equal(c.bridge_count, 5);
  assert.equal(c.shift, 0);
});

test('derived/composite indices are recompute-required, never bridged', () => {
  const derivedEntry = (version) => ({ id: `comp::${version}`, family: 'comp', version, status: 'active', scoring: { unit: 'fraction', higher_better: true, derived: true } });
  const observations = [observation('a', 0.5, 'comp::1'), observation('b', 0.4, 'comp::1'), observation('a', 0.6, 'comp::2'), observation('c', 0.7, 'comp::2')];
  const b = crossVersionEstimates(observations, registry([derivedEntry('1'), derivedEntry('2')])).find((e) => e.subject_name === title('b'));
  assert.ok(b);
  assert.equal(b.method, 'recompute-required');
  assert.equal(b.status, 'recompute_required');
  assert.equal(b.value, null);
  assert.match(b.note, /recompute/i);
});

test('cross-version estimate cites the source row provenance, not another target row', () => {
  const bridges = ['b1', 'b2', 'b3', 'b4', 'b5'];
  const old = [...bridges.map((id) => observation(id, 1, 'bench::1')), observation('h', 3, 'bench::1')];
  const live = bridges.map((id) => observation(id, 2, 'bench::2'));
  const estimates = crossVersionEstimates([...old, ...live], registry([registryEntry('bench::1', { version: '1' }), registryEntry('bench::2', { version: '2' })]));
  const h = estimates.find((e) => e.subject_name === title('h'));
  assert.ok(h);
  assert.equal(h.status, 'estimated');
  assert.equal(h.source_value, 3);
  assert.equal(h.source.locator, 'row h');
  assert.equal(h.source.file, 'fixture.json');
  assert.notEqual(h.source.locator, 'row b1');
});

test('a vanished value is never deleted: a new ingestion keeps the retained state', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-history-'));
  try {
    const bridges = ['b1', 'b2', 'b3', 'b4', 'b5'];
    const oldPath = join(dir, 'old.json'), newPath = join(dir, 'new.json');
    await writeFile(oldPath, JSON.stringify({ observations: [...bridges.map((id) => observation(id, 1)), observation('h', 3)] }));
    await writeFile(newPath, JSON.stringify({ observations: bridges.map((id) => observation(id, 2)) }));

    const first = await appendState({ root: dir, from: oldPath, source: 'ingest-old', collected_at: '2026-09-01T00:00:00.000Z' });
    const second = await appendState({ root: dir, from: newPath, source: 'ingest-new', collected_at: '2026-09-02T00:00:00.000Z' });
    assert.equal(first.written, true);
    assert.equal(second.written, true);

    const history = await readHistory(join(dir, 'data', 'raw', 'benchmarks', 'history'));
    assert.equal(history.states.length, 2, 'both states are retained');
    const retained = history.states.find((s) => s.state_id === first.state_id).rows.find((r) => r.subject_name === title('h'));
    assert.ok(retained, 'the vanished value is still present in the earlier state');
    assert.equal(retained.value, 3);

    const live = JSON.parse(await readFile(newPath, 'utf8')).observations;
    const h = datedEstimates(live, registry([registryEntry('bench::1')]), history.states).find((e) => e.subject_name === title('h'));
    assert.ok(h);
    assert.equal(h.source_state_id, first.state_id);
    assert.equal(h.value, 6);

    const again = await appendState({ root: dir, from: oldPath, source: 'ingest-old-again', collected_at: '2026-09-03T00:00:00.000Z' });
    assert.equal(again.written, false);
    assert.equal(again.dedup, true);

    const historyDir = join(dir, 'data', 'raw', 'benchmarks', 'history');
    const stored = history.states.find((s) => s.state_id === first.state_id);
    await assert.rejects(() => writeStateOnce(historyDir, { ...stored, content_sha256: 'deadbeef' }), /different content/);
    assert.equal((await readHistory(historyDir)).states.length, 2, 'a rejected write leaves the store untouched');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('real states: a superseded model gets a labelled estimate; an incomparable one gets none', async () => {
  const dataset = JSON.parse(await readFile(join(ROOT, 'data', 'dataset.json'), 'utf8'));
  const historical = dataset.benchmark_results.historical;
  assert.equal(historical.schema_version, 1);
  assert.ok(historical.states.length >= 1, 'at least the current state is retained');
  assert.ok(historical.estimates.length > 0);

  const estimated = historical.estimates.filter((e) => e.status === 'estimated');
  assert.ok(estimated.length > 0, 'a real superseded model receives an estimate');
  const withBridges = estimated.find((e) => e.comparison.bridge_count >= BRIDGE_POLICY.minBridges && e.uncertainty && e.value != null);
  assert.ok(withBridges, 'a real estimate carries bridge count and bounded uncertainty');
  assert.equal(withBridges.method, 'bridge-median-ratio');
  assert.ok(withBridges.value > 0);
  assert.ok(withBridges.uncertainty.lower <= withBridges.value);
  assert.ok(withBridges.uncertainty.upper >= withBridges.value);
  assert.match(withBridges.note, /estimate/i);

  const notComparable = historical.estimates.find((e) => e.status === 'not_comparable');
  assert.ok(notComparable, 'the policy refuses at least one real bridge');
  assert.equal(notComparable.value, null);
  assert.ok(notComparable.comparison.reason);
  assert.match(notComparable.note, /not comparable/i);
  for (const e of historical.estimates) {
    if (e.status !== 'not_comparable') continue;
    assert.ok(['insufficient_bridges', 'spread_too_wide'].includes(e.comparison.cause), `${e.id} needs a machine-readable cause`);
    assert.equal(typeof e.comparison.cause_value, 'number');
    assert.ok(Number.isFinite(e.comparison.cause_value), `${e.id} needs a concrete cause value`);
  }

  for (const e of historical.estimates) {
    assert.ok(['estimated', 'not_comparable', 'recompute_required'].includes(e.status));
    if (e.status !== 'estimated') assert.equal(e.value, null, `${e.id} must not publish a number`);
  }
});

test('real view: a historical model appears only as an estimate, never among measured scores', async () => {
  const dataset = JSON.parse(await readFile(join(ROOT, 'data', 'dataset.json'), 'utf8'));
  const view = buildBenchmarkView(dataset);
  const estimated = dataset.benchmark_results.historical.estimates.filter((e) => e.status === 'estimated' && e.model_id).slice(0, 20);
  assert.ok(estimated.length > 0);

  for (const e of estimated) {
    const axis = view.axes.find((a) => a.benchmarkId === e.benchmark_id && (e.cohort == null || a.cohort === e.cohort || a.cohort.startsWith(`${e.cohort} · `)));
    assert.ok(axis, `an axis exists for ${e.benchmark_id}`);
    assert.ok((axis.estimates ?? []).some((x) => x.id === e.id), 'the estimate is attached to the axis');
    assert.ok(!axis.scores.some((s) => s.modelId === e.model_id), `${e.model_id} must not be listed as a measured score on ${e.benchmark_id}`);
    const selected = selectBenchmarkView(view, [], axis.id);
    assert.equal(selected.axes.length, 1);
    assert.ok(selected.axes[0].estimates.some((x) => x.id === e.id));
  }
});

test('model key keeps catalog identity, harness and effort apart', () => {
  const base = { subject: { model_id: 'm::default', harness: null, variant: null } };
  assert.equal(modelKey(observation('x', 1)), 'model:x||');
  assert.notEqual(modelKey(base), modelKey({ subject: { model_id: 'm::default', harness: 'Cursor CLI', variant: null } }));
  assert.notEqual(modelKey(base), modelKey({ subject: { model_id: 'm::default', harness: null, variant: 'high' } }));
});
