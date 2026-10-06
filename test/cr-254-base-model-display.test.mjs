import { isJevbenchV16ExcludedKey } from '../lib/jevbench-v16-public-scope.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BASE_MODEL_METADATA, baseModelFor, baseModelsForBenchmark } from '../lib/jev-base-model.mjs';
import { imageJevSystemPath, imageJevSourceUrl } from '../lib/imagejev-system-links.mjs';
import { imageJevCapabilityLimits, imageJevBoardSystems } from '../lib/imagejev-board.mjs';
import { readMultimodalPreview, readImageJevV03 } from '../lib/jevbench-multimodal-preview.mjs';
import { jevV15BoardRow } from '../lib/jevbench-v15-board.mjs';
import { readJevbenchV154Release } from '../lib/jevbench-v15-release.mjs';
import { importTsModule, compileTsModule } from './helpers/transpile-ts.mjs';

const require = createRequire(import.meta.url);
const file = (path) => new URL(path, import.meta.url);
const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const source = { url: 'https://huggingface.co/author/model', title: 'Author model card', evidence: 'Author states the base model.' };
const fixture = { schema_version: 1, checked_utc: '2026-10-01', benchmarks: {
  jevbench: {
    collision: { status: 'disclosed', label: 'Text base', sources: [source], note: 'Operator-reported; weights not publicly verifiable.' },
    unknown: { status: 'undisclosed', label: 'Do not infer this label', sources: [source], note: 'No verified public base-model disclosure recorded.' },
    authorUnknown: { status: 'undisclosed', label: 'undisclosed', sources: [source], note: 'Author statement: the tested model uses an unpublished base.' },
    noSource: { status: 'disclosed', label: 'Uncited base', sources: [] },
    emptyLabel: { status: 'disclosed', label: '  ', sources: [source] },
    badSource: { status: 'disclosed', label: 'Uncited base', sources: [{ url: 'javascript:alert(1)' }, { url: 'https://' }] },
  },
  imagejevbench: { collision: { status: 'disclosed', label: 'Image base', sources: [source] } },
} };

