// D226, 2026-09-27. `arc-agi::1` and `arc-agi::2` had been retained on every run since 2026-09-21
// with the same refusal: the only reviewed reference was https://arcprize.org/leaderboard, whose
// visible text names the boards and plots score against cost-per-task but states no metric, no unit
// and no range. So the protocol round could never settle criterion c1, both one-row entries were
// quarantined, and with a single row there is no accept-eligible remainder — the arm could not
// recover from a refresh, only from a registry edit (2026-09-22, -23, -25 and -27 replays all show
// the identical finding).
//
// The repair is evidence, not a weaker claim:
//
//   * https://arcprize.org/policy — the ARC Prize Verified Testing Policy — carries the Semi-Private
//     Evaluation Set's role on the Verified Leaderboard, the single-run rule, and the leaderboard's
//     own reporting unit ("within ±10 percentage points").
//   * https://arcprize.org/arc-agi/1 and /arc-agi/2 carry the per-version dataset structure, the
//     Semi-Private split size, and the accuracy figures the series reports in percent.
//
// `scoring.metric` then lost the phrase "exact grid", which no captured ARC Prize page states, and
// says what the sources do say. With the successor named in that same text, `superseded_by` stopped
// being null: criterion c2 asks for our registry id for the successor the protocol names, and
// explicitly does not read a supersession note as a retirement — both boards stay `active` because
// the Verified Leaderboard still reports them.
//
// The captures below are the ones this repair was replayed against, retained byte-for-byte at
// data/raw/benchmarks/daily-evidence/2026-09-27-d226/ with their receipts; the /leaderboard capture
// is byte-identical to the one the failing 2026-09-27T05:33Z daily run took. The mutations are
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
const captures = read('data/raw/benchmarks/daily-evidence/2026-09-27-d226/manifest.json');

const LEADERBOARD = 'https://arcprize.org/leaderboard';
const POLICY = 'https://arcprize.org/policy';
const ENTRIES = { 'arc-agi::1': 'https://arcprize.org/arc-agi/1', 'arc-agi::2': 'https://arcprize.org/arc-agi/2' };

/** The body the daily run hands to a protocol review: this capture through the same extractor. */
const bodies = new Map(captures.map((c) => {
  const raw = gunzipSync(readFileSync(new URL(c.file, repo)));
  assert.equal(createHash('sha256').update(raw).digest('hex'), c.sha256,
    `retained capture no longer matches its receipt: ${c.url}`);
  return [c.url, execFileSync('python3', ['ops/daily/public-candidate.py', 'text', c.file],
    { cwd: repo, encoding: 'utf8', maxBuffer: 16_000_000 })];
}));
const flat = (s) => s.replace(/\s+/g, ' ').trim();
/** Everything a protocol reviewer of one entry is shown, as one string. */
const packet = (id) => packetReferences(entry(id)).map((r) => flat(bodies.get(r.url))).join(' ');

/** `protocol()`'s own reference filter, so this test reads the packet it really builds. */
const packetReferences = (entry) =>
  (entry.evidence ?? []).filter((s) => !s.source_sha256 && !/literal field/.test(s.excerpt ?? ''));

const entry = (id) => {
  const e = registry.entries.find((x) => x.id === id);
  assert.ok(e, `${id}: registry entry`);
  return e;
};

test('D226: both boards are reviewed against the policy and their own version page, not the leaderboard alone', () => {
  for (const [id, page] of Object.entries(ENTRIES)) {
    const urls = packetReferences(entry(id)).map((r) => r.url);
    assert.deepEqual(urls, [LEADERBOARD, POLICY, page], `${id}: reviewed references`);
    for (const url of urls) assert.ok(bodies.has(url), `${id}: no retained capture for ${url}`);
  }
});

test('D226: every reviewed reference resolves against its retained capture', () => {
  for (const id of Object.keys(ENTRIES)) {
    for (const reference of packetReferences(entry(id))) {
      assert.doesNotThrow(() => protocolSourceContent(id, reference, bodies.get(reference.url)),
        `${id}: ${reference.url}`);
    }
  }
});

