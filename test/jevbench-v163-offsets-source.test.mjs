// Pure synthetic Source validation. No published data/proof, private input, native runtime or scorer execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
function containedImports(text, sourceUrl) {
  return text.replace(/from (['"])(\.\.?\/[^'"]+)\1/g, (_, q, rel) => `from ${q}${new URL(rel, sourceUrl).href}${q}`)
    .replaceAll('import.meta.url', JSON.stringify(sourceUrl.href));
}
const sourceUrl = new URL('../lib/jevbench-v163-release.mjs', import.meta.url);
// Test-only export of the exact production private validator; production Source has no extra export or mutation.
const production = await readFile(sourceUrl, 'utf8');
const loader = await import(`data:text/javascript;base64,${Buffer.from(containedImports(production, sourceUrl) + '\nexport { validateResults as testResults };').toString('base64')}`);
const fixtureUrl = new URL('./jevbench-v163-release.test.mjs', import.meta.url);
const fixtureSource = await readFile(fixtureUrl, 'utf8');
const beforeTests = fixtureSource.slice(0, fixtureSource.indexOf("\ntest('"));
assert.ok(beforeTests.includes('async function fixture('));
const helpers = await import(`data:text/javascript;base64,${Buffer.from(containedImports(beforeTests, fixtureUrl) + '\nexport {fixture};').toString('base64')}`);

test('native completed-five preserves finite signed unused scorer offsets', async () => {
  const b = await helpers.fixture(false);
  b.artifact.v16.equating.offsets = { I: -3.8334406789249726, C: 3.267161949072104 };
  assert.doesNotThrow(() => loader.testResults(b.artifact, b.predecessor.artifact));
  assert.deepEqual(b.artifact.v16.equating.offsets, { I: -3.8334406789249726, C: 3.267161949072104 });
});
test('old null unused offsets remain accepted', async () => {
  const b = await helpers.fixture(false); b.artifact.v16.equating.offsets = null;
  assert.doesNotThrow(() => loader.testResults(b.artifact, b.predecessor.artifact));
});
test('missing keys, extras and nonfinite offsets fail closed', async () => {
  for (const offsets of [{}, {I:1}, {C:2}, {I:1,C:2,extra:3}, {I:NaN,C:2}, {I:1,C:Infinity}, {I:-Infinity,C:2}, undefined]) {
    const b = await helpers.fixture(false);b.artifact.v16.equating.offsets = offsets;
    assert.throws(() => loader.testResults(b.artifact, b.predecessor.artifact));
  }
});
