import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { JEVBENCH_ARTIFACT, JEVBENCH_SHA256, jevbenchView, validateJevbench } from '../lib/jevbench.mjs';

// CR-84.1 (2026-09-19): JevBench v1 is Benchmark Heaven's own measurement. The committed artifact is the only
// source of the /jev-models page; mutations below are synthetic failure probes, never results.
const raw = readFileSync(JEVBENCH_ARTIFACT);
const artifact = () => JSON.parse(raw.toString('utf8'));

test('JevBench artifact is the pinned publication-safe file and its view keeps the published numbers', () => {
  assert.equal(createHash('sha256').update(raw).digest('hex'), JEVBENCH_SHA256);
  const v = jevbenchView(artifact());
  assert.deepEqual(v.ranked.map((r) => r.key).sort(), ['deepseek-flash', 'gemini-3.1-flash-lite', 'gpt-5.6-luna', 'jev-1.13.0', 'open-jev-deberta-v3-large', 'openjev-sglang', 'system-one-open']);
  assert.deepEqual(v.partial.map((r) => [r.key, r.nAttempted]), [['qwen3.8-27b', 223]]);
  assert.deepEqual(v.tooShort.map((r) => [r.key, r.nAttempted]), [['open-alternative-jev', 6]]);
  const jev = v.ranked.find((r) => r.key === 'jev-1.13.0');
  assert.equal(jev.accuracy, 0.96281); assert.equal(jev.cost, 0.027433); assert.equal(jev.probability, 'native');
  const luna = v.ranked.find((r) => r.key === 'gpt-5.6-luna');
  assert.equal(luna.accuracy, 0.971074);
  // No double rounding: 0.516529 must stay 51.7 % at one decimal.
  assert.equal((v.ranked.find((r) => r.key === 'open-jev-deberta-v3-large').accuracy * 100).toFixed(1), '51.7'); assert.equal(luna.renormalized, 20); assert.equal(luna.probability, 'verbalized');
  // No billable account: null price with a stated reason, never zero.
  for (const key of ['openjev-sglang', 'system-one-open', 'open-jev-deberta-v3-large']) {
    const r = v.ranked.find((x) => x.key === key);
    assert.equal(r.cost, null, key); assert.ok(r.costReason, key);
  }
  assert.equal(v.partial[0].cost, null);
  // Empty calibration bins stay empty, never interpolated.
  assert.deepEqual(jev.overall.bins[0], [0, null, null]);
  assert.equal(jev.overall.bins.reduce((s, b) => s + b[0], 0), 242);
});

test('JevBench validator fails closed on item-level keys, a zero price for an unbilled route, a wrong protocol and broken bins', () => {
  const probe = (mutate, why) => { const a = artifact(); mutate(a); assert.throws(() => validateJevbench(a), undefined, why); };
  probe((a) => { a.systems[0].by_family.routing.predictions = []; }, 'per-item predictions');
  probe((a) => { a.items = [{ state: 'x' }]; }, 'item text');
  probe((a) => { a.systems.find((s) => s.key === 'openjev-sglang').overall.cost_per_1000_usd = 0; }, 'unbilled route printed as $0');
  probe((a) => { a.protocol = 'jevbench::v2'; }, 'another protocol identity');
  probe((a) => { a.systems[0].overall.ece.bins[0].accuracy = 0.5; }, 'empty bin with a value');
  probe((a) => { a.systems[1].key = a.systems[0].key; }, 'duplicate system');
  probe((a) => { a.systems.find((s) => s.key === 'qwen3.8-27b').complete = true; }, 'partial run claimed complete');
});
