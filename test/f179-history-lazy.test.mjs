import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [page, lazy, content, route] = await Promise.all([
  read('../app/jev-models/page.tsx'),
  read('../components/JevHistoryLazy.tsx'),
  read('../components/JevHistoryContent.tsx'),
  read('../app/api/jevbench/v1.3/history/route.ts'),
]);

test('F-179 keeps the historical board and data out of the initial page component', () => {
  assert.match(page, /<JevHistoryLazy \/>/);
  assert.doesNotMatch(page, /<JevModelsV12Board|<JevRadars|held-out-diagnostic/);
  assert.doesNotMatch(page, /readJevbenchV12Tasks|readJevbenchV12Topics|jevbenchV12HeldoutView/);
});

test('F-179 fetches and mounts history only when the disclosure opens', () => {
  assert.match(lazy, /onToggle=\{\(event\) => \{[^}]*if \(event\.currentTarget\.open\) void load\(\);/);
  assert.match(lazy, /fetch\('\/api\/jevbench\/v1\.3\/history'/);
  assert.match(lazy, /ssr: false/);
  assert.match(content, /<JevModelsV12Board/);
  assert.match(content, /<JevRadars/);
  assert.match(content, /data-bh-jev-heldout/);
  assert.match(route, /export const dynamic = 'force-static'/);
});

test('F-179 still answers a link that names a view inside the disclosure', () => {
  // CR-90's `?scope=` deep link, the v1.2 `?w=` preset and the `#jev13-history` anchor all point at
  // content that now mounts lazily. Opening on mount for exactly those three keeps CR-90's verified
  // "reload restores the scoped URL view" true without putting anything back in the server HTML.
  assert.match(lazy, /useEffect\(\(\) => \{/);
  for (const asked of [/searchParams\.has\('scope'\)/, /searchParams\.has\('w'\)/, /hash !== '#jev13-history'/]) assert.match(lazy, asked);
  assert.match(lazy, /<details id="jev13-history" open=\{open\}/);
  // and only for those: no unconditional open, so the light initial page is unchanged by default.
  assert.doesNotMatch(lazy, /useState\(true\)/);
});
