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
  // F-200 (pass 36): the trigger lives in the client tip component now (JevCapabilityTip.tsx).
  const source = readFileSync(path.join(root, 'components/JevCapabilityTip.tsx'), 'utf8');
  const trigger = source.match(/<button[^>]*bh-jev-info[^>]*>/);
  assert.ok(trigger, 'the ranking ⓘ trigger is present');
  assert.match(trigger[0], /min-h-0/, 'the trigger opts out of the 44 px button floor');
  assert.match(trigger[0], /before:-inset-3 before:content-\[''\]/, 'the tap area is kept by the before: layer');
  assert.doesNotMatch(trigger[0], /min-h-\[?44/, 'the trigger does not re-add a 44 px minimum');
});

test('CR-169 follow-up: long truncated names keep their ⓘ trigger visible', () => {
  // On a 390 px phone the name ellipsis also clipped the trigger, so rows with long names had no tap target.
  const source = readFileSync(path.join(root, 'components/JevCapabilityRanking.tsx'), 'utf8');
  const nameCell = source.match(/<span className="col-start-2 row-start-1([^"]*)"[^>]*>\s*<span className="min-w-0 truncate">[\s\S]*?<\/span>\s*(?:\{\/\*[\s\S]*?\*\/\}\s*)?<JevCapabilityTip /);
  assert.ok(nameCell, 'the ⓘ trigger is a sibling of the truncated name, not inside it');
  assert.doesNotMatch(nameCell[1], /truncate/, 'the cell that holds the trigger does not clip it');
});

test('F-200 (pass 36): the Capability ⓘ panel is a definition list and the row carries no 300-char title', () => {
  const source = readFileSync(path.join(root, 'components/JevCapabilityRanking.tsx'), 'utf8');
  const tip = readFileSync(path.join(root, 'components/JevCapabilityTip.tsx'), 'utf8');
  assert.match(source, /<dl className="[^"]*" data-bh-jev-capability-tip-dl>[\s\S]*?Rank<\/dt>[\s\S]*?<\/dl>/);
  const dts = [...source.matchAll(/<dt /g)].length;
  assert.ok(dts >= 7, `≥ 7 definition rows (${dts})`);
  assert.doesNotMatch(source, /title=\{tooltip\}/, 'the long native tooltip on the row is gone');
  assert.match(source, /data-bh-jev-capability-tooltip/);
  // desktop keeps the hover panel (globals.css gates .bh-jev-cap-tip off under 640 px); touch opens the modal
  assert.match(tip, /aria-label="Close"/);
  assert.match(tip, /lastPointerType\.current === 'touch' && window\.innerWidth < 640/);
});

test('CR-176.6: the 3D capability view labels all three axes and pins the top five permanently', () => {
  const source = readFileSync(path.join(root, 'components/JevCapability3D.tsx'), 'utf8');

  // CR-176.6 verbatim: "add axis labels for all three. And labels for the top5 models."
  // Both the WebGL path (DOM overlay, data-bh-jev14-3d-labels layer) and the SVG fallback
  // draw the same three axis labels and the ranked top-five model labels.
  assert.equal((source.match(/data-bh-jev14-3d-axis-label/g) ?? []).length >= 2, true, 'axis labels exist in both render paths');
  assert.match(source, /data-bh-jev14-3d-axis-label=\{def\.name\}|data-bh-jev14-3d-axis-label=\{label\.name\}/);
  assert.match(source, /Capability 0–100/);
  assert.match(source, /Cost · \$\/1k decisions · cheaper →/);
  assert.match(source, /Speed · faster →/);
  assert.match(source, /data-bh-jev14-3d-model-label=.{0,40}entry\.point\.key/);
  assert.equal((source.match(/data-bh-jev14-3d-model-label/g) ?? []).length >= 2, true, 'model labels exist in both render paths (DOM + SVG)');
  assert.match(source, /data-bh-jev14-3d-labels/);
  assert.match(source, /updateLabelsRef/);
});

test('CR-176.6 DOM: the fallback 3D view renders permanent axis names and top-five labels', () => {
  const source = readFileSync(path.join(root, 'components/JevCapability3D.tsx'), 'utf8');
  for (const name of ['cost', 'capability', 'speed']) {
    assert.match(source, new RegExp(`name: '${name}'|data-bh-jev14-3d-axis-label="${name}"`), `${name} is one of the three labelled axes`);
  }
  assert.match(source, /data-bh-jev14-3d-axis-label=\{def\.name\}|data-bh-jev14-3d-axis-label=\{label\.name\}/, 'axis labels carry their axis name');
  assert.equal((source.match(/data-bh-jev14-3d-model-label/g) ?? []).length >= 2, true, 'top-five labels exist in both render paths');
  assert.match(source, /data-bh-jev14-3d-model-label=\{entry\.point\.key\}/);
  assert.match(source, /`#\$\{index \+ 1\} \$\{entry\.point\.name\}`/, 'the model label shows its rank and measured name');
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
