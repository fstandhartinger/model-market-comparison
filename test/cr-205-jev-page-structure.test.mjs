import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { readJevbenchV15Release } from '../lib/jevbench-v15-release.mjs';
import { jevV15Composite } from '../lib/jevbench-v15-preview.mjs';
import { jevV15BoardScore, jevV15SliderPresets, jevV15BoardRow, jevV15CompareRow, jevV15BoardSystem } from '../lib/jevbench-v15-board.mjs';
import { jevClassRows } from '../lib/jevbench-jev-class.mjs';
import { OFFICIAL_WEIGHTS } from '../lib/jevbench-axis-weights.mjs';

// CR-205 (Florian 27 Sep 2026): PR #68 let JevBench v1.5 ship with a reduced /jev-models page — the capability
// ranking, the capability-vs-cost/speed bubble charts, the interactive composite chart, the compare view, the
// costs/method/limits/credit sections and the revision history were gone. A JevBench release must keep the
// complete section structure on the live route AND on its versioned page; this file pins the required
// sections and their order for every /jev-models page so a release cannot silently drop one.

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [page, v150Page, releaseComponent, boardSource, page1422, page1421, page142, page141, page140, pageV1, v14BoardSource, v14CapabilitySource] = await Promise.all([
  read('../app/jev-models/page.tsx'),
  read('../app/jev-models/v1.5.0/page.tsx'),
  read('../components/JevBenchV15ReleasePage.tsx'),
  read('../components/JevBenchV15Preview.tsx'),
  read('../app/jev-models/v1.4.2.2/page.tsx'),
  read('../app/jev-models/v1.4.2.1/page.tsx'),
  read('../app/jev-models/v1.4.2/page.tsx'),
  read('../app/jev-models/v1.4.1/page.tsx'),
  read('../app/jev-models/v1.4/page.tsx'),
  read('../app/jev-models/v1/page.tsx'),
  read('../components/JevModelsV14.tsx'),
  read('../components/JevCapabilityChart.tsx'),
]);

const { artifact, sha256 } = await readJevbenchV15Release();
const ranked = artifact.systems.filter((s) => s.listing === 'ranked');

const ordered = (source, markers, where) => {
  let at = -1;
  for (const marker of markers) {
    const next = source.indexOf(marker);
    assert.ok(next > at, `${where}: "${marker}" must appear after position ${at} (found at ${next})`);
    at = next;
  }
};

test('CR-205: the live board and the frozen v1.5.0 page render the same complete release page', () => {
  for (const [name, source] of [['/jev-models', page], ['/jev-models/v1.5.0', v150Page]]) {
    assert.match(source, /readJevbenchV15Release\(\)/, `${name} reads the released v1.5 artifact`);
    assert.match(source, /<JevBenchV15ReleasePage artifact=\{artifact\} sha256=\{sha256\}/, `${name} renders the full release page`);
    assert.ok(source.indexOf('<JevBenchV15ReleasePage') < source.indexOf('<JevHistoryLazy />'), `${name} ends with the lazy revision history`);
  }
  assert.match(page, /versionPath="\/jev-models\/v1\.5\.0"/);
  assert.match(page, /canonical: '\/jev-models'/);
});

