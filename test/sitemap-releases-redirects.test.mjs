import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { JEVBENCH_RELEASES } from '../lib/jevbench-releases.mjs';
import { JEV_SYSTEM_SLUG_REDIRECTS, JEV_SUPERSEDED_SLUG_REDIRECTS, isRedirectedJevPath } from '../lib/jev-system-slug.mjs';
import { readJevbenchSeoUrls } from '../lib/jevbench-seo.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('sitemap takes every release page from the release history, not a hard-coded list', () => {
  const src = read('app/sitemap.ts');
  assert.match(src, /JEVBENCH_RELEASES(\s*\.filter\([\s\S]*?\))?\s*\.map/);
  assert.doesNotMatch(src, /"\/jev-models\/v1\.6\.([2-9]|\d\d)"/, 'no hard-coded v1.6.N page after v1.6.1 in the sitemap');
  for (const r of JEVBENCH_RELEASES) assert.ok(existsSync(new URL(`../app${r.href}`, import.meta.url)), `${r.href} has no app route`);
});

test('sitemap URL helper omits URLs that redirect', async () => {
  const { urls } = await readJevbenchSeoUrls();
  for (const r of [...JEV_SYSTEM_SLUG_REDIRECTS, ...JEV_SUPERSEDED_SLUG_REDIRECTS]) {
    assert.ok(isRedirectedJevPath(r.source));
    assert.ok(!urls.includes(r.source), `${r.source} redirects and must not be in the sitemap`);
  }
  assert.ok(!urls.includes('/jev-models/seb-9b'));
});

test('next.config redirects come from the shared superseded list', () => {
  assert.match(read('next.config.mjs'), /\.\.\.JEV_SUPERSEDED_SLUG_REDIRECTS/);
});

test('llms.txt names the manifest as base release and points to the feed for the current release, with no literal version', () => {
  const src = read('app/llms.txt/route.ts');
  assert.match(src, /base-release manifest/);
  assert.match(src, /latest_release/);
  assert.match(src, /Current JevBench release: \$\{artifact\.revision\}/);
});
