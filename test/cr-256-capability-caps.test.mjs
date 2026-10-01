import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DEFAULT_CAP, clampCap, parseCap, parseCaps, serialiseCaps, formatCap, isOfficialCaps } from '../lib/jevbench-class-caps.mjs';
import { jevClassRows, trafficLightZone } from '../lib/jevbench-jev-class.mjs';
import { imageJevBoardSystems, imageJevCapabilityLimits } from '../lib/imagejev-board.mjs';
import { readMultimodalPreview } from '../lib/jevbench-multimodal-preview.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const system = (key, cost, latency, speed = 80) => ({
  key, display: key, ranked: true, class: 'native-logit', listing: 'ranked',
  axes: { intelligence: 80, calibration: 80, cost: 80, speed },
  cost: { usd_per_1000: cost }, speed: { p50_s_adjusted: latency },
});
const reference = system('jev-1.13.0', 1, 1);
const eligible = (result) => result.rows.filter((row) => row.inClass).map((row) => row.row.key);

test('CR-256: URL defaults are omitted, aliases parse, and unrelated params and hash survive', () => {
  const defaults = { costFactor: DEFAULT_CAP, latencyFactor: DEFAULT_CAP };
  assert.deepEqual(parseCaps(new URLSearchParams()), defaults);
  assert.equal(serialiseCaps(new URLSearchParams('costcap=4&latcap=off'), defaults).toString(), '');
  for (const alias of ['none', 'off', 'inf', ' NONE ']) assert.equal(parseCap(alias), Infinity);
  for (const caps of [defaults, { costFactor: 3.2, latencyFactor: Infinity }, { costFactor: Infinity, latencyFactor: 1 }, { costFactor: 10, latencyFactor: 10 }]) {
    const url = new URL('https://benchmarkheaven.com/jev-models?w=90:5:0:5&view=intelligence&extra=hello#jev14-chart-title');
    url.search = serialiseCaps(url.searchParams, caps).toString();
    assert.deepEqual(parseCaps(url.searchParams), caps);
    assert.equal(url.searchParams.get('w'), '90:5:0:5');
    assert.equal(url.searchParams.get('view'), 'intelligence');
    assert.equal(url.searchParams.get('extra'), 'hello');
    assert.equal(url.hash, '#jev14-chart-title');
    if (caps.latencyFactor === Infinity) assert.equal(url.searchParams.get('latcap'), 'none');
  }
});

test('CR-256: invalid and out-of-range URLs default; slider clamping and labels are stable', () => {
  for (const value of [null, '', ' ', 'oops', 'NaN', 'Infinity', '0.9', '10.1', '-1', '1e1', '0x2', '3x']) assert.equal(parseCap(value), 2, String(value));
  assert.equal(parseCap('3.2'), 3.2);
  assert.equal(parseCap('3.26'), 3.3);
  assert.equal(parseCap('1'), 1);
  assert.equal(parseCap('10'), 10);
  assert.equal(clampCap(0), 1);
  assert.equal(clampCap(99), 10);
  assert.equal(clampCap(3.24), 3.2);
  assert.equal(clampCap(NaN), 2);
  assert.equal(clampCap(Infinity), Infinity);
  assert.equal(formatCap(3.2), '3.2×');
  assert.equal(formatCap(Infinity), 'no cap');
  assert.equal(isOfficialCaps({ costFactor: 2, latencyFactor: 2 }), true);
  assert.equal(isOfficialCaps({ costFactor: 2, latencyFactor: Infinity }), false);
});

test('CR-256: cost 3.2 admits a 3× system without relaxing latency', () => {
  const systems = [reference, system('cost-3', 3, 1), system('slow-3', 1, 3)];
  assert.deepEqual(eligible(jevClassRows(systems)), ['jev-1.13.0']);
  const result = jevClassRows(systems, { costFactor: 3.2 });
  assert.deepEqual(eligible(result), ['cost-3', 'jev-1.13.0']);
  assert.equal(result.limits.cost, 3.2);
  assert.equal(result.limits.latency, 2);
  assert.match(result.rows.find((row) => row.row.key === 'slow-3').reasons[0], /cap 2×/);
});

