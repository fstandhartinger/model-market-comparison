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

import { radarWindow, windowRadius, RADAR_WINDOW_MAX_FLOOR } from '../lib/radar.mjs';
test('CR-19.2: the pair window drops the empty centre, labels its rings honestly and keeps half the scale', () => {
  // Fable 5.1 vs GPT-6 Astra style positions: all between 55 and 100.
  const w = radarWindow([57, 59, 75, 76, 88, 90, 98, 100]);
  assert.equal(w.floor, 45);
  assert.deepEqual(w.rings, [58.8, 72.5, 86.3, 100]);
  assert.equal(windowRadius(45, w), 0);
  assert.equal(windowRadius(100, w), 1);
  assert.ok(windowRadius(59, w) - windowRadius(57, w) > (59 - 57) / 100, 'a 2-point gap is drawn larger than on the full scale');
  assert.equal(radarWindow([95, 99]).floor, RADAR_WINDOW_MAX_FLOOR, 'never zooms past half the scale');
  assert.equal(radarWindow([4, 90]).floor, 0, 'a weak axis keeps the full scale, no misleading zero');
  assert.deepEqual(radarWindow([]), { floor: 0, rings: [25, 50, 75, 100] }, 'no values: full scale');
  assert.equal(windowRadius(null, w), null, 'missing stays missing');
  assert.equal(windowRadius(30, w), 0, 'below the floor sits at the centre, never negative');
});
