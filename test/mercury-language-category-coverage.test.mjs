import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { languageCoverage, jevbenchCategoryView, withLiveCategoryCells, L3_EXPOSURE_NOTES } from '../lib/jevbench-categories.mjs';
import { validateRadarSpokeGate } from '../lib/jevbench-radar-spoke-gate.mjs';
import { listedRadarBoards, listedRadarCategoryView } from '../scripts/jevbench-radar-spokes.mjs';
const bytes = (p) => readFileSync(new URL(`../${p}`, import.meta.url));
const read = (p) => JSON.parse(bytes(p));
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const key = 'mercury-decide', path = 'ops/evidence/mercury-language-category-complete-20261009.json';
const sha = '991066e3e119058ff361eafd2f8777b2c88c95253d37d8136178ccdf9cea0dc5';
const evidence = read(path), language = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-language-cells.json');
const category = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-category-cells.json');

// Release-wide invariance is verified against the actual base in the owner receipt.
// Permanent tests bind Mercury's aggregate; they do not freeze unrelated future releases.
test('Mercury breakdown evidence preserves headline and price scope', () => {
  for (const source of [language, category]) {
    assert.equal(source.row_provenance[key].headline_or_rank_changed, false);
    assert.equal(source.row_provenance[key].original_row_price_changed, false);
  }
  assert.equal(evidence.headline_changed, false);
  assert.equal(evidence.original_row_price_changed, false);
});

