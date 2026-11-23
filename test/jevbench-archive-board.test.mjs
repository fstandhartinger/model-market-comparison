import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire, register } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JEV_ARCHIVE_BOARD_VERSIONS, readJevArchiveBoardProps } from '../lib/jevbench-archive-board-input.mjs';
import { jevArchiveComparisonCategories } from '../lib/jevbench-archive-board-view.mjs';
register('./jevbench-archive-loader-hooks.mjs', import.meta.url);
const { GET, generateStaticParams, dynamic, dynamicParams } = await import('../app/api/jevbench/[version]/board/route.ts');
const { JevBenchArchiveBoard } = await import('../components/JevBenchArchiveBoard.tsx');
const { JevBenchV16Board, JevBenchV16ArchiveMethod, JEV_BOARD_REVISIONS } = await import('../components/JevBenchV16Board.tsx');
const BASE = 'd5e8e19ab914bf9120b572d55601a2c24c921ea7';
// These endpoints are force-static: exercise the actual production-build path against the immutable committed snapshot.
// Each cold cache still validates the complete predecessor chain. Dedicated release/fixture tests retain uncached mode.
const previousPhase = process.env.NEXT_PHASE;
before(() => { process.env.NEXT_PHASE = 'phase-production-build'; });
after(() => { if (previousPhase === undefined) delete process.env.NEXT_PHASE; else process.env.NEXT_PHASE = previousPhase; });
const normalize = value => JSON.parse(JSON.stringify(value));
const baselineBytes = await readFile(new URL('./fixtures/jevbench-archive-baseline.json', import.meta.url));
const baseline = JSON.parse(baselineBytes);
assert.equal(baseline.revision, BASE);
assert.equal(createHash('sha256').update(baselineBytes).digest('hex'), '5daac2fa29f9680bf5352ab74256c734513274207dc9d3f01e0c1d6bf622d7ab');

