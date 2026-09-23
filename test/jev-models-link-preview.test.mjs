import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readJevbenchV12, jevbenchV12View } from '../lib/jevbench-v12.mjs';

const page = await readFile(new URL('../app/jev-models/page.tsx', import.meta.url), 'utf8');
const image = await readFile(new URL('../app/jev-models/opengraph-image.tsx', import.meta.url), 'utf8');
const detail = await readFile(new URL('../app/jev-models/[system]/page.tsx', import.meta.url), 'utf8');
const historic = jevbenchV12View(await readJevbenchV12());

test('CR-131: the changing JevBench board has evergreen Open Graph and X metadata', () => {
  const metadata = page.slice(page.indexOf('export async function generateMetadata'), page.indexOf('\nconst day ='));
  assert.match(metadata, /JevBench by Benchmark Heaven/);
  assert.match(metadata, /Jev-class model benchmark/);
  assert.match(metadata, /intelligence, calibration, speed, and cost/);
  assert.match(metadata, /alternates: \{ canonical: '\/jev-models' \}/);
  assert.match(metadata, /card: 'summary_large_image'/);
  assert.match(metadata, /width: 1200, height: 630/);
  assert.doesNotMatch(metadata, /rank|score|\bleads at\b|systems tested|decisions/i);
  assert.match(page, /const OG_ART_REVISION = 'og4'/);
  assert.match(metadata, /twitter:[\s\S]*title, description/);
});

test('CR-131: the Open Graph card is branded and evergreen', () => {
  assert.match(image, /export const size = \{ width: 1200, height: 630 \}/);
  assert.match(image, /JevBench by Benchmark Heaven/);
  assert.match(image, /Jev-class decision models/);
  for (const axis of ['Intelligence', 'Calibration', 'Speed', 'Cost']) assert.match(image, new RegExp(axis));
  assert.match(image, /benchmarkheaven\.com/);
  assert.doesNotMatch(image, /v1\.|rank|score|\bleads at\b|view\.|row\.rank|row\.main/i);
});

test('CR-131: dynamic model previews omit changing ranks and scores', () => {
  const metadata = detail.slice(detail.indexOf('export async function generateMetadata'), detail.indexOf('\nexport default async function'));
  assert.match(metadata, /JevBench by Benchmark Heaven/);
  assert.match(metadata, /evaluated across intelligence, calibration, speed, and cost/);
  assert.doesNotMatch(metadata, /row\.rank|row\.main|view\.revision|#\$\{|score of|ranks /i);
});

test('CR-131: the historical v1.3 artifact remains available inside the labeled history', () => {
  assert.equal(historic.revision, 'v1.3.0');
  assert.equal(historic.decisions, 534);
  assert.deepEqual(historic.ranked.slice(0, 5).map((row) => row.key), [
    'jev-1.13.0', 'semif-qwen3.5-4b', 'djev', 'winnow-12b', 'reflex-4b',
  ]);
  assert.match(page, /<details id="jev13-history"/);
  assert.match(page, /Historical v1\.3\.0 board/);
});