test('CR-205: the v1.5 release page keeps every required section, in the v1.4.2.2 order', () => {
  // Header: official release banner, dataset/hash disclosure, ImageJevBench and version links.
  for (const marker of ['data-bh-jev15-release-header', 'data-bh-image-jev-link', 'data-bh-jev-version-share', 'data-bh-jev-meta', '/api/jevbench/v1.5.0']) {
    assert.match(releaseComponent, new RegExp(marker.replace(/[/.]/g, '\\$&')), `release header keeps ${marker}`);
  }
  assert.match(releaseComponent, /readJevbenchV1422/); // the "new in v1.5.0" marker needs the previous release's keys
  assert.match(releaseComponent, /'@type': 'Dataset'|'@type': 'FAQPage'/); // the structured data the v1.4.2.2 page carried

  // The complete section order, restored from v1.4.2.2, inside JevBenchV15's render:
  const render = boardSource.slice(boardSource.indexOf('export function JevBenchV15('));
  ordered(render, [
    '<JevCapabilityRanking',   // 1. capability bar chart
    '<JevBoardIntentLinks',
    '<JevBubbleCharts',       // 2. synchronized Capability-vs-cost and Capability-vs-speed charts
    'data-bh-jev15-whatif',   //    the What-If link to the weight sliders
    '<JevScoreChart',         // 3. main composite score chart (sliders, presets, View-by)
    '<JevCompareV15',         // 4. direct comparison
    '<AxesTable',             // 5. full table
    '<HeadlineBars',          //    official option-A order with 95% bootstrap intervals (v1.5 addition)
    '<OptionsTable',          //    the three scoring options (v1.5 addition)
    '<Findings',              // 6. "What the run says"
    '<Guide',                 //    alternatives / self-hosting / scoring / submit
    '<Costs',                 //    "What a decision costs" + price rules
    '<Honorable', '<Addendum', '<NotRanked',
    '<Method', '<Limits', '<Credit',
    '<JevCapabilityLazy',     //    the 3D capability/cost/latency view
    '<JevContextLazy',
    '/jev-models/v1.4.2.2',   //    link back to the previous frozen release
  ], 'JevBenchV15');

  // The composite chart re-scores with the v1.5 composite (gates apply even at weight 0) and keeps presets.
  assert.match(render, /scoreKind="v15"/);
  assert.match(render, /presets=\{jevV15SliderPresets\(a\)\}/);
  assert.match(render, /methodLink=\{\{ href: '#jev15-method'/);

  // Content markers the v1.4.2.2 page carried, on v1.5 data.
  for (const marker of [
    'data-bh-jev15-findings', 'data-bh-jev15-capability-lead',
    'data-bh-jev-seo-guide', 'jev-alternatives-heading',
    'data-bh-jev-costs', 'data-bh-jev-price-rules', 'data-bh-jev-cost-rows', 'data-bh-jev15-cost-unit-panel',
    'data-bh-jev15-method', 'id="limits"', 'data-bh-jev15-latency-limit',
    'id="credit"', 'data-bh-jev-credits', 'data-bh-jev-credit-3d',
    'data-bh-jev15-addendum', 'data-bh-jev15-not-measured',
  ]) assert.ok(boardSource.includes(marker), `board keeps ${marker}`);
  assert.match(boardSource, /<JevCapabilityLazy revision=\{a\.revision\} only3d \/>/, 'the 3D view reads the same revision');
});

test('CR-205: the frozen v1.4.2.2 page keeps its complete structure', () => {
  ordered(page1422, [
    '<JevCapabilityRanking', '<JevBoardIntentLinks', '<JevBubbleCharts', '<JevModelsV14Board',
    'data-bh-jev14-findings', 'jev-alternatives-heading', 'data-bh-jev-costs', 'jev-not-measured',
    '<details id="method"', '<details id="limits"', '<details id="credit"',
    '<JevCapabilityLazy', '<JevContextLazy', '<JevHistoryLazy />',
  ], '/jev-models/v1.4.2.2');
});

test('CR-205: every older versioned page keeps its board and disclosures', () => {
  // v1.0 is exempt from the composite-chart requirement by design: it predates the JevBench Score and
  // intentionally publishes no composite; its own board + not-measured/method/limits/credit structure is pinned.
  // Every v1.4+ route must keep its full composite/compare/table board. The v1.4.0 release predates the
  // capability suite; v1.4.1+ pages must keep it. Frozen pages retain their release-specific presentation.
  const modernRoutes = [
    ['v1.4.2.1', page1421], ['v1.4.2', page142], ['v1.4.1', page141], ['v1.4', page140],
  ];
  for (const [name, source] of modernRoutes) {
    assert.match(source, /<JevModelsV14Board artifact=\{view\.artifact\}/, `${name} keeps the composite board`);
    assert.match(source, /data-bh-jev-version-share/, `${name} keeps the share/live links`);
  }
  for (const [name, source] of [['v1.4.2.1', page1421], ['v1.4.2', page142], ['v1.4.1', page141]]) {
    assert.match(source, /<JevCapabilityChart systems=\{view\.systems\}/, `${name} keeps the capability charts`);
  }
  assert.match(page140, /data-bh-jev-frozen-version/, 'v1.4.0 remains its pinned historical release');
  ordered(v14BoardSource, [
    '<JevScoreChart', '<JevCompareV14', 'id="jev14-table"', '<JevAxesTable',
    'data-bh-jev14-api-note', '<section id="jev14-changes"',
  ], 'shared v1.4+ board');
  for (const marker of ['data-bh-jev14-capability-bars', 'data-bh-jev14-scatter', 'data-bh-jev14-capability-3d']) {
    assert.ok(v14CapabilitySource.includes(marker), `v1.4+ capability suite keeps ${marker}`);
  }
  ordered(pageV1, ['<JevModelsBoard', 'jev-not-measured', '<details id="method"', '<details id="limits"', '<details id="credit"'], '/jev-models/v1');
});

test('CR-205: every versioned JevBench route is covered by this test', async () => {
  const entries = await readdir(new URL('../app/jev-models', import.meta.url), { withFileTypes: true });
  const versionDirs = entries.filter((e) => e.isDirectory() && /^v[\d.]+$/.test(e.name)).map((e) => e.name).sort();
  // A new versioned page must be added to the structure assertions above — not silently reduced.
  assert.deepEqual(versionDirs, ['v1', 'v1.4', 'v1.4.1', 'v1.4.2', 'v1.4.2.1', 'v1.4.2.2', 'v1.5.0'].sort());
});

test('CR-205: the board sections are fed by the pinned v1.5 release artifact', async () => {
  assert.equal(sha256, '6b2f6b058b36203c98ec5f585eb8376038bc905f11db944f4e0bcd29c278c643');
  assert.equal(artifact.revision, 'v1.5.0');
  assert.equal(artifact.systems.length, 100);
  assert.equal(ranked.length, 89);

  // The composite chart's re-score must be the scorer's v1.5 composite (floor 50 = options A and B):
  // identical on every ranked system for the official weights, and it reproduces every published `views`
  // value — including "Intelligence only", whose zero-weight axes still gate.
  const same = (x, y) => x === y || (x != null && y != null && Math.abs(x - y) < 1e-9); // weight units may differ by a 1-ULP rounding
  for (const row of ranked) {
    assert.ok(same(jevV15BoardScore(row.axes, OFFICIAL_WEIGHTS), row.scores.A), `${row.key} option A`);
    assert.ok(same(jevV15BoardScore(row.axes, OFFICIAL_WEIGHTS), jevV15Composite(row.axes, artifact.options.A.weights, 50)), `${row.key} parity with the scorer`);
  }
  const presets = jevV15SliderPresets(artifact);
  assert.ok(presets.length >= artifact.views.length, 'every published view is offered as a preset');
  for (const name of artifact.views) {
    const preset = presets.find((p) => ranked.every((r) => same(jevV15BoardScore(r.axes, p.weights), r.views[name])));
    assert.ok(preset, `no slider preset reproduces the published "${name}" view for all ${ranked.length} ranked systems`);
  }

  // Capability ranking + bubble charts: the class reference system and in-class systems exist.
  const jevClass = jevClassRows(artifact.systems.map(jevV15BoardSystem));
  assert.equal(jevClass.reference.key, 'jev-1.13.0');
  assert.ok(jevClass.rows.some((r) => r.inClass && r.row.rank === 1), 'the in-class leader is plotted');
  assert.ok(jevClass.rows.filter((r) => r.inClass).length > 5);

  // Board rows and compare rows carry real values — no fabricated columns.
  const boardRows = artifact.systems.map((s) => jevV15BoardRow(s));
  assert.equal(boardRows.filter((r) => r.ranked).length, 89);
  const compare = jevV15CompareRow(ranked[0]);
  assert.ok(Object.values(compare.typeCc).every((c) => c.open !== null && c.sealed !== null));
  assert.ok(Object.values(compare.tierCc.sealed).every((v) => v !== null));
});
