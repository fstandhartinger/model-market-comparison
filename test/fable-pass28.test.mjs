// Fable pass 28 (2026-09-21): the surfaces that changed after pass 27 — the JevBench table's † notes (17 entries, 33 lines at 1440 and 91
// on a phone) are a closed disclosure that a row's † opens (F-152); the custom-evaluation page's one primary action is solid accent (F-153);
// no label anywhere is below the 10 px type floor (F-154: Simple-page shortlist ticks, Advanced route badges). Source-level pins, like
// test/fable-pass27.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p) => readFile(new URL(p, import.meta.url), 'utf8');
const [jev, custom, css, shortlist, explorer] = await Promise.all([
  read('../components/JevModelsV12.tsx'), read('../app/jev-models/custom-evaluation/page.tsx'), read('../app/globals.css'),
  read('../components/ShortlistColumns.tsx'), read('../components/ModelExplorer.tsx'),
]);

test('F-152: the table notes are one closed <details>; a row\'s † links to its entry and opens the disclosure; its first sentence is the title', () => {
  assert.equal((jev.match(/data-bh-jev12-notes/g) || []).length, 1, 'the table notes selector stays unique');
  assert.match(jev, /<details id="jev12-notes" className="mt-2 text-xs" data-bh-jev12-notes>\s*<summary[^>]*>† Notes on \{notes\.length\} marked systems — how each was run<\/summary>/);
  assert.doesNotMatch(jev, /<details id="jev12-notes"[^>]*\sopen/, 'closed by default');
  assert.match(jev, /<li key=\{r\.key\} id=\{`jev12-note-\$\{r\.key\}`\}>† <b/);
  assert.match(jev, /<sup><a href=\{`#jev12-note-\$\{r\.key\}`\}[^>]*title=\{firstSentence\(r\.footnote\)\}[^>]*onClick=\{openNotes\}>†<\/a><\/sup>/);
  assert.match(jev, /const openNotes = \(\) => \{ const d = document\.getElementById\("jev12-notes"\); if \(d instanceof HTMLDetailsElement\) d\.open = true; \};/);
  // a partial row whose artifact carries no not_ranked_because (jqv, v1.2.7) still explains itself where the tag is
  assert.match(jev, /title=\{r\.notRankedBecause \?\? \(r\.footnote \? firstSentence\(r\.footnote\) : undefined\)\}>\{NOT_RANKED\[r\.listing\]\} · not ranked<\/span>/);
  // the chart keeps its own collapsed copy that the CR-92/93/95 verifiers read
  assert.match(jev, /<li key=\{r\.key\} data-bh-jev12-footnote=\{r\.key\}>/);
});

test('F-153: the custom-evaluation page\'s email action is the solid primary button; GitHub stays secondary', () => {
  assert.match(custom, /<a className="bh-button bh-button-primary font-semibold" href=\{contact\}>Email us about your data<\/a>/);
  assert.match(custom, /<a className="bh-button" href="https:\/\/github\.com\/fstandhartinger\/jevbench"/);
  assert.match(css, /\.bh-button-primary \{ background: rgb\(var\(--accent\)\); border-color: rgb\(var\(--accent\)\); color: rgb\(var\(--ink\)\); \}/);
});

test('F-154: nothing is set below the 10 px type floor in the shortlist columns or the Advanced route badges', () => {
  for (const [name, src] of [['ShortlistColumns', shortlist], ['ModelExplorer', explorer]]) {
    assert.doesNotMatch(src, /text-\[(?:[0-9]|9\.5)px\]/, `${name}: no Tailwind size below 10 px`);
    assert.doesNotMatch(src, /fontSize: ?["']?(?:[0-9]|9\.5)px/, `${name}: no inline size below 10 px`);
  }
  assert.equal((shortlist.match(/text-\[10px\]/g) || []).length, 6, 'the five former 9/9.5 px labels join the one existing 10 px label');
});
