import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { languageCoverage, jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import { validateRadarSpokeGate } from '../lib/jevbench-radar-spoke-gate.mjs';
import { listedRadarBoards, listedRadarCategoryView } from '../scripts/jevbench-radar-spokes.mjs';
const bytes = (p) => readFileSync(new URL(`../${p}`, import.meta.url));
const read = (p) => JSON.parse(bytes(p));
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const language = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-language-cells.json');
const category = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-category-cells.json');
// CR-416: historical rows reflex-27b, surogate-rune-26b-a4b-v3-rtxpro6000-a2, jeff (cells only; v1.5 headlines kept).
const KEYS = ['reflex-27b', 'surogate-rune-26b-a4b-v3-rtxpro6000-a2', 'jeff'];
const BELOW_LANGUAGE_TARGET = new Set([]);
const STOCHASTIC = new Set([]);

for (const key of KEYS) {
  const path = `ops/evidence/${key}-language-category-complete-20261010.json`;
  const evidence = read(path);
  test(`${key}: cells copy the public aggregate exactly and keep headline scope`, () => {
    const sha = sha256(bytes(path));
    assert.equal(evidence.system, key); assert.equal(evidence.method, 'O1S');
    assert.deepEqual(language.systems[key].languages, evidence.languages);
    for (const dim of ['families', 'topics', 'usecases']) assert.deepEqual(category.systems[key][dim], evidence[dim]);
    assert.equal(category.systems[key].category_n_items, evidence.category_n_items);
    for (const source of [language, category]) {
      const prov = source.row_provenance[key];
      assert.equal(prov.sha256, sha); assert.equal(prov.aggregate_artifact, path);
      assert.equal(prov.headline_or_rank_changed, false); assert.equal(prov.composite_changed, false); assert.equal(prov.original_row_price_changed, false);
    }
    for (const flag of ['headline_changed', 'rank_changed', 'Composite_changed']) assert.equal(evidence[flag], false, flag);
  });
  test(`${key}: 23 languages >= 60, 7 topics and 20 use cases >= 30, P300 parity >= 95 %`, () => {
    for (const [dim, count, gate] of [['languages', 23, BELOW_LANGUAGE_TARGET.has(key) ? 30 : 60], ['topics', 7, 30], ['usecases', 20, 30]]) {
      const cells = Object.values(evidence[dim]);
      assert.equal(cells.length, count, dim);
      assert.ok(cells.every((c) => Number.isFinite(c.competence) && c.coverage_n >= gate), dim);
    }
    for (const cell of Object.values(evidence.languages)) assert.equal(cell.n, cell.response_n + cell.refusal_n + cell.operational_failure_n);
    assert.deepEqual(evidence.gates, { languages23_ge60: !BELOW_LANGUAGE_TARGET.has(key), topics7_usecases20_ge30: true });
    assert.equal(language.systems[key].language_target_complete, !BELOW_LANGUAGE_TARGET.has(key));
    if (BELOW_LANGUAGE_TARGET.has(key)) assert.match(language.systems[key].coverage_note, /instead of the 60-item target/);
    for (const p of ['L1', 'L2', 'L3']) if (evidence.p300_parity[p].p300_compared) assert.ok(evidence.p300_parity[p].pct >= 95, p);
    if (STOCHASTIC.has(key)) assert.match(language.systems[key].coverage_note, /samples stochastically/);
    assert.equal(languageCoverage(language.systems[key]), 'S+P+L1+L2+L3');
    assert.equal(read('data/jevbench-radar-spoke-exceptions.json').some((x) => x.key === key), false);
    validateRadarSpokeGate(jevbenchCategoryView('v1.6.1', [key], { supplement: true }), [key], []);
  });
  test(`${key}: public aggregate has no item-level fields or local paths`, () => {
    const raw = bytes(path).toString();
    assert.doesNotMatch(raw, /"(?:item_ids?|item_text|question|gold|prediction|task_id|per_item|input|prompt|raw_output|answer_text)"|\/home\/|\/Users\/|[A-Z]:\\\\/i);
    assert.match(language.systems[key].coverage_note, /reviewed by an OpenAI model/);
    assert.doesNotMatch(JSON.stringify(language.systems[key]), /l3-|\/home\//i);
  });
}

test('CR-416 rows meet the listed-row radar gate on the addenda-aware view', () => {
  const boards = listedRadarBoards();
  for (const key of KEYS) assert.ok(boards.open.includes(key), key);
  validateRadarSpokeGate(listedRadarCategoryView(boards.open), boards.open, read('data/jevbench-radar-spoke-exceptions.json'));
});

test('CR-416: blocked rows keep exceptions with their concrete reasons', () => {
  const ex = Object.fromEntries(read('data/jevbench-radar-spoke-exceptions.json').map((x) => [x.key, x.reason]));
  assert.match(ex['aplomb-1'], /pinned Hugging Face revision .* was deleted upstream/);
  assert.match(ex['classone-gemma4-e2b'], /87\.7 % agreement/);
  assert.match(ex.swanone, /HTTP 401/);
});
