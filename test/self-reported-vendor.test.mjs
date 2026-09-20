import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseScoreToken, parseComparisonBaseline, normalizeName, nameVariants,
  flattenHtmlTables, documentLines, verifyRow, mapIdentity, buildObservation,
  splitCells, locateColumn, carryReviewedDocuments,
} from '../lib/self-reported-vendor.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = async (p) => JSON.parse(await readFile(join(ROOT, p), 'utf8'));

const row = (over = {}) => ({
  model_name_as_written: 'Claude Fable 5.1',
  benchmark_name_as_written: 'SWE-bench Multilingual',
  benchmark_normalized: 'swe-bench-multilingual',
  benchmark_version: null,
  score: 89.1,
  score_as_written: '89.1',
  unit: 'percent',
  comparison_baseline: 'Fable 5.1 89.1; Fable 5 86.6; Opus 5 89.5',
  locator: 'Table 8.1.A, p. 2',
  basis_hint: 'vendor_claim_own_model',
  reported_by: 'Anthropic',
  setting: { reasoning_effort: 'max' },
  row_sha256: 'a'.repeat(64),
  source_url: 'https://example.invalid/card.pdf',
  publication_date: '2026-09-01',
  ...over,
});

const PAGE1 = 'Introduction\nSWE-bench Multilingual is described here.\n';
// A real release table: a group header over several columns, a column name printed over three
// lines, and a sentence above the table that repeats the model's name.
const PAGE2 = [
  'Claude Fable 5.1 is more capable than Fable 5.',
  '',
  ' Evaluation                      Fable family models            Other',
  '',
  '                                Claude          Claude          GPT-5.6 Sol',
  '                                Fable 5.1/      Fable 5/',
  '                                Mythos 5.1      Mythos 5',
  '',
  ' SWE-bench Pro                   81.2            80              79.2',
  '',
  ' SWE-bench Multilingual          89.1            86.6            89.5',
  '',
].join('\n');
const DOC = `${PAGE1}\f${PAGE2}`;

test('score tokens keep percent, dollar and thousands formatting', () => {
  assert.equal(parseScoreToken('56%'), 56);
  assert.equal(parseScoreToken('$2,992.34'), 2992.34);
  assert.equal(parseScoreToken('0.81'), 0.81);
  assert.equal(parseScoreToken('n/a'), null);
  assert.equal(parseScoreToken('1.2.3'), null);
});

test('a comparison baseline is an unordered set of the row\'s printed values', () => {
  assert.deepEqual(parseComparisonBaseline('Fable 5.1 89.1; Fable 5 86.6; Opus 5 89.5'), [89.1, 86.6, 89.5]);
  assert.equal(parseComparisonBaseline('single 12'), null, 'one value is not a comparison');
  assert.equal(parseComparisonBaseline(''), null);
});

test('names fold PDF punctuation but keep the characters that make a name specific', () => {
  assert.equal(normalizeName('SWE‑Bench  Verified'), 'swe-bench verified');
  assert.equal(normalizeName('τ²-Bench'), 'τ2-bench', 'a non-ASCII name must not collapse to "bench"');
  assert.deepEqual(nameVariants('Vending-Bench 2 (final balance)'), ['vending-bench 2 (final balance)', 'vending-bench 2']);
});

test('page numbers follow the form feeds of the captured text layer', () => {
  const lines = documentLines(DOC);
  assert.equal(lines.find((l) => l.line.startsWith(' Evaluation')).page, 2);
});

test('a published row is confirmed with its own comparison values', () => {
  const v = verifyRow(row(), DOC);
  assert.equal(v.ok, true);
  assert.equal(v.page, 2);
  assert.equal(v.page_matches_locator, true);
  assert.match(v.line, /^SWE-bench Multilingual/);
});

test('a value the document does not print in that row is rejected', () => {
  const v = verifyRow(row({ score: 91.4, score_as_written: '91.4', comparison_baseline: 'Fable 5 86.6; Opus 5 89.5' }), DOC);
  assert.equal(v.ok, false);
  assert.match(v.reason, /no line carries the benchmark name/);
});

