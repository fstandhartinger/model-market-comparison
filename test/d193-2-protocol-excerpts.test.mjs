// D193.2, 2026-09-25. `scan-protocol-excerpts.mjs` found 16 references in the state D193 repaired:
// the daily protocol guard demands the excerpt verbatim (their extracted text is over the
// 60,000-byte bound) and it is not in the source, so the board fails on any day its rows change.
// Two of those groups are repaired here; the rest are filed in PROGRESS.md because each needs a
// judgement the guard exists to force, not an edit.
//
//   * `lisanbench::0.2.0` quoted `core.json` with a space after every colon. The file is compact JSON
//     with none, so the excerpt was hand-typed and could never match — but the values it names (50
//     starting words, that exact SCOWL dictionary) are current and are real configuration, so the
//     entry now pins them verbatim. `num_models` is deliberately left out of the pin: it rises every
//     time LisanBench adds a model, and a guard that fires on a new model is the bug again.
//     `rankings.json` is 1.39 MB of per-word rows and stop reasons with no prose in it at all, so it
//     becomes a field locator in the `literal field` form `protocol()` excludes from a packet.
//   * The four `matharena-*` competition tables quoted a raw HTML attribute fragment, with plain
//     quotes, against a payload that JSON-escapes its HTML — and the guard compares against the
//     *extracted* text, not the capture. It failed for two mechanical reasons at once. Checked
//     first, because D193.3 showed a broken excerpt can be hiding a real change: it is not. The
//     `Accuracy (± 95% CI)` column and its normal-approximation tooltip are still in all four
//     captures, byte for byte. So these become field locators too, and the column identity stays
//     enforced where it already was — `require_header` in the collection plan.
//
// The captures are the ones the 2026-09-24T19:20Z run took, retained with their receipts at
// data/raw/benchmarks/daily-evidence/2026-09-25-d193-2/. Every mutation below is a failure probe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { protocolSourceContent } from '../ops/daily/refresh-benchmarks.mjs';

const repo = new URL('..', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, repo), 'utf8'));
const registry = read('data/raw/benchmarks/registry.json');
const plan = read('data/raw/benchmarks/collection-plan.json');
const captures = read('data/raw/benchmarks/daily-evidence/2026-09-25-d193-2/manifest.json');

const MATHARENA = ['matharena-apex::2025', 'matharena-apex-shortlist::2025',
  'matharena-hmmt::2025-11', 'matharena-hmmt::2026-02'];
// Six entries shared a second `competitions` reference whose excerpt was also raw HTML. It now
// quotes the page's own text — board name, Deprecated badge and problem count — and stops before the
// model count, which rises whenever MathArena evaluates another model.
const BADGED = [...MATHARENA, 'matharena-aime::2026', 'matharena-usamo::2026'];
const ENTRIES = ['lisanbench::0.2.0', ...MATHARENA];
const ACCURACY_COLUMN = 'Accuracy (± 95% CI)';

const raw = new Map(), bodies = new Map();
for (const c of captures) {
  const bytes = gunzipSync(readFileSync(new URL(c.file, repo)));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), c.sha256,
    `retained capture no longer matches its receipt: ${c.url}`);
  raw.set(c.url, bytes.toString('utf8'));
  bodies.set(c.url, execFileSync('python3', ['ops/daily/public-candidate.py', 'text', c.file],
    { cwd: repo, encoding: 'utf8', maxBuffer: 32_000_000 }));
}

const entry = (id) => {
  const e = registry.entries.find((x) => x.id === id);
  assert.ok(e, `${id}: registry entry`);
  return e;
};
const packetReferences = (entry) =>
  (entry.evidence ?? []).filter((s) => !s.source_sha256 && !/literal field/.test(s.excerpt ?? ''));
const payloadReferences = (entry) =>
  (entry.evidence ?? []).filter((s) => /literal field/.test(s.excerpt ?? '') && bodies.has(s.url));

test('D193.2: every reviewed reference of the five entries resolves and quotes its own source', () => {
  for (const id of ENTRIES) {
    const references = packetReferences(entry(id)).filter((r) => bodies.has(r.url));
    assert.ok(references.length >= 2, `${id}: expected at least two reviewed references in this set`);
    for (const reference of references) {
      const body = bodies.get(reference.url);
      assert.doesNotThrow(() => protocolSourceContent(id, reference, body), `${id}: ${reference.url}`);
      // Forced, so a source growing past the bound cannot reopen this.
      assert.equal(protocolSourceContent(id, { ...reference, review_content: 'excerpt' }, body),
        reference.excerpt, `${id}: ${reference.url} does not quote its own source`);
    }
  }
});

