import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// CR-575 (Florian 27 Oct 2026): before the "Use" buttons go public, every click carries attribution for decisionmodels.io,
// the panel frames it as running open weights yourself, and a one-line disclosure says both sites are the same company.

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('CR-575: hub links carry ref plus utm attribution, anchors stay last', async () => {
  const lib = await read('../lib/use-model.ts');
  assert.match(lib, /\?ref=\$\{benchmark\}&utm_source=benchmarkheaven&utm_medium=use-button&utm_content=\$\{encodeURIComponent\(slug\)\}\$\{hash\}/);
});

test('CR-575: disclosure in the hover panel and under the ranking, neutral for every open-weights row', async () => {
  const [lib, button, capability] = await Promise.all([read('../lib/use-model.ts'), read('../components/UseModelButton.tsx'), read('../components/JevCapabilityRanking.tsx')]);
  assert.match(lib, /USE_MODEL_DISCLOSURE = '[^']*same company as Benchmark Heaven[^']*never affects scores or ranks\.'/);
  assert.match(button, /data-bh-use-model-disclosure>\{USE_MODEL_DISCLOSURE\}/);
  assert.match(button, /export function UseModelNote[\s\S]*if \(!enabled\) return null;/, 'the note follows the same preview gate as the buttons');
  assert.match(capability, /<UseModelNote /);
  assert.match(button, /Run it yourself/);
});

test('CR-575: the top-10 open-weights rows of the live JevBench board have a hub slug', async () => {
  const slugs = JSON.parse(await read('../data/use-model-slugs.json'));
  for (const key of ['h2o-lightning-31b', 'quyet-1-0-large', 'decisio-gemma-4-31b-v080', 'sieve-31b-v2', 'arcbright-elf-1-31b'])
    assert.ok(key in slugs.jevbench, `${key} has a decisionmodels.io page`);
});
