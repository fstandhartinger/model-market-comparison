import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  JEV_SEO_PATHS,
  JEV_COMPARISONS,
  JEV_TOP_FIVE_COMPARISONS,
  readJevbenchSeoData,
} from '../lib/jevbench-seo.mjs';

test('JevBench intent routes use the hash-checked current public release', async () => {
  const data = await readJevbenchSeoData();
  assert.equal(data.artifact.revision, 'v1.4.2');
  assert.equal(data.sha256, 'ac14e206dde51ae28e40dc1ea2ff1fecc4a449b941d098e9ecb5618bd533e5be');
  assert.equal(data.ranked.length, 89);
  // CR-152: decider-4b v2 leads v1.4.2; Jev 1.13.0 is #2 and stays the comparison reference.
  assert.equal(data.topFive[1].key, 'jev-1.13.0');
  assert.deepEqual(JEV_SEO_PATHS, {
    alternatives: '/jev-models/alternatives',
    chooser: '/jev-models/how-to-choose',
    openSource: '/jev-models/open-source-jev',
  });
});

test('comparison pages keep their ranked rivals against Jev 1.13.0', async () => {
  const data = await readJevbenchSeoData();
  // v1.4.2 top five minus Jev, the two earlier top-five rivals, and Laya (seo-routes-finish, 25 Sep 2026).
  assert.equal(data.comparisons.length, 7);
  assert.deepEqual(JEV_TOP_FIVE_COMPARISONS.slice(0, 4).map((pair) => pair.key), ['decider-4b-v2', 'jevk5-v02', 'cygnet', 'hopper']);
  assert.deepEqual(data.comparisons.map((pair) => pair.rival.key), JEV_COMPARISONS.map((pair) => pair.key));
  assert.ok(data.comparisons.every((pair) => data.ranked.some((row) => row.key === pair.rival.key)));
  assert.deepEqual(data.comparisons.map((pair) => pair.slug), JEV_COMPARISONS.map((pair) => pair.slug));
  for (const pair of JEV_COMPARISONS) {
    const page = readFileSync(new URL(`../app/jev-models/${pair.slug}/page.tsx`, import.meta.url), 'utf8');
    assert.match(page, new RegExp(`rivalKey="${pair.key}"`));
    assert.match(page, new RegExp(`const PATH = '/jev-models/${pair.slug}'`));
  }
  assert.ok(data.comparisons.every((pair) => pair.jev.key === 'jev-1.13.0'));
});

test('chooser winners use the published accuracy, speed and cost fields', async () => {
  const data = await readJevbenchSeoData();
  assert.equal(data.winners.mostAccurate.key, [...data.ranked].sort((a, b) => b.sealed_accuracy - a.sealed_accuracy)[0].key);
  assert.equal(data.winners.fastest.key, [...data.ranked].sort((a, b) => b.axes.speed - a.axes.speed)[0].key);
  assert.equal(data.winners.cheapest.key, [...data.ranked].filter((row) =>
    ['measured', 'estimate', 'announced'].includes(row.cost?.kind)
      && Number.isFinite(row.cost?.usd_per_1000)
      && Number.isFinite(row.axes?.cost),
  ).sort((a, b) => b.axes.cost - a.axes.cost)[0].key);
  assert.ok(['measured', 'estimate', 'announced'].includes(data.winners.cheapest.cost.kind));
});

test('self-host candidates have explicit published openness, license and repository evidence', async () => {
  const data = await readJevbenchSeoData();
  assert.ok(data.selfHostable.length > 0);
  assert.ok(data.selfHostable.every((row) =>
    (row.open === 'yes' || row.open === 'weights' || row.open === true)
      && typeof row.licence === 'string' && row.licence.trim()
      && /^https:\/\//i.test(row.repo),
  ));
});

