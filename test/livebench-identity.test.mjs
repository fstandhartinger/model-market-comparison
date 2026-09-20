import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { livebenchJoins } from '../lib/board-identity.mjs';

// 2026-09-20 (iteration 139, CR-85.2). The labels are the LiveBench release CSV
// (https://livebench.ai/table_2026_06_25.csv, committed capture) — every slug below is a real source row,
// only the fake catalog is synthetic. The rule is the standing exact-join policy of the slug boards
// (lib/board-identity.mjs), plus LiveBench's own quirk that Qwen's "Max" is part of the model name.

// A small catalog mirroring the real shapes: families with several configurations, families with one
// default, families with a single non-default configuration, and a family absent from the catalog.
const catalog = [
  { id: 'gpt-6-astra::max', family_key: 'gpt-6-astra', variant: 'max' },
  { id: 'gpt-6-astra::high', family_key: 'gpt-6-astra', variant: 'high' },
  { id: 'claude-fable-5.1::max', family_key: 'claude-fable-5.1', variant: 'max' },
  { id: 'claude-sonnet-5::xhigh', family_key: 'claude-sonnet-5', variant: 'xhigh' },
  { id: 'deepseek-v4.1-flash::max', family_key: 'deepseek-v4.1-flash', variant: 'max' },
  { id: 'deepseek-v4-flash::max', family_key: 'deepseek-v4-flash', variant: 'max' },
  { id: 'deepseek-v4-flash::high', family_key: 'deepseek-v4-flash', variant: 'high' },
  { id: 'minimax-m3::default', family_key: 'minimax-m3', variant: 'default' },
  { id: 'qwen3.8-max::default', family_key: 'qwen3.8-max', variant: 'default' },
  { id: 'qwen3.7-max::default', family_key: 'qwen3.7-max', variant: 'default' },
  { id: 'glm-5.3::max', family_key: 'glm-5.3', variant: 'max' },
  { id: 'grok-4.5::high', family_key: 'grok-4.5', variant: 'high' },
  { id: 'kimi-k2.6::default', family_key: 'kimi-k2.6', variant: 'default' },
  { id: 'kimi-k2.6::non-reasoning', family_key: 'kimi-k2.6', variant: 'non-reasoning' },
  { id: 'gemini-3.1-pro-preview::default', family_key: 'gemini-3.1-pro-preview', variant: 'default' },
  { id: 'deepseek-v4-flash-0731::max', family_key: 'deepseek-v4-flash-0731', variant: 'max' },
  { id: 'nemotron-3-ultra-550b-a55b::reasoning', family_key: 'nemotron-3-ultra-550b-a55b', variant: 'reasoning' },
  { id: 'gpt-5.2-codex::xhigh', family_key: 'gpt-5.2-codex', variant: 'xhigh' },
  { id: 'gpt-5.2-codex::openrouter', family_key: 'gpt-5.2-codex', variant: 'openrouter' },
  { id: 'qwen3.8-max-0902::default', family_key: 'qwen3.8-max-0902', variant: 'default' },
  // A constructed ambiguity: both `astra-mini-max` (the model) and `astra-mini` at max exist in the catalog.
  { id: 'astra-mini-max::default', family_key: 'astra-mini-max', variant: 'default' },
  { id: 'astra-mini::max', family_key: 'astra-mini', variant: 'max' },
];

const join = (sourceId) => livebenchJoins([{ benchmark_id: 'livebench::2026-06-25', source_id: sourceId, name: sourceId, protocol: 'x' }], undefined, catalog)[0];

test('LiveBench: the Anthropic effort form joins the stated setting exactly', () => {
  assert.equal(join('claude-fable-5-1-max-effort').model_id, 'claude-fable-5.1::max');
  assert.equal(join('claude-sonnet-5-xhigh-effort').model_id, 'claude-sonnet-5::xhigh');
  // A stated setting the catalog does not hold is refused, never reinterpreted.
  assert.match(join('claude-fable-5-1-medium-effort').reason ?? '', /no catalog configuration for claude-fable-5\.1 with setting medium/);
});

test('LiveBench: <family>-<effort> joins exactly, including the CR-85.2 target', () => {
  assert.equal(join('gpt-6-astra-max').model_id, 'gpt-6-astra::max');
  assert.equal(join('deepseek-v4.1-flash-max').model_id, 'deepseek-v4.1-flash::max');
  assert.match(join('gemini-3.1-pro-preview-high').reason ?? '', /no catalog configuration for gemini-3.1-pro-preview with setting high/);
});

