import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceCoverage } from '../ops/daily/source-coverage.mjs';
const entry = (id, extra = {}) => ({ id, name: id, primary_url: `https://example.org/${id}`, ...extra });
const make = (entries, specs, checks, extra = {}) => sourceCoverage({ registry: { entries, ...extra }, plan: { entries: specs }, report: { checked_at: '2026-09-29T05:17:00Z', checks } });
test('registry entries missing from the newest run cannot disappear from coverage', () => {
  const r = make([entry('new'), entry('old')], [], [{ id: 'old', status: 'checked_unchanged' }]);
  assert.equal(r.registry_entries, 2); assert.equal(r.entries[0].status, 'missing_check');
  assert.equal(r.all_entries_accounted_for, false);
});
test('a grouped retained failure wins over a generic reachable protocol receipt', () => {
  const r = make([entry('aa-a')], [], [{ id: 'aa-a', status: 'source_reachable_protocol_date_retained' }, { id: 'aa-benchmark-fields', status: 'retained_after_failure', reason: 'No eligible critic' }], { aa_field_map: [{ benchmark_id: 'aa-a' }] });
  assert.equal(r.entries[0].status, 'failed_retained'); assert.equal(r.entries[0].reason, 'No eligible critic');
});
test('manual, robots refusal, parsed candidates and reachable-only sources stay distinct', () => {
  const r = make(['manual','robots','candidate','protocol'].map((id) => entry(id)), [{ benchmark_id: 'manual', refresh: 'manual', reason: 'Frozen dated snapshot' }], [
    { id: 'robots', status: 'source_unreachable_or_manual', reason: 'robots.txt disallows capture' },
    { id: 'candidate', status: 'candidate' }, { id: 'protocol', status: 'source_reachable_protocol_date_retained' }]);
  assert.deepEqual(r.entries.map((r) => r.status), ['exempt','failed_retained','candidate','protocol_only']);
  assert.equal(r.entries[0].reason, 'Frozen dated snapshot'); assert.equal(r.all_sources_checked_or_exempt, false);
});
test('a daily check never rewrites retained observation dates', () => {
  const r = sourceCoverage({ registry: { entries: [entry('b')] }, plan: { entries: [] }, report: { checked_at: '2026-09-29', checks: [{ id: 'b', status: 'checked_unchanged' }] }, observations: [{ benchmark_id: 'b', source: { retrieved_at: '2026-09-10' } }] });
  assert.equal(r.entries[0].newest_observation_retrieved_at, '2026-09-10'); assert.equal(r.entries[0].checked_at, '2026-09-29');
});
test('duplicate source arms fail closed instead of silently selecting one', () => {
  assert.throws(() => make([entry('b')], [{ benchmark_id: 'b' }, { benchmark_id: 'b' }], []), /Duplicate collection plan/);
});
