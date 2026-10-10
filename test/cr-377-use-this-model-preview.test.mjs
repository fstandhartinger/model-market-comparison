import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// CR-377 (Florian 9 Oct 2026): "Use this model" next to open-weights rows on JevBench and ImageJevBench is a PREVIEW.
// It stays invisible to visitors and crawlers until Florian's GO, which is a one-line change of USE_MODEL_PUBLIC.

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('CR-377: the entry is off for everyone unless the preview parameter was opened', async () => {
  const [lib, button] = await Promise.all([read('../lib/use-model.ts'), read('../components/UseModelButton.tsx')]);
  assert.match(lib, /export const USE_MODEL_PUBLIC = false;/, 'rolling it out needs Florian\'s GO; keep this false until then');
  assert.match(button, /useSyncExternalStore\(subscribe, readFlag, \(\) => false\)/, 'the server snapshot is always off, so crawlers and visitors get the unchanged HTML');
  assert.match(button, /if \(!enabled\) return null;/, 'a disabled button renders nothing, not even a wrapper that would shift the row layout');
});

test('CR-377 (10 Oct): the preview lives only in the tab opened with the private link and always shows a banner', async () => {
  const [lib, button] = await Promise.all([read('../lib/use-model.ts'), read('../components/UseModelButton.tsx')]);
  assert.match(lib, /USE_MODEL_TOKEN = '[a-z0-9-]{6,}'/, 'a bare ?bh-pv=1 must not switch it on');
  assert.doesNotMatch(button, /localStorage\.setItem/, 'Florian 10 Oct: never remembered per browser');
  assert.match(button, /localStorage\.removeItem\(USE_MODEL_STORAGE_KEY\)/, 'the 9 Oct per-browser flag is cleared');
  assert.match(button, /sessionStorage\.setItem\(USE_MODEL_STORAGE_KEY, '1'\)/);
  assert.match(button, /if \(enabled\) \{ stripParam\(\); showBanner\(\); \}/, 'token leaves the address bar and the PREVIEW banner appears');
});

test('CR-377: slugs come from the Decision Models hub mapping and cover only open-weights keys', async () => {
  const slugs = JSON.parse(await read('../data/use-model-slugs.json'));
  assert.equal(slugs.source_schema, 'decisionmodels-model-map/1');
  for (const bench of ['jevbench', 'imagejevbench']) {
    const entries = Object.entries(slugs[bench]);
    assert.ok(entries.length >= 40, `${bench} has a hub mapping`);
    for (const [key, slug] of entries) assert.match(slug, /^[a-z0-9][a-z0-9.-]*$/, `${bench}:${key} slug "${slug}" is URL-safe`);
  }
  assert.ok(!('jev-1.13.0' in slugs.jevbench), 'the Jev reference (hosted API) has no run-it-yourself page');
});

test('CR-377: links go to decisionmodels.io/models/<slug> with an attribution parameter and no row of a hosted API', async () => {
  const lib = await read('../lib/use-model.ts');
  assert.match(lib, /USE_MODEL_HUB = 'https:\/\/decisionmodels\.io\/models'/);
  assert.match(lib, /\?ref=\$\{benchmark\}/);
  assert.match(lib, /if \(row\.api_flag\) return false;/, 'hosted API rows are never offered');
});

test('CR-377: the entry is wired into the capability chart and the composite chart rows', async () => {
  const [capability, shared] = await Promise.all([read('../components/JevCapabilityRanking.tsx'), read('../components/JevBoardShared.tsx')]);
  assert.match(capability, /<UseModelEntry row=\{row\}/);
  assert.match(shared, /!reference && <UseModelEntry row=\{row\}/);
});
