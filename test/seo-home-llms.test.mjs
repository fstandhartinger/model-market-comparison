import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// CR-171: llms.txt exists and links only live routes; the home Dataset JSON-LD reads the hero's own counts.
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [route, page, ld] = await Promise.all([read('../app/llms.txt/route.ts'), read('../app/page.tsx'), read('../components/HomeJsonLd.tsx')]);

test('llms.txt is a static text route that links real app routes', async () => {
  assert.match(route, /text\/plain/);
  assert.match(route, /force-static/);
  const paths = [...route.matchAll(/u\("(\/[^"]*)"\)/g)].map((m) => m[1]);
  assert.ok(paths.length >= 8);
  const { existsSync } = await import('node:fs');
  for (const p of paths) {
    if (p === '/') continue;
    const dir = new URL(`../app${p}`, import.meta.url);
    assert.ok(existsSync(dir), `llms.txt links ${p}, which has no app route`);
  }
  const body = route.slice(route.indexOf('return ['), route.indexOf('].join'));
  assert.doesNotMatch(body, /\d/, 'llms.txt must not state numbers that can drift from the data');
});

test('home Dataset JSON-LD uses the same counts as the visible hero line', () => {
  assert.match(page, /<HomeJsonLd results=\{results\} benchmarks=\{benchmarks\} models=\{ds\.counts\.models\} updated=\{updated\} \/>/);
  for (const t of ['WebSite', 'Organization', 'Dataset', 'DataDownload']) assert.ok(ld.includes(`"${t}"`), t);
  assert.ok(!/license:/.test(ld), 'third-party data: no blanket licence claim');
  assert.match(ld, /replace\(\/<\/g/);
});
