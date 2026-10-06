import test from 'node:test';
import assert from 'node:assert/strict';
import { JEV_GPU_PRESETS, jevGpuHourlyCost, jevGpuDecisionsPerHour, jevGpuUsdPer1000,
  normaliseJevGpu, jevGpuCostRows } from '../lib/jevbench-gpu-cost.mjs';

const gpu = { ...JEV_GPU_PRESETS.H100, purchase_usd: 8760, watts: 1000, on_demand_usd_h: 2, reserved_usd_h: 1 };
const system = (key, latency, hardware = 'H100', official = 1) => ({ key, display: key, gpu: hardware,
  p50_s_raw: latency, officialUsdPer1000: official, ranked: true });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test('own cost amortises hardware and constant power per useful hour', () => {
  near(jevGpuHourlyCost('own', gpu, { years: 1, usd_per_kwh: 0.2, pue: 1.3, utilisation: 0.5 }), 2.52);
  near(jevGpuHourlyCost('own', gpu, { years: 2, usd_per_kwh: 0, utilisation: 1 }), 0.5);
});
test('rental modes include paid idle hours and ignore own-hardware inputs', () => {
  assert.equal(jevGpuHourlyCost('on_demand', gpu, { utilisation: 0.5, years: NaN }), 4);
  assert.equal(jevGpuHourlyCost('reserved', gpu, { utilisation: 0.25 }), 4);
  assert.equal(jevGpuHourlyCost('reserved', { ...gpu, reserved_usd_h: 0 }), 0);
});
test('throughput uses measured latency and linear streams from 1 to 32', () => {
  assert.equal(jevGpuDecisionsPerHour(2), 1800);
  assert.equal(jevGpuDecisionsPerHour(2, 32), 57600);
  near(jevGpuUsdPer1000(2, 1800), 10 / 9);
  near(jevGpuUsdPer1000(2, jevGpuDecisionsPerHour(2, 4)), 10 / 36);
});
test('invalid and missing inputs never yield NaN or Infinity', () => {
  for (const value of [null, undefined, NaN, Infinity, -1, 0, '2']) {
    assert.equal(jevGpuDecisionsPerHour(value), null);
    assert.equal(jevGpuHourlyCost('own', gpu, { utilisation: value }), null);
  }
  for (const streams of [null, NaN, Infinity, 0, 33, 1.5]) assert.equal(jevGpuDecisionsPerHour(1, streams), null);
  for (const value of [null, undefined, NaN, Infinity, -1]) {
    assert.equal(jevGpuHourlyCost('own', { ...gpu, purchase_usd: value }), null);
    assert.equal(jevGpuHourlyCost('own', { ...gpu, watts: value }), null);
    assert.equal(jevGpuHourlyCost('reserved', { ...gpu, reserved_usd_h: value }), null);
    assert.equal(jevGpuHourlyCost('on_demand', { ...gpu, on_demand_usd_h: value }), null);
    assert.equal(jevGpuUsdPer1000(value, 3600), null);
    assert.equal(jevGpuUsdPer1000(1, value), null);
  }
  assert.equal(jevGpuHourlyCost('own', gpu, { utilisation: 1.1 }), null);
  assert.equal(jevGpuHourlyCost('own', gpu, { years: 0 }), null);
  assert.equal(jevGpuHourlyCost('own', gpu, { pue: 0 }), null);
  assert.equal(jevGpuHourlyCost('own', gpu, { usd_per_kwh: -1 }), null);
  assert.equal(jevGpuHourlyCost('bad', gpu), null);
  assert.equal(jevGpuUsdPer1000(1, 0), null);
  assert.equal(jevGpuDecisionsPerHour(Number.MIN_VALUE), null);
  assert.equal(jevGpuHourlyCost('reserved', { ...gpu, reserved_usd_h: Number.MAX_VALUE }, { utilisation: 0.01 }), null);
});
test('normalises all known hardware and keeps unknowns explicit', () => {
  for (const [input, expected] of [['H100', 'H100'], ['RTX6000', 'RTX6000'], ['RTXPRO6000', 'RTXPRO6000'],
    ['RTX5090', 'RTX5090'], ['RTX 5090', 'RTX5090'], ['A6000', 'A6000'], ['cpu', 'cpu'], [null, null], ['mystery', null]]) {
    assert.equal(normaliseJevGpu(input), expected);
  }
  const rows = jevGpuCostRows([system('unknown', 1, null), system('cpu', 1, 'cpu')]);
  assert.equal(rows.find((r) => r.key === 'unknown').gpu, 'H100');
  assert.equal(rows.find((r) => r.key === 'unknown').hardware_assumed, true);
  assert.equal(rows.find((r) => r.key === 'cpu').gpu, 'cpu');
});
test('rows sort costs ascending, nulls last, preserving ties and unranked systems', () => {
  const rows = jevGpuCostRows([system('missing', null), system('slow', 3), system('fast', 1),
    { ...system('tie', 1), ranked: false }, system('also-missing', 0)]);
  assert.deepEqual(rows.map((r) => r.key), ['fast', 'tie', 'slow', 'missing', 'also-missing']);
  assert.equal(rows[1].ranked, false);
  assert.deepEqual(rows[3].all_modes, { own: null, on_demand: null, reserved: null });
  near(rows[0].ratio_vs_official, rows[0].usd_per_1000);
});
test('overrides and per-preset edits compute all modes without changing measured inputs', () => {
  const input = [system('sample', 3, 'RTX 5090', 2)];
  const settings = { mode: 'reserved', gpu_override: 'A6000', parallel_streams: 2,
    preset_overrides: { A6000: { on_demand_usd_h: 6, reserved_usd_h: 3 } } };
  const row = jevGpuCostRows(input, settings)[0];
  assert.equal(row.gpu, 'A6000');
  assert.equal(row.measured_gpu, 'RTX5090');
  assert.equal(row.hardware_assumed, true);
  near(row.all_modes.on_demand, 2.5);
  near(row.usd_per_1000, 1.25);
  near(row.ratio_vs_official, 0.625);
  assert.ok(row.all_modes.own > 0);
  assert.equal(input[0].gpu, 'RTX 5090');
  assert.equal(JEV_GPU_PRESETS.A6000.reserved_usd_h, 0.40);
});
test('missing/zero official prices have no ratio, invalid mode/override has no cost', () => {
  for (const official of [null, 0, -1, Infinity, NaN]) {
    assert.equal(jevGpuCostRows([system('x', 1, 'H100', official)])[0].ratio_vs_official, null);
  }
  assert.equal(jevGpuCostRows([system('x', 1)], { mode: 'invalid' })[0].usd_per_1000, null);
  assert.equal(jevGpuCostRows([system('x', 1)], { gpu_override: 'invalid' })[0].usd_per_1000, null);
  assert.deepEqual(jevGpuCostRows([]), []);
});
