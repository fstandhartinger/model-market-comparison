import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

// Each withdrawal must be provable from two committed captures of the same URL: the row is in the
// last one that had it and missing from the first one that did not.
const { withdrawals } = JSON.parse(readFileSync('data/raw/benchmarks/public-withdrawals.json', 'utf8'));
const capture = (ref) => {
  const raw = gunzipSync(readFileSync(ref.file));
  assert.equal(createHash('sha256').update(raw).digest('hex'), ref.sha256, `${ref.file} digest`);
  return raw.toString('utf8');
};

test('every public withdrawal is one exact row, proven by its committed before/after captures', () => {
  assert.ok(withdrawals.length > 0);
  assert.equal(new Set(withdrawals.map((w) => w.id)).size, withdrawals.length);
  for (const w of withdrawals) {
    for (const key of ['benchmark_id', 'id', 'source_id', 'reason', 'reviewed_at', 'reviewed_by']) assert.ok(typeof w[key] === 'string' && w[key].trim(), `${w.id} ${key}`);
    assert.equal(w.last_seen.url, w.first_absent.url);
    assert.ok(w.last_seen.retrieved_at < w.first_absent.retrieved_at);
    const cell = `${w.source_id}`;
    assert.ok(capture(w.last_seen).includes(cell), `${w.id} present in last_seen`);
    assert.ok(!capture(w.first_absent).includes(cell), `${w.id} absent from first_absent`);
  }
});