async function compileReactModule(url, aliases = {}) {
  let code = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  code = code.replace(/\bfrom\s*(["'])([^"']+)\1/g, (_, quote, specifier) => {
    const target = aliases[specifier] ?? (specifier.startsWith('.') ? new URL(specifier, url).href : `file://${require.resolve(specifier)}`);
    return `from ${quote}${target}${quote}`;
  });
  return moduleUrl(code);
}
const importReactModule = async (url, aliases) => import(await compileReactModule(url, aliases));
const componentUrl = file('../components/BaseModelDisplay.tsx');
const realComponent = await importReactModule(componentUrl);
const fixtureResolver = moduleUrl(`import {baseModelFor as resolve,isBaseModelDisclosed} from ${JSON.stringify(file('../lib/jev-base-model.mjs').href)};
export {isBaseModelDisclosed}; export const baseModelFor=(benchmark,key)=>resolve(benchmark,key,${JSON.stringify(fixture)});`);
const fixtureComponent = await importReactModule(componentUrl, { '../lib/jev-base-model.mjs': fixtureResolver });
const renderBase = (props) => renderToStaticMarkup(React.createElement(fixtureComponent.BaseModelDisplay, props));

test('CR-254 fallbacks require a cited label and never infer missing bases or inherited keys', () => {
  for (const key of ['missing', 'noSource', 'emptyLabel', 'badSource', 'toString', '__proto__']) {
    const entry = baseModelFor('jevbench', key, fixture);
    assert.equal(entry.status, 'undisclosed', key);
    assert.equal(entry.label, 'undisclosed', key);
  }
  assert.equal(baseModelFor('unknown-benchmark', 'collision', fixture).status, 'undisclosed');
  assert.equal(baseModelFor('jevbench', undefined, fixture).note, null);
  assert.equal(baseModelFor('jevbench', 'collision', fixture).label, 'Text base');
  assert.equal(baseModelFor('imagejevbench', 'collision', fixture).label, 'Image base');
  assert.deepEqual(baseModelFor('jevbench', 'unknown', fixture).sources, [source]);
});

test('CR-254 rendered citations survive undisclosed status, and author notes remain visible', () => {
  const unknown = renderBase({ systemKey: 'unknown' });
  assert.match(unknown, /data-bh-base-model-status="undisclosed"/);
  assert.match(unknown, /href="https:\/\/huggingface.co\/author\/model"/);
  assert.match(unknown, /title="No verified public base-model disclosure recorded\."/);
  assert.doesNotMatch(unknown, /Do not infer this label/);
  const disclosed = renderBase({ systemKey: 'collision' });
  assert.match(disclosed, /Text base/);
  assert.match(disclosed, /> · Operator-reported; weights not publicly verifiable\.</);
  assert.match(disclosed, /Author states the base model\./);
  assert.match(renderBase({ benchmark: 'imagejevbench', systemKey: 'collision' }), /Image base/);
  assert.match(renderBase({ systemKey: 'missing' }), />undisclosed</);
  assert.match(renderBase({ systemKey: 'authorUnknown' }), /> · Author statement: the tested model uses an unpublished base\.</);
});

test('CR-254 metadata covers current text and Image rosters, with citations on every disclosed base', async () => {
  const { artifact } = await readJevbenchV154Release();
  const image = await readMultimodalPreview();
  for (const [benchmark, rows] of [['jevbench', [...artifact.systems, ...artifact.not_measured]], ['imagejevbench', image.ranking]]) {
    for (const row of rows) {
      if (benchmark === 'jevbench' && isJevbenchV16ExcludedKey(row.key)) continue;
      assert.ok(Object.hasOwn(BASE_MODEL_METADATA.benchmarks[benchmark], row.key), `${benchmark}/${row.key}`);
      const base = baseModelFor(benchmark, row.key);
      if (base.status === 'disclosed') {
        assert.notEqual(base.label, 'undisclosed');
        assert.ok(base.sources.length > 0);
        for (const citation of base.sources) {
          assert.match(citation.url, /^https?:\/\//);
          assert.ok(citation.evidence.trim(), `reviewed evidence for ${benchmark}/${row.key}`);
        }
      }
    }
  }
  assert.equal(baseModelFor('imagejevbench', 'imajev_4b_20260926').status, 'undisclosed');
});

test('CR-254 separate provenance API exposes both scopes and leaves exact hashed result bytes intact', async () => {
  const { artifact, bytes, sha256 } = await readJevbenchV154Release();
  const textBefore = JSON.stringify(artifact);
  const imageBefore = await readFile(file('../data/raw/benchmarks/jevbench/multimodal-preview/preview.json'));
  const image = await readMultimodalPreview();
  const imageJsonBefore = JSON.stringify(image);
  for (const [benchmark, rows] of [['jevbench', artifact.systems], ['imagejevbench', image.ranking]]) {
    for (const row of rows) renderToStaticMarkup(React.createElement(realComponent.BaseModelDisplay, { benchmark, systemKey: row.key }));
  }
  assert.equal(JSON.stringify(artifact), textBefore);
  assert.equal(JSON.stringify(image), imageJsonBefore);
  assert.equal(sha256, '0cf210b76bf85084a5f3fb40fb109e9a2c2f93df42ff6628696377666e89db45');
  assert.equal(createHash('sha256').update(imageBefore).digest('hex'), 'c5829fb7a3b0a3c04f64446f6f1d821169795b82396216d5fbaf2d30bf4c5108');
  const resultRoute = await importTsModule(file('../app/api/jevbench/v1.5.4/route.ts'));
  const response = await resultRoute.GET();
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  assert.equal(response.headers.get('x-content-sha256'), sha256);
  const provenanceRoute = await importTsModule(file('../app/api/jevbench/base-models/route.ts'));
  const provenance = await (await provenanceRoute.GET()).json();
  assert.deepEqual(Object.keys(provenance.benchmarks), ['jevbench', 'imagejevbench']);
  for (const benchmark of Object.keys(provenance.benchmarks)) assert.deepEqual(provenance.benchmarks[benchmark], baseModelsForBenchmark(benchmark));
  assert.deepEqual((await readJevbenchV154Release()).bytes, bytes);
  assert.deepEqual(await readFile(file('../data/raw/benchmarks/jevbench/multimodal-preview/preview.json')), imageBefore);
});

const linkStub = moduleUrl(`import React from ${JSON.stringify(`file://${require.resolve('react')}`)};
export default function Link({children,...props}) {return React.createElement('a',props,children);}`);
const detail = await importReactModule(file('../app/image-jev-bench/[system]/page.tsx'), {
  'next/link': linkStub,
  'next/navigation': moduleUrl('export function notFound(){throw new Error("NOT_FOUND")}'),
  '../../../components/BaseModelDisplay': await compileReactModule(componentUrl),
  '../../../components/jevTypes': await compileTsModule(file('../components/jevTypes.ts')),
  '../../../components/JevArchitecture': await compileReactModule(file('../components/JevArchitecture.tsx')),
  '../../../components/JevSystemCharts': moduleUrl('export const JevAxisBand=()=>null; export const typeColour=()=>"blue";'),
  '../../../lib/seo': moduleUrl('export const previewMetadata=(value)=>value;'),
});

test('CR-254 every Image detail route renders published rank, axes, cost, latency and cited provenance', async () => {
  // v0.3.0 rows render from the v0.3.0 artifact; systems only on v0.1.5 (dated carries) keep their v0.1.5 page.
  const current = await readImageJevV03();
  const archive = await readMultimodalPreview();
  const v03 = imageJevBoardSystems(current);
  const v03Keys = new Set(v03.map((row) => row.key));
  const sources = [...v03.map((row) => ({ row, artifact: current, rows: v03 })),
    ...imageJevBoardSystems(archive).filter((row) => !v03Keys.has(row.key)).map((row, _, rows) => ({ row, artifact: archive, rows: imageJevBoardSystems(archive) }))];
  assert.equal(v03.length, 45);
  assert.equal(sources.length, 54);
  assert.deepEqual(await detail.generateStaticParams(), sources.map(({ row }) => ({ system: row.key })));
  for (const { row, artifact, rows } of sources) {
    const rankedCount = rows.filter((candidate) => candidate.ranked).length;
    const html = renderToStaticMarkup(await detail.default({ params: Promise.resolve({ system: row.key }) }));
    assert.match(html, new RegExp(`data-bh-base-model="${row.key}"`));
    assert.match(html, /data-bh-base-model-benchmark="imagejevbench"/);
    assert.ok(html.includes(row.ranked ? `Rank #${row.rank} of ${rankedCount} ranked systems.` : 'Listed, not ranked.'), row.key);
    assert.ok(html.includes(`Image JevBench ${artifact.revision}`), row.key);
    if (row.jevbench_score != null) assert.ok(html.includes(row.jevbench_score.toFixed(3)), row.key);
    if (row.cost?.usd_per_1000 != null) assert.ok(html.includes(`USD ${row.cost.usd_per_1000.toFixed(6)}`), row.key);
    if (row.speed?.p50_s_raw != null && row.speed?.p95_s_raw != null) assert.ok(html.includes(`${row.speed.p50_s_raw.toFixed(3)} s / ${row.speed.p95_s_raw.toFixed(3)} s`), row.key);
    for (const value of Object.values(row.axes ?? {})) if (value != null) assert.ok(html.includes(value.toFixed(1)), row.key);
    for (const citation of baseModelFor('imagejevbench', row.key)?.sources ?? []) assert.ok(html.includes(citation.url.replaceAll('&', '&amp;')), row.key);
    assert.equal((await detail.generateMetadata({ params: Promise.resolve({ system: row.key }) })).path, imageJevSystemPath(row.key));
  }
  await assert.rejects(detail.default({ params: Promise.resolve({ system: 'missing' }) }), /NOT_FOUND/);
  assert.equal(imageJevSystemPath('key / spaced'), '/image-jev-bench/key%20%2F%20spaced');
  assert.equal(imageJevSourceUrl('missing', 'https://author.example/model'), 'https://author.example/model');
  assert.equal(imageJevSourceUrl('missing'), null);
});

