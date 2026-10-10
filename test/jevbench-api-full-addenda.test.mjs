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
  // Descriptive cells may use a separately admitted pool; the displayed row tag
  // must preserve that provenance instead of implying they use the headline draw.
  for (const c of Object.values(e.coverage).flat()) c.pool = 'P+L1+L2+L3 (descriptive)';
  const supplemented = withApiFullAddendumCategories(base, a).systems[e.key];
  assert.equal(supplemented.coverage, 'P+L1+L2+L3 (descriptive)');
  assert.equal(supplemented.languages['languages-2'].pool, supplemented.coverage);
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
test('published addendum model page uses the same scoped board ranks and full-set metadata', async () => {
  const { mkdtemp, mkdir, symlink, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { readJevbenchA4ModelPages } = await import('../lib/jevbench-a4-model-pages.mjs');
  const { readJevbenchV161Release } = await import('../lib/jevbench-v16-release.mjs');
  const { readJevbenchV157Release } = await import('../lib/jevbench-v15-release.mjs');
  const { readFile } = await import('node:fs/promises');
  const { jevWithApiA4Rows, jevScopeClassifier, jevbenchScopeArtifact } = await import('../lib/jevbench-scope.mjs');
  const { withApiRerunSplits } = await import('../lib/jevbench-api-rerun-cells.mjs');
  const { jevClassRows, JEV_V16_CLASS_OPTIONS } = await import('../lib/jevbench-jev-class.mjs');
  const root = await mkdtemp(path.join(tmpdir(), 'bh-cr401-model-page-'));
  try {
    await mkdir(path.join(root, 'data'));
    await symlink(path.resolve('data/raw'), path.join(root, 'data/raw'), 'dir');
    await symlink(path.resolve('data/jevbench-api-a4-equated.json'), path.join(root, 'data/jevbench-api-a4-equated.json'));
    const registry = fixture(), entry = registry.entries[0];
    entry.row.capability = 99; entry.row.scores = { A: 99, B: 99, C: 99 };
    await writeFile(path.join(root, 'data/jevbench-api-full-addenda.json'), JSON.stringify(registry));
    const [{ artifact: release, carry }, previous, a4, pages, originalPages] = await Promise.all([
      readJevbenchV161Release(root), readJevbenchV157Release(root),
      readFile(path.join(root, 'data/jevbench-api-a4-equated.json'), 'utf8').then(JSON.parse),
      readJevbenchA4ModelPages(root), readJevbenchA4ModelPages(),
    ]);
    const meta = new Map([...previous.artifact.systems, ...carry.rows].map(r => [r.key, r]));
    const merged = withApiFullAddenda(jevWithApiA4Rows(release, withApiRerunSplits(a4), meta), registry);
    const board = jevbenchScopeArtifact(merged, 'api', jevScopeClassifier(merged.systems, carry.rows, previous.artifact.systems, previous.artifact.not_measured));
    const expected = board.systems.find(r => r.key === entry.key);
    const classRows = jevClassRows(board.systems.filter(r => r.ranked), JEV_V16_CLASS_OPTIONS).rows.filter(r => r.inClass);
    const page = pages.get(entry.key);
    assert.ok(page, 'new published key must exist for static params and model-page lookup');
    assert.deepEqual(page.row, expected);
    assert.equal(page.compositeRank, expected.rank);
    assert.equal(page.capabilityRank, classRows.findIndex(r => r.row.key === entry.key) + 1);
    assert.equal(page.nRanked, board.n_ranked);
    assert.equal(page.full, true); assert.equal(page.nItems, 1500);
    assert.equal(page.measuredOn, entry.published_at);
    assert.equal(page.round, entry.provenance.parent); assert.equal(page.offsets, null);
    assert.ok(pages.get('instinct').compositeRank > originalPages.get('instinct').compositeRank);
    assert.equal(originalPages.has(entry.key), false, 'real empty registry remains unchanged');
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('nested row aggregates reject arbitrary item fields and scalar-object substitutions', () => {
  for (const field of ['per_item', 'items', 'gold_labels']) {
    for (const container of ['cost', 'speed', 'status', 'v16', 'axes', 'scores']) {
      const a = fixture(); a.entries[0].row[container][field] = [{ secret: 'invented control' }];
      assert.throws(() => validateApiFullAddenda(a), /API full addendum/);
    }
  }
  for (const mutate of [
    r => { r.cost.unknown = []; }, r => { r.cost.basis = { arbitrary: [] }; },
    r => { r.intelligence = { base: { arbitrary: [] } }; },
    r => { r.calibration = { parts: { choice: { arbitrary: [] } } }; },
    r => { r.v16.per_type = { choice: { cc_by_type: { arbitrary: [] } } }; },
    r => { r.model_pin = { unknown: [] }; },
  ]) {
    const a = fixture(); mutate(a.entries[0].row);
    assert.throws(() => validateApiFullAddenda(a), /API full addendum/);
  }
});
test('n15 table denominator includes terminal failures; radar still needs 30 completed', () => {
  const a = fixture(); a.entries[0].coverage.topics[1].answered_ok = 0; a.entries[0].coverage.topics[1].errors = 15;
  assert.equal(validateApiFullAddenda(a), a);
  assert.equal(coverageStatus(a.entries[0].coverage.topics[1]), 'low sample — table only');
});
test('accepted refusal coverage is separate from valid answers and scored failures', () => {
  const a = fixture(), e = a.entries[0], cell = e.coverage.topics[2];
  cell.answered_ok = 20; cell.errors = 10; cell.coverage_n = 30;
  assert.equal(validateApiFullAddenda(a), a);
  const taxonomy = Object.fromEntries(Object.entries(e.coverage).map(([d, cs]) => [d, cs.map(c => ({ key: c.key }))]));
  assert.equal(withApiFullAddendumCategories({ systems: {}, ...taxonomy }, a).systems[e.key].topics[cell.key].coverage_n, 30);
  assert.equal(coverageStatus(cell), 'radar sample minimum met');
  cell.coverage_n = 20;
  assert.equal(coverageStatus(cell), 'fewer than 30 completed — table only');
  for (const bad of [19, 31, 29.5, true]) {
    cell.coverage_n = bad;
    assert.throws(() => validateApiFullAddenda(a), /completed coverage/);
  }
});
