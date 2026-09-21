import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// 2026-09-21: a stalled openrouter.ai catalog request killed every gauntlet round of a daily run at the 30 s abort,
// before a model was chosen. The catalog is retried on transport errors/5xx and shared through a run-scoped copy.
const mock = `
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url), fs = require('node:fs/promises'), originalRead = fs.readFile;
fs.readFile = async (path, ...rest) => String(path).endsWith('/data/dataset.json')
  ? JSON.stringify({models:[{id:'fixture-model',family_key:'fixture-family',aa_model_id:'fixture-aa',aa_metadata:{openrouter_api_id:'deepseek/deepseek-v4-flash-0731'},benchmarks:{aa_intelligence_index:34.5}}]})
  : originalRead(path, ...rest);
syncBuiltinESMExports();
globalThis.fetch = async (url, options) => {
  if (String(url).endsWith('/models')) {
    const counter = process.env.CATALOG_COUNT_FILE, calls = Number(readFileSync(counter, 'utf8')) + 1;
    writeFileSync(counter, String(calls));
    if (options.headers?.['User-Agent'] !== 'benchmarkheaven/1.0 (+https://benchmarkheaven.com)') throw new Error('catalog request lacks the user agent');
    const mode = process.env.CATALOG_CASE;
    if (mode === 'down') throw new TypeError('fetch failed');
    if (mode === 'flaky' && calls === 1) throw new TypeError('fetch failed');
    if (mode === 'forbidden') return new Response('no', { status: 403 });
    return Response.json({data:[{ id:'deepseek/deepseek-v4-flash-0731', supported_parameters:['response_format','structured_outputs'], pricing:{prompt:'0.000000065',completion:'0.00000018'} }]});
  }
  const request = JSON.parse(options.body);
  return Response.json({ model: request.model, choices: [{ finish_reason: 'stop', message: { content: 'accepted test artifact' } }] });
};
`;

test('worker catalog: one transport failure is retried, the run copy is reused, a 4xx is final', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-worker-catalog-'));
  try {
    const hook = join(dir, 'mock.mjs'), out = join(dir, 'artifact.txt'), counter = join(dir, 'calls'), cache = join(dir, 'openrouter-catalog.json');
    await writeFile(hook, mock);
    const run = (catalogCase, extra = {}) => {
      return spawnSync(process.execPath, ['--import', hook, 'ops/rebuild-2026-09/bin/worker-runner.mjs', '--model', 'deepseek/deepseek-v4-flash-0731', '--timeout', '5', '--out', out, 'Say something.'],
        { encoding: 'utf8', timeout: 30_000, env: { ...process.env, BH_STATE: dir, BH_WORKER_CATALOG_CACHE: '', OPEN_ROUTER_API_KEY: 'synthetic-test-key', CATALOG_COUNT_FILE: counter, CATALOG_CASE: catalogCase, ...extra } });
    };
    const calls = async () => Number(await readFile(counter, 'utf8'));

    await writeFile(counter, '0');
    const flaky = run('flaky', { BH_WORKER_CATALOG_CACHE: cache });
    assert.equal(flaky.status, 0, flaky.stderr);
    assert.equal(await calls(), 2);
    const receipt = JSON.parse(await readFile(`${out}.meta.json`, 'utf8'));
    assert.equal(receipt.catalog.source, 'fetched');
    const copy = JSON.parse(await readFile(cache, 'utf8'));
    assert.equal(copy.fetched_at, receipt.catalog.fetched_at);
    assert.equal(copy.data[0].id, 'deepseek/deepseek-v4-flash-0731');

    // The same run's next worker never touches the network for the catalog, even while openrouter.ai is down.
    await writeFile(counter, '0');
    const reused = run('down', { BH_WORKER_CATALOG_CACHE: cache });
    assert.equal(reused.status, 0, reused.stderr);
    assert.equal(await calls(), 0);
    assert.deepEqual(JSON.parse(await readFile(`${out}.meta.json`, 'utf8')).catalog, { source: 'run-cache', fetched_at: copy.fetched_at });

    // A copy older than six hours is not trusted: the worker fetches again (and here fails after three tries).
    await writeFile(cache, JSON.stringify({ ...copy, fetched_at: new Date(Date.now() - 7 * 3_600_000).toISOString() }));
    await writeFile(counter, '0');
    const stale = run('down', { BH_WORKER_CATALOG_CACHE: cache });
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /WORKER_ERROR: fetch failed/);
    assert.equal(await calls(), 3);

    // Without a run copy nothing is cached, and an HTTP answer such as 403 is never retried.
    await writeFile(counter, '0');
    const forbidden = run('forbidden');
    assert.equal(forbidden.status, 1);
    assert.match(forbidden.stderr, /WORKER_ERROR: Catalog HTTP 403/);
    assert.equal(await calls(), 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
