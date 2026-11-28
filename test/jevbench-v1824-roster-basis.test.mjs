import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { jevApiRoster } from '../lib/jevbench-scope.mjs';

const D = 'data/raw/benchmarks/jevbench/v1.8/';
const load = (rev, kind) => JSON.parse(readFileSync(`${D}jevbench-${rev}-${kind}.json`));
const NEW = ['alibaba-decision-model-sg', 'urun-sense'];
const NOTE = 'Measured on a 600-item supplementary set (300 sealed and 300 public items). This set has no equated reference yet, so Intelligence, Calibration and the composite score are not shown and the row is not ranked.';
const BASIS = 'Supplementary set of 600 items: 300 sealed and 300 public (API lane; not equated)';

// Compile the real roster component and its helpers in isolation (latency cells stubbed), as the v1.7.10 links test does.
const src = readFileSync('components/JevBenchV16Board.tsx', 'utf8');
const ast = ts.createSourceFile('board.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
// `one`/`usd` are local helpers on some bases and imported from lib/jevbench-board-format.mjs on others (archive-board change): take them from the source when local, inject otherwise.
const declared = name => ast.statements.some(n => n.name?.text === name || n.declarationList?.declarations.some(d => d.name.text === name));
const injected = ['one', 'usd'].filter(name => !declared(name));
const names = new Set([...['one', 'usd'].filter(declared), 'rosterCapability', 'ENDPOINT_TAG', 'supplementaryBasis', 'basisLine', 'costCell', 'rosterStatus', 'ApiRoster']);
const parts = ast.statements.filter(n => names.has(n.name?.text) || n.declarationList?.declarations.some(d => names.has(d.name.text))).map(n => n.getText(ast));
const code = ts.transpileModule(parts.join('\n'), { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
// lib/jevbench-board-format.mjs exists only on bases that carry the archive-board change.
const format = await import('../lib/jevbench-board-format.mjs').catch(() => ({}));
const helpers = { one: format.one, usd: format.usd };
const ApiRoster = new Function('React', 'jevApiRoster', 'JevLatencyValue', 'JevLatencyLegend', 'NOT_RANKED', 'PUBLIC_SET', ...injected, code + '\nreturn ApiRoster;')(React, jevApiRoster, () => null, () => null, {}, new Map(), ...injected.map(name => helpers[name]));

const render = rev => {
  const a = load(rev, 'results'), carry = load(rev, 'carry');
  const html = renderToStaticMarkup(React.createElement(ApiRoster, { a: { ...a, systems: a.systems.filter(s => s.api_flag || s.endpoint_kind === 'api') }, carry: { rows: carry.rows ?? [] }, listed: [], eligibility: new Map() }));
  return new Map([...html.matchAll(/<tr[^>]*>.*?<\/tr>/g)].map(m => [m[0].match(/data-bh-jev-api-roster-row="([^"]+)"/)?.[1], m[0]]).filter(([k]) => k));
};

test('v1.8.24 API roster states the supplementary basis and the approved reason for the two new rows', () => {
  assert.equal(parts.length, names.size);
  const rows = render('v1.8.24');
  for (const key of NEW) {
    const row = rows.get(key);
    assert.ok(row, `${key} is on the roster`);
    assert.match(row, new RegExp(BASIS.replace(/[()]/g, '\\$&')));
    assert.ok(row.includes(NOTE), 'approved not-ranked sentence shown verbatim');
    assert.doesNotMatch(row, /full set/);
    assert.doesNotMatch(row, /1,500/);
    assert.doesNotMatch(row, /Composite #/);
  }
});

test('v1.8.24 roster rows of every carried API offering render exactly as on v1.8.23', () => {
  const now = render('v1.8.24'), before = render('v1.8.23');
  assert.equal(before.size, now.size - NEW.length);
  for (const [key, row] of before) assert.equal(now.get(key), row, `carried roster row ${key} unchanged`);
  // The full-set wording is still what carried full-set rows say, so the fix is not a blanket rewrite.
  assert.ok([...before.values()].some(row => row.includes('full set (1,500 items)')));
});
