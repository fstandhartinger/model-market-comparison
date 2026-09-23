import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  JEV_SEO_PATHS,
  JEV_TOP_FIVE_COMPARISONS,
  readJevbenchSeoData,
} from '../lib/jevbench-seo.mjs';

test('JevBench intent routes use the hash-checked current public release', async () => {
  const data = await readJevbenchSeoData();
  assert.equal(data.artifact.revision, 'v1.4.1');
  assert.equal(data.sha256, 'e6754863056503fe2b010410fc7111df884ac1f9ce4449aa369aab61d98092cd');
  assert.equal(data.ranked.length, 77);
  assert.equal(data.topFive[0].key, 'jev-1.13.0');
  assert.deepEqual(JEV_SEO_PATHS, {
    alternatives: '/jev-models/alternatives',
    chooser: '/jev-models/how-to-choose',
  });
});

test('comparison pages match the four other members of the published top five', async () => {
  const data = await readJevbenchSeoData();
  assert.equal(data.comparisons.length, 4);
  assert.deepEqual(data.comparisons.map((pair) => pair.rival.key), data.topFive.slice(1).map((row) => row.key));
  assert.deepEqual(data.comparisons.map((pair) => pair.slug), JEV_TOP_FIVE_COMPARISONS.map((pair) => pair.slug));
  assert.ok(data.comparisons.every((pair) => pair.jev.key === data.topFive[0].key));
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
  assert.match(alternatives, /JevScoreBar key=\{row\.key\} row=\{row\} reference=\{row\.key === 'jev-1\.13\.0'\}/);
  assert.match(board, /export function JevScoreBar/);
  assert.match(guides, /data-bh-jev-guides=\{current\}/);
  assert.match(guides, /const sibling = current === 'alternatives'/);
  assert.doesNotMatch(guides, /jev-vs-/);
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
