import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readJevbenchSeoData } from '../lib/jevbench-seo.mjs';
import { importSeoModule, renderSeo } from './jevbench-seo-render.mjs';

const { boardRankText } = await importSeoModule('components/JevBenchSeoBlocks.tsx');

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('SEO rank is the open-weights board rank; API rows and the reference have none', async () => {
  const data = await readJevbenchSeoData();
  assert.equal(data.reference.rank, null);
  assert.equal(data.reference.board, 'reference');
  assert.ok(data.apiRows.length >= 1);
  for (const r of data.apiRows) { assert.equal(r.board, 'api'); assert.equal(r.rank, null); }
  assert.deepEqual(data.ranked.map((r) => r.rank), data.ranked.map((_, i) => i + 1));
  assert.ok(data.ranked.every((r) => r.board === 'open' && r.rank === r.open_board_rank));
  assert.equal(data.ranked.length, data.openRanked.length);
  assert.ok(!data.ranked.some((r) => r.board !== 'open'));
  assert.ok(!data.topFive.some((r) => r.board !== 'open'));
  assert.ok(data.winners.mostAccurate.board === 'open');
  assert.ok(data.selfHostable.every((r) => r.board === 'open'));
  const torch = data.systems.find((r) => r.key === 'torchcast-decision-12b');
  assert.equal(torch.rank, torch.open_board_rank);
  assert.notEqual(torch.combined_rank, torch.rank);
});

test('boardRankText words reference, API and open rows', () => {
  assert.equal(boardRankText({ board: 'reference', rank: null }), 'Reference, not ranked');
  assert.match(boardRankText({ board: 'api', rank: null }), /API leaderboard/);
  assert.equal(boardRankText({ board: 'open', rank: 3 }), 'Rank #3 (open-weights board)');
  assert.match(boardRankText({ board: 'api', rank: null }, 'de'), /API-Leaderboard/);
});

test('pages no longer print the Jev rank or the combined count', () => {
  const open = src('app/jev-models/open-source-jev/page.tsx');
  assert.ok(!/jev\.rank/.test(open));
  assert.match(open, /unranked reference/);
  const cmp = src('components/JevComparisonPage.tsx');
  assert.ok(!/jev\.rank/.test(cmp));
  assert.match(cmp, /ranked on the API leaderboard/);
  for (const p of ['app/jev-models/alternatives/page.tsx', 'app/de/jev-models/alternativen/page.tsx']) {
    const s = src(p);
    assert.match(s, /ApiBoardNote/);
    assert.ok(!/data\.ranked\.length\}/.test(s), p);
  }
});

test('alternatives pages render open ranks, the reference row and the API note', async () => {
  const data = await readJevbenchSeoData();
  const en = renderSeo(await (await importSeoModule('app/jev-models/alternatives/page.tsx')).default());
  const de = renderSeo(await (await importSeoModule('app/de/jev-models/alternativen/page.tsx')).default());
  for (const html of [en, de]) {
    assert.ok(!/#null|#undefined|Rang null/.test(html));
    assert.match(html, /href="\/jev-models\/api"/);
    for (const r of data.apiRows) assert.ok(html.includes(r.display.split(' (')[0]), r.key);
  }
  assert.match(en, /Hosted API alternatives are ranked on the API leaderboard/);
  assert.match(de, /API-Angebote werden auf dem API-Leaderboard gerankt/);
  assert.match(en, /Reference, not ranked/);
  assert.match(de, /Referenz, nicht gerankt/);
  assert.match(en, new RegExp(`${data.openRanked.length} open-weights systems ranked`));
});
