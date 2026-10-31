// CR-634 (2026-10-31, Florian card #19017 / reply #19020): Benchmark Heaven adopts the AA Intelligence Index v5.0.
// Models AA has not rescored carry a labelled v4→v5 estimate from a monotone (isotonic) fit over the models measured on
// both versions. These tests pin every rule of that adoption:
//   * collector: the one adoption run is the only time the index fields skip the withdrawal check; v6 (or v4) still holds;
//   * fit: monotone, out-of-sample (leave-one-out) error reported and gated, fails closed to "no estimates";
//   * labelling: an estimate always carries status, method, v4 source value, bridge count, error and interval;
//   * honesty: no estimate is ever presented as a measurement (raw files, headline history, benchmark view axis scores).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AA_ADOPTION_MIN_SCORED, AA_INDEX_PINNED_MAJOR, aaIndexRunMode, assertAdoptionCoverage } from '../lib/aa-index-version.mjs';
import { ISOTONIC_BRIDGE_POLICY, computeIsotonicBridge, predictIsotonic } from '../lib/benchmark-history.mjs';
import { AA_V5_FIELD, aaBaseModel, aaIntelligenceRecords, frozenV4IndexValues } from '../lib/aa-index-surrogate.mjs';
import { buildBenchmarkView, compareFamilies } from '../lib/benchmark-view.mjs';
import { compareDescription, resolveCompareIds } from '../lib/compare-ids.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

test('collector: only the reviewed adoption run exempts the index fields; another major version still holds', () => {
  assert.equal(AA_INDEX_PINNED_MAJOR, '5');
  const legacy = { collected_at: '2026-10-27' }, v5 = { index_version: '5.0' };
  assert.deepEqual(aaIndexRunMode(['5', '5.0'], legacy), { changed: null, pinned: '5.0', adoption: true, exemptIndexFields: true, indexVersion: '5.0' });
  assert.deepEqual(aaIndexRunMode(['5.0'], v5), { changed: null, pinned: '5.0', adoption: false, exemptIndexFields: false, indexVersion: '5.0' });
  // A minor version rolls in with the full withdrawal check.
  assert.equal(aaIndexRunMode(['5.1'], v5).exemptIndexFields, false);
  assert.equal(aaIndexRunMode(['5.1'], v5).indexVersion, '5.1');
  // v6, or a page back on v4, is a version change (the daily keeps the published snapshot).
  assert.equal(aaIndexRunMode(['6.0'], v5).changed, '6.0');
  assert.equal(aaIndexRunMode(['4.3.2'], v5).changed, '4.3.2');
  // A page without a clean statement is never an adoption: a legacy snapshot keeps the full check and fails closed.
  for (const versions of [[], ['5.0', '4.3.2']]) {
    assert.equal(aaIndexRunMode(versions, legacy).adoption, false);
    assert.equal(aaIndexRunMode(versions, legacy).exemptIndexFields, false);
    assert.equal(aaIndexRunMode(versions, v5).indexVersion, '5.0');
  }
});

const pairs = (points) => points.map(([x, y], i) => ({ model_key: `m${i}`, subject_name: `M${i}`, group: `g${Math.floor(i / 2)}`, old_value: x, new_value: y }));
const line = (n, f) => Array.from({ length: n }, (_, i) => [10 + i, f(10 + i)]);

test('isotonic bridge: monotone, ties pooled, flat outside the observed range', () => {
  const fit = computeIsotonicBridge(pairs([...line(30, (x) => x - 5), [20, 30], [20, 10]]));
  assert.equal(fit.method, 'bridge-isotonic');
  for (let i = 1; i < fit.blocks.length; i++) assert.ok(fit.blocks[i].y >= fit.blocks[i - 1].y, 'non-decreasing blocks');
  assert.equal(new Set(fit.blocks.map((b) => b.x)).size, fit.blocks.length, 'equal old values are one block');
  let prev = -Infinity;
  for (let x = 0; x <= 60; x += 0.5) { const y = predictIsotonic(fit.blocks, x); assert.ok(y >= prev - 1e-9, `monotone at ${x}`); prev = y; }
  assert.equal(predictIsotonic(fit.blocks, -100), fit.blocks[0].y);
  assert.equal(predictIsotonic(fit.blocks, 1000), fit.blocks.at(-1).y);
  assert.equal(predictIsotonic(fit.blocks, null), null);
});

