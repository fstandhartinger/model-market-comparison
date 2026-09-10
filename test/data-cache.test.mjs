import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(readFileSync('lib/data.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

test('DB-backed requests opt out of prerender even on an in-process dataset cache hit', async () => {
  let dynamicCalls = 0, dbCalls = 0;
  const db = { models: [{ id: 'runtime-db-model' }] };
  const exports = {};
  // Isolate external DB and Next request-context boundary, execute real data.ts.
  const deps = (id) => id === 'next/cache' ? { unstable_noStore: () => dynamicCalls++ }
    : id === './db' ? { loadFromDb: async () => { dbCalls++; return db; } }
    : id === '../data/dataset.json' ? { models: [] } : require(id);
  new Function('require', 'exports', compiled)(deps, exports);
  const before = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://test-not-connected';
  try {
    assert.equal(await exports.getDataset(), db);
    assert.equal(await exports.getDataset(), db);
    assert.equal(dbCalls, 1, 'existing five-minute DB cache is retained');
    assert.equal(dynamicCalls, 2, 'every DB request must opt out before the cache hit');
  } finally {
    if (before === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = before;
  }
});

test('DB load preserves additive dataset metadata and rejects old seeds without efficiency or benchmark results', async () => {
  const compiledDb = ts.transpileModule(readFileSync('lib/db.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const extensions = { benchmark_results: { schema_version: 1, observations: [] }, efficiency: { schema_version: 1, global_io_ratio: { value: 21 } }, source_status: { retained: true }, build_diagnostics: { count: 1 } };
  const metadata = { generated_at: '2026-09-10', counts: {}, sources: {}, providers: [], extensions };
  const deps = (id) => id === 'pg' ? { Pool: class {
    async query(sql) { return { rows: sql.includes('dataset_meta') ? [metadata] : [{ data: { id: 'exact', offers_scope: 'model', token_efficiency: { available: true } } }] }; }
  } } : require(id);
  const exports = {};
  new Function('require', 'exports', compiledDb)(deps, exports);
  const before = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://test-not-connected';
  try {
    const dataset = await exports.loadFromDb();
    assert.deepEqual(dataset.efficiency, extensions.efficiency);
    assert.deepEqual(dataset.benchmark_results, extensions.benchmark_results);
    assert.deepEqual(dataset.source_status, extensions.source_status);
    assert.equal(dataset.models[0].token_efficiency.available, true);
    assert.equal(dataset.models[0].offers_scope, undefined);
    metadata.extensions = { efficiency: extensions.efficiency };
    assert.equal(await exports.loadFromDb(), null);
    metadata.extensions = {};
    assert.equal(await exports.loadFromDb(), null);
  } finally {
    if (before === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = before;
  }
});