test('a comparison value from a different row is rejected', () => {
  const v = verifyRow(row({ comparison_baseline: 'Fable 5 86.6; Opus 5 42.0' }), DOC);
  assert.equal(v.ok, false);
});

test('without comparison values a repeated number stays unverified', () => {
  const doc = '                      Fable 5.1   Fable 5   Opus 5\n'
    + ' Terminal-Bench 4.0    56%         56%       52%\n';
  const claim = (over) => row({ benchmark_name_as_written: 'Terminal-Bench 4.0', comparison_baseline: null, locator: 'p. 1', ...over });
  assert.equal(verifyRow(claim({ score: 56, score_as_written: '56%' }), doc).ok, false,
    'two columns hold 56, so the extraction could have read either');
  assert.equal(verifyRow(claim({ score: 52, score_as_written: '52%', model_name_as_written: 'Claude Opus 5' }), doc).ok, true);
});

test('a score that disagrees with what the document printed is rejected before any search', () => {
  assert.match(verifyRow(row({ score: 88 }), DOC).reason, /score_as_written/);
});

test('an HTML model card is read row by row, never cell by cell', () => {
  const html = '<table><tr><th>Benchmark</th><th>Qwen3.5-27B</th><th>Qwen3.6-27B</th></tr>'
    + '<tr><td>SWE-bench Verified</td><td>75.0</td><td>77.2</td></tr></table>';
  assert.equal(verifyRow(row({ model_name_as_written: 'Qwen3.6-27B', benchmark_name_as_written: 'SWE-bench Verified',
    score: 77.2, score_as_written: '77.2', comparison_baseline: 'Qwen3.5-27B 75.0; Qwen3.6-27B 77.2', locator: 'table' }), html).ok, true);
  assert.match(flattenHtmlTables(html), /\| SWE-bench Verified \| 75\.0 \| 77\.2 \|/);
  assert.equal(flattenHtmlTables('plain text'), 'plain text');
});

test('the identity map only accepts the benchmark versions it names', async () => {
  const map = await read('data/raw/benchmarks/self-reported-identity-map.json');
  assert.equal(mapIdentity({ benchmark_normalized: 'terminal-bench', benchmark_version: '4.0' }, map).benchmark_id, 'terminal-bench::4.0');
  assert.equal(mapIdentity({ benchmark_normalized: 'terminal-bench', benchmark_version: '2.1' }, map), null);
  assert.equal(mapIdentity({ benchmark_normalized: 'gpqa-diamond', benchmark_version: null }, map), null);
  assert.equal(mapIdentity({ benchmark_normalized: 'swe-bench-verified', benchmark_version: null }, map).benchmark_id,
    'swe-bench-verified::snapshot-2026-09-10');
});

test('every accepted identity names a real registry entry with a matching unit', async () => {
  const map = await read('data/raw/benchmarks/self-reported-identity-map.json');
  const entries = new Map((await read('data/raw/benchmarks/registry.json')).entries.map((e) => [e.id, e]));
  for (const accepted of map.accepted) {
    const entry = entries.get(accepted.benchmark_id);
    assert.ok(entry, `${accepted.benchmark_id} is not a registry identity`);
    assert.ok(accepted.rationale?.length > 40, `${accepted.benchmark_id} needs a recorded rationale`);
    if (accepted.unit_override) assert.equal(accepted.unit_override, entry.scoring.unit);
  }
  for (const excluded of map.excluded) assert.ok(excluded.reason?.length > 40);
});

test('an observation carries the basis, the provenance and no comparison pair', async () => {
  const entry = (await read('data/raw/benchmarks/registry.json')).entries
    .find((e) => e.id === 'swe-bench-multilingual::snapshot-2026-09-10');
  const capture = { retrieved_at: '2026-09-16T00:00:00+00:00', sha256: 'b'.repeat(64),
    file: 'data/raw/benchmarks/self-reported/2026-09-16/bb.gz', evidence: 'pdf_text_layer',
    document_sha256: 'c'.repeat(64), document_bytes: 16281258 };
  const observation = buildObservation(row(), { entry, mapEntry: { benchmark_id: entry.id }, capture,
    modelId: 'claude-fable-5.1::max', verification: verifyRow(row(), DOC) });
  assert.equal(observation.basis, 'self_reported');
  assert.equal(observation.comparison_key, null);
  assert.equal(observation.unit, entry.scoring.unit);
  assert.equal(observation.value, 89.1);
  assert.equal(observation.subject.model_id, 'claude-fable-5.1::max');
  assert.equal(observation.source.published_at, '2026-09-01');
  assert.match(observation.protocol, /self-reported by Anthropic/);
  assert.match(observation.source.locator, /original document sha256 ccc/);
});