function compile(source, file, componentModules = null) {
  const require = createRequire(new URL('../' + file, import.meta.url));
  const code = ts.transpileModule(source, { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  runInNewContext(code, { module, exports: module.exports, require: id => {
    if (componentModules?.has(id)) return componentModules.get(id);
    if (id === './JevBenchV16Board') return { JevBenchV16Board: Object.assign(() => null, { componentName: 'JevBenchV16Board' }), JEV_BOARD_REVISIONS };
    if (id.includes('/components/') || (file === 'components/JevBenchV16ReleaseRoute.tsx' && id.startsWith('./'))) return new Proxy({}, { get: (_, name) => {
      const fn = () => null; fn.componentName = String(name); return fn;
    } });
    if (id === 'next/navigation') return { notFound() { throw Error('notFound'); } };
    if (id.endsWith('/lib/seo')) return { seoTitle: value => value };
    return require(id);
  } });
  return module.exports;
}
function findBoard(node, componentName = 'JevBenchV16Board') {
  if (!node || typeof node !== 'object') return null;
  if (node.type?.componentName === componentName) return node.props;
  for (const child of [node.props?.children].flat(Infinity)) {
    const result = findBoard(child, componentName); if (result) return result;
  }
  return null;
}
const legacyProps = new Map();
for (const version of JEV_ARCHIVE_BOARD_VERSIONS) {
  test(`${version}: static JSON exactly preserves every original board prop and comparison category`, async () => {
    const file = `app/jev-models/${version}/page.tsx`;
    const source = baseline.files[file];
    const tree = await compile(source, file).default();
    let old = findBoard(tree);
    if (!old) {
      const routeProps = findBoard(tree, 'JevBenchV16ReleaseRoute');
      assert.ok(routeProps, 'found original release route');
      const route = compile(baseline.files['components/JevBenchV16ReleaseRoute.tsx'], 'components/JevBenchV16ReleaseRoute.tsx');
      old = findBoard(await route.JevBenchV16ReleaseRoute(routeProps));
    }
    assert.ok(old, 'found original board');
    const props = await readJevArchiveBoardProps(version);
    assert.deepEqual(normalize(props), normalize(old));
    const response = await GET(new Request(`http://localhost/api/jevbench/${version}/board`), { params: Promise.resolve({ version }) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'public, max-age=3600');
    const json = await response.json();
    assert.deepEqual(json.props, normalize(old));
    assert.deepEqual(json.comparisonCategories, normalize(jevArchiveComparisonCategories(old)));
    const page = await readFile(new URL('../' + file, import.meta.url), 'utf8');
    assert.equal(page.replaceAll('JevBenchArchiveBoard', 'JevBenchV16Board').replace('components/JevBenchV16Board', 'components/JevBenchV16Board').replace(` version="${version}"`, ''), source, 'only wrapper import/name and version changed');
    legacyProps.set(version, old);
  });
}

test('static route publishes only the explicit archive allowlist', async () => {
  assert.equal(JEV_ARCHIVE_BOARD_VERSIONS.length, 86);
  assert.equal(dynamic, 'force-static'); assert.equal(dynamicParams, false);
  assert.deepEqual(generateStaticParams(), JEV_ARCHIVE_BOARD_VERSIONS.map(version => ({ version })));
  for (const version of ['board-open', '../v1.8.20', 'constructor', 'v9.9.9']) {
    assert.equal(await readJevArchiveBoardProps(version), null);
    assert.equal((await GET(new Request('http://localhost'), { params: Promise.resolve({ version }) })).status, 404);
  }
});

test('summary is useful without JavaScript and its loader receives only a version', async () => {
  const props = await readJevArchiveBoardProps('v1.8.20');
  const node = JevBenchArchiveBoard({ version: 'v1.8.20', ...props });
  const loader = node.props.children.at(-2);
  assert.deepEqual(loader.props, { version: 'v1.8.20' });
  const html = renderToStaticMarkup(node);
  assert.equal((html.match(/data-bh-jev-archive-row=/g) ?? []).length, 20);
  assert.ok(Buffer.byteLength(html) < 300_000);
  for (const text of ['Capability Score', 'Composite', 'Cost / 1,000 decisions', props.sha256, 'Load full board', '2026-11-22', 'data-bh-jev16-method', '/api/jevbench/v1.8.20/board']) assert.ok(html.includes(text));
});

test('client renderer preserves original full-board markup across the three release families', async () => {
  const file = 'components/JevBenchV16Board.tsx';
  const source = baseline.files[file];
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const modules = new Map();
  for (const stmt of parsed.statements.filter(ts.isImportDeclaration)) {
    const spec = stmt.moduleSpecifier.text;
    if (spec.startsWith('./') && !stmt.importClause?.isTypeOnly) {
      try { modules.set(spec, await import(new URL('../components/' + spec.slice(2) + '.tsx', import.meta.url))); }
      catch (e) { if (spec !== './jevClassView') throw e; modules.set(spec, await import('../components/jevClassView.ts')); }
    }
  }
  const OldBoard = compile(source, file, modules).JevBenchV16Board;
  for (const version of ['v1.6.30', 'v1.7.13', 'v1.8.20']) {
    const props = legacyProps.get(version) ?? await readJevArchiveBoardProps(version);
    const transported = normalize(props);
    const categories = normalize(jevArchiveComparisonCategories(props));
    assert.equal(renderToStaticMarkup(React.createElement(JevBenchV16Board, { ...transported, comparisonCategories: categories })),
      renderToStaticMarkup(React.createElement(OldBoard, props)), `${version}: full markup including disclosures and child data`);
  }
});

test('full-board browser module graph contains no Node built-ins or server-only modules', async () => {
  const { stat } = await import('node:fs/promises');
  const pending = [new URL('../components/JevBenchV16Board.tsx', import.meta.url)];
  const seen = new Set();
  while (pending.length) {
    const url = pending.pop();
    if (seen.has(url.href)) continue;
    seen.add(url.href);
    const source = await readFile(url, 'utf8');
    const file = ts.createSourceFile(url.pathname, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const stmt of file.statements.filter(ts.isImportDeclaration)) {
      if (stmt.importClause?.isTypeOnly) continue;
      const bindings = stmt.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings) && bindings.elements.length && bindings.elements.every(e => e.isTypeOnly) && !stmt.importClause.name) continue;
      const spec = stmt.moduleSpecifier.text;
      assert.ok(!spec.startsWith('node:') && spec !== 'server-only', `${url.pathname} imports ${spec}`);
      if (!spec.startsWith('.') || spec.endsWith('.json')) continue;
      let child;
      for (const suffix of ['', '.tsx', '.ts', '.mjs']) {
        const candidate = new URL(spec + suffix, url);
        try { if ((await stat(candidate)).isFile()) { child = candidate; break; } } catch {}
      }
      assert.ok(child, `resolved ${spec} from ${url.pathname}`);
      pending.push(child);
    }
  }
  assert.ok(seen.size > 20, 'traversed the full render graph');
});

test('server method exactly replaces the method suppressed after client loading', async () => {
  const props = await readJevArchiveBoardProps('v1.6.30');
  const comparisonCategories = normalize(jevArchiveComparisonCategories(props));
  const transported = { ...normalize(props), comparisonCategories };
  const complete = renderToStaticMarkup(React.createElement(JevBenchV16Board, transported));
  const lazyBoard = renderToStaticMarkup(React.createElement(JevBenchV16Board, { ...transported, hideMethod: true }));
  const serverMethod = renderToStaticMarkup(React.createElement(JevBenchV16ArchiveMethod, props));
  assert.ok(complete.includes(serverMethod));
  assert.equal(complete.replace(serverMethod, ''), lazyBoard);
});
