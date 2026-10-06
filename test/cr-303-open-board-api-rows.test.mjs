import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// CR-303 (three-page review, 6 Oct 2026): the open board's toggle counts only rows that render, carried API rows are badged, and the stale Sage cost note is corrected.
test('CR-303: toggle count, carried API badge and Sage cost erratum in the board source', async () => {
  const board = await readFile(new URL('../components/JevBenchV16Board.tsx', import.meta.url), 'utf8');
  assert.match(board, /scope === 'api' && \(s as \{ listing\?: string \}\)\.listing !== 'listed'/);
  assert.match(board, /hiddenApi\.has\(r\.key\) && <span className="bh-thin-tag bh-flag-tag ml-1">API<\/span>/);
  assert.match(board, /Superseded by the v1\.6\.1 cost rule \(common item set\): USD 0\.0247\/1,000 decisions/);
  assert.doesNotMatch(board, /per 1k answers/);
});