test('the shipped candidates are self-reported, sourced from retained captures and never a comparison pair', async () => {
  const candidates = await read('data/raw/benchmarks/self-reported-candidates.json');
  const entries = new Map((await read('data/raw/benchmarks/registry.json')).entries.map((e) => [e.id, e]));
  assert.ok(candidates.observations.length > 0);
  for (const o of candidates.observations) {
    assert.equal(o.basis, 'self_reported');
    assert.equal(o.comparison_key, null);
    assert.ok(entries.has(o.benchmark_id));
    assert.equal(o.unit, entries.get(o.benchmark_id).scoring.unit);
    const stored = await readFile(join(ROOT, o.source.file));
    const captured = o.source.file.endsWith('.gz') ? gunzipSync(stored) : stored;
    assert.equal(createHash('sha256').update(captured).digest('hex'), o.source.sha256, `${o.id} does not cite a retained capture`);
    const legacyLocator = /matched line: /.test(o.source.locator) && o.source.locator.includes(String(o.value));
    // A hand-reviewed release-document ingestion (CR-98 StepFun, CR-85.2 DeepSeek) instead names the
    // printed row and the column the value sits under. The row it names must be the benchmark the
    // observation claims to be, so a locator cannot point at a neighbouring row.
    const row = o.source.locator.match(/row "([^"]+)"/);
    const namedLocator = Boolean(row) && /under "[^"]+"/.test(o.source.locator)
      && row[1].includes(entries.get(o.benchmark_id).name);
    assert.ok(legacyLocator || namedLocator, `${o.id} must record the row and column its value was found in`);
  }
  assert.equal(new Set(candidates.observations.map((o) => o.id)).size, candidates.observations.length);
});


test('a layout row splits on column gaps, a pipe row on its cells', () => {
  assert.deepEqual(splitCells(' SWE-bench Pro    81.2   80').map((c) => c.text), ['SWE-bench Pro', '81.2', '80']);
  assert.deepEqual(splitCells('| SWE-Bench Verified | 80.2 | - |').map((c) => c.text), ['SWE-Bench Verified', '80.2', '-']);
});

test('the column is read from a header printed over several lines, under its group header', () => {
  const lines = documentLines(DOC);
  const row = lines.findIndex((l) => l.line.includes('SWE-bench Multilingual   '));
  const found = locateColumn(lines, row, 89.1, 'Claude Fable 5.1');
  assert.equal(found.ok, true);
  assert.match(found.evidence, /Claude Fable 5\.1\/ Mythos 5\.1/);
  assert.equal(locateColumn(lines, row, 86.6, 'Claude Fable 5').ok, true, 'Fable 5 is its own column');
});

test('a value in another model\'s column is refused', () => {
  const lines = documentLines(DOC);
  const row = lines.findIndex((l) => l.line.includes('SWE-bench Multilingual   '));
  const wrong = locateColumn(lines, row, 89.5, 'Claude Fable 5.1');
  assert.equal(wrong.ok, false);
  assert.match(wrong.reason, /different column/);
});

test('a sentence above the table is not a column, and an unnamed model has none', () => {
  const lines = documentLines(DOC);
  const row = lines.findIndex((l) => l.line.includes('SWE-bench Multilingual   '));
  const absent = locateColumn(lines, row, 89.1, 'Kimi K2.6');
  assert.equal(absent.ok, false);
  assert.match(absent.reason, /no header naming this model/);
});

