import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readJevbenchV1713ForBoard, v1713BoardInput } from '../lib/jevbench-v1713-release.mjs';
import { readOptionalJevbenchV1643Release, v1643BoardInput } from '../lib/jevbench-v1643-release.mjs';
import { historicalCatalogue } from '../lib/jevbench-v162-release.mjs';
import { withPublicAdapterIds } from '../lib/jevbench-v15-release.mjs';
import { jevV15BoardSystem, jevV16ChartRow } from '../lib/jevbench-v15-board.mjs';
import { jevbenchCategoryView, isFreshJevbenchV16Revision } from '../lib/jevbench-categories.mjs';
import { hasApiFullAddendumCategories } from '../lib/jevbench-api-full-addenda.mjs';
import { baseModelFamilies } from '../lib/jev-base-model.mjs';
import { JEV_V16_CLASS_OPTIONS, JEV_V16_REFERENCE_LABEL } from '../lib/jevbench-jev-class.mjs';
import { readJevAllDataInput } from '../lib/jevbench-alldata-input.mjs';
register('./tsx-loader-hooks.mjs', import.meta.url);
const { jevClassView } = await import('../components/jevClassView.ts');
const { JevCapabilityRanking } = await import('../components/JevCapabilityRanking.tsx');
const { JevCapabilityChart } = await import('../components/JevCapabilityChart.tsx');
const { JevV15AllDataGrid, JevV15AllDataContent } = await import('../components/JevV15AllDataGrid.tsx');
const { JevV15FilterProvider } = await import('../components/JevV15Filters.tsx');
const { buildJevAllDataProps } = await import('../lib/jevbench-alldata-props.ts');
const { GET } = await import('../app/api/jevbench-alldata/[version]/route.ts');

// The pre-change Board's six props, independently reconstructed from its published expressions.
function legacyGrid(artifact, categories, previousKeys, extra = [], live = false) {
  return {
    artifact,
    categoryView: jevbenchCategoryView(artifact.revision, [...new Set([...artifact.systems, ...artifact.not_measured].map((row) => row.key))], {
      supplement: Boolean(categories.supplement), artifact: isFreshJevbenchV16Revision(artifact.revision) || hasApiFullAddendumCategories(categories) ? categories : undefined,
    }),
    previousKeys,
    eligibility: jevClassView([...artifact.systems, ...extra].map(jevV15BoardSystem), { ...JEV_V16_CLASS_OPTIONS, nearCapPrecision: true }),
    metadata: { families: baseModelFamilies('jevbench', artifact.systems) },
    links: { method: '#jev16-method', pricing: live ? '#jev-costs' : '#jev16-method', revisionNotes: '#jev16-method', addenda: {} },
  };
}
const release = await readJevbenchV1713ForBoard();
const rows = release.artifact.systems;

