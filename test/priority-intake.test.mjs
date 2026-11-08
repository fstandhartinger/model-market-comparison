// Fast-lane intake: pre-payment check (HF classification, GPU cost, public-endpoint probe + SSRF guard), duplicate-payment guard
// and the review-first payment link. No network: fetch, DNS and HTTPS getters are injected.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  checkApiEndpoint, checkOpenWeights, classifyAdapter, classifyHfModel, DUPLICATE_STATUSES, estimateGpuCost, findDuplicate, hashPayToken,
  hfRepoFromLink, isPublicAddress, modelsProbeUrl, normalizeModelLink, payableRow, resolvePublicHost, runIntakeCheck,
} from '../lib/priority-intake.mjs';
import { ARCHITECTURES, MAX_GPUS } from '../lib/priority-intake-runtime.mjs';
import { startPriorityCheckout, validatePrioritySubmission } from '../lib/priority-evaluation.mjs';
import { INTAKE_REVIEW_SCHEMA_SQL } from '../lib/accounts-schema.mjs';
import { toPriorityBody, validateModelSubmission } from '../lib/model-submission.mjs';

const ST = (params) => ({ parameters: params, total: Object.values(params).reduce((a, b) => a + b, 0) });
const goodInfo = (over = {}) => ({ id: 'o/m', private: false, gated: false, siblings: [{ rfilename: 'model.safetensors' }, { rfilename: 'config.json' }], safetensors: ST({ BF16: 4e9 }), ...over });
const goodConfig = (over = {}) => ({ architectures: ['Qwen3ForCausalLM'], model_type: 'qwen3', ...over });

// ---------- classification ----------
test('supported architecture with safetensors and a small size is ok', () => {
  const v = classifyHfModel({ repo: 'o/m', info: goodInfo(), config: goodConfig() });
  assert.equal(v.outcome, 'ok');
  assert.equal(v.estimate.gpus, 1);
  assert.ok(v.estimate.costUsd <= 20);
});

test('every allowlisted architecture passes, an unknown one needs review', () => {
  for (const arch of ARCHITECTURES) assert.equal(classifyHfModel({ repo: 'o/m', info: goodInfo(), config: goodConfig({ architectures: [arch] }) }).outcome, 'ok', arch);
  const v = classifyHfModel({ repo: 'o/m', info: goodInfo(), config: goodConfig({ architectures: ['FancyNewForCausalLM'] }) });
  assert.equal(v.outcome, 'needs_review');
  assert.equal(v.code, 'unsupported_architecture');
  assert.match(v.message, /FancyNewForCausalLM/);
});

test('custom modeling code (auto_map) needs review unless the repo has a reviewed supplement', () => {
  const config = goodConfig({ auto_map: { AutoModelForCausalLM: 'modeling_x.XForCausalLM' }, architectures: ['XForCausalLM'] });
  const v = classifyHfModel({ repo: 'someone/else', info: goodInfo(), config });
  assert.equal(v.outcome, 'needs_review');
  assert.equal(v.code, 'custom_code');
  assert.equal(classifyHfModel({ repo: 'someone/else', info: goodInfo({ config: { auto_map: {} } }), config: goodConfig({ auto_map: { A: 'b.C' } }) }).code, 'custom_code');
  const registered = classifyHfModel({ repo: 'LycheeAI/Lychee-27B', info: goodInfo({ safetensors: ST({ BF16: 27e9 }) }), config });
  assert.equal(registered.outcome, 'ok');
  assert.equal(registered.code, 'reviewed_supplement');
});

test('gated, private and GGUF-only repositories need review', () => {
  for (const over of [{ gated: 'auto' }, { gated: 'manual' }, { private: true }, { disabled: true }]) {
    assert.equal(classifyHfModel({ repo: 'o/m', info: goodInfo(over), config: goodConfig() }).code, 'gated_or_private');
  }
  const gguf = classifyHfModel({ repo: 'o/m', info: goodInfo({ siblings: [{ rfilename: 'm-q4.gguf' }], safetensors: undefined, tags: ['gguf'] }), config: null });
  assert.equal(gguf.code, 'gguf_only');
  assert.equal(gguf.outcome, 'needs_review');
  assert.equal(classifyHfModel({ repo: 'o/m', info: goodInfo(), config: null }).code, 'no_config');
  assert.equal(classifyHfModel({ repo: 'o/m', info: goodInfo({ siblings: [{ rfilename: 'pytorch_model.bin' }], safetensors: undefined }), config: goodConfig() }).code, 'no_safetensors');
});

// ---------- cost ----------
test('GPU cost estimate: bf16 weights x1.2 on 80 GB cards, USD 2/GPU/h, cap USD 20 at <= USD 5/h', () => {
  const small = estimateGpuCost(ST({ BF16: 4e9 }));
  assert.equal(small.gpus, 1);
  assert.equal(small.hourlyUsd, 2);
  assert.equal(small.vramGb, 9.6);
  assert.equal(small.costUsd, 3); // 2 USD/h x 1.5 h
  const mid = estimateGpuCost(ST({ BF16: 40e9 })); // 96 GB -> 2 GPUs
  assert.equal(mid.gpus, 2);
  assert.ok(mid.costUsd <= 20);
  assert.equal(MAX_GPUS, 2);
  assert.equal(estimateGpuCost(ST({ F8_E4M3: 70e9 })).gpus, 2); // 1 byte/param
  assert.equal(estimateGpuCost({ total: 7e9 }).vramGb, 16.8);   // no per-dtype data: assume bf16
  assert.equal(estimateGpuCost(null), null);
  assert.equal(estimateGpuCost({ parameters: {}, total: 0 }), null);
});

