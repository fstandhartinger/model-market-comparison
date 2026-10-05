import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseModelFamilies, buildAllDataModel } from '../lib/jevbench-all-data-grid.mjs';
import { imageJevBoardSystems } from '../lib/imagejev-board.mjs';
import { jevV15BoardScore } from '../lib/jevbench-v15-board.mjs';
import { OFFICIAL_WEIGHTS } from '../lib/jevbench-axis-weights.mjs';

const src = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const imagePage = src('app/jev-models/multimodal-preview/page.tsx');
const ranking = src('components/JevCapabilityRanking.tsx');
const bubbles = src('components/JevBubbleChart.tsx');
const board = src('components/JevBenchV16Board.tsx');
const image = JSON.parse(src('data/raw/benchmarks/jevbench/multimodal-preview/preview.json'));
const release = JSON.parse(src('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-results.json'));

test('gate annotations name the reason without a false zero', () => {
  const gate = imagePage.slice(imagePage.indexOf('function gateOf'), imagePage.indexOf('function splitName'));
  assert.doesNotMatch(gate, /0\.0 ·/);
  for (const axis of ['Calibration', 'Cost', 'Intelligence', 'Speed']) assert.ok(gate.includes(`gated by ${axis}`));
  const row = image.ranking.find((s) => s.key === 'playjev_0p8b');
  assert.ok(row.tracks.everyday_photo.composite.score > 0 && row.tracks.everyday_photo.composite.score < 1);
});

test('all ranking inline percentages use the shared three-decimal formatter', () => {
  assert.match(ranking, /const percent = \(v: number\) => `\$\{v\.toFixed\(3\)\}%`/);
  const styles = [...ranking.matchAll(/style=\{\{([^}]+)\}\}/g)].filter((m) => /width:|left:/.test(m[1]));
  assert.equal(styles.length, 5);
  for (const [, style] of styles) {
    assert.doesNotMatch(style, /`/);
    assert.match(style, /percent\(/);
  }
});

test('caps captions reflect each page’s chart wiring', () => {
  assert.match(ranking, /!official && !onCapsChange && <span[^>]*>Charts below use the official 2× caps/);
  assert.match(src('components/JevBenchV16Charts.tsx'), /onCapsChange=\{onCapsChange\}/);
  assert.match(imagePage, /<JevBubbleCharts[^>]*officialCaps/);
  assert.match(bubbles, /officialCaps && <>These charts use the official 2× caps/);
});

test('Image bubble weights use measured axes and preserve official scores and ranks', () => {
  assert.match(imagePage, /<JevBubbleCharts[^>]*scoreKind="v15"/);
  assert.match(src('components/jevClassView.ts'), /scoreAxes: \{/);
  assert.match(bubbles, /if \(!customScore \|\| !point\.scoreAxes\) return \{ \.\.\.point, score: officialScore, officialScore \}/);
  assert.match(bubbles, /customScore \? 'the custom composite from the weight sliders'/);
  assert.match(bubbles, /official rank stays unchanged/);
  const rows = imageJevBoardSystems(image);
  const before = structuredClone(rows);
  let changed = 0;
  for (const row of rows) {
    assert.ok(Math.abs(jevV15BoardScore(row.axes, OFFICIAL_WEIGHTS) - row.jevbench_score) < 1e-10, row.key);
    const score = jevV15BoardScore(row.axes, { intelligence: 100, calibration: 0, speed: 0, cost: 0 });
    assert.ok(Number.isFinite(score), row.key);
    if (Math.abs(score - row.jevbench_score) > 1e-10) changed++;
  }
  assert.ok(changed > 0);
  assert.deepEqual(rows, before);
});

test('narrow detail modal accepts every button activation and returns focus on close', () => {
  const tip = src('components/JevCapabilityTip.tsx');
  assert.match(tip, /onClick=\{\(event\) => \{[\s\S]*?if \(window\.innerWidth < 640\) setOpen\(true\)/);
  assert.doesNotMatch(tip, /lastPointerType|onPointerDown/);
  assert.match(tip, /ref=\{trigger\}/);
  assert.match(tip, /onClose=\{\(\) => \{ setOpen\(false\); trigger\.current\?\.focus\(\); \}\}/);
  assert.match(tip, /dialog\.current\?\.showModal\(\)/);
  assert.doesNotMatch(tip, /onCancel|preventDefault/); // native Escape closes the modal
});

test('method heading has its own accessible id and the anchor stays on the section', () => {
  assert.match(board, /aria-labelledby="jev16-method-title" id="jev16-method"/);
  assert.match(board, /<h2 id="jev16-method-title"/);
  assert.equal([...board.matchAll(/\bid="jev16-method"/g)].length, 1);
});

test('release hash wraps and history uses evergreen wording', () => {
  assert.match(src('components/JevBenchV16ReleaseRoute.tsx'), /<code className="break-all">\{sha256\}<\/code>/);
  assert.match(src('components/JevHistoryContent.tsx'), /The ranking above is the current release\./);
  assert.doesNotMatch(src('components/JevHistoryContent.tsx'), /current v1\.4\.1 result/);
});

test('language coverage states the Sage public-only exception from the artifact', () => {
  assert.match(board, /Sage \(A3\) language cells and A2\/A3 topic\/use-case cells cover public P300 only/);
  assert.match(release.overnight.a2_note, /Sage category and language cells cover public P300 only/);
});

test('Core track labels include all core sources', () => {
  assert.doesNotMatch(imagePage, /Licensed core/);
  assert.match(imagePage, /track === 'core' \? 'Core'/);
  assert.match(imagePage, />Core composite bars</);
  assert.match(imagePage, /real-source items and \{s\.pool_core_sealed\} fresh synthetic pool items/);
});

test('all-data families use disclosures while unknown rows retain their text and Wity stays private', () => {
  assert.match(board, /metadata=\{\{ families: baseModelFamilies\('jevbench', a\.systems\) \}\}/);
  const families = baseModelFamilies('jevbench', release.systems);
  assert.equal(families.deck31b, 'google/gemma-4-31B-it');
  const systems = [...release.systems.filter((r) => r.key === 'deck31b' || r.key.startsWith('wity-1')),
    { key: 'unknown-row', underlying: 'undisclosed' }, { key: 'missing-row' }];
  const before = structuredClone(systems);
  const grid = buildAllDataModel({ artifact: { systems }, metadata: { families } });
  const values = Object.fromEntries(grid.rows.map((r) => [r.key, r.values.family]));
  assert.equal(values.deck31b, 'google/gemma-4-31B-it');
  for (const key of ['wity-1', 'wity-1-always', 'wity-1-off']) assert.equal(values[key], 'undisclosed (author request)');
  assert.equal(values['unknown-row'], 'undisclosed');
  assert.equal(values['missing-row'], null);
  assert.equal(baseModelFamilies('imagejevbench').wity_1, 'undisclosed (author request)');
  assert.deepEqual(systems, before);
});

test('separator labels switch anchor when the full label cannot fit left', () => {
  assert.match(bubbles, /const labelFitsLeft = value - 5 - widthOf\(label\) >= hborder/);
  assert.match(bubbles, /labelFitsLeft \? value - 5 : Math\.min\(value \+ 5, W - hborder - widthOf\(label\)\)/);
  assert.match(bubbles, /textAnchor=\{labelFitsLeft \? 'end' : 'start'\}/);
});
