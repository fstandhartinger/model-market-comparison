// Exercise the real component handlers with a small hook host; no browser or additional dependencies.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const source = await readFile(new URL('../components/JevV15AllDataGrid.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const flush = () => new Promise(setImmediate);
function host(fetch) {
  let cursor = 0;
  const cells = [];
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial; return [cells[i], (value) => { cells[i] = typeof value === 'function' ? value(cells[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return cells[i] ??= { current: initial }; },
  };
  const module = { exports: {} };
  runInNewContext(code, { module, exports: module.exports, fetch, require: (id) => id === 'react' ? hooks : id === 'react/jsx-runtime' ? require(id)
    : id === './JevV15Filters' ? { useJevV15Filters: () => ({ total: 3 }) } : {} });
  return () => { cursor = 0; return module.exports.JevV15AllDataGrid({ version: 'v1.7.13', revision: 'v1.7.13' }); };
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  return [node.props?.children].flat(Infinity).map((child) => find(child, predicate)).find(Boolean) ?? null;
}
const toggle = (tree, open) => tree.props.onToggle({ currentTarget: { open } });

test('no request while collapsed; first open loads once and reopening retains the table', async () => {
  let calls = 0, resolve;
  const render = host((url, options) => {
    calls++;
    assert.equal(url, '/api/jevbench-alldata/v1.7.13');
    assert.equal(options.headers.Accept, 'application/json');
    return new Promise((done) => { resolve = done; });
  });
  toggle(render(), false);
  assert.equal(calls, 0);
  toggle(render(), true);
  assert.equal(calls, 1);
  assert.ok(find(render(), (n) => n.props?.role === 'status'));
  toggle(render(), true);
  assert.equal(calls, 1, 'in-flight opens are deduplicated');
  const payload = { artifact: { revision: 'v1.7.13' }, categoryView: null, previousKeys: [], eligibility: null, metadata: null, links: null };
  resolve({ ok: true, json: async () => payload });
  await flush();
  assert.ok(find(render(), (n) => n.props?.artifact === payload.artifact));
  assert.equal(find(render(), (n) => n.props?.role === 'status'), null);
  toggle(render(), false); toggle(render(), true);
  assert.equal(calls, 1);
});

for (const failure of ['HTTP', 'network', 'JSON']) test(`${failure} failure leaves the disclosure and retry button usable`, async () => {
  let calls = 0;
  const render = host(async () => {
    if (++calls > 1) return { ok: true, json: async () => ({ artifact: { revision: 'v1.7.13' } }) };
    if (failure === 'network') throw new Error('offline');
    return { ok: failure !== 'HTTP', status: 503, json: async () => { throw new Error('invalid JSON'); } };
  });
  toggle(render(), true);
  await flush();
  assert.ok(find(render(), (n) => n.props?.role === 'alert'));
  const button = find(render(), (n) => n.type === 'button');
  button.props.onClick();
  await flush();
  assert.equal(calls, 2);
  assert.equal(find(render(), (n) => n.props?.role === 'alert'), null);
  assert.ok(find(render(), (n) => n.props?.artifact));
});

test('every archive using the shared board has an explicit on-demand release loader', async () => {
  const { readdir } = await import('node:fs/promises');
  const pages = new URL('../app/jev-models/', import.meta.url);
  const loader = await readFile(new URL('../lib/jevbench-alldata-input.mjs', import.meta.url), 'utf8');
  for (const entry of await readdir(pages, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^v\d+\.\d+\.\d+$/.test(entry.name)) continue;
    const page = await readFile(new URL(`${entry.name}/page.tsx`, pages), 'utf8');
    if (page.includes('<JevBenchV16Board')) assert.ok(loader.includes(`'${entry.name}':`), `${entry.name} needs an all-data loader`);
  }
});
