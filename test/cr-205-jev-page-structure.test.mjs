import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { readJevbenchV150Release, readJevbenchV151Release, readJevbenchV152Release } from '../lib/jevbench-v15-release.mjs';
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
const [page, v150Page, v151Page, v152Page, v153Page, v154Page, releaseComponent, boardSource, capabilityLazySource, page1422, page1421, page142, page141, page140, pageV1, v14BoardSource, v14CapabilitySource] = await Promise.all([
  read('../app/jev-models/page.tsx'),
  read('../app/jev-models/v1.5.0/page.tsx'),
  read('../app/jev-models/v1.5.1/page.tsx'),
  read('../app/jev-models/v1.5.2/page.tsx'),
  read('../app/jev-models/v1.5.3/page.tsx'),
  read('../app/jev-models/v1.5.4/page.tsx'),
  read('../components/JevBenchV15ReleasePage.tsx'),
  read('../components/JevBenchV15Preview.tsx'),
  read('../components/JevCapabilityLazy.tsx'),
  read('../app/jev-models/v1.4.2.2/page.tsx'),
  read('../app/jev-models/v1.4.2.1/page.tsx'),
  read('../app/jev-models/v1.4.2/page.tsx'),
  read('../app/jev-models/v1.4.1/page.tsx'),
  read('../app/jev-models/v1.4/page.tsx'),
  read('../app/jev-models/v1/page.tsx'),
  read('../components/JevModelsV14.tsx'),
  read('../components/JevCapabilityChart.tsx'),
]);

const { artifact, sha256 } = await readJevbenchV150Release();
const { artifact: artifact151, sha256: sha256151 } = await readJevbenchV151Release();
const { artifact: artifact152, sha256: sha256152 } = await readJevbenchV152Release();
const ranked = artifact.systems.filter((s) => s.listing === 'ranked');

const ordered = (source, markers, where) => {
  let at = -1;
  for (const marker of markers) {
    const next = source.indexOf(marker);
    assert.ok(next > at, `${where}: "${marker}" must appear after position ${at} (found at ${next})`);
    at = next;
  }
};

test('CR-205: the live board and all frozen v1.5 pages render the complete release page', () => {
  for (const [name, source, loader] of [
    ['/jev-models', page, 'readJevbenchV154Release'],
    ['/jev-models/v1.5.0', v150Page, 'readJevbenchV150Release'],
    ['/jev-models/v1.5.1', v151Page, 'readJevbenchV151Release'],
    ['/jev-models/v1.5.2', v152Page, 'readJevbenchV152Release'],
    ['/jev-models/v1.5.3', v153Page, 'readJevbenchV153Release'],
    ['/jev-models/v1.5.4', v154Page, 'readJevbenchV154Release'],
  ]) {
    assert.match(source, new RegExp(`${loader}\\(\\)`), `${name} reads its frozen release artifact`);
    assert.match(source, /<JevBenchV15ReleasePage artifact=\{artifact\} sha256=\{sha256\}/, `${name} renders the full release page`);
    assert.ok(source.indexOf('<JevBenchV15ReleasePage') < source.indexOf('<JevHistoryLazy />'), `${name} ends with the lazy revision history`);
  }
  assert.match(page, /versionPath="\/jev-models\/v1\.5\.4"/);
  assert.match(page, /readJevbenchV154Release/);
  assert.match(page, /versionPath="\/jev-models\/v1\.5\.4"/);
  assert.match(page, /canonical: '\/jev-models'/);
  assert.match(v151Page, /canonical: '\/jev-models\/v1\.5\.1'/);
  assert.match(v151Page, /versionPath="\/jev-models\/v1\.5\.1"/);
  assert.match(v152Page, /canonical: '\/jev-models\/v1\.5\.2'/);
  assert.match(v152Page, /versionPath="\/jev-models\/v1\.5\.2"/);
});

