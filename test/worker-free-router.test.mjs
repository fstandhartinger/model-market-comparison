// CR-66.3: qualified free router workers before the paid OpenRouter pool.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FREE_ROUTER_WORKERS, freeRouterCandidates, selectModel, selectModelForWorker } from '../ops/rebuild-2026-09/bin/worker-policy.mjs';
import { selectProducerCritic } from '../ops/daily/policy.mjs';

const aa = (id, score) => ({ id, aa_model_id: id, family_key: id.split('::')[0], org: 'Example', benchmarks: { aa_intelligence_index: score } });
// Real variant scores (17 Sep 2026): Kimi K3 max 43.8 / low 30.5, Qwen3.8 27B xhigh 33.9, Union Alpha unscored; GLM-5.3 Flash on OpenRouter.
const dataset = { models: [aa('kimi-k3::max', 43.8), aa('kimi-k3::low', 30.5), aa('qwen3.8-27b::xhigh', 33.9), { id: 'union-alpha::default', family_key: 'union-alpha', benchmarks: {} },
  { ...aa('glm-5.3-flash::default', 41.9), aa_metadata: { openrouter_api_id: 'z-ai/glm-5.3-flash' } }] };
const catalog = [{ id: 'z-ai/glm-5.3-flash', pricing: { prompt: '0.00000009', completion: '0.0000003' } }];
const healthy = { models: { 'kimi-k3': { usable: true, rank: 0 }, 'qwen3.8-27b': { usable: true, rank: 1 } }, union_alpha: { available: true, ranked_api: [{ key: 'ua-openrouter', health: 'healthy' }] } };

test('CR-66.3: a free router worker qualifies by the AA score of the variant it runs, and only while healthy', () => {
  const free = freeRouterCandidates(dataset, healthy);
  // Kimi K3 runs at max (Moonshot's documented default, sent explicitly) → 43.8, not the family minimum 30.5.
  assert.deepEqual(free.map((c) => [c.id, c.aa_intelligence_index, c.reasoning_effort, c.input_per_1m + c.output_per_1m]), [['chutes/moonshotai/Kimi-K3-TEE', 43.8, 'max', 0]]);
  // Qwen3.8 27B (33.9 < 34) and Union Alpha (no AA index) stay out although healthy.
  assert.equal(FREE_ROUTER_WORKERS.length, 3);
  assert.deepEqual(freeRouterCandidates(dataset, { ...healthy, models: { 'kimi-k3': { usable: false, rank: 0 } } }), []);
  assert.deepEqual(freeRouterCandidates(dataset, null), []);
});

test('CR-66.3: scheduled selection takes the free producer first; the critic comes from a different family; unhealthy free → paid pair', () => {
  const freeRouter = freeRouterCandidates(dataset, healthy);
  const producer = selectModel(catalog, dataset, { scheduled: true, freeRouter });
  assert.equal(producer.id, 'chutes/moonshotai/Kimi-K3-TEE');
  assert.equal(producer.transport, 'router');
  const critic = selectModel(catalog, dataset, { scheduled: true, freeRouter, critic: true, producers: ['moonshotai/Kimi-K3-TEE'] });
  assert.equal(critic.id, 'z-ai/glm-5.3-flash');
  // With a second qualified free worker of another family, both roles are free.
  const workers = [...FREE_ROUTER_WORKERS, { id: 'chutes/zai-org/GLM-Free', router_model: 'fw-glm', provider_model: 'zai-org/GLM-Free', health: ['models', 'glm-free'], variant_model_id: 'glm-5.3-flash::default', reasoning_effort: null, allowed_as: 'z-ai/glm-5.3-flash' }];
  const both = freeRouterCandidates(dataset, { ...healthy, models: { ...healthy.models, 'glm-free': { usable: true, rank: 2 } } }, { workers });
  const freeCritic = selectModel(catalog, dataset, { scheduled: true, freeRouter: both, critic: true, producers: ['moonshotai/Kimi-K3-TEE'] });
  assert.equal(freeCritic.id, 'chutes/zai-org/GLM-Free');
  assert.equal(freeCritic.input_per_1m + freeCritic.output_per_1m, 0);
  // A recorded failure excludes the free route for the rest of the run; the paid model takes over.
  assert.equal(selectModelForWorker(catalog, dataset, { scheduled: true, freeRouter, excludeModels: ['chutes/moonshotai/Kimi-K3-TEE'] }).id, 'z-ai/glm-5.3-flash');
  // Unhealthy free workers: the paid pool as before. Unscheduled or pinned calls never get a router worker.
  assert.equal(selectModel(catalog, dataset, { scheduled: true, freeRouter: freeRouterCandidates(dataset, {}) }).id, 'z-ai/glm-5.3-flash');
  assert.equal(selectModel(catalog, dataset, { scheduled: false, freeRouter }).id, 'z-ai/glm-5.3-flash');
});

test('CR-66.3: the daily run report pairs the free producer with a different-family critic', () => {
  const free_router = freeRouterCandidates(dataset, healthy);
  const paid = [{ id: 'deepseek/deepseek-v4-flash-0731', family: 'deepseek', aa_intelligence_index: 34.5, input_per_1m: 0.06, output_per_1m: 0.12 }];
  const pair = selectProducerCritic({ free_router, free_verified: [], cheap_verified: paid });
  assert.deepEqual([pair.producer.id, pair.critic.id], ['chutes/moonshotai/Kimi-K3-TEE', 'deepseek/deepseek-v4-flash-0731']);
  assert.equal(selectProducerCritic({ free_router: [], free_verified: [], cheap_verified: [...paid, { id: 'z-ai/glm-5.3-flash', family: 'z-ai', aa_intelligence_index: 41.9, input_per_1m: 0.09, output_per_1m: 0.3 }] }).producer.id, 'deepseek/deepseek-v4-flash-0731');
});

test('CR-67.3: the critic fallback re-offers excluded paid models but never a free route that already failed in this run', () => {
  const freeRouter = freeRouterCandidates(dataset, healthy);
  const deepseek = { id: 'deepseek/deepseek-v4-flash-0731', pricing: { prompt: '0.00000006', completion: '0.00000012' } };
  const data = { models: [...dataset.models, { ...aa('deepseek-v4-flash-0731::default', 34.5), aa_metadata: { openrouter_api_id: deepseek.id } }] };
  // Producer GLM (z-ai); Kimi (free) and DeepSeek (paid) both failed earlier in the run → DeepSeek is retried, not Kimi.
  const critic = selectModelForWorker([...catalog, deepseek], data, { scheduled: true, critic: true, freeRouter, producers: ['z-ai/glm-5.3-flash'],
    excludeModels: ['chutes/moonshotai/Kimi-K3-TEE', deepseek.id] });
  assert.equal(critic.id, deepseek.id);
  // Only the failed free route left as a critic candidate: fail closed instead of another slow retry.
  assert.throws(() => selectModelForWorker(catalog, dataset, { scheduled: true, critic: true, freeRouter, producers: ['z-ai/glm-5.3-flash'],
    excludeModels: ['chutes/moonshotai/Kimi-K3-TEE'] }), /No supported viable/);
});
