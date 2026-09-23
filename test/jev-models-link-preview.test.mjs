import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readJevbenchV12, jevbenchV12View } from '../lib/jevbench-v12.mjs';

const page = await readFile(new URL('../app/jev-models/page.tsx', import.meta.url), 'utf8');
const image = await readFile(new URL('../app/jev-models/opengraph-image.tsx', import.meta.url), 'utf8');
const view = jevbenchV12View(await readJevbenchV12());

const short = (name) => name.split(' (')[0].split(', formerly')[0];
const one = (value) => value === null ? '—' : value.toFixed(1);

test('CR-130.1: link preview values come from the pinned public v1.3.0 artifact', () => {
  assert.equal(view.revision, 'v1.3.0');
  assert.equal(view.decisions, 534);
  assert.equal(view.ranked.length + view.honorable.length + view.partial.length, 52);
  assert.deepEqual(view.ranked.slice(0, 5).map((row) => [short(row.display), one(row.main)]), [
    ['Jev 1.13.0', '74.4'],
    ['SemIf', '73.1'],
    ['djev', '73.0'],
    ['Winnow-12B Q8', '71.2'],
    ['reflex 4B', '70.3'],
  ]);
  assert.match(image, /readJevbenchV12/);
  assert.doesNotMatch(image, /heldout|private/i);
});

test('CR-130.2: social description stays compact while the SEO description remains full', () => {
  const lead = view.ranked[0];
  const systems = view.ranked.length + view.honorable.length + view.partial.length;
  const social = `JevBench ${view.revision}: ${systems} systems, ${view.decisions} decisions. ${short(lead.display)} leads at ${one(lead.main)}.`;
  assert.equal(social, 'JevBench v1.3.0: 52 systems, 534 decisions. Jev 1.13.0 leads at 74.4.');
  assert.ok(social.length <= 80);
  assert.match(page, /const description = `\$\{systems\} Jev-class systems tested on/);
  assert.match(page, /description,\s*alternates:/, 'search description stays on page Metadata');
  assert.match(page, /openGraph:[\s\S]*description: socialDescription/);
  assert.match(page, /twitter:[\s\S]*description: socialDescription/);
});

test('CR-130.3: both card metadata formats point to the versioned absolute HTTPS PNG', () => {
  assert.match(page, /const OG_ART_REVISION = 'og2'; \/\/ Bump when the card artwork changes/);
  assert.match(page, /https:\/\/benchmarkheaven\.com\/jev-models\/opengraph-image\?v=\$\{encodeURIComponent\(view\.revision\)\}-\$\{OG_ART_REVISION\}/);
  assert.match(page, /type: 'image\/png', secureUrl: image, width: 1200, height: 630, alt: imageAlt/);
  assert.match(page, /twitter:[\s\S]*images: \[\{ url: image, alt: imageAlt \}\]/);
  assert.match(page, /view\.ranked\.slice\(0, 5\).*row\.rank/);
});

test('CR-130.4: card is 1200×630, names the domain and gives rows readable type sizes', () => {
  assert.match(image, /export const size = \{ width: 1200, height: 630 \}/);
  assert.match(image, /benchmarkheaven\.com/);
  assert.match(image, />JevBench Score<\/div>/);
  assert.match(image, /JevBench \{view\.revision\} · \{date\} · \{systems\} systems · \{view\.decisions\} decisions/);
  assert.match(image, /fontSize: 30, fontWeight: 600/);
  assert.match(image, /fontSize: 34, fontWeight: 700/);
  assert.match(image, /fontSize: 40, fontWeight: 800/);
  assert.match(image, /view\.ranked\.slice\(0, 5\)/);
});
