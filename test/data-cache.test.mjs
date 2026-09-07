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
