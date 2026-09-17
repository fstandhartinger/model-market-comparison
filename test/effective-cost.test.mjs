import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveCost, fixedCost, FIXED_BLENDS, INPUT_ONLY } from '../lib/effective-cost.mjs';

// Synthetic workload; manually computed dollar terms, not mirrored algorithm.
const measured = { input_per_1m: 2, output_per_1m: 10, cache_read_per_1m: 0.2,
  cache_write_per_1m: 2.5, output_tokens_per_task: 1000, input_output_ratio: 20,
  cache_hit_rate: 0.75, cache_write_tokens: 4000 };
const close = (a,b) => assert.ok(Math.abs(a-b) < 1e-12, `${a} differs from ${b}`);

test('four terms use USD/million units, and equivalent has explicit own-token denominator', () => {
  const r=effectiveCost(measured);
  assert.deepEqual(r.terms,{uncached_input:0.01,cached_input:0.003,cache_write:0.01,output:0.01});
  close(r.effective_cost_per_task,0.033);
  close(r.effective_cost_per_1m_tokens, 11/7);
  assert.equal(r.estimated,false);
  assert.deepEqual(r.assumptions,[]);
});
test('twice the output/task doubles workload cost, while per-million equivalent stays unchanged',()=>{
  const base=effectiveCost({...measured,cache_write_tokens:0});
  const verbose=effectiveCost({...measured,output_tokens_per_task:2000,cache_write_tokens:0});
  close(verbose.effective_cost_per_task,base.effective_cost_per_task*2);
  close(verbose.effective_cost_per_1m_tokens,base.effective_cost_per_1m_tokens);
});
test('unknown statistics earn no caching discount and every missing dimension is flagged',()=>{
  const r=effectiveCost({input_per_1m:2,output_per_1m:10});
  close(r.effective_cost_per_task,0.03);
  assert.equal(r.inputs.output_tokens_per_task,1000);
  assert.equal(r.inputs.input_output_ratio,10);
  assert.equal(r.inputs.cache_hit_rate,0);
  assert.equal(r.inputs.cache_read_per_1m,2);
  assert.equal(r.inputs.cache_write_per_1m,2);
  assert.equal(r.inputs.cache_write_tokens,0);
  assert.equal(r.assumptions.length,6);
  assert.equal(r.estimated,true);
});
test('missing read price charges full input even with 100% cache hits',()=>{
  const r=effectiveCost({...measured,cache_read_per_1m:null,cache_hit_rate:1,cache_write_tokens:0});
  close(r.effective_cost_per_task,0.05);
  assert.match(r.assumptions.join(' '),/Cache-read price/);
});
test('missing write price substitutes input price if explicit write tokens exist',()=>{
  const r=effectiveCost({...measured,cache_write_per_1m:null});
  close(r.terms.cache_write,0.008);
  assert.match(r.assumptions.join(' '),/Cache-write price/);
});
test('partial list price fallback is explicit; entirely unknown never ranks as free',()=>{
  const r=effectiveCost({...measured,input_per_1m:null});
  assert.equal(r.inputs.input_per_1m,10);
  assert.match(r.assumptions.join(' '),/Input price missing/);
  const o=effectiveCost({...measured,output_per_1m:null});
  assert.equal(o.inputs.output_per_1m,2);
  assert.match(o.assumptions.join(' '),/Output price missing/);
  assert.equal(effectiveCost({...measured,input_per_1m:null,output_per_1m:null}).effective_cost_per_task,null);
});
test('free prices, zero prompt ratio, and real zero cache statistics are retained',()=>{
  const free=effectiveCost({...measured,input_per_1m:0,output_per_1m:0,cache_read_per_1m:0,cache_write_per_1m:0});
  assert.equal(free.effective_cost_per_task,0);
  const noInput=effectiveCost({...measured,input_output_ratio:0,cache_hit_rate:0,cache_write_tokens:0});
  close(noInput.effective_cost_per_task,0.01);
  assert.deepEqual(noInput.assumptions,[]);
});
test('invalid rates, quantities and nonnumeric data fall back, never clamp or coerce silently',()=>{
  for(const bad of [-1,Infinity,NaN,'20',undefined]) {
    const r=effectiveCost({...measured,input_output_ratio:bad,output_tokens_per_task:bad,cache_write_tokens:bad});
    assert.equal(r.inputs.input_output_ratio,10);assert.equal(r.inputs.output_tokens_per_task,1000);assert.equal(r.inputs.cache_write_tokens,0);
    assert.equal(r.assumptions.length,3);
  }
  for(const hit of [-0.1,1.1,NaN,Infinity,'0.5']) assert.equal(effectiveCost({...measured,cache_hit_rate:hit}).inputs.cache_hit_rate,0);
  assert.equal(effectiveCost({...measured,output_tokens_per_task:0}).inputs.output_tokens_per_task,1000);
  assert.equal(effectiveCost({...measured,output_tokens_per_task:1e308,input_output_ratio:1e308}).effective_cost_per_task,null);
});
test('all fixed blends calculate independently of task/cache data and preserve fallback and zero',()=>{
  // fixedCost(2,12,w) = (2w + 12) / (w + 1); 20 and 30 were added for R4.2.
  const expected = new Map([[0,12],[1,7],[3,4.5],[10,32/11],[20,52/21],[30,72/31],[100,212/101],[INPUT_ONLY,2]]);
  assert.deepEqual(FIXED_BLENDS.map((b)=>b.value).sort((a,b)=>a-b),[...expected.keys()].sort((a,b)=>a-b),'every FIXED_BLENDS entry needs an expected value here');
  for(const {value} of FIXED_BLENDS) {
    close(fixedCost(2,12,value).value,expected.get(value));
    assert.equal(fixedCost(0,0,value).value,0);
    assert.equal(fixedCost(null,null,value).value,null);
    close(fixedCost(null,12,value).value,12);
    close(fixedCost(2,null,value).value,2);
    assert.equal(fixedCost(null,12,value).assumptions.length,1);
    assert.equal(fixedCost(2,null,value).assumptions.length,1);
  }
  assert.equal(fixedCost(2,12,-1).inputWeight,10);
});

