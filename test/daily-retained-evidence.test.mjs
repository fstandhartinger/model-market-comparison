import test from 'node:test';
import assert from 'node:assert/strict';
import { assertRetainedDate, assertRetainedCache } from '../ops/daily/review-live.mjs';

test('retained dates cannot claim the current run or a future measurement', () => {
  const start = '2026-01-02T12:00:00Z';
  assert.doesNotThrow(() => assertRetainedDate('2026-01-01T12:00:00Z', start, 'synthetic'));
  for (const date of [null, 'invalid', start, '2026-01-03T12:00:00Z']) assert.throws(() => assertRetainedDate(date, start, 'synthetic'));
});

test('retained measured cache requires marker, original date and exact prior values', () => {
  const start = '2026-01-02T12:00:00Z';
  const previous = { summary: 0, provenance: { collected_at: '2026-01-01T12:00:00Z', url: 'https://example.test/fixture' } };
  const kept = { ...previous, retained_after_failure: true };
  assert.doesNotThrow(() => assertRetainedCache(kept, previous, start, true));
  for (const cache of [previous, { retained_after_failure: true }, { ...kept, summary: 0.8 }, { ...kept, provenance: { ...previous.provenance, collected_at: start } }]) assert.throws(() => assertRetainedCache(cache, previous, start, true));
  // A first failed cache request has no retained statistic to misrepresent.
  assert.doesNotThrow(() => assertRetainedCache({ status: 'fetch_or_parse_failed' }, null, start, false));
});
