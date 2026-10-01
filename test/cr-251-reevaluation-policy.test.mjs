import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BENCHMARKS, currentRows, planReevaluation, readLedger, readPolicy, renderPlan } from '../lib/reevaluation-policy.mjs';

const policy = { top_n: 10, rank_basis: 'composite', slow_cadence: { every_nth_refresh: 3, max_age_days: 30 } };
const rows = Array.from({ length: 14 }, (_, i) => ({ key: `m${i + 1}`, name: `Model ${i + 1}`, rank: i + 1 }));
const ledgerAt = (index, date = '2026-09-29', counter = index) => ({
  bench: Object.fromEntries(rows.map((r) => [r.key, { release: 'v1', date, refreshIndex: index }])),
  refreshCounter: { bench: counter },
});
const plan = (over = {}) => planReevaluation({ benchmark: 'bench', releaseKind: 'refresh', releaseLabel: 'v2', releaseDate: '2026-10-01', rows, ledger: ledgerAt(0), policy, ...over });
const keys = (list) => list.map((r) => r.key);

test('top 10 are always re-measured on a refresh', () => {
  const p = plan();
  assert.deepEqual(keys(p.remeasure), rows.slice(0, 10).map((r) => r.key));
  assert.ok(p.remeasure.every((r) => r.reason === 'top_n'));
  assert.equal(p.carryForward.length, 4);
});

test('rank 11 is carried on refresh 1 and 2 and due on the 3rd', () => {
  let ledger = ledgerAt(0);
  const seen = [];
  for (const [n, date] of [[1, '2026-10-01'], [2, '2026-10-02'], [3, '2026-10-03']]) {
    const p = plan({ ledger, releaseLabel: `r${n}`, releaseDate: date });
    seen.push(keys(p.remeasure).includes('m11'));
    if (n === 3) assert.equal(p.remeasure.find((r) => r.key === 'm11').reason, 'slow_cadence_nth_refresh');
    ledger = p.ledgerUpdate;
  }
  assert.deepEqual(seen, [false, false, true]);
  // After being measured on refresh 3 it is carried again.
  assert.equal(keys(plan({ ledger, releaseDate: '2026-10-04' }).remeasure).includes('m11'), false);
});

test('a row older than 30 days is due even on refresh 1', () => {
  const ledger = ledgerAt(0, '2026-08-31');          // 31 days before 2026-10-01
  const p = plan({ ledger });
  assert.equal(p.remeasure.find((r) => r.key === 'm12').reason, 'slow_cadence_max_age');
  assert.equal(keys(plan({ ledger: ledgerAt(0, '2026-09-02') }).remeasure).includes('m12'), false); // 29 days
});

test('method_change re-measures every row and resets the cadence', () => {
  const p = plan({ releaseKind: 'method_change' });
  assert.equal(p.remeasure.length, 14);
  assert.ok(p.remeasure.every((r) => r.reason === 'method_change'));
  assert.equal(p.carryForward.length, 0);
  assert.equal(p.ledgerUpdate.bench.m14.refreshIndex, 1);
});

test('addendum measures nothing but paid and new entrants, and leaves the counter alone', () => {
  const none = plan({ releaseKind: 'addendum' });
  assert.equal(none.remeasure.length, 0);
  assert.equal(none.ledgerUpdate.refreshCounter.bench, 0);
  const p = plan({ releaseKind: 'addendum', paidKeys: ['m13'], newQueue: [{ key: 'n1', name: 'New', queued_at: '2026-09-30T10:00:00Z' }] });
  assert.deepEqual(keys(p.remeasure), ['m13']);
  assert.equal(p.remeasure[0].reason, 'paid_fast_lane');
  assert.deepEqual(keys(p.newEntrants), ['n1']);
});

test('paid rows are re-measured in a refresh even if they would be carried', () => {
  const p = plan({ paidKeys: ['m14'] });
  assert.equal(p.remeasure.find((r) => r.key === 'm14').reason, 'paid_fast_lane');
});

