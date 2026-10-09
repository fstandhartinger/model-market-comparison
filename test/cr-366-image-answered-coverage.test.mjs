import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
      assert.deepEqual(Object.keys(audited.cells[dim]).sort(), Object.keys(cells).sort());
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
  assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'), coverage.original_category_values_denominators_sha256);
  const forbidden = new Set(['token', 'question', 'gold', 'prediction', 'options', 'item_id', 'state', 'expected']);
  const check = value => { if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) { assert.ok(!forbidden.has(key), `private field ${key}`); check(child); } };
  check(coverage);
  assert.ok(release.categories.systems.gemini38_flash.capabilities.small_text[1] > 30);
  assert.equal(release.categories.systems.gemini38_flash.capabilities.small_text[2], 0, 'retained truncated responses do not become answered coverage');
});
