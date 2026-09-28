import test from 'node:test';
import assert from 'node:assert/strict';
import { jevV14RowNote, jevV14SealedShortfallNote } from '../lib/jevbench-v14.mjs';
import { readJevbenchV14 } from '../lib/jevbench-v14.mjs';
import { readJevbenchV141 } from '../lib/jevbench-v141.mjs';
import { readJevbenchV142 } from '../lib/jevbench-v142.mjs';
import { readJevbenchV1421 } from '../lib/jevbench-v1421.mjs';
import { readJevbenchV1422 } from '../lib/jevbench-v1422.mjs';

// D238: `jevact` answered 237 of 308 sealed decisions validly and was the one row on the board whose note
// never said so, while eight siblings printed the count in prose a publisher typed by hand. D246: the
// generic-note filter's `.*$` then swallowed whatever a publisher appended after the shared "sealed item
// text …" sentence, which hid two more rows' counts and `qwen3.8-27b`'s only published reason for being
// partial. Both are now derived from `sealed_aggregate`, so neither can come back in a later release.
const releases = Object.entries({
  'v1.4': readJevbenchV14, 'v1.4.1': readJevbenchV141, 'v1.4.2': readJevbenchV142,
  'v1.4.2.1': readJevbenchV1421, 'v1.4.2.2': readJevbenchV1422,
});

test('the shortfall clause is derived from the published integers alone', () => {
  assert.equal(jevV14SealedShortfallNote({ sealed_aggregate: { answered_valid: 237, n: 308 } }),
    '237/308 sealed items answered validly (failures count as wrong)');
  // A complete run says nothing, and nothing is invented when the row does not publish the pair.
  assert.equal(jevV14SealedShortfallNote({ sealed_aggregate: { answered_valid: 308, n: 308 } }), null);
  assert.equal(jevV14SealedShortfallNote({ sealed_aggregate: { answered_valid: 300.5, n: 308 } }), null);
  assert.equal(jevV14SealedShortfallNote({ sealed_aggregate: {} }), null);
  assert.equal(jevV14SealedShortfallNote(undefined), null);
});

test('every v1.4 release row that answered fewer than all sealed decisions prints the count exactly once', async () => {
  for (const [revision, read] of releases) {
    const { artifact } = await read();
    let shortfalls = 0;
    for (const row of artifact.systems) {
      const { answered_valid: answered, n } = row.sealed_aggregate ?? {};
      if (!Number.isInteger(answered) || !Number.isInteger(n) || answered >= n) continue;
      shortfalls += 1;
      const note = jevV14RowNote(artifact.footnotes?.[row.key], row);
      assert.ok(note, `${revision} ${row.key}: a row with a sealed shortfall must carry a note`);
      const hits = note.match(new RegExp(String.raw`\b${answered}\s*/\s*${n}\b`, 'g')) ?? [];
      assert.equal(hits.length, 1, `${revision} ${row.key}: ${answered}/${n} appears ${hits.length}x in ${JSON.stringify(note)}`);
    }
    assert.ok(shortfalls > 0, `${revision} publishes no sealed shortfall at all, which the fixture should`);
  }
});

test('the rows whose prose already carried the count keep the wording they published', async () => {
  const { artifact } = await readJevbenchV1422();
  // kev-4b's publisher typed the clause; the derived one must not be appended on top of it.
  const note = jevV14RowNote(artifact.footnotes?.['kev-4b'], artifact.systems.find((row) => row.key === 'kev-4b'));
  assert.match(note, /306\/308 sealed items answered validly \(failures count as wrong\)$/);
  assert.equal(note.match(/306\/308/g).length, 1);
});

test("D246: a publisher's remainder survives the shared sealed-exposure sentence", async () => {
  const { artifact } = await readJevbenchV1422();
  const row = artifact.systems.find((candidate) => candidate.key === 'qwen3.8-27b');
  // Its `not_ranked_because` is null, so this note is the only place the page can say why the run stopped.
  assert.equal(row.not_ranked_because, null);
  const note = jevV14RowNote(artifact.footnotes?.[row.key], row);
  assert.match(note, /Chutes rate limit stopped the run after 81\/308 items/);
  assert.match(note, /69\/308 sealed items answered validly/);
  // The shared sentence itself is still dropped, whether or not a remainder follows it.
  assert.doesNotMatch(note, /sealed item text \(no golds\) was sent to/i);
  assert.equal(jevV14RowNote('API measurement: sealed item text (no golds) was sent to the operator endpoint', row === undefined ? undefined : { sealed_aggregate: {} }), null);
  // A row repeating the board-wide decision count says nothing about that row.
  assert.equal(jevV14RowNote("API measurement: sealed item text (no golds) was sent to the operator endpoint; all 842 decisions (534 frozen v1.2 + 308 sealed v1.4) through JevBench's adapter."), null);
});
