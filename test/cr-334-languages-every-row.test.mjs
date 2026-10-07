// CR-334 release gate: every measured row, including newly added API overlay rows, needs language aggregates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jevWithApiA4Rows, jevbenchScopeArtifact, jevApiRoster, jevScopeDisplayOrder } from '../lib/jevbench-scope.mjs';
import { withApiRerunCells } from '../lib/jevbench-api-rerun-cells.mjs';
import { withJevCellSupplement, withLanguageCells, jevLanguageRows, languageCoverage, languagePoolNote, jevbenchCategoryView, JEVBENCH_LANGUAGE_CELLS_ARTIFACT } from '../lib/jevbench-categories.mjs';
const read = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url)));
const base = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json');
const rel = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-results.json');
const api = read('data/jevbench-api-a4-equated.json');
const cells = read(JEVBENCH_LANGUAGE_CELLS_ARTIFACT);
const before = withApiRerunCells(withJevCellSupplement(base));
const live = withLanguageCells(before);
const merged = jevWithApiA4Rows(rel, api);
function gate(a) {
  for (const r of [...a.rows, ...(a.a5_rows ?? []), ...(a.full_rows ?? [])]) {
    assert.ok(cells.systems[r.key], `${r.key}: missing language-cells entry`);
  }
}
test('release gate: each overlay row needs language cells, including a future added row', () => {
  gate(api);
  assert.throws(() => gate({ ...api, rows: [...api.rows, { key: 'new-api-row' }] }), /new-api-row: missing/);
});
test('both boards: every measured row appears with a tag; ranked rows have language outputs', () => {
  for (const scope of ['open', 'api']) {
    const a = jevbenchScopeArtifact(merged, scope);
    const rows = jevLanguageRows(a.systems, scope);
    assert.deepEqual(new Set(rows.map((r) => r.key)), new Set(a.systems.map((r) => r.key)));
    assert.deepEqual(rows.filter((s) => s.listing !== 'wrapper').map((s) => s.key),
      (scope === 'api' ? [...jevApiRoster(a, []).ranked, ...jevApiRoster(a, []).variants.filter((s) => s.listing !== 'wrapper')] : jevScopeDisplayOrder(a.systems.filter((s) => s.listing !== 'wrapper'))).map((s) => s.key));
    for (const r of rows) {
      assert.ok(live.systems[r.key], r.key);
      assert.match(languageCoverage(live.systems[r.key]), /^(S|A\d*)\+P(?:\+L[123])*$/);
      if (r.ranked) assert.ok(Object.keys(live.systems[r.key].languages).length > 0, r.key);
    }
    const firstWrapper = rows.findIndex((r) => r.listing === 'wrapper');
    if (firstWrapper >= 0) assert.ok(rows.slice(firstWrapper).every((r) => r.listing === 'wrapper'));
  }
});
test('language overlay changes no other dimension, preserves unknown rows and frozen view', () => {
  for (const [key, row] of Object.entries(before.systems)) for (const dim of ['families', 'topics', 'usecases', 'coverage']) {
    assert.deepEqual(live.systems[key][dim], row[dim], `${key}.${dim}`);
  }
  assert.equal(base.language_cells, undefined);
  const catalogue = jevbenchCategoryView('v1.6.1', ['gliner2'], { supplement: true });
  assert.ok(catalogue.missing.gliner2);
  assert.equal(catalogue.systems.gliner2, undefined);
  const unknown = { languages: {}, coverage: 'A4+P' };
  assert.equal(withLanguageCells({ ...before, systems: { ...before.systems, future: unknown } }).systems.future, unknown);
  assert.equal(languageCoverage({ sealed_basis: 'S', pool_ok: { A2: 300, A3: 300, L1: 2, L3: 0 } }), 'S+P+L1');
});
test('artifact is aggregate-only, without item fields, IDs or private rows', () => {
  const bytes = readFileSync(new URL(`../${JEVBENCH_LANGUAGE_CELLS_ARTIFACT}`, import.meta.url), 'utf8');
  assert.doesNotMatch(bytes, /v16-|l3-|"(?:item_ids?|item_text|prompt|question|gold|prediction|task_id|per_item)"/i);
  assert.doesNotMatch(bytes, /"djev(?:-thinking)?"/);
});
test('caption follows interim and final L3 data and has no stale missing-API claim', () => {
  assert.match(languagePoolNote(live.language_cells), new RegExp(`at least ${Math.min(...cells.languages.map((l) => l.n_api_basis))} items`));
  const final = withLanguageCells(before, { ...cells, drawn: '2026-10-07', pools: { ...cells.pools, L3: 800 }, languages: cells.languages.map((l) => ({ ...l, n_api_basis: 60 })) });
  assert.match(languagePoolNote(final.language_cells), /L3 \(800 items\)/);
  assert.match(languagePoolNote(final.language_cells), /drawn 2026-10-07/);
  assert.match(languagePoolNote(final.language_cells), /at least 60 items/);
  const board = readFileSync(new URL('../components/JevBenchV16Board.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(board, /not in this view yet/);
  assert.match(board, /jevLanguageRows\(a.systems, scope\)/);
  assert.match(board, /data-bh-jev16-cell-coverage/);
});