test('CR-256: independent factors include boundaries and report the correct axis cap', () => {
  const systems = [reference, system('costly', 4, 1), system('slow', 1, 4), system('boundary', 3.2, 1.1), system('carryover', 1, null, 79.2)];
  const result = jevClassRows(systems, { costFactor: 3.2, latencyFactor: 1.1 });
  assert.deepEqual(eligible(result), ['boundary', 'carryover', 'jev-1.13.0']);
  assert.equal(result.limits.speedFloor, 80 - 20 * Math.log10(1.1));
  assert.match(result.rows.find((row) => row.row.key === 'costly').reasons[0], /cap 3\.2×/);
  assert.match(result.rows.find((row) => row.row.key === 'slow').reasons[0], /cap 1\.1×/);
  const strict = jevClassRows([reference, system('carryover', 1, null, 70)], { costFactor: 3.2, latencyFactor: 1 });
  assert.match(strict.rows.find((row) => row.row.key === 'carryover').reasons[0], /1× latency line/);
  for (const value of [0.5, NaN, -Infinity]) {
    assert.throws(() => jevClassRows(systems, { costFactor: value }), /at least 1/);
    assert.throws(() => jevClassRows(systems, { latencyFactor: value }), /at least 1/);
  }
});

test('CR-256: no caps admit known measurements and Speed fallbacks, excluding missing data', () => {
  const systems = [reference, system('huge', 100000, 100000), system('carryover', 3, null, 0), system('no-cost', null, 1), system('no-latency', 1, null, null)];
  const result = jevClassRows(systems, { costFactor: Infinity, latencyFactor: Infinity });
  assert.deepEqual(eligible(result), ['carryover', 'huge', 'jev-1.13.0']);
  assert.equal(result.limits.cost, Infinity);
  assert.equal(result.limits.latency, Infinity);
  assert.equal(result.limits.speedFloor, -Infinity);
  assert.deepEqual(result.rows.find((row) => row.row.key === 'no-cost').reasons, ['no cost reported']);
  assert.deepEqual(result.rows.find((row) => row.row.key === 'no-latency').reasons, ['no latency reported']);
  const latencyOnly = jevClassRows([reference, system('slow', 1, 100), system('costly', 3, 1)], { latencyFactor: Infinity });
  assert.deepEqual(eligible(latencyOnly), ['jev-1.13.0', 'slow']);
  const costOnly = jevClassRows([reference, system('slow', 1, 100), system('costly', 3, 1)], { costFactor: Infinity });
  assert.deepEqual(eligible(costOnly), ['costly', 'jev-1.13.0']);
});

test('CR-256: no-cap traffic lights never become red; unknown remains unknown', () => {
  assert.equal(trafficLightZone(1, Infinity), 'green');
  for (const ratio of [1.1, 2, 100, Number.MAX_VALUE]) assert.equal(trafficLightZone(ratio, Infinity), 'amber');
  assert.equal(trafficLightZone(null, Infinity), null);
  assert.equal(trafficLightZone(NaN, Infinity), null);
  assert.equal(trafficLightZone(3.2, 3.2), 'amber');
  assert.equal(trafficLightZone(3.3, 3.2), 'red');
});