test('models beyond one USD 5/h pod or the USD 20 cap are over_cap, and get a plain explanation', () => {
  const big = classifyHfModel({ repo: 'o/m', info: goodInfo({ safetensors: ST({ BF16: 70e9 }) }), config: goodConfig() });
  assert.equal(big.outcome, 'over_cap');
  assert.ok(big.estimate.gpus > MAX_GPUS);
  assert.match(big.message, /manual review/);
  const huge = classifyHfModel({ repo: 'o/m', info: goodInfo({ safetensors: ST({ BF16: 400e9 }) }), config: goodConfig() });
  assert.equal(huge.outcome, 'over_cap');
  assert.equal(classifyHfModel({ repo: 'o/m', info: goodInfo({ safetensors: ST({ BF16: 60e9 }) }), config: goodConfig() }).outcome, 'ok');
});

// ---------- HF fetch (fake network) ----------
const res = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => { if (body === undefined) throw new Error('no body'); return body; } });
const fakeHf = (api, cfg, seen = []) => async (url) => { seen.push(String(url)); return String(url).includes('/api/models/') ? api() : cfg(); };

test('checkOpenWeights reads the model API and config.json and returns ok', async () => {
  const seen = [];
  const v = await checkOpenWeights('https://huggingface.co/org/model/tree/main', { fetchImpl: fakeHf(() => res(200, goodInfo()), () => res(200, goodConfig()), seen) });
  assert.equal(v.outcome, 'ok');
  assert.deepEqual(seen.sort(), ['https://huggingface.co/api/models/org/model', 'https://huggingface.co/org/model/resolve/main/config.json']);
});

test('checkOpenWeights: gated/private/404 -> review, 5xx and timeouts fail closed with a friendly message', async () => {
  const run = (api, cfg) => checkOpenWeights('https://huggingface.co/o/m', { fetchImpl: fakeHf(api, cfg) });
  assert.equal((await run(() => res(401), () => res(401))).code, 'gated_or_private');
  assert.equal((await run(() => res(200, goodInfo()), () => res(403))).code, 'gated_or_private');
  assert.equal((await run(() => res(404), () => res(404))).code, 'hf_not_found');
  const fivexx = await run(() => res(503), () => res(503));
  assert.equal(fivexx.outcome, 'needs_review');
  assert.equal(fivexx.code, 'hf_unavailable');
  assert.match(fivexx.message, /Nothing was charged/);
  const boom = await checkOpenWeights('https://huggingface.co/o/m', { fetchImpl: async () => { throw new Error('network down'); } });
  assert.equal(boom.code, 'hf_unavailable');
  const slow = await checkOpenWeights('https://huggingface.co/o/m', { timeoutMs: 20, fetchImpl: (url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))) });
  assert.equal(slow.code, 'hf_unavailable');
  assert.equal((await run(() => res(200, goodInfo()), () => res(200, undefined))).code, 'no_config'); // config.json is not JSON
});

test('only huggingface.co/<owner>/<repo> links are checked; others need review without any request', async () => {
  assert.equal(hfRepoFromLink('https://hf.co/Org/Model.git'), 'Org/Model');
  for (const bad of ['https://github.com/o/m', 'https://huggingface.co/datasets/o/d', 'https://huggingface.co/o', 'http://huggingface.co/o/m', '', undefined, 'https://huggingface.co/../x']) assert.equal(hfRepoFromLink(bad), null, String(bad));
  let called = false;
  const v = await checkOpenWeights('https://github.com/o/m', { fetchImpl: async () => { called = true; } });
  assert.equal(v.code, 'not_hf');
  assert.equal(called, false);
});

test('ImageJevBench on open weights always goes to review; api orders use the endpoint check', async () => {
  const v = await runIntakeCheck({ accessType: 'open_weights', benchmarks: ['jevbench', 'imagejevbench'], modelLink: 'https://huggingface.co/o/m' }, { hf: { fetchImpl: async () => { throw new Error('must not be called'); } } });
  assert.equal(v.code, 'image_open_weights');
  const api = await runIntakeCheck({ accessType: 'api_endpoint', benchmarks: ['jevbench'], apiUrl: 'https://api.example.com/v1', apiPublic: false });
  assert.equal(api.code, 'api_private');
});

