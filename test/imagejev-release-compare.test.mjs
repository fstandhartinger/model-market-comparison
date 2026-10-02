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
  assert.match(html, /measured, no composite rank/);
  assert.match(html, /archive reference only/);
  assert.doesNotMatch(html, /historical-reference, not ranked|measured-unrankable, not ranked/);
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

test('every unavailable exact v02 source stays unlinked in the comparison legend', () => {
  const measured = rows.find(r => r.key === 'wity_1');
  for (const key of ['neohorse_jev_4b', 'jevany_27b_sft', 'jevany_27b_rlcr']) {
    const reference = rows.find(r => r.key === key);
    assert.ok(reference);
    const html = render([measured, reference]);
    assert.doesNotMatch(html, new RegExp(`data-bh-jev-source="${key}"`));
    assert.match(html, /archive reference only/);
    assert.match(html, /Score —/);
  }
});

test('v02 category radar plots below-chance values on the correct signed spoke and keeps NULL absent', () => {
  const pair = [rows.find(r => r.key === 'wity_1'), rows.find(r => r.listing === 'historical-reference')];
  const cats = ['minimum', 'below_chance', 'chance', 'perfect'].map(key => ({
    key, label: key, short: key, covers: key, n: 20, split: { a: 10, b: 10 }, lowN: false, plotted: true,
  }));
  const categories = { revision: 'v0.2.0', minN: 15, metric: 'Synthetic signed geometry only', labelling: 'Test fixture', rules: [],
    splitNames: ['public', 'sealed'], dims: [{ key: 'capabilities', title: 'Category geometry', note: 'Diagnostic', cats }],
    systems: { [pair[0].key]: { capabilities: Object.fromEntries(cats.map((c, i) => [c.key, [[-100, -50, 0, 100][i], 20]])) } },
    missing: { [pair[1].key]: 'No native category results' } };
  const draw = (revision, data) => renderToStaticMarkup(React.createElement(JevCompareV15,
    { rows: pair, openDecisions: 157, sealedDecisions: 261, axesOnly: true, imageRevision: revision, categories: data }));
  const html = draw('v0.2.0', categories);
  const figure = html.match(/<figure[^>]+data-bh-jev15-radar="cat-capabilities"[\s\S]*?<\/figure>/)?.[0];
  assert.ok(figure);
  assert.match(figure, /data-bh-imagejev-v02-radar-scale="-100\.\.100"/);
  assert.match(figure, /points="250,204 278,204 250,260 138,204"/);
  assert.match(figure, /minimum: -100\.0 vs —; below_chance: -50\.0 vs —; chance: 0\.0 vs —/);
  assert.match(figure, /middle ring is chance \(0\)/);
  assert.match(figure, /stroke-dasharray="3 3" data-bh-imagejev-v02-chance-ring="true"/);
  assert.doesNotMatch(figure, /data-bh-jev12-radar-value="b:/);
  const axes = html.match(/<figure[^>]+data-bh-jev15-radar="axes"[\s\S]*?<\/figure>/)?.[0];
  assert.doesNotMatch(axes, /data-bh-imagejev-v02-radar-scale/);
  const legacy = draw('v0.1.5', { ...categories, revision: 'v0.1.5' });
  assert.doesNotMatch(legacy, /data-bh-imagejev-v02-radar-scale/);
  assert.match(legacy, /points="250,204 250,204 250,204 138,204"/);
  assert.doesNotMatch(legacy, /data-bh-imagejev-v02-chance-ring/);
});

test('signed radar bounds invalid geometry defensively and never plots a thin or NULL cell', async () => {
  const { Radar } = await import(await compile(new URL('../components/JevRadars.tsx', import.meta.url)));
  const spokes = [-999, 999, 0, null].map((v, i) => ({ key: `c${i}`, lines: [`c${i}`],
    values: [v], texts: [v === null ? '—' : String(v)], thin: [i === 2] }));
  const props = { spokes, series: [{ name: 'TESTONLY', stroke: '#000', dashed: false, square: false }],
    size: { w: 500, h: 400, r: 112 }, id: 'TESTONLY', title: 'Synthetic invalid geometry', desc: 'No release data' };
  const html = renderToStaticMarkup(React.createElement(Radar, { ...props, signed: true }));
  assert.match(html, /points="250,204 362,204" fill="#000"/);
  assert.equal((html.match(/<circle /g) ?? []).length, 2);
  assert.doesNotMatch(html, /data-bh-jev12-radar-value="a:c3"/);
  const legacy = renderToStaticMarkup(React.createElement(Radar, { ...props, spokes: spokes.map(s => ({ ...s, values: [50], thin: [false] })) }));
  assert.match(legacy, /points="250,148 306,204 250,260 194,204" fill="#000"/);
  assert.equal((legacy.match(/data-radar-ring="true"/g) ?? []).length, 2);
  assert.doesNotMatch(legacy, /data-bh-imagejev-v02-(?:radar-scale|chance-ring)/);
});
