// D186 (2026-09-23): MCP Atlas restated one of its own row labels — "Nemotron 3 Ultra (xHigh)" became
// "Nemotron 3 Ultra (thinking)" — without re-running it. The daily arm had been failing closed since
// 2026-09-22 with "Prior public identities disappeared", which is the correct default: a label our last
// capture carried is gone, and a board that silently drops a row must never erase data quietly.
//
// It is not a withdrawal and not a second identity, so it is recorded as a restatement: the published row
// keeps its public ID and value under the new label, and the old label is republished as a *withheld*
// rejection carrying its locator. Without that second half the retained history states read the old
// label's absence as "no longer published" and bridge the very same measurement back as an estimate —
// 18 of them, at exactly 63.1 (the same trap D180 documented).
//
// These checks re-derive the claim from the two captures rather than trusting the record's prose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const readJson = async (name) => JSON.parse(await readFile(new URL(`../${name}`, import.meta.url), 'utf8'));
const BENCHMARK = 'mcp-atlas::snapshot-2026-09-21';
const ROW_ID = 'public:166ad482b48375ffcde7daff';

/** The board rows as the plan's `scale_swepro` parser reads them: one embedded entries array. */
const boardRows = (html) => {
  const chunks = [];
  for (const raw of html.matchAll(/<script[^>]*>self\.__next_f\.push\((\[.*?\])\)<\/script>/gs)) {
    const pair = JSON.parse(raw[1]);
    if (pair[0] === 1 && typeof pair[1] === 'string') chunks.push(pair[1]);
  }
  const found = [];
  const scan = (value) => {
    if (Array.isArray(value)) return value.forEach(scan);
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value.entries) && value.entries.length && 'model' in value.entries[0] && 'score' in value.entries[0]) found.push(value.entries);
    Object.values(value).forEach(scan);
  };
  for (const line of chunks.join('').split('\n')) {
    const cut = line.indexOf(':');
    if (cut < 0) continue;
    try { scan(JSON.parse(line.slice(cut + 1))); } catch { /* not a flight record */ }
  }
  assert.equal(found.length, 1, 'the plan requires exactly one embedded board array');
  return found[0];
};

const capture = async (file, sha256) => {
  const bytes = gunzipSync(await readFile(new URL(`../${file}`, import.meta.url)));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256, `capture digest: ${file}`);
  return boardRows(bytes.toString('utf8'));
};

test('the restatement record names a published row and carries both captures', async () => {
  const observations = await readJson('data/raw/benchmarks/public-observations.json');
  const records = observations.source_label_restatements ?? [];
  assert.equal(records.length, 1);
  const [record] = records;
  assert.equal(record.id, ROW_ID);
  assert.equal(record.benchmark_id, BENCHMARK);
  assert.equal(record.from, 'Nemotron 3 Ultra (xHigh)');
  assert.equal(record.to, 'Nemotron 3 Ultra (thinking)');
  assert.ok(record.reason.length > 80, 'a restatement states why it is not a withdrawal');
  for (const side of ['previous_source', 'first_seen']) {
    assert.match(record[side].url, /^https:\/\/labs\.scale\.com\/leaderboard\/mcp_atlas$/);
    assert.match(record[side].sha256, /^[0-9a-f]{64}$/);
  }

  // The row is published under the new label, with its identity and value untouched.
  const row = observations.observations.find((o) => o.id === ROW_ID);
  assert.equal(row.benchmark_id, BENCHMARK);
  assert.equal(row.subject.source_id, record.to);
  assert.equal(row.subject.name, record.to);
  assert.equal(row.value, 63.1);
  assert.equal(row.basis, 'measured');
  assert.equal(row.source.sha256, record.first_seen.sha256, 'the evidence shows the label we publish');
  assert.equal(row.source.locator, `scale_swepro; source row 25; ${record.to}; field score`);
  assert.equal(record.previous_locator, `scale_swepro; source row 25; ${record.from}; field score`);
});

test('the two captures differ in exactly one field of one row, and it is the label', async () => {
  const [record] = (await readJson('data/raw/benchmarks/public-observations.json')).source_label_restatements;
  const before = await capture(record.previous_source.file, record.previous_source.sha256);
  const after = await capture(record.first_seen.file, record.first_seen.sha256);
  assert.equal(before.length, 34);
  assert.equal(after.length, before.length, 'the board did not gain or lose a row');

  const differences = [];
  for (const [index, old] of before.entries()) {
    const now = after[index];
    for (const field of new Set([...Object.keys(old), ...Object.keys(now)])) {
      if (JSON.stringify(old[field]) !== JSON.stringify(now[field])) differences.push({ index, field, old: old[field], now: now[field] });
    }
  }
  assert.deepEqual(differences, [{ index: 25, field: 'model', old: record.from, now: record.to }]);

  // The same run, not a new one: the measurement and the board's own row metadata are unchanged.
  const row = after[25];
  assert.equal(row.score, 63.1);
  assert.equal(row.rank, 18);
  assert.equal(row.createdAt, '2026-09-17T15:00:58.000Z');
  assert.equal(row.deprecated, false);
});

test('the previous label is withheld, so the history bridge cannot republish the measurement', async () => {
  const [record] = (await readJson('data/raw/benchmarks/public-observations.json')).source_label_restatements;
  const scores = await readJson('data/raw/benchmarks/scores.json');
  const withheld = scores.rejected.filter((r) => r.withheld && r.locator === record.previous_locator);
  assert.equal(withheld.length, 1, 'exactly one withheld rejection carries the old locator');
  assert.equal(withheld[0].benchmark_id, BENCHMARK);
  assert.equal(withheld[0].source_id, record.from);
  // Only the locator may suppress it: a model_id here would withhold every retained value of the pair.
  assert.equal(withheld[0].model_id, null);
  assert.ok(scores.observations.every((o) => o.subject?.source_id !== record.from), 'the old label is not published');

  const dataset = await readJson('data/dataset.json');
  const estimates = dataset.benchmark_results.historical.estimates
    .filter((e) => e.benchmark_id === BENCHMARK && e.subject_name === record.from);
  assert.deepEqual(estimates, [], 'a restated label is not "no longer published"');
  const live = dataset.benchmark_results.observations.filter((o) => o.benchmark_id === BENCHMARK && o.value === 63.1);
  assert.equal(live.length, 1, 'one measurement, one row — not one measured and one estimated');
  assert.equal(live[0].subject.source_id, record.to);
});