test('CR-254 every text detail branch and shared leaderboard surface includes the display', async () => {
  for (const path of ['../components/JevV141SystemDetail.tsx', '../components/JevV15SystemDetail.tsx', '../app/jev-models/[system]/page.tsx']) {
    assert.match(await readFile(file(path), 'utf8'), /<BaseModelDisplay systemKey=\{row\.key\}/);
  }
  for (const path of ['../components/JevBoardShared.tsx', '../components/JevBoardInteractive.tsx', '../components/JevCapabilityRanking.tsx']) {
    const content = await readFile(file(path), 'utf8');
    assert.match(content, /<BaseModelDisplay benchmark=\{benchmark\} systemKey=\{row\.key\}/);
    assert.match(content, /imageJevSourceUrl\(row\.key, row\.repo\)/);
  }
  const imagePage = await readFile(file('../app/jev-models/multimodal-preview/page.tsx'), 'utf8');
  assert.match(imagePage, /<BaseModelDisplay benchmark="imagejevbench" systemKey=\{s\.key\}/);
  assert.match(imagePage, /data-bh-mm-system-details=\{s\.key\}/);
});


// Render the actual shared client table/chart using React SSR; only Next's Link is adapted.
const sharedAliases = {
  'next/link': linkStub,
  './BaseModelDisplay': await compileReactModule(componentUrl),
  './JevArchitecture': await compileReactModule(file('../components/JevArchitecture.tsx')),
  './jevTypes': await compileTsModule(file('../components/jevTypes.ts')),
  // The isolated SSR render has no page-level filter provider; mirror the hook's default all-visible state.
  './useJevV15VisibleKeys': moduleUrl('export function useJevV15VisibleKeys(keys){return new Set(keys)}'),
};
// TypeScript's JSON import has no Node import attribute, so resolve the existing link map directly here.
sharedAliases['./jevSystemLinks'] = moduleUrl(`import data from ${JSON.stringify(file('../data/raw/benchmarks/jevbench/jev-system-links.json').href)} with {type:'json'};
export const jevSourceUrl=(key,repo)=>data.links[key]?.url??repo??null;`);
const sharedUrl = await compileReactModule(file('../components/JevBoardShared.tsx'), sharedAliases);
const { JevScoreBar } = await import(sharedUrl);
const interactive = await importReactModule(file('../components/JevBoardInteractive.tsx'), {
  ...sharedAliases, './JevBoardShared': sharedUrl,
  './jevFieldNames': await compileReactModule(file('../components/jevFieldNames.tsx')),
});