test('CR-256: ImageJev absolute limits retain the anchor and scale each selected factor', async () => {
  const artifact = await readMultimodalPreview();
  const systems = imageJevBoardSystems(artifact);
  const limits = imageJevCapabilityLimits(artifact);
  const options = { limits, factor: limits.factor, referenceLabel: limits.referenceLabel };
  const before = jevClassRows(systems, options);
  const custom = jevClassRows(systems, { ...options, costFactor: 3.2, latencyFactor: Infinity });
  assert.deepEqual(custom.reference, before.reference);
  assert.equal(custom.limits.cost, before.reference.cost * 3.2);
  assert.equal(custom.limits.latency, Infinity);
  assert.equal(custom.limits.speedFloor, -Infinity);
  assert.ok(eligible(custom).length > eligible(before).length);
  assert.ok(custom.rows.every((row) => !row.isReference));
  const synthetic = jevClassRows([system('3x-anchor-cost', 6, 1), system('3x-anchor-latency', 1, 3)], { limits: { cost: 4, latency: 2 }, referenceLabel: 'Anchor', costFactor: 3.2 });
  assert.deepEqual(eligible(synthetic), ['3x-anchor-cost']);
  assert.equal(synthetic.reference.cost, 2);
  assert.match(synthetic.rows.find((row) => row.row.key === '3x-anchor-latency').reasons[0], /3\.0× Anchor \(cap 2×\)/);
  const { reference: r, limits: l, rows } = before;
  // Captured from the unchanged HEAD classifier before this slice, including ImageJev's exact absolute limits.
  assert.equal(createHash('sha256').update(JSON.stringify({ reference: r, limits: l, rows })).digest('hex'), '8b702f31ed04176ba64934b762508dd2431a0372838e1da8b4c802630b033f82');
  assert.equal(JSON.stringify(jevClassRows(systems, { ...options, costFactor: 2, latencyFactor: 2 })), JSON.stringify(before));
});

test('CR-256: official defaults omit new keys and preserve the published classifier hashes', () => {
  for (const [path, expected] of [
    ['v1.4.2/jevbench-v1.4.2-results.json', '92202a9c9edd84be67e88785387429e1037d986af195cf0b10709620afae403f'],
    ['v1.5/jevbench-v1.5.4-results.json', 'b1be5628917c8fedf2d4bf11925e79ddc168b4b8db0834b42c9a8a471d439bbe'],
  ]) {
    const systems = JSON.parse(read(`../data/raw/benchmarks/jevbench/${path}`)).systems;
    const result = jevClassRows(systems);
    const { reference, limits, rows } = result;
    assert.deepEqual(Object.keys(limits), ['cost', 'latency', 'speedFloor', 'factor']);
    assert.equal(createHash('sha256').update(JSON.stringify({ reference, limits, rows })).digest('hex'), expected);
    assert.equal(JSON.stringify(jevClassRows(systems, { costFactor: 2, latencyFactor: 2 })), JSON.stringify(result));
  }
});

test('CR-256: client ranking exposes caps, custom notes, and URL reads/writes; server view is separate', () => {
  const source = read('../components/JevCapabilityRanking.tsx');
  assert.match(source, /^'use client';/);
  assert.match(source, /Max cost/); assert.match(source, /Max median latency/);
  assert.match(source, /Custom caps — not the official ranking/);
  assert.match(source, /bh-jevc-notdefault/); assert.match(source, /bh-jevc-official/);
  assert.match(source, /The ranking above uses custom caps of/);
  assert.match(source, /Charts below use the official 2× caps/);
  assert.match(source, /Reset to official caps/);
  assert.match(source, /parseCaps\(new URLSearchParams\(window.location.search\)\)/);
  assert.match(source, /serialiseCaps\(url.searchParams, next\)/);
  assert.match(source, /history.replaceState\(window.history.state, '', url\)/);
  const helpers = read('../lib/jevbench-class-caps.mjs');
  assert.match(helpers, /params.get\('costcap'\)/); assert.match(helpers, /params.get\('latcap'\)/);
  assert.doesNotMatch(source, /export function jevClassView/);
  assert.match(read('../components/jevClassView.ts'), /export function jevClassView/);
  for (const importer of ['../components/JevBenchV15Preview.tsx', '../app/jev-models/multimodal-preview/page.tsx', '../app/jev-models/v1.4.2.2/page.tsx']) {
    assert.match(read(importer), /import \{ jevClassView \} from '[^']*\/jevClassView'/);
  }
});
