import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import board from '../data/jevbench-context-length-board.json' with { type: 'json' };
import frozen from '../data/jevbench-context-length.json' with { type: 'json' };

const src = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// Florian 16 Oct 2026: useful /jev-models features lost with v1.6.0 return on the live boards.
test('live boards render the context-length views, the cost section and an open 3D view', () => {
  const v16 = src('components/JevBenchV16Board.tsx');
  assert.match(v16, /\{live && <JevContextLazy board=\{\{ scope,/);
  assert.match(v16, /\{live && <DecisionCosts scope=\{scope\} rows=/);
  assert.match(v16, /ESTIMATE_KINDS = new Set\(\['estimate', 'estimated', 'mixed'\]\)/);
  assert.match(v16, /id=\{live \? 'jev16-costs-note' : 'jev-costs'\}/, 'one #jev-costs target per page');
  assert.match(v16, /!hiddenApi.has\(s.key\)\)\n?\s*\.map\(\(s\) => \(\{ key: s.key, system: s.display/);
  assert.match(v16, /data-bh-jev15-cost-unit-panel/);
  assert.match(v16, /pricing: live \? '#jev-costs'/);
  const charts = src('components/JevBenchV16Charts.tsx');
  assert.match(charts, /useState\(pareto\)/, 'live boards (pareto) open the 3D view by default; archived pages keep it folded');
  assert.match(charts, /\{!pareto && toggle3d\}/, 'archived pages keep the published toggle above the panel');
  const lazy = src('components/JevContextLazy.tsx');
  assert.match(lazy, /live \? import\('\.\.\/data\/jevbench-context-length-board\.json'\) : import\('\.\.\/data\/jevbench-context-length\.json'\)/);
});

test('archived release pages keep the frozen v1.4.1 context dataset', () => {
  assert.equal(frozen.sourceDataset, 'JevBench v1.4.1 public split');
  assert.equal(frozen.capacitySystems.length, 82);
});

test('board context dataset: sourced limits, reconciled current-draw length rows, aggregates only', () => {
  assert.match(board.sourceDataset, /^JevBench v1\.6\.21 public items/);
  assert.equal(board.publicItems, 300);
  const keys = board.capacitySystems.map((row) => row.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const row of frozen.capacitySystems) assert.ok(keys.includes(row.key), `${row.key} kept from v1.4.1`);
  for (const row of board.capacitySystems) {
    assert.ok(!String(row.sourceUrl ?? '').includes('benchmarkheaven.com'), `${row.key}: our own site is not a source`);
    if (row.maxContextTokens == null) assert.equal(row.type, 'Unknown', `${row.key}`);
    else { assert.ok(row.sourceUrl, `${row.key} needs its primary source`); assert.ok(row.maxContextTokens > 0); assert.ok(row.sourceSha256 || frozen.capacitySystems.some((f) => f.key === row.key), `${row.key} new rows carry a source hash`); }
  }
  assert.ok(board.lengthSystems.length >= 20);
  assert.deepEqual(board.bucketLabels, frozen.bucketLabels);
  for (const row of board.lengthSystems) {
    assert.equal(row.outcomes, 300);
    assert.equal(row.buckets.reduce((sum, b) => sum + b.n, 0), row.lengthCoverage);
    assert.ok(row.lengthCoverage <= 300);
    assert.ok(row.buckets.every((b) => b.correct >= 0 && b.correct <= b.n));
  }
  assert.equal(board.longPolicySystems.length, 0, 'only 3 long public items on this draw: no long-input block');
  const text = JSON.stringify(board);
  for (const marker of ['jevbench-sealed', 'task_id', 'v16-', 'gold answer', 'question text']) assert.ok(!text.includes(marker), marker);
});
