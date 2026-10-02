import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readJevbenchV155Release } from '../lib/jevbench-v15-release.mjs';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';

const require = createRequire(import.meta.url);
const moduleUrl = (source) => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const componentFile = fileURLToPath(new URL('../components/JevV15AllDataGrid.tsx', import.meta.url));

async function importComponent(file, aliases) {
  let code = ts.transpileModule(await readFile(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  code = code.replace(/\bfrom\s*(["'])([^"']+)\1/g, (_, quote, specifier) => {
    const target = aliases[specifier] ?? (specifier.startsWith('.') ? new URL(specifier, pathToFileURL(file)).href : 'file://' + require.resolve(specifier));
    return 'from ' + quote + target + quote;
  });
  return import(moduleUrl(code));
}

const { artifact } = await readJevbenchV155Release();
const allRows = [...artifact.systems, ...artifact.not_measured];
const allKeys = allRows.map((system) => system.key);
const categoryView = jevbenchCategoryView(artifact.revision, allKeys);
const reactPath = JSON.stringify(pathToFileURL(require.resolve('react')).href);
const linkStub = moduleUrl('import React from ' + reactPath + '; export default function Link(props){return React.createElement("a",props,props.children)}');
const filterStub = moduleUrl('export function useJevV15Filters(){return {rows:[],visibleKeys:new Set(' + JSON.stringify(allKeys) + '),visible:' + allKeys.length + ',total:' + allKeys.length + ',active:false}}');
const component = await importComponent(componentFile, {
  'next/link': linkStub,
  './jevSystemLinks': moduleUrl('export const jevSourceUrl=()=>null'),
  './JevV15Filters': filterStub,
});

test('CR-269: the all-data table is absent from the rendered DOM while its disclosure is closed', () => {
  const html = renderToStaticMarkup(React.createElement(component.JevV15AllDataGrid, {
    artifact, categoryView, previousKeys: [], eligibility: null, metadata: null, links: null,
  }));
  assert.match(html, /data-bh-jev15-all-data-summary/);
  assert.match(html, /All data \(115 systems\)/);
  assert.doesNotMatch(html, /data-bh-jev15-all-data-table/);
  assert.doesNotMatch(html, /data-bh-jev15-all-data-controls/);
});