test('Mercury cells copy the sanitized aggregate exactly, including zero competence and small-n families', () => {
  assert.equal(sha256(bytes(path)), sha);
  assert.deepEqual(language.systems[key].languages, evidence.languages);
  for (const dim of ['families', 'topics', 'usecases']) {
    assert.deepEqual(category.systems[key][dim], evidence[dim]);
    assert.deepEqual(category.systems[key].category_spoke_n[dim], Object.fromEntries(Object.entries(evidence[dim]).map(([k, c]) => [k, c.n])));
  }
  assert.equal(category.systems[key].category_n_items, 3003);
  assert.equal(category.systems[key].usecases.demand_forecasting.competence, 0);
  assert.deepEqual(category.systems[key].families.long_state, { competence: 0, coverage_n: 23, n: 23, operational_failure_n: 0, refusal_n: 23, response_n: 0 });
  assert.equal(category.systems[key].families.calibration.n, 22);
  for (const source of [language, category]) assert.equal(source.row_provenance[key].sha256, sha);
  const view = jevbenchCategoryView('v1.6.1', [key], { supplement: true });
  for (const dim of ['topics', 'usecases']) for (const [name, cell] of Object.entries(evidence[dim])) assert.deepEqual(view.systems[key][dim][name], [cell.competence, cell.n, cell.coverage_n]);
  const live = withLiveCategoryCells(read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json'));
  assert.deepEqual(live.systems[key].families, evidence.families);
  assert.deepEqual(live.systems[key].languages, evidence.languages);
});

test('All 23 languages, 7 topics and 20 use cases meet their thresholds on recorded counts', () => {
  for (const [dim, count, min, gate] of [['languages', 23, 64, 60], ['topics', 7, 109, 30], ['usecases', 20, 83, 30]]) {
    const cells = Object.values(evidence[dim]);
    assert.equal(cells.length, count, dim);
    assert.equal(Math.min(...cells.map((c) => c.coverage_n)), min, dim);
    assert.ok(cells.every((c) => Number.isFinite(c.competence) && c.coverage_n >= gate), dim);
  }
  for (const dim of ['languages', 'topics', 'usecases', 'families']) for (const cell of Object.values(evidence[dim])) {
    assert.equal(cell.n, cell.response_n + cell.refusal_n + cell.operational_failure_n);
    assert.equal(cell.coverage_n, cell.response_n + cell.refusal_n);
  }
  assert.deepEqual(evidence.gates, { languages23_ge60: true, topics7_usecases20_ge30: true });
  assert.equal(language.systems[key].language_target_complete, true);
  assert.equal(language.systems[key].languages_below_target60, 0);
  assert.equal(read('data/jevbench-radar-spoke-exceptions.json').some((x) => x.key === key), false);
  const view = jevbenchCategoryView('v1.6.1', [key], { supplement: true });
  validateRadarSpokeGate(view, [key], []);
});

test('L3 recorded completeness passes the ordinary 98% gate; 429s stay operational non-answers', () => {
  const L3 = evidence.pool_counts.L3;
  assert.equal(evidence.full_L3_denominator, 1418);
  assert.equal(evidence.merged_L3_recorded, 1416); assert.equal(L3.recorded, 1416);
  assert.equal(evidence.native_successes_L3, 1412); assert.equal(L3.official_status.answered_ok, 1412);
  assert.equal(L3.official_status.missing, 2);
  assert.ok(L3.recorded / evidence.full_L3_denominator >= 0.98);
  assert.equal(evidence.normal98pct_recorded_gate, true);
  // 1,416 recorded = 1,412 native answers + 3 input refusals + 1 recorded 429 (counted as a failure, never as an answer).
  assert.equal(L3.recorded - L3.official_status.answered_ok, 3 + 1);
  for (const p of ['S', 'L1', 'L2']) assert.equal(evidence.pool_counts[p].official_status.status, 'complete');
  assert.equal(language.systems[key].pool_ok.L3, 1412 - 297);
  for (const source of [language, category]) {
    const prov = source.row_provenance[key];
    assert.equal(prov.L3_denominator, 1418); assert.equal(prov.L3_recorded, 1416); assert.equal(prov.L3_native_successes, 1412);
    assert.equal(prov.L3_missing_records, 2); assert.equal(prov.L3_operational429_recorded, 1);
    assert.equal(prov.normal98pct_recorded_gate, true);
    assert.equal(prov.probability_equivalence_claimed, false);
    assert.equal(prov.historical_immutable_weights_equality_proven, false);
    assert.equal(source.systems[key].L3_complete_claim, false);
    assert.equal(source.systems[key].native_complete_claim, false);
    assert.equal(source.systems[key].new_full_S1200_API_exposure, false);
  }
});

test('Mercury discloses its S+P+L1+L2+L3 pools and meets the listed-row radar gate', () => {
  assert.equal(languageCoverage(language.systems[key]), 'S+P+L1+L2+L3');
  assert.equal(category.systems[key].category_pools, 'S+P+L1+L2+L3');
  const boards = listedRadarBoards();
  assert.ok(boards.open.includes(key));
  const view = jevbenchCategoryView('v1.6.1', boards.open, { supplement: true });
  assert.equal(view.categoryPools[key], 'S+P+L1+L2+L3');
  // Gate on the same addenda-aware view the page and release script use.
  validateRadarSpokeGate(listedRadarCategoryView(boards.open), boards.open, read('data/jevbench-radar-spoke-exceptions.json'));
});

test('The coverage note is visible on the language row and the compare radars, in plain public terms', () => {
  const note = language.systems[key].coverage_note;
  assert.equal(category.systems[key].coverage_note, note);
  for (const pattern of [/1,416 recorded observations on its 1,418 items/, /1,412 answers/, /three input refusals/, /operational non-answer/,
    /not imputed/, /98% recorded-completeness gate applies without exception/, /868 original free-route records/, /447 retained and 101 newly issued paid decisions/,
    /Inception Mercury Decide 2026-09-30/, /287 of 297 \(96\.63%\)/, /probabilities differ/, /0\.977543/, /historically measured weights and calibrator/, /unproven/,
    /original row price are unchanged/, /reviewed by an OpenAI model/]) assert.match(note, pattern);
  for (const source of [language, category]) assert.doesNotMatch(JSON.stringify(source.systems[key]), /Source\s?\d|retainedpaid|residualpaid|free868/i);
  const live = withLiveCategoryCells(read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json'));
  assert.equal(live.systems[key].language_coverage_note, note);
  const view = jevbenchCategoryView('v1.6.1', [key, 'openai-decisions', 'sage-1.3.0'], { supplement: true });
  assert.deepEqual(view.coverageNotes, { [key]: note });
  assert.equal(view.exposureNotes['openai-decisions'], L3_EXPOSURE_NOTES['openai-decisions']);
  assert.match(view.exposureNotes['openai-decisions'], /reviewed by an OpenAI model/);
  assert.deepEqual(jevbenchCategoryView('v1.6.1', [key]).coverageNotes, {});
  const board = bytes('components/JevBenchV16Board.tsx').toString();
  assert.match(board, /data-bh-language-coverage-note=\{s\.key\}/);
  assert.match(board, /data-bh-l3-exposure-note=\{s\.key\}/);
  assert.match(bytes('components/JevCompareV15.tsx').toString(), /categories!\.coverageNotes\?\.\[r\.key\]/);
});

test('Public handoff contains only aggregates', () => {
  const raw = bytes(path).toString();
  assert.doesNotMatch(raw, /"(?:item_ids?|question|gold|prediction|task_id|per_item|input|prompt)"|\/home\//i);
  assert.equal(evidence.system, key); assert.equal(evidence.method, 'O1S');
});
