// D201 (2026-09-25): a declared-PDF vendor document is captured by scripts/capture-vendor-documents.py,
// never queued to scripts/capture-benchmark-sources.py.
//
// The Claude Opus 5.5 system card is a 17.8 MB PDF. The generic capturer holds a 12 MB bound and
// retains original bytes, so every daily run read 12 MB of it, raised "Response exceeds 12MB bound",
// and reported all seven registry entries that name it as `source_unreachable_or_manual` — a false
// failure on every run since 2026-09-23, on the seven rows whose evidence is that same document's
// `pdftotext -layout` text layer. These checks pin the routing rule and the tie between it and the
// rows that depend on it, so a future PDF source cannot silently rejoin the 12 MB path.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vendorDocumentUrls, captureTargets, captureKey } from '../ops/daily/refresh-benchmarks.mjs';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const registry = json('data/raw/benchmarks/registry.json');
const scores = json('data/raw/benchmarks/scores.json');
const plan = json('data/raw/benchmarks/collection-plan.json');
const vendor = json('data/raw/benchmarks/vendor-candidates.json');

// The generic capturer's own bound, read from the script rather than restated, so this test follows
// a change to it instead of drifting from it.
const GENERIC_BOUND = Number(
  readFileSync('scripts/capture-benchmark-sources.py', 'utf8').match(/b=q\.read\((\d+)\)/)[1],
);

test('every registry entry that declares a PDF document is routed away from the 12MB capturer', () => {
  const routed = vendorDocumentUrls(registry.entries);
  const declaresPdf = registry.entries.filter((e) => /\bPDF\b/.test(e.how_to_collect?.format ?? ''));
  assert.ok(declaresPdf.length > 0, 'the registry still carries at least one declared-PDF source');
  for (const entry of declaresPdf) {
    assert.equal(entry.how_to_collect.command.includes('capture-vendor-documents.py'), true,
      `${entry.id}: a declared-PDF source states the document capturer as its command`);
    assert.ok(routed.has(entry.primary_url), `${entry.id}: ${entry.primary_url} is routed to the document capturer`);
  }
});

test('a published row whose evidence is a PDF text layer has its source routed to the document capturer', () => {
  const routed = vendorDocumentUrls(registry.entries);
  // The seven system-card rows: their registry entry declares a PDF, so the daily must be able to
  // fetch the same document the row pins. Before this rule they were unreachable on every run.
  const pdfRows = scores.observations.filter((o) => {
    const entry = registry.entries.find((e) => e.id === o.benchmark_id);
    return entry && /\bPDF\b/.test(entry.how_to_collect?.format ?? '');
  });
  assert.ok(pdfRows.length >= 7, `published rows depend on a PDF document: ${pdfRows.length}`);
  for (const row of pdfRows) {
    assert.ok(routed.has(row.source.url), `${row.id}: ${row.source.url} is routed to the document capturer`);
  }
});

test('the routing rule reads the recipe, not the URL', () => {
  const entry = (how, primary_url = 'https://example.test/doc') => ({ id: 'x::1', primary_url, how_to_collect: how });
  const pdf = { command: 'python3 scripts/capture-vendor-documents.py URL_LIST.json CAPTURE_DIR', format: 'Vendor system card PDF (pdftotext -layout text layer)' };
  assert.deepEqual([...vendorDocumentUrls([entry(pdf)])], ['https://example.test/doc']);
  // A vendor document that is not a PDF stays on the generic path: its bytes are retained as they are.
  assert.deepEqual([...vendorDocumentUrls([entry({ ...pdf, format: 'Anthropic launch post HTML table' })])], []);
  // A PDF format alone does not move a source whose recipe names another collector.
  assert.deepEqual([...vendorDocumentUrls([entry({ command: 'python3 scripts/capture-benchmark-sources.py U C', format: 'PDF' })])], []);
  assert.deepEqual([...vendorDocumentUrls([{ id: 'y::1' }, null])], [], 'an entry without a recipe is not routed');
  // "PDF" is matched as a word, so a URL or prose that merely contains those letters cannot route a source.
  assert.deepEqual([...vendorDocumentUrls([entry({ ...pdf, format: 'HTML table rendered by pdfmaker' })])], []);
});

