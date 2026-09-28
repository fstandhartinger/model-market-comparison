import test from 'node:test';
import assert from 'node:assert/strict';
import { findSplitFamilies, ROUTING_VARIANTS } from '../ops/ux-2026-09-12/bin/measure-split-catalog-families.mjs';

// 2026-09-28 (iteration 261, D248). Three catalog families carry the same product twice — an
// Artificial Analysis row (`::default`) and an OpenRouter row (`::openrouter`) that failed to merge
// because the AA row retains the old `-preview` slug. The catalog below is a small synthetic mirror of
// the real shapes measured on `data/dataset.json`; the numbers there are in the receipt, not pinned here.
const model = (id, variant, { family_key, benchmarks = 0, providers = [], deprecated = false, aaOr = null, orId = null } = {}) => ({
  id, variant, family_key, family_name: family_key, display_name: id, deprecated,
  benchmarks: Object.fromEntries(Array.from({ length: benchmarks }, (_, i) => [`b${i}`, { value: i }])),
  offers: providers.map((p) => ({ provider_id: p })),
  aa_metadata: aaOr ? { openrouter_api_id: aaOr } : null,
  openrouter_metadata: orId ? { id: orId } : null,
});

test('D248: any family holding a routing row beside another row is a split; an effort split alone is not', () => {
  const split = findSplitFamilies([
    model('a::default', 'default', { family_key: 'a', benchmarks: 14 }),
    model('a::openrouter', 'openrouter', { family_key: 'a', providers: ['Cohere'] }),
    // Two efforts are two runs of one product, not one product held twice — never reported.
    model('b::high', 'high', { family_key: 'b', benchmarks: 3, providers: ['X'] }),
    model('b::low', 'low', { family_key: 'b', benchmarks: 3, providers: ['X'] }),
    // The first reading of this measurement required every other row to be `default` and so missed the
    // real `nemotron-3-super-120b-a12b` and `gpt-5.2-codex` shapes: an effort row beside a routing row
    // has exactly the same symptom — the benchmarks on one, the offers on the other.
    model('c::reasoning', 'reasoning', { family_key: 'c', benchmarks: 14, providers: ['A', 'B'] }),
    model('c::openrouter', 'openrouter', { family_key: 'c', providers: ['A', 'B', 'C', 'D', 'E'] }),
    // A lone row is never a split.
    model('d::default', 'default', { family_key: 'd', benchmarks: 5, providers: ['Y'] }),
  ]);
  assert.deepEqual(split.map((f) => f.family_key), ['a', 'c']);
  assert.deepEqual(split.map((f) => f.shape), ['default-plus-routing', 'effort-plus-routing']);
  // The effort shape is the harder one: the repair has to say which effort the route's offers belong to.
  assert.equal(split[1].benchmarks_and_offers_on_different_rows, true);
  assert.ok(ROUTING_VARIANTS.has('openrouter'));
});

test('D248: the benchmark count reads the benchmarks map, not an array length', () => {
  // `benchmarks` is a map of benchmark id → cell. Reading `.length` on it yields undefined and the
  // whole measurement silently reports nothing, with every gate green — the bug this pins.
  const [f] = findSplitFamilies([
    model('a::default', 'default', { family_key: 'a', benchmarks: 14 }),
    model('a::openrouter', 'openrouter', { family_key: 'a', providers: ['Cohere'] }),
  ]);
  assert.deepEqual(f.rows.map((r) => r.benchmarks), [14, 0]);
  assert.equal(f.benchmarks_and_offers_on_different_rows, true);
  assert.equal(f.benchmark_row_has_no_offers, true);
});

test('D248: a stale AA OpenRouter slug beside the live one is reported as the reason for the split', () => {
  const [f] = findSplitFamilies([
    model('g::default', 'default', { family_key: 'g', benchmarks: 13, providers: ['Google'], deprecated: true, aaOr: 'google/g-preview' }),
    model('g::openrouter', 'openrouter', { family_key: 'g', benchmarks: 1, providers: ['Google'], orId: 'google/g' }),
  ]);
  assert.equal(f.slug_mismatch, true);
  assert.deepEqual(f.openrouter_slugs, ['google/g-preview', 'google/g']);
  assert.equal(f.benchmark_row_is_deprecated, true);
  // Same providers behind both rows: the offers are not split here, they are duplicated.
  assert.equal(f.offers_duplicated_across_rows, true);
});

test('D248: identical slugs on both rows are not reported as a mismatch', () => {
  const [f] = findSplitFamilies([
    model('h::default', 'default', { family_key: 'h', benchmarks: 2, aaOr: 'v/h' }),
    model('h::openrouter', 'openrouter', { family_key: 'h', providers: ['V'], orId: 'v/h' }),
  ]);
  assert.equal(f.slug_mismatch, false);
  assert.equal(f.offers_duplicated_across_rows, false);
});
