import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildV1815AllDataView } from '../scripts/build-jevbench-v1815-alldata.mjs';

test('precomputed input regenerates byte for byte from the validated release', { timeout: 1800000 }, async () => {
  assert.equal(JSON.stringify(await buildV1815AllDataView()) + '\n', await readFile('data/jevbench-v1.8.15-alldata.json', 'utf8'));
});
