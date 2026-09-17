import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, cp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { assertIdentityCoverage, assertApprovedIdentityCoverage, assertOpenRouterEndpointCoverage, assertMeasuredFields, captureLiveSource, endpointIdentityDigest, identityDigest, planOpenRouterWithdrawals, selectOpenRouterEndpointApproval } from '../lib/live-source.mjs';

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

test('catalog approval names every withdrawal: an approved retirement cannot mask another loss', () => {
  const previous = [{ id: 'keep' }, { id: 'google/gemini-2.5-pro-preview-05-06' }, { id: 'openai/gpt-4-turbo-preview' }];
  const current = [{ id: 'keep' }, { id: '~deepseek/deepseek-flash-latest' }];
  const id = (r) => r.id, now = Date.parse('2026-09-15T12:00:00Z');
  const approval = { expires_at: '2026-09-16T05:00:00Z', previous_identity_sha256: identityDigest(previous, id), current_identity_sha256: identityDigest(current, id), removed: ['openai/gpt-4-turbo-preview', 'google/gemini-2.5-pro-preview-05-06'] };
  assert.doesNotThrow(() => assertApprovedIdentityCoverage(previous, current, id, 'fixture', { approval, now }));
  assert.throws(() => assertApprovedIdentityCoverage(previous, current, id, 'fixture', { approval: { ...approval, removed: ['openai/gpt-4-turbo-preview'] }, now }), /1 prior identities absent|2 prior identities absent/);
  assert.throws(() => assertApprovedIdentityCoverage(previous, current, id, 'fixture', { approval: { ...approval, removed: [...approval.removed, 'keep'] }, now }));
  assert.throws(() => assertApprovedIdentityCoverage(previous, current.slice(1), id, 'fixture', { approval, now }), /partial response or removal/);
  // Once the retirement is the accepted snapshot, a later unexpected loss fails closed.
  assert.throws(() => assertApprovedIdentityCoverage(current, [{ id: 'keep' }], id, 'fixture', { approval, now }), /~deepseek\/deepseek-flash-latest/);
});

test('committed collection-wide approvals are exact, bounded and evidenced', async () => {
  const approvals = JSON.parse(await readFile(new URL('../data/raw/source-change-approvals.json', import.meta.url), 'utf8'));
  for (const a of [approvals.aa_models, approvals.openrouter_catalog].filter(Boolean)) {
    for (const key of ['previous_identity_sha256', 'current_identity_sha256']) assert.match(a[key], /^[0-9a-f]{64}$/);
    assert.ok(Array.isArray(a.removed) && a.removed.length && new Set(a.removed).size === a.removed.length);
    assert.ok(Date.parse(a.expires_at) > Date.parse(a.reviewed_at) && Date.parse(a.expires_at) - Date.parse(a.reviewed_at) <= 3 * 86400000);
    assert.ok(a.primary_url && a.review_basis && a.owner_acceptance);
  }
});

