import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildBenchmarkMatrix, cellHref } from '../lib/benchmark-matrix.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';

const taxonomy = JSON.parse(readFileSync(new URL('../data/benchmark-taxonomy.json', import.meta.url)));
const dataset = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url)));

// CR-1.8 (review gate 213002Z): Epoch ECI rows used to link to the model page, which shows no source or date.
test('CR-1.8: every matrix row, including the Epoch ECI model-field rows, links to the result detail page', () => {
  const matrix = buildBenchmarkMatrix(buildBenchmarkView(dataset), dataset, taxonomy);
  const field = matrix.rows.filter((r) => !r.ranking);
  assert.deepEqual(field.map((r) => r.key).sort(), ['epoch_eci', 'epoch_eci_software']);
  for (const row of matrix.rows) {
    const href = new URL(cellHref(row, 'm::x', ['m::x', 'n::y'], true), 'https://x.test');
    assert.equal(href.pathname, '/benchmarks/result');
    assert.equal(href.searchParams.get('axis'), row.id);
    assert.equal(href.searchParams.get('model'), 'm::x');
    assert.equal(href.searchParams.get('models'), 'm::x,n::y');
    assert.equal(href.searchParams.get('pinned'), '1');
  }
});
