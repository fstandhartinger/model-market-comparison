// CR-74.3 (= CR-70): no separate thin-evidence band in the Overview table; thin rows carry an accessible badge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const src = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('CR-74.3: the Overview ranking renders no "Insufficient evidence" group header', async () => {
  const explorer = await src('components/ModelExplorer.tsx');
  assert.doesNotMatch(explorer, /Insufficient evidence|data-evidence-band|bandStart/);
  assert.doesNotMatch(await src('app/about/page.tsx'), /insufficient evidence&rdquo; band/);
});

test('CR-74.3: thin rows carry a "Thin data" badge with title, sr-only note and a legend line', async () => {
  const explorer = await src('components/ModelExplorer.tsx');
  assert.match(explorer, /const thin = composite && isThinComposite\(m\);/);
  assert.match(explorer, /\{thin && <span[^>]*><span className="bh-thin-tag" data-thin-evidence[^>]*title=\{note\}>/);
  assert.match(explorer, /<span className="sr-only">\{note\}<\/span>/);
  assert.match(explorer, /data-bh-tag-legend="thin"[\s\S]{0,200}Thin data/);
  const css = await src('app/globals.css');
  assert.match(css, /\.bh-thin-tag \{/);
  assert.match(css, /@media \(max-width: 1023px\) \{ \.bh-thin-tag/);
});