test('committed 2026-09-15 endpoint approvals replay against their captured primary responses and nothing else', async () => {
  const dir = new URL('../ops/daily-repair-2026-09-15/endpoints/', import.meta.url);
  const reviewBytes = await readFile(new URL('endpoint-withdrawal-review.json', dir));
  const review = JSON.parse(reviewBytes);
  const approvals = JSON.parse(await readFile(new URL('../data/raw/source-change-approvals.json', import.meta.url), 'utf8')).openrouter_endpoints
    .filter((a) => a.review_file === 'ops/daily-repair-2026-09-15/endpoints/endpoint-withdrawal-review.json');
  assert.equal(approvals.length, review.withdrawals.length);
  // Provider names contain no slash; tags may (`io-net/fp8`), quantization is the last segment.
  const row = (id) => { const a = id.indexOf('/'), b = id.lastIndexOf('/'); return { provider_name: id.slice(0, a), tag: id.slice(a + 1, b), quantization: id.slice(b + 1) || null }; };
  for (const a of approvals) {
    assert.equal(a.review_sha256, createHash('sha256').update(reviewBytes).digest('hex'));
    const w = review.withdrawals.find((x) => x.model_id === a.model_id);
    assert.ok(w && w.repeats_identical_digest && w.removed.length === 1);
    assert.deepEqual(a.removed, w.removed);
    assert.ok(Date.parse(a.expires_at) - Date.parse(a.reviewed_at) <= 3 * 86400000);
    const current = JSON.parse(gunzipSync(await readFile(new URL(`evidence/${w.primary_sha256}.gz`, dir)))).data.endpoints;
    const previous = w.prior_identities.map(row);
    const now = Date.parse(a.reviewed_at);
    assert.equal(endpointIdentityDigest(previous), a.previous_identity_sha256);
    assert.equal(selectOpenRouterEndpointApproval(approvals, a.model_id, current, { now }), a);
    assert.equal(selectOpenRouterEndpointApproval(approvals.filter((x) => x !== a), a.model_id, current, { now }), undefined);
    assert.doesNotThrow(() => assertOpenRouterEndpointCoverage(previous, current, { approval: a, now }));
    assert.throws(() => assertOpenRouterEndpointCoverage(previous, current, { now }), /1 prior identities absent/);
    assert.throws(() => assertOpenRouterEndpointCoverage(previous, current, { approval: a, now: Date.parse(a.expires_at) }));
    // A second, unreviewed loss changes the current digest and cannot inherit the approval.
    const kept = current.find((e) => !w.added_not_replacements.includes(`${e.provider_name}/${e.tag}/${e.quantization ?? ''}`));
    const shrunk = current.filter((e) => e.provider_name !== kept.provider_name || e.tag !== kept.tag || e.quantization !== kept.quantization);
    assert.equal(selectOpenRouterEndpointApproval(approvals, a.model_id, shrunk, { now }), undefined);
    assert.throws(() => assertOpenRouterEndpointCoverage(previous, shrunk, { approval: a, now }), /partial response or removal/);
  }
});

