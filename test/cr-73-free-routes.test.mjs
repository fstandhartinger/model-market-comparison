// CR-73.4 — fewer paid calls where a qualified, healthy free route exists.
//
// The measured reason (ops/daily/PROFILE-CR73.md, 17 Sep 13:36 baseline): 24 critic calls took 90.9 min and $0.041,
// 22 producer calls 5.8 min and $0.019, and the only qualifying free route (Kimi K3, AA 43.8) can serve just one of
// the two roles per packet because a critic must be a different vendor family than every producer. Spending it on
// the critic is worth ~4.6 min a call; spending it on the producer ~0.1 min. These fixtures pin that preference,
// the role-scoping of failures, and the receipt fields a reader needs to tell "not offered" from "not available".
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { excludedWorkerModels } from '../ops/daily/gauntlet.mjs';
import { freeRouteRole, routeLabel, freeRouterCandidates, selectModel } from '../ops/rebuild-2026-09/bin/worker-policy.mjs';

const KIMI = 'chutes/moonshotai/Kimi-K3-TEE';
const PAID = 'deepseek/deepseek-v4-flash-0731';

test('CR-73.4: a content failure is scoped to the role that produced it; transport and health failures stay global', () => {
  const records = [
    { model: KIMI, role: 'producer', reason: 'Malformed producer audit row' },
    { model: PAID, role: 'critic', reason: 'The operation was aborted due to timeout' },
  ];
  // The 17 Sep baseline: one malformed producer audit killed the free route for all 20 later critic calls.
  assert.deepEqual(excludedWorkerModels(records, { role: 'critic' }), [PAID]);
  // In its own role the free route is still excluded on the first malformed answer (CR-67.3's single strike).
  assert.deepEqual(excludedWorkerModels(records, { role: 'producer' }).sort(), [KIMI, PAID].sort());
  // A transport failure is evidence about the route, not about the task: global, as CR-67.3 requires.
  assert.deepEqual(excludedWorkerModels([{ model: KIMI, role: 'producer', reason: 'fetch failed' }], { role: 'critic' }), [KIMI]);
  assert.deepEqual(excludedWorkerModels([{ model: KIMI, role: 'critic', reason: 'Router completion HTTP 500' }], { role: 'producer' }), [KIMI]);
  // A record without a role cannot be attributed, so it excludes everywhere — an older or truncated log never
  // widens what a route is offered.
  assert.deepEqual(excludedWorkerModels([{ model: KIMI, reason: 'Malformed producer audit row' }], { role: 'critic' }), [KIMI]);
  // A paid worker still earns exactly one retry after a malformed answer, and only within the same role.
  const twice = [{ model: PAID, role: 'critic', reason: 'Malformed critic output: not JSON' }, { model: PAID, role: 'critic', reason: 'Malformed critic output: not JSON' }];
  assert.deepEqual(excludedWorkerModels([twice[0]], { role: 'critic' }), []);
  assert.deepEqual(excludedWorkerModels(twice, { role: 'critic' }), [PAID]);
  assert.deepEqual(excludedWorkerModels(twice, { role: 'producer' }), []);
  // No role asked for → the CR-67.3 behaviour, unchanged.
  assert.deepEqual(excludedWorkerModels(records).sort(), [KIMI, PAID].sort());
  assert.throws(() => excludedWorkerModels(records, { role: 'reviewer' }), /Unknown worker role/);
});

test('iteration 156: a paid worker survives one bare connection drop per run; the strike is shared across roles', () => {
  const GLM = 'z-ai/glm-5.3-flash';
  const drop = (model, role) => ({ model, role, reason: 'fetch failed' });
  // The 21 Sep 12:41 run: GLM's single 14:05 drop left no producer for any later score batch.
  assert.deepEqual(excludedWorkerModels([drop(GLM, 'producer')], { role: 'producer' }), []);
  assert.deepEqual(excludedWorkerModels([drop(GLM, 'producer')], { role: 'critic' }), []);
  // A second drop in either role excludes it everywhere for the rest of the run.
  assert.deepEqual(excludedWorkerModels([drop(GLM, 'producer'), drop(GLM, 'critic')], { role: 'producer' }), [GLM]);
  assert.deepEqual(excludedWorkerModels([drop(GLM, 'critic'), drop(GLM, 'critic')], { role: 'critic' }), [GLM]);
  // Drops and malformed answers are separate one-retry allowances; neither lends the other a strike.
  assert.deepEqual(excludedWorkerModels([drop(PAID, 'critic'), { model: PAID, role: 'critic', reason: 'Malformed critic output: not JSON' }], { role: 'critic' }), []);
  // Only the bare drop qualifies: timeouts, HTTP errors, empty completions and free router routes stay single-strike.
  for (const reason of ['The operation was aborted due to timeout', 'Router completion HTTP 500', 'Empty completion', 'fetch failed: ECONNRESET after 600 s']) {
    assert.deepEqual(excludedWorkerModels([{ model: GLM, role: 'producer', reason }], { role: 'producer' }), [GLM], reason);
  }
  assert.deepEqual(excludedWorkerModels([drop(KIMI, 'critic')], { role: 'critic' }), [KIMI]);
});