test('architectures seen in real orders through 8 Nov 2026 (and the Qwen3.5 MoE siblings) are allowlisted', () => {
  for (const arch of ['Qwen3_5ForConditionalGeneration', 'Gemma4ForConditionalGeneration', 'Qwen3_5ForCausalLM', 'Gemma4UnifiedForConditionalGeneration',
    'Mistral3ForConditionalGeneration', 'Gemma4ForCausalLM', 'Qwen3_5Model', 'Qwen3_5MoeForConditionalGeneration', 'Qwen3_5MoeForCausalLM', 'Qwen3_5MoeModel']) {
    assert.ok(ARCHITECTURES.includes(arch), arch);
    assert.equal(classifyHfModel({ repo: 'o/m', info: goodInfo(), config: goodConfig({ architectures: [arch] }) }).outcome, 'ok', arch);
  }
  assert.ok(ARCHITECTURES.includes('Qwen3ForCausalLM')); // existing ones stay
});

// ---------- LoRA adapters ----------
const adapterInfo = (files = ['README.md', 'adapter_config.json', 'adapter_model.safetensors'], over = {}) => ({ id: 'o/adapter', private: false, gated: false, siblings: files.map((rfilename) => ({ rfilename })), ...over });
const adapterCfg = (base = 'Qwen/Qwen3.5-4B', over = {}) => ({ peft_type: 'LORA', base_model_name_or_path: base, ...over });
const baseOk = () => ({ info: goodInfo({ safetensors: ST({ BF16: 4e9 }) }), config: goodConfig({ architectures: ['Qwen3_5ForConditionalGeneration'] }) });

test('adapter on a supported public base: ok, cost estimated from the base model', () => {
  assert.deepEqual(classifyAdapter({ repo: 'o/adapter', info: adapterInfo(), adapterConfig: adapterCfg() }), { pending: 'base', baseRepo: 'Qwen/Qwen3.5-4B' });
  const v = classifyAdapter({ repo: 'o/adapter', info: adapterInfo(), adapterConfig: adapterCfg(), base: baseOk() });
  assert.equal(v.outcome, 'ok');
  assert.equal(v.code, 'supported_adapter');
  assert.equal(v.baseModel, 'Qwen/Qwen3.5-4B');
  assert.deepEqual(v.estimate, estimateGpuCost(ST({ BF16: 4e9 })));
});

test('adapter on an unsupported, custom-code, gated, missing or oversized base needs review / over_cap', () => {
  const run = (base) => classifyAdapter({ repo: 'o/adapter', info: adapterInfo(), adapterConfig: adapterCfg(), base });
  const weird = run({ info: goodInfo(), config: goodConfig({ architectures: ['FancyNewForCausalLM'] }) });
  assert.equal(weird.outcome, 'needs_review');
  assert.equal(weird.code, 'adapter_base_unsupported');
  assert.equal(weird.baseCode, 'unsupported_architecture');
  assert.equal(run({ info: goodInfo(), config: goodConfig({ auto_map: { A: 'b.C' } }) }).baseCode, 'custom_code');
  assert.equal(run({ info: goodInfo({ gated: 'auto' }), config: goodConfig() }).baseCode, 'gated_or_private');
  assert.equal(run(null).code, 'adapter_base_unavailable');
  const big = run({ info: goodInfo({ safetensors: ST({ BF16: 200e9 }) }), config: goodConfig() });
  assert.equal(big.outcome, 'over_cap');
});

test('adapter with extra head files, code, sub-folder layout, non-LoRA config or a local-path base needs review', () => {
  const run = (files, cfg = adapterCfg(), over = {}) => classifyAdapter({ repo: 'o/adapter', info: adapterInfo(files, over), adapterConfig: cfg, base: baseOk() });
  const head = run(['adapter_config.json', 'adapter_model.safetensors', 'decision_head.pt']);
  assert.equal(head.outcome, 'needs_review');
  assert.equal(head.code, 'adapter_custom_files');
  assert.match(head.message, /decision_head\.pt/);
  assert.equal(run(['adapter_config.json', 'adapter_model.safetensors', 'inference/serve.py']).code, 'adapter_custom_files');
  assert.equal(run(['adapter_config.json', 'adapter_model.safetensors', 'old/pytorch_model.bin']).code, 'adapter_custom_files');
  assert.equal(run(['adapter_config.json', 'adapter_model.safetensors', 'backbone/model.safetensors']).code, 'adapter_custom_files');
  assert.equal(run(['adapter_config.json', 'adapter_model.safetensors', 'assets/chart.png', 'LICENSE']).outcome, 'ok'); // harmless extras
  assert.equal(run(['adapter_config.json', 'adapter_model.safetensors'], adapterCfg('/workspace/hf/hub/models--Qwen--Qwen3.5-4B/snapshots/abc')).code, 'adapter_base_unresolvable');
  assert.equal(run(['adapter_config.json', 'adapter_model.safetensors'], adapterCfg('../../etc/passwd')).code, 'adapter_base_unresolvable');
  assert.equal(run(['adapter_config.json', 'adapter_model.safetensors'], adapterCfg('')).code, 'adapter_base_unresolvable');
  assert.equal(run(['adapter_config.json', 'adapter_model.safetensors'], adapterCfg('Qwen/Qwen3.5-4B', { peft_type: 'PREFIX_TUNING' })).code, 'adapter_unsupported');
  assert.equal(run(['adapter_config.json', 'adapter_model.safetensors'], null).code, 'adapter_unsupported');
  assert.equal(run(['adapter_config.json', 'adapter_model.bin']).code, 'adapter_custom_files');
  assert.equal(run(['adapter_config.json', 'README.md']).code, 'no_safetensors');
  assert.equal(run(['adapter_config.json', 'adapter_model.safetensors'], adapterCfg('Qwen/Qwen3.5-4B', { auto_mapping: { parent_library: 'evil_pkg.models', base_model_class: 'X' } })).code, 'custom_code');
  assert.equal(run(undefined, adapterCfg(), { gated: 'manual' }).code, 'gated_or_private');
});