test('a same-provider quantization change is a withdrawal plus an addition, never a silent replacement', () => {
  const fp8 = { provider_name: 'DeepInfra', tag: 'deepinfra/fp8', quantization: 'fp8', pricing: { prompt: '1', completion: '1' } };
  const fp4 = { ...fp8, tag: 'deepinfra/fp4', quantization: 'fp4' };
  const other = { ...fp8, provider_name: 'Other', tag: 'other', quantization: null };
  assert.throws(() => assertOpenRouterEndpointCoverage([fp8, other], [fp4, other]), /DeepInfra\/deepinfra\/fp8\/fp8/);
  const approval = { expires_at: '2026-09-16T05:00:00Z', previous_identity_sha256: endpointIdentityDigest([fp8, other]), current_identity_sha256: endpointIdentityDigest([fp4, other]), removed: ['DeepInfra/deepinfra/fp8/fp8'] };
  assert.doesNotThrow(() => assertOpenRouterEndpointCoverage([fp8, other], [fp4, other], { approval, now: Date.parse('2026-09-15T12:00:00Z') }));
  // Removing only the addition's identity from the approval does not cover the fp8 loss.
  assert.throws(() => assertOpenRouterEndpointCoverage([fp8, other], [fp4, other], { approval: { ...approval, removed: ['DeepInfra/deepinfra/fp4/fp4'] }, now: Date.parse('2026-09-15T12:00:00Z') }));
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

test('endpoint approval selection ignores older approvals for the same model', () => {
  const one = { provider_name: 'One', tag: 'one', pricing: { prompt: '1', completion: '1' } };
  const two = { ...one, provider_name: 'Two', tag: 'two' };
  const current = [one, two];
  const currentDigest = endpointIdentityDigest(current);
  const old = { model_id: 'fixture/model', current_identity_sha256: endpointIdentityDigest([one]), expires_at: '2026-01-01T00:00:00Z' };
  const fresh = { model_id: 'fixture/model', current_identity_sha256: currentDigest, expires_at: '2026-01-03T00:00:00Z' };
  assert.equal(selectOpenRouterEndpointApproval([old, fresh], 'fixture/model', current, { now: Date.parse('2026-01-02T00:00:00Z') }), fresh);
  assert.equal(selectOpenRouterEndpointApproval([old, { ...fresh, expires_at: '2026-01-01T00:00:00Z' }], 'fixture/model', current, { now: Date.parse('2026-01-02T00:00:00Z') }), undefined);
  assert.equal(selectOpenRouterEndpointApproval([old], 'fixture/model', current), undefined);
  assert.equal(selectOpenRouterEndpointApproval([fresh], 'other/model', current), undefined);
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
      const result = spawnSync(process.execPath, ['--import', hook, join(directory, 'scripts/fetch-live.mjs'), 'or'], { cwd: directory, encoding: 'utf8', timeout: 10000, env: { ...process.env, BH_OR_WITHDRAWAL_RECHECK_MS: '0' } });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /endpoints: invalid response|1 of 1 prior endpoints absent/);
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

// CR-66.1: fixture of the real failure mode (11-17 Sep): OpenRouter retires a few ids or endpoints every day.
const orFixture = (n, perModel = 3) => Array.from({ length: n }, (_, i) => ({ id: `lab/model-${i}`, name: `Model ${i}`,
  endpoints: Array.from({ length: perModel }, (_, j) => ({ provider_name: `P${j}`, tag: `p${j}`, quantization: 'fp8', pricing: { prompt: '0.000001', completion: '0.000002' } })) }));
const endpointsOf = (models) => new Map(models.map((m) => [m.id, m.endpoints]));

test('CR-66.1: bounded OpenRouter removals become dated withdrawals, large ones fail', () => {
  const prior = orFixture(100);
  const previous = { collected_at: '2026-09-16', models: prior };
  const models = prior.slice(5).map((m, i) => (i < 2 ? { ...m, endpoints: m.endpoints.slice(1) } : m));
  const plan = planOpenRouterWithdrawals({ previous, models, endpointsById: endpointsOf(models), date: '2026-09-17' });
  assert.equal(plan.error, null);
  assert.deepEqual(plan.run.withdrawn_models.map((m) => [m.id, m.withdrawn_at, m.last_seen]), [0, 1, 2, 3, 4].map((i) => [`lab/model-${i}`, '2026-09-17', '2026-09-16']));
  assert.deepEqual(plan.run.withdrawn_endpoints.map((e) => [e.model_id, e.identity, e.withdrawn_at]), [['lab/model-5', 'P0/p0/fp8', '2026-09-17'], ['lab/model-6', 'P0/p0/fp8', '2026-09-17']]);
  assert.equal(plan.withdrawals.models.length, 5);
  assert.equal(plan.withdrawals.endpoints.length, 2);

  const shrunk = prior.slice(60);
  assert.match(planOpenRouterWithdrawals({ previous, models: shrunk, endpointsById: endpointsOf(shrunk), date: '2026-09-17' }).error, /60 models absent \(limit 10\)/);
  const stripped = prior.map((m, i) => (i < 20 ? { ...m, endpoints: [] } : m)); // 60 of 300 endpoints = 20 % > 5 %
  assert.match(planOpenRouterWithdrawals({ previous, models: stripped, endpointsById: endpointsOf(stripped), date: '2026-09-17' }).error, /60 of 300 prior endpoints absent \(limit 15\)/);

  // Next day: one withdrawn model and one withdrawn endpoint return; the rest keep their first withdrawal date.
  const next = { collected_at: '2026-09-17', models, withdrawals: plan.withdrawals };
  const back = [prior[0], ...models.map((m) => (m.id === 'lab/model-5' ? prior[5] : m))];
  const later = planOpenRouterWithdrawals({ previous: next, models: back, endpointsById: endpointsOf(back), date: '2026-09-18' });
  assert.equal(later.error, null);
  assert.deepEqual(later.run.restored_models.map((m) => [m.id, m.withdrawn_at]), [['lab/model-0', '2026-09-17']]);
  assert.deepEqual(later.run.restored_endpoints.map((e) => [e.model_id, e.identity]), [['lab/model-5', 'P0/p0/fp8']]);
  assert.deepEqual(later.withdrawals.models.map((m) => [m.id, m.withdrawn_at]), [1, 2, 3, 4].map((i) => [`lab/model-${i}`, '2026-09-17']));
  assert.deepEqual(later.withdrawals.endpoints.map((e) => e.model_id), ['lab/model-6']);
  assert.equal(later.run.withdrawn_models.length + later.run.withdrawn_endpoints.length, 0, 'carried withdrawals do not count against the next run');
});

test('CR-66.1: the actual collector re-checks, publishes bounded withdrawals and still fails a large removal', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bh-withdrawal-collector-'));
  try {
    await cp('lib', join(directory, 'lib'), { recursive: true });
    await mkdir(join(directory, 'scripts'));
    for (const file of ['fetch-live.mjs', 'fetch-aa-efficiency.mjs']) await cp(join('scripts', file), join(directory, 'scripts', file));
    await mkdir(join(directory, 'data/raw'), { recursive: true });
    const target = join(directory, 'data/raw/openrouter.json');
    const prior = orFixture(40, 2);
    const old = JSON.stringify({ collected_at: '2026-09-16', models: prior });
    const run = async (catalog, endpoints) => {
      await writeFile(target, old);
      const hook = join(directory, 'synthetic-fetch.mjs');
      await writeFile(hook, `const catalog=${JSON.stringify(catalog)};const endpoints=${JSON.stringify(endpoints)};
globalThis.fetch=async(url)=>{url=String(url);if(url.endsWith('/api/v1/models'))return Response.json({data:catalog.map((id)=>({id,name:id}))});
const id=url.replace('https://openrouter.ai/api/v1/models/','').replace('/endpoints','');return Response.json({data:{endpoints:endpoints[id]}});};`);
      // Efficiency sub-collectors are out of scope here: stub them.
      for (const file of ['fetch-openrouter-efficiency.mjs', 'fetch-chutes-efficiency.mjs']) await writeFile(join(directory, 'scripts', file), '');
      return spawnSync(process.execPath, ['--import', hook, join(directory, 'scripts/fetch-live.mjs'), 'or'], { cwd: directory, encoding: 'utf8', timeout: 20000, env: { ...process.env, BH_OR_WITHDRAWAL_RECHECK_MS: '0', BH_EVIDENCE_DIR: '' } });
    };
    const kept = prior.slice(5);
    const endpoints = Object.fromEntries(kept.map((m, i) => [m.id, i < 2 ? m.endpoints.slice(1) : m.endpoints]));
    const ok = await run(kept.map((m) => m.id), endpoints);
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /re-checking in 0 s/);
    const written = JSON.parse(await readFile(target, 'utf8'));
    assert.equal(written.models.length, 35);
    assert.deepEqual(written.withdrawals.models.map((m) => m.id), prior.slice(0, 5).map((m) => m.id));
    assert.equal(written.withdrawals.endpoints.length, 2);
    assert.ok(written.withdrawals.models.every((m) => /^\d{4}-\d{2}-\d{2}$/.test(m.withdrawn_at)));

    const fail = await run(prior.slice(20).map((m) => m.id), Object.fromEntries(prior.map((m) => [m.id, m.endpoints])));
    assert.equal(fail.status, 1);
    assert.match(fail.stderr, /20 models absent \(limit 10\)/);
    assert.equal(await readFile(target, 'utf8'), old);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