test('CR-73.4: the free-route role is explicit, validated and legible on the receipt', () => {
  assert.equal(freeRouteRole(undefined), 'critic');
  assert.equal(freeRouteRole(''), 'critic');
  assert.equal(freeRouteRole('any'), 'any');
  assert.throws(() => freeRouteRole('producer'), /Unsupported free-route role/);
  assert.equal(routeLabel({ transport: 'router', router_model: 'fw-kimi-k3' }), 'router:fw-kimi-k3');
  assert.equal(routeLabel({ id: PAID }), 'openrouter');
  assert.equal(routeLabel(null), null);
});

test('CR-73.4: an unhealthy or unqualified free route is never treated as a valid route', () => {
  const aa = (id, score) => ({ id, aa_model_id: id, family_key: id.split('::')[0], benchmarks: { aa_intelligence_index: score } });
  const dataset = { models: [aa('kimi-k3::max', 43.8), aa('qwen3.8-27b::xhigh', 33.9), { id: 'union-alpha::default', family_key: 'union-alpha', benchmarks: {} },
    { ...aa('deepseek-v4-flash-0731::default', 34.5), aa_metadata: { openrouter_api_id: PAID } },
    { ...aa('glm-5.3-flash::default', 41.9), aa_metadata: { openrouter_api_id: 'z-ai/glm-5.3-flash' } }] };
  const catalog = [{ id: PAID, pricing: { prompt: '0.000000065', completion: '0.00000018' } },
    { id: 'z-ai/glm-5.3-flash', pricing: { prompt: '0.00000009', completion: '0.0000003' } }];
  const healthy = { models: { 'kimi-k3': { usable: true, rank: 0 }, 'qwen3.8-27b': { usable: true, rank: 1 } }, union_alpha: { available: true, ranked_api: [{ key: 'ua-openrouter', health: 'healthy' }] } };
  const critic = (freeRouter) => selectModel(catalog, dataset, { scheduled: true, critic: true, producers: [PAID], freeRouter });
  // Healthy and qualified: the critic is free.
  assert.equal(critic(freeRouterCandidates(dataset, healthy)).id, KIMI);
  // The router route is marked unusable → the critic is a paid model of another family, no silent free call.
  assert.equal(critic(freeRouterCandidates(dataset, { ...healthy, models: { 'kimi-k3': { usable: false, rank: 0 } } })).id, 'z-ai/glm-5.3-flash');
  // Health file missing or malformed → nothing free is offered at all.
  assert.deepEqual(freeRouterCandidates(dataset, null), []);
  assert.deepEqual(freeRouterCandidates(dataset, 'not an object'), []);
  // Qualified only by the exact variant it runs: Qwen3.8 27B (33.9 < 34) and the unscored Union Alpha stay out
  // although both routes are healthy.
  assert.deepEqual(freeRouterCandidates(dataset, healthy).map((c) => c.id), [KIMI]);
  // And the different-family rule still wins over the free route: a Kimi producer gets a paid critic.
  assert.equal(selectModel(catalog, dataset, { scheduled: true, critic: true, producers: ['moonshotai/Kimi-K3-TEE'], freeRouter: freeRouterCandidates(dataset, healthy) }).id, PAID);
});