test('alternatives guide reuses the board score bars and keeps the reference first', () => {
  const alternatives = readFileSync(new URL('../app/jev-models/alternatives/page.tsx', import.meta.url), 'utf8');
  const board = readFileSync(new URL('../components/JevModelsV14.tsx', import.meta.url), 'utf8');
  const guides = readFileSync(new URL('../components/JevBenchSeoBlocks.tsx', import.meta.url), 'utf8');
  assert.match(alternatives, /data-bh-jev-alternatives-bars/);
  // F-188/F-189: the bar row and its header moved to components/JevScoreBar.tsx so the client rank-by control
  // and this server page can both draw them; the board re-exports them, and this page still marks Jev the reference.
  assert.match(alternatives, /JevScoreBar key=\{row\.key\} row=\{toBarRow\(row\)\} reference=\{row\.key === 'jev-1\.13\.0'\}/);
  assert.match(board, /export \{ JevScoreBar, JevScoreBarHeader, toBarRow \};/);
  const bar = readFileSync(new URL('../components/JevScoreBar.tsx', import.meta.url), 'utf8');
  assert.match(bar, /export function JevScoreBar/);
  // F-188: the five number columns are named above the bars on the alternatives page too.
  assert.match(alternatives, /<JevScoreBarHeader/);
  assert.match(bar, /\$\/1k dec\./);
  assert.match(guides, /data-bh-jev-guides=\{current\}/);
  assert.match(guides, /const sibling = current === 'alternatives'/);
  const intentLinks = guides.slice(guides.indexOf('export function JevIntentLinks'), guides.indexOf('export function JevBoardIntentLinks'));
  assert.doesNotMatch(intentLinks, /jev-vs-/);
});

test('pair pages render a fixed JevCompareV14 radar pair and an expandable values table', () => {
  const compare = readFileSync(new URL('../components/JevComparisonPage.tsx', import.meta.url), 'utf8');
  const radar = readFileSync(new URL('../components/JevCompareV14.tsx', import.meta.url), 'utf8');
  assert.match(compare, /<JevCompareV14[\s\S]*?fixedPair/);
  assert.match(compare, /All values as a table/);
  assert.match(radar, /data-bh-jev14-radar=\{f\.key\}/);
  assert.match(radar, /data-bh-jev14-pair-mode=\{fixedPair \? 'fixed' : 'selectable'\}/);
  assert.match(radar, /\{!fixedPair && <div className="flex flex-col gap-2/);
});

test('chooser and comparison copy uses reader-facing metric labels', () => {
  const chooser = readFileSync(new URL('../app/jev-models/how-to-choose/page.tsx', import.meta.url), 'utf8');
  const compare = readFileSync(new URL('../components/JevComparisonPage.tsx', import.meta.url), 'utf8');
  assert.match(chooser, /Most accurate \(sealed-set accuracy\)/);
  assert.match(chooser, /Fastest \(Speed axis\)/);
  assert.match(chooser, /Cheapest per decision \(Cost axis\)/);
  assert.doesNotMatch(chooser, /sealed_accuracy aggregate/);
  assert.doesNotMatch(compare, /sealed_accuracy aggregate/);
});

test('dynamic chooser and open-row links target stable anchors in the live v1.4.1 board', () => {
  const chooser = readFileSync(new URL('../app/jev-models/how-to-choose/page.tsx', import.meta.url), 'utf8');
  const alternatives = readFileSync(new URL('../app/jev-models/alternatives/page.tsx', import.meta.url), 'utf8');
  const links = readFileSync(new URL('../components/JevBenchSeoBlocks.tsx', import.meta.url), 'utf8');
  const board = readFileSync(new URL('../components/JevModelsV14.tsx', import.meta.url), 'utf8');
  assert.match(links, /href=\{`\/jev-models#jev14-row-\$\{encodeURIComponent\(row\.key\)\}`\}/);
  assert.match(board, /id=\{`jev14-row-\$\{row\.key\}`\}/);
  assert.match(chooser, /<JevRowLink row=\{accurate\}/);
  assert.match(chooser, /<JevRowLink row=\{fastest\}/);
  assert.match(chooser, /<JevRowLink row=\{cheapest\}/);
  assert.match(chooser, /<JevRowLink row=\{row\}/);
  assert.match(alternatives, /<JevRowLink row=\{bestOpen\}/);
});
