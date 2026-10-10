import test from 'node:test';
import assert from 'node:assert/strict';
import { readApiFullAddenda, validateApiFullAddenda, withApiFullAddenda, withApiFullAddendumCategories, coverageStatus } from '../lib/jevbench-api-full-addenda.mjs';

// Invented aggregate fixture only: no model, item, Gold or inference data.
function fixture() {
  const hash = 'a'.repeat(64);
  const coverage = Object.fromEntries([['topics', 7], ['usecases', 20], ['languages', 23]].map(([dim, count]) => [dim, Array.from({ length: count }, (_, i) => ({ key: `${dim}-${i}`, label: `Synthetic ${i}`, n: i === 0 ? 0 : i === 1 ? 15 : 30, answered_ok: i === 0 ? 0 : i === 1 ? 15 : 29, errors: i < 2 ? 0 : 1, competence: i === 0 ? null : 50, types: ['choice'], pool: 'S+P' }))]));
  return { schema_version: 1, kind: 'jevbench-api-full-addenda', entries: [{ key: 'synthetic-public-fixture', release: 'synthetic-test', publication_status: 'published', published_at: '2026-10-10T00:00:00Z', provenance: { parent: 'synthetic-parent', method: 'O1S', g_med_s: 7, counts: { S: 1200, P: 300 }, cost_n: 1479, input_sha256: hash, run_sha256: hash, scorer_sha256: hash, categories_sha256: hash, acceptance_sha256: hash, publication_receipt_sha256: hash, cost_mask_sha256: hash, source_url: 'https://example.com/synthetic-aggregate' }, row: { key: 'synthetic-public-fixture', display: 'Synthetic test', api_flag: true, ranked: true, listing: 'ranked', capability: 50, scores: { A: 50, B: 50, C: 50 }, axes: { intelligence: 50, calibration: 50, speed: 50, cost: 50 }, speed: { p50_s_raw: 1, p50_s_adjusted: 1, adjustment: 'none (API)' }, cost: { usd_per_1000: .01, basis: 'synthetic tariff' }, status: { rows: 1500, answered_ok: 1497, status: 'complete' }, v16: { lane: 'api', full_set_api: true, equated: false, n_items: 1500, run_sha256: hash } }, coverage }] };
}
test('actual shipped registry is empty and has no Microsoft score/admission', async () => {
  assert.deepEqual((await readApiFullAddenda()).entries, []);
});
test('full provenance required; unpublished/incomplete/equated/private bundles refuse', () => {
  assert.equal(validateApiFullAddenda(fixture()).entries.length, 1);
  for (const mutate of [e => { e.publication_status = 'draft'; }, e => { delete e.provenance.acceptance_sha256; }, e => { e.row.status.rows = 1059; }, e => { e.row.v16.equated = true; }, e => { e.row.speed.p50_s_adjusted = 2; }, e => { e.row.gold = []; }, e => { e.coverage.languages.pop(); }, e => { e.coverage.topics[0].competence = 0; }]) {
    const a = fixture(); mutate(a.entries[0]); assert.throws(() => validateApiFullAddenda(a), /API full addendum/);
  }
});
test('inventory retains 50 cells; suppressed cells never enter numeric category view', () => {
  const a = fixture(), e = a.entries[0];
  const base = { systems: {}, ...Object.fromEntries(Object.entries(e.coverage).map(([d, cells]) => [d, cells.map(c => ({ key: c.key }))])) };
  const out = withApiFullAddendumCategories(base, a);
  assert.equal(Object.values(e.coverage).flat().length, 50);
  assert.equal(out.systems[e.key].topics['topics-0'], undefined);
  assert.equal(coverageStatus(e.coverage.topics[1]), 'low sample — table only');
  assert.equal(coverageStatus(e.coverage.topics[2]), 'fewer than 30 completed — table only');
  assert.equal(out.systems[e.key].topics['topics-2'].coverage_n, 29);
  assert.deepEqual(base.systems, {});
});
test('rank insertion preserves old relative order and immutable source; refuses overrides', () => {
  const a = fixture();
  const systems = Array.from({ length: 6 }, (_, i) => ({ key: `existing-${i}`, ranked: true, capability: 80 - i * 10, scores: { A: 80 - i * 10 }, ranks: { capability: i + 1 } }));
  const artifact = { systems, n_ranked: 6, board: { A: { order: systems.map(r => r.key) } } };
  const out = withApiFullAddenda(artifact, a);
  assert.deepEqual(out.board.A.order.filter(k => k !== a.entries[0].key), artifact.board.A.order);
  assert.ok(out.board.A.order.slice(0, 5).includes(a.entries[0].key));
  assert.equal(artifact.systems.length, 6);
  assert.throws(() => withApiFullAddenda(out, a), /overridden/);
});
