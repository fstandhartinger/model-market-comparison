import test from 'node:test';
import assert from 'node:assert/strict';
import { readJevbenchV155Release, withPublicAdapterIds } from '../lib/jevbench-v15-release.mjs';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';

// Runner-local spec paths in adapter_id reached the page payload; Google followed them as links and reported 404s.
test('page payloads carry no local directory in adapter ids; the read artifact stays raw', async () => {
  for (const release of [await readJevbenchV155Release(), await readJevbenchV161Release()]) {
    const shown = withPublicAdapterIds(release.artifact);
    assert.equal(shown.systems.length, release.artifact.systems.length);
    for (const s of shown.systems) if (typeof s.adapter_id === 'string') assert.doesNotMatch(s.adapter_id, /^\/|\/home\//);
    assert.ok(release.artifact.systems.some((s) => String(s.adapter_id ?? '').startsWith('/home/')), 'reader output is untouched');
  }
  assert.equal(withPublicAdapterIds({ systems: [{ adapter_id: '/a/b/specs/lev.json:pkg.Adapter' }] }).systems[0].adapter_id, 'lev.json:pkg.Adapter');
});
