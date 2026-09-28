import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JEVBENCH_V142_SHA256, JEVBENCH_V142_TOP5, readJevbenchV142 } from '../lib/jevbench-v142.mjs';
import { JEVBENCH_V1422_SHA256, JEVBENCH_V1422_TOP5, readJevbenchV1422 } from '../lib/jevbench-v1422.mjs';

const { artifact, sha256 } = await readJevbenchV142();
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('CR-152 v1.4.2 is the exact aggregate-only release with the approved top five', () => {
  assert.equal(artifact.revision, 'v1.4.2');
  assert.equal(sha256, JEVBENCH_V142_SHA256);
  assert.equal(sha256, 'fb81f4e774e7a965eff7b5bed641cff62c7e51c9b28464dca83d5d7725990fcd');
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

test('CR-191 v1.4.2.2 is pinned to the approved aggregate artifact and top five', async () => {
  const { artifact: current, sha256 } = await readJevbenchV1422();
  const ranked = current.systems.filter((row) => row.ranked).sort((a, b) => a.rank - b.rank);
  assert.equal(current.revision, 'v1.4.2.2');
  assert.equal(sha256, JEVBENCH_V1422_SHA256);
  assert.equal(sha256, '7f39b2f742a69ded7384fb7eb4c54daa9cf67b26e72e25133c6da1f8e49cf570');
  assert.equal(current.systems.length, 95);
  assert.equal(ranked.length, 91);
  assert.deepEqual(ranked.slice(0, 5).map((row) => row.key), JEVBENCH_V1422_TOP5);
  assert.equal(ranked[0].jevbench_score, 67.36821557095253);
  assert.deepEqual(JEVBENCH_V1422_TOP5, ['imajev_4b', 'plumb-4b', 'decider-4b-v2', 'jev-1.13.0', 'jevk5-v02']);
});

test('CR-191 serves v1.4.2.2 live and preserves pinned v1.4.2 with its API and fairness note', async () => {
  const [route, page, livePage, board, sitemap, version22Page, version22Route, version22FamiliesRoute] = await Promise.all([
    read('../app/api/jevbench/v1.4.2/route.ts'),
    read('../app/jev-models/v1.4.2/page.tsx'),
    read('../app/jev-models/page.tsx'),
    Promise.all(['JevModelsV14', 'JevBoardShared', 'JevBoardInteractive'].map((f) => read(`../components/${f}.tsx`))).then((files) => files.join('\n')), // CR-151 split the board
    read('../app/sitemap.ts'),
    read('../app/jev-models/v1.4.2.2/page.tsx'),
    read('../app/api/jevbench/v1.4.2.2/route.ts'),
    read('../app/api/jevbench/v1.4.2.2/families/route.ts'),
  ]);
  assert.match(route, /readJevbenchV142\(\)/);
  assert.match(route, /'X-Content-SHA256': sha256/);
  assert.match(version22Page, /canonical = '\/jev-models\/v1\.4\.2\.2'/);
  assert.match(version22Page, /revision: 'v1\.4\.2\.1'.*readJevbenchV1421/s);
  assert.match(version22Route, /readJevbenchV1422\(\)/);
  assert.match(version22Route, /'X-Content-SHA256': sha256/);
  assert.match(version22FamiliesRoute, /readJevbenchV1422Families\(\)/);
  assert.match(page, /canonical = '\/jev-models\/v1\.4\.2'/);
  assert.match(page, /async function pinnedView\(\) \{\s*const result = await readJevbenchV142WithFamilies\(\);\s*return \{ \.\.\.jevbenchV142View\(result\), sealedFamilyN: result\.sealedFamilyN \};\s*\}/);
  assert.match(page, /export default async function JevModelsV142Page\(\) \{\s*const view = await pinnedView\(\);[\s\S]*<JevModelsV14Board artifact=\{view\.artifact\} sha256=\{view\.sha256\}/);
  assert.match(livePage, /const v14Result = await readJevbenchV1422WithFamilies\(\);\s*const v14 = jevbenchV1422View\(v14Result\);/);
  assert.match(livePage, /const previousRelease = \(await readJevbenchV1421\(\)\)\.artifact;/);
  assert.match(livePage, /readJevbenchV1422WithFamilies\(\)/);
  assert.match(livePage, /readJevbenchV1421\(\)/); // The exact preceding v1.4.2.1 release is the comparison base.
  assert.match(livePage, /<JevModelsV14Board artifact=\{v14\.artifact\} sha256=\{v14\.sha256\} previous=\{previous\}/);
  assert.match(livePage, /href="\/jev-models\/v1\.4\.2\.2" data-bh-jev-version-share/);
  // F-189 (Fable pass 35, decision 2): CR-152's "visible Intelligence ordering" is a control, not a second table of the
  // numbers the chart already draws. CR-151 (Florian 25 Sep): that control is the "View by" switch (it supersedes the
  // two-button rank-by); the approved sentence sits beside it with a one-click Intelligence ordering.
  assert.match(board, /data-bh-jev14-top-five-note/);
  assert.match(board, /aria-pressed=\{view === v\}/);
  assert.match(board, /\['intelligence', 'Intelligence'\]/);
  // F-199 (iter235): the inline "Sort by Intelligence ↓" button went — the Intelligence View-by pill is the one
  // control and now carries the marker attribute; no source may render a second "Sort by …" CTA in the figure.
  assert.match(board, /v === 'intelligence' \? \{ 'data-bh-jev14-sort-intelligence': '' \} : \{\}/);
  assert.doesNotMatch(board, /Sort by Intelligence ↓/);
  assert.doesNotMatch(board, /<details[^>]*data-bh-jev14-sort-intelligence/);
  assert.match(sitemap, /"\/jev-models\/v1\.4\.2"/);
  assert.match(sitemap, /"\/jev-models\/v1\.4\.2\.1"/);
  assert.match(sitemap, /"\/jev-models\/v1\.4\.2\.2"/);
  assert.match(sitemap, /"\/jev-models\/v1\.4\.1"/);
  // The temporary upload notice and its preview images (main 7c8d0212/811f0dd9) are gone with the release.
  assert.doesNotMatch(livePage, /data-bh-release-notice|v142-preview/);
  // F-193 (main, 25 Sep): the live board's phone view stays compact; the flag now reaches the interactive chart.
  assert.match(livePage, /data-bh-jev-live-head/);
  assert.match(livePage, /compactMobile/);
  const interactive = await read('../components/JevBoardInteractive.tsx');
  assert.match(interactive, /data-bh-jev14-compact/);
  assert.match(interactive, /data-bh-jev14-chart-eyebrow/);
});