test('a repo with a reviewed runtime supplement may carry extra head files next to its adapter', () => {
  const v = classifyAdapter({ repo: 'oidlabs/cue-reflex-4B', info: adapterInfo(['adapter_config.json', 'adapter_model.safetensors', 'decision_head.pt', 'inference/serve.py']), adapterConfig: adapterCfg(), base: baseOk() });
  assert.equal(v.outcome, 'ok');
});

test('checkOpenWeights follows a root adapter_config.json to the base model (same signal, no other hosts)', async () => {
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(String(url));
    if (url === 'https://huggingface.co/api/models/o/adapter') return res(200, adapterInfo());
    if (url === 'https://huggingface.co/o/adapter/resolve/main/config.json') return res(404);
    if (url === 'https://huggingface.co/o/adapter/resolve/main/adapter_config.json') return res(200, adapterCfg('Qwen/Qwen3.5-4B'));
    if (url === 'https://huggingface.co/api/models/Qwen/Qwen3.5-4B') return res(200, baseOk().info);
    if (url === 'https://huggingface.co/Qwen/Qwen3.5-4B/resolve/main/config.json') return res(200, baseOk().config);
    throw new Error(`unexpected ${url}`);
  };
  const v = await checkOpenWeights('https://huggingface.co/o/adapter', { fetchImpl });
  assert.equal(v.code, 'supported_adapter');
  assert.ok(seen.every((u) => u.startsWith('https://huggingface.co/')));
  // unreadable base (404) and gated adapter file fail closed
  const missing = await checkOpenWeights('https://huggingface.co/o/adapter', { fetchImpl: async (u) => (String(u).includes('Qwen/Qwen3.5-4B') ? res(404) : fetchImpl(u)) });
  assert.equal(missing.code, 'adapter_base_unavailable');
  const gatedBase = await checkOpenWeights('https://huggingface.co/o/adapter', { fetchImpl: async (u) => (String(u).includes('/api/models/Qwen/') ? res(401) : fetchImpl(u)) });
  assert.equal(gatedBase.code, 'adapter_base_unsupported');
  assert.equal(gatedBase.baseCode, 'gated_or_private');
  const noAdapterFile = await checkOpenWeights('https://huggingface.co/o/adapter', { fetchImpl: async (u) => (String(u).endsWith('adapter_config.json') ? res(404) : fetchImpl(u)) });
  assert.equal(noAdapterFile.code, 'adapter_unsupported');
  // a repo with neither config.json nor adapter files stays no_config
  const plain = await checkOpenWeights('https://huggingface.co/o/m', { fetchImpl: fakeHf(() => res(200, goodInfo()), () => res(404)) });
  assert.equal(plain.code, 'no_config');
});

test('dry run on the 33 live paid open-weights repos (recorded Hugging Face metadata, no network)', async () => {
  const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/priority-intake-hf.json', import.meta.url), 'utf8'));
  const lower = Object.fromEntries(Object.entries(fx).map(([k, v]) => [k.toLowerCase(), v]));
  const fetchImpl = async (url) => {
    const m = String(url).match(/^https:\/\/huggingface\.co\/(?:api\/models\/([^/]+\/[^/]+)|([^/]+\/[^/]+)\/resolve\/main\/(.+))$/);
    const e = lower[(m[1] || m[2]).toLowerCase()];
    if (!e) return res(404);
    const f = m[1] ? e.api : m[3] === 'config.json' ? e.config : e.adapter;
    return f.status === 200 ? res(200, f.body) : res(f.status);
  };
  const code = async (repo) => (await checkOpenWeights(`https://huggingface.co/${repo}`, { fetchImpl }));
  for (const repo of ['crh225/plumb-4b', 'h2oai/h2o-lightning-4b', 'org2ai/Wald-4B', 'MeTask-Rain/metask-jev-rain-31B-trained', 'torchcast-ai/torchcast-decision-12b',
    'jgeuter/Jeff-1.0-Large', 'cyankiwi/gemma-4-12B-it-qat-AWQ-INT4', 'macrocosm-os/iota-decide-4b-v0.4']) assert.equal((await code(repo)).outcome, 'ok', repo);
  assert.equal((await code('krishna765/deck-4b-v1.0')).code, 'supported_adapter'); // LoRA on alibiserikbay/JevK5 (Qwen3_5ForCausalLM)
  assert.equal((await code('ninhnv/chon-1.0-12b')).code, 'supported_adapter');     // LoRA on google/gemma-4-12B-it
  assert.equal((await code('mohit67890/imajev-4b')).code, 'adapter_custom_files');
  assert.equal((await code('MeTask-Rain/MetaDecision-31B-Rain')).code, 'no_config'); // service/ sub-folder layout
  assert.equal((await code('h2oai/h2o-lightning-31b')).code, 'gated_or_private');   // gated today
});