// --- The real CLI, without network or credentials ---------------------------
// The mock answers both the OpenRouter catalog/completions endpoints and the local router, and records which
// endpoint each call went to, so the receipt can be checked against what actually happened.
const mock = `
import { createRequire, syncBuiltinESMExports } from 'node:module';
const require = createRequire(import.meta.url), fs = require('node:fs/promises'), originalRead = fs.readFile;
const dataset = JSON.stringify({ models: [
  { id: 'kimi-k3::max', aa_model_id: 'kimi-k3::max', family_key: 'kimi-k3', benchmarks: { aa_intelligence_index: 43.8 } },
  { id: 'deepseek-v4-flash-0731::default', aa_model_id: 'deepseek-v4-flash-0731::default', family_key: 'deepseek-v4-flash-0731',
    aa_metadata: { openrouter_api_id: 'deepseek/deepseek-v4-flash-0731' }, benchmarks: { aa_intelligence_index: 34.5 } }] });
fs.readFile = async (path, ...rest) => String(path).endsWith('/data/dataset.json') ? dataset : originalRead(path, ...rest);
syncBuiltinESMExports();
globalThis.fetch = async (url, options) => {
  const target = String(url);
  if (target.endsWith('/models')) return Response.json({ data: [{ id: 'deepseek/deepseek-v4-flash-0731',
    supported_parameters: ['response_format', 'structured_outputs'], pricing: { prompt: '0.000000065', completion: '0.00000018' } }] });
  const request = JSON.parse(options.body);
  const router = target.startsWith('http://127.0.0.1:4010');
  const model = router ? 'moonshotai/Kimi-K3-TEE' : request.model;
  await fs.appendFile(process.env.CALL_LOG, JSON.stringify({ router, model: request.model }) + '\\n');
  return Response.json({ model, usage: { prompt_tokens: 10, completion_tokens: 5, cost: router ? 0 : 0.0012 },
    choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ value: 'synthetic' }) } }] });
};
`;

test('CR-73.4: live CLI — the producer stays paid, the critic takes the healthy free route, and both receipts name route, attempt and cost', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-cr73-4-'));
  try {
    const hook = join(dir, 'mock.mjs'); await writeFile(hook, mock);
    const health = join(dir, 'health.json');
    await writeFile(health, JSON.stringify({ models: { 'kimi-k3': { usable: true, rank: 0 } } }));
    const callLog = join(dir, 'calls.jsonl'); await writeFile(callLog, '');
    const env = { ...process.env, BH_STATE: dir, OPEN_ROUTER_API_KEY: 'synthetic-test-key', LLM_ROUTER_MASTER_KEY: 'synthetic-router-key',
      BH_WORKER_FREE_ROUTER: '1', BH_LLM_HEALTH: health, CALL_LOG: callLog, BH_WORKER_ATTEMPT: '2' };
    const run = (extra, out) => spawnSync(process.execPath, ['--import', hook, 'ops/rebuild-2026-09/bin/worker-runner.mjs',
      '--json', '--timeout', '5', '--out', out, ...extra, 'Check the supplied rows.'], { encoding: 'utf8', timeout: 20000, env });

    const producerOut = join(dir, 'producer.json');
    const producer = run([], producerOut);
    assert.equal(producer.status, 0, producer.stderr);
    const producerMeta = JSON.parse(await readFile(`${producerOut}.meta.json`, 'utf8'));
    assert.equal(producerMeta.requested_model, PAID);
    assert.equal(producerMeta.route, 'openrouter');
    assert.equal(producerMeta.attempt, 2);
    assert.equal(producerMeta.free_route_role, 'critic');
    assert.deepEqual(producerMeta.free_routes_offered, [KIMI]); // offered, deliberately not taken by a producer
    assert.equal(producerMeta.usage.cost, 0.0012);

    const criticOut = join(dir, 'critic.json');
    const critic = run(['--critic', '--producer', PAID], criticOut);
    assert.equal(critic.status, 0, critic.stderr);
    const criticMeta = JSON.parse(await readFile(`${criticOut}.meta.json`, 'utf8'));
    assert.equal(criticMeta.requested_model, KIMI);
    assert.equal(criticMeta.actual_model, 'moonshotai/Kimi-K3-TEE');
    assert.equal(criticMeta.route, 'router:fw-kimi-k3');
    assert.equal(criticMeta.usage.cost, 0);
    assert.deepEqual(criticMeta.excluded_models, []);

    const calls = (await readFile(callLog, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.deepEqual(calls.map((c) => c.router), [false, true]); // the paid call is the producer's, the free one the critic's

    // An unhealthy route: the critic falls back to the paid pool and the receipt says nothing free was offered.
    await writeFile(health, JSON.stringify({ models: { 'kimi-k3': { usable: false, rank: 0 } } }));
    const fallbackOut = join(dir, 'critic-unhealthy.json');
    const fallback = run(['--critic', '--producer', 'z-ai/glm-5.3-flash'], fallbackOut);
    assert.equal(fallback.status, 0, fallback.stderr);
    const fallbackMeta = JSON.parse(await readFile(`${fallbackOut}.meta.json`, 'utf8'));
    assert.equal(fallbackMeta.requested_model, PAID);
    assert.equal(fallbackMeta.route, 'openrouter');
    assert.deepEqual(fallbackMeta.free_routes_offered, []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
