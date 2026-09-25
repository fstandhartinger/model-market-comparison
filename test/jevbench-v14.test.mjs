import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readJevbenchV14, JEVBENCH_V14_SHA256, JEVBENCH_V14_TOP5 } from '../lib/jevbench-v14.mjs';

const { artifact, sha256 } = await readJevbenchV14();
const route = await readFile(new URL('../app/api/jevbench/v1.4/route.ts', import.meta.url), 'utf8');
const board = (await Promise.all(['JevModelsV14', 'JevBoardShared', 'JevBoardInteractive'].map((f) => readFile(new URL(`../components/${f}.tsx`, import.meta.url), 'utf8')))).join('\n'); // CR-151 split the board
const page = await readFile(new URL('../app/jev-models/page.tsx', import.meta.url), 'utf8');

test('CR-131 API is pinned to the approved aggregate-only v1.4 artifact', () => {
  const ranked = artifact.systems.filter((row) => row.listing === 'ranked').sort((a, b) => a.rank - b.rank);
  assert.equal(artifact.revision, 'v1.4.0');
  assert.equal(sha256, JEVBENCH_V14_SHA256);
  assert.equal(artifact.systems.length, 76);
  assert.equal(ranked.length, 71);
  assert.equal(artifact.tiers.easy + artifact.tiers.standard + artifact.tiers.judge + artifact.tiers.hard, 534);
  assert.equal(artifact.tiers.sealed, 308);
  assert.deepEqual(ranked.slice(0, 5).map((row) => row.key), JEVBENCH_V14_TOP5);
  assert.deepEqual(ranked.slice(0, 5).map((row) => [row.display.split(' (')[0], row.jevbench_score.toFixed(2)]), [
    ['Jev 1.13.0', '63.29'],
    ['JevK5 v0.2.0', '62.04'],
    ['Hopper', '59.43'],
    ['Winnow-12B Q8', '55.58'],
    ['reflex 4B', '53.99'],
  ]);
  assert.doesNotMatch(JSON.stringify(artifact), /"(?:item_id|item_text|question_text|gold|expected|prediction|predicted|per_item|item_results)"\s*:/i);
});

test('CR-131 API returns the pinned bytes and integrity header', async () => {
  assert.match(route, /dynamic = 'force-static'/);
  assert.match(route, /new Uint8Array\(bytes\)/);
  assert.match(route, /'X-Content-SHA256': sha256/);
  assert.match(route, /readJevbenchV14\(\)/);
});

test('CR-131 v1.4 board explains the scoring and required exposure disclosures', async () => {
  assert.match(board, /What changed in v1\.4/);
  assert.match(board, /I = 0\.8 × I_v1\.3 \+ 0\.2 × I_sealed/);
  assert.match(board, /C = C_v1\.3 \+ \(C_v1\.4 − C_v1\.3\) × min\(1, 0\.2 \/ 0\.35\)/);
  assert.match(board, /k = 1/);
  assert.match(board, /equal-weight harmonic mean/);
  assert.match(board, /Intelligence below 50/);
  assert.match(board, /Speed and Cost each have a separate Jev-class gate below 50/);
  assert.match(board, /operator's endpoint received sealed item text, without answers/);
  assert.match(board, /Hopper's public-half development and JevK5's public-set selection/);
  assert.match(board, /system-level aggregates appear here/);
  assert.match(page, /<JevModelsV14Board artifact=\{v14\.artifact\} sha256=\{v14\.sha256\} previous=\{previous\}[^\n]*compactMobile \/>/);
  const pinnedPage = await readFile(new URL('../app/jev-models/v1.4/page.tsx', import.meta.url), 'utf8');
  assert.match(pinnedPage, /readJevbenchV14\(\)/);
  assert.match(board, /href=\{`\/api\/jevbench\/\$\{artifact\.revision\}`\}/); // CR-151: the route keeps the v (/api/jevbench/1.4.2 was a 404)
});
