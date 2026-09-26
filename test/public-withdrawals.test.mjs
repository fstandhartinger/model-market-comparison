import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

// Each withdrawal must be provable from two committed captures of the same URL: the row is in the
// last one that had it and missing from the first one that did not.
const { withdrawals } = JSON.parse(readFileSync('data/raw/benchmarks/public-withdrawals.json', 'utf8'));
/** The Model cells of the page's single leaderboard table, in board order, as the page renders them. */
const modelCells = (html) => {
  const tables = html.match(/<table[\s\S]*?<\/table>/g) ?? [];
  assert.equal(tables.length, 1, 'a board named by its Model cells must have exactly one table');
  return (tables[0].match(/<tr[\s\S]*?<\/tr>/g) ?? []).slice(1)
    .map((tr) => (tr.match(/<td[\s\S]*?<\/td>/g) ?? [])[1])
    .filter(Boolean)
    .map((td) => td.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).join(' '));
};

const capture = (ref) => {
  const raw = gunzipSync(readFileSync(ref.file));
  assert.equal(createHash('sha256').update(raw).digest('hex'), ref.sha256, `${ref.file} digest`);
  return raw.toString('utf8');
};

test('every public withdrawal is one exact row, proven by its committed before/after captures', () => {
  assert.ok(withdrawals.length > 0);
  assert.equal(new Set(withdrawals.map((w) => w.id)).size, withdrawals.length);
  for (const w of withdrawals) {
    for (const key of ['benchmark_id', 'id', 'source_id', 'reason', 'reviewed_at', 'reviewed_by']) assert.ok(typeof w[key] === 'string' && w[key].trim(), `${w.id} ${key}`);
    assert.equal(w.last_seen.url, w.first_absent.url);
    assert.ok(w.last_seen.retrieved_at < w.first_absent.retrieved_at);
    const cell = `${w.source_id}`;
    assert.ok(capture(w.last_seen).includes(cell), `${w.id} present in last_seen`);
    // D219 (2026-09-26): a page may name a model outside its board — Vending-Bench 2 keeps a chart colour
    // variable (`--color-GPT-5.5: #059669`) for every model it ever ran — so a substring of the capture
    // proves nothing about the leaderboard. A record for such a page names the board's own Model cells in
    // the first_absent capture; absence is then read off the table itself, and a changed board fails closed.
    if (w.absent_from_table_model_cells) {
      assert.deepEqual(modelCells(capture(w.first_absent)), w.absent_from_table_model_cells, `${w.id} first_absent board`);
      assert.ok(!w.absent_from_table_model_cells.includes(cell), `${w.id} absent from the first_absent board`);
      assert.ok(modelCells(capture(w.last_seen)).includes(cell), `${w.id} on the last_seen board`);
    } else {
      assert.ok(!capture(w.first_absent).includes(cell), `${w.id} absent from first_absent`);
    }
  }
});
