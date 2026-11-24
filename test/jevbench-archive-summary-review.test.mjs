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
import { JEV_LEGACY_ARCHIVE_VERSIONS, readJevLegacyArchivePayload } from '../lib/jevbench-archive-legacy-input.mjs';
import { jevV16BoardRows } from '../lib/jevbench-board-rows.mjs';
import { jevV16ChartRow, jevV15BoardSystem } from '../lib/jevbench-v15-board.mjs';
import { JEV_V16_CLASS_OPTIONS, JEV_V16_REFERENCE_LABEL } from '../lib/jevbench-jev-class.mjs';
register('./jevbench-archive-loader-hooks.mjs', import.meta.url);
const { JevBenchArchiveBoard } = await import('../components/JevBenchArchiveBoard.tsx');
const { JevCapabilityRanking } = await import('../components/JevCapabilityRanking.tsx');
const { JevBenchLegacyArchiveWidget } = await import('../components/JevBenchLegacyArchive.tsx');
const { JevBenchLegacyArchiveProvider } = await import('../components/JevBenchLegacyArchiveProvider.tsx');
const { jevClassView } = await import('../components/jevClassView.ts');
const { JevModelsV14Board } = await import('../components/JevModelsV14.tsx');
const { JevV170OldNewTable } = await import('../components/JevV170OldNewTable.tsx');
const { jevV15ArchiveChartData } = await import('../components/JevBenchV15View.tsx');
const { usd } = await import('../components/JevCapabilityChart.tsx');
const h = React.createElement;
const render = (Component, props) => renderToStaticMarkup(h(Component, props));
const phase = process.env.NEXT_PHASE;
before(() => { process.env.NEXT_PHASE = 'phase-production-build'; });
after(() => { if (phase === undefined) delete process.env.NEXT_PHASE; else process.env.NEXT_PHASE = phase; });
const summaryRows = html => [...html.matchAll(/<tr[^>]+data-bh-jev-archive-row="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g)];
const boardRows = html => new Map([...html.matchAll(/<li[^>]+data-bh-jev14-capability-row="([^"]+)"[^>]*>([\s\S]*?)<\/li>/g)].map(m => [m[1], m[2]]));
const summaryNotes = html => [...html.matchAll(/<span class="bh-muted block text-xs">([\s\S]*?)<\/span>/g)].map(m => m[1]);
const boardNotes = html => [...html.matchAll(/<span[^>]+data-bh-jev-capability-note[^>]*>([\s\S]*?)<\/span>/g)].map(m => m[1]);
const rankCell = html => html.match(/^<td[^>]*>(.*?)<\/td>/)?.[1];
function checkCapabilityRows(summary, full, systems, version) {
  const fullRows = boardRows(full);
  const rows = summaryRows(summary);
  assert.equal(rows.length, Math.min(20, fullRows.size), version + ': top 20 or every available row');
  assert.deepEqual(rows.map(r => r[1]), [...fullRows.keys()].slice(0, 20), version + ': default board order');
  for (const [, key, body] of rows) {
    const actual = fullRows.get(key);
    assert.ok(actual, version + ': ' + key + ' exists on the board');
    assert.deepEqual(summaryNotes(body), boardNotes(actual), version + ': exact board note for ' + key);
    assert.equal(rankCell(body), actual.match(/^<span[^>]*>(.*?)<\/span>/)?.[1], version + ': board rank including outside dash for ' + key);
    const source = systems.find(s => s.key === key);
    const cost = source.cost?.usd_per_1000;
    const expected = cost == null ? '—' : usd(cost);
    const cell = [...body.matchAll(/<td[^>]*>(.*?)<\/td>/g)].at(-1)[1];
    assert.equal(cell, (source.cost?.kind === 'estimate' ? 'est. ' : '') + expected, version + ': board cost precision for ' + key);
    assert.ok(actual.includes('>' + expected + (source.cost?.kind === 'estimate' ? '*' : '') + '</span>'), version + ': full board cost for ' + key);
  }
  return rows.length;
}

test('all modern archive summaries use their board count, exact notes, cost precision and outside rank', async () => {
  let checked = 0;
  for (const version of JEV_ARCHIVE_BOARD_VERSIONS) {
    const props = await readJevArchiveBoardProps(version);
    const systems = jevV16BoardRows(props.artifact, props.scope).map(jevV16ChartRow);
    const full = render(JevCapabilityRanking, { systems, revision: version, officialHref: '#jev16-method', ...JEV_V16_CLASS_OPTIONS, nearCapPrecision: true, referenceLabel: JEV_V16_REFERENCE_LABEL });
    const summary = render(JevBenchArchiveBoard, { version, ...props });
    assert.match(summary, new RegExp('>' + systems.length + ' measured rows'));
    assert.equal(systems.length, boardRows(full).size, version + ': header equals board N of N systems');
    checked += checkCapabilityRows(summary, full, systems, version);
  }
  assert.equal(JEV_ARCHIVE_BOARD_VERSIONS.length >= 86, true);
  console.info(`Modern summary notes/count/ranks/costs: ${JEV_ARCHIVE_BOARD_VERSIONS.length} versions, ${checked} rows`);
});

test('all 14 legacy summaries retain exact capability notes and all four announced-price labels', async () => {
  let checked = 0, announced = 0;
  for (const version of JEV_LEGACY_ARCHIVE_VERSIONS) {
    const payload = await readJevLegacyArchivePayload(version, process.cwd(), jevClassView);
    const part = version === 'v1.4.2.2' ? 'capability' : 'board';
    const props = payload.widgets[part].props;
    const summary = renderToStaticMarkup(h(JevBenchLegacyArchiveProvider, { version }, h(JevBenchLegacyArchiveWidget, { version, part, ...props })));
    if (version.startsWith('v1.5.') || part === 'capability') {
      const systems = props.artifact ? jevV15ArchiveChartData(props.artifact).map(jevV15BoardSystem) : props.systems;
      const full = render(JevCapabilityRanking, { systems, revision: version, officialHref: '#jev14-chart-title' });
      checked += checkCapabilityRows(summary, full, systems, version);
    } else {
      const full = render(version === 'v1.7.0' ? JevV170OldNewTable : JevModelsV14Board, props);
      const publishedRows = new Map([...full.matchAll(version === 'v1.7.0'
        ? /<tr[^>]+data-bh-jev-v170-row="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g
        : /<li[^>]+data-bh-jev14-bar="([^"]+)"[^>]*>([\s\S]*?)<\/li>/g)].map(m => [m[1], m[2]]));
      for (const [, key, body] of summaryRows(summary)) {
        checked++;
        const publishedRow = publishedRows.get(key);
        assert.ok(publishedRow, version + ': legacy summary row exists on its board: ' + key);
        if (version === 'v1.7.0') {
          for (const note of summaryNotes(body)) assert.ok(publishedRow.includes(note), version + ': published legacy note for the same row: ' + key);
        } else assert.deepEqual(summaryNotes(body), boardNotes(publishedRow), version + ': exact board note for ' + key);
        if (version !== 'v1.7.0') {
          const source = props.artifact.systems.find(s => s.key === key);
          const hasAnnounced = source.cost?.kind === 'announced';
          assert.equal(body.includes('ann. '), hasAnnounced, version + ': announced price for ' + key);
          if (hasAnnounced) {
            announced++;
            assert.ok(full.includes(`data-bh-jev14-ann="${key}">ann.</span>`));
          }
        }
      }
    }
  }
  assert.equal(announced, 4);
  console.info(`Legacy summary notes/prices: ${JEV_LEGACY_ARCHIVE_VERSIONS.length} versions, ${checked} rows, ${announced} announced rows`);
});

test('server archive rejects an artifact from a different version', async () => {
  const props = await readJevArchiveBoardProps('v1.8.20');
  assert.throws(() => JevBenchArchiveBoard({ ...props, version: 'v1.8.21' }), /Archive v1\.8\.21 received artifact v1\.8\.20/);
});

test('live Capability ranking renders byte-identically before and after note extraction on v1.8.20', async () => {
  const file = 'components/JevCapabilityRanking.tsx';
  // Frozen 2746b840 source keeps this oracle independent of git history and the extracted note helpers.
  const source = await readFile(new URL('./fixtures/jevbench-capability-ranking-baseline.txt', import.meta.url), 'utf8');
  assert.equal(createHash('sha256').update(source).digest('hex'), '6779ef023c85353f52c9bbafcbcd7b1e72bf59ce78b79d644e3ade71f8a44f67');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const modules = new Map();
  for (const stmt of ast.statements.filter(ts.isImportDeclaration)) {
    if (stmt.importClause?.isTypeOnly) continue;
    const spec = stmt.moduleSpecifier.text;
    if (!spec.startsWith('.')) continue;
    let url = new URL('../components/' + spec, import.meta.url);
    if (!/\.(mjs|tsx?)$/.test(spec)) {
      const { existsSync } = await import('node:fs');
      url = ['.tsx', '.ts'].map(ext => new URL(url.href + ext)).find(candidate => existsSync(candidate));
    }
    modules.set(spec, await import(url));
  }
  const require = createRequire(new URL('../' + file, import.meta.url));
  const module = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(code, { module, exports: module.exports, require: id => modules.get(id) ?? require(id) });
  const OriginalRanking = module.exports.JevCapabilityRanking;
  const props = await readJevArchiveBoardProps('v1.8.20');
  const systems = jevV16BoardRows(props.artifact, props.scope).map(jevV16ChartRow);
  const input = { systems, revision: 'board', officialHref: '#jev16-method', ...JEV_V16_CLASS_OPTIONS, nearCapPrecision: true, referenceLabel: JEV_V16_REFERENCE_LABEL };
  const actual = render(JevCapabilityRanking, input), expected = render(OriginalRanking, input);
  assert.ok(actual === expected, 'live ranking markup is byte-identical');
  console.info(`Live ranking equality: ${Buffer.byteLength(actual)} bytes, sha256 ${createHash('sha256').update(actual).digest('hex')}`);
});
