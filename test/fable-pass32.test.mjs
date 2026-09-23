// Fable pass 32 (2026-09-23): the per-system JevBench pages (CR-129, shipped by another job) judged against the design bar.
// F-168: the page speaks the board's words — a system type is labelled, not printed as its data key; a not-ranked status is one
// sentence with the artifact's reason once; an unranked listing gets no "ahead of / behind Jev" clause (the board compares ranked
// systems only); a label-only system's calibration reads "none (label only)" with the artifact's note as its title.
// Source-level pins, like test/fable-pass31.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../app/jev-models/[system]/page.tsx', import.meta.url), 'utf8');
const radars = await readFile(new URL('../components/JevRadars.tsx', import.meta.url), 'utf8');

test('F-168: the type sub-line prints a label from the same map the hub radar uses, never the raw class key', () => {
  assert.match(page, /<span data-bh-jev-system-cls=\{row\.cls\}>\{typeLabel\(row\.cls\)\}<\/span>/);
  assert.doesNotMatch(page, />\{row\.cls\}</, 'the raw key is not rendered as text');
  const map = (src) => Object.fromEntries([...src.match(/const TYPE_LABEL[^\n]*\{([^}]*)\}/)[1].matchAll(/["']?([\w.-]+)["']?:\s*["']([^"']+)["']/g)].map((m) => [m[1], m[2]]));
  const hub = map(radars), mine = map(page);
  for (const [k, v] of Object.entries(hub)) assert.equal(mine[k], v, `label for ${k} matches the hub`);
});

test('F-168: the not-ranked status is one sentence with the reason once, and no "Listed as a <key>" tail', () => {
  assert.match(page, /function statusSentence\(row: JevV12Row, view: JevV12View\): string/);
  assert.match(page, /return `Honorable mention, not ranked — \$\{reason \|\| "it runs another entrant's model"\}\.`;/);
  assert.match(page, /return `Partial run, not ranked — \$\{reason \|\| 'it missed a tier'\}\.`;/);
  assert.match(page, /replace\(\/\\s\*\[—–-\]\\s\*listed,\\s\*not ranked\\\.\?\\s\*\$\/i, ''\)/, 'the artifact\'s own "— listed, not ranked" tail is stripped before the sentence adds it');
  assert.doesNotMatch(page, /Listed as a \{row\.listing/);
  assert.doesNotMatch(page, /Not ranked\{row\.notRankedBecause/);
});

test('F-168: only a ranked system is compared with Jev 1.13.0 (page and metadata description alike)', () => {
  const occurrences = page.match(/const jevRow = !row\.ranked \|\| row\.key === 'jev-1\.13\.0' \? null : all\.find\(\(r\) => r\.key === 'jev-1\.13\.0'\) \?\? null;/g) ?? [];
  assert.equal(occurrences.length, 2, 'describeRow and the page body use the same guard');
});

test('F-168: a null calibration reads "none (label only)" with the artifact\'s note as title', () => {
  assert.match(page, /\{row\.axes\.calibration === null\s*\? <dd className="text-xl font-semibold tabular-nums" title=\{row\.calibrationNote \?\? undefined\} data-bh-jev-system-no-cal>none <span className="bh-muted text-xs font-normal">\(label only\)<\/span><\/dd>/);
});
