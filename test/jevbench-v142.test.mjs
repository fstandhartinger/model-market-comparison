import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JEVBENCH_V142_SHA256, JEVBENCH_V142_TOP5, readJevbenchV142 } from '../lib/jevbench-v142.mjs';

const { artifact, sha256 } = await readJevbenchV142();
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('CR-152 v1.4.2 is the exact aggregate-only release with the approved top five', () => {
  assert.equal(artifact.revision, 'v1.4.2');
  assert.equal(sha256, JEVBENCH_V142_SHA256);
  assert.equal(sha256, 'ac14e206dde51ae28e40dc1ea2ff1fecc4a449b941d098e9ecb5618bd533e5be');
  const ranked = artifact.systems.filter((row) => row.ranked).sort((a, b) => a.rank - b.rank);
  assert.equal(artifact.systems.length, 93);
  assert.equal(ranked.length, 89);
  assert.deepEqual(ranked.slice(0, 5).map((row) => row.key), JEVBENCH_V142_TOP5);
  assert.deepEqual(JEVBENCH_V142_TOP5, ['decider-4b-v2', 'jev-1.13.0', 'jevk5-v02', 'cygnet', 'hopper']);
  assert.match(artifact.top_five_note, /^Jev 1\.13\.0 out-reasons decider-4b v2 \(Intelligence 53\.1 vs 49\.4\) and is better calibrated; decider-4b v2 leads on speed and cost\. JevBench weighs the four axes equally; sort by Intelligence for raw reasoning\.$/);
  for (const key of ['imajev-4b', 'blink-4b', 'ryotide-qwen', 'jpt-4b', 'apus-openjev-4b']) assert.ok(!artifact.systems.some((row) => row.key === key), key);
  const instinct = artifact.systems.find((row) => row.key === 'instinct');
  assert.equal(instinct.api_flag, true);
  assert.equal(instinct.cost.kind, 'estimate');
  assert.match(instinct.cost.basis, /qwen3\.8-27b, \$0\.42 per 1M input tokens/);
  assert.doesNotMatch(JSON.stringify(artifact), /"(?:item_id|item_text|question_text|gold|expected|prediction|predicted|per_item|item_results)"\s*:/i);
});

test('CR-152 serves v1.4.2 as the live board with a pinned page, API and fairness note', async () => {
  const [route, page, livePage, board, sitemap] = await Promise.all([
    read('../app/api/jevbench/v1.4.2/route.ts'),
    read('../app/jev-models/v1.4.2/page.tsx'),
    read('../app/jev-models/page.tsx'),
    read('../components/JevModelsV14.tsx'),
    read('../app/sitemap.ts'),
  ]);
  assert.match(route, /readJevbenchV142\(\)/);
  assert.match(route, /'X-Content-SHA256': sha256/);
  assert.match(page, /canonical = '\/jev-models\/v1\.4\.2'/);
  assert.match(livePage, /readJevbenchV142\(\)/);
  assert.match(livePage, /href="\/jev-models\/v1\.4\.2" data-bh-jev-version-share/);
  // F-189 (Fable pass 35, decision 2): CR-152's "visible Intelligence ordering" is the rank-by control, not a
  // second table of the numbers the chart already draws. The board must still offer the ordering, and must not
  // ship the 89-row disclosure it replaces.
  const rankBy = await read('../components/JevRankBy.tsx');
  assert.match(rankBy, /data-bh-jev14-top-five-note/);
  assert.match(rankBy, /data-bh-jev14-rank-by/);
  assert.match(rankBy, /aria-pressed=\{m === metric\}/);
  assert.match(rankBy, /metric === 'score' \? rows : \[\.\.\.rows\]\.sort/);
  assert.doesNotMatch(board, /data-bh-jev14-sort-intelligence/);
  assert.doesNotMatch(board, /Sort by Intelligence/);
  assert.match(sitemap, /"\/jev-models\/v1\.4\.2"/);
  assert.match(sitemap, /"\/jev-models\/v1\.4\.1"/);
  // The temporary upload notice and its preview images (main 7c8d0212/811f0dd9) are gone with the release.
  assert.doesNotMatch(livePage, /data-bh-release-notice|v142-preview/);
});
