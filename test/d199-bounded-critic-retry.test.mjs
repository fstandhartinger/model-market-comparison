// D199 (2026-09-25): the daily paid for 58 critic calls from one model that had already been struck off.
//
// `excludedWorkerModels` is a single-strike policy for a content failure, and `defaultRunner` passes the
// result to the runner as BH_WORKER_EXCLUDE_MODELS. But `selectModelForWorker` has a last-resort retry
// for the critic role — written on 2026-09-17 for a *transient transport* failure, so that one bad
// connection cannot make a bounded run impossible when the whitelist has a single remaining
// different-family critic. That retry was never told what a route was excluded *for*, and it is
// unbounded: it re-offers every excluded paid route on every later call.
//
// Measured on `runs/2026-09-25T00-41-03-131Z-1717799`: `z-ai/glm-5.3-flash` was struck off as critic at
// 01:14 ("Critic round does not match the packet round") and then answered **57 more** critic calls,
// failing every one — 58 records in `workers/unavailable-models.jsonl`, all four reasons ours, not the
// transport's. All 22 score batches published nothing, and `refresh-benchmarks` spent 73 minutes.
//
// The bound: the caller knows the reasons, so the caller names the subset the retry may not re-offer.
// Three content strikes in a role is the line — a route that has answered three times without meeting
// the contract has shown what it can do today, and what it earned before that is still collected.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { excludedWorkerModels, hardExcludedWorkerModels, HARD_EXCLUSION_STRIKES } from '../ops/daily/gauntlet.mjs';
import { selectModelForWorker, selectModel } from '../ops/rebuild-2026-09/bin/worker-policy.mjs';

const content = (model, role, reason = 'Critic round does not match the packet round') => ({ model, role, reason, failure: 'content' });
const transport = (model, role, reason = 'fetch failed') => ({ model, role, reason, failure: 'transport' });

test('D199: three content strikes harden a route; transport strikes never do', () => {
  assert.equal(HARD_EXCLUSION_STRIKES, 3);
  const glm = 'z-ai/glm-5.3-flash';
  const strikes = (n) => Array.from({ length: n }, () => content(glm, 'critic'));
  for (const n of [0, 1, 2]) assert.deepEqual(hardExcludedWorkerModels(strikes(n), { role: 'critic' }), [], `${n} strikes`);
  assert.deepEqual(hardExcludedWorkerModels(strikes(3), { role: 'critic' }), [glm]);
  // A single strike still excludes it the ordinary way; hardening only removes the retry's licence.
  assert.deepEqual(excludedWorkerModels(strikes(1), { role: 'critic' }), [glm]);
  // Transport failures stay soft however many there are: that is what the 2026-09-17 retry is for.
  assert.deepEqual(hardExcludedWorkerModels(Array.from({ length: 9 }, () => transport(glm, 'critic')), { role: 'critic' }), []);
  // A content failure counts only against its own role (CR-73.4); an unattributed record counts everywhere.
  assert.deepEqual(hardExcludedWorkerModels(strikes(3), { role: 'producer' }), []);
  assert.deepEqual(hardExcludedWorkerModels(Array.from({ length: 3 }, () => content(glm, undefined)), { role: 'producer' }), [glm]);
  // Records written before 2026-09-25 carry no `failure` field and stay soft rather than hardening in bulk.
  assert.deepEqual(hardExcludedWorkerModels(strikes(4).map(({ failure: _f, ...r }) => r), { role: 'critic' }), []);
  assert.throws(() => hardExcludedWorkerModels([], { role: 'reviewer' }), /Unknown worker role/);
});

test('D199: the real 2026-09-25 record stream hardens exactly the route that answered 58 times', async () => {
  const file = '/opt/benchmarkheaven-daily/runs/2026-09-25T00-41-03-131Z-1717799/workers/unavailable-models.jsonl';
  let records;
  try { records = (await readFile(file, 'utf8')).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)); }
  catch (error) { if (error.code === 'ENOENT') { console.log('run receipts pruned; policy covered by the fixtures above'); return; } throw error; }
  // The run's own reasons, classified as they would be written now.
  const ours = /Malformed|did not echo|does not match|Incomplete required|Invented coverage|Pass without/;
  const now = records.map((r) => ({ ...r, failure: ours.test(r.reason ?? '') ? 'content' : 'transport' }));
  assert.deepEqual(hardExcludedWorkerModels(now, { role: 'critic' }), ['z-ai/glm-5.3-flash']);
  // It hardens on its third own answer, so the run pays for 3 of those calls instead of 58.
  const upTo = (n) => now.slice(0, now.findIndex((r) => r.model === 'z-ai/glm-5.3-flash' && r.failure === 'content'
    && now.slice(0, now.indexOf(r) + 1).filter((x) => x.model === r.model && x.failure === 'content').length === n) + 1);
  assert.deepEqual(hardExcludedWorkerModels(upTo(2), { role: 'critic' }), []);
  assert.deepEqual(hardExcludedWorkerModels(upTo(3), { role: 'critic' }), ['z-ai/glm-5.3-flash']);
  assert.equal(records.filter((r) => r.model === 'z-ai/glm-5.3-flash').length, 58, 'what the unbounded retry cost');
});

