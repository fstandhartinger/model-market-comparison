// v1.6.14 critic F1: the Capability ranking's unranked note uses the row's own preliminary label; legacy P300 rows keep the exact text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../components/JevCapabilityRanking.tsx', import.meta.url), 'utf8');

test('unrankedNote prefers the row preliminary label and keeps the legacy P300 text as the default', () => {
  assert.match(src, /export function unrankedNote\(listing: string, benchName: string, preliminary\?: \{ label\?: string \| null \} \| null\)/);
  assert.match(src, /if \(listing === 'preliminary'\) return preliminary\?\.label \?\? 'Preliminary · public set \(300 items\) · full sealed run pending';/);
  assert.match(src, /unrankedNote\(r\.row\.listing, benchName, \(r\.row as \{ preliminary\?: \{ label\?: string \| null \} \| null \}\)\.preliminary\)/);
});

test('the A2 row carries its own label in the v1.6.14 artifact', () => {
  const art = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.14-results.json', import.meta.url), 'utf8'));
  const text = JSON.stringify(art);
  assert.ok(text.includes('PRELIMINARY — API supplement A2 (300 sealed + 300 public), not the S1200 full set; equating pool 4 of 6'));
});