test('isotonic bridge: leave-one-out error is out of sample and the gate fails closed', () => {
  // A non-proportional but monotone change is fitted well: the LOO error is small and the bridge is comparable.
  const good = computeIsotonicBridge(pairs(line(40, (x) => (x < 30 ? x / 2 : x - 15))));
  assert.equal(good.comparable, true);
  assert.ok(good.loo.mae < 1, `LOO MAE ${good.loo.mae}`);
  assert.equal(good.loo.n, 40);
  assert.ok(good.logo.mae >= good.loo.mae - 1e-9, 'holding out a whole group is never easier than one bridge');
  // The reported error is genuinely out of sample: with every bridge left in, the fit of a monotone set is exact.
  assert.ok(good.blocks.every((b) => Number.isFinite(b.y)));
  // Too few bridges: no estimate at all.
  const few = computeIsotonicBridge(pairs(line(ISOTONIC_BRIDGE_POLICY.minBridges - 1, (x) => x)));
  assert.deepEqual([few.comparable, few.cause], [false, 'insufficient_bridges']);
  assert.equal(few.predict(30), null);
  // Noise: the gate refuses a fit whose leave-one-out error is above the limit.
  const noisy = computeIsotonicBridge(pairs(line(40, (x) => (x % 2 ? x + 30 : x - 30))));
  assert.deepEqual([noisy.comparable, noisy.cause], [false, 'fit_error_too_large']);
  // The interval comes from the out-of-sample residuals and always contains the estimate.
  const p = good.predict(25);
  assert.ok(p.lower <= p.value && p.value <= p.upper);
});

const snap = (version, models) => ({ ...(version ? { index_version: version } : {}), collected_at: version ? '2026-10-31' : '2026-10-27',
  models: models.map(([id, name, value, coding]) => ({ id, name, evaluations: { [AA_V5_FIELD]: value, artificial_analysis_coding_index: coding ?? null } })) });

test('records: measured stays measured, a v4-only model gets a fully labelled estimate, nothing else is invented', () => {
  const n = 40;
  const v4 = snap(null, [...Array.from({ length: n }, (_, i) => [`b${i}`, `Bridge ${i} (High)`, 10 + i, 30]), ['old', 'Old Model (Max)', 35, 44], ['gone', 'Gone', 20]]);
  const v5 = snap('5.0', [...Array.from({ length: n }, (_, i) => [`b${i}`, `Bridge ${i} (High)`, i < 20 ? (10 + i) / 2 : 10 + i - 15]),
    ['old', 'Old Model (Max)', null], ['new', 'New Model', 61], ['unscored', 'Unscored', null]]);
  const { fit, byId } = aaIntelligenceRecords({ current: v5, frozenV4: v4 });
  assert.equal(fit.bridge_count, n);
  assert.equal(fit.comparable, true);
  assert.ok(fit.loo.mae <= ISOTONIC_BRIDGE_POLICY.maxLooMae && fit.leave_one_model_out);
  assert.deepEqual(byId.get('new'), { version: '5.0', status: 'measured', value: 61 });
  const est = byId.get('old');
  assert.equal(est.status, 'estimated');
  assert.equal(est.label, 'estimated from v4');
  assert.equal(est.v4_value, 35);
  assert.equal(est.method, 'bridge-isotonic');
  assert.equal(est.bridge_count, n);
  assert.ok(est.interval[0] <= est.value && est.value <= est.interval[1]);
  assert.equal(byId.has('unscored'), false, 'no v4 value, no v5 value: nothing');
  assert.equal(byId.has('gone'), false, 'a model only in the frozen file is not resurrected');
  assert.equal(frozenV4IndexValues(v4).get('old').aa_coding_index, 44);
  // The gate fails closed: without enough bridges, v4-only models get nothing, measured ones keep their value.
  const thin = aaIntelligenceRecords({ current: snap('5.0', [['b0', 'Bridge 0', 5], ['old', 'Old', null]]), frozenV4: v4 });
  assert.equal(thin.fit.comparable, false);
  assert.deepEqual([...thin.byId.keys()], ['b0']);
  // The estimate is defined for v5 only, from the legacy v4 file only.
  assert.throws(() => aaIntelligenceRecords({ current: v4, frozenV4: v4 }), /defined for v5 only/);
  assert.throws(() => aaIntelligenceRecords({ current: v5, frozenV4: v5 }), /frozen legacy v4\.x snapshot/);
  assert.equal(aaBaseModel('GPT-6 Astra (High)'), 'GPT-6 Astra');
});