test('D199: the last-resort retry re-offers a soft-excluded critic and not a hardened one', () => {
  // The 2026-09-25 shape: a DeepSeek producer, and GLM as the only different-family critic the
  // scheduled whitelist offers. Prices and indices are fixtures, not claims about these models.
  const GLM = 'z-ai/glm-5.3-flash', DEEPSEEK = 'deepseek/deepseek-v4.1-flash';
  const catalog = [GLM, DEEPSEEK].map((id) => ({ id, pricing: { prompt: '0.0000001', completion: '0.0000002' },
    supported_parameters: ['response_format'] }));
  const base = (id) => id.split('/')[1];
  const dataset = { models: catalog.map(({ id }) => ({ id: `${base(id)}::default`, aa_model_id: `${base(id)}::default`,
    family_key: base(id), org: 'Example', aa_metadata: { openrouter_api_id: id },
    benchmarks: { aa_intelligence_index: 40 } })) };
  const pick = (options) => selectModelForWorker(catalog, dataset, {
    critic: true, scheduled: true, producers: [DEEPSEEK], freeRouter: [], ...options });

  // Nothing excluded: GLM is the different-family critic.
  assert.equal(pick({}).id, GLM);
  // Soft-excluded: the 2026-09-17 retry re-offers it, so one dropped connection cannot end the run.
  assert.equal(pick({ excludeModels: [GLM] }).id, GLM);
  // Hardened: the same retry must not re-offer it, and there is no other candidate.
  assert.throws(() => pick({ excludeModels: [GLM], hardExcludeModels: [GLM] }), /No supported viable worker model found/);
  // A hardened route is also out of the ordinary selection, not only out of the retry.
  assert.throws(() => selectModel(catalog, dataset, { critic: true, scheduled: true, producers: [DEEPSEEK], hardExcludeModels: [GLM] }),
    /No supported viable worker model found/);
  // Hardening one route does not remove another: a producer role still selects normally.
  assert.equal(selectModelForWorker(catalog, dataset, { scheduled: true, hardExcludeModels: [GLM] }).id, DEEPSEEK);
  // And an invalid hard list is rejected like the soft one, never silently ignored.
  for (const bad of [['nope'], 'z-ai/glm-5.3-flash', [42]]) {
    assert.throws(() => selectModel(catalog, dataset, { critic: true, producers: [DEEPSEEK], hardExcludeModels: bad }),
      /Invalid excluded worker model IDs/);
  }
});

test('D199: the reasons and the bound travel together from the gauntlet to the runner', async () => {
  const gauntlet = await readFile(new URL('../ops/daily/gauntlet.mjs', import.meta.url), 'utf8');
  // The runner is handed both lists, computed from the same records with the same role.
  assert.match(gauntlet, /hardFailed = hardExcludedWorkerModels\(records, \{ role \}\)/);
  assert.match(gauntlet, /BH_WORKER_HARD_EXCLUDE_MODELS: \[\.\.\.new Set\(\[\.\.\.hardFailed/);
  // Both writers of a record say which kind of failure it was.
  assert.match(gauntlet, /reason, role, failure: 'transport'/);
  assert.match(gauntlet, /reason, failure: 'content'/);
  const runner = await readFile(new URL('../ops/rebuild-2026-09/bin/worker-runner.mjs', import.meta.url), 'utf8');
  assert.match(runner, /hardExcludeModels: \(process\.env\.BH_WORKER_HARD_EXCLUDE_MODELS \|\| ''\)/);
  assert.match(runner, /hard_excluded_models: \[\.\.\.options\.hardExcludeModels\]/, 'every receipt states what was hardened');
  const policy = await readFile(new URL('../ops/rebuild-2026-09/bin/worker-policy.mjs', import.meta.url), 'utf8');
  assert.match(policy, /excludeModels\.filter\(\(id\) => freeIds\.has\(id\) \|\| hard\.has\(id\)\)/);
});
