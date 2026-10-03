import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import Module from 'node:module';
import { currentCategoryView } from '../lib/jevbench-categories-v16.mjs';
import { categoryFixture } from './jevbench-category-fixture-v16.mjs';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const cache = new Map();
function ownComponent(name) {
  if (cache.has(name)) return cache.get(name);
  let path = new URL(`../components/${name}.tsx`, import.meta.url);
  if (!fs.existsSync(path)) path = new URL(`../components/${name}.ts`, import.meta.url);
  const source = fs.readFileSync(path, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = new Module(path.pathname);
  module.filename = path.pathname;
  module.require = (specifier) => {
    if (specifier === './JevRadars') return ownComponent('JevRadars');
    if (specifier === './JevCategoryProfilesV16') return ownComponent('JevCategoryProfilesV16');
    if (specifier === './JevLanguageComparisonV16') return ownComponent('JevLanguageComparisonV16');
    if (['./jevTypes', './jevSystemLinks', './useJevV15VisibleKeys'].includes(specifier)) return ownComponent(specifier.slice(2));
    // The picker is a display stub; selection state and all comparison figures are actual source.
    if (specifier === './JevCompareV14') return { SystemCombobox: ({ label }) => React.createElement('span', null, label) };
    if (specifier.startsWith('../lib/') || specifier.startsWith('../data/')) return require(specifier);
    if (['react', 'react/jsx-runtime'].includes(specifier)) return require(specifier);
    throw new Error(`Unexpected dependency in isolated own-source renderer: ${specifier}`);
  };
  module._compile(compiled, path.pathname);
  cache.set(name, module.exports);
  return module.exports;
}
const { JevLanguageComparisonV16 } = ownComponent('JevLanguageComparisonV16');
const { JevCompareV15 } = ownComponent('JevCompareV15');
const comparisonRows = ['synthetic-a', 'synthetic-b'].map((key, i) => ({ key, name: key, cls: 'classifier', rank: i + 1,
  listing: 'ranked', score: 50, axes: { intelligence: 50, calibration: 50, speed: 50, cost: 50 },
  typeCc: Object.fromEntries(['choice', 'noul', 'score'].map((type) => [type, { open: null, sealed: null }])),
  tierCc: Object.fromEntries(['open', 'sealed'].map((split) => [split, Object.fromEntries(['easy', 'standard', 'judge', 'hard'].map((tier) => [tier, null]))])) }));

const { JevCategoryProfilesV16 } = ownComponent('JevCategoryProfilesV16');
const renderCompare = (props = {}) => renderToStaticMarkup(React.createElement(JevCompareV15, { rows: comparisonRows, openDecisions: 300, sealedDecisions: 1200, ...props }));
test('optional current panel retains existing figures/selectors and separates four one-system radars', () => {
  const html = renderCompare({ currentCategories: categoryFixture() });
  assert.equal((html.match(/data-bh-jev15-radar=/g) ?? []).length, 4);
  assert.equal((html.match(/data-bh-jev16-category-radar-system=/g) ?? []).length, 4);
  const panel = html.slice(html.indexOf('<section class="mt-8" aria-labelledby="jev16-category-heading"'));
  assert.equal((panel.match(/data-bh-jev12-radar-series="a"/g) ?? []).length, 4);
  assert.doesNotMatch(panel, /data-bh-jev12-radar-series="b"/);
  for (const phrase of ['S1200+P300', 'A300+P300', '2000-01-01', '2000-01-02', 'n=1500', 'n=600', 'public=300', 'sealed=1200', 'sealed=300', '-12.5', 'not a same-scope comparison', 'failed decisions counted wrong']) assert.ok(html.includes(phrase), phrase);
  assert.equal((panel.match(/<th scope="row"/g) ?? []).length, 24);
  assert.match(html, /data-bh-jev15-compare-swap/); assert.match(html, /data-bh-jev15-compare-copy/);
  assert.match(html, /scorer_sha256/); assert.match(html, /label_runtime_sha256/);
});
test('empty and low-n cells stay in own table, excluded from own plot rather than borrowed or zeroed', () => {
  for (const apiFirst of [0, 20]) {
    const html = renderCompare({ currentCategories: categoryFixture({ apiFirst }) });
    const api = html.slice(html.indexOf('data-bh-jev16-category-system="synthetic-b"'));
    assert.equal((api.match(/data-bh-jev12-radar-spoke="synthetic-0"/g) ?? []).length, 0);
    assert.equal((api.match(/data-bh-jev12-radar-spoke=/g) ?? []).length, 10);
    if (apiFirst === 0) { assert.match(api, /Unavailable/); assert.match(api, /Failure count unavailable/); assert.doesNotMatch(api, /0 failed decisions/); }
    else assert.match(api, /Low n \(below 30\); not plotted/);
  }
});
test('fewer than five supported categories suppresses radar through the real validated comparison path', () => {
  const a = categoryFixture();
  for (const dim of ['topics', 'usecases']) {
    a[dim] = a[dim].slice(0, 4).map(d => ({ ...d, n: 375, public: 75, sealed: 300 }));
    for (const system of Object.values(a.systems)) system[dim] = Object.fromEntries(a[dim].map(d => {
      const n = system.lane === 'api' ? 150 : 375;
      return [d.key, { n, public: 75, sealed: n - 75, n_by_type: { choice: n }, failed: 1,
        accuracy: 0.25, competence: -12.5, score: 0, low_n: false }];
    }));
  }
  a.plotted_coverage_complete = false;
  const html = renderCompare({ currentCategories: a });
  const panel = html.slice(html.indexOf('<section class="mt-8" aria-labelledby="jev16-category-heading"'));
  assert.doesNotMatch(panel, /data-bh-jev12-radar-svg/); assert.equal((panel.match(/<th scope="row"/g) ?? []).length, 16);
  assert.equal((panel.match(/data-bh-jev16-category-insufficient/g) ?? []).length, 4);
});
test('missing current row has no historic radar, invented date or combined carry', () => {
  const rows = comparisonRows.map((r, i) => i ? { ...r, key: 'historic-only', name: 'Historic only' } : r);
  const html = renderCompare({ rows, currentCategories: categoryFixture() });
  assert.equal((html.match(/data-bh-jev16-category-radar-system=/g) ?? []).length, 2);
  assert.match(html, /Historic values are not substituted/); assert.doesNotMatch(html, /2000-01-02/);
});
test('invalid current artifact / held carry shows unavailable, keeping all legacy figures', () => {
  for (const a of [{ kind: 'category-carry' }, { ...categoryFixture(), revision: 'v1.5.5' }]) {
    const html = renderCompare({ currentCategories: a });
    assert.match(html, /data-bh-jev16-category-unavailable/); assert.doesNotMatch(html, /data-bh-jev16-category-radar-system/);
    assert.equal((html.match(/data-bh-jev15-radar=/g) ?? []).length, 4);
  }
});
test('absent optional prop leaves historic rendering unchanged; routes and loaders do not adopt current artifacts', () => {
  assert.doesNotMatch(renderCompare(), /data-bh-jev16-category/);
  for (const path of ['../app/jev-models/page.tsx', '../components/JevBenchV15Preview.tsx', '../components/JevBenchV15ReleasePage.tsx', '../lib/jevbench-categories.mjs'])
    assert.doesNotMatch(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), /currentCategories|jevbench-categories-v16|JevCategoryProfilesV16/);
});

