import test from 'node:test';
import assert from 'node:assert/strict';
import { JEVBENCH_V15_METHOD_LINKS } from '../lib/jevbench-v15-preview.mjs';

test('every JevBench v1.5 method link resolves', async (t) => {
  assert.equal(JEVBENCH_V15_METHOD_LINKS.length, 8, 'the frozen method and all seven addenda are checked');
  await Promise.all(JEVBENCH_V15_METHOD_LINKS.map(async (doc) => {
    await t.test(doc.filename, async () => {
      const response = await fetch(doc.url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(15_000),
      });
      assert.equal(response.status, 200, `${doc.label} must return HTTP 200 (${doc.url})`);
    });
  }));
});
