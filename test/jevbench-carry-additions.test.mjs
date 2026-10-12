// 12 Oct 2026: dated v1.5-method carry additions (Drex v1.5) on the live boards only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';

test('dated carry additions: Drex v1.5 joins the live carry unranked and without private access details', async () => {
  const { readCarryAdditions, withCarryAdditions } = await import('../lib/jevbench-carry-additions.mjs');
  const { carry } = await readCurrentJevbench();
  const rows = await readCarryAdditions();
  const drex = rows.find((r) => r.key === 'drex_v1_5');
  assert.equal(drex.display, 'Drex v1.5'); assert.equal(drex.author, 'Nace.ai'); assert.equal(drex.licence, 'hosted API');
  assert.equal(drex.repo, null); assert.equal(drex.composite_v15, 72.23939309258634); assert.equal(drex.v156_rank, null);
  assert.doesNotMatch(JSON.stringify(rows), /_sk_|api[_-]?key|\/v1\//i);
  const merged = withCarryAdditions(carry, rows);
  assert.equal(merged.rows.length, carry.rows.length + 1);
  assert.equal(withCarryAdditions(merged, rows).rows.length, merged.rows.length);
  assert.equal(carry.rows.some((r) => r.key === 'drex_v1_5'), false);
});

test('dated carry additions: a key that is already carried or measured is never replaced; unknown release fails closed', async () => {
  const { withCarryAdditions } = await import('../lib/jevbench-carry-additions.mjs');
  const { carry } = await readCurrentJevbench();
  const existing = carry.rows[0];
  assert.equal(withCarryAdditions(carry, [{ ...existing, composite_v15: 1 }]), carry);
  assert.throws(() => withCarryAdditions(carry, [{ key: 'zz', measured_revision: 'v0.0' }]), /unknown release/);
});