// The real data, as published by this change.
const ds = read('data/dataset.json');
const raw = read('data/raw/artificialanalysis.json');
const rawV4 = read('data/raw/artificialanalysis-v4.json');

test('real fit: the published leave-one-out error is reproducible and within the gate', () => {
  const status = ds.source_status.aa_intelligence_index;
  assert.equal(status.version, raw.index_version);
  assert.equal(String(status.version).split('.')[0], '5');
  const { fit } = aaIntelligenceRecords({ current: raw, frozenV4: rawV4 });
  assert.deepEqual(status.estimate_fit, JSON.parse(JSON.stringify(fit)));
  assert.equal(fit.method, 'bridge-isotonic');
  assert.ok(fit.bridge_count >= ISOTONIC_BRIDGE_POLICY.minBridges);
  assert.ok(fit.loo.mae <= ISOTONIC_BRIDGE_POLICY.maxLooMae, `LOO MAE ${fit.loo.mae}`);
  // The design evidence of 31 Oct: the existing median ratio is the wrong shape for this change.
  const ratios = raw.models.flatMap((m) => {
    const v5 = m.evaluations[AA_V5_FIELD], v4 = rawV4.models.find((o) => o.id === m.id)?.evaluations[AA_V5_FIELD];
    return Number.isFinite(v5) && Number.isFinite(v4) ? [v5 / v4] : [];
  });
  assert.equal(ratios.length, fit.bridge_count);
});

test('real data: every AA Intelligence value is v5 measured or a labelled estimate, never an unlabelled v4 value', () => {
  const v5 = new Map(raw.models.map((m) => [m.id, m.evaluations[AA_V5_FIELD]]));
  const v4 = new Map(rawV4.models.map((m) => [m.id, m.evaluations[AA_V5_FIELD]]));
  let estimated = 0;
  for (const m of ds.models) {
    const value = m.benchmarks.aa_intelligence_index;
    if (value == null) { assert.equal(m.aa_intelligence ?? null, null, m.id); continue; }
    assert.equal(m.aa_intelligence.value, value, m.id);
    if (m.aa_intelligence.status === 'measured') assert.equal(v5.get(m.aa_model_id), value, `${m.id} measured equals the v5 raw value`);
    else {
      estimated += 1;
      assert.equal(m.aa_intelligence.status, 'estimated', m.id);
      assert.equal(v5.get(m.aa_model_id) ?? null, null, `${m.id}: an estimate only where AA has no v5 value`);
      assert.equal(m.aa_intelligence.v4_value, v4.get(m.aa_model_id), m.id);
      for (const key of ['label', 'method', 'bridge_count', 'loo_mae', 'interval', 'v4_collected_at']) assert.ok(m.aa_intelligence[key] != null, `${m.id} ${key}`);
    }
    // Coding and Math Index are the frozen v4.x measurements, never estimated.
    const frozen = rawV4.models.find((o) => o.id === m.aa_model_id)?.evaluations;
    assert.equal(m.benchmarks.aa_coding_index, frozen?.artificial_analysis_coding_index ?? null, m.id);
    assert.equal(m.benchmarks.aa_math_index, frozen?.artificial_analysis_math_index ?? null, m.id);
  }
  assert.ok(estimated > 0);
});

