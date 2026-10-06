import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('CR-303 impl-ui: 3D view follows the hidden-keys filter and its caption count', () => {
  const wrapper = read('components/JevCapability3DVisible.tsx');
  assert.match(wrapper, /^"use client";/);
  assert.match(wrapper, /useJevV15VisibleKeys\(points\.map/);
  assert.match(wrapper, /\{shown\.length\} systems plotted/);
  assert.match(read('components/JevCapabilityChart.tsx'), /<JevCapability3DVisible points=\{plotted3d\}/);
});

test('CR-303 impl-ui: compare labels api_offering and reference instead of "Partial run"', () => {
  const v14 = read('components/JevCompareV14.tsx');
  assert.match(v14, /row\.listing === 'api_offering' \? 'API offering' : row\.listing === 'reference' \? 'Reference' : 'Partial run'/);
  assert.match(read('components/JevCompareV15.tsx'), /api_offering: "API offering, ranked on the API leaderboard", reference: "reference, not ranked"/);
});

test('CR-303 impl-ui: ranking counts and Spearman n use the visible rows', () => {
  const src = read('components/JevCapabilityRanking.tsx');
  assert.match(src, /of \{filteredRows\.length\} systems qualify/);
  assert.doesNotMatch(src, /of \{rows\.length\} systems qualify/);
  assert.match(src, /systems\.filter\(\(row\) => visibleKeys\.has\(row\.key\)\)/);
  assert.match(src, /const pairedCount = paired\.length/);
});

test('CR-303 impl-ui: selected release tab has a dedicated readable colour pair', () => {
  assert.doesNotMatch(read('components/JevBenchReleaseVersionNav.tsx'), /text-white/);
  const css = read('app/globals.css');
  assert.match(css, /\.bh-release-tab-active \{ color: #0b1220; \}/);
  assert.match(css, /\[data-theme="light"\] \.bh-release-tab-active \{ color: #fff; \}/);
});

test('CR-303 impl-ui: cost chart last tick is end-anchored and the cap caption sits at the line foot', () => {
  const src = read('components/JevBubbleChart.tsx');
  assert.match(src, /textAnchor=\{x\(t\.v\) \+ t\.label\.length \* 3\.4 > W - 1 \? 'end' : 'middle'\}/);
  assert.match(src, /const sepLabelBaseY = H - B - 6;/);
});
