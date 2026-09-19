// CR-92: JevBench v1.2 final — every axis recomputes from its published inputs, every score from its axes (geometric mean),
// the speed note calls the latency adjustment an assumption, one open-alternative-jev row, no automatic cost of 100.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JEVBENCH_V12_ARTIFACT, JEVBENCH_V12_SHA256, readJevbenchV12, validateJevbenchV12, jevbenchV12View, geometric, speedScore, costScore, adjustedLatency } from '../lib/jevbench-v12.mjs';
import { PRESETS, DEFAULT_WEIGHTS, parseParams, toParam, rerank, describe, isDefault } from '../lib/jevbench-v12-weights.mjs';

const clone = async () => JSON.parse(await readFile(JEVBENCH_V12_ARTIFACT, 'utf8'));

test('the committed v1.2 artifact is the tagged public one and validates; the Score Lab top of the ranking', async () => {
  const d = await readJevbenchV12();
  assert.equal(d.sha256, JEVBENCH_V12_SHA256);
  const v = jevbenchV12View(d);
  const top = v.ranked.slice(0, 12).map((r) => [r.key, Number(r.main.toFixed(1))]);
  assert.deepEqual(top, [['jev-1.13.0', 75.3], ['semif-qwen3.5-4b', 74.6], ['open-alternative-jev', 69.8], ['system-one-open', 68.7], ['openjev-razorback16', 67.6],
    ['openjev-sglang', 66.2], ['gpt-5.6-luna', 66.0], ['open-jev-deberta-v3-large', 64.4], ['nimble-9b', 63.5], ['gemini-3.1-flash-lite', 60.8], ['deepseek-flash', 58.1], ['system-one-sg', 56.5]]);
  assert.equal(v.ranked.filter((r) => r.key.startsWith('open-alternative-jev')).length, 1);
  assert.equal(v.ranked.find((r) => r.key === 'open-alternative-jev').display, 'open-alternative-jev (Qwen3.5-4B, IkerMoel)');
  assert.ok(v.partial.length === 3 && v.partial.every((r) => r.rank === null));
  const tools = v.partial.find((r) => r.key === 'needle-3-tools');
  assert.ok(tools.usd > 0.016 && tools.usd < 0.0165 && tools.axes.cost < 100 && tools.costKind === 'estimate');
  assert.match(v.speedNote, /assumption/);
});

test('scales and the latency adjustment', () => {
  assert.equal(adjustedLatency(0.5, 'api'), 0.5);
  assert.ok(Math.abs(adjustedLatency(0.5, 'demo') - 1) < 1e-12 && Math.abs(adjustedLatency(0.5, 'gpu') - 1.15) < 1e-12);
  assert.ok(Math.abs(speedScore(1, 1, 'api') - 80) < 1e-9 && Math.abs(costScore(0.01) - 70) < 1e-9);
  assert.ok(Math.abs(geometric({ intelligence: 90, calibration: 90, speed: 90, cost: 10 }, DEFAULT_WEIGHTS) - Math.exp((3 * Math.log(90) + Math.log(10)) / 4)) < 1e-9);
});

test('a score or axis that does not recompute, a missing price or a re-ordered rank fails', async () => {
  let a = await clone(); a.systems[0].jevbench_score += 0.1;
  assert.throws(() => validateJevbenchV12(a), /does not recompute/);
  a = await clone(); a.systems[1].axes.speed += 1;
  assert.throws(() => validateJevbenchV12(a), /speed does not recompute/);
  a = await clone(); a.systems.at(-1).cost.usd_per_1000 = null;
  assert.throws(() => validateJevbenchV12(a), /cost/);
  a = await clone(); [a.systems[0].rank, a.systems[1].rank] = [2, 1];
  assert.throws(() => validateJevbenchV12(a), /rank/);
  a = await clone(); a.speed_note = 'adjusted';
  assert.throws(() => validateJevbenchV12(a), /assumption/);
  a = await clone(); a.systems[0].predictions = [];
  assert.throws(() => validateJevbenchV12(a), /item-level/);
});

test('presets recompute to the published views; URL weights round-trip; the default is the JevBench Score', async () => {
  const v = jevbenchV12View(await readJevbenchV12());
  for (const p of PRESETS) {
    const { ranked } = rerank(v.ranked, v.partial, p.w);
    for (const r of ranked) { assert.ok(Math.abs(r.score - r.presets[p.artifactKey]) < 1e-9, `${p.id} ${r.key}`); assert.equal(r.rank, r.rankUnder[p.artifactKey]); }
  }
  assert.ok(isDefault(parseParams('')) && describe(DEFAULT_WEIGHTS).official);
  assert.equal(toParam(DEFAULT_WEIGHTS), null);
  const acc = PRESETS.find((p) => p.id === 'accuracy').w;
  assert.equal(toParam(acc), '60-0-20-20');
  assert.deepEqual(parseParams('w=60-0-20-20'), acc);
  assert.ok(!describe(acc).official);
  assert.ok(isDefault(parseParams('w=-10-20-20-20')) && isDefault(parseParams('w=10-20-20')));
});

test('Jev chart names wrap on phones and only truncate at the desktop breakpoint', async () => {
  const source = await readFile(new URL('../components/JevModelsV12.tsx', import.meta.url), 'utf8');
  assert.match(source, /min-w-0 md:truncate sm:col-start-2/);
  assert.doesNotMatch(source, /min-w-0 truncate sm:col-start-2/);
});

// Fable pass 24 (2026-09-19): the Jev page's presentational rules, checked at the source so a refactor cannot undo them silently.
test('Jev page pass-24 rules: no stretched presets, wrapping I/C/S/K line on phones, $ per 1,000 before the tiers, one one-liner', async () => {
  const cmp = await readFile(new URL('../components/JevModelsV12.tsx', import.meta.url), 'utf8');
  const page = await readFile(new URL('../app/jev-models/page.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(cmp, /grid-cols-2 gap-2 lg:grid-cols-6 lg:items-start/, 'F-126: preset buttons must not stretch to the open Custom panel');
  assert.match(cmp, /row-start-3 mt-0\.5 min-w-0 font-mono text-\[10\.5px\] sm:whitespace-nowrap/, 'F-127: the axis line wraps below sm');
  assert.doesNotMatch(cmp, /row-start-3 mt-0\.5 whitespace-nowrap/, 'F-127');
  assert.ok(cmp.indexOf('<H c="usd" label="$ per 1,000"') < cmp.indexOf('{TIER_ORDER.map((t) => <H key={t}'), 'F-129: $ per 1,000 sits right after the axes');
  assert.match(cmp, /sub="official" hero/, 'F-129: a one-word header sub');
  assert.match(cmp, /cfg !== r\.author/, 'F-130: the config line is not the author repeated');
  assert.match(cmp, /"openjev-razorback16" \? "OpenJev \(razorback16\)"/, 'F-133');
  assert.doesNotMatch(page, /data-bh-jev12-score-line/, 'F-132: the one-liner lives in the chart only');
  assert.ok(page.indexOf('data-bh-jev-revision') > page.indexOf('id="method"'), 'F-132: the revision note sits in Method and tiers');
  assert.doesNotMatch(page, /' \(options as tools\)'/, 'F-131');
  assert.match(css, /\.bh-jev11-partial > \.bh-jev-sticky \{ opacity: 1;/, 'F-128');
});
