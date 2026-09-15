import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RADAR_FAMILIES, formatRadarValue } from '../lib/radar.mjs';
import { percentileFor, PERCENTILE_MIN_FAMILIES } from '../lib/benchmax.mjs';

test('CR-19.3: default compare radar uses DesignArena Full-Stack, not Frontend, and no duplicate DesignArena axis', () => {
  assert.ok(DEFAULT_RADAR_FAMILIES.includes('fullstack'));
  assert.ok(!DEFAULT_RADAR_FAMILIES.includes('frontend'));
  assert.equal(new Set(DEFAULT_RADAR_FAMILIES).size, DEFAULT_RADAR_FAMILIES.length);
});

const axis = (scores) => ({ id: 'aa-coding-agent-index::1.4@@Muse Code 1.0.2 RC@@fraction', unit: 'fraction', higherBetter: true,
  scores: scores.map(([modelId, value]) => ({ modelId, value, date: '2026-09-09', basis: 'measured' })) });

test('CR-22.1: two variants of one model are no cohort — no percentile, so no fake 0 on the radar', () => {
  assert.equal(PERCENTILE_MIN_FAMILIES, 3);
  const twoVariants = axis([['muse-spark-1.3::max', 0.6797281481220127], ['muse-spark-1.3::xhigh', 0.641775036414302]]);
  assert.equal(percentileFor(twoVariants, 'muse-spark-1.3::xhigh'), null);
  assert.equal(percentileFor(twoVariants, 'muse-spark-1.3::max'), null);
  const cohort = axis([['muse-spark-1.3::xhigh', 0.64], ['gpt-6-astra::high', 0.7], ['claude-fable-5.1::high', 0.5]]);
  assert.equal(percentileFor(cohort, 'muse-spark-1.3::xhigh'), 50);
});

test('CR-22.1: the report tooltip formats a raw fraction instead of printing 15 digits', () => {
  assert.equal(formatRadarValue(0.641775036414302, 'fraction'), '64.2%');
});
