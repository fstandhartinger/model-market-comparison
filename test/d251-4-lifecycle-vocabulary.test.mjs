// D251.4 (2026-09-28): the second half of D251.1. Criterion c2 asked for `version_status` and
// `superseded_by` to be checked "against the same protocol text" without saying what that check
// could be. `"snapshot"` is Benchmark Heaven's word for "this source publishes no release
// identifier", so no maintainer page can contain it, and mazur's round 2 answered
// `missing_evidence` — "version_status and superseded_by cannot be settled from protocol text" —
// on a row that is correct. Iteration 264's round 2 had written the same sentence four days
// earlier. The clause now says what each value claims and what absence in the source means, and
// keeps both fields falsifiable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PROTOCOL_REVIEW_CRITERIA, protocolReviewRow } from '../ops/daily/refresh-benchmarks.mjs';

const registry = JSON.parse(await readFile('data/raw/benchmarks/registry.json', 'utf8'));

test('c2 states what each version_status value claims, in our vocabulary', () => {
  assert.equal(PROTOCOL_REVIEW_CRITERIA.length, 2, 'still two criteria — the clause joins the lifecycle one');
  const [, lifecycle] = PROTOCOL_REVIEW_CRITERIA;
  assert.match(lifecycle, /`version_status` says what kind of identifier the row's `version` is, and it is our word, not the maintainer's/);
  for (const value of ['published', 'snapshot', 'retained']) {
    assert.ok(lifecycle.includes(`\`"${value}"\``), `the criterion must define ${value}`);
  }
  assert.match(lifecycle, /`"snapshot"` means the maintainer publishes no release identifier at all/);
});

test('absence of a published version is the evidence for snapshot, not the absence of evidence', () => {
  const [, lifecycle] = PROTOCOL_REVIEW_CRITERIA;
  assert.match(lifecycle, /A protocol page that publishes no release identifier for this board is what supports `"snapshot"`/);
  assert.match(lifecycle, /Never report missing evidence because the protocol text does not contain the words `snapshot`, `published` or `retained`/);
  assert.match(lifecycle, /never because it does not name a `snapshot-<date>` version/);
});

test('a null supersession is the row declining to name a successor, like a null range bound', () => {
  const [identity, lifecycle] = PROTOCOL_REVIEW_CRITERIA;
  assert.match(lifecycle, /`superseded_by: null` is, in the same way, the row declining to name a successor/);
  assert.match(lifecycle, /never contradicts it, and it is a mismatch only when the protocol names a successor board/);
  // D251.1 taught the same lesson on `range`; the two sentences have to keep saying the same thing,
  // or one unbounded declaration is judged by a rule the other is exempt from.
  assert.match(identity, /a `range` bound written as `null` is the row declining to claim one/);
});

test('both clauses stay falsifiable — a page that does publish contradicts the row', () => {
  const [, lifecycle] = PROTOCOL_REVIEW_CRITERIA;
  assert.match(lifecycle, /`"snapshot"` is a mismatch only when the page does publish one/);
  assert.match(lifecycle, /Report a mismatch when the protocol text contradicts one of these fields/);
});

test('the registry keeps the shape the criterion describes to the reviewer', () => {
  const snapshots = registry.entries.filter((e) => e.version_status === 'snapshot');
  assert.ok(snapshots.length > 100, 'the snapshot vocabulary covers most of the registry, so c2 must define it');
  for (const entry of snapshots) {
    assert.match(entry.version, /^snapshot-\d{4}-\d{2}-\d{2}$/, `${entry.id}: c2 promises a dated identity`);
  }
  // And the field the clause is about is really in every reviewed packet.
  for (const entry of [snapshots[0], registry.entries.find((e) => e.version_status === 'published')]) {
    const row = protocolReviewRow(entry);
    assert.equal(row.version_status, entry.version_status);
    assert.ok('superseded_by' in row, 'the reviewed row states its supersession, or the clause has nothing to judge');
  }
});
