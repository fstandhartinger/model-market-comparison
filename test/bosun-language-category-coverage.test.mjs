import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { languageCoverage, jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const key = 'bosun-v31-0.6b';
const artifact = 'ops/evidence/bosun-language-category-20261009.json';
const expectedSha = '47b5f488e4a6e59cf6165729fbb91150fd54115859442ce1037240fbf5ac675f';
const verified = read(artifact);
const language = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-language-cells.json');
const category = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-category-cells.json');
test('Bosun cells exactly match independently verified official aggregate metadata', () => {
  assert.equal(createHash('sha256').update(readFileSync(new URL(`../${artifact}`, import.meta.url))).digest('hex'), expectedSha);
  assert.deepEqual(language.systems[key].languages, verified.languages);
  for (const dimension of ['families', 'topics', 'usecases', 'category_spoke_n']) assert.deepEqual(category.systems[key][dimension], verified[dimension]);
  assert.equal(category.systems[key].category_n_items, 1885);
  for (const source of [language, category]) assert.equal(source.row_provenance[key].sha256, expectedSha);
});
test('All 23 languages, 7 topics and 20 use cases meet actual answered thresholds', () => {
  for (const [dimension, count, minimum] of [['languages', 23, 60], ['topics', 7, 30], ['usecases', 20, 30]]) {
    assert.equal(Object.keys(verified[dimension]).length, count);
    assert.ok(Object.values(verified[dimension]).every((cell) => cell.coverage_n >= minimum));
  }
  assert.equal(read('data/jevbench-radar-spoke-exceptions.json').some((entry) => entry.key === key), false);
  const rendered = jevbenchCategoryView('v1.6.1', [key], { supplement: true, languages: true });
  for (const dimension of ['topics', 'usecases']) for (const [name, cell] of Object.entries(verified[dimension])) assert.deepEqual(rendered.systems[key][dimension][name], [cell.competence, cell.n, cell.coverage_n]);
});
test('The displayed basis keeps S81, P299 and the genuine missing response explicit', () => {
  assert.equal(languageCoverage(language.systems[key]), 'S81+P299+L1+L2+L3');
  assert.equal(category.systems[key].category_pools, 'S81+P299+L1+L2+L3');
  assert.deepEqual(language.systems[key].pool_ok, { S: 81, P: 299, L1: 354, L2: 33, L3: 1118 });
  for (const source of [language, category]) {
    assert.equal(source.systems[key].S1200_complete_claim, false);
    assert.equal(source.systems[key].native_complete_claim, false);
    assert.equal(source.systems[key].public_missing_count, 1);
    assert.equal(source.row_provenance[key].headline_or_rank_changed, false);
  }
  assert.equal(verified.S_observed, 81);
  assert.equal(verified.P_missing, 1);
  assert.equal(verified.old_P22_excluded_from_new_breakdown_basis, true);
});
test('Published handoff contains aggregates, never question, gold or native answer bodies', () => {
  const raw = readFileSync(new URL(`../${artifact}`, import.meta.url), 'utf8');
  assert.doesNotMatch(raw, /"(?:item_ids?|item_text|prompt|question|gold|prediction|task_id|per_item)"|\/home\/flori\/jevbench-sealed/i);
  assert.equal(verified.headline_changed, false);
});