test('CR-205: the v1.5 release page keeps every required section, in the v1.4.2.2 order', () => {
  // Header: official release banner, dataset/hash disclosure, ImageJevBench and version links.
  for (const marker of ['data-bh-jev15-release-header', 'data-bh-image-jev-link', 'data-bh-jev-version-share', 'data-bh-jev-meta']) {
    assert.match(releaseComponent, new RegExp(marker.replace(/[/.]/g, '\\$&')), `release header keeps ${marker}`);
  }
  assert.match(releaseComponent, /api\/jevbench\/\$\{artifact\.revision\}/);
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
    '<Honorable',            // Jev wrappers are below the ranked charts, not in any ranking
    '<JevCompareV15',         // 4. direct comparison
    '<AxesTable',             // 5. full table
    '<HeadlineBars',          //    official option-A order with 95% bootstrap intervals (v1.5 addition)
    '<OptionsTable',          //    the three scoring options (v1.5 addition)
    '<Findings',              // 6. "What the run says"
    '<Guide',                 //    alternatives / self-hosting / scoring / submit
    '<Costs',                 //    "What a decision costs" + price rules
    '<Addendum', '<NotRanked',
    '<Method', '<Limits', '<Credit',
    '<JevCapabilityLazy',     //    the 3D capability/cost/latency view
    '<JevContextLazy',
    '/jev-models/v1.4.2.2',   //    link back to the previous frozen release
  ], 'JevBenchV15');

  // The composite chart re-scores with the v1.5 composite (gates apply even at weight 0) and keeps presets.
  assert.match(render, /scoreKind="v15"/);
  assert.match(render, /presets=\{jevV15SliderPresets\(a\)\}/);
  assert.match(render, /methodLink=\{\{ href: '#jev15-method'/);
  assert.match(render, /a\.revision === 'v1\.5\.1' \|\| a\.revision === 'v1\.5\.2' \|\| a\.revision === 'v1\.5\.3' \|\| a\.revision === 'v1\.5\.4' \? ranked : a\.systems/);
  assert.match(capabilityLazySource, /\['v1\.5\.1', 'v1\.5\.2', 'v1\.5\.3'\]\.includes\(revision\) \? available\.filter\(\(row\) => row\.ranked\) : available/);

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

test('CR-209: v1.5.1 ranks every full-coverage addendum and preserves the frozen v1.5.0 artifact', () => {
  const expected = [
    'autojev-27b', 'autojev-27b-rtxpro6000-a2', 'decision-4b-v11', 'decision-4b-v12', 'eikos-27b',
    'imajev-4b-rtx5090-a2', 'jevk5-v0.3-4b', 'plumb-4b', 'surogate-rune-26b-a4b-v3-rtxpro6000-a2',
  ].sort();
  assert.equal(sha256, '6b2f6b058b36203c98ec5f585eb8376038bc905f11db944f4e0bcd29c278c643');
  assert.equal(artifact.revision, 'v1.5.0');
  assert.equal(artifact.n_ranked, 89);
  assert.equal(artifact151.parent_release.sha256, sha256);
  assert.match(sha256151, /^[0-9a-f]{64}$/);
  assert.equal(artifact151.revision, 'v1.5.1');
  assert.equal(artifact151.roster_count, 103);
  assert.equal(artifact151.n_ranked, 98);

  const addenda = artifact151.systems.filter((row) => row.addendum != null);
  assert.deepEqual(addenda.map((row) => row.key).sort(), expected);
  for (const row of addenda) {
    assert.equal(row.status.status, 'complete', `${row.key} completed the protocol`);
    assert.equal(row.status.rows, artifact151.sample.total, `${row.key} has the full sample`);
    assert.equal(row.status.missing, 0, `${row.key} has no missing rows`);
    assert.equal(row.full_coverage, true, `${row.key} has full coverage`);
    assert.equal(row.listing, 'ranked');
    assert.equal(row.ranked, true);
    assert.equal(row.rank, row.ranks.A);
    for (const option of ['A', 'B', 'C']) assert.ok(Number.isInteger(row.ranks[option]), `${row.key} has option ${option} rank`);
  }

  for (const option of ['A', 'B', 'C']) {
    const order = artifact151.board[option].order;
    assert.equal(order.length, 98);
    assert.equal(new Set(order).size, 98);
    for (let index = 0; index < order.length; index++) {
      const row = artifact151.systems.find((system) => system.key === order[index]);
      assert.equal(row.ranks[option], index + 1, `${option} rank for ${row.key}`);
      if (index) {
        const prior = artifact151.systems.find((system) => system.key === order[index - 1]);
        assert.ok(prior.scores[option] >= row.scores[option], `${option} order descends at ${prior.key}/${row.key}`);
      }
    }
    const adjacent = new Set(order.slice(1).map((key, index) => `${order[index]}\u0000${key}`));
    for (const marker of artifact151.board[option].markers) {
      assert.ok(adjacent.has(`${marker.upper}\u0000${marker.lower}`), `${option} marker remains an adjacent comparison`);
      assert.ok(!expected.includes(marker.upper) && !expected.includes(marker.lower), 'no addendum tie marker is inferred');
    }
  }

  assert.deepEqual(artifact151.board.A.order.slice(0, 5), ['cygnet', 'winnow-12b', 'jev-1.13.0', 'jevk5-v0.3-4b', 'plumb-4b']);
  assert.deepEqual(artifact151.board.B.order.slice(0, 5), ['winnow-12b', 'cygnet', 'jev-1.13.0', 'jev-omni', 'jevk5-v0.3-4b']);
  assert.deepEqual(artifact151.board.C.order.slice(0, 5), artifact.board.C.order.slice(0, 5));
  for (const preset of jevV15SliderPresets(artifact151)) {
    assert.equal(addenda.length, 9);
    for (const row of addenda) assert.ok(Number.isFinite(jevV15BoardScore(row.axes, preset.weights)), `${row.key} is sortable in ${preset.name}`);
  }

  const mica = artifact151.not_measured.find((row) => row.key === 'mica-v01-4b');
  assert.equal(mica.status, 'partial run');
  assert.equal(mica.rows, 1088);
  assert.equal(mica.missing, 536);
  assert.match(mica.reason, /three consecutive passthrough HTTP 400 refusals triggered exit 6/);
  const classifier = artifact151.systems.find((row) => row.key === 'classifier-dev-fast');
  assert.equal(classifier.listing, 'honorable_mention');
  assert.match(classifier.not_ranked_because, /runs on Jev/);
});

test('v1.5.2 adds the verified Nemotron A3 row and leaves every top five unchanged', () => {
  assert.match(sha256152, /^[0-9a-f]{64}$/);
  assert.equal(artifact152.revision, 'v1.5.2');
  assert.equal(artifact152.parent_release.sha256, sha256151);
  assert.equal(artifact152.n_ranked, 99);
  assert.equal(artifact152.roster_count, 104);
  const addenda = artifact152.systems.filter((row) => row.addendum != null);
  assert.equal(addenda.length, 10);
  for (const key of ['nemotron-diffusion-8b']) {
    const row = addenda.find((candidate) => candidate.key === key);
    assert.ok(row, `${key} is an A3 addendum`);
    assert.equal(row.addendum.id, 'A3');
    assert.equal(row.status.status, 'complete');
    assert.equal(row.status.rows, artifact152.sample.total);
    assert.equal(row.status.missing, 0);
    assert.equal(row.full_coverage, true);
    assert.equal(row.listing, 'ranked');
    assert.equal(row.ranked, true);
    assert.equal(row.rank, row.ranks.A);
  }
  for (const option of ['A', 'B', 'C']) {
    assert.deepEqual(artifact152.board[option].order.slice(0, 5), artifact151.board[option].order.slice(0, 5), `${option} top five stays unchanged`);
    assert.equal(artifact152.board[option].order.length, 99);
    for (let index = 0; index < artifact152.board[option].order.length; index++) {
      const row = artifact152.systems.find((candidate) => candidate.key === artifact152.board[option].order[index]);
      assert.equal(row.ranks[option], index + 1, `${option} rank for ${row.key}`);
    }
  }
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
  assert.deepEqual(versionDirs, ['v1', 'v1.4', 'v1.4.1', 'v1.4.2', 'v1.4.2.1', 'v1.4.2.2', 'v1.5.0', 'v1.5.1', 'v1.5.2', 'v1.5.3', 'v1.5.4'].sort());
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
