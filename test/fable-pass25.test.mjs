// Fable pass 25 (2026-09-20): the /jev-models "Compare two systems" radars — F-136 ring labels off the 12-o'clock spoke, with the
// halo; F-137 the topic caption is two visible sentences at most, the rest lives in the "Values and notes" disclosure; F-138 the
// phone Swap button is a compact right-aligned control, not a third full-width input. Source-level pins, like test/jevbench-v12.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const src = await readFile(new URL('../components/JevRadars.tsx', import.meta.url), 'utf8');

test('F-136: ring labels sit at the half-step between spoke 0 and 1, inside the ring, with the F-70 halo', () => {
  const ring = src.match(/\{\[50, 100\]\.map\([\s\S]*?data-radar-ring>/)?.[0];
  assert.ok(ring, 'the two ring labels are drawn from the [50, 100] list and carry data-radar-ring');
  assert.match(ring, /Math\.PI \/ spokes\.length/, 'the label angle is the half-step, not the top spoke');
  assert.match(ring, /Math\.cos\(Math\.PI \/ spokes\.length\)/, 'the label radius is the polygon apothem, so it stays inside the ring');
  assert.match(ring, /paintOrder: "stroke"/, 'the F-70 halo');
  assert.doesNotMatch(ring, /x=\{cx \+ 3\}/, 'the old on-the-spoke placement is gone');
});

test('F-137: the topic figcaption shows at most two sentences; the tier mix and the method are in the notes disclosure', () => {
  const fig = src.match(/data-bh-jev12-radar="topics"[\s\S]*?<\/figcaption>/)?.[0];
  assert.ok(fig);
  const cap = fig.slice(fig.indexOf('<figcaption'));
  const visible = cap.replace(/\{anyThin[\s\S]*?<\/span>\}/, '');
  assert.equal((visible.match(/[.!?](?=<|\s|$)/g) || []).length, 1, 'one unconditional sentence; the thin note is the conditional second');
  assert.doesNotMatch(visible, /Topics mix tiers|drafted by a model|Held-out/, 'moved into the disclosure');
  const notes = src.match(/data-bh-jev12-radar-notes[\s\S]*?<\/details>/)?.[0];
  assert.ok(notes && /Values and notes/.test(notes));
  assert.match(notes, /Topics mix tiers differently/);
  assert.match(notes, /datasets\/TOPICS\.md/);
  assert.match(notes, /Held-out items count in the totals/);
  assert.match(src, /Accuracy by subject topic <span[^>]*>— not part of the score<\/span>/, 'the "not part of the score" fact moved to the heading');
});

test('F-138: the Swap button is right-aligned and content-wide below sm, in the row at sm+', () => {
  assert.match(src, /data-bh-jev12-radar-swap/);
  assert.match(src, /className="bh-button shrink-0 self-end text-sm font-semibold sm:self-auto"[\s\S]{0,200}data-bh-jev12-radar-swap/);
});
