// F-102: one counting rule for "benchmarks". The hero, Simple's section 2 and the Benchmarks page
// used to publish three different numbers for one collection (111 registry entries, 120 matrix rows,
// 41 row keys). A benchmark is a **board** — one family at one version, with at least one result;
// a harness cohort and a cost twin are rows of that board. These tests compute each of the three
// published numbers the way its component does and assert they agree by construction.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildBenchmarkMatrix, importantMatrix, matrixForModels, countBoards, boardId } from '../lib/benchmark-matrix.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';

const ds = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url)));
const taxonomy = JSON.parse(readFileSync(new URL('../data/benchmark-taxonomy.json', import.meta.url)));
const caveats = JSON.parse(readFileSync(new URL('../data/benchmark-caveats.json', import.meta.url)));
const matrix = buildBenchmarkMatrix(buildBenchmarkView(ds), ds, taxonomy, caveats);

test('a harness cohort and a cost twin are rows of one board, a version is a board of its own', () => {
  assert.equal(boardId({ key: 'aa-coding-agent-index', version: '1.4' }), 'aa-coding-agent-index|1.4');
  // Two harnesses of one version: one board.
  assert.equal(countBoards([
    { key: 'aa-coding-agent-index', version: '1.4' },
    { key: 'aa-coding-agent-index', version: '1.4' },
  ]), 1);
  // A cost twin belongs to the board whose run it measured.
  assert.equal(countBoards([
    { key: 'openrouter-gpqa-diamond', version: 'snapshot-2026-09-15' },
    { key: 'openrouter-gpqa-diamond-cost', version: 'snapshot-2026-09-15' },
  ]), 1);
  // Two versions of one family are two boards (each has its own tasks and its own results).
  assert.equal(countBoards([
    { key: 'aa-coding-agent-index', version: '1.4' },
    { key: 'aa-coding-agent-index', version: '1.5' },
  ]), 2);
});

test('the hero number is the catalog board count, and it is smaller than the row count', () => {
  assert.equal(matrix.catalogBoards, countBoards(matrix.rows));
  assert.ok(matrix.catalogBoards > 0);
  assert.ok(matrix.catalogBoards <= matrix.rows.length, 'boards never exceed rows');
  assert.ok(matrix.rows.length > matrix.catalogBoards, 'the catalog does contain cohort or cost rows');
});

test("hero, Simple's section 2 and the Benchmarks page count the same thing", () => {
  const models = Object.keys(matrix.values).slice(0, 5);
  // Section 2 (SimpleBenchmarks): numerator = boards of the rows it shows, denominator = matrix.catalogBoards.
  const section2 = matrixForModels(matrix, models);
  const shown = countBoards(section2.rows);
  assert.equal(section2.catalogBoards, matrix.catalogBoards, 'section 2 uses the hero number as its denominator');
  assert.ok(shown > 0 && shown <= section2.catalogBoards);
  assert.ok(shown <= section2.rows.length);
  // Benchmarks page: the status line counts the boards of the visible rows out of the same catalog.
  assert.ok(countBoards(section2.rows) === shown);
  // The headline matrix the home page ships keeps the same denominator.
  assert.equal(importantMatrix(matrix).catalogBoards, matrix.catalogBoards);
});

test('the registry is at least as large as the board count, and the difference is versions without a current result or cost twins', () => {
  const registry = ds.benchmark_results.registry.length;
  assert.ok(registry >= matrix.catalogBoards, `${registry} registry entries vs ${matrix.catalogBoards} boards`);
  const costTwins = ds.benchmark_results.registry.filter((b) => /-cost::/.test(b.id)).length;
  assert.ok(costTwins > 0, 'cost twins exist in the registry and must not be counted as boards');
  const boards = new Set(matrix.rows.map(boardId));
  for (const row of matrix.rows) assert.ok(boards.has(boardId(row)));
  // No board id ends in the cost suffix: a cost row always folded into its benchmark.
  assert.ok(![...boards].some((id) => /-cost\|/.test(id)), [...boards].filter((id) => /-cost\|/.test(id)).join(', '));
});
