import test from 'node:test';
import assert from 'node:assert/strict';
import { capShortlist } from '../lib/shortlist.mjs';

const row = (id, cost, score) => ({ id, cost, score });

test('no cap or fewer rows than the cap: everything stays', () => {
  const rows = [row('a', 1, 90), row('b', 2, 80)];
  assert.deepEqual([...capShortlist(rows, undefined)], ['a', 'b']);
  assert.deepEqual([...capShortlist(rows, 15)], ['a', 'b']);
});

test('the cheapest passing model stays even though it has the lowest score', () => {
  // Guided with every question skipped (2026-09-14): 16 pass, cap 15. The old rule kept the
  // 15 most expensive and dropped GLM-5.3-Flash — the cheapest model and a Pareto member.
  const rows = [
    row('flash', 0.198, 79.9), row('next', 0.388, 79.8), row('ds', 0.867, 79.7), row('glm', 0.955, 90.6),
    row('g38', 1.10, 80.2), row('g37', 1.13, 78.8), row('grok', 1.88, 89.1), row('kimi', 2.09, 91.7),
    row('terra', 2.09, 80.0), row('sol', 2.32, 81.9), row('qwen', 3.27, 79.8), row('sonnet', 3.47, 82.7),
    row('astra', 3.54, 97.7), row('opus', 6.86, 95.6), row('f51', 14.17, 99.4), row('f5', 24.06, 93.8),
  ];
  const keep = capShortlist(rows, 15);
  assert.equal(keep.size, 15);
  assert.ok(keep.has('flash'), 'cheapest model (Pareto) is kept');
  for (const id of ['glm', 'kimi', 'astra', 'f51']) assert.ok(keep.has(id), `${id} is on the Pareto line`);
  assert.ok(!keep.has('g37'), 'the dropped model is the lowest score off the line');
});

test('the Pareto line is kept before higher-scoring dominated models', () => {
  const rows = [row('cheap', 0.1, 70), row('mid', 1, 85), row('top', 10, 99), row('dom1', 5, 84), row('dom2', 6, 83)];
  const keep = capShortlist(rows, 3);
  assert.deepEqual([...keep].sort(), ['cheap', 'mid', 'top']);
});

test('unpriced or unscored rows never displace scored ones', () => {
  const rows = [row('nop', null, 95), row('nos', 1, null), row('a', 1, 80), row('b', 2, 85)];
  const keep = capShortlist(rows, 2);
  assert.deepEqual([...keep].sort(), ['a', 'b']);
});
