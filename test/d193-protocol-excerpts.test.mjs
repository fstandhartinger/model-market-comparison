// D193, 2026-09-24. `protocolSourceContent` supplies a long primary source to the daily protocol
// reviewer only through `reference.excerpt`, and requires that excerpt to appear verbatim in today's
// capture. Six entries — the four `ugi*` boards and both `frontiercode*` boards — carried editorial
// locator notes there instead of source text ("Exact score column UGI 🏆", "data.json v1_1: 36
// models, …"), so every run whose rows had changed failed with "methodology passage changed or
// unavailable in a large primary page". The symptom looked intermittent only because `protocol()`
// runs for a benchmark whose rows changed: these six failed exactly on the days their numbers moved.
//
// The repair separates the two kinds of reference these entries hold:
//
//   * The oversized payloads — the 665 KB results CSV and the 78 KB leaderboard data.json — are
//     results files and carry no methodology prose at all. Their excerpts are now field locators in
//     the `literal field` form `protocol()` already excludes from a review packet (the same form the
//     AA Flight-row references use). Nothing is lost: `protocol()` only runs after the rows have
//     parsed and changed, and the collector raises on a missing `value_field`, so the named column
//     is proven to exist before the review starts.
//   * The real protocol sources — the Space's own `app.py` and cognition.com/frontiercode — now pin
//     a verbatim passage of their own text. `app.py` extracts to 58,689 bytes against the
//     60,000-byte bound, so this is not hypothetical: the next edit to that file crosses it.
//
// The captures below are the ones the failing 2026-09-24T19:20Z run took, retained byte-for-byte at
// data/raw/benchmarks/daily-evidence/2026-09-24-d193/ with their receipts. The mutations are
// synthetic failure probes; none of them is a claim about a source.
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
const captures = read('data/raw/benchmarks/daily-evidence/2026-09-24-d193/manifest.json');

const ENTRIES = ['ugi::snapshot-2026-09-10', 'ugi-natint::snapshot-2026-09-10',
  'ugi-willingness::snapshot-2026-09-10', 'ugi-writing::snapshot-2026-09-10',
  'frontiercode::1.1', 'frontiercode-cost::1.1'];
// The two references that hold nothing but values. Named here so that moving one back into the
// review packet is a test failure and not a silent change of what a reviewer is asked to judge.
const PAYLOADS = ['https://huggingface.co/spaces/DontPlanToEnd/UGI-Leaderboard/raw/main/ugi-leaderboard-data.csv',
  'https://cognition.com/data/frontiercode-leaderboard/data.json'];

/** The body the daily run hands to a protocol review: this capture through the same extractor. */
const bodies = new Map(captures.map((c) => {
  const raw = gunzipSync(readFileSync(new URL(c.file, repo)));
  assert.equal(createHash('sha256').update(raw).digest('hex'), c.sha256,
    `retained capture no longer matches its receipt: ${c.url}`);
  return [c.url, execFileSync('python3', ['ops/daily/public-candidate.py', 'text', c.file],
    { cwd: repo, encoding: 'utf8', maxBuffer: 16_000_000 })];
}));

/** `protocol()`'s own reference filter, so this test reads the packet it really builds. */
const packetReferences = (entry) =>
  (entry.evidence ?? []).filter((s) => !s.source_sha256 && !/literal field/.test(s.excerpt ?? ''));

const entry = (id) => {
  const e = registry.entries.find((x) => x.id === id);
  assert.ok(e, `${id}: registry entry`);
  return e;
};

test('D193: every reviewed reference of the six entries resolves against the run\'s own capture', () => {
  for (const id of ENTRIES) {
    const references = packetReferences(entry(id));
    assert.ok(references.length >= 2, `${id}: expected at least two reviewed references`);
    for (const reference of references) {
      const body = bodies.get(reference.url);
      assert.ok(body, `${id}: no retained capture for ${reference.url}`);
      // This is the call that threw for all six on 2026-09-24.
      assert.doesNotThrow(() => protocolSourceContent(id, reference, body), `${id}: ${reference.url}`);
    }
  }
});

test('D193: the excerpt of every reviewed reference is verbatim, so the 60,000-byte bound is not what carries it', () => {
  for (const id of ENTRIES) {
    for (const reference of packetReferences(entry(id))) {
      // `review_content: 'excerpt'` forces the excerpt path whatever the body's size — the state
      // these references reach on their own the moment their text grows past the bound.
      const forced = { ...reference, review_content: 'excerpt' };
      assert.equal(protocolSourceContent(id, forced, bodies.get(reference.url)), reference.excerpt,
        `${id}: ${reference.url} does not quote its own source`);
    }
  }
});

