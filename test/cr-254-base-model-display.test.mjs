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
import { readMultimodalPreview, readMultimodalPreviewV02, readArchivedMultimodalPreviewV014 } from '../lib/jevbench-multimodal-preview.mjs';
import { readImageJevDetails, imageJevDetailsFromArtifact } from '../lib/imagejev-details.mjs';
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

async function compileReactModule(url, aliases = {}, sourceOverride) {
  let code = ts.transpileModule(sourceOverride ?? await readFile(url, 'utf8'), { compilerOptions: {
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
  assert.equal(createHash('sha256').update(imageBefore).digest('hex'), '42f47c9bb172997089ed61b994b3cb8f2cb1b20cd73bef4e8b47271f0697f41c');
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
const detailComponent = await compileReactModule(file('../components/ImageJevSystemDetail.tsx'), {
  'next/link': linkStub,
  'next/navigation': moduleUrl('export function notFound(){throw new Error("NOT_FOUND")}'),
  './BaseModelDisplay': await compileReactModule(componentUrl),
  './JevSystemCharts': moduleUrl('export const JevAxisBand=()=>null; export const typeColour=()=>"blue";'),
  '../lib/seo': moduleUrl('export const previewMetadata=(value)=>value;'),
});
const detailRoute = async (revision) => importReactModule(file(`../app/image-jev-bench/${revision ? `${revision}/` : ''}[system]/page.tsx`), {
  [`${revision ? '../../../../' : '../../../'}components/ImageJevSystemDetail`]: detailComponent,
});
const detail = await detailRoute('v0.1.5');

test('CR-254 all 50 archived v0.1.5 Image detail routes render published rank, axes, cost, latency and cited provenance', async () => {
  const artifact = await readMultimodalPreview();
  const rows = imageJevBoardSystems(artifact);
  assert.equal(rows.length, 50);
  assert.deepEqual(await detail.generateStaticParams(), rows.map((row) => ({ system: row.key })));
  for (const row of rows) {
    const html = renderToStaticMarkup(await detail.default({ params: Promise.resolve({ system: row.key }) }));
    assert.match(html, new RegExp(`data-bh-base-model="${row.key}"`));
    assert.match(html, /data-bh-base-model-benchmark="imagejevbench"/);
    assert.ok(html.includes(`Rank #${row.rank} of 50 ranked systems.`));
    assert.ok(html.includes(row.jevbench_score.toFixed(3)), row.key);
    assert.ok(html.includes(`USD ${row.cost.usd_per_1000.toFixed(6)}`), row.key);
    assert.ok(html.includes(`${row.speed.p50_s_raw.toFixed(3)} s / ${row.speed.p95_s_raw.toFixed(3)} s`), row.key);
    for (const value of Object.values(row.axes)) assert.ok(html.includes(value.toFixed(1)), row.key);
    for (const citation of baseModelFor('imagejevbench', row.key).sources) assert.ok(html.includes(citation.url.replaceAll('&', '&amp;')), row.key);
    assert.equal((await detail.generateMetadata({ params: Promise.resolve({ system: row.key }) })).path, imageJevSystemPath(row.key, row.image_revision));
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
    assert.match(content, /imageJevSourceUrl\(row\.key, row\.repo, row\.image_revision\)/);
  }
  const imagePage = await readFile(file('../app/jev-models/multimodal-preview/page.tsx'), 'utf8');
  assert.match(imagePage, /<BaseModelDisplay benchmark="imagejevbench" systemKey=\{s\.key\}/);
  assert.match(imagePage, /data-bh-mm-system-details=\{s\.key\}/);
});


// Render the actual shared client table/chart using React SSR; only Next's Link is adapted.
const sharedAliases = {
  'next/link': linkStub,
  './BaseModelDisplay': await compileReactModule(componentUrl),
  './jevTypes': await compileTsModule(file('../components/jevTypes.ts')),
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
    assert.ok(bar.includes(imageJevSystemPath(row.key, row.image_revision)), row.key);
    assert.ok(html.includes(imageJevSystemPath(row.key, row.image_revision)), row.key);
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


test('CR-254 actual 51 v02 identities and independent 50/50 archives preserve selected aggregates', async () => {
  const {artifact: v02} = await readMultimodalPreviewV02();
  const v015 = await readMultimodalPreview();
  const {artifact: v014} = await readArchivedMultimodalPreviewV014();
  const snapshots = [v02, v015, v014].map((a) => JSON.stringify(a));
  for (const [revision, artifact, count] of [['v0.2.0',v02,51], ['v0.1.5',v015,50], ['v0.1.4',v014,50]]) {
    const rows = imageJevDetailsFromArtifact(artifact);
    const route = await detailRoute(revision);
    assert.equal(rows.length, count);
    assert.equal(new Set(rows.map(r=>r.key)).size, count);
    assert.deepEqual(await route.generateStaticParams(), rows.map(r=>({system:r.key})));
    const measured = [...artifact.ranking, ...(artifact.measured_unrankable_rows ?? [])];
    for (const row of rows) {
      assert.equal(row.revision, revision);
      assert.equal(row.track, revision === 'v0.2.0' ? 'core' : 'all');
      const original = measured.find(r=>r.key===row.key);
      if (original) {
        const track = original.tracks[row.track];
        assert.deepEqual(row.axes, track.axes);
        assert.equal(row.rank, original.rank);
        assert.equal(row.jevbench_score, track.composite?.score ?? null);
        assert.equal(row.cost.usd_per_1000, track.cost?.usd_per_1000 ?? null);
        assert.equal(row.speed.p50_s_raw, track.speed.raw_p50_s);
        assert.equal(row.speed.p95_s_raw, track.speed.raw_p95_s);
        assert.equal(row.speed.p50_s_adjusted, track.speed.adjusted_p50_s);
        assert.equal(row.speed.p95_s_adjusted, track.speed.adjusted_p95_s);
      } else {
        assert.equal(row.status, 'historical-reference');
        assert.deepEqual(Object.values(row.axes), [null,null,null,null]);
        assert.equal(row.rank, null);
        assert.equal(row.jevbench_score, null);
        assert.equal(row.source_url, null);
        assert.equal(row.reference.score, artifact.reference_rows.find(r=>r.key===row.key).reference_score);
      }
      const html = renderToStaticMarkup(await route.default({params:Promise.resolve({system:row.key})}));
      assert.ok(html.includes(`data-bh-mm-detail-revision="${revision}"`), row.key);
      assert.ok(html.includes(`data-bh-mm-detail-status="${row.status}"`), row.key);
      assert.ok(html.includes(`data-bh-base-model="${row.key}"`), row.key);
      assert.ok(html.includes(`/image-jev-bench?version=${revision}`), row.key);
      assert.ok(html.includes(`#${revision==='v0.2.0'?'imagejev-v02-method-heading':'method-heading'}`), row.key);
      assert.equal((await route.generateMetadata({params:Promise.resolve({system:row.key})})).path, imageJevSystemPath(row.key,revision));
      if (revision === 'v0.2.0') assert.doesNotMatch(html, /full-benchmark/);
      if (row.reason) assert.ok(html.includes(row.reason.replaceAll('&','&amp;')), row.key);
      if (row.status==='ranked') assert.ok(html.includes(`Rank #${row.rank} of ${revision==='v0.2.0'?45:50} ranked systems.`), row.key);
      if (row.status==='historical-reference') assert.doesNotMatch(html, /data-bh-jev-source=/);
    }
  }
  assert.deepEqual([v02,v015,v014].map(a=>JSON.stringify(a)),snapshots);
  const defaultRoute = await detailRoute();
  const current = await readImageJevDetails();
  assert.equal(current.systems.filter(r=>r.status==='ranked').length,45);
  assert.equal(current.systems.filter(r=>r.status==='measured-unrankable').length,3);
  assert.equal(current.systems.filter(r=>r.status==='historical-reference').length,3);
  assert.deepEqual(await defaultRoute.generateStaticParams(),current.systems.map(r=>({system:r.key})));
  assert.equal((await defaultRoute.generateMetadata({params:Promise.resolve({system:'wity_1'})})).path,'/image-jev-bench/wity_1');
  await assert.rejects(defaultRoute.default({params:Promise.resolve({system:'unknown'})}), /NOT_FOUND/);
  assert.equal(await readImageJevDetails('v0.1.3'),null);
  assert.throws(()=>imageJevSystemPath('wity_1','v0.1.3'),/Unsupported/);
});

test('CR-254 historical Imajev never collides with current Imajev or inherits its source/rank', async () => {
  const {systems} = await readImageJevDetails();
  const historical = systems.find(r=>r.key==='imajev_4b_20260926');
  const current = systems.find(r=>r.key==='imajev_4b');
  assert.ok(current); assert.ok(historical);
  assert.equal(historical.status,'measured-unrankable');
  assert.equal(historical.rank,null); assert.equal(historical.axes.intelligence,0);
  assert.equal(historical.axes.cost,null); assert.equal(historical.cost.usd_per_1000,null);
  assert.equal(historical.jevbench_score,null); assert.equal(historical.reference,null);
  assert.equal(historical.source_url,null);
  assert.match(historical.inference_setting,/Do not substitute current adapter c9e5f132/);
  assert.match(historical.reason,/573 explicit item inference errors/);
  assert.notEqual(current.rank,historical.rank);
  assert.notEqual(imageJevSystemPath(current.key,'v0.2.0'),imageJevSystemPath(historical.key,'v0.2.0'));
  assert.equal(imageJevSourceUrl(historical.key,'https://current.example/source','v0.2.0'),null);
  for(const r of systems.filter(r=>r.status==='historical-reference')) assert.equal(imageJevSourceUrl(r.key,'https://current.example/source','v0.2.0'),null);
});

test('CR-254 v02 detail Wity shows both exact tariff scores, costs and provenance', async () => {
  const {systems} = await readImageJevDetails();
  const wity = systems.find(r=>r.key==='wity_1');
  assert.equal(wity.jevbench_score,69.64955383096422);
  assert.equal(wity.cost.usd_per_1000,0.00990818181818182);
  assert.equal(wity.pricing_alternative.tracks.core.composite.score,64.67412023103621);
  assert.equal(wity.pricing_alternative.tracks.core.cost.usd_per_1000,0.03538636363636363);
  const route=await detailRoute('v0.2.0');
  const html=renderToStaticMarkup(await route.default({params:Promise.resolve({system:wity.key})}));
  for(const text of ['69.650','64.674','0.009908','0.035386','0.042/M input','0.15/M input','1/M output','Frozen 30 Sep 2026 reviewed candidate']) assert.ok(html.includes(text),text);
  assert.doesNotMatch(html,/data-bh-mm-author-review/);
});

test('CR-254 archived Wity detail preserves the flat v015 base-price score and hypothetical rank', async () => {
  const route = await detailRoute('v0.1.5');
  const html = renderToStaticMarkup(await route.default({ params: Promise.resolve({ system: 'wity_1' }) }));
  assert.match(html, /<h2[^>]*>Base-model price<\/h2>/);
  assert.match(html, /Composite 74\.364/);
  assert.match(html, /would be #2/);
  assert.match(html, /data-bh-mm-author-review/);
  const archived = await detailRoute('v0.1.4');
  const original = renderToStaticMarkup(await archived.default({ params: Promise.resolve({ system: 'wity_1' }) }));
  assert.doesNotMatch(original, /data-bh-mm-detail-pricing-alternative/);
});

test('CR-254 historical references show provenance without a current measurement block', async () => {
  const { systems } = await readImageJevDetails();
  const route = await detailRoute('v0.2.0');
  for (const row of systems.filter(r => r.status === 'historical-reference')) {
    const html = renderToStaticMarkup(await route.default({ params: Promise.resolve({ system: row.key }) }));
    assert.match(html, /data-bh-mm-detail-reference/);
    assert.doesNotMatch(html, /data-bh-mm-system-measurement|Not measured s/);
    assert.ok(html.includes(row.reason));
  }
});

test('CR-254 v02 shared bars/table/tooltips and local ranked/NULL/reference cells link selected identities', async () => {
  const {artifact}=await readMultimodalPreviewV02();
  const {systems}=await readImageJevDetails();
  const html=renderToStaticMarkup(React.createElement(interactive.JevAxesTable,{rows:systems,publicDecisions:157,sealedDecisions:261,newLabel:null,benchmark:'imagejevbench'}));
  for(const row of systems) {
    const bar=renderToStaticMarkup(React.createElement(JevScoreBar,{row,benchmark:'imagejevbench'}));
    for(const rendered of [bar,html]) assert.ok(rendered.includes(imageJevSystemPath(row.key,'v0.2.0')),row.key);
  }
  const limits=imageJevCapabilityLimits(artifact);
  const tips=renderToStaticMarkup(React.createElement(capability.JevCapabilityRanking,{systems:imageJevBoardSystems(artifact),revision:'v0.2.0',officialHref:'#composite',benchmark:'imagejevbench',limits,referenceLabel:limits.referenceLabel}));
  for(const row of artifact.ranking) {
    assert.ok(tips.includes(`data-bh-base-model-tip="${row.key}"`),row.key);
    assert.ok(tips.includes(imageJevSystemPath(row.key,'v0.2.0')),row.key);
  }
  const local=await importReactModule(file('../components/ImageJevV02RankingTable.tsx'),sharedAliases);
  const table=renderToStaticMarkup(React.createElement(local.ImageJevV02RankingTable,{systems:artifact.ranking}));
  for(const row of artifact.ranking) {
    assert.ok(table.includes(`data-bh-base-model="${row.key}"`),row.key);
    assert.ok(table.includes(imageJevSystemPath(row.key,'v0.2.0')),row.key);
  }
  const pageUrl=file('../app/jev-models/multimodal-preview/page.tsx');
  const page=await readFile(pageUrl,'utf8');
  const functionBody=(name)=>page.slice(page.indexOf(`function ${name}`),page.indexOf('\nfunction ',page.indexOf(`function ${name}`)+1));
  const localCode = `import Link from 'next/link';
    import {BaseModelDisplay} from '../../../components/BaseModelDisplay';
    import {imageJevSystemPath as imageSystemPath, imageJevSourceUrl} from '../../../lib/imagejev-system-links.mjs';
    import {formatMatchedGapPp} from '../../../lib/jevbench-multimodal-preview.mjs';
    ${page.slice(page.indexOf('const pct ='),page.indexOf('function CandidateCoverageTable'))}
    ${functionBody('ReferenceRows')}
    ${functionBody('MeasuredWithoutCompositeRows')}
    export {ReferenceRows,MeasuredWithoutCompositeRows,RankingTable,ScoreBars};`;
  const locals=await import(await compileReactModule(pageUrl, {
    'next/link':linkStub,
    '../../../components/BaseModelDisplay':await compileReactModule(componentUrl),
  },localCode));
  const unranked=new Set(artifact.measured_unrankable_rows.map(r=>r.key));
  const references=artifact.reference_rows.filter(r=>!unranked.has(r.key));
  const nullHtml=renderToStaticMarkup(React.createElement(locals.MeasuredWithoutCompositeRows,{rows:artifact.measured_unrankable_rows,references:artifact.reference_rows}));
  const refHtml=renderToStaticMarkup(React.createElement(locals.ReferenceRows,{rows:references}));
  for(const [rows,rendered] of [[artifact.measured_unrankable_rows,nullHtml],[references,refHtml]]) {
    for(const row of rows) {
      assert.ok(rendered.includes(`data-bh-base-model="${row.key}"`),row.key);
      assert.ok(rendered.includes(imageJevSystemPath(row.key,'v0.2.0')),row.key);
    }
  }
  for(const revision of ['v0.2.0','v0.1.5','v0.1.4']) {
    const {artifact:selected}=await readImageJevDetails(revision);
    for(const component of [locals.RankingTable,locals.ScoreBars]) {
      const rendered=renderToStaticMarkup(React.createElement(component,{systems:selected.ranking,track:revision==='v0.2.0'?'core':'all',version:revision}));
      for(const row of selected.ranking) assert.ok(rendered.includes(imageJevSystemPath(row.key,revision)),`${revision}/${row.key}`);
    }
  }
});
