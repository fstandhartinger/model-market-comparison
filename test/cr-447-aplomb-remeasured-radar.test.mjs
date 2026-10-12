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
// CR-447: Aplomb 1's original pin was deleted upstream; supplements re-measured on revision d6743291
// (P300 parity 98 % vs the original answers), headline unchanged.
const KEY = 'aplomb-1';
const PATH = 'ops/evidence/aplomb-1-language-category-complete-20261012.json';
const evidence = read(PATH);

test('CR-447 aplomb-1: cells copy the public aggregate exactly and keep headline scope', () => {
  assert.equal(evidence.system, KEY); assert.equal(evidence.method, 'O1S');
  assert.deepEqual(language.systems[KEY].languages, evidence.languages);
  for (const dim of ['families', 'topics', 'usecases']) assert.deepEqual(category.systems[KEY][dim], evidence[dim]);
  for (const source of [language, category]) {
    const prov = source.row_provenance[KEY];
    assert.equal(prov.sha256, sha256(bytes(PATH))); assert.equal(prov.aggregate_artifact, PATH);
    assert.equal(prov.headline_or_rank_changed, false); assert.equal(prov.supplement_model_revision, 'd6743291');
    assert.ok(prov.p300_parity_vs_original_pct >= 95);
  }
});

test('CR-447 aplomb-1: full radar, disclosed revision, no exception left', () => {
  for (const [dim, count, gate] of [['languages', 23, 60], ['topics', 7, 30], ['usecases', 20, 30]]) {
    const cells = Object.values(evidence[dim]);
    assert.equal(cells.length, count, dim);
    assert.ok(cells.every((c) => Number.isFinite(c.competence) && c.coverage_n >= gate), dim);
  }
  assert.equal(languageCoverage(language.systems[KEY]), 'S+P+L1+L2+L3');
  assert.match(language.systems[KEY].coverage_note, /revision d6743291/);
  assert.match(language.systems[KEY].coverage_note, /Headline, rank, Composite and pricing are unchanged/);
  assert.equal(read('data/jevbench-radar-spoke-exceptions.json').some((x) => x.key === KEY), false);
  validateRadarSpokeGate(jevbenchCategoryView('v1.6.1', [KEY], { supplement: true }), [KEY], []);
  const boards = listedRadarBoards();
  validateRadarSpokeGate(listedRadarCategoryView(boards.open), boards.open, read('data/jevbench-radar-spoke-exceptions.json'));
});
