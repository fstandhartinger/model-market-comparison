import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { createRequire, register } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JEV_LEGACY_ARCHIVE_VERSIONS, readJevLegacyArchivePayload } from '../lib/jevbench-archive-legacy-input.mjs';
register('./jevbench-archive-loader-hooks.mjs', import.meta.url);
const { jevClassView } = await import('../components/jevClassView.ts');
const { GET } = await import('../app/api/jevbench/[version]/board/route.ts');
const { JevModelsV14Board } = await import('../components/JevModelsV14.tsx');
const { JevBenchV15View } = await import('../components/JevBenchV15View.tsx');
const { JevV170OldNewTable } = await import('../components/JevV170OldNewTable.tsx');
const { JevBoardGuides } = await import('../components/JevBoardGuides.tsx');
const fixtureBytes = await readFile(new URL('./fixtures/jevbench-legacy-archive-baseline.json', import.meta.url));
assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'), '7717589edbba40bc79b0a631009f8de7622aa44a951b9cf0fdfb5bc7e0b5eda8');
const fixture = JSON.parse(fixtureBytes);
const normalize = value => JSON.parse(JSON.stringify(value));
const phase = process.env.NEXT_PHASE;
before(() => { process.env.NEXT_PHASE = 'phase-production-build'; });
after(() => { if (phase === undefined) delete process.env.NEXT_PHASE; else process.env.NEXT_PHASE = phase; });
const originals = new Map();
function stub(name) { const fn = () => null; fn.componentName = name; return fn; }
function compile(source, file, modules = new Map()) {
  const require = createRequire(new URL('../' + file, import.meta.url));
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  runInNewContext(code, { module, exports: module.exports, require: id => {
    if (modules.has(id)) return modules.get(id);
    if (id === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
    if (id.endsWith('/components/jevClassView') || id === './jevClassView') return { jevClassView };
    if (id.includes('/components/') || (file.startsWith('components/') && id.startsWith('./'))) return new Proxy({}, { get: (_, name) => stub(String(name)) });
    if (id.endsWith('/lib/seo')) return { seoTitle: value => value };
    if (id === 'next/navigation') return { notFound() { throw Error('notFound'); } };
    return require(id);
  } });
  return module.exports;
}
const parts = {
  JevModelsV14Board: ['board', 'v14-board'], JevBenchV15: ['board', 'v15-board'],
  JevCapabilityChart: ['capability', 'capability-chart'], JevCapabilityRanking: ['capability', 'capability-ranking'],
  JevBubbleCharts: ['bubbles', 'bubbles'], JevHistoricalSupplement: ['supplement', 'historical-supplement'], JevV170OldNewTable: ['board', 'old-new'],
};
async function widgets(node, result = {}) {
  if (!node || typeof node !== 'object') return result;
  const name = node.type?.componentName;
  if (name === 'JevBenchV15ReleasePage') {
    const module = compile(fixture.files['components/JevBenchV15ReleasePage.tsx'], 'components/JevBenchV15ReleasePage.tsx');
    await widgets(await module.JevBenchV15ReleasePage(node.props), result);
  } else if (parts[name]) {
    const [part, component] = parts[name]; result[part] = { component, props: node.props };
  }
  for (const child of [node.props?.children].flat(Infinity)) await widgets(child, result);
  return result;
}
for (const version of JEV_LEGACY_ARCHIVE_VERSIONS) {
  test(`${version}: static JSON preserves every original legacy board/chart prop`, async () => {
    const file = `app/jev-models/${version}/page.tsx`, oldPage = compile(fixture.files[file], file);
    const expected = await widgets(await oldPage.default());
    assert.ok(expected.board);
    const input = await readJevLegacyArchivePayload(version, process.cwd(), jevClassView);
    assert.deepEqual(normalize(input.widgets), normalize(expected));
    assert.deepEqual(normalize(input.props), normalize(expected.board.props));
    const response = await GET(new Request(`http://localhost/api/jevbench/${version}/board`), { params: Promise.resolve({ version }) });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(Object.hasOwn(data.widgets.board, 'props'), false, 'original board payload is not duplicated on the wire');
    assert.deepEqual({ ...data.widgets, board: { ...data.widgets.board, props: data.props } }, normalize(expected));
    assert.deepEqual(data.props, normalize(expected.board.props));
    originals.set(version, { props: expected.board.props, payload: data });
  });
}

test('legacy browser render graphs contain no Node built-ins or server-only modules', async () => {
  const pending = ['JevModelsV14', 'JevBenchV15View', 'JevV170OldNewTable', 'JevHistoricalSupplement'].map(name => new URL(`../components/${name}.tsx`, import.meta.url));
  const seen = new Set();
  while (pending.length) {
    const url = pending.pop(); if (seen.has(url.href)) continue; seen.add(url.href);
    const source = ts.createSourceFile(url.pathname, await readFile(url, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const item of source.statements.filter(ts.isImportDeclaration)) {
      if (item.importClause?.isTypeOnly) continue;
      const b = item.importClause?.namedBindings;
      if (b && ts.isNamedImports(b) && b.elements.length && b.elements.every(e => e.isTypeOnly) && !item.importClause.name) continue;
      const spec = item.moduleSpecifier.text;
      assert.ok(!spec.startsWith('node:') && spec !== 'server-only', `${url.pathname} imports ${spec}`);
      if (!spec.startsWith('.') || spec.endsWith('.json')) continue;
      let child;
      for (const suffix of ['', '.tsx', '.ts', '.mjs']) {
        const candidate = new URL(spec + suffix, url);
        try { if ((await stat(candidate)).isFile()) { child = candidate; break; } } catch {}
      }
      assert.ok(child, `resolved ${spec}`); pending.push(child);
    }
  }
});

async function realComponents(source) {
  const parsed = ts.createSourceFile('board.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result = new Map();
  for (const item of parsed.statements.filter(ts.isImportDeclaration)) {
    const spec = item.moduleSpecifier.text;
    if (!spec.startsWith('./') || item.importClause?.isTypeOnly) continue;
    if (spec === './JevBenchSeoBlocks') continue;
    let found;
    for (const suffix of ['.tsx', '.ts']) {
      const url = new URL('../components/' + spec.slice(2) + suffix, import.meta.url);
      try { await stat(url); found = url; break; } catch {}
    }
    assert.ok(found, `resolved original component ${spec}`);
    result.set(spec, await import(found));
  }
  return result;
}

test('legacy v1.4 and v1.5 full-board markup survives JSON transport unchanged', async () => {
  for (const [version, file, name, View] of [
    ['v1.4.2.2', 'components/JevModelsV14.tsx', 'JevModelsV14Board', JevModelsV14Board],
    ['v1.5.7', 'components/JevBenchV15Preview.tsx', 'JevBenchV15', JevBenchV15View],
  ]) {
    const source = fixture.files[file], components = await realComponents(source);
    let saved = originals.get(version);
    if (!saved) {
      const file = `app/jev-models/${version}/page.tsx`;
      const expected = await widgets(await compile(fixture.files[file], file).default());
      saved = { props: expected.board.props, payload: { render: { guides: [{ href: '/jev-models/methodology', label: 'Methodology' }] } } }; // Guide data has its own parity proof; isolated renderer checks need no live-board assembly.
    }
    const { props, payload } = saved;
    const Guides = () => React.createElement(JevBoardGuides, { links: payload.render?.guides ?? [] });
    components.set('./JevBenchSeoBlocks', { JevBoardIntentLinks: Guides });
    const Old = compile(source, file, components)[name];
    const actual = renderToStaticMarkup(React.createElement(View, { ...normalize(props), ...(version.startsWith('v1.5') ? { guides: React.createElement(Guides) } : {}) }));
    const expected = renderToStaticMarkup(React.createElement(Old, props));
    if (actual !== expected) {
      let at = 0; while (at < actual.length && actual[at] === expected[at]) at++;
      assert.fail(`${version}: markup differs at ${at}; actual=${JSON.stringify(actual.slice(Math.max(0, at - 120), at + 300))}; expected=${JSON.stringify(expected.slice(Math.max(0, at - 120), at + 300))}`);
    }
  }
});

test('legacy page headers, metadata, JsonLd, method and change sections remain byte-for-byte unchanged', async () => {
  for (const version of JEV_LEGACY_ARCHIVE_VERSIONS) {
    const file = `app/jev-models/${version}/page.tsx`;
    let source = await readFile(new URL('../' + file, import.meta.url), 'utf8');
    source = source.replace("import { JevBenchLegacyArchiveProvider } from '../../../components/JevBenchLegacyArchiveProvider';\nimport { JevBenchLegacyArchiveWidget } from '../../../components/JevBenchLegacyArchive';\n", '');
    source = source.replace(`<JevBenchLegacyArchiveProvider version="${version}" key="${version}">`, '').replace('</JevBenchLegacyArchiveProvider>', '');
    const names = version === 'v1.7.0' ? { board: 'JevV170OldNewTable' } : version.startsWith('v1.5.') ? { supplement: 'JevHistoricalSupplement' }
      : { board: 'JevModelsV14Board', capability: version === 'v1.4.2.2' ? 'JevCapabilityRanking' : 'JevCapabilityChart', bubbles: 'JevBubbleCharts' };
    for (const [part, name] of Object.entries(names)) source = source.replaceAll(`<JevBenchLegacyArchiveWidget version="${version}" part="${part}"`, `<${name}`);
    assert.equal(source, fixture.files[file], version);
  }
});

test('legacy guides retain the original server-generated links and labels', async () => {
  const old = compile(fixture.files['components/JevBenchSeoBlocks.tsx'], 'components/JevBenchSeoBlocks.tsx');
  const node = await old.JevBoardIntentLinks();
  const { readJevBoardGuideLinks } = await import('../lib/jevbench-guide-links.mjs');
  assert.deepEqual(normalize(await readJevBoardGuideLinks()), normalize(node.props.links));
});


test('v1.4.2.2 renders one default-order top-20 summary while preserving the method without JavaScript', async () => {
  const { JevBenchLegacyArchiveWidget } = await import('../components/JevBenchLegacyArchive.tsx');
  const { JevBenchLegacyArchiveProvider } = await import('../components/JevBenchLegacyArchiveProvider.tsx');
  const { JevCapabilityRanking } = await import('../components/JevCapabilityRanking.tsx');
  const version = 'v1.4.2.2';
  const input = await readJevLegacyArchivePayload(version, process.cwd(), jevClassView);
  const h = React.createElement;
  const summary = renderToStaticMarkup(h(JevBenchLegacyArchiveProvider, { version },
    Object.entries(input.widgets).map(([part, widget]) => h(JevBenchLegacyArchiveWidget, { ...widget.props, version, part, key: part }))));
  const fullRanking = renderToStaticMarkup(h(JevCapabilityRanking, input.widgets.capability.props));
  const keys = (html, marker) => [...html.matchAll(new RegExp(marker + '="([^" ]+)"', 'g'))].map(m => m[1]);
  assert.deepEqual(keys(summary, 'data-bh-jev-archive-row'), keys(fullRanking, 'data-bh-jev-capability-name').slice(0, 20));
  assert.equal(keys(summary, 'data-bh-jev-archive-row').length, 20);
  assert.ok(summary.includes('data-bh-jev14-changes'));
  assert.ok(summary.includes('/api/jevbench/v1.4.2.2/board'));
});

test('legacy summaries retain published estimate, release and carry disclosures', async () => {
  const { JevBenchLegacyArchiveWidget } = await import('../components/JevBenchLegacyArchive.tsx');
  const { JevBenchLegacyArchiveProvider } = await import('../components/JevBenchLegacyArchiveProvider.tsx');
  const { JEV_REMEASURE_PENDING_LABEL } = await import('../lib/jev-decision-limit.mjs');
  const { V170_FIXTURE_SYSTEMS: systems, V170_FIXTURE_CARRY: carryRows, V170_FIXTURE_CARRY_LABEL: carryLabel } = await import('./fixtures/jev-v170-fixture.mjs');
  const h = React.createElement;
  const summary = (version, props) => renderToStaticMarkup(h(JevBenchLegacyArchiveProvider, { version }, h(JevBenchLegacyArchiveWidget, { version, ...props })));
  const payload = await readJevLegacyArchivePayload('v1.4.2.2', process.cwd(), jevClassView);
  const html = summary('v1.4.2.2', { part: 'capability', ...payload.widgets.capability.props });
  let estimates = 0;
  for (const row of html.matchAll(/<tr[^>]+data-bh-jev-archive-row="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g)) {
    const source = payload.widgets.capability.props.systems.find(s => s.key === row[1]);
    assert.ok(source);
    if (source.cost?.kind === 'estimate' && source.cost.usd_per_1000 != null) {
      estimates++;
      assert.ok(row[2].includes('est. '), row[1] + ': published estimate stays marked');
    } else assert.ok(!row[2].includes('est. '), row[1] + ': no invented estimate label');
  }
  assert.ok(estimates > 0);
  const initial = await readJevLegacyArchivePayload('v1.4', process.cwd(), jevClassView);
  assert.ok(summary('v1.4', initial.props).includes('Release ' + initial.props.artifact.revision));
  const oldNew = summary('v1.7.0', { systems, carryRows, carryLabel });
  assert.ok(oldNew.includes(JEV_REMEASURE_PENDING_LABEL));
  assert.ok(oldNew.includes(carryLabel));
});
