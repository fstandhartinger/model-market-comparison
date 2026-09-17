import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapWithConcurrency, dailyConcurrency, firstRejection,
  DEFAULT_DAILY_CONCURRENCY, MAX_DAILY_CONCURRENCY,
} from '../ops/daily/concurrency.mjs';

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

test('CR-73.3: results keep input order however the units finish', async () => {
  const items = [40, 5, 30, 1, 20, 0, 10];
  const finished = [];
  const settled = await mapWithConcurrency(items, async (ms, index) => {
    await sleep(ms);
    finished.push(index);
    return `unit-${index}`;
  }, { limit: 4 });
  assert.deepEqual(settled.map((r) => r.value), items.map((_, i) => `unit-${i}`));
  assert.notDeepEqual(finished, [...finished].sort((a, b) => a - b), 'the fixture must actually finish out of order');
});

test('CR-73.3: never more than the limit in flight, and no unbounded queue', async () => {
  let inFlight = 0, peak = 0, started = 0;
  await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), async () => {
    started++; inFlight++; peak = Math.max(peak, inFlight);
    await sleep(5);
    inFlight--;
  }, { limit: 3 });
  assert.equal(peak, 3);
  assert.equal(started, 20);
});

test('CR-73.3: limit 1 is exactly the sequential behaviour it replaces', async () => {
  const order = [];
  const settled = await mapWithConcurrency([30, 20, 10], async (ms, index) => {
    order.push(`start-${index}`);
    await sleep(ms);
    order.push(`end-${index}`);
    return index;
  }, { limit: 1 });
  assert.deepEqual(order, ['start-0', 'end-0', 'start-1', 'end-1', 'start-2', 'end-2']);
  assert.deepEqual(settled.map((r) => r.value), [0, 1, 2]);
});

test('CR-73.3: one failing unit spends only its own budget; siblings still run', async () => {
  const done = [];
  const settled = await mapWithConcurrency(['ok', 'boom', 'ok', 'boom', 'ok'], async (kind, index) => {
    await sleep(index === 1 ? 20 : 2);
    if (kind === 'boom') throw new Error(`worker ${index} timed out`);
    done.push(index);
    return index;
  }, { limit: 2 });
  assert.deepEqual(done.sort(), [0, 2, 4]);
  assert.deepEqual(settled.map((r) => r.status), ['fulfilled', 'rejected', 'fulfilled', 'rejected', 'fulfilled']);
  assert.equal(settled[1].reason.message, 'worker 1 timed out');
  assert.equal(firstRejection(settled).message, 'worker 1 timed out');
  assert.equal(firstRejection(settled.filter((r) => r.status === 'fulfilled')), null);
});

test('CR-73.3: a slow unit does not stall unrelated verified units', async () => {
  const finishedAt = new Map();
  const start = Date.now();
  await mapWithConcurrency([300, 5, 5, 5], async (ms, index) => {
    await sleep(ms);
    finishedAt.set(index, Date.now() - start);
  }, { limit: 4 });
  for (const index of [1, 2, 3]) assert.ok(finishedAt.get(index) < finishedAt.get(0), `unit ${index} waited for the slow unit`);
});

test('CR-73.3: settled side effects are serialised and never fail a unit', async () => {
  let overlapping = 0, peak = 0;
  const seen = [];
  const settled = await mapWithConcurrency([30, 5, 20, 1], async (ms, index) => { await sleep(ms); return index; }, {
    limit: 4,
    onSettled: async (index) => {
      overlapping++; peak = Math.max(peak, overlapping);
      await sleep(3);
      seen.push(index);
      overlapping--;
      if (index === 2) throw new Error('progress file unavailable');
    },
  });
  assert.equal(peak, 1, 'two units must never write progress at the same time');
  assert.deepEqual(seen.sort(), [0, 1, 2, 3]);
  assert.deepEqual(settled.map((r) => r.status), ['fulfilled', 'fulfilled', 'fulfilled', 'fulfilled']);
});

test('CR-73.3: an empty unit list is a no-op', async () => {
  let calls = 0;
  assert.deepEqual(await mapWithConcurrency([], async () => { calls++; }, { limit: 4 }), []);
  assert.equal(calls, 0);
});

test('CR-73.3: an unusable limit fails closed instead of guessing', async () => {
  for (const limit of [0, -1, 2.5, MAX_DAILY_CONCURRENCY + 1, '4', NaN]) {
    await assert.rejects(() => mapWithConcurrency([1], async (x) => x, { limit }), /limit must be an integer from 1 to 8/);
  }
  await assert.rejects(() => mapWithConcurrency([1], null, { limit: 1 }), /requires a worker function/);
});

test('CR-73.3: BH_DAILY_CONCURRENCY is read strictly, and defaults to 4', () => {
  assert.equal(DEFAULT_DAILY_CONCURRENCY, 4);
  assert.equal(dailyConcurrency({}), DEFAULT_DAILY_CONCURRENCY);
  assert.equal(dailyConcurrency({ BH_DAILY_CONCURRENCY: '' }), DEFAULT_DAILY_CONCURRENCY);
  assert.equal(dailyConcurrency({ BH_DAILY_CONCURRENCY: '1' }), 1);
  assert.equal(dailyConcurrency({ BH_DAILY_CONCURRENCY: '8' }), 8);
  for (const value of ['0', '9', 'four', '2.5', '-3'])
    assert.throws(() => dailyConcurrency({ BH_DAILY_CONCURRENCY: value }), /BH_DAILY_CONCURRENCY must be an integer from 1 to 8/);
});