test('a folded HTML table aligns its columns from the right', () => {
  const html = '<table><tr><th>Benchmark</th><th>Kimi K2.6</th><th>Kimi K2.5</th></tr>'
    + '<tr><td>SWE-Bench Verified</td><td>80.2</td><td>76.8</td></tr></table>';
  const lines = documentLines(flattenHtmlTables(html));
  const row = lines.findIndex((l) => l.line.includes('SWE-Bench Verified'));
  assert.equal(locateColumn(lines, row, 76.8, 'Kimi K2.5').ok, true);
  assert.equal(locateColumn(lines, row, 80.2, 'Kimi K2.5').ok, false);
});

test('a row that names the model itself needs no header', () => {
  const lines = documentLines('Claude Mythos 5.1 scored 60.9% on Terminal-Bench 4.0.\n');
  assert.match(locateColumn(lines, 0, 60.9, 'Claude Mythos 5.1').evidence, /names Claude Mythos 5\.1 itself/);
});

test('every shipped candidate records the column its value was read from', async () => {
  const candidates = await read('data/raw/benchmarks/self-reported-candidates.json');
  for (const o of candidates.observations) {
    const legacy = /re-verified against our own capture: .*(column |names )/.test(o.protocol);
    const named = /under "[^"]+"/.test(o.source.locator);
    assert.ok(legacy || named, `${o.id} must record how the column was established`);
  }
});

// A collector re-run used to delete every hand-ingested release-document row: the scout extraction
// it rebuilds from was locked on 2026-09-16 and cannot produce CR-98's or CR-85.2's claims.
test('a rebuild carries the hand-ingested release documents instead of deleting them', async () => {
  const candidates = await read('data/raw/benchmarks/self-reported-candidates.json');
  const { documents } = await read('data/raw/benchmarks/self-reported/carried-documents.json');
  const urls = new Set(documents.map((d) => d.url));
  const carried = carryReviewedDocuments(candidates, documents, new Set());
  assert.equal(carried.observations.length, candidates.observations.filter((o) => urls.has(o.source.url)).length);
  assert.ok(carried.observations.length >= 59);
  // Each document's refusals and collections travel with its rows; nothing else does.
  assert.ok(carried.collections.every((c) => carried.observations.some((o) => o.benchmark_id === c.benchmark_id)));
  assert.ok(carried.rejected.every((r) => [...urls].some((url) => String(r.source_id).startsWith(url))));
  assert.ok(carried.observations.every((o) => o.basis === 'self_reported'));
});

test('the carry fails closed rather than losing a row quietly', async () => {
  const candidates = await read('data/raw/benchmarks/self-reported-candidates.json');
  const { documents } = await read('data/raw/benchmarks/self-reported/carried-documents.json');
  // A listed document with no rows left means they were already lost; that must stop a rebuild.
  assert.throws(() => carryReviewedDocuments(candidates, [...documents, { url: 'https://example.invalid/card' }], new Set()),
    /contributes no rows/);
  // A carried id the scout also produces would make the two populations disagree about one row.
  const one = candidates.observations.find((o) => documents.some((d) => d.url === o.source.url));
  assert.throws(() => carryReviewedDocuments(candidates, documents, new Set([one.id])), /collides with a scout row/);
});

test('every hand-ingested release document in the candidates file is on the carry list', async () => {
  const candidates = await read('data/raw/benchmarks/self-reported-candidates.json');
  const { documents } = await read('data/raw/benchmarks/self-reported/carried-documents.json');
  // The scout population is exactly what its own locked capture manifest holds; anything else in the
  // file came in by hand and has to be on the carry list, or the next rebuild deletes it.
  const lock = await read('data/raw/benchmarks/self-reported/lock.json');
  const manifest = await read(`${lock.capture_dir}/manifest.json`);
  const scoutSources = new Set(manifest.filter((r) => r.status === 200).map((r) => r.url));
  const listed = new Set(documents.map((d) => d.url));
  for (const o of candidates.observations) {
    const url = o.source.url;
    assert.ok(listed.has(url) || scoutSources.has(url), `${url} is either a scout source or on the carry list`);
  }
  // And the list must not name a document the scout already owns, or one rebuild would fight the next.
  for (const document of documents) assert.ok(!scoutSources.has(document.url), document.url);
});
