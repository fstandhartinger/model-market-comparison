import test from 'node:test';
import assert from 'node:assert/strict';
import { aaNativeReviewEvidence } from '../lib/aa-benchmark-fields.mjs';

test('AA review evidence preserves native renamed keys, zero, null and resolved structures', () => {
  const native = { id: 'fixture', slug: 'fixture-high', name: 'Fixture', effort: '$e',
    terminalBench21: 0, terminalBench40: null, gpqa: .7, briefcaseBreakdown: '$b', unrelated: 999 };
  const records = new Map([['e', { slug: 'high' }], ['b', { overall: { elo: 1234 } }]]);
  const evidence = aaNativeReviewEvidence(native, { terminalbenchV21: 0, terminalbenchV40: null, gpqa: .7, briefcaseBreakdown: {} }, records);
  assert.deepEqual(evidence.field_name_map, { terminalbenchV21: 'terminalBench21', terminalbenchV40: 'terminalBench40' });
  assert.equal(evidence.native_source_row.terminalBench21, 0);
  assert.equal(evidence.native_source_row.terminalBench40, null);
  assert.deepEqual(evidence.native_source_row.effort, { slug: 'high' });
  assert.deepEqual(evidence.native_source_row.briefcaseBreakdown, { overall: { elo: 1234 } });
  assert.equal(Object.hasOwn(evidence.native_source_row, 'terminalbenchV21'), false, 'native names must not be silently rewritten');
  assert.equal(Object.hasOwn(evidence.native_source_row, 'unrelated'), false);
});

test('legacy same-name AA fields remain literal and ambiguous or missing fields fail closed', () => {
  const native = { id: 'fixture', name: 'Fixture', slug: 'fixture', terminalbenchV21: .5 };
  const evidence = aaNativeReviewEvidence(native, { terminalbenchV21: .5 }, new Map());
  assert.deepEqual(evidence.field_name_map, {});
  assert.equal(evidence.native_source_row.terminalbenchV21, .5);
  assert.throws(() => aaNativeReviewEvidence({ ...native, terminalBench21: .6 }, { terminalbenchV21: .5 }, new Map()), /both/);
  assert.throws(() => aaNativeReviewEvidence(native, { terminalbenchV40: .5 }, new Map()), /missing native field/);
});
