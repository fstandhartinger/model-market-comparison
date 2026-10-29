import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import ts from 'typescript';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const code = ts.transpileModule(read('lib/dm-compare-links.ts'), {
  compilerOptions: {module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022},
}).outputText;
const {DM_COMPARE_DISCLOSURE, DM_COMPARE_FALLBACK, dmCompareHref} = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const rivalKeys = readdirSync(new URL('../app/jev-models/', import.meta.url))
  .filter((name) => name.startsWith('jev-vs-'))
  .map((name) => {
    const key = read(`app/jev-models/${name}/page.tsx`).match(/rivalKey="([^"]+)"/)?.[1];
    assert.ok(key, `${name} must name its comparison rival`);
    return key;
  });

test('every comparison rival gets an attributed Decision Models HTTPS link', () => {
  assert.ok(rivalKeys.length > 0);
  for (const key of [...rivalKeys, 'alternatives']) {
    const url = new URL(dmCompareHref(key));
    assert.equal(url.origin, 'https://decisionmodels.io');
    assert.equal(url.searchParams.get('utm_source'), 'benchmarkheaven');
    assert.equal(url.searchParams.get('utm_medium'), 'compare-page');
    assert.equal(url.searchParams.get('utm_content'), key);
    assert.equal(url.searchParams.has('ref'), false);
  }
});

test('vendor comparisons use their specific pages and other rivals use the fallback', () => {
  const paths = {
    'openai-decisions': '/openai-decisions-api-alternative',
    'microsoft-decision-1': '/decision-1-vs-decision-models',
    laya: '/laya-model',
    'kev-27b': '/kev-model',
  };
  for (const key of Object.keys(paths)) assert.ok(rivalKeys.includes(key), key);
  for (const key of rivalKeys) {
    assert.equal(new URL(dmCompareHref(key)).pathname, paths[key] ?? DM_COMPARE_FALLBACK.path, key);
  }
  for (const key of ['alternatives', 'unlisted model/&?']) {
    assert.equal(new URL(dmCompareHref(key)).pathname, '/jev-compatible-apis-compared');
    assert.equal(new URL(dmCompareHref(key)).searchParams.get('utm_content'), key);
  }
  assert.ok(dmCompareHref('unlisted model/&?').endsWith('unlisted%20model%2F%26%3F'));
});

test('comparison and alternatives boxes show the shared disclosure and plain text CTA', () => {
  assert.equal(DM_COMPARE_DISCLOSURE, 'Decision Models is run by the same company as Benchmark Heaven. This link is the same on every comparison page and never affects scores or ranks.');
  for (const path of ['components/JevComparisonPage.tsx', 'app/jev-models/alternatives/page.tsx']) {
    const source = read(path);
    assert.match(source, /\{DM_COMPARE_DISCLOSURE\}/);
    assert.match(source, /Using these models through an API/);
    assert.equal((source.match(/data-cta="bh-compare-dm"/g) ?? []).length, 1);
    assert.match(source, /<a className="text-accent underline" href=\{dmCompareHref\([^}]+\)\} rel="noopener" data-cta="bh-compare-dm">/);
  }
  const comparison = read('components/JevComparisonPage.tsx');
  assert.ok(comparison.indexOf('data-bh-jev-price-notes') < comparison.indexOf('data-cta="bh-compare-dm"'));
  assert.ok(comparison.indexOf('data-cta="bh-compare-dm"') < comparison.indexOf('data.comparisons.filter'));
  assert.match(read('app/jev-models/alternatives/page.tsx'), /dmCompareHref\('alternatives'\)/);
});
