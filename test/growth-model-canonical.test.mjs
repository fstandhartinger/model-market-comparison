import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findModel, modelCanonicalPath } from '../lib/model-canonical.mjs';

// Growth SEO, 12 Nov 2026: sitemap family URLs and model-page canonicals must agree.
const models = [
  { id: 'claude-opus-5.5::max', family_key: 'claude-opus-5.5' },
  { id: 'claude-opus-5.5::high', family_key: 'claude-opus-5.5' },
  { id: 'solo-model', family_key: 'solo-model' },
];

test('the variant a family URL resolves to is canonical at the family URL', () => {
  const rep = findModel(models, 'claude-opus-5.5');
  assert.equal(rep.id, 'claude-opus-5.5::max');
  assert.equal(modelCanonicalPath(models, rep), '/models/claude-opus-5.5');
  // the same variant reached by its own id or a stale variant id still names the family URL
  assert.equal(modelCanonicalPath(models, findModel(models, 'claude-opus-5.5%3A%3Amax')), '/models/claude-opus-5.5');
  assert.equal(modelCanonicalPath(models, findModel(models, 'claude-opus-5.5::gone')), '/models/claude-opus-5.5');
});

test('other variants keep their own encoded URL as canonical', () => {
  assert.equal(modelCanonicalPath(models, findModel(models, 'claude-opus-5.5::high')), '/models/claude-opus-5.5%3A%3Ahigh');
  assert.equal(modelCanonicalPath(models, findModel(models, 'solo-model')), '/models/solo-model');
});

test('sitemap lists family URLs and the model page uses the shared canonical helper', () => {
  const sitemapSrc = readFileSync(new URL('../app/sitemap.ts', import.meta.url), 'utf8');
  assert.match(sitemapSrc, /families\.map\(\(key\) => \(\{ url: `\$\{SITE_URL\}\/models\/\$\{encodeURIComponent\(key\)\}`/);
  const pageSrc = readFileSync(new URL('../app/models/[id]/page.tsx', import.meta.url), 'utf8');
  assert.match(pageSrc, /path: modelCanonicalPath\(ds\.models, model\)/);
});
