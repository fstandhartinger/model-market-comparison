// CR-318 v1.7.12 (API lane handoff #10839, Part B): the live boards overlay the sealed language/use-case supplements
// (L1 354 + L2 33 items) on the frozen v1.6.1 S + P cells. Cells only: the frozen artifact and every headline field stay unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { withJevCellSupplement, jevbenchCategoryView, validateCategoryArtifact } from '../lib/jevbench-categories.mjs';
import { mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from '../lib/jevbench-v16-release.mjs';

const path = (f) => new URL(`../${f}`, import.meta.url);
const read = (f) => JSON.parse(readFileSync(path(f)));
const BASE = 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json';
const SUPP = 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-cells-supplement.json';
const base = read(BASE);
const supp = read(SUPP);
const merged = withJevCellSupplement(base);
const DIMS = ['families', 'usecases', 'languages', 'topics'];

test('1: supplement is aggregate-only, public rows only, no private systems', () => {
  const bytes = readFileSync(path(SUPP), 'utf8');
  for (const key of JEVBENCH_V16_EXCLUDED_KEYS) assert.ok(!bytes.includes(`"${key}"`), key);
  assert.equal(mentionsPrivateSystem(bytes), false);
  assert.ok(!/"(item_id|item_ids|item_text|question|gold|prediction|prompt)"/.test(bytes));
  for (const key of Object.keys(supp.systems)) assert.ok(base.systems[key], `${key} is a public row`);
  assert.equal(supp.revision, base.revision);
});

test('2: every language and use case has at least 30 pool items; pool is S + P + L1 + L2', () => {
  assert.equal(supp.pool_items, 1200 + 300 + 354 + 33);
  assert.equal(supp.languages.reduce((s, l) => s + l.n, 0), supp.pool_items);
  for (const l of supp.languages) assert.ok(l.n >= 30, l.key);
  assert.equal(supp.usecases.length, 20);
  for (const u of supp.usecases) assert.ok(u.n >= 30, u.key);
});

test('3: overlay keeps every row, flags coverage, and validates', () => {
  assert.deepEqual(Object.keys(merged.systems).sort(), Object.keys(base.systems).sort());
  for (const [key, row] of Object.entries(merged.systems)) {
    if (supp.systems[key]) assert.deepEqual(row, supp.systems[key], key);
    else {
      assert.equal(row.coverage, 'S+P', key);
      for (const d of DIMS) assert.deepEqual(row[d], base.systems[key][d], `${key}.${d}`);
    }
  }
  assert.ok(Object.values(merged.systems).filter((r) => r.coverage === 'S+P+L1+L2').length >= 80);
  validateCategoryArtifact(merged, DIMS);
  assert.equal(merged.supplement.revision, 'v1.7.12');
});

test('4: the frozen v1.6.1 artifact carries no supplement; later added rows simply show as S+P', () => {
  assert.match(supp.base_sha256, /^[0-9a-f]{64}$/);
  assert.equal(base.supplement, undefined);
  const extra = withJevCellSupplement({ ...base, systems: { ...base.systems, 'new-row': base.systems['jev-1.13.0'] } });
  assert.equal(extra.systems['new-row'].coverage, 'S+P');
});

test('5: compare view uses the supplement only when asked', () => {
  const keys = ['jev-1.13.0', 'sage-1.3.0'];
  const plain = jevbenchCategoryView('v1.6.1', keys);
  const live = jevbenchCategoryView('v1.6.1', keys, { supplement: true });
  assert.notDeepEqual(plain, live);
  assert.deepEqual(jevbenchCategoryView('v1.6.0', keys, { supplement: true }), jevbenchCategoryView('v1.6.0', keys));
});

test('6: labelling/rules describe the supplements; hard-coded page numbers match the file', () => {
  assert.match(merged.labelling, /387 supplement items/);
  assert.match(merged.rules.join(' '), /L2 supplement/);
  const board = readFileSync(path('components/JevBenchV16Board.tsx'), 'utf8');
  const full = Object.values(supp.systems).filter((r) => r.coverage === 'S+P+L1+L2').length;
  assert.match(board, new RegExp(`language supplement L1 \\(${supp.pools.L1} items\\) and a use-case supplement L2 \\(${supp.pools.L2} items\\)`));
  assert.match(board, new RegExp(`${full} rows answered both supplements`));
  assert.match(board, new RegExp(`${supp.pools.L1} language items, ${supp.pools.L2} use-case items`));
});
