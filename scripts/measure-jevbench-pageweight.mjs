// Run from the repo root. Transpile the actual before/after Board and count its direct client-boundary data props.
// Children are separate RSC nodes, so the filter provider's children are excluded, avoiding double counting.
import { register, createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { serialize } from 'node:v8';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { readJevbenchV1713ForBoard, v1713BoardInput } from '../lib/jevbench-v1713-release.mjs';
import { withPublicAdapterIds } from '../lib/jevbench-v15-release.mjs';
import { jevV16ChartRow } from '../lib/jevbench-v15-board.mjs';
register('../test/tsx-loader-hooks.mjs', import.meta.url);
const { jevClassView } = await import('../components/jevClassView.ts');
const file = new URL('../components/JevBenchV16Board.tsx', import.meta.url);
const require = createRequire(file);
const clients = ['JevBenchV16Charts', 'JevScoreChart', 'JevCompareV15', 'JevV15FilterProvider', 'JevV15AllDataGrid', 'JevContextLazy', 'JevGpuCostCalculator', 'JevApiOfferingsToggle', 'JevV15FilterPanel', 'JevV15FilterVisibilityBridge'];
function compile(source) {
  const code = ts.transpileModule(source, { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  runInNewContext(code, { module, exports: module.exports, require: (id) => {
    if (id === './jevClassView') return { jevClassView };
    if (id.startsWith('./')) return new Proxy({}, { get: (_, name) => { const fn = () => null; fn.boundary = String(name); return fn; } });
    return require(id);
  } });
  return module.exports.JevBenchV16Board;
}
function measure(tree, result = {}, entries = []) {
  if (!tree || typeof tree !== 'object') return result;
  const name = tree.type?.boundary;
  if (clients.includes(name)) {
    const { children, ...props } = tree.props;
    entries.push([name, props]);
    result[name] = (result[name] ?? 0) + Buffer.byteLength(JSON.stringify(props));
  }
  for (const child of [tree.props?.children].flat(Infinity)) measure(child, result, entries);
  return result;
}
const release = await readJevbenchV1713ForBoard();
const board = v1713BoardInput(release);
const props = { artifact: withPublicAdapterIds(board.artifact), sha256: release.sha256, categories: board.categories,
  categoriesSha256: release.categoriesSha256, carry: { ...release.carry, rows: [] }, carrySha256: release.carrySha256,
  previousKeys: release.artifact.systems.filter((s) => s.remeasured_in !== 'v1.7.13' && s.new_in !== 'v1.7.13').map((s) => s.key), scope: 'all' };
// Pin the baseline explicitly; rerunnable after the change is committed.
const beforeSource = execFileSync('git', ['show', '452ec0cab14fa2f4f29c9f533358673ad2b1de5a:components/JevBenchV16Board.tsx'], { encoding: 'utf8' });
const beforeEntries = [], afterEntries = [];
const before = measure(compile(beforeSource)(props), {}, beforeEntries);
const after = measure(compile(await readFile(file, 'utf8'))(props), {}, afterEntries);
const flightBytes = (entries) => Number(execFileSync(process.execPath, ['--conditions=react-server', fileURLToPath(new URL('./measure-jevbench-flight.mjs', import.meta.url))], { input: serialize(entries), env: { ...process.env, NODE_ENV: 'production' }, encoding: 'utf8' }));
const total = (values) => Object.values(values).reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ revision: 'v1.7.13', systems: props.artifact.systems.length, before, after, totalBefore: total(before), totalAfter: total(after), flightBefore: flightBytes(beforeEntries), flightAfter: flightBytes(afterEntries), chartFields: Object.keys(jevV16ChartRow(props.artifact.systems[0])) }, null, 2));
