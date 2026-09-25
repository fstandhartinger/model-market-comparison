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
  assert.match(source, /if \(!visible \|\| !box \|\| fallback\) return/, 'fallback does not retry WebGL');
  assert.match(source, /appendPinnedScript\(THREE_SRC/);
  assert.doesNotMatch(source, /https?:\/\//);
  assert.match(license, /Copyright © 2010-2021 three\.js authors/);
});

test('CR-169 / D207: the ⓘ trigger is a small inline glyph that does not stretch the ranking row', () => {
  // The global `button { min-height: 44px }` floor (app/globals.css) turned the info glyph into a
  // 44 px tall control, which pushed the first Jev-class row down until it sat behind the compact
  // fast-lane banner on a 390 px phone (review gate 2026-09-25T19:20Z, D207). The trigger keeps a
  // 40 px tap area with the `before:` layer but must stay visually one line tall.
  const source = readFileSync(path.join(root, 'components/JevCapabilityRanking.tsx'), 'utf8');
  const trigger = source.match(/<button[^>]*bh-jev-info[^>]*>/);
  assert.ok(trigger, 'the ranking ⓘ trigger is present');
  assert.match(trigger[0], /min-h-0/, 'the trigger opts out of the 44 px button floor');
  assert.match(trigger[0], /before:-inset-3 before:content-\[''\]/, 'the tap area is kept by the before: layer');
  assert.doesNotMatch(trigger[0], /min-h-\[?44/, 'the trigger does not re-add a 44 px minimum');
});

test('F-184 (Fable pass 34): the capability rows share one height and the header names the value columns', () => {
  const source = readFileSync(path.join(root, 'components/JevCapabilityChart.tsx'), 'utf8');
  // the trailing value column never wraps at sm+, on a track wide enough for the longest string
  // the data produces ("$0.0033 est. · I 51.6 · C 72.4", measured live at 1440: 15 rem fits it).
  assert.match(source, /sm:whitespace-nowrap sm:text-right/);
  assert.equal(source.includes('_3.2rem_11rem]'), false, 'the old 11 rem track is gone');
  assert.equal((source.match(/_3\.2rem_15rem\]/g) ?? []).length, 4, 'row, header, cost axis and footer share one grid');
  assert.match(source, /\$\/1k · I · C/);
  assert.equal(source.includes('I · C inputs'), false);
});
