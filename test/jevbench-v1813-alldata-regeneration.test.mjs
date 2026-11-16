import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildV1813AllDataView } from '../scripts/build-jevbench-v1813-alldata.mjs';

test('precomputed input regenerates byte for byte from the validated release', { timeout: 1800000 }, async () => {
  assert.equal(JSON.stringify(await buildV1813AllDataView()) + '\n', await readFile('data/jevbench-v1.8.13-alldata.json', 'utf8'));
});
