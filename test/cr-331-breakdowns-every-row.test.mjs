// CR-331 (Florian 7 Oct 2026) — RELEASE GATE: no JevBench row ships without its breakdown aggregates. Every row on the
// live boards (v1.6.1 results + the API overlay rows of data/jevbench-api-a4-equated.json) must have (1) per-type x tier
// competence on its open and sealed items (the "Competence per request type" and "per tier" radars) and (2) subject-topic
// and use-case cells (the category radars). A new row without them fails here: add its cells to the v1.6.1 category
// artifact (self-hosted / full-set rows) or to jevbench-v1.6.1-api-rerun-cells.json (overlay rows; see
// scripts/jevbench-api-rerun-cells/README.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jevWithApiA4Rows } from '../lib/jevbench-scope.mjs';
import { jevV15CompareRow } from '../lib/jevbench-v15-board.mjs';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import { apiRerunCells, withApiRerunSplits, validateApiRerunCells, PENDING_TEXT } from '../lib/jevbench-api-rerun-cells.mjs';

const read = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url)));
const rel = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-results.json');
const carry = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-dated-carry.json').rows;
const a4 = read('data/jevbench-api-a4-equated.json');
const merged = jevWithApiA4Rows(rel, withApiRerunSplits(a4), new Map(carry.map((r) => [r.key, r])));
const keys = merged.systems.map((s) => s.key);
const view = jevbenchCategoryView('v1.6.1', keys, { supplement: true });

test('gate 1: every live row has per-type x tier competence on open and sealed items', () => {
  const bad = merged.systems.filter((s) => {
    const r = jevV15CompareRow(s);
    const types = Object.values(r.typeCc);
    return !types.some((t) => t.open != null) || !types.some((t) => t.sealed != null)
      || !Object.values(r.tierCc.open).some((v) => v != null) || !Object.values(r.tierCc.sealed).some((v) => v != null);
  }).map((s) => s.key);
  assert.deepEqual(bad, []);
});

test('gate 2: every live row has subject-topic and use-case cells in the compare view', () => {
  // Point release 1 of CR-331: rows whose sealed items are still being labelled carry labels_missing and an explicit
  // pending text; nothing else may be missing. Point release 2 empties this list.
  const pending = Object.entries(apiRerunCells.systems).filter(([, r]) => r.labels_missing).map(([k]) => k).sort();
  // Release 2 (v1.7.16): every overlay row is labelled; a pending row may never ship again.
  assert.deepEqual(pending, []);
  assert.deepEqual(Object.keys(view.missing).sort(), pending);
  for (const k of pending) assert.equal(view.missing[k], PENDING_TEXT);
  const dims = view.dims.map((d) => d.key);
  assert.deepEqual(dims, ['topics', 'usecases']);
  const bad = keys.filter((k) => !pending.includes(k) && dims.some((d) => Object.keys(view.systems[k]?.[d] ?? {}).length === 0));
  assert.deepEqual(bad, []);
});

test('overlay rows: every A4/A5/full-set overlay row of the equated file has an artifact entry', () => {
  const overlay = [...a4.rows, ...(a4.a5_rows ?? []), ...(a4.full_rows ?? [])].map((r) => r.key).sort();
  assert.deepEqual(Object.keys(apiRerunCells.systems).sort(), overlay);
  assert.equal(apiRerunCells.systems['openai-decisions'].coverage, 'A5+P');
  assert.equal(apiRerunCells.systems['instinct'].coverage, 'A4+P');
  assert.equal(apiRerunCells.systems['liquid-d1'].coverage, 'S+P');
});

test('A4/A5 rows: 600 items, split counts add up to 300 open + 300 sealed, raw values (no equating)', () => {
  for (const [key, row] of Object.entries(apiRerunCells.systems)) {
    if (row.coverage === 'S+P') continue;
    assert.equal(row.n_items, 600, key);
    const total = (set) => Object.entries(row.per_type_split).filter(([k]) => k.startsWith(`${set}|`))
      .reduce((s, [, c]) => s + Object.values(c.n).reduce((a, b) => a + b, 0), 0);
    assert.equal(total('open'), 300, key);
    assert.equal(total('sealed'), 300, key);
  }
  // OpenAI Decisions: the sealed per-type cells are the scorer's raw A5 values, not shifted by the equating offset.
  const d = merged.systems.find((s) => s.key === 'openai-decisions');
  assert.equal(d.intelligence.per_type_split['sealed|choice'].n.hard, 73);
  assert.ok(Math.abs(d.intelligence.per_type_split['open|choice'].cc - 72.5513) < 1e-3);
});

test('artifact carries aggregates only and no language cells', () => {
  assert.doesNotThrow(() => validateApiRerunCells(apiRerunCells));
  assert.throws(() => validateApiRerunCells({ ...apiRerunCells, systems: { x: { coverage: 'S+P', n_items: 1500, languages: {} } } }), /languages/);
  assert.throws(() => validateApiRerunCells({ ...apiRerunCells, systems: { x: { coverage: 'S+P', n_items: 1500, topics: { math: { n: 20, competence: 1, item_id: 'q' } } } } }), /item-level/);
});

test('compare rows of A4/A5 overlay rows carry their subset for the view note', () => {
  const r = jevV15CompareRow(merged.systems.find((s) => s.key === 'openai-decisions'));
  assert.deepEqual(r.subset, { tag: 'A5', nItems: 600 });
  assert.equal(jevV15CompareRow(merged.systems.find((s) => s.key === 'liquid-d1')).subset, null);
  assert.equal(jevV15CompareRow(merged.systems.find((s) => s.key === 'jev-1.13.0')).subset, null);
});
