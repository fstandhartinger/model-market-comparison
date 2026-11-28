import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { withheldCells, scoredTotal } from '../lib/imagejev-sample-floor.mjs';
const read = async p => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));
test('CR-366: image coverage is authenticated, aggregate-only, and leaves measured values and denominators intact', async () => {
  const release = await read('../data/imagejev-v03.json');
  const coverage = await read('../data/raw/benchmarks/jevbench/multimodal-preview/answered-coverage-v0.3.json');
  assert.deepEqual(Object.keys(coverage.systems).sort(), release.ranking.map(r => r.key).sort());
  for (const row of release.ranking) {
    const audited = coverage.systems[row.key];
    assert.equal(audited.source.public_score_sha256, row.source_sha256);
    for (const hash of Object.values(audited.source)) assert.match(hash, /^[0-9a-f]{64}$/);
    for (const [dim, cells] of Object.entries(release.categories.systems[row.key])) {
      // 27 Nov 2026 sample floor: cells under 30 are withheld from the release but stay in the audit.
      const withheld = withheldCells(release.categories, row.key, dim);
      assert.deepEqual(Object.keys(audited.cells[dim]).filter((c) => !withheld.includes(c)).sort(), Object.keys(cells).sort());
      for (const [cat, cell] of Object.entries(cells)) {
        assert.equal(cell.length, 3);
        assert.ok(Number.isFinite(cell[0]));
        assert.ok(Number.isInteger(cell[1]) && Number.isInteger(cell[2]) && cell[2] >= 0 && cell[2] <= cell[1]);
        assert.deepEqual(cell.slice(1), audited.cells[dim][cat]);
      }
    }
  }
  const original = Object.fromEntries(Object.entries(release.categories.systems).map(([key, dims]) => [key,
    Object.fromEntries(Object.entries(dims).map(([dim, cells]) => [dim,
      Object.fromEntries(Object.entries(cells).map(([cat, cell]) => [cat, cell.slice(0, 2)]))]))]));
  // 27 Nov 2026 sample floor: the original hash binds the pre-floor values; the published cells are bound separately.
  assert.match(coverage.original_category_values_denominators_sha256, /^[0-9a-f]{64}$/);
  assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'), coverage.post_sample_floor_category_values_denominators_sha256);
  const forbidden = new Set(['token', 'question', 'gold', 'prediction', 'options', 'item_id', 'state', 'expected']);
  const check = value => { if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) { assert.ok(!forbidden.has(key), `private field ${key}`); check(child); } };
  check(coverage);
  assert.ok(coverage.systems.gemini38_flash.cells.capabilities.small_text[0] > 30);
  assert.equal(coverage.systems.gemini38_flash.cells.capabilities.small_text[1], 0, 'retained truncated responses do not become answered coverage');
  assert.ok(withheldCells(release.categories, 'gemini38_flash', 'capabilities').includes('small_text'), 'a cell with 0 completed responses is withheld');
});