test('real data: no estimate is presented as a measurement in raw files, headline history or the benchmark view', () => {
  // Raw: the v5 snapshot is AA's response passed through; it holds no value for an estimated model.
  const estimatedIds = new Set(ds.models.filter((m) => m.aa_intelligence?.status === 'estimated').map((m) => m.aa_model_id));
  for (const m of raw.models) if (estimatedIds.has(m.id)) assert.equal(m.evaluations[AA_V5_FIELD], null);
  // Headline history: the v5 board holds measured AA values only.
  for (const o of ds.benchmark_results.observations.filter((o) => o.benchmark_id === 'aa-intelligence-index-v5::5.0')) {
    assert.equal(o.basis, 'measured'); assert.equal(estimatedIds.has(o.subject.source_id), false);
  }
  // View: the AA Intelligence axis scores only measured rows; every estimate is in `estimates`, labelled.
  const view = buildBenchmarkView(ds);
  const axis = view.axes.find((a) => a.family === 'aa_intelligence_index');
  assert.match(axis.version, /^v5\.0 · snapshot-/);
  const estimatedRows = new Set(ds.models.filter((m) => m.aa_intelligence?.status === 'estimated').map((m) => m.id));
  assert.equal(axis.scores.filter((r) => estimatedRows.has(r.modelId)).length, 0);
  assert.equal(axis.estimates.length, estimatedRows.size);
  for (const e of axis.estimates) {
    assert.equal(e.status, 'estimated'); assert.equal(e.method, 'bridge-isotonic');
    assert.ok(Number.isFinite(e.sourceValue) && e.uncertainty.lower <= e.value && e.value <= e.uncertainty.upper);
    assert.match(e.note, /^estimated from v4: /);
  }
  // The Coding Index axis is the frozen v4.x board.
  const coding = view.axes.find((a) => a.family === 'aa_coding_index');
  assert.equal(coding.version, `v4.x · frozen ${ds.sources.artificialanalysis_v4}`);
  // Compare: a family whose representative is estimated says so.
  const families = compareFamilies(view);
  assert.ok(families.some((f) => f.scoreEstimated === true));
  for (const f of families.filter((x) => x.scoreEstimated)) assert.ok(estimatedRows.has(f.id), f.id);
});

test('real data: token efficiency follows the index version of each row', () => {
  for (const m of ds.models) {
    const aa = m.token_efficiency?.aa;
    if (!aa?.tokens_per_task) continue;
    assert.ok(['5.0', '4.x'].includes(aa.index_version), m.id);
    assert.equal(aa.tokens_per_task.index_version, aa.index_version, m.id);
  }
});

test('critic r1 F4: a leave-one-group-out check needs two groups; an empty fit is never read as a zero prediction', () => {
  const one = computeIsotonicBridge(Array.from({ length: 30 }, (_, i) => ({ model_key: String(i), group: 'same', old_value: 10 + i, new_value: 10 + i })));
  assert.equal(one.logo, null);
  assert.ok(one.loo.mae < 0.1, 'leave-one-out still works with one group (only the two end points extrapolate flat)');
  const two = computeIsotonicBridge(Array.from({ length: 30 }, (_, i) => ({ model_key: String(i), group: i % 2 ? 'a' : 'b', old_value: 10 + i, new_value: 10 + i })));
  assert.equal(two.logo.n, 30);
  assert.ok(two.logo.mae < 1);
});

