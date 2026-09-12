import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, cp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { assertIdentityCoverage, assertApprovedIdentityCoverage, assertOpenRouterEndpointCoverage, assertMeasuredFields, captureLiveSource, endpointIdentityDigest, identityDigest } from '../lib/live-source.mjs';

test('catalog shrink, empty, malformed and duplicate identities fail before publication', () => {
  const previous = [{ id: 'one' }, { id: 'two' }];
  for (const rows of [[], null, [{ id: 'one' }], [{ id: 'one' }, { id: 'one' }], [{ id: 'one' }, {}]]) assert.throws(() => assertIdentityCoverage(previous, rows, (m) => m.id, 'fixture'));
  assert.doesNotThrow(() => assertIdentityCoverage(previous, [...previous, { id: 'three' }], (m) => m.id, 'fixture'));
});

test('catalog withdrawal requires an unexpired review bound to both complete identity sets', () => {
  const previous = [{ id: 'one' }, { id: 'two' }, { id: 'retired' }];
  const current = [{ id: 'one' }, { id: 'two' }, { id: 'new' }];
  const approval = { expires_at: '2026-01-02T00:00:00Z', previous_identity_sha256: identityDigest(previous, (r) => r.id), current_identity_sha256: identityDigest(current, (r) => r.id), removed: ['retired'] };
  assert.doesNotThrow(() => assertApprovedIdentityCoverage(previous, current, (r) => r.id, 'fixture', { approval, now: Date.parse('2026-01-01') }));
  assert.throws(() => assertApprovedIdentityCoverage(previous, current, (r) => r.id, 'fixture', { approval, now: Date.parse('2026-01-03') }));
  assert.throws(() => assertApprovedIdentityCoverage(previous, [{ id: 'one' }, { id: 'two' }], (r) => r.id, 'fixture', { approval, now: Date.parse('2026-01-01') }));
});

test('explicit empty endpoints permitted only without prior known providers', () => {
  const e = { provider_name: 'Synthetic', tag: 'synthetic/default', pricing: { prompt: '0.000001', completion: '0' } };
  assert.doesNotThrow(() => assertOpenRouterEndpointCoverage([], []));
  assert.doesNotThrow(() => assertOpenRouterEndpointCoverage([e], [e, { ...e }]));
  assert.throws(() => assertOpenRouterEndpointCoverage([e], []));
  assert.throws(() => assertOpenRouterEndpointCoverage([], undefined));
  assert.throws(() => assertOpenRouterEndpointCoverage([], [{ ...e, pricing: { prompt: null, completion: '0' } }]));
  assert.throws(() => assertOpenRouterEndpointCoverage([], [{ ...e, tag: '' }]));
});

test('reviewed withdrawal exception expires and binds both complete endpoint identity sets', () => {
  const one = { provider_name: 'One', tag: 'one', pricing: { prompt: '1', completion: '1' } };
  const two = { ...one, provider_name: 'Two', tag: 'two' };
  const three = { ...one, provider_name: 'Three', tag: 'three' };
  const previous = [one, two, three], current = [one, two];
  const approval = { expires_at: '2026-01-02', previous_identity_sha256: endpointIdentityDigest(previous), current_identity_sha256: endpointIdentityDigest(current), removed: ['Three/three/'] };
  assert.doesNotThrow(() => assertOpenRouterEndpointCoverage(previous, current, { approval, now: Date.parse('2026-01-01') }));
  assert.throws(() => assertOpenRouterEndpointCoverage(previous, current, { approval, now: Date.parse('2026-01-03') }));
  assert.throws(() => assertOpenRouterEndpointCoverage(previous, [one], { approval, now: Date.parse('2026-01-01') }));
  assert.throws(() => assertOpenRouterEndpointCoverage(previous, [one, { ...two, pricing: null }], { approval, now: Date.parse('2026-01-01') }));
});

test('source evidence retains exact primary response bytes without transport credentials', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bh-live-source-'));
  try {
    const body = '{"data":[{"id":"synthetic","score":0}]}';
    const receipt = await captureLiveSource('https://example.test/fixture', body, { directory });
    assert.equal(gunzipSync(await readFile(receipt.file)).toString(), body);
    const manifest = JSON.parse((await readFile(join(directory, 'live-manifest.jsonl'), 'utf8')).trim());
    assert.equal(manifest.sha256, receipt.sha256);
    assert.equal(manifest.status, 200);
    assert.equal(manifest.headers, undefined);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('lost numeric fields are not confused with published zero or already unknown values', () => {
  assert.throws(() => assertMeasuredFields({ score: 34 }, { score: null }, ['score'], 'synthetic'));
  assert.throws(() => assertMeasuredFields({}, { score: '34' }, ['score'], 'synthetic'));
  assert.doesNotThrow(() => assertMeasuredFields({ score: 34 }, { score: 0 }, ['score'], 'synthetic'));
  assert.doesNotThrow(() => assertMeasuredFields({ score: null }, {}, ['score'], 'synthetic'));
});

test('actual OpenRouter collector exits nonzero and leaves good file untouched on a partial endpoint response', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bh-partial-collector-'));
  try {
    await cp('lib', join(directory, 'lib'), { recursive: true });
    await mkdir(join(directory, 'scripts'));
    for (const file of ['fetch-live.mjs', 'fetch-aa-efficiency.mjs']) await cp(join('scripts', file), join(directory, 'scripts', file));
    await mkdir(join(directory, 'data/raw'), { recursive: true });
    const target = join(directory, 'data/raw/openrouter.json');
    const old = JSON.stringify({ collected_at: '2026-01-01', models: [{ id: 'fixture/model', endpoints: [{ provider_name: 'Synthetic', tag: 'fixture', pricing: { prompt: '0', completion: '0' } }] }] });
    await writeFile(target, old);
    const hook = join(directory, 'synthetic-fetch.mjs');
    for (const endpointResponse of ["Response.json({data:{}})", "Response.json({error:{message:'fixture absent'}},{status:404})"]) {
      await writeFile(hook, `globalThis.fetch=async (url)=>String(url).endsWith('/endpoints') ? ${endpointResponse} : Response.json({data:[{id:'fixture/model'}]});`);
      const result = spawnSync(process.execPath, ['--import', hook, join(directory, 'scripts/fetch-live.mjs'), 'or'], { cwd: directory, encoding: 'utf8', timeout: 10000 });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /endpoints: invalid response|HTTP 404/);
      assert.equal(await readFile(target, 'utf8'), old);
    }
    // A restricted host may finish already dispatched calls but must not
    // schedule the rest of this 25-model catalog or retry a challenge.
    for (const response of ["new Response('restricted',{status:429})", "new Response('<html><title>Just a moment</title></html>',{status:200})"]) {
      const countFile = join(directory, 'request-count.txt');
      await writeFile(hook, `import {writeFileSync} from 'node:fs'; let calls=0; globalThis.fetch=async(url)=>{if(!String(url).endsWith('/endpoints'))return Response.json({data:[{id:'fixture/model'},...Array.from({length:24},(_,i)=>({id:'fixture/other-'+i}))]});writeFileSync(${JSON.stringify(countFile)},String(++calls));return calls===1?${response}:Response.json({data:{endpoints:[]}});};`);
      const result = spawnSync(process.execPath, ['--import', hook, join(directory, 'scripts/fetch-live.mjs'), 'or'], { cwd: directory, encoding: 'utf8', timeout: 10000 });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /stopped after access restriction/);
      assert.ok(Number(await readFile(countFile, 'utf8')) <= 10, 'no new requests after the host is stopped');
      assert.equal(await readFile(target, 'utf8'), old);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