// The defect itself: the document URL reached the 12 MB capturer's queue. These checks are on the
// real registry and plan, so they fail again the day a PDF source rejoins that queue.
test('the run queues no declared-PDF document to the 12MB capturer', () => {
  const { urls, documentUrls } = captureTargets({ registry, plan, vendor });
  assert.ok(documentUrls.size > 0, 'at least one document is routed');
  for (const url of documentUrls) {
    assert.equal(urls.has(url), false, `${url} must not be queued to scripts/capture-benchmark-sources.py`);
  }
});

test('routing a document removes that one URL from the generic queue and nothing else', () => {
  const { urls, documentUrls } = captureTargets({ registry, plan, vendor });
  // The same plan with the routing rule switched off is what the daily did before D201.
  const before = captureTargets({
    registry: { ...registry, entries: registry.entries.map((e) => ({ ...e, how_to_collect: { ...e.how_to_collect, format: 'x' } })) },
    plan, vendor,
  }).urls;
  assert.equal(before.size - urls.size, documentUrls.size, 'exactly the routed documents left the generic queue');
  const removed = [...before.keys()].filter((k) => !urls.has(k));
  assert.deepEqual(removed.sort(), [...documentUrls].sort());
  for (const [key, value] of urls) assert.deepEqual(value, before.get(key), `${key} is queued unchanged`);
});

test('a routed document is larger than the generic bound, which is why it is routed', () => {
  // The recorded document length of the capture the seven rows pin. The text layer we retain is
  // 456,835 bytes; the document itself is 17.8 MB, so the generic capturer can only ever truncate it.
  assert.equal(GENERIC_BOUND, 12_000_000);
  const card = scores.observations.find((o) => o.benchmark_id === 'anthropic-aa-briefcase-v1-1::1.1');
  assert.equal(card.source.url, 'https://www.anthropic.com/claude-opus-5-5-system-card');
  assert.ok(vendorDocumentUrls(registry.entries).has(card.source.url));
  const receipt = json('test/fixtures/d201-vendor-document-manifest.json')[0];
  assert.ok(receipt.document_bytes > GENERIC_BOUND, `${receipt.document_bytes} bytes against a ${GENERIC_BOUND} bound`);
});

// The two capture scripts must agree on the receipt, because `refreshBenchmarks` keys both into one
// map and decides each source's health from `status === 200`. The fixture is the real manifest of a
// capture of the system card run on 2026-09-25.
test('a document receipt is the shape the run keys and reads health from', () => {
  const receipt = json('test/fixtures/d201-vendor-document-manifest.json')[0];
  assert.equal(captureKey(receipt), 'https://www.anthropic.com/claude-opus-5-5-system-card');
  assert.equal(receipt.status, 200, 'a reachable document reports the HTTP status, so the entry reads as reachable');
  for (const field of ['url', 'retrieved_at', 'file', 'sha256', 'bytes', 'final_url']) {
    assert.ok(receipt[field] !== undefined, `the generic capturer's ${field} is present on a document receipt too`);
  }
  // The retained evidence is the text layer, not the PDF, and the document's own identity is kept
  // beside it so the pinned bytes can be re-derived from the vendor's file.
  assert.equal(receipt.evidence, 'pdf_text_layer');
  assert.match(receipt.extraction, /^pdftotext -layout/);
  // What makes this worth routing: the seven published rows pin exactly this text layer's sha256.
  const pinned = scores.observations.filter((o) => o.source?.sha256 === receipt.sha256);
  assert.equal(pinned.length, 7, `rows pinned to the system card text layer: ${pinned.length}`);
  for (const row of pinned) assert.equal(row.source.url, receipt.url);
});