test('D193: app.py is close enough to the review bound that the excerpt path is the live one', () => {
  const app = bodies.get('https://huggingface.co/spaces/DontPlanToEnd/UGI-Leaderboard/raw/main/app.py');
  const bytes = Buffer.byteLength(app);
  assert.ok(bytes > 50_000 && bytes < 60_000,
    `expected app.py near but under the bound, got ${bytes}`);
});

test('D193: the two value payloads stay out of the review packet and name a real field', () => {
  const header = bodies.get(PAYLOADS[0]).split('\n')[0].split(',');
  const board = JSON.parse(bodies.get(PAYLOADS[1]));
  for (const id of ENTRIES) {
    const e = entry(id);
    const payload = (e.evidence ?? []).filter((s) => PAYLOADS.includes(s.url));
    assert.equal(payload.length, 1, `${id}: exactly one value payload reference`);
    assert.ok(!packetReferences(e).includes(payload[0]), `${id}: the value payload is not reviewed`);
    const field = payload[0].excerpt.match(/^"(.+?)" \(literal field /)?.[1];
    assert.ok(field, `${id}: the payload reference names its field: ${payload[0].excerpt}`);
    if (payload[0].url === PAYLOADS[0]) {
      assert.equal(field, e.how_to_collect.locator.match(/exact CSV header '(.+?)'/)[1],
        `${id}: the named field is the column the collection locator selects`);
      assert.ok(header.includes(field), `${id}: ${field} is a column of the captured CSV header`);
    } else {
      assert.ok(Object.values(board.v1_1.data).some((efforts) =>
        Object.values(efforts).some((subsets) => subsets.main && field in subsets.main)),
        `${id}: ${field} is a field of the captured v1_1 Main runs`);
      assert.equal(board.v1_1.subsets.main, 100, `${id}: v1_1 Main is the 100-task subset`);
    }
  }
});

test('D193: a rewritten passage, a removed passage and a locator note all still fail closed', () => {
  const app = bodies.get('https://huggingface.co/spaces/DontPlanToEnd/UGI-Leaderboard/raw/main/app.py');
  const page = bodies.get('https://cognition.com/frontiercode');
  // Both bodies are still under the bound today, so the probe forces the excerpt path — the state
  // these references reach on their own as soon as their text grows.
  const pinned = (id, url) => ({ ...packetReferences(entry(id)).find((s) => s.url === url), review_content: 'excerpt' });

  const ugi = pinned('ugi::snapshot-2026-09-10', 'https://huggingface.co/spaces/DontPlanToEnd/UGI-Leaderboard/raw/main/app.py');
  assert.doesNotThrow(() => protocolSourceContent('ugi::snapshot-2026-09-10', ugi, app), 'the unmutated capture passes');
  // The maintainer reworded the UGI description: continuity is no longer established.
  assert.throws(() => protocolSourceContent('ugi::snapshot-2026-09-10', ugi,
    app.replaceAll('knowledge of sensitive topics', 'knowledge of restricted topics')), /methodology passage changed/);
  // The section is gone entirely.
  assert.throws(() => protocolSourceContent('ugi::snapshot-2026-09-10', ugi,
    app.replaceAll('Uncensored General Intelligence', 'Uncensored General Index')), /methodology passage changed/);

  const fc = pinned('frontiercode::1.1', 'https://cognition.com/frontiercode');
  assert.throws(() => protocolSourceContent('frontiercode::1.1', fc,
    page.replaceAll('measure mergeability', 'measure reviewability')), /methodology passage changed/);
  assert.throws(() => protocolSourceContent('frontiercode-cost::1.1',
    pinned('frontiercode-cost::1.1', 'https://cognition.com/frontiercode'),
    page.replaceAll('deprecates the Diamond subset', 'deprecates the Extended subset')), /methodology passage changed/);

  // And the shape D193 was about: an editorial locator note, offered as a methodology passage.
  for (const [note, body] of [['Exact score column UGI \u{1F3C6}', app],
    ['See About Benchmarks in app.py and the exact named column in the published CSV.', app],
    ['data.json v1_1: 36 models, 98 model × effort runs on the 100-task Main subset, each with new_score, correct, flagged_rate, cost and tokens.', bodies.get(PAYLOADS[1])],
    ['FrontierCode 1.1 — "Current revision. Runs flagged for unfair internet use are zeroed." Methodology: mergeability of maintainer-crafted tasks graded with unit tests, rubrics and verifiers.', page]]) {
    assert.throws(() => protocolSourceContent('probe', { excerpt: note, review_content: 'excerpt' }, body),
      /methodology passage changed/, `a locator note must not pass as a passage: ${note.slice(0, 40)}`);
  }
});