test('both historic topic/use-case radars and their full comparison markup survive optional current profiles', () => {
  const dims = ['topics', 'usecases'].map(key => ({ key, title: `Historic ${key}`, note: 'Synthetic historic method only.',
    cats: Array.from({ length: 5 }, (_, i) => ({ key: `old-${i}`, label: `Historic ${i}`, short: `Old ${i}`, covers: 'Synthetic old category.',
      n: 100, split: { a: 50, b: 50 }, lowN: false, plotted: true })) }));
  const categories = { revision: 'v1.5.5', minN: 30, metric: 'Historic synthetic metric', labelling: 'Historic synthetic labels',
    rules: [], splitNames: ['open', 'sealed'], dims, missing: {}, systems: Object.fromEntries(['synthetic-a', 'synthetic-b'].map(k =>
      [k, Object.fromEntries(dims.map(dim => [dim.key, Object.fromEntries(dim.cats.map(c => [c.key, [-7.5, 100]]))]))])) };
  const historic = renderCompare({ categories }); const combined = renderCompare({ categories, currentCategories: categoryFixture() });
  assert.equal((combined.match(/data-bh-jev15-radar=/g) ?? []).length, 6);
  for (const dim of ['topics', 'usecases']) assert.match(combined, new RegExp(`data-bh-jev15-radar="cat-${dim}"`));
  const start = combined.indexOf('<section class="mt-8" aria-labelledby="jev16-category-heading"');
  assert.equal(combined.slice(0, start), historic.slice(0, -'</div></section>'.length));
});
