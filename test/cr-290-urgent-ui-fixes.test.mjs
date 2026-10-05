import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCaps } from '../lib/jevbench-class-caps.mjs';
import { bubbleXDomain } from '../lib/jevbench-bubble-domain.mjs';
import { speedFromLatency } from '../lib/jevbench-jev-class.mjs';

// CR-290: /jev-models?costcap=none crashed with "RangeError: Invalid array length" because the Infinity cost limit
// entered the bubble chart's x domain and the tick array was built with an infinite length.
const ticks = ([lo, hi], kind) => kind === 'cost'
  ? Array.from({ length: Math.floor(hi) - Math.ceil(lo) + 1 }, (_, i) => Math.ceil(lo) + i)
  : Array.from({ length: Math.floor((hi - lo) / 10) + 1 }, (_, i) => lo + 10 * i);

test('every cap URL edge case yields a finite bubble domain and valid tick arrays', () => {
  const costs = [-2.1, -1.4, -0.3], speeds = [62, 75, 91];
  for (const query of ['costcap=none', 'latcap=none', 'costcap=none&latcap=none', 'costcap=1&latcap=1', 'costcap=10&latcap=10',
    'costcap=1x', 'costcap=10x', 'costcap=garbage&latcap=%F0%9F%98%80', 'costcap=Infinity', 'costcap=-1&latcap=0', 'latcap=1e999', '']) {
    const caps = parseCaps(new URLSearchParams(query));
    const refCost = 0.05, refLatency = 0.8;
    const costLimit = caps.costFactor === Infinity ? Infinity : refCost * caps.costFactor;
    const latencyCap = caps.latencyFactor === Infinity ? Infinity : refLatency * caps.latencyFactor;
    const latencyLimit = Number.isFinite(latencyCap) ? speedFromLatency(latencyCap) : null;
    for (const [kind, xs] of [['cost', costs], ['speed', speeds]]) {
      const domain = bubbleXDomain(kind, xs, costLimit, latencyLimit);
      assert.ok(domain.every(Number.isFinite), `${query} ${kind} ${domain}`);
      assert.doesNotThrow(() => ticks(domain, kind), query);
      assert.ok(ticks(domain, kind).length < 50, query);
    }
  }
});

test('an uncapped limit neither draws a line nor widens the domain', () => {
  assert.deepEqual(bubbleXDomain('cost', [-2, -1], Infinity, null), bubbleXDomain('cost', [-2, -1], 0, null));
  assert.deepEqual(bubbleXDomain('speed', [60, 90], 0, null), [50, 100]);
  assert.deepEqual(bubbleXDomain('cost', [], Infinity, null), [-3, 0]);
  const source = readFileSync(new URL('../components/JevBubbleChart.tsx', import.meta.url), 'utf8');
  assert.match(source, /Number\.isFinite\(latencyCap\) \? speedFromLatency\(latencyCap\) : null/);
  assert.match(source, /costLimit > 0 && Number\.isFinite\(costLimit\) \? x\(/);
});


// CR-290 items 1, 3, 4, 6, 7 (Florian 5 Oct 2026). Item 5 (one compare section) lives in cr-241-benchmark-page-layout.
import { baseModelFor } from '../lib/jev-base-model.mjs';
import { imageJevClassFor, imageJevBoardSystems } from '../lib/imagejev-board.mjs';

const src = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('publicly documented base models are cited; wity stays undisclosed at the author request', () => {
  for (const [key, label] of [['quyet-1-0-large', 'google/gemma-4-31B-it'], ['deck31b', 'google/gemma-4-31B-it'], ['torchcast-decision-12b', 'google/gemma-4-12B-it']]) {
    const entry = baseModelFor('jevbench', key);
    assert.equal(entry.status, 'disclosed', key);
    assert.equal(entry.label, label, key);
    assert.ok(entry.sources.every((s) => /^https:\/\//.test(s.url) && s.evidence), key);
  }
  for (const key of ['wity-1', 'wity-1-always', 'wity-1-off']) assert.equal(baseModelFor('jevbench', key).status, 'undisclosed', key);
  assert.equal(baseModelFor('imagejevbench', 'wity_1').status, 'undisclosed');
});

test('the two cap sliders sit in a wide grid whose labels never wrap', () => {
  const ranking = src('components/JevCapabilityRanking.tsx');
  assert.match(ranking, /grid max-w-4xl grid-cols-1[^"]*lg:grid-cols-2" data-bh-jev-cap-sliders/);
  assert.match(ranking, /whitespace-nowrap" data-bh-jev-cap-label/);
});

test('ImageJevBench uses the shared architecture axis and retains artifact classes', () => {
  const preview = JSON.parse(src('data/raw/benchmarks/jevbench/multimodal-preview/preview.json'));
  const systems = imageJevBoardSystems(preview);
  for (const row of systems) {
    assert.equal(row.class, preview.ranking.find((s) => s.key === row.key).class ?? '');
    assert.ok(src('lib/jevbench-architecture.mjs').includes(row.arch));
  }
  assert.equal(imageJevClassFor({ key: 'wity_1', kind: 'api', api_flag: true }), 'closed-api');
  assert.equal(imageJevClassFor({ key: 'gpt6_luna', kind: 'api', api_flag: true }), 'closed-api');
  assert.match(src('components/jevTypes.ts'), /JEV_ARCH_CLASSES/);
});

test('radars leave missing spokes as gaps marked n/a and never bridge or zero them', () => {
  const radar = src('components/JevRadars.tsx'), compare = src('components/JevCompareV15.tsx');
  assert.match(radar, /const complete = pts\.length === spokes\.length;/);
  assert.match(radar, /complete\s*\? <polygon/);
  assert.match(radar, /"n\/a"/);
  assert.match(compare, /values: pair\.map\(\(r\) => r\.axes\?\.\[k\] \?\? null\)/);
  assert.match(compare, /Gaps, not zeros/);
});

test('the language table draws no all-empty column and names the hidden languages', () => {
  const board = src('components/JevBenchV16Board.tsx');
  assert.match(board, /const langs = allLangs\.filter\(shown\);/);
  assert.match(board, /data-bh-jev16-language-hidden/);
  assert.match(board, /Per-language coverage grows with the expanded uc1\.1 multilingual pool/);
});