test('new entrants: fast lane first, then FIFO', () => {
  const p = plan({ newQueue: [
    { ref: 'aaaa0001', name: 'A', queued_at: '2026-09-30T09:00:00Z' },
    { ref: 'bbbb0002', name: 'B', queued_at: '2026-09-29T09:00:00Z' },
    { ref: 'cccc0003', name: 'C', queued_at: '2026-10-01T00:00:00Z', fast_lane: true },
    { ref: 'dddd0004', name: 'D', queued_at: '2026-09-28T00:00:00Z', fast_lane: true },
  ] });
  assert.deepEqual(keys(p.newEntrants), ['dddd0004', 'cccc0003', 'bbbb0002', 'aaaa0001']);
  assert.deepEqual(p.newEntrants.map((q) => q.position), [1, 2, 3, 4]);
});

test('never-measured rows are measured', () => {
  const ledger = ledgerAt(0); delete ledger.bench.m13;
  assert.equal(plan({ ledger }).remeasure.find((r) => r.key === 'm13').reason, 'never_measured');
});

test('ledger update marks measured rows and new entrants, keeps carried rows, does not mutate its input', () => {
  const ledger = ledgerAt(0);
  const before = JSON.stringify(ledger);
  const p = plan({ ledger, newQueue: [{ key: 'n1', name: 'New', queued_at: '2026-09-30T00:00:00Z' }] });
  assert.equal(JSON.stringify(ledger), before);
  assert.deepEqual(p.ledgerUpdate.bench.m1, { release: 'v2', date: '2026-10-01', refreshIndex: 1 });
  assert.deepEqual(p.ledgerUpdate.bench.n1, { release: 'v2', date: '2026-10-01', refreshIndex: 1 });
  assert.deepEqual(p.ledgerUpdate.bench.m12, { release: 'v1', date: '2026-09-29', refreshIndex: 0 });
  assert.equal(p.ledgerUpdate.refreshCounter.bench, 1);
  assert.deepEqual(p.carryForward.find((c) => c.key === 'm12').lastMeasured, { release: 'v1', date: '2026-09-29' });
  assert.match(renderPlan(p), /Carry forward/);
});

test('invalid input is rejected', () => {
  assert.throws(() => plan({ releaseKind: 'nope' }), RangeError);
  assert.throws(() => plan({ releaseDate: '10/01/2026' }), TypeError);
  assert.throws(() => plan({ policy: { top_n: 0, slow_cadence: {} } }), TypeError);
});

test('real data: every benchmark plans with exactly min(10, n) top_n rows and a seeded ledger', async () => {
  const pol = await readPolicy();
  assert.equal(pol.top_n, 10);
  const ledger = await readLedger();
  for (const benchmark of BENCHMARKS) {
    const { rows: live } = await currentRows(benchmark);
    assert.ok(live.length > 0, benchmark);
    assert.equal(Object.keys(ledger[benchmark] ?? {}).length, live.length, `${benchmark} ledger is seeded`);
    const p = planReevaluation({ benchmark, releaseKind: 'refresh', releaseLabel: 'next', releaseDate: '2026-10-02', rows: live, ledger, policy: pol });
    assert.equal(p.remeasure.filter((r) => r.reason === 'top_n').length, Math.min(10, live.length), benchmark);
    assert.equal(p.remeasure.length + p.carryForward.length, live.length);
  }
});

test('policy file is the binding lead decision', async () => {
  const raw = JSON.parse(await readFile(new URL('../data/reevaluation-policy.json', import.meta.url), 'utf8'));
  assert.equal(raw.rank_basis, 'composite');
  assert.deepEqual(raw.slow_cadence, { every_nth_refresh: 3, max_age_days: 30 });
  assert.deepEqual(Object.keys(raw.release_kinds), ['addendum', 'refresh', 'method_change']);
});
