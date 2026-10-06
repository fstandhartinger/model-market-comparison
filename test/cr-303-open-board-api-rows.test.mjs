import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { jevScopeClassifier, jevbenchScopeArtifact } from '../lib/jevbench-scope.mjs';

// CR-303 (three-page review, 6 Oct 2026): API rows behind the open board's toggle carry no base-model reference price,
// the toggle counts only rows that render, carried API rows are badged, and the stale Sage cost note is corrected.
test('CR-303: open board drops the base-model alternative for API rows, keeps it for open weights', async () => {
  const a = JSON.parse(await readFile(new URL('../data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-results.json', import.meta.url), 'utf8'));
  const isApi = jevScopeClassifier(a.systems);
  const open = jevbenchScopeArtifact(a, 'open', isApi);
  for (const s of open.systems.filter((row) => row.scope === 'api')) assert.equal(s.alt, undefined, `${s.key} keeps no alt`);
  const openAlts = a.systems.filter((row) => row.alt && !isApi(row)).map((row) => row.key);
  for (const key of openAlts) assert.ok(open.systems.find((row) => row.key === key)?.alt, `${key} keeps its alt`);
});

test('CR-303: toggle count, carried API badge and Sage cost erratum in the board source', async () => {
  const board = await readFile(new URL('../components/JevBenchV16Board.tsx', import.meta.url), 'utf8');
  assert.match(board, /scope === 'api' && \(s as \{ listing\?: string \}\)\.listing !== 'listed'/);
  assert.match(board, /hiddenApi\.has\(r\.key\) && <span className="bh-thin-tag bh-flag-tag ml-1">API<\/span>/);
  assert.match(board, /Superseded by the v1\.6\.1 cost rule \(common item set\): USD 0\.0247\/1,000 decisions/);
  assert.doesNotMatch(board, /per 1k answers/);
});
