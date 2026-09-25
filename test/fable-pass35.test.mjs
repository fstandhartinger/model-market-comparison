// Fable pass 35 (2026-09-25): source pins for F-191/F-183 — a leaf page measures itself against one named row.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const detail = await readFile(new URL('../components/JevV141SystemDetail.tsx', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/jev-models/[system]/page.tsx', import.meta.url), 'utf8');

test('F-191: one referenceFor() feeds the strip, the points sentence, the radar pair and its heading', () => {
  assert.match(detail, /const referenceFor = \(row: JevV14System, ranked: JevV14System\[\]\) => row\.key === 'jev-1\.13\.0'/);
  assert.match(detail, /const reference = referenceFor\(row, ranked\);/);
  assert.match(detail, /data-bh-jev-system-delta=\{reference\.key\}/);
  assert.match(detail, /\{short\(reference\.display\)\}&apos;s \{one\(reference\.jevbench_score\)\}/);
  assert.match(detail, /rows=\{\[row, \.\.\.\(reference \? \[reference\] : \[\]\)\]\.map\(compareRow\)\}/);
  assert.match(detail, /heading=\{reference \? `Against \$\{short\(reference\.display\)\}`/);
  assert.doesNotMatch(detail, /ranked\[0\]\.jevbench_score/, 'the sentence must not read the first-ranked row and call it Jev');
  assert.doesNotMatch(detail, /Jev 1\.13\.0&apos;s/, 'the reference is named from data, not hard-coded');
});

test('F-183: the head is the board sub-line, the release sentence closes Availability, no provenance note as copy', () => {
  assert.match(detail, /data-bh-jev-system-subline/);
  assert.match(detail, /JEV_TYPE_LABEL\[row\.class\] \?\? null/);
  assert.doesNotMatch(detail, /hash-checked/);
  assert.doesNotMatch(detail, /name-only/);
  assert.match(detail, /From the public \{revision\} aggregate\. Scores and ranks can change when a new release is published\./);
  assert.match(detail, /blob\/\$\{revision\}\/docs\/METHOD-v1\.4\.md/);
  assert.match(page, /note: jevV14RowNote\(/);
  assert.match(page, /note=\{current\.note\}/);
});
