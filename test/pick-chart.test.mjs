import test from 'node:test';
import assert from 'node:assert/strict';
import { pickChart, logTicks, scoreTicks, logPosition, sliderToCost, costToSlider, toggleColumn, nearestHitId, SLIDER_MAX } from '../lib/pick-chart.mjs';

const m = (id, score, cost) => ({ id, scores: { composite: score }, cost });

test('CR-2.2 chart: unscored models are not candidates, unpriced ones are counted but never plotted', () => {
  const c = pickChart([m('a', 90, 2), m('b', 80, 0.2), m('c', null, 1), m('d', 70, null)], 'composite');
  assert.deepEqual(c.points.map((p) => p.id), ['a', 'b']);
  assert.equal(c.unpriced, 1);
  assert.deepEqual(pickChart([m('x', 50, null)], 'composite').points, []);
});

test('CR-2.2 chart: sliders decide which points pass; the frontier uses passing points only', () => {
  const c = [m('cheap', 70, 0.1), m('mid', 85, 1), m('best', 95, 10), m('dominated', 80, 5)];
  assert.deepEqual(pickChart(c, 'composite').frontier, ['cheap', 'mid', 'best']);
  const floor = pickChart(c, 'composite', { minScore: 80 });
  assert.deepEqual(floor.points.filter((p) => p.pass).map((p) => p.id), ['mid', 'best', 'dominated']);
  assert.deepEqual(floor.frontier, ['mid', 'best']);
  const cap = pickChart(c, 'composite', { maxCost: 1 });
  assert.deepEqual(cap.frontier, ['cheap', 'mid']);
});

test('CR-2.2 chart: a free route is pinned at the left edge, not dropped from the log axis', () => {
  const c = pickChart([m('free', 60, 0), m('paid', 90, 3)], 'composite');
  const free = c.points.find((p) => p.id === 'free');
  assert.equal(free.free, true);
  assert.equal(free.x, c.xDomain[0]);
  assert.equal(logPosition(free.x, c.xDomain), 0);
});

test('CR-2.2 ticks: round log ticks inside the domain, round score ticks covering the data', () => {
  assert.deepEqual(logTicks(0.08, 40), [0.1, 0.3, 1, 3, 10, 30]);
  assert.deepEqual(scoreTicks(61.2, 99.4), { domain: [60, 100], ticks: [60, 70, 80, 90, 100] });
  assert.deepEqual(scoreTicks(81, 94).ticks, [80, 85, 90, 95]);
  assert.equal(scoreTicks(1210, 1480).ticks[0], 1200);
  assert.deepEqual(scoreTicks(50, 50).domain, [50, 55]);
});

test('CR-2.2 cost slider: log mapping round-trips, the top end is "no limit"', () => {
  const range = [0.1, 100];
  assert.equal(sliderToCost(SLIDER_MAX, range), null);
  assert.equal(costToSlider(null, range), SLIDER_MAX);
  assert.equal(sliderToCost(0, range), 0.1);
  assert.equal(sliderToCost(500, range), 3.16);
  assert.equal(costToSlider(3.16, range), 500);
});

test('CR-2.2 toggleColumn: add, remove, never below one column, null when full', () => {
  assert.deepEqual(toggleColumn(['a', 'b'], 'c', 10), ['a', 'b', 'c']);
  assert.deepEqual(toggleColumn(['a', 'b'], 'a', 10), ['b']);
  assert.deepEqual(toggleColumn(['a'], 'a', 10), ['a']);
  assert.equal(toggleColumn(['a', 'b'], 'c', 2), null);
});

test('CR-2.2 tap resolution: among overlapping hit areas the nearest centre wins', () => {
  const pts = [{ id: 'kimi', x: 226, y: 857 }, { id: 'sol', x: 226, y: 865 }];
  // Tap exactly on the weaker point's centre (behind the stronger one in paint order).
  assert.equal(nearestHitId(pts, { x: 226, y: 865 }, 14), 'sol');
  // Tap exactly on the stronger one's centre.
  assert.equal(nearestHitId(pts, { x: 226, y: 857 }, 14), 'kimi');
  // A tie keeps the first point encountered (deterministic).
  assert.equal(nearestHitId([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 0, y: 0 }], { x: 0, y: 0 }, 14), 'a');
  // Outside every hit area nothing resolves.
  assert.equal(nearestHitId(pts, { x: 226, y: 900 }, 14), null);
  // Empty list resolves to null.
  assert.equal(nearestHitId([], { x: 0, y: 0 }, 14), null);
});
