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
  assert.match(lazy, /onToggle=\{\(event\) => \{ if \(event\.currentTarget\.open\) void load\(\); \}\}/);
  assert.match(lazy, /fetch\('\/api\/jevbench\/v1\.3\/history'/);
  assert.match(lazy, /ssr: false/);
  assert.match(content, /<JevModelsV12Board/);
  assert.match(content, /<JevRadars/);
  assert.match(content, /data-bh-jev-heldout/);
  assert.match(route, /export const dynamic = 'force-static'/);
});
