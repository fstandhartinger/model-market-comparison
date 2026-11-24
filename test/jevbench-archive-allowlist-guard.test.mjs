// Proposed guard (reviewer r221). Place in test/. Fails when a versioned page uses the lazy archive board with a version that
// (a) is not its own directory, or (b) has no static board JSON (dynamicParams=false would 404 and "Load full board" fails).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { JEV_ARCHIVE_BOARD_VERSIONS } from '../lib/jevbench-archive-board-input.mjs';
import { JEV_LEGACY_ARCHIVE_VERSIONS } from '../lib/jevbench-archive-legacy-input.mjs';

test('every lazy archive page names its own version and has a static board JSON', async () => {
  const dir = new URL('../app/jev-models/', import.meta.url);
  const versions = (await readdir(dir, { withFileTypes: true })).filter(e => e.isDirectory() && /^v[\d.]+$/.test(e.name)).map(e => e.name);
  let seen = 0;
  for (const version of versions) {
    const source = await readFile(new URL(`${version}/page.tsx`, dir), 'utf8');
    for (const [, tag, attr] of source.matchAll(/<(JevBenchArchiveBoard|JevBenchLegacyArchiveProvider|JevBenchLegacyArchiveWidget)\s+version="([^"]+)"/g)) {
      seen++;
      assert.equal(attr, version, `${version}/page.tsx: ${tag} version="${attr}" must equal the page version`);
      const list = tag === 'JevBenchArchiveBoard' ? JEV_ARCHIVE_BOARD_VERSIONS : JEV_LEGACY_ARCHIVE_VERSIONS;
      assert.ok(list.includes(version), `${version}/page.tsx uses ${tag} but ${version} is not in the static board JSON allowlist`);
    }
    if (/<JevBenchV16Board\b/.test(source)) assert.fail(`${version}/page.tsx renders the full board server-side; use JevBenchArchiveBoard`);
  }
  assert.ok(seen >= 100, `scanned ${seen} archive usages`);
});