for (const [version, read, boardInput] of [['v1.7.13', readJevbenchV1713ForBoard, v1713BoardInput], ['v1.6.43', readOptionalJevbenchV1643Release, v1643BoardInput]]) {
  test(`${version}: endpoint props match the old page props exactly`, async () => {
    const r = await read();
    const board = boardInput(r);
    const previousKeys = version === 'v1.7.13' ? r.artifact.systems.filter((s) => s.remeasured_in !== version && s.new_in !== version).map((s) => s.key)
      : historicalCatalogue(r.historical.artifact, r.historical.carry).map((s) => s.key);
    const expected = legacyGrid(withPublicAdapterIds(board.artifact), board.categories, previousKeys);
    const input = await readJevAllDataInput(version);
    assert.deepEqual(buildJevAllDataProps(input), expected);
    const response = await GET(new Request(`http://localhost/api/jevbench-alldata/${version}`), { params: Promise.resolve({ version }) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'public, max-age=3600');
    assert.deepEqual(await response.json(), JSON.parse(JSON.stringify(expected)));
  });
}

test('unknown versions and path-like input cannot select a release', async () => {
  for (const version of ['v9.9.9', '../v1.7.13', 'constructor', 'toString', 'board-other']) {
    assert.equal((await GET(new Request('http://localhost'), { params: Promise.resolve({ version }) })).status, 404);
  }
});

test('chart projection preserves capability markup, class math, and 3D data', () => {
  const oldRows = rows.map(jevV15BoardSystem), slim = rows.map(jevV16ChartRow);
  const normalize = (view) => ({ ...view, rows: view.rows.map(({ row, ...rest }) => ({ key: row.key, ...rest })) });
  for (const caps of [{}, { costFactor: 1, latencyFactor: 4 }, { costFactor: Infinity, latencyFactor: Infinity }]) {
    assert.deepEqual(normalize(jevClassView(slim, { ...JEV_V16_CLASS_OPTIONS, ...caps, nearCapPrecision: true })), normalize(jevClassView(oldRows, { ...JEV_V16_CLASS_OPTIONS, ...caps, nearCapPrecision: true })));
  }
  const ranking = (systems) => renderToStaticMarkup(React.createElement(JevCapabilityRanking, { systems, eligibilitySystems: systems,
    revision: 'v1.7.13', officialHref: '#jev16-method', referenceLabel: JEV_V16_REFERENCE_LABEL, limits: JEV_V16_CLASS_OPTIONS.limits, nearCapPrecision: true }));
  assert.equal(ranking(slim), ranking(oldRows));
  const chart = (systems) => renderToStaticMarkup(React.createElement(JevCapabilityChart, { systems, revision: 'v1.7.13', classOptions: JEV_V16_CLASS_OPTIONS }));
  assert.equal(chart(slim), chart(oldRows));
  for (const row of slim) {
    assert.ok(!('underlying' in row));
    assert.ok(!('intelligence' in row));
    assert.deepEqual(Object.keys(row.v16 ?? {}), ['lane']);
  }
});

test('version-only grid server-renders the same collapsed shell without building the table', () => {
  const legacy = legacyGrid(withPublicAdapterIds(release.artifact), release.categories, []);
  const filterRows = rows.map((r) => ({ key: r.key, display: r.display, jevClass: { status: 'unknown', reason: '' } }));
  const render = (props) => renderToStaticMarkup(React.createElement(JevV15FilterProvider, { rows: filterRows }, React.createElement(JevV15AllDataGrid, props)));
  assert.equal(render({ version: 'v1.7.13', revision: 'v1.7.13' }), render(legacy));
  assert.doesNotMatch(render({ version: 'v1.7.13', revision: 'v1.7.13' }), /data-bh-jev15-all-data-table|Loading/);
  // Loaded content still renders all original controls and the data table under the filter provider.
  const opened = renderToStaticMarkup(React.createElement(JevV15FilterProvider, { rows: filterRows }, React.createElement(JevV15AllDataContent, legacy)));
  assert.match(opened, /data-bh-jev15-all-data-table/);
  assert.match(opened, /data-bh-jev15-all-data-controls/);
});

test('client grid has only type imports of category data', async () => {
  const source = await readFile(new URL('../components/JevV15AllDataGrid.tsx', import.meta.url), 'utf8');
  assert.match(source, /import type .*jevbench-categories/);
  assert.doesNotMatch(source, /import \{.*jevbenchCategoryView/);
  const board = await readFile(new URL('../components/JevBenchV16Board.tsx', import.meta.url), 'utf8');
  assert.match(board, /chartSystems = ranked.map\(\(s\) => chartByKey.get\(s.key\) \?\? jevV16ChartRow\(s\)/);
  assert.match(board, /allChartSystems = .*jevV16ChartRow\(s\)/);
  assert.doesNotMatch(board.slice(board.indexOf('<JevV15AllDataGrid'), board.indexOf('<JevV15AllDataGrid') + 170), /artifact=/);
});