test('CR-254 shared Image chart and table preserve scope, source and detail links for all rows', async () => {
  const rows = imageJevBoardSystems(await readMultimodalPreview());
  const html = renderToStaticMarkup(React.createElement(interactive.JevAxesTable, {
    rows, publicDecisions: 228, sealedDecisions: 456, newLabel: null, benchmark: 'imagejevbench',
  }));
  assert.equal((html.match(/data-bh-base-model-benchmark="imagejevbench"/g) ?? []).length, 50);
  assert.doesNotMatch(html, /href="\/jev-models\//);
  for (const row of rows) {
    const bar = renderToStaticMarkup(React.createElement(JevScoreBar, { row, benchmark: 'imagejevbench' }));
    assert.ok(bar.includes(imageJevSystemPath(row.key)), row.key);
    assert.ok(html.includes(imageJevSystemPath(row.key)), row.key);
    const sourceUrl = imageJevSourceUrl(row.key, row.repo);
    if (sourceUrl) assert.ok(bar.includes(sourceUrl.replaceAll('&', '&amp;')), row.key);
    assert.match(bar, /data-bh-base-model-benchmark="imagejevbench"/);
  }
});


test('CR-254 all current text rows, including unranked listings, keep scoped provenance', async () => {
  const { artifact } = await readJevbenchV154Release();
  const rows = artifact.systems.map((row) => jevV15BoardRow(row, { headline: artifact.headline }));
  const html = renderToStaticMarkup(React.createElement(interactive.JevAxesTable, {
    rows, publicDecisions: 0, sealedDecisions: 0, newLabel: null,
  }));
  assert.equal((html.match(/data-bh-base-model-benchmark="jevbench"/g) ?? []).length, rows.length);
  for (const row of rows) assert.ok(html.includes(`data-bh-base-model="${row.key}"`), row.key);
  assert.ok(rows.some((row) => !row.ranked));
});

const capability = await importReactModule(file('../components/JevCapabilityRanking.tsx'), {
  ...sharedAliases,
  './JevBoardShared': sharedUrl,
  './JevCapabilityTip': await compileReactModule(file('../components/JevCapabilityTip.tsx')),
  './JevCapabilityChart': moduleUrl(`export const shortName=d=>d.split(' (')[0].split(', formerly')[0]; export const usd=v=>'USD '+v.toFixed(4);`),
});

test('CR-254 Image Capability tooltips render scoped provenance and citations for the entire roster', async () => {
  const artifact = await readMultimodalPreview();
  const systems = imageJevBoardSystems(artifact);
  const limits = imageJevCapabilityLimits(artifact);
  const html = renderToStaticMarkup(React.createElement(capability.JevCapabilityRanking, {
    systems, revision: artifact.revision, officialHref: '#composite', benchmark: 'imagejevbench',
    benchName: 'Image JevBench', referenceLabel: limits.referenceLabel, limits,
  }));
  assert.equal((html.match(/data-bh-base-model-benchmark="imagejevbench"/g) ?? []).length, 50);
  for (const row of systems) {
    assert.ok(html.includes(`data-bh-base-model-tip="${row.key}"`), row.key);
    for (const source of baseModelFor('imagejevbench', row.key).sources) assert.ok(html.includes(source.url.replaceAll('&', '&amp;')), row.key);
  }
});
