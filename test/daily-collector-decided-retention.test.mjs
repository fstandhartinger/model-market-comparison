// CR-717 (9 Nov 2026): a collector whose failure Florian already decided (fetch-aa, card 19348 "Keep" through
// 6 Dec) is neither handed off nor carded while the window runs; other collectors and the day after the window are.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planNotifications, decidedCollectorRetention, COLLECTOR_DECIDED_RETENTION } from '../ops/daily/policy.mjs';
import { AA_RETENTION_FIRST_DAY, AA_RETENTION_LAST_DAY } from '../lib/aa-legacy-api.mjs';

const stale = (id, days, failingSince = '2026-11-05') => ({ id, kind: 'collector', last_ok: '2026-11-04', failing_since: failingSince, reason: 'AA_LEGACY_API_RETIRED (HTTP 410)', stale_days: days });
const plan = (day, list) => planNotifications({ status_ok: true, stale_sources: list, now: Date.parse(`${day}T07:20:00Z`) });
const collectorKinds = (p) => p.sends.filter((s) => s.kind.startsWith('collector')).map((s) => s.kind);

test('the fetch-aa window is the CR-705 window and nothing else is exempt', () => {
  assert.deepEqual(COLLECTOR_DECIDED_RETENTION.map((w) => [w.id, w.first_day, w.last_day]), [['fetch-aa', AA_RETENTION_FIRST_DAY, AA_RETENTION_LAST_DAY]]);
  assert.equal(AA_RETENTION_LAST_DAY, '2026-12-06');
  assert.equal(decidedCollectorRetention('fetch-aa', '2026-11-04'), null);
  assert.ok(decidedCollectorRetention('fetch-aa', '2026-11-11'));
  assert.ok(decidedCollectorRetention('fetch-aa', '2026-12-06'));
  assert.equal(decidedCollectorRetention('fetch-aa', '2026-12-07'), null);
  assert.equal(decidedCollectorRetention('fetch-inceptron-catalog', '2026-11-11'), null);
});

test('inside the window fetch-aa gets no day-7 card and no handoff; other collectors still do', () => {
  const p = plan('2026-11-11', [stale('fetch-aa', 7), stale('fetch-inceptron-catalog', 7), stale('fetch-t-systems-catalog', 5, '2026-11-06')]);
  const card = p.sends.find((s) => s.kind === 'collector-stale');
  const handoff = p.sends.find((s) => s.kind === 'collector-handoff');
  assert.equal(card.key, 'collector-stale:fetch-inceptron-catalog@2026-11-05');
  assert.doesNotMatch(card.text, /fetch-aa\b/);
  assert.equal(handoff.key, 'collector-handoff:fetch-t-systems-catalog@2026-11-06');
  assert.ok(p.skips.some((s) => s.kind === 'collector-retained' && s.key === 'collector-retained:fetch-aa' && /2026-12-06/.test(s.reason)));
  assert.deepEqual(collectorKinds(plan('2026-11-08', [stale('fetch-aa', 4)])), [], 'no day-3..6 handoff either');
});

test('after the last window day fetch-aa is carded again as usual', () => {
  assert.deepEqual(collectorKinds(plan('2026-12-07', [stale('fetch-aa', 33)])), ['collector-stale']);
  assert.deepEqual(collectorKinds(plan('2026-11-04', [stale('fetch-other', 3)])), ['collector-handoff']);
});
