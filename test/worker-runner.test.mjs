import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Synthetic HTTP responses exercise the real CLI without network calls or credentials.
const mock = `
import { createRequire, syncBuiltinESMExports } from 'node:module';
const require = createRequire(import.meta.url), fs = require('node:fs/promises'), originalRead = fs.readFile;
fs.readFile = async (path, ...rest) => String(path).endsWith('/data/dataset.json')
  ? JSON.stringify({models:[{id:'fixture-model',family_key:'fixture-family',aa_model_id:'fixture-aa',aa_metadata:{openrouter_api_id:'deepseek/deepseek-v4-flash-0731'},benchmarks:{aa_intelligence_index:34.5}}]})
  : originalRead(path, ...rest);
syncBuiltinESMExports();
globalThis.fetch = async (url, options) => {
  if (String(url).endsWith('/models')) return Response.json({data:[{
    id:'deepseek/deepseek-v4-flash-0731', supported_parameters:['response_format','structured_outputs'], pricing:{prompt:'0.000000065',completion:'0.00000018'}, reasoning:{supported_efforts:['low','high']}
  }]});
  const request = JSON.parse(options.body);
  if (process.env.BH_WORKER_REASONING_EFFORT && request.reasoning?.effort !== process.env.BH_WORKER_REASONING_EFFORT) throw new Error('Requested supported effort missing');
  if (process.env.WORKER_CASE === 'schema' && (request.response_format?.type !== 'json_schema' || request.response_format?.json_schema?.strict !== true || request.provider?.require_parameters !== true || request.provider?.max_price?.completion !== 4 || request.provider?.sort !== 'price')) throw new Error('Structured output/provider price controls missing');
  if (process.env.WORKER_CASE === 'timeout') return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(Response.json({})), 4000);
    options.signal.addEventListener('abort', () => {clearTimeout(timer); reject(new Error('mock timeout'));});
  });
  if (process.env.WORKER_CASE === 'large' && request.messages[1].content.length < 160000) throw new Error('Reference file not embedded');
  return Response.json({model:process.env.WORKER_CASE === 'wrong' ? 'other/model' : request.model,
    choices:[{finish_reason:process.env.WORKER_CASE === 'length' ? 'length' : 'stop',
    message:{content:process.env.WORKER_CASE === 'empty' ? '' : process.env.WORKER_CASE === 'json' ? JSON.stringify({value:'synthetic'}) : process.env.WORKER_CASE === 'bad_json' ? '{' : 'accepted test artifact'}}]});
};
`;

test('worker CLI preserves output on provider failures and accepts a large embedded packet', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-worker-test-'));
  try {
    const hook = join(dir, 'mock.mjs'), out = join(dir, 'artifact.txt'), packet = join(dir, 'packet.md');
    await writeFile(hook, mock);
    await writeFile(packet, 'synthetic reference\n'.repeat(9000));
    const args = ['--import', hook, 'ops/rebuild-2026-09/bin/worker-runner.mjs', '--model', 'deepseek/deepseek-v4-flash-0731', '--timeout', '1', '--file', packet, '--out', out, 'Read the supplied synthetic reference.'];
    for (const scenario of ['empty', 'length', 'wrong', 'timeout']) {
      await writeFile(out, 'prior valid artifact');
      await writeFile(out + '.meta.json', 'prior receipt');
      const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 10000, env: {...process.env, BH_STATE: dir, OPEN_ROUTER_API_KEY: 'synthetic-test-key', WORKER_CASE: scenario} });
      assert.equal(result.status, 1, `${scenario}: ${result.stderr}`);
      assert.match(result.stderr, /WORKER_ERROR/);
      assert.equal(await readFile(out, 'utf8'), 'prior valid artifact');
      assert.equal(await readFile(out + '.meta.json', 'utf8'), 'prior receipt');
    }
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 10000, env: {...process.env, BH_STATE: dir, OPEN_ROUTER_API_KEY: 'synthetic-test-key', WORKER_CASE: 'large', BH_WORKER_REASONING_EFFORT: 'low'} });
    assert.equal(result.status, 0, result.stderr);
    const body = await readFile(out, 'utf8'), meta = JSON.parse(await readFile(out + '.meta.json', 'utf8'));
    assert.equal(body, 'accepted test artifact\n');
    assert.equal(meta.actual_model, 'deepseek/deepseek-v4-flash-0731');
    assert.deepEqual(meta.reasoning, { effort: 'low', exclude: true });
    assert.equal(meta.output_sha256, createHash('sha256').update(body).digest('hex'));
    assert.equal((await readFile(join(dir, 'last-worker-model'), 'utf8')).trim(), meta.actual_model);
    const schema = join(dir, 'schema.json');
    await writeFile(schema, JSON.stringify({ type: 'object', properties: { value: { type: 'string' } }, required: ['value'], additionalProperties: false }));
    const structured = spawnSync(process.execPath, [...args.slice(0, -1), '--schema', schema, args.at(-1)], { encoding: 'utf8', timeout: 10000, env: { ...process.env, BH_STATE: dir, OPEN_ROUTER_API_KEY: 'synthetic-test-key', WORKER_CASE: 'schema', BH_WORKER_MAX_PRICE_PER_1M: '4' } });
    assert.equal(structured.status, 0, structured.stderr);
    assert.match(JSON.parse(await readFile(out + '.meta.json', 'utf8')).response_schema_sha256, /^[a-f0-9]{64}$/);
    for (const scenario of ['json', 'bad_json']) {
      await writeFile(out, 'prior valid output');
      const checked = spawnSync(process.execPath, [...args.slice(0, -1), '--json', args.at(-1)], { encoding: 'utf8', timeout: 10000, env: { ...process.env, BH_STATE: dir, OPEN_ROUTER_API_KEY: 'synthetic-test-key', WORKER_CASE: scenario } });
      assert.equal(checked.status, scenario === 'json' ? 0 : 1, checked.stderr);
      if (scenario === 'json') {
        assert.deepEqual(JSON.parse(await readFile(out, 'utf8')), { value: 'synthetic' });
        assert.equal(JSON.parse(await readFile(out + '.meta.json', 'utf8')).response_format_mode, 'json_object');
      } else assert.equal(await readFile(out, 'utf8'), 'prior valid output');
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('transport smoke cannot accept arbitrary data work or a reference file', () => {
  for (const args of [['--smoke-test', 'Do arbitrary work'], ['--smoke-test', '--file', 'package.json']]) {
    const result = spawnSync(process.execPath, ['ops/rebuild-2026-09/bin/worker-runner.mjs', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /no custom task or reference file/);
  }
});
