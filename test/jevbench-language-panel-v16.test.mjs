import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import Module from 'node:module';
import { languageComparisonView } from '../lib/jevbench-languages-v16.mjs';
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
test('historic comparison without a supplement keeps all four figures and both selected systems', () => {
  const html = renderToStaticMarkup(React.createElement(JevCompareV15, { rows: comparisonRows, openDecisions: 300, sealedDecisions: 1200 }));
  assert.equal((html.match(/data-bh-jev15-radar=/g) ?? []).length, 4);
  assert.match(html, /data-bh-jev15-compare-a="synthetic-a"/);
  assert.match(html, /data-bh-jev15-compare-b="synthetic-b"/);
  assert.doesNotMatch(html, /data-bh-jev16-language|Language diagnostics/);
});
test('invalid supplementary data shows unavailable while preserving existing comparison figures', () => {
  const html = renderToStaticMarkup(React.createElement(JevCompareV15, { rows: comparisonRows, openDecisions: 300, sealedDecisions: 1200,
    languageDiagnostics: { kind: 'language-diagnostics', fixture: true } }));
  assert.equal((html.match(/data-bh-jev15-radar=/g) ?? []).length, 4);
  assert.match(html, /data-bh-jev16-language-unavailable/);
  assert.doesNotMatch(html, /jev16-language-radar/);
});
function syntheticView() {
  const languages = Array.from({ length: 22 }, (_, i) => ({ key: `fixture-${i}`, label: `Synthetic language ${i}`,
    public_n: 40, sealed_n: 40, native_review_basis: 'Synthetic fixture only, not an actual native review' }));
  const publicCells = Object.fromEntries(languages.map((language) => [language.key, { status: 'measured', n: 40,
    expected_n: 40, non_ok_n: 2, cc: -12.5, accuracy: 0.25, measured_on: '2000-01-01T00:00:00Z', reason: null }]));
  const unavailable = Object.fromEntries(languages.map((language) => [language.key, { status: 'unavailable', n: 0,
    expected_n: 0, non_ok_n: 0, cc: null, accuracy: null, measured_on: null, reason: 'API supplement is public-only.' }]));
  return { revision: 'v1.6.0', generated_utc: '2000-01-02T00:00:00Z', basis: 'uc1.1 Choice only', split: 'public', minN: 30, languages, comparable: true, reason: null,
    method: { version: 'synthetic fixture', description: 'No real measurement or score.', source_sha256: 'a'.repeat(64) },
    systems: { 'synthetic-local': { name: 'Synthetic local model', public: publicCells, sealed: publicCells, carried_base: null },
      'synthetic-api': { name: 'Synthetic API model', public: publicCells, sealed: unavailable,
        carried_base: { revision: 'v1.6.0', method_version: 'synthetic-v16', basis: 'original primary fixture', n: 600,
          measured_on: '1999-12-31T00:00:00Z', source_sha256: 'b'.repeat(64) } } } };
}
const pair = ['synthetic-local', 'synthetic-api'];
const render = (view) => renderToStaticMarkup(React.createElement(JevLanguageComparisonV16, { view, pair, onSplitChange() {} }));
test('unwired panel shows all22 language rows, actual counts/dates, raw negative cc and separate dated carry', () => {
  const html = render(syntheticView());
  assert.equal((html.match(/<th scope="row"/g) ?? []).length, 22);
  assert.match(html, /-12\.5/); assert.match(html, /n=40\/40/);
  assert.match(html, /2000-01-01T00:00:00Z/); assert.match(html, /1999-12-31T00:00:00Z/);
  assert.match(html, /2 non-OK decisions counted wrong/);
  assert.match(html, /separate from the supplementary language cells/);
  assert.match(html, /Choice-only/); assert.match(html, /not Capability Scores/);
  assert.equal((html.match(/data-bh-jev12-radar-spoke=/g) ?? []).length, 6);
});
test('API sealed cells remain unavailable and are never drawn as zero or mixed with carried original data', () => {
  const view = syntheticView(); view.split = 'sealed'; view.comparable = false; view.reason = 'Hosted APIs have no sealed supplement.';
  const html = render(view);
  assert.doesNotMatch(html, /data-bh-jev12-radar-svg/);
  assert.equal((html.match(/API supplement is public-only/g) ?? []).length, 22);
  assert.match(html, /n=0\/0/); assert.match(html, /not measured/);
});
test('different input scopes suppress the comparison radar while retaining own-scope table rows', () => {
  const view = syntheticView(); view.comparable = false; view.reason = 'Input scope hashes differ.';
  const html = render(view);
  assert.doesNotMatch(html, /data-bh-jev12-radar-svg/); assert.match(html, /Input scope hashes differ/);
  assert.equal((html.match(/<th scope="row"/g) ?? []).length, 22);
});
test('existing release pages and artifact loaders do not adopt the pending supplement', () => {
  for (const path of ['../app/jev-models/page.tsx', '../components/JevBenchV15Preview.tsx', '../components/JevBenchV15ReleasePage.tsx', '../lib/jevbench-categories.mjs'])
    assert.doesNotMatch(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), /JevLanguageComparisonV16|jevbench-languages-v16/);
});

test('unavailable same-scope cells produce no empty comparison polygon', () => {
  const view = syntheticView(); view.systems['synthetic-api'].public = view.systems['synthetic-api'].sealed;
  const html = render(view); assert.doesNotMatch(html, /data-bh-jev12-radar-svg/);
});

test('exact validated aggregate helper output renders with the public-only API contract', () => {
  const view = syntheticView();
  const keys = ['ar', 'da', 'zh-Hans', ...Array.from({ length: 19 }, (_, index) => `fixture-code-${index}`)];
  const languages = view.languages.map((language, index) => ({ ...language, key: keys[index] }));
  const systems = Object.fromEntries(pair.map((key, index) => {
    const original = view.systems[key];
    const cells = (split) => Object.fromEntries(languages.map((language, i) => {
      const cell = original[split][view.languages[i].key];
      return [language.key, { ...cell, n_by_type: cell.n ? { choice: cell.n } : {}, low_n: cell.n < 30 }];
    }));
    return [key, { name: original.name, deployment: index ? 'api' : 'owned', model_version: 'synthetic',
      public_scope_sha256: 'c'.repeat(64), sealed_scope_sha256: index ? null : 'd'.repeat(64),
      public: cells('public'), sealed: cells('sealed'), carried_base: original.carried_base }];
  }));
  const artifact = { kind: 'language-diagnostics', schema_version: 1, benchmark: 'jevbench', revision: view.revision,
    supplement_id: 'v1.6.0-uc1.1', basis: view.basis, fixture: true, generated_utc: view.generated_utc,
    pool_manifest_sha256: 'e'.repeat(64), method: view.method, languages, systems };
  const checked = languageComparisonView(artifact, pair, 'public', { allowFixture: true });
  assert.match(render(checked), /-12\.5/);
  const sealed = languageComparisonView(artifact, pair, 'sealed', { allowFixture: true });
  assert.doesNotMatch(render(sealed), /data-bh-jev12-radar-svg/);
});
