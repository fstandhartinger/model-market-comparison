import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { readJevAllDataInput } from '../lib/jevbench-alldata-input.mjs';
// Execute the actual live page's server wrapper and capture its Board element, without rendering the UI.
const file = new URL('../components/JevBenchV16ReleaseRoute.tsx', import.meta.url);
const require = createRequire(file);
const code = ts.transpileModule(await readFile(file, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const module = { exports: {} };
const Board = () => null;
runInNewContext(code, { module, exports: module.exports, process, require: (id) => {
  if (id === './JevBenchV16Board') return { JevBenchV16Board: Board, JEV_BOARD_REVISIONS: [{ date: '2026-10-28' }] };
  if (id.startsWith('./')) return new Proxy({}, { get: () => () => null });
  return require(id);
} });
function findBoard(tree) {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.type === Board) return tree.props;
  return [tree.props?.children].flat(Infinity).map(findBoard).find(Boolean) ?? null;
}
for (const scope of ['open', 'api', 'all']) test(`board-${scope}: endpoint uses the exact live page artifact, categories and previous roster`, async () => {
  const page = findBoard(await module.exports.JevBenchV16ReleaseRoute({ live: true, scope }));
  assert.ok(page);
  const input = await readJevAllDataInput(`board-${scope}`);
  assert.deepEqual(input.artifact, page.artifact);
  assert.deepEqual(input.categories, page.categories);
  // VM-created arrays have another realm's prototype.
  assert.deepEqual(input.previousKeys, Array.from(page.previousKeys));
  assert.equal(input.live, true);
});