test('LiveBench: a slug that is exactly a catalog family key is a name first, never name-minus-setting', () => {
  assert.equal(join('qwen3.8-max').model_id, 'qwen3.8-max::default');
  assert.equal(join('qwen3.7-max').model_id, 'qwen3.7-max::default');
  assert.equal(join('minimax-m3').model_id, 'minimax-m3::default');
  // …but only when the effort reading names no other real family; both readings together are ambiguous.
  assert.match(join('astra-mini-max').reason ?? '', /ambiguous, joins nothing/);
});

test('LiveBench: no stated setting joins only a single default configuration', () => {
  assert.match(join('glm-5.3').reason ?? '', /setting not stated and glm-5\.3 has 1 catalog configurations/);
  assert.match(join('deepseek-v4-flash').reason ?? '', /setting not stated and deepseek-v4-flash has 2 catalog configurations/);
  // A single configuration that is not the default is never guessed either.
  assert.match(join('glm-5.3').reason ?? '', /has 1 catalog configurations/);
  assert.match(join('deepseek-v4-flash-0731').reason ?? '', /setting not stated and deepseek-v4-flash-0731 has 1 catalog configurations/);
});

test('LiveBench: dated checkpoints, unreviewed settings and unknown models are refused', () => {
  assert.match(join('gpt-5.2-2025-12-11-high').reason ?? '', /dated checkpoint/);
  assert.match(join('claude-opus-4-5-20251101-thinking-64k-high-effort').reason ?? '', /dated checkpoint/);
  assert.match(join('kimi-k2.6-thinking').reason ?? '', /thinking, which is not a reviewed setting/);
  assert.match(join('smaug-agentic').reason ?? '', /not a catalog model slug/);
  assert.match(join('ox-alpha-max').reason ?? '', /not a catalog model slug/);
});

test('the identity map carries the reviewed LiveBench joins the builder resolved', () => {
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8'));
  const live = map.entries.filter((e) => e.benchmark_id.startsWith('livebench::'));
  assert.ok(live.length >= 28, `expected the resolved joins, got ${live.length}`);
  const byId = new Map(live.map((e) => [e.source_id, e.model_id]));
  // Every expectation below is a re-derivation of the exact rule against the real catalog, not a copy.
  assert.equal(byId.get('deepseek-v4.1-flash-max'), 'deepseek-v4.1-flash::max');
  assert.equal(byId.get('claude-fable-5-1-max-effort'), 'claude-fable-5.1::max');
  assert.equal(byId.get('claude-opus-4-8-max-effort'), 'claude-opus-4.8::max');
  assert.equal(byId.get('qwen3.8-max'), 'qwen3.8-max::default');
  assert.equal(byId.get('gemini-3.8-flash-high'), 'gemini-3.8-flash::high');
  assert.equal(byId.get('minimax-m3'), 'minimax-m3::default');
  // The documented refusals must not have been joined by accident.
  for (const refused of ['deepseek-v4-flash', 'glm-5.2', 'grok-4.3', 'kimi-k2.6-thinking', 'kimi-k3',
    'deepseek-v4-flash-0731', 'deepseek-v4-pro-0813', 'nemotron-3-ultra-550b-a55b', 'glm-5.3',
    'claude-opus-4-5-20251101-thinking-64k-high-effort', 'claude-opus-4-6-thinking-auto-high-effort',
    'claude-sonnet-4-6-thinking-auto-medium-effort', 'claude-opus-4-7-xhigh-effort', 'gpt-5.2-codex',
    'smaug-agentic', 'smaug-flash', 'smaug-mini', 'grok-build-0.1', 'ox-alpha-max',
    'gemini-3.1-pro-preview-high', 'gemini-3.5-flash-lite-high', 'gpt-5.2-2025-12-11-high'])
    assert.ok(!byId.has(refused), `${refused} must stay unjoined`);
});

test('the daily regression probe: the CSV slug set produces no ambiguous duplicate joins', () => {
  // The builder's output must join each configuration at most once across the whole board.
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8'));
  const live = map.entries.filter((e) => e.benchmark_id.startsWith('livebench::'));
  const counts = new Map();
  for (const e of live) counts.set(e.model_id, (counts.get(e.model_id) ?? 0) + 1);
  for (const [id, n] of counts) assert.equal(n, 1, `${id} joined ${n} times`);
});
