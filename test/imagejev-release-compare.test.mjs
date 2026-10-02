import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { imageJevReleaseCompareRows } from '../lib/imagejev-compare.mjs';
import { readMultimodalPreviewV02, readMultimodalPreview, readArchivedMultimodalPreviewV014 } from '../lib/jevbench-multimodal-preview.mjs';

const require = createRequire(import.meta.url);
const cache = new Map();
const dataUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
async function compile(url) {
  if (cache.has(url.href)) return cache.get(url.href);
  const source = await readFile(url, 'utf8');
  if (url.pathname.endsWith('.json')) return dataUrl(`export default ${source}`);
  let code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  for (const match of [...code.matchAll(/\bfrom\s*(["'])([^"']+)\1/g)]) {
    const spec = match[2];
    let target;
    if (spec.startsWith('.')) {
      let path = new URL(spec, url);
      if (!/\.(?:mjs|json)$/.test(path.pathname)) {
        try { await readFile(`${path.pathname}.tsx`); path = new URL(`${path.href}.tsx`); }
        catch { path = new URL(`${path.href}.ts`); }
        target = await compile(path);
      } else target = path.pathname.endsWith('.json') ? await compile(path) : path.href;
    } else target = `file://${require.resolve(spec)}`;
    code = code.replace(match[0], `from ${JSON.stringify(target)}`);
  }
  const result = dataUrl(code); cache.set(url.href, result); return result;
}
const { JevCompareV15 } = await import(await compile(new URL('../components/JevCompareV15.tsx', import.meta.url)));
const { artifact } = await readMultimodalPreviewV02();
const rows = imageJevReleaseCompareRows(artifact);
const render = (pair, imageRevision = 'v0.2.0') => renderToStaticMarkup(React.createElement(JevCompareV15,
  { rows: pair, openDecisions: 157, sealedDecisions: 261, axesOnly: true, imageRevision }));

test('release comparison has 51 distinct current identities and separate 50-row archives', async () => {
  assert.equal(rows.length, 51); assert.equal(new Set(rows.map(r => r.key)).size, 51);
  assert.deepEqual(['ranked', 'measured-unrankable', 'historical-reference'].map(s => rows.filter(r => r.listing === s).length), [45, 3, 3]);
  for (const original of [...artifact.ranking, ...artifact.measured_unrankable_rows]) {
    const row = rows.find(r => r.key === original.key);
    assert.equal(row.rank, original.rank); assert.equal(row.score, original.tracks.core.composite?.score ?? null);
    assert.deepEqual(row.axes, original.tracks.core.axes);
  }
  assert.equal(imageJevReleaseCompareRows(await readMultimodalPreview()).length, 50);
  assert.equal(imageJevReleaseCompareRows((await readArchivedMultimodalPreviewV014()).artifact).length, 50);
});

test('Image comparison plots measured zero axes and keeps missing reference axes absent', () => {
  const zero = rows.find(r => r.key === 'imajev_4b_20260926');
  const reference = rows.find(r => r.listing === 'historical-reference');
  const html = render([zero, reference]);
  assert.match(html, /Intelligence: 0\.0 vs —/);
  assert.match(html, /Cost: — vs —/);
  assert.match(html, /Missing axes are shown as — and are not plotted/);
  assert.doesNotMatch(html, /none \(0\)|href="[^"]+"[^>]*data-bh-jev-source/);
  assert.equal(reference.score, null); assert.deepEqual(Object.values(reference.axes), [null, null, null, null]);
  const legacy = renderToStaticMarkup(React.createElement(JevCompareV15, { rows: [zero, reference], openDecisions: 157, sealedDecisions: 261, axesOnly: true }));
  assert.match(legacy, /none \(0\)/);
});

test('Image legend uses the selected Image release source rather than colliding text keys', () => {
  const wity = rows.find(r => r.key === 'wity_1');
  const imajev = rows.find(r => r.key === 'imajev_4b');
  const html = render([wity, imajev]);
  assert.match(html, /data-bh-jev-source="imajev_4b"/);
  assert.ok(html.includes(imajev.repo));
  assert.match(html, /Score 69\.6/);
});
