import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { buildAllDataModel } from '../lib/jevbench-all-data-grid.mjs';
import { readJevAllDataInput } from '../lib/jevbench-alldata-input.mjs';

test('cold route serves the release cells and correct notes in under two seconds', async () => {
  // Transpile the actual route and props modules while injecting their real dependencies.
  const req = createRequire(import.meta.url);
  const compile = async (file, replacements) => {
    const src = await readFile(file, 'utf8');
    const code = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const mod = { exports: {} };
    runInNewContext(code, { module: mod, exports: mod.exports, Response, require: id => replacements[id] ?? req(id) });
    return mod.exports;
  };
  const modules = {};
  for (const name of ['jevbench-alldata-input', 'jevbench-categories', 'jevbench-api-full-addenda', 'jev-base-model', 'jevbench-v15-board', 'jevbench-jev-class']) modules[`./${name}.mjs`] = await import(`../lib/${name}.mjs`);
  const types = await compile('components/jevTypes.ts', { '../lib/jevbench-architecture.mjs': await import('../lib/jevbench-architecture.mjs') });
  // The chart's shortName is presentation-only; keep the real class calculation.
  modules['../components/jevClassView'] = await compile('components/jevClassView.ts', {
    './jevTypes': types, './JevCapabilityChart': { shortName: value => value.split(', formerly')[0].split(' (')[0] },
    '../lib/jevbench-jev-class.mjs': modules['./jevbench-jev-class.mjs'],
    '../lib/jev-latency.mjs': await import('../lib/jev-latency.mjs'),
  });
  const props = await compile('lib/jevbench-alldata-props.ts', modules);
  const route = await compile('app/api/jevbench-alldata/[version]/route.ts', { '../../../../lib/jevbench-alldata-props': props });
  const start = performance.now();
  const response = await route.GET(null, { params: Promise.resolve({ version: 'v1.8.10' }) });
  const elapsed = performance.now() - start;
  assert.equal(response.status, 200);
  assert.ok(elapsed < 2000, `cold route: ${elapsed.toFixed(1)} ms`);
  const payload = await response.json();
  const categories = JSON.parse(await readFile('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.10-categories.json', 'utf8'));
  assert.equal(payload.categoryView.revision, 'v1.8.10');
  let cells = 0;
  for (const [key, dims] of Object.entries(payload.categoryView.systems)) for (const [dim, values] of Object.entries(dims)) for (const [name, value] of Object.entries(values)) {
    const expected = categories.systems[key]?.[dim]?.[name];
    assert.ok(expected, `${key}.${dim}.${name}`);
    assert.deepEqual(value, [expected.competence, expected.n, ...(Number.isInteger(expected.coverage_n) ? [expected.coverage_n] : [])]);
    cells++;
  }
  for (const key of [...payload.artifact.systems, ...payload.artifact.not_measured].map(row => row.key)) {
    for (const dim of ['topics', 'usecases']) {
      assert.deepEqual(Object.keys(payload.categoryView.systems[key]?.[dim] ?? {}).sort(), Object.keys(categories.systems[key]?.[dim] ?? {}).sort(), `${key}.${dim} coverage`);
    }
  }
  const model = buildAllDataModel({ artifact: payload.artifact, categoryView: payload.categoryView });
  const withCells = key => ['topics', 'usecases'].some(dim => Object.keys(categories.systems[key]?.[dim] ?? {}).length);
  const wrongNotes = model.rows.filter(row => withCells(row.key) && row.values.categoryNote === 'No per-category values are published for this system.');
  assert.equal(wrongNotes.length, 0);
  assert.ok(cells > 0);
  console.log(`cold route ${elapsed.toFixed(1)} ms; ${cells} values; 0 outside artifact; 0 wrong notes`);
});

test('missing publication still returns not found', async () => {
  assert.equal(await readJevAllDataInput('v1.8.10', '/nonexistent'), null);
});

test('a changed or unpublished manifest cannot use the snapshot', async () => {
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = await mkdtemp(join(tmpdir(), 'v1810-alldata-'));
  try {
    const dir = join(root, 'data/raw/benchmarks/jevbench/v1.8');
    await mkdir(dir, { recursive: true });
    await mkdir(join(root, 'data'), { recursive: true });
    const manifest = join(dir, 'jevbench-v1.8.10-publication.json');
    await writeFile(manifest, JSON.stringify({ review: { verdict: 'PENDING' } }));
    assert.equal(await readJevAllDataInput('v1.8.10', root), null);
    await writeFile(manifest, JSON.stringify({ review: { verdict: 'PASS' } }));
    await writeFile(join(root, 'data/jevbench-v1.8.10-alldata.json'), JSON.stringify({ manifestSha256: 'wrong' }));
    await assert.rejects(readJevAllDataInput('v1.8.10', root), /manifest mismatch/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