test('critic r1 F1: shared compare text and OG entries keep the estimate status of an AA Intelligence value', () => {
  const families = compareFamilies(buildBenchmarkView(ds));
  const est = families.find((f) => f.scoreEstimated && f.current && Number.isFinite(f.score));
  const measured = families.find((f) => !f.scoreEstimated && f.current && Number.isFinite(f.score));
  const { entries } = resolveCompareIds([est.id, measured.id], families);
  assert.equal(entries[0].scoreEstimated, true);
  assert.equal(entries[1].scoreEstimated, undefined);
  const text = compareDescription(entries);
  assert.ok(text.includes(`${est.name} (AA Intelligence Index ${est.score.toFixed(1)}, estimated from v4)`), text);
  assert.ok(text.includes(`${measured.name} (AA Intelligence Index ${measured.score.toFixed(1)})`), text);
});

test('critic r1 F2: every component that prints an AA Intelligence value carries the estimate marker', () => {
  // Source-level guard: the consumers named in review round 1 must reference the estimate field.
  for (const file of ['components/ModelExplorer.tsx', 'components/CostCapabilityScatter.tsx', 'components/CompareView.tsx', 'components/ProviderExplorer.tsx',
    'components/ComparePicker.tsx', 'components/SimpleBenchmarks.tsx', 'app/models/[id]/page.tsx', 'app/api/og/compare/route.tsx',
    // critic round 2 F5/F6
    'components/ShortlistColumns.tsx', 'components/ChartsBoard.tsx', 'components/Wizard.tsx', 'app/api/models/route.ts']) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(src, /aa_intelligence_estimate|scoreEstimated|aa_intelligence\?\.status|aa_intelligence: m\.aa_intelligence/, file);
  }
});

test('critic r2 F7: an adoption run needs broad Intelligence Index coverage; an all-null or partial v5 payload fails closed', () => {
  const models = (n, total = 100) => Array.from({ length: total }, (_, i) => ({ evaluations: { artificial_analysis_intelligence_index: i < n ? 40 : null } }));
  // Critic round 3: the floor is the reviewed adoption's own coverage; 80–88 of 89 with every identity intact is partial.
  assert.equal(AA_ADOPTION_MIN_SCORED, 89);
  assert.throws(() => assertAdoptionCoverage(models(0)), /needs at least 89 scored models; the response has 0/);
  for (const n of [79, 80, 88]) assert.throws(() => assertAdoptionCoverage(models(n)), new RegExp(`the response has ${n}$`));
  assert.equal(assertAdoptionCoverage(models(89)), 89);
  const partial = structuredClone(raw.models); let removed = 0;
  for (const m of partial) if (removed < 9 && Number.isFinite(m.evaluations.artificial_analysis_intelligence_index)) { m.evaluations.artificial_analysis_intelligence_index = null; removed++; }
  assert.throws(() => assertAdoptionCoverage(partial), /the response has 80/);
  // The committed adoption snapshot itself passes the floor.
  assert.ok(assertAdoptionCoverage(raw.models) >= AA_ADOPTION_MIN_SCORED);
  // The collector and the live review both apply it.
  for (const file of ['scripts/fetch-live.mjs', 'ops/daily/review-live.mjs']) assert.match(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), /assertAdoptionCoverage\(/, file);
});

test('critic r3 F5: the open-vs-closed dot strip labels estimated points and counts them in its summary', () => {
  const src = readFileSync(new URL('../components/ChartsBoard.tsx', import.meta.url), 'utf8');
  assert.match(src, /estimated: score === "aa_intelligence_index" && !!x\.m\.aa_intelligence_estimate/);
  assert.match(src, /r\.estimated \? " · estimated from v4, not measured" : ""/);
  assert.match(src, /estimated from v4 \(not measured\), drawn as rings/);
  assert.match(src, /data-aa-estimate=\{d\.est \|\| undefined\}/);
});