// ---------- SSRF guard ----------
test('private, loopback, link-local, reserved and mapped addresses are refused', () => {
  const refused = ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255',
    '198.18.0.1', '203.0.113.5', '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:169.254.169.254', '64:ff9b::a00:1',
    '2001:db8::1', '2002:c0a8:0101::1', 'not an ip', '', '1.2.3', '999.1.1.1'];
  for (const ip of refused) assert.equal(isPublicAddress(ip), false, ip);
  for (const ip of ['8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8']) assert.equal(isPublicAddress(ip), true, ip);
});

test('a host is public only when every resolved address is public', async () => {
  assert.equal((await resolvePublicHost('a.example.com', async () => [{ address: '93.184.216.34', family: 4 }])).ok, true);
  assert.equal((await resolvePublicHost('a.example.com', async () => [{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.5', family: 4 }])).ok, false);
  assert.equal((await resolvePublicHost('a.example.com', async () => [{ address: '127.0.0.1', family: 4 }])).ok, false);
  assert.equal((await resolvePublicHost('a.example.com', async () => { throw new Error('ENOTFOUND'); })).ok, false);
  assert.equal((await resolvePublicHost('a.example.com', async () => [])).ok, false);
  assert.equal((await resolvePublicHost('169.254.169.254')).ok, false);
});

test('probe URL is <link>/v1/models without doubling /v1 and without query', () => {
  assert.equal(modelsProbeUrl('https://api.example.com').href, 'https://api.example.com/v1/models');
  assert.equal(modelsProbeUrl('https://api.example.com/v1/').href, 'https://api.example.com/v1/models');
  assert.equal(modelsProbeUrl('https://api.example.com/openai?model=x#f').href, 'https://api.example.com/openai/v1/models');
});

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];
const okBody = JSON.stringify({ object: 'list', data: [{ id: 'm' }] });

test('public endpoint: 200 JSON with a data list is ok and the connection is pinned to the validated IP', async () => {
  const calls = [];
  const v = await checkApiEndpoint({ apiUrl: 'https://api.example.com/v1', apiPublic: true }, { lookup: publicLookup, get: async (url, address, family) => { calls.push([url.href, address, family]); return { status: 200, body: okBody }; } });
  assert.equal(v.outcome, 'ok');
  assert.deepEqual(calls, [['https://api.example.com/v1/models', '93.184.216.34', 4]]);
});

test('endpoints that resolve to private IPs are refused and never contacted', async () => {
  for (const address of ['127.0.0.1', '10.0.0.8', '192.168.0.10', '169.254.169.254', '::1', 'fd00::1']) {
    let contacted = false;
    const v = await checkApiEndpoint({ apiUrl: 'https://evil.example.com/v1', apiPublic: true }, { lookup: async () => [{ address, family: address.includes(':') ? 6 : 4 }], get: async () => { contacted = true; return { status: 200, body: okBody }; } });
    assert.equal(v.outcome, 'needs_review', address);
    assert.equal(v.code, 'api_host_refused');
    assert.equal(contacted, false, address);
  }
  for (const url of ['https://127.0.0.1/v1', 'https://[::1]/v1', 'https://169.254.169.254/latest']) {
    let contacted = false;
    const v = await checkApiEndpoint({ apiUrl: url, apiPublic: true }, { get: async () => { contacted = true; return { status: 200, body: okBody }; } });
    assert.equal(v.outcome, 'needs_review', url);
    assert.equal(contacted, false, url);
  }
});

test('everything but a clean public answer goes to review: no public flag, 401, 3xx, non-JSON, no data list, errors, http', async () => {
  const get = (status, body) => async () => ({ status, body });
  const check = (input, deps) => checkApiEndpoint({ apiUrl: 'https://api.example.com/v1', apiPublic: true, ...input }, { lookup: publicLookup, ...deps });
  assert.equal((await check({ apiPublic: false }, { get: get(200, okBody) })).code, 'api_private');
  assert.equal((await check({ apiPublic: undefined }, { get: get(200, okBody) })).code, 'api_private');
  assert.equal((await check({}, { get: get(401, '{"error":"no key"}') })).code, 'api_probe_failed');
  assert.equal((await check({}, { get: get(302, '') })).code, 'api_probe_failed'); // redirects are never followed
  assert.equal((await check({}, { get: get(200, '<html>') })).code, 'api_probe_failed');
  assert.equal((await check({}, { get: get(200, '{"data":"x"}') })).code, 'api_probe_failed');
  assert.equal((await check({}, { get: async () => { throw new Error('timeout'); } })).code, 'api_probe_failed');
  assert.equal((await check({ apiUrl: 'http://api.example.com/v1' }, { get: get(200, okBody) })).outcome, 'needs_review');
  assert.equal((await check({ apiUrl: 'https://u:p@api.example.com/v1' }, { get: get(200, okBody) })).outcome, 'needs_review');
  assert.equal((await check({ apiUrl: 'https://api.example.com:8443/v1' }, { get: get(200, okBody) })).outcome, 'needs_review');
  assert.equal((await check({ apiUrl: '' }, { get: get(200, okBody) })).code, 'api_url_missing');
});

// ---------- duplicate guard ----------
test('link normalisation: host case, www, hf.co, query, fragment, .git, trailing slash, extra HF path', () => {
  const canonical = 'huggingface.co/org/repo';
  for (const link of ['https://huggingface.co/Org/Repo', 'https://HuggingFace.co/org/repo/', 'https://hf.co/org/repo.git', 'https://www.huggingface.co/org/repo?x=1#readme',
    'https://huggingface.co/org/repo/tree/main', 'https://huggingface.co/ORG/REPO/blob/main/config.json']) assert.equal(normalizeModelLink(link), canonical, link);
  assert.equal(normalizeModelLink('https://github.com/Foo/Bar.git/'), 'github.com/foo/bar');
  assert.equal(normalizeModelLink('https://Example.com/A/B/?q=1'), 'example.com/a/b');
  assert.equal(normalizeModelLink(''), '');
  assert.equal(normalizeModelLink('not a url'), '');
  assert.notEqual(normalizeModelLink('https://huggingface.co/org/repo-2'), canonical);
});

const NOW = Date.parse('2026-11-08T12:00:00Z');
const hoursAgo = (h) => new Date(NOW - h * 3600_000).toISOString();
const dbRow = (over = {}) => ({ submission_id: randomUUID(), email: 'Author@Example.com', model_name: 'M', model_link: 'https://huggingface.co/org/repo', code_link: '', status: 'paid', checkout_session_id: 'cs_1', created_at: hoursAgo(2), ...over });
const order = (over = {}) => ({ submissionId: randomUUID(), email: 'author@example.com', modelName: 'Other name', modelLink: 'https://hf.co/ORG/repo.git', codeLink: '', ...over });

test('duplicate guard: same lower(email) + same normalised link within 24 h in paid/review_passed/completed/started checkout', () => {
  for (const status of ['paid', 'review_passed', 'completed', 'checkout_pending']) {
    const d = findDuplicate([dbRow({ status })], order(), NOW);
    assert.deepEqual(d, { duplicate: true, existing_status: status, created_at: hoursAgo(2) }, status);
  }
  assert.deepEqual([...DUPLICATE_STATUSES].sort(), ['checkout_pending', 'completed', 'paid', 'review_passed']);
});

test('duplicate guard ignores: other email, other model, old orders, failed/refunded/expired/unstarted rows, and a retry of the same submission', () => {
  const none = (rows, o = order()) => assert.equal(findDuplicate(rows, o, NOW), null);
  none([dbRow({ email: 'someone@else.com' })]);
  none([dbRow({ model_link: 'https://huggingface.co/org/repo2' })]);
  none([dbRow({ created_at: hoursAgo(25) })]);
  none([dbRow({ created_at: hoursAgo(-1) })]); // future timestamps never match
  for (const status of ['checkout_failed', 'refunded', 'refund_due', 'expired', 'awaiting_review', 'intake_declined']) none([dbRow({ status })]);
  none([dbRow({ status: 'checkout_pending', checkout_session_id: null })]);
  const same = randomUUID();
  none([dbRow({ submission_id: same })], order({ submissionId: same }));
  none([dbRow()], order({ modelLink: '', codeLink: '', modelName: '' })); // nothing to compare
});

test('duplicate guard falls back to code link then model name when there is no model link, and returns the newest hit', () => {
  assert.ok(findDuplicate([dbRow({ model_link: '', code_link: 'https://github.com/a/b' })], order({ modelLink: '', codeLink: 'https://github.com/A/B/' }), NOW));
  assert.ok(findDuplicate([dbRow({ model_link: '', model_name: 'Jev One' })], order({ modelLink: '', modelName: ' jev one ' }), NOW));
  const d = findDuplicate([dbRow({ status: 'checkout_pending', created_at: hoursAgo(10) }), dbRow({ status: 'paid', created_at: hoursAgo(1) })], order(), NOW);
  assert.equal(d.existing_status, 'paid');
  assert.deepEqual(Object.keys(d).sort(), ['created_at', 'duplicate', 'existing_status']); // no customer data echoed
});

// ---------- startPriorityCheckout wiring ----------
const baseSubmission = (over = {}) => ({ ...validatePrioritySubmission({
  submissionId: randomUUID(), email: 'author@example.com', modelName: 'Example', modelLink: 'https://huggingface.co/org/repo', codeLink: '',
  accessType: 'open_weights', accessInstructions: 'Weights are public.', notes: '', pricingTier: 'api_or_small_open', benchmarks: ['jevbench'], visibility: 'public', termsAccepted: true,
}).value, ...over });

function harness(submission, hooks) {
  const calls = { prepare: 0, stripe: 0, hold: [], saved: 0 };
  const run = () => startPriorityCheckout({
    submission, stripeMode: 'test', stripeKey: 'sk_test_x', origin: 'https://example.test', requestId: 'req',
    prepareRequest: async () => { calls.prepare++; return { id: 'id1', checkoutUrl: null }; },
    createSession: async () => { calls.stripe++; return { id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1' }; },
    saveSession: async () => { calls.saved++; },
    markFailed: async () => {}, isConflict: () => false, logFailure: () => {},
    holdForReview: async (s, mode, intake) => { calls.hold.push([mode, intake.code]); return { id: 'h1' }; },
    ...hooks,
  });
  return { calls, run };
}
const pass = async () => ({ outcome: 'ok', code: 'supported', message: 'ok' });
const fail = (outcome = 'needs_review', code = 'custom_code') => async () => ({ outcome, code, message: 'Needs custom code.' });

test('checkout without intake hooks behaves as before', async () => {
  const { calls, run } = harness(baseSubmission(), {});
  const r = await run();
  assert.equal(r.status, 200);
  assert.equal(r.body.url, 'https://checkout.stripe.com/c/pay/cs_1');
  assert.deepEqual([calls.prepare, calls.stripe], [1, 1]);
});

test('intake ok -> normal checkout', async () => {
  const { calls, run } = harness(baseSubmission(), { findDuplicate: async () => null, checkIntake: pass });
  const r = await run();
  assert.equal(r.body.url, 'https://checkout.stripe.com/c/pay/cs_1');
  assert.equal(calls.stripe, 1);
});

test('needs_review / over_cap: no Stripe session, no stored row, advice offers manual review first', async () => {
  for (const [outcome, code] of [['needs_review', 'custom_code'], ['over_cap', 'over_cap'], ['needs_review', 'hf_unavailable']]) {
    const { calls, run } = harness(baseSubmission(), { checkIntake: fail(outcome, code) });
    const r = await run();
    assert.equal(r.status, 200);
    assert.equal(r.body.url, undefined);
    assert.equal(r.body.intake.outcome, outcome);
    assert.equal(r.body.intake.canRequestReview, true);
    assert.match(r.body.intake.reviewLabel, /Request manual review first \(pay only after we confirm\)/);
    assert.deepEqual([calls.prepare, calls.stripe, calls.hold.length], [0, 0, 0]);
  }
});

test('requestReview stores awaiting_review (no Stripe) with the confirmation text; even an ok check honours the request', async () => {
  for (const check of [fail(), pass]) {
    const { calls, run } = harness(baseSubmission({ requestReview: true }), { checkIntake: check });
    const r = await run();
    assert.equal(r.status, 200);
    assert.equal(r.body.reviewFirst, true);
    assert.match(r.body.message, /email you a payment link; the 48-hour clock starts only when you pay/);
    assert.deepEqual([calls.prepare, calls.stripe, calls.hold.length], [0, 0, 1]);
  }
});

test('duplicate -> 409 JSON before any intake check or Stripe call; confirmDuplicate goes through', async () => {
  const dup = async () => ({ existing_status: 'paid', created_at: '2026-11-08T10:00:00.000Z' });
  let checked = false;
  const { calls, run } = harness(baseSubmission(), { findDuplicate: dup, checkIntake: async () => { checked = true; return pass(); } });
  const r = await run();
  assert.equal(r.status, 409);
  assert.deepEqual(r.body, { duplicate: true, existing_status: 'paid', created_at: '2026-11-08T10:00:00.000Z' });
  assert.equal(checked, false);
  assert.deepEqual([calls.prepare, calls.stripe], [0, 0]);
  const confirmed = harness(baseSubmission({ confirmDuplicate: true }), { findDuplicate: dup, checkIntake: pass });
  assert.equal((await confirmed.run()).body.url, 'https://checkout.stripe.com/c/pay/cs_1');
});

test('a failing hold answers 502 with a reference and never starts Stripe', async () => {
  const { calls, run } = harness(baseSubmission({ requestReview: true }), { checkIntake: fail(), holdForReview: async () => { throw new Error('db down'); } });
  const r = await run();
  assert.equal(r.status, 502);
  assert.equal(calls.stripe, 0);
});

// ---------- validation of the new fields ----------
test('priority validation carries apiUrl/apiPublic/confirmDuplicate/requestReview and rejects non-https API URLs', () => {
  const body = { submissionId: randomUUID(), email: 'a@example.com', modelName: 'M', modelLink: '', codeLink: 'https://github.com/o/m', accessType: 'api_endpoint', accessInstructions: 'See API URL.',
    pricingTier: 'api_or_small_open', benchmarks: ['jevbench'], visibility: 'public', termsAccepted: true, apiUrl: 'https://api.example.com/v1', apiPublic: true, confirmDuplicate: true, requestReview: true };
  const v = validatePrioritySubmission(body).value;
  assert.deepEqual([v.apiUrl, v.apiPublic, v.confirmDuplicate, v.requestReview], ['https://api.example.com/v1', true, true, true]);
  assert.equal(validatePrioritySubmission({ ...body, apiKeySubmitted: true }).value.apiPublic, false);
  assert.equal(validatePrioritySubmission({ ...body, apiPublic: 'yes', confirmDuplicate: 'true', requestReview: 1 }).value.confirmDuplicate, false);
  assert.equal(validatePrioritySubmission({ ...body, apiUrl: 'http://api.example.com' }).ok, false);
  assert.equal(validatePrioritySubmission({ ...body, apiUrl: 'https://u:p@api.example.com' }).ok, false);
  assert.equal(validatePrioritySubmission({ ...body, apiUrl: undefined }).value.apiUrl, '');
});

test('/submit mapping: api orders carry the URL and the public flag only without a key', () => {
  const form = { submissionId: randomUUID(), modelName: 'M', githubUrl: '', huggingfaceUrl: '', apiUrl: 'https://api.example.com/v1', description: '', email: 'a@example.com',
    benchmarks: ['jevbench'], fastLane: true, pricingTier: 'api_or_small_open', visibility: 'public', termsAccepted: true, apiPublic: true };
  const pub = validateModelSubmission(form).value;
  assert.equal(pub.apiPublic, true);
  const body = toPriorityBody(pub, 'REF');
  assert.deepEqual([body.accessType, body.apiUrl, body.apiPublic, body.apiKeySubmitted], ['api_endpoint', 'https://api.example.com/v1', true, false]);
  const keyed = validateModelSubmission({ ...form, apiKey: 'abc12345-secret-token' }).value;
  assert.equal(keyed.apiPublic, false);
  assert.equal(toPriorityBody(keyed, 'REF').apiKeySubmitted, true);
  assert.equal(validateModelSubmission({ ...form, apiUrl: '', huggingfaceUrl: 'https://huggingface.co/o/m' }).value.apiPublic, false);
  assert.equal(validateModelSubmission({ ...form, confirmDuplicate: true, requestReview: true }).value.requestReview, true);
});

// ---------- review-first payment link ----------
const TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789_-ABC';
const approvedRow = (over = {}) => ({ id: randomUUID(), status: 'awaiting_review', intake_approved_at: '2026-11-08T10:00:00Z', pay_token_hash: hashPayToken(TOKEN), ...over });

test('pay link: only an approved, unpaid row with the right token is payable', () => {
  const row = approvedRow();
  assert.equal(payableRow(row, row.id, TOKEN), row);
  assert.equal(payableRow(approvedRow({ status: 'checkout_pending', id: row.id }), row.id, TOKEN)?.status, 'checkout_pending'); // same session may be re-opened
});

test('pay link rejects: unapproved, wrong token, missing/short token, wrong id, wrong status, no stored hash', () => {
  const row = approvedRow();
  assert.equal(payableRow({ ...row, intake_approved_at: null }, row.id, TOKEN), null);
  assert.equal(payableRow(row, row.id, TOKEN.replace('a', 'b')), null);
  assert.equal(payableRow(row, row.id, ''), null);
  assert.equal(payableRow(row, row.id, 'short'), null);
  assert.equal(payableRow(row, row.id, undefined), null);
  assert.equal(payableRow(row, randomUUID(), TOKEN), null);
  assert.equal(payableRow(row, 'not-a-uuid', TOKEN), null);
  assert.equal(payableRow(null, row.id, TOKEN), null);
  for (const status of ['paid', 'review_passed', 'completed', 'checkout_failed', 'refunded', 'expired', 'intake_declined']) assert.equal(payableRow({ ...row, status }, row.id, TOKEN), null, status);
  assert.equal(payableRow({ ...row, pay_token_hash: null }, row.id, TOKEN), null);
  assert.equal(payableRow({ ...row, pay_token_hash: 'zz' }, row.id, TOKEN), null);
  assert.equal(payableRow({ ...row, pay_token_hash: TOKEN }, row.id, TOKEN), null); // a plaintext token in the column never matches
});

test('the pay route goes through findPayableRequest, accepts GET and POST, and never logs the token', () => {
  const route = fs.readFileSync(new URL('../app/api/priority-evaluation/pay/[id]/route.ts', import.meta.url), 'utf8');
  assert.match(route, /findPayableRequest\(id, token\)/);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.doesNotMatch(route, /console\.\w+\([^)]*token/);
  const db = fs.readFileSync(new URL('../lib/priority-evaluation-db.ts', import.meta.url), 'utf8');
  assert.match(db, /payableRow\(/);
  assert.match(db, /intake_approved_at IS NOT NULL/); // the UPDATE that moves the row to checkout is guarded as well
});

// ---------- schema ----------
test('migration 003 equals the runtime copy, is idempotent and adds the columns and statuses', () => {
  const sql = fs.readFileSync(new URL('../db/accounts/003_intake_review.sql', import.meta.url), 'utf8');
  assert.equal(INTAKE_REVIEW_SCHEMA_SQL, sql);
  for (const col of ['intake_check jsonb', 'intake_approved_at timestamptz', 'intake_approved_by text', 'pay_token_hash text']) assert.match(sql, new RegExp(`ADD COLUMN IF NOT EXISTS ${col}`));
  assert.match(sql, /'awaiting_review', 'intake_declined'/);
  assert.match(sql, /pg_get_constraintdef\(oid\) LIKE '%awaiting_review%'/);
  for (const line of sql.split('\n').filter((l) => /^(CREATE|ALTER)/.test(l))) assert.match(line, /IF NOT EXISTS/, line);
  assert.match(fs.readFileSync(new URL('../lib/priority-evaluation-db.ts', import.meta.url), 'utf8'), /INTAKE_REVIEW_SCHEMA_SQL/);
});
