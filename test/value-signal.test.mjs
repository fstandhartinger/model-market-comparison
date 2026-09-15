import test from 'node:test';
import assert from 'node:assert/strict';
import { valueSignals, VALUE_MIN_ROWS } from '../lib/value-signal.mjs';

// Cost doubles every 10 score points, with a small deterministic wobble.
const line = (n = 12) => Array.from({ length: n }, (_, i) => ({ id: `m${i}`, score: 40 + i * 5, cost: 0.1 * 2 ** ((i * 5) / 10) * (1 + (i % 3 - 1) * 0.08) }));

test('CR-15.1: a model far below the cost its score predicts is cheap; far above is pricey; the rest stay unmarked', () => {
  const rows = line();
  rows[6] = { ...rows[6], cost: rows[6].cost / 5 };
  rows[9] = { ...rows[9], cost: rows[9].cost * 4 };
  const s = valueSignals(rows);
  assert.equal(s.get('m6')?.kind, 'cheap');
  assert.ok(s.get('m6').ratio > 3);
  assert.equal(s.get('m9')?.kind, 'pricey');
  assert.deepEqual([...s.keys()].sort(), ['m6', 'm9']);
});

test('CR-15.1: no marks on an orderly table, with too few rows, or without score spread; missing costs are ignored', () => {
  assert.equal(valueSignals(line()).size, 0);
  const few = line(VALUE_MIN_ROWS - 1); few[3] = { ...few[3], cost: few[3].cost / 10 };
  assert.equal(valueSignals(few).size, 0);
  assert.equal(valueSignals(line().map((r) => ({ ...r, score: 50 }))).size, 0);
  const holes = line(); holes.push({ id: 'free', score: 90, cost: 0 }, { id: 'none', score: 80, cost: null }, { id: 'unscored', score: null, cost: 1 });
  assert.equal(valueSignals(holes).size, 0);
});

// Deterministic log-uniform noise in [1/spread, spread] (small LCG), like real price scatter.
const noisy = (n, spread, seed = 7) => { let x = seed; return line(n).map((r) => { x = (x * 48271) % 2147483647; return { ...r, cost: r.cost * spread ** (2 * (x / 2147483647) - 1) }; }); };

test('CR-15.1: one extreme model does not tilt the robust line and flag its ordinary neighbours', () => {
  const rows = noisy(20, 1.5);
  assert.equal(valueSignals(rows).size, 0);
  rows[5] = { ...rows[5], cost: rows[5].cost / 12 };
  assert.deepEqual([...valueSignals(rows).keys()], ['m5']);
});

test('CR-15.1: in a widely scattered table the robust spread keeps flags rare', () => {
  const rows = noisy(40, 3.5);
  const naive = rows.filter((r, i) => Math.abs(Math.log(r.cost / line(40)[i].cost)) >= Math.log(2)).length;
  const flagged = valueSignals(rows).size;
  assert.ok(naive >= 10, `fixture really is wide (${naive} rows off by ≥2×)`);
  assert.ok(flagged <= naive / 3, `robust threshold flags ${flagged}, a plain ×2 rule would flag ${naive}`);
});
