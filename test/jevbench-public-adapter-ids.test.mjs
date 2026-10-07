import test from 'node:test';
import assert from 'node:assert/strict';
import { readJevbenchV155Release } from '../lib/jevbench-v15-release.mjs';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';

// Runner-local spec paths in adapter_id reached the page payload; Google followed them as links and reported 404s.
test('release pages carry no local directory in adapter ids', async () => {
  for (const release of [await readJevbenchV155Release(), await readJevbenchV161Release()]) {
    for (const s of release.artifact.systems) if (typeof s.adapter_id === 'string') assert.doesNotMatch(s.adapter_id, /^\/|\/home\//);
  }
});
