// bh-onpage follow-up (24 Oct 2026): every JevBench release page must carry its own meta description
// (<=160 chars, not the 240-char layout default) and a PageJsonLd block. New releases are hand-written
// page.tsx files, so this test is the scaffold guard: it fails the suite when a new /jev-models/v* page
// forgets either piece.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const appDir = new URL('../app/jev-models/', import.meta.url).pathname;
const releaseDirs = readdirSync(appDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^v\d+(\.\d+)+$/.test(d.name) && existsSync(join(appDir, d.name, 'page.tsx')))
  .map((d) => d.name)
  // Redirect-only aliases (e.g. /jev-models/v1.6 -> v1.6.0) have no metadata of their own.
  .filter((d) => !/^\s*import\s*\{[^}]*Redirect/.test(readFileSync(join(appDir, d, 'page.tsx'), 'utf8')) || /metadata|generateMetadata/.test(readFileSync(join(appDir, d, 'page.tsx'), 'utf8')));

test('every /jev-models/v* release page sets its own description <=160 chars', () => {
  const failures = [];
  for (const dir of releaseDirs) {
    const src = readFileSync(join(appDir, dir, 'page.tsx'), 'utf8');
    if (/description\s*[:=]/.test(src)) {
      const literal = src.match(/description\s*:\s*'([^']+)'/) ?? src.match(/description\s*:\s*"([^"]+)"/) ?? src.match(/description\s*=\s*'([^']+)'/) ?? src.match(/description\s*=\s*"([^"]+)"/);
      if (literal && literal[1].length > 160) failures.push(`${dir}: description ${literal[1].length} chars`);
    } else {
      failures.push(`${dir}: no description in metadata`);
    }
  }
  assert.deepEqual(failures, []);
});

test('every /jev-models/v* release page renders JSON-LD (PageJsonLd or an embedded component)', () => {
  const rootDir = new URL('..', import.meta.url).pathname;
  const hasLd = (file) => /PageJsonLd|ld\+json/.test(readFileSync(file, 'utf8'));
  const failures = [];
  for (const dir of releaseDirs) {
    const page = join(appDir, dir, 'page.tsx');
    if (hasLd(page)) continue;
    // Older releases delegate to a shared page component that embeds its own ld+json block; follow imports one level.
    const imports = [...readFileSync(page, 'utf8').matchAll(/from\s+'(\.\.\/)*([^']+)'/g)]
      .map((m) => join(rootDir, `${m[2]}.tsx`))
      .filter((f) => existsSync(f));
    if (!imports.some(hasLd)) failures.push(dir);
  }
  assert.deepEqual(failures, []);
});