import { cacheHitBaseline, CACHE_BASELINE_MIN_ENDPOINTS } from '../lib/effective-cost.mjs';

const endpoint = (value, { stale = false, basis = 'measured', read = 0.1, at = '2026-09-10T00:00:00Z' } = {}) => ({
  cache_hit_rate: { value, stale, basis, collected_at: at },
  cache_read_per_1m: read == null ? null : { value: read },
});
const eff = (list) => ({ openrouter_endpoints: { m: Object.fromEntries(list.map((e, i) => [`t${i}`, e])) } });

test('2026-09-15 cache baseline: median of fresh measured endpoints that bill cache reads', () => {
  const list = Array.from({ length: 21 }, (_, i) => endpoint(i / 20));
  list.push(endpoint(0.99, { stale: true }), endpoint(0.99, { read: null }), endpoint(0.99, { basis: 'assumed' }), endpoint(0.99, { at: '2026-07-01T00:00:00Z' }), endpoint(1.5));
  const b = cacheHitBaseline(eff(list), '2026-09-15T05:00:00Z');
  assert.equal(b.endpoints, 21);
  assert.equal(b.value, 0.5);
  assert.equal(b.basis, 'derived');
  assert.match(b.definition, /Median cache-hit rate of 21 OpenRouter endpoints/);
  // Even count: mean of the two middle values; deterministic.
  const even = cacheHitBaseline(eff(Array.from({ length: 20 }, (_, i) => endpoint(i / 19))), '2026-09-15T05:00:00Z');
  assert.equal(even.value, (9 / 19 + 10 / 19) / 2);
});

test('2026-09-15 cache baseline: a thin sample sets no norm', () => {
  assert.equal(CACHE_BASELINE_MIN_ENDPOINTS, 20);
  assert.equal(cacheHitBaseline(eff(Array.from({ length: 19 }, () => endpoint(0.7))), '2026-09-15T05:00:00Z'), null);
  assert.equal(cacheHitBaseline(undefined, '2026-09-15T05:00:00Z'), null);
});

test('CR-65.9: cache-read prices outside the provider band are flagged; documented exceptions carry their citation', async () => {
  const { cacheReadPriceOutliers } = await import('../lib/effective-cost.mjs');
  // Median read/input 0.1; the band is ×/÷ 4, so 0.02 is outside it and 1.0 (no discount) is never banded.
  const offer = (read, input = 10) => ({ platform: 'Anthropic', provider: 'Anthropic', input_per_1m: input, cache_read_per_1m: read });
  const models = [
    { id: 'claude-opus-5::max', family_key: 'claude-opus-5', offers: [offer(1)] },
    { id: 'claude-sonnet-5::high', family_key: 'claude-sonnet-5', offers: [offer(0.3, 3)] },
    { id: 'claude-haiku-5::default', family_key: 'claude-haiku-5', offers: [offer(0.1, 1)] },
    { id: 'claude-fable-5.1::max', family_key: 'claude-fable-5.1', offers: [offer(0.2)] },
    { id: 'typo::default', family_key: 'typo', offers: [offer(5)] },
    { id: 'nodiscount::default', family_key: 'nodiscount', offers: [offer(10)] },
  ];
  const out = cacheReadPriceOutliers(models);
  assert.deepEqual(out.map((o) => [o.model_id, o.documented != null]), [['claude-fable-5.1::max', true], ['typo::default', false]]);
  assert.match(out[0].documented, /0\.025x/);
  assert.deepEqual(cacheReadPriceOutliers(models.slice(0, 2)), [], 'fewer than three priced offers per provider: no band, no warning');
});

test('CR-65.9 live: the committed dataset records its cache-read outliers, exceptions marked as documented', async () => {
  const { readFile } = await import('node:fs/promises');
  const { CACHE_READ_RATIO_EXCEPTIONS } = await import('../lib/effective-cost.mjs');
  const ds = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const outliers = ds.build_diagnostics.cache_read_price_outliers;
  assert.ok(Array.isArray(outliers));
  for (const o of outliers) assert.equal(o.documented != null, Object.keys(CACHE_READ_RATIO_EXCEPTIONS).some((f) => o.model_id.startsWith(`${f}::`)), o.model_id);
});