test('D226: the two added references quote their own source verbatim, so the 60,000-byte bound is not what carries them', () => {
  for (const [id, page] of Object.entries(ENTRIES)) {
    for (const reference of packetReferences(entry(id))) {
      if (reference.url === LEADERBOARD) continue; // pre-existing, two passages joined by an ellipsis
      assert.ok([POLICY, page].includes(reference.url));
      // `review_content: 'excerpt'` forces the excerpt path whatever the body's size — the state
      // these references reach on their own the moment their text grows past the bound.
      assert.equal(protocolSourceContent(id, { ...reference, review_content: 'excerpt' },
        bodies.get(reference.url)), reference.excerpt,
        `${id}: ${reference.url} does not quote its own source`);
    }
  }
});

test('D226: every load-bearing word of the scoring row is in the packet the reviewer reads', () => {
  for (const id of Object.keys(ENTRIES)) {
    const e = entry(id), text = packet(id);
    for (const phrase of ['Semi-Private Evaluation Set', 'Verified Leaderboard', 'accuracy',
      'A single run is used, we do not average scores across runs',
      'remaining tasks were marked as incorrect', 'percentage points']) {
      assert.ok(text.includes(phrase), `${id}: the packet states "${phrase}"`);
    }
    assert.equal(e.scoring.metric, 'Semi-Private Evaluation Set accuracy on the ARC Prize Verified Leaderboard');
    assert.equal(e.scoring.unit, 'percent');
    assert.deepEqual(e.scoring.range, [0, 100]);
    assert.equal(e.scoring.higher_better, true);
    // The phrase the four failed rounds named. It is in no ARC Prize page we capture, so a future
    // edit cannot put it back and still claim the sources support it.
    assert.ok(!/exact grid/i.test(e.scoring.metric), `${id}: metric no longer claims "exact grid"`);
    assert.ok(!/exact grid/i.test(text), `${id}: no captured ARC Prize page states "exact grid"`);
  }
});

test('D226: the supersession chain names a real board and the protocol names it too', () => {
  const ids = new Set(registry.entries.map((e) => e.id));
  for (const [id, successor, named] of [['arc-agi::1', 'arc-agi::2', 'ARC-AGI-2'],
    ['arc-agi::2', 'arc-agi::3', 'ARC-AGI-3']]) {
    const e = entry(id);
    assert.equal(e.superseded_by, successor, `${id}: successor board`);
    assert.ok(ids.has(successor), `${id}: ${successor} is a registry entry`);
    assert.ok(packet(id).includes(named), `${id}: the packet names ${named}`);
    // c2 reads status and supersession independently: the Verified Leaderboard still reports both.
    assert.equal(e.status, 'active', `${id}: a named successor is not a retirement`);
    assert.equal(e.version_status, 'published', `${id}: version_status`);
  }
});

test('D226: a rewritten or removed passage still fails closed', () => {
  for (const [id, page] of Object.entries(ENTRIES)) {
    for (const url of [POLICY, page]) {
      const reference = packetReferences(entry(id)).find((r) => r.url === url);
      const forced = { ...reference, review_content: 'excerpt' };
      // The source dropped the passage. `protocolSourceContent` collapses whitespace before it
      // looks, so the probe edits the collapsed body — the same string the real check reads.
      assert.throws(() => protocolSourceContent(id, forced, flat(bodies.get(url)).replace(
        flat(reference.excerpt).slice(0, 40), 'Removed by this probe')), /passage changed or unavailable/,
        `${id}: ${url} removed`);
      // The registry paraphrased instead of quoting.
      assert.throws(() => protocolSourceContent(id, { ...forced, excerpt: `${reference.excerpt} and nothing else` },
        bodies.get(url)), /passage changed or unavailable/, `${id}: ${url} paraphrased`);
    }
  }
});

test('D226: the /leaderboard capture is the one the failing daily run read', () => {
  // Same bytes as data/raw/benchmarks/daily-evidence/2026-09-27T05-33-09-831Z/4cd0f842f6c3bcd67352.gz,
  // the capture whose review quarantined both rows. The repair is the evidence beside it, not a
  // friendlier capture of the same page.
  const receipt = captures.find((c) => c.url === LEADERBOARD);
  assert.equal(receipt.sha256, '4cd0f842f6c3bcd67352bd0cae9abd84a17fdda5422f63419d6dec5d3172560b');
  const daily = read('data/raw/benchmarks/daily-evidence/2026-09-27T05-33-09-831Z/manifest.json')
    .find((c) => c.url === LEADERBOARD);
  assert.equal(daily.sha256, receipt.sha256);
});
