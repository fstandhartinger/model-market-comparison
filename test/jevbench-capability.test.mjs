import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jevbenchCapabilityRows } from '../lib/jevbench-capability.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const system = (key, intelligence, calibration) => ({
  key,
  display: key,
  axes: { intelligence, calibration },
});

test('Capability is the arithmetic mean of Intelligence and Calibration', () => {
  const rows = jevbenchCapabilityRows([system('alpha', 90, 70)]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].capability, 80);
});

test('Capability chart rows sort by mean and use stable names for ties', () => {
  const input = [
    system('zeta', 80, 80),
    system('beta', 70, 70),
    system('alpha', 80, 80),
  ];
  const rows = jevbenchCapabilityRows(input);
  assert.deepEqual(rows.map(({ row, capability }) => [row.key, capability]), [
    ['alpha', 80], ['zeta', 80], ['beta', 70],
  ]);
});

test('Capability excludes placeholders without both axis values and does not reorder the source rows', () => {
  const input = [
    system('measured', 65, 55),
    system('missing-calibration', 90, null),
    system('missing-both', null, null),
  ];
  const before = input.map((row) => row.key);
  const rows = jevbenchCapabilityRows(input);
  assert.deepEqual(rows.map(({ row }) => row.key), ['measured']);
  assert.deepEqual(input.map((row) => row.key), before);
});

test('Capability keeps valid zero-valued axes as a measured score', () => {
  const rows = jevbenchCapabilityRows([system('zero', 0, 0)]);
  assert.equal(rows[0].capability, 0);
});

test('Capability views define the measure, use twenty expandable bars, and follow the ranking table', () => {
  const source = readFileSync(path.join(root, 'components/JevCapabilityChart.tsx'), 'utf8');
  const page = readFileSync(path.join(root, 'app/jev-models/page.tsx'), 'utf8');
  const pinned = readFileSync(path.join(root, 'app/jev-models/v1.4.1/page.tsx'), 'utf8');
  const previous = readFileSync(path.join(root, 'app/jev-models/v1.4/page.tsx'), 'utf8');
  assert.match(source, /Capability is the arithmetic mean of Intelligence and Calibration/);
  assert.match(source, /all\.slice\(0, CHART_TOP\)/);
  assert.match(source, /data-bh-jev14-capability-more/);
  assert.match(source, /USD per 1,000 decisions[^\n]*logarithmic/);
  assert.match(source, /data-bh-jev14-scatter=\{xKind\}/);
  assert.match(source, /GPT-6 Luna \(low\)/);
  assert.match(source, /GPT-6 Luna \(medium\)/);
  assert.match(source, /data-bh-jev14-cost-axis/);
  assert.match(source, /logarithmic · lower is better/);
  assert.match(source, /fill="var\(--muted\)"/);
  assert.match(source, /data-bh-jev14-scatter-top-five=\{xKind\}/);
  assert.match(readFileSync(path.join(root, 'components/JevCapability3D.tsx'), 'utf8'), /data-bh-jev14-3d-top-five/);
  assert.match(source, /xKind="cost"/);
  assert.match(source, /xKind="speed"/);
  assert.ok(page.indexOf('id="credit"') < page.indexOf('<JevCapabilityLazy') && page.indexOf('<JevCapabilityLazy') < page.indexOf('<JevHistoryLazy'), 'capability views follow the current board sections and precede only historical content');
  assert.match(pinned, /JevModelsV14Board artifact=\{view\.artifact\}[\s\S]*<JevCapabilityChart systems=\{view\.systems\}/);
  assert.doesNotMatch(previous, /JevCapabilityChart/);
});

test('Three.js is pinned locally, integrity checked, and loaded after the section enters view', () => {
  const source = readFileSync(path.join(root, 'components/JevCapability3D.tsx'), 'utf8');
  const three = readFileSync(path.join(root, 'public/vendor/three-r128.min.js'));
  const controls = readFileSync(path.join(root, 'public/vendor/OrbitControls-r128.js'));
  const license = readFileSync(path.join(root, 'public/vendor/THREE-LICENSE.txt'), 'utf8');
  const sri = (data) => 'sha512-' + createHash('sha512').update(data).digest('base64');
  assert.ok(source.includes(sri(three)), 'the Three.js asset must match its SRI pin');
  assert.ok(source.includes(sri(controls)), 'the OrbitControls asset must match its SRI pin');
  assert.match(source, /new IntersectionObserver/);
  assert.match(source, /if \(!visible \|\| !box\) return/);
  assert.match(source, /appendPinnedScript\(THREE_SRC/);
  assert.doesNotMatch(source, /https?:\/\//);
  assert.match(license, /Copyright © 2010-2021 three\.js authors/);
});