test('D193.2: the LisanBench pin states the configuration and leaves the model count out of it', () => {
  const core = entry('lisanbench::0.2.0').evidence
    .find((s) => s.url === 'https://lisanbench.com/data/core.json');
  const spec = plan.entries.find((e) => e.benchmark_id === 'lisanbench::0.2.0').parser.require;
  assert.match(core.excerpt, /"num_words":50/);
  assert.ok(core.excerpt.includes(`"words_file":"${spec.words_file}"`),
    'the pin names the dictionary the collection plan requires');
  assert.equal(spec.num_words, 50, 'the plan still requires the same 50-word set');
  // The volatile field: pinning it would fail the board every time LisanBench adds a model.
  assert.ok(!core.excerpt.includes('num_models'), 'num_models is deliberately not pinned');
  assert.match(bodies.get('https://lisanbench.com/data/core.json'), /"num_models":\d+/,
    'the capture does carry num_models, so leaving it out is a choice and not an absence');
});

test('D193.2: the MathArena accuracy column really is in all four captures, tooltip and all', () => {
  const header = plan.entries.find((e) => e.benchmark_id === 'matharena-apex::2025').parser.require_header;
  assert.ok(header.includes(ACCURACY_COLUMN), 'the collection plan still requires this exact column');
  for (const id of MATHARENA) {
    const table = payloadReferences(entry(id)).find((s) => s.url.includes('/competition_tables/'));
    assert.ok(table, `${id}: the competition table is a payload reference`);
    assert.ok(table.excerpt.startsWith(`"${ACCURACY_COLUMN}"`), `${id}: the locator names the column`);
    // The payload JSON-escapes its HTML, so this is the form the column really takes in the bytes.
    const body = raw.get(table.url);
    // The payload JSON-escapes non-ASCII too, so ± is the six-character sequence \u00b1 in the bytes.
    assert.ok(body.includes('>Accuracy (\\u00b1 95% CI)</th>'), `${id}: the column header is in the capture`);
    assert.ok(body.includes('together with a 95% confidence interval obtained with the normal approximation.'),
      `${id}: the normal-approximation tooltip is unchanged`);
  }
});

test('D193.2: the value payloads stay out of the review packet and name a real field', () => {
  const rankings = JSON.parse(bodies.get('https://lisanbench.com/data/rankings.json'));
  const lisan = payloadReferences(entry('lisanbench::0.2.0'));
  assert.equal(lisan.length, 1, 'rankings.json is the entry\'s only excluded payload');
  assert.ok(!packetReferences(entry('lisanbench::0.2.0')).includes(lisan[0]));
  assert.ok(Object.hasOwn(rankings, 'per_word'), 'per_word is really a field of the capture');
  assert.ok(Array.isArray(rankings.per_word) && rankings.per_word.length > 1000,
    'and it is the bulk of the payload, which is why it is not read to a reviewer');
  for (const id of MATHARENA) {
    for (const p of payloadReferences(entry(id))) {
      assert.ok(!packetReferences(entry(id)).includes(p), `${id}: ${p.url} is not reviewed`);
    }
  }
});

test('D193.2: each Deprecated badge pin quotes the page and agrees with the plan\'s problem count', () => {
  const comps = 'https://matharena.ai/competitions';
  const text = bodies.get(comps).replace(/\s+/g, ' ');
  for (const id of BADGED) {
    const ref = entry(id).evidence.find((s) => s.url === comps && /Deprecated/.test(s.excerpt));
    assert.ok(ref, `${id}: a Deprecated badge reference`);
    const problems = plan.entries.find((e) => e.benchmark_id === id).parser.require_problems;
    assert.match(ref.excerpt, new RegExp(`Deprecated ${problems} problems`),
      `${id}: the pin states the problem count the plan requires`);
    assert.ok(text.includes(ref.excerpt), `${id}: the pin is verbatim in the page`);
    // The volatile half: a new model evaluation must not fail the board.
    assert.ok(!/\d+ models/.test(ref.excerpt), `${id}: the model count is deliberately not pinned`);
    assert.match(text.slice(text.indexOf(ref.excerpt)), /^[^]*?\d+ models/,
      `${id}: the page does state a model count right after the pin, so leaving it out is a choice`);
  }
});

test('D193.2: reformatting, a changed dictionary and a dropped column all still fail closed', () => {
  const coreUrl = 'https://lisanbench.com/data/core.json';
  const core = { ...entry('lisanbench::0.2.0').evidence.find((s) => s.url === coreUrl),
    review_content: 'excerpt' };
  const body = bodies.get(coreUrl);
  assert.doesNotThrow(() => protocolSourceContent('lisanbench::0.2.0', core, body));
  // A different word set.
  assert.throws(() => protocolSourceContent('lisanbench::0.2.0', core,
    body.replace('"num_words":50', '"num_words":75')), /methodology passage changed/);
  // A different dictionary.
  assert.throws(() => protocolSourceContent('lisanbench::0.2.0', core,
    body.replace('scowl_2026_02_25', 'scowl_2026_08_01')), /methodology passage changed/);
  // And the shape that started D193: a description of the payload offered as a passage.
  for (const note of ['"num_models": 154, "num_words": 50',
    'per_word: 7700 rows (154 models x 50 starting words); stop_reasons: one entry per trial']) {
    assert.throws(() => protocolSourceContent('probe', { excerpt: note, review_content: 'excerpt' }, body),
      /methodology passage changed/, `a payload description must not pass as a passage: ${note.slice(0, 40)}`);
  }
});
