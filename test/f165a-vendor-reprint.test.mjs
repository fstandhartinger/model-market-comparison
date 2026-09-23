// F-165(a), the rekey half: a vendor launch row joins the board's own identity only where the
// protocol matches it.
//
// The risk this pins is a rule that withdraws too much. A vendor and an independent board sharing
// a benchmark name is a candidate, never a join — two different runners publish the same benchmark
// all the time, and their numbers are genuinely two results. So these assert both directions: the
// reprint is caught, and the look-alike with a different runner survives.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { partitionVendorRows, sameNumber, counterExamples } from '../ops/ux-2026-09-12/bin/f165a-rule.mjs';

const registry = [
  { id: 'aa-briefcase::1.1', family: 'aa-briefcase', name: 'AA-Briefcase v1.1', maintainer: 'Artificial Analysis' },
  { id: 'vendor-aa-briefcase-v1-1::1.1', family: 'vendor-aa-briefcase-v1-1', name: 'AA-Briefcase v1.1' },
  { id: 'tbench::4.0', family: 'tbench', name: 'Terminal-Bench 4.0', maintainer: 'Vals AI' },
  { id: 'vendor-tbench::4.0', family: 'vendor-tbench', name: 'Terminal-Bench 4.0' },
];
const observation = (id, benchmark_id, model_id, value, basis, protocol) =>
  ({ id, benchmark_id, subject: { model_id, variant: null, harness: null }, value, basis, protocol });

const REPRINT = 'Vendor-reported by Acme for Model X, printed as "AA-Briefcase v1.1". '
  + 'Section 8: "Evaluations were run independently by Artificial Analysis". '
  + 'No independent reproduction is claimed. Replace with an independently measured matching-version result when available.';
const OWN_RUN = 'Vendor-reported by Acme for Model X, printed as "Terminal-Bench 4.0". Acme Harness, minimal mode. '
  + 'No independent reproduction is claimed. Replace with an independently measured matching-version result when available.';

test('a vendor row the board\'s own maintainer ran, at the same number, is superseded', () => {
  const snapshot = { registry, observations: [
    observation('vendor', 'vendor-aa-briefcase-v1-1::1.1', 'model-x::max', 1822, 'self_reported', REPRINT),
    observation('aa', 'aa-briefcase::1.1', 'model-x::max', 1821.85, 'measured', 'AA-Briefcase v1.1 board'),
  ] };
  const { superseded, separate } = partitionVendorRows(snapshot);
  assert.deepEqual(separate, []);
  assert.equal(superseded.length, 1);
  assert.equal(superseded[0].counterpart, 'aa-briefcase::1.1');
  assert.equal(superseded[0].maintainer, 'Artificial Analysis');
});

test('a measured counterpart alone does not supersede: a different runner is a second result', () => {
  const snapshot = { registry, observations: [
    observation('vendor', 'vendor-tbench::4.0', 'model-x::max', 66.4, 'self_reported', OWN_RUN),
    observation('vals', 'tbench::4.0', 'model-x::max', 61.616, 'measured', 'Vals: Terminal-Bench 4.0'),
  ] };
  const { superseded, separate } = partitionVendorRows(snapshot);
  assert.deepEqual(superseded, []);
  assert.equal(separate.length, 1);
  // and it is a counter-example: condition (1) held and the row was kept anyway.
  assert.equal(counterExamples(snapshot, separate).length, 1);
});

test('the same runner but a different number is two results, not one', () => {
  const snapshot = { registry, observations: [
    observation('vendor', 'vendor-aa-briefcase-v1-1::1.1', 'model-x::max', 1799, 'self_reported', REPRINT),
    observation('aa', 'aa-briefcase::1.1', 'model-x::max', 1821.85, 'measured', 'AA-Briefcase v1.1 board'),
  ] };
  assert.deepEqual(partitionVendorRows(snapshot).superseded, []);
});

test('a self-reported counterpart is not an independently measured result', () => {
  const snapshot = { registry, observations: [
    observation('vendor', 'vendor-aa-briefcase-v1-1::1.1', 'model-x::max', 1822, 'self_reported', REPRINT),
    observation('aa', 'aa-briefcase::1.1', 'model-x::max', 1821.85, 'self_reported', 'AA-Briefcase v1.1 board'),
  ] };
  assert.deepEqual(partitionVendorRows(snapshot).superseded, []);
});

test('a counterpart measurement of a different model configuration does not supersede', () => {
  const snapshot = { registry, observations: [
    observation('vendor', 'vendor-aa-briefcase-v1-1::1.1', 'model-x::max', 1822, 'self_reported', REPRINT),
    observation('aa', 'aa-briefcase::1.1', 'model-x::high', 1821.85, 'measured', 'AA-Briefcase v1.1 board'),
  ] };
  assert.deepEqual(partitionVendorRows(snapshot).superseded, []);
});

test('the vendor\'s printed precision decides what counts as the same number', () => {
  assert.equal(sameNumber(1822, 1821.85), true);     // no decimals printed: round to units
  assert.equal(sameNumber(1846, 1846.17), true);
  assert.equal(sameNumber(66.4, 61.616), false);
  assert.equal(sameNumber(61.6, 61.616), true);      // one decimal printed: round to tenths
  assert.equal(sameNumber(61.62, 61.616), true);
  assert.equal(sameNumber(1822, 1822.5), false);     // 1822.5 rounds to 1823, not 1822
});

test('the published dataset decides every vendor launch row, and the decision holds', () => {
  const { benchmark_results: results } = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const { superseded, separate } = partitionVendorRows(results);

  // The rule must keep discriminating. If it ever withdrew everything, or nothing with a measured
  // same-name counterpart survived, it stopped being a protocol match and became a name match.
  assert.ok(separate.length > 0, 'every vendor launch row was judged a reprint — the rule widened');
  assert.ok(counterExamples(results, separate).length > 0,
    'no vendor row with a measured same-name counterpart survives, so the rule is not discriminating');

  // The pending joins, as decided on 2026-09-23 against every row's own protocol text. A new one
  // appearing is not a failure of this rule, it is a launch ingest that needs the same decision
  // made for it — so this fails and someone looks, rather than the finding rotting silently.
  assert.deepEqual(superseded.map((r) => r.benchmark_id).sort(),
    ['anthropic-aa-briefcase-v1-1::1.1', 'anthropic-gdpval-aa-v2-1::2.1'],
    'the set of vendor rows joining a board\'s own identity changed; re-run verify-f165-a-rekey.mjs and record the decision');
  for (const row of superseded) {
    assert.equal(row.maintainer, 'Artificial Analysis');
    const measured = results.observations.find((o) => o.id === row.measured_id);
    assert.equal(measured.benchmark_id, row.counterpart);
    assert.equal(measured.subject.model_id, row.model_id);
    assert.equal(measured.source_basis ?? measured.basis, 'measured');
  }
});

test('an approved vendor score cannot be moved between boards without a review', () => {
  // Why the joins above are still pending. Every self-reported vendor score is bound to a
  // producer/critic approval over the observation's own digest, and the one documented exception
  // is a reviewed `subject.model_id` join. Re-keying `benchmark_id` has no approved path, so the
  // join is a reviewed change and not something an unattended iteration applies.
  const guard = readFileSync(new URL('../lib/benchmark-score-evidence.mjs', import.meta.url), 'utf8');
  assert.match(guard, /Unreviewed vendor score/);
  assert.match(guard, /identity_review/);
  assert.match(guard, /changes only subject\.model_id/);
});
