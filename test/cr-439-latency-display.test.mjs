import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  jevLatencyView, jevLatencyText, jevLatencyJsonFields, isSelfHostedAdjustment, JEV_LATENCY_LABEL,
} from '../lib/jev-latency.mjs';
import { readJevbenchAgentFeed } from '../lib/jevbench-agent-feed.mjs';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';
import { readOptionalJevbenchV170Release, hasPublishedJevbenchV170Release } from '../lib/jevbench-v170-release.mjs';
import { jevClassRows, JEV_V16_CLASS_OPTIONS } from '../lib/jevbench-jev-class.mjs';
import { jevV15BoardRow } from '../lib/jevbench-v15-board.mjs';
import { compileTsModule } from './helpers/transpile-ts.mjs';

// CR-439 (2026-10-11): self-hosted rows show the measured loopback p50 next to the labelled network-including estimate
// (2x + 150 ms). Display only: the estimate stays the number the ranking and the cap use.

const require = createRequire(import.meta.url);
const src = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
async function importReact(path) {
  const url = new URL(`../${path}`, import.meta.url);
  let code = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  code = code.replace(/\bfrom\s*(["'])([^"']+)\1/g, (_, q, spec) =>
    `from ${q}${spec.startsWith('.') ? new URL(spec, url).href : `file://${require.resolve(spec)}`}${q}`);
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

const H2O = { p50_s_raw: 0.02928461297415197, p50_s_adjusted: 0.20856922594830393, adjustment: 'x2 + 0.15 s (assumption, not measured)' };
const API = { p50_s_raw: 0.152, p50_s_adjusted: 0.152, adjustment: 'none (API)' };

test('CR-439 helper: self-hosted rows are adjusted, API rows are not', () => {
  const v = jevLatencyView(H2O, 2, 'gpu');
  assert.equal(v.adjusted, true);
  assert.equal(v.measured, H2O.p50_s_raw);
  assert.equal(v.estimate, H2O.p50_s_adjusted);
  assert.equal(v.basis, 'measured-loopback');
  assert.equal(v.label, 'est. incl. network (2x + 150 ms)');
  assert.equal(JEV_LATENCY_LABEL, v.label);
  assert.match(v.tooltip, /measured p50 0\.029 s on-GPU, no network \(timed on our GPU over loopback\)/);
  assert.match(v.tooltip, /Not directly comparable with API latency/);
  assert.equal(v.measuredTag, 'on-GPU, no network');
  assert.match(v.tooltip, /2 × measured \+ 150 ms = 0\.21 s/);
  assert.match(v.tooltip, /time a hosted endpoint instead \(on request\)/);
  const a = jevLatencyView(API);
  assert.equal(a.adjusted, false);
  assert.equal(a.basis, 'api-end-to-end');
  assert.equal(a.estimate, 0.152);
  assert.equal(a.tooltip, null);
});

test('CR-439 helper: only x2 + 0.15 s rows are self-hosted; demo x2 rows keep their display; missing data does not invent an estimate', () => {
  assert.ok(!isSelfHostedAdjustment('x2 (demo endpoint)'));
  assert.ok(!isSelfHostedAdjustment('x2 demo-endpoint adjustment (assumption, not measured)'));
  assert.equal(jevLatencyView({ p50_s_raw: 0.5, p50_s_adjusted: 1, adjustment: 'x2 (not a production API; no +0.15 s)' }).basis, 'demo-endpoint-x2');
  assert.ok(isSelfHostedAdjustment('x2 + 0.15 s (assumption, not measured)'));
  assert.ok(!isSelfHostedAdjustment('none (API)'));
  assert.ok(!isSelfHostedAdjustment(undefined));
  assert.equal(jevLatencyView({ p50_s_raw: 0.03, adjustment: 'x2 + 0.15 s' }).adjusted, false);
  assert.equal(jevLatencyView(null).estimate, null);
  assert.deepEqual(jevLatencyJsonFields(null), {});
  assert.equal(jevLatencyView(H2O, 2, 'cpu').tooltip.includes('our CPU host'), true);
  assert.equal(jevLatencyText(H2O, 'plain', { unit: false }), '0.029 measured own hardware, no network · 0.21 est. incl. network (2x + 150 ms)');
  assert.equal(jevLatencyText(H2O, 'plain', { unit: false, kind: 'gpu' }), '0.029 measured on-GPU, no network · 0.21 est. incl. network (2x + 150 ms)');
  assert.equal(jevLatencyText(H2O, 'plain', { unit: false, kind: 'cpu' }), '0.029 measured on-CPU, no network · 0.21 est. incl. network (2x + 150 ms)');
  assert.equal(jevLatencyJsonFields(H2O, 'gpu').p50_s_measured_condition, 'on-GPU, no network');
  assert.equal(jevLatencyJsonFields(API).p50_s_measured_condition, undefined);
  assert.equal(jevLatencyText(API, 'plain'), 'plain');
});

test('CR-439 render: table cell shows measured value, est. line and tooltip; API rows are unchanged', async () => {
  const { JevLatencyValue, JevLatencyLegend, JevLatencyDetail } = await importReact('components/JevLatency.tsx');
  const cell = renderToStaticMarkup(React.createElement(JevLatencyValue, { speed: H2O, kind: 'gpu' }));
  assert.match(cell, /0\.029 s/);
  assert.match(cell, /est\. 0\.21 s\*/);
  assert.match(cell, /title="Self-hosted model: measured p50 0\.029 s on-GPU, no network \(timed on our GPU over loopback/);
  assert.match(cell, /data-bh-jev-latency-measured-tag="true">on-GPU, no network</);
  assert.equal(renderToStaticMarkup(React.createElement(JevLatencyValue, { speed: API })), '0.15 s');
  const roomy = renderToStaticMarkup(React.createElement(JevLatencyValue, { speed: H2O, compact: false }));
  assert.match(roomy, /measured/);
  assert.match(roomy, /est\. incl\. network \(2x \+ 150 ms\)/);
  assert.match(renderToStaticMarkup(React.createElement(JevLatencyLegend)), /hosted endpoint instead \(on request\)/);
  const detail = renderToStaticMarkup(React.createElement(JevLatencyDetail, { speed: H2O, plain: 'p50 latency: 0.2 s' }));
  assert.match(detail, /Measured p50 latency: 0\.029 s/);
  assert.match(detail, /Ranking and cap use: 0\.21 s/);
  assert.equal(renderToStaticMarkup(React.createElement(JevLatencyDetail, { speed: API, plain: 'p50 latency: 0.2 s' })), '<p class="mt-3">p50 latency: 0.2 s</p>');
});

test('CR-439 data: the current release carries H2O-Lightning-4B measured 0.029 s / estimate 0.21 s and the JSON gets additive fields', async () => {
  const { artifact } = await readCurrentJevbench();
  const row = artifact.systems.find((s) => s.key === 'h2o-lightning-4b');
  assert.ok(row, 'h2o-lightning-4b is in the current release');
  const v = jevLatencyView(row.speed);
  assert.equal(v.adjusted, true);
  assert.equal(v.measured.toFixed(3), '0.029');
  assert.equal(v.estimate.toFixed(2), '0.21');
  const { feed } = await readJevbenchAgentFeed();
  const h = feed.systems.find((s) => s.key === 'h2o-lightning-4b');
  // v1.7.0 (10 s rule, published): the feed carries the restated Speed (all decisions: p50 0.0311 s) instead of the v1.6.1 release value; the adjustment rule is the same.
  const v170 = (await hasPublishedJevbenchV170Release()) ? (await readOptionalJevbenchV170Release()).artifact.systems.find((s) => s.key === 'h2o-lightning-4b') : null;
  const speed = v170 ? v170.speed : row.speed;
  assert.equal(h.latency.p50_s_raw, speed.p50_s_raw, 'existing fields are kept');
  assert.equal(h.latency.p50_s_adjusted, speed.p50_s_adjusted);
  assert.equal(h.latency.p50_s_measured, speed.p50_s_raw);
  assert.equal(h.latency.latency_basis, 'measured-loopback');
  assert.match(h.latency.latency_note, /2 × measured p50 \+ 150 ms/);
  const api = feed.systems.find((s) => s.board === 'api');
  assert.equal(api.latency.latency_basis, 'api-end-to-end');
  assert.equal(api.latency.latency_note, undefined);
});

test('CR-439 display only: the class gate still runs on the estimate, not on the measured value', async () => {
  const { artifact } = await readCurrentJevbench();
  const row = artifact.systems.find((s) => s.key === 'h2o-lightning-4b');
  const result = jevClassRows(artifact.systems, JEV_V16_CLASS_OPTIONS);
  const item = result.rows.find((r) => r.row.key === 'h2o-lightning-4b');
  assert.equal(item.latency, row.speed.p50_s_adjusted);
});

test('CR-439 coverage: every latency surface uses the shared helper; method note, methodology and revision entry exist', async () => {
  const uses = {
    'components/JevBenchV16Board.tsx': /JevLatencyValue/,
    'components/JevBoardInteractive.tsx': /JevLatencyValue/,
    'components/JevCapabilityRanking.tsx': /jevLatencyView/,
    'components/JevBubbleChart.tsx': /latencyMeasured/,
    'components/JevParetoCharts.tsx': /latencyMeasured/,
    'components/jevClassView.ts': /latencyMeasured/,
    'components/JevComparisonPage.tsx': /jevLatencyText/,
    'components/JevBenchRankingTable.tsx': /JevLatencyValue/,
    'components/JevV15SystemDetail.tsx': /jevLatencyView/,
    'components/JevBenchV15Preview.tsx': /jevLatencyView/,
    'app/jev-models/[system]/page.tsx': /JevLatencyDetail/,
    'app/image-jev-bench/[system]/page.tsx': /jevLatencyView/,
    'lib/jevbench-agent-feed.mjs': /jevLatencyJsonFields/,
    'lib/jevbench-llms-full.mjs': /jevLatencyText/,
  };
  for (const [file, pattern] of Object.entries(uses)) assert.match(await src(file), pattern, file);
  const board = await src('components/JevBenchV16Board.tsx');
  assert.match(board, /version: 'v1\.7\.45', date: '2026-10-11', text: 'Display: self-hosted rows now show the measured p50 next to the network-including estimate \(2× measured \+ 150 ms\), which the ranking continues to use\. No score or rank changed\.'/);
  assert.match(board, /<JevLatencyMethodNote( inForce=\{.*\})? \/>/);
  const guide = await src('components/DecisionBenchmarkGuide.tsx');
  assert.match(guide, /2 × measured p50 \+ 150 ms/);
  assert.match(guide, /Hosted endpoint timing on request/);
  assert.match(guide, /info@productivity-boost\.com/);
});

// Render the shared board table (the /jev-models "all data" table) with the real current-release rows.
const fileUrl = (path) => new URL(`../${path}`, import.meta.url);
const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
async function compileReact(path, aliases = {}) {
  const url = fileUrl(path);
  let code = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  code = code.replace(/\bfrom\s*(["'])([^"']+)\1/g, (_, q, spec) =>
    `from ${q}${aliases[spec] ?? (spec.startsWith('.') ? new URL(spec, url).href : `file://${require.resolve(spec)}`)}${q}`);
  return moduleUrl(code);
}
test('CR-439 render: the board table shows 0.029 s with the est. line for H2O-Lightning-4B and plain values for API rows', async () => {
  const aliases = {
    'next/link': moduleUrl(`import {createElement} from ${JSON.stringify(`file://${require.resolve('react')}`)}; export default function Link({href,children,...p}){return createElement('a',{href,...p},children)}`),
    './BaseModelDisplay': await compileReact('components/BaseModelDisplay.tsx'),
    './JevLatency': await compileReact('components/JevLatency.tsx'),
    './JevArchitecture': await compileReact('components/JevArchitecture.tsx'),
    './JevMethodTag': await compileReact('components/JevMethodTag.tsx'),
    './JevDecisionLimitCell': await compileReact('components/JevDecisionLimitCell.tsx'),
    './jevTypes': await compileTsModule(fileUrl('components/jevTypes.ts')),
    './useJevV15VisibleKeys': moduleUrl('export function useJevV15VisibleKeys(keys){return new Set(keys)}'),
    './UseModelButton': moduleUrl('export const UseModelEntry=()=>null;export const UseModelNote=()=>null;'),
    './jevSystemLinks': moduleUrl(`import data from ${JSON.stringify(fileUrl('data/raw/benchmarks/jevbench/jev-system-links.json').href)} with {type:'json'};
export const jevSourceUrl=(key,repo)=>data.links[key]?.url??repo??null;`),
  };
  const shared = await compileReact('components/JevBoardShared.tsx', aliases);
  const board = await import(await compileReact('components/JevBoardInteractive.tsx', {
    ...aliases, './JevBoardShared': shared, './jevFieldNames': await compileReact('components/jevFieldNames.tsx') }));
  const { artifact } = await readCurrentJevbench();
  const rows = artifact.systems.filter((s) => ['h2o-lightning-4b', 'sage-1.3.0'].includes(s.key))
    .map((s) => jevV15BoardRow(s, { headline: artifact.headline }));
  assert.equal(rows.length, 2);
  const html = renderToStaticMarkup(React.createElement(board.JevAxesTable, { rows, publicDecisions: 0, sealedDecisions: 0, newLabel: null }));
  const h2o = html.match(/<tr id="jev14-row-h2o-lightning-4b".*?<\/tr>/s)[0];
  assert.match(h2o, /0\.029 s/);
  assert.match(h2o, /est\. 0\.21 s\*/);
  assert.match(h2o, /title="Self-hosted model: measured p50 0\.029 s on-GPU, no network \(timed on our GPU over loopback/);
  assert.match(h2o, />on-GPU, no network</);
  const api = html.match(/<tr id="jev14-row-sage-1\.3\.0".*?<\/tr>/s)[0];
  assert.doesNotMatch(api, /est\. /);
  assert.match(html, /data-bh-jev-latency-legend/);
});

test('CR-439 review: v1.2 board labels only x2 + 0.15 s rows as network estimates; CSV headers unchanged', async () => {
  const { readFile } = await import('node:fs/promises');
  const v12 = await readFile(new URL('../components/JevModelsV12.tsx', import.meta.url), 'utf8');
  assert.match(v12, /isSelfHostedAdjustment\(r\.adjustment\) \? 'est\. incl\. network \(2x \+ 150 ms\)' : 'adjusted'/);
  const grid = await readFile(new URL('../lib/jevbench-all-data-grid.mjs', import.meta.url), 'utf8');
  for (const label of ['p50 raw (s)', 'p95 raw (s)', 'p50 adjusted (s)', 'p95 adjusted (s)']) assert.ok(grid.includes(`'${label}'`), label);
});
