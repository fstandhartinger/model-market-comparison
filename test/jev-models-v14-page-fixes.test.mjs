import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readJevbenchV14, jevV14RowNote } from '../lib/jevbench-v14.mjs';

// /jev-models v1.4 page fixes (Florian 23 Sep 2026): bar chart and four-radar compare restored, † only on real notes,
// the evergreen v1.3 sections back out of the historical disclosure.
const { artifact } = await readJevbenchV14();
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [board, compare, page, historySource, css] = await Promise.all([read('../components/JevModelsV14.tsx'), read('../components/JevCompareV14.tsx'), read('../app/jev-models/page.tsx'), read('../components/JevHistoryContent.tsx'), read('../app/globals.css')]);

test('a † marker appears only for row-specific notes, never for shared provenance', () => {
  assert.equal(jevV14RowNote('already on the live v1.3.0 board | re-run on a throwaway RunPod pod with the original recipe; deviations in its manifest'), null);
  assert.equal(jevV14RowNote('unranked / honorable mention'), null);
  assert.equal(jevV14RowNote('API measurement: sealed item text (no golds) was sent to OpenAI'), null);
  assert.equal(jevV14RowNote('re-run on a throwaway RunPod pod with the original recipe; deviations in its manifest; 297/308 sealed items answered validly (failures count as wrong)'), '297/308 sealed items answered validly (failures count as wrong)');
  assert.equal(jevV14RowNote('Round 4 unpublished. Neutral raw-logit control.'), 'Neutral raw-logit control.');
  const notes = artifact.systems.map((row) => jevV14RowNote(artifact.footnotes[row.key]));
  assert.ok(notes.filter(Boolean).length < artifact.systems.length, 'not every row may carry a marker');
  for (const note of notes.filter(Boolean)) assert.doesNotMatch(note, /already on the live v1\.3\.0 board|^re-run on a throwaway RunPod pod/i);
  assert.doesNotMatch(board, /† note<\/a>/);
  assert.match(board, /const href = `\/jev-models\/\$\{encodeURIComponent\(row\.key\)\}`/);
  assert.match(board, /<Link href=\{href\}[^>]*>\{cut > 0 \? name\.slice\(cut \+ 1\) : name\}<\/Link>/);
  assert.match(css, /\.bh-jev14-note-body \{[^}]*white-space: normal/);
});

test('the v1.3 bar chart is back with v1.4 scores and the compare view has four aggregate-only radars', () => {
  assert.match(board, /data-bh-jev14-chart/);
  assert.match(board, /row\.jevbench_score/);
  assert.match(board, /<JevCompareV14 rows=\{rows\.map\(compareRow\)\}/);
  for (const key of ['axes', 'tiers', 'hard', 'sealed']) assert.match(compare, new RegExp(`key: "${key}"`));
  assert.match(compare, /searchParams\.set\("compare"/);
  assert.match(compare, /"jev-1\.13\.0"/);
  assert.doesNotMatch(compare + board, /item_text|question_text|\bgold\b\s*:/);
});

test('evergreen sections sit outside the historical v1.3 disclosure and read v1.4', () => {
  const history = page.indexOf('<JevHistoryLazy />');
  for (const marker of ['data-bh-jev14-findings', 'jev-alternatives-heading', 'data-bh-jev-costs', 'jev-not-measured', '<details id="method"', '<details id="limits"', '<details id="credit"']) {
    const at = page.indexOf(marker);
    assert.ok(at > 0 && at < history, `${marker} must precede the history disclosure`);
  }
  assert.match(page, /<JevHistoryLazy \/>/);
  assert.match(historySource, /<JevModelsV12Board/);
  assert.match(historySource, /<JevRadars/);
  assert.match(historySource, /id="held-out-diagnostic"/);
  assert.match(page, /v14Credits\.map/);
  assert.match(page, /v14Estimated\.map/);
});
