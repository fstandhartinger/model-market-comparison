import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcilePublicIdentities as reconcile } from '../ops/daily/public-identities.mjs';
const row = (id, name, value = 5, extra = {}) => ({ id, benchmark_id: 'synthetic::v1', subject: { source_id: name, name, variant: null, harness: null }, unit: 'percent', basis: 'measured', value, source: { date: 'old' }, ...extra });
const evidence = (rows) => Object.fromEntries(rows.map((r) => [r.id, { native: r.value }]));

test('insertion and reorder preserve unique identities while retaining exact changed values and evidence', () => {
  const prior = [row('old-a', 'A'), row('old-b', 'B')];
  const next = [row('index-0', 'New'), row('index-1', 'B', 7), row('index-2', 'A', 9)];
  const frozen = structuredClone({ prior, next });
  const result = reconcile(next, evidence(next), prior);
  assert.equal(result.rows[1].id, 'old-b'); assert.equal(result.rows[1].value, 7);
  assert.equal(result.rows[2].id, 'old-a'); assert.equal(result.evidence['old-a'].native, 9);
  assert.deepEqual({ prior, next }, frozen);
  const other = [row('another-index', 'New')];
  assert.equal(reconcile(other, evidence(other), []).rows[0].id, result.rows[0].id);
});

test('variant and harness remain separate exact identities', () => {
  const rows = ['a', 'b', 'c'].map((id, i) => row(id, 'Same', i, { subject: { source_id: 'same', name: 'Same', variant: i === 2 ? 'high' : null, harness: i === 1 ? 'agent' : null } }));
  const result = reconcile(rows.toReversed().map((r) => ({ ...r, id: `new-${r.id}` })), evidence(rows.map((r) => ({ ...r, id: `new-${r.id}` }))), rows);
  assert.deepEqual(result.rows.map((r) => r.id), ['c', 'b', 'a']);
});

test('ambiguous identities require unchanged exact-ID semantics and missing rows fail', () => {
  const prior = [row('a', 'Same'), row('b', 'Same', 9)];
  const dated = prior.map((r) => ({ ...r, source: { date: 'new' } }));
  assert.equal(reconcile(dated, evidence(dated), prior).rows.length, 2);
  assert.throws(() => reconcile([prior[0], { ...prior[1], value: 10 }], evidence(prior), prior), /Ambiguous/);
  assert.throws(() => reconcile([row('a', 'A')], { a: {} }, [row('b', 'B')]), /disappeared/);
  assert.throws(() => reconcile([row('a', 'A')], {}, []), /evidence/);
});
