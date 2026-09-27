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
// pinned below: a protocol claim hidden behind the marker, and sourced text written after it.
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

// The registry entries that still state the Composite policy without the marker. The list may
// shrink; a name cannot join it without a reason in the same commit. Every one of them is a latent
// finding of the shape that retained the Vals arms, and several sit under arms that are failing for
// other reasons today (blueprint-bench::2, frontiercode::1.1, frontierswe::2, vulcanbench-frontier::4,
// the four kernelbench-cuda boards).
const UNMARKED_POLICY = [
  'apprenticebench-api-cost::snapshot-2026-09-14', 'apprenticebench-api::snapshot-2026-09-14',
  'apprenticebench-cua-cost::snapshot-2026-09-14', 'apprenticebench-cua::snapshot-2026-09-14',
  'blueprint-bench::2', 'bu-bench-v1::snapshot-2026-09-09',
  'bullshitbench-v1::snapshot-2026-09-10', 'bullshitbench-v2::snapshot-2026-09-10',
  'charxiv-reasoning::val-v1.0', 'chess-puzzles::snapshot-2026-09-18',
  'context-arena-mrcr-v2::8-needle', 'cursorbench-cost::4.0', 'cursorbench::4.0',
  'deepswe::snapshot-2026-09-15', 'ebr-bench::snapshot-2026-09-18',
  'epoch-gpqa-diamond::snapshot-2026-09-18', 'epoch-swe-bench-verified::snapshot-2026-09-18',
  'frontiercode-cost::1.1', 'frontiercode::1.1', 'frontiermath-tier-4::v2',
  'frontiermath-tiers-1-3::v2', 'frontierswe::2', 'gso::opt1-102', 'hyper-tau-bench::release-v1',
  'kernelbench-cuda-deepseek-nsa::rtx-pro-6000', 'kernelbench-cuda-glm52-fused-moe::rtx-pro-6000',
  'kernelbench-cuda-grid-mingru-sps::rtx-pro-6000',
  'kernelbench-cuda-megaqwen-decode::rtx-pro-6000', 'lisanbench::0.2.0',
  'long-horizon-terminal-bench::1.0', 'matharena-aime::2026', 'matharena-apex-shortlist::2025',
  'matharena-apex::2025', 'matharena-arxivmath::2026-06', 'matharena-arxivmath::2026-08',
  'matharena-brokenarxiv::2026-06', 'matharena-brokenarxiv::2026-08', 'matharena-hmmt::2025-11',
  'matharena-hmmt::2026-02', 'matharena-usamo::2026', 'mcp-atlas::snapshot-2026-09-21',
  'mcpmark::verified', 'mirrorcode::snapshot-2026-09-18',
  'mystery-game-puzzles::snapshot-2026-09-18', 'openai-automationbench-cost::1.0.6',
  'osworld-2::v2026.06.24', 'osworld-2::v2026.08.08', 'posttrainbench::1.1', 'programbench::1',
  'react-native-evals::91-evals', 'researchclawbench::40-tasks', 'rsi-exam::0.1',
  'simpleqa-verified::snapshot-2026-09-16', 'swe-atlas-qna::snapshot-2026-09-15',
  'swe-atlas-refactoring::snapshot-2026-09-15', 'swe-atlas-test-writing::snapshot-2026-09-15',
  'swe-rebench::2026-05-15..2026-07-01', 'toolathlon-verified::2026-06-30',
  'toolathlon::pre-verified', 'vulcanbench-frontier::4', 'weirdml::3'
];
const POLICY_CLAIM = /Composite input|enters the Composite|into the Composite/;
const unmarked = () => registry.entries.filter((e) => {
  const notes = e.scoring?.notes ?? '';
  return !notes.includes(POLICY_NOTE_MARKER) && POLICY_CLAIM.test(notes);
}).map((e) => e.id);

test('the policy note is stripped from the reviewed row and kept in the published notes', () => {
  assert.ok(marked.length >= 9, 'the nine Vals entries carry the marker');
  for (const entry of marked) {
    const reviewed = protocolReviewRow(entry).scoring.notes ?? '';
    assert.ok(!reviewed.includes(POLICY_NOTE_MARKER), `${entry.id}: the marker reached the reviewer`);
    assert.ok(!POLICY_CLAIM.test(reviewed), `${entry.id}: the Composite policy reached the reviewer`);
    assert.ok(entry.scoring.notes.includes(POLICY_NOTE_MARKER), `${entry.id}: the site lost the policy note`);
    assert.ok(reviewed.length > 0, `${entry.id}: the notes are policy only — nothing is left to review`);
  }
});

test('nothing hides behind the marker that a protocol page would have to settle', () => {
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
