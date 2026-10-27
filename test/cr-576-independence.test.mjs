import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
const slugs = JSON.parse(await read('../data/use-model-slugs.json'));
const optOuts = JSON.parse(await read('../data/use-model-optout.json'));

async function load(path, mocks = {}) {
  const code = ts.transpileModule(await read(path), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
  }, { filename: path });
  return exports;
}

const loadEligibility = (entries) => load('../lib/use-model.ts', {
  '../data/use-model-slugs.json': slugs, '../data/use-model-optout.json': entries,
});

test('CR-576: explicitly disabling the public flag makes independence a server-side 404', async () => {
  const lib = await loadEligibility(optOuts);
  const notFound = () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); };
  const page = await load('../app/independence/page.tsx', {
    '../../lib/use-model': { ...lib, USE_MODEL_PUBLIC: false }, 'next/navigation': { notFound },
  });
  assert.throws(() => page.default(), /NEXT_HTTP_ERROR_FALLBACK;404/);
  assert.equal(page.metadata.robots.index, false);
  assert.doesNotMatch(await read('../app/independence/page.tsx'), /['"]use client['"]/);
});

test('CR-576: public page uses existing methodology, data and contact routes', async () => {
  const page = await load('../app/independence/page.tsx', {
    '../../lib/use-model': await loadEligibility(optOuts),
    'next/navigation': { notFound() { assert.fail('public page must render'); } },
  });
  const html = renderToStaticMarkup(page.default());
  assert.match(html, /How Benchmark Heaven stays independent/);
  for (const path of ['/about', '/jev-models/methodology', '/jev-models/data']) {
    await read(`../app${path}/page.tsx`);
    assert.ok(html.includes(`href="${path}`));
  }
  assert.match(html, /mailto:info@productivity-boost\.com/);
  assert.match(await read('../app/about/page.tsx'), /mailto:info@productivity-boost\.com/);
  const text = html.replace(/<[^>]+>/g, ' ');
  const words = text.trim().split(/\s+/).length;
  assert.ok(words >= 250 && words <= 400, `page has ${words} words`);
});

test('CR-576: author opt-outs suppress only the named benchmark link', async () => {
  assert.ok(Array.isArray(optOuts));
  for (const entry of optOuts) {
    assert.ok(['jevbench', 'imagejevbench'].includes(entry.benchmark));
    assert.equal(typeof entry.key, 'string');
    assert.ok(entry.key.length > 0);
  }
  // Put the same key on both boards to prove that requests are benchmark-scoped.
  const key = Object.keys(slugs.jevbench)[0];
  const fixtureSlugs = { ...slugs, imagejevbench: { ...slugs.imagejevbench, [key]: 'fixture-model' } };
  const base = await loadEligibility([]);
  const removed = await load('../lib/use-model.ts', {
    '../data/use-model-slugs.json': fixtureSlugs,
    '../data/use-model-optout.json': [{ benchmark: 'jevbench', key }],
  });
  assert.equal(base.useModelEligible({ key }, 'jevbench'), true);
  const row = { key, score: 71, rank: 3, listing: 'ranked' };
  const before = structuredClone(row);
  assert.equal(removed.useModelEligible(row, 'jevbench'), false);
  assert.equal(removed.useModelEligible({ key }, 'imagejevbench'), true);
  assert.deepEqual(row, before, 'opt-out does not mutate ranking data');
  assert.equal(removed.useModelHref(key, 'jevbench'), base.useModelHref(key, 'jevbench'));
  const imageKey = Object.keys(slugs.imagejevbench)[0];
  const imageRemoved = await loadEligibility([{ benchmark: 'imagejevbench', key: imageKey }]);
  assert.equal(imageRemoved.useModelEligible({ key: imageKey }, 'imagejevbench'), false);
  assert.equal(base.useModelEligible({ key, api_flag: true }, 'jevbench'), false);
  for (const listing of ['reference', 'wrapper', 'api_offering']) {
    assert.equal(base.useModelEligible({ key, listing }, 'jevbench'), false);
  }
  assert.equal(base.useModelEligible({ key: 'unmapped-model' }, 'jevbench'), false);
});

test('CR-576: both gated disclosures link to independence', async () => {
  const button = await read('../components/UseModelButton.tsx');
  assert.match(button, /data-bh-use-model-disclosure>[^\n]*href="\/independence"/);
  assert.match(button, /export function UseModelNote[\s\S]*if \(!enabled\) return null;[\s\S]*href="\/independence"/);
});
