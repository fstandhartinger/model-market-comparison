// D235, 2026-09-27. A registry `scoring.notes` may say what *we* do with a board — which score it
// feeds, which rows it may never be joined with. No maintainer's protocol page can support such a
// sentence, so a protocol reviewer that reads one is right to call it unsupported, and on 2026-09-27
// four Vals arms were retained for exactly that: `vals-index-vibe-code-bench::2` on a [major]
// against "with a standard error per model" and `vals-index-legal-research::2` on a [minor] against
// the same tail, both reproduced offline against the run's own capture; the other four passed the
// same bytes on replay, which is what one shared weak spot looks like through a free critic pair's
// variance. A minor finding has no row-level repair, so it ends the round budget and retains the
// whole arm — the remedy is never a retry, it is deleting the claim the source cannot carry.
//
// The convention: a sentence beginning with POLICY_NOTE_MARKER is ours. It is stripped from the
// reviewed row (like the older "AA source field:" plumbing note) and kept in the published notes,
// where it is how a reader tells a Composite input from a secondary board. Two ways it can rot, both
// pinned below: a protocol claim hidden behind the marker, and notes that are policy only, with nothing
// left for the reviewer to check. Everything after the marker is ours by definition — a join rule may
// follow the Composite rule — so "nothing follows" is not the invariant; "no protocol word follows" is.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { POLICY_NOTE_MARKER, protocolReviewRow, CROSS_SOURCE_CLAUSES } from '../ops/daily/refresh-benchmarks.mjs';

const registry = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/registry.json', import.meta.url), 'utf8'));
const byId = (id) => registry.entries.find((e) => e.id === id);
const marked = registry.entries.filter((e) => (e.scoring?.notes ?? '').includes(POLICY_NOTE_MARKER));

// Words that decide what a value *means*. Behind the marker they are invisible to the reviewer, so
// they may not appear there — the marker is for our handling of a row, never for its protocol.
const PROTOCOL_WORDS = /\b(metric|unit|units|range|task set|tasks|harness|judge|judges|rubric|version|saturat\w*|pass@|denominator|subset)\b/i;

// The registry entries that still state the Composite policy without the marker. 47 whose last
// sentence was *entirely* our handling of the row were converted by prefixing the marker and nothing
// else; 12 more had the clause welded onto something a source has to settle — what the maintainer
// publishes per row (cursorbench, apprenticebench), who publishes the board (programbench), that an
// LLM judge grades it (react-native-evals, researchclawbench, matharena-brokenarxiv) — and were split
// so the sourced half stays in front of the reviewer.
//
// The last two were held back for one day, for the D232/D234 receipts that landed in the 2026-09-28
// 05:17 run (both arms passed round 1 there). D250 converted them, so the inventory is empty: no
// registry entry now states the Composite policy where a source reviewer has to read it.
// The list may shrink; a name cannot join it without a reason in the same commit.
const UNMARKED_POLICY = [];
const POLICY_CLAIM = /Composite input|enters the Composite|into the Composite/;
const unmarked = () => registry.entries.filter((e) => {
  const notes = e.scoring?.notes ?? '';
  return !notes.includes(POLICY_NOTE_MARKER) && POLICY_CLAIM.test(notes);
}).map((e) => e.id);

test('the policy note is stripped from the reviewed row and kept in the published notes', () => {
  assert.ok(marked.length >= 68, 'the nine Vals entries and the 59 converted boards carry the marker');
  for (const entry of marked) {
    const reviewed = protocolReviewRow(entry).scoring.notes ?? '';
    assert.ok(!reviewed.includes(POLICY_NOTE_MARKER), `${entry.id}: the marker reached the reviewer`);
    assert.ok(!POLICY_CLAIM.test(reviewed), `${entry.id}: the Composite policy reached the reviewer`);
    assert.ok(entry.scoring.notes.includes(POLICY_NOTE_MARKER), `${entry.id}: the site lost the policy note`);
    assert.ok(reviewed.length > 0, `${entry.id}: the notes are policy only — nothing is left to review`);
  }
});

test('nothing hides behind the marker that a protocol page would have to settle', () => {
  assert.ok(marked.length >= 68, 'the marker is in use');
  for (const entry of marked) {
    const clause = entry.scoring.notes.slice(entry.scoring.notes.indexOf(POLICY_NOTE_MARKER));
    assert.equal(clause.split(POLICY_NOTE_MARKER).length, 2, `${entry.id}: the marker appears twice`);
    const hit = clause.match(PROTOCOL_WORDS);
    assert.equal(hit, null, `${entry.id}: "${hit?.[0]}" behind the policy marker — a protocol claim the`
      + ' reviewer can no longer see. Put it before the marker, where the source has to support it.');
  }
});

test('the Vals family states only what its page states', () => {
  const vals = registry.entries.filter((e) => e.id.startsWith('vals-index'));
  assert.equal(vals.length, 9);
  for (const entry of vals) {
    const reviewed = protocolReviewRow(entry).scoring.notes;
    for (const claim of ['standard error per model', 'independent evaluator', 'secondary benchmark']) {
      assert.ok(!reviewed.includes(claim), `${entry.id}: "${claim}" is not on the Vals page`);
    }
    // The last-updated date moves with every refresh; pinning it in prose is what went stale.
    assert.ok(!/updated 2026-09-10/.test(JSON.stringify(entry)), `${entry.id}: a pinned last-updated date`);
  }
});

test('both halves of the Harvey LAB-AA / Vals HLAB clause are registered', () => {
  for (const id of ['aa-harvey-lab::snapshot-2026-09-10', 'vals-index-hlab::2']) {
    const clause = CROSS_SOURCE_CLAUSES[id];
    assert.ok(clause, `${id}: the cross-source clause is not registered, so it travels into the review`);
    assert.ok(byId(id).one_sentence_description.includes(clause), `${id}: the clause left the description`);
    assert.ok(!protocolReviewRow(byId(id)).description.includes('LAB-AA'), `${id}: the clause reached the reviewer`);
  }
});

test('the unmarked Composite policy is an inventory that may only shrink', () => {
  assert.deepEqual(unmarked().sort(), [...UNMARKED_POLICY].sort(),
    'a registry entry states the Composite policy in `scoring.notes` without the marker (or a listed'
    + ' one was converted — remove it from UNMARKED_POLICY in the same commit). Unmarked, the sentence'
    + ' goes in front of a source reviewer that cannot possibly support it.');
});
