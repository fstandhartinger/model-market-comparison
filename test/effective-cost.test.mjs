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
  const expected = new Map([[0,12],[1,7],[3,4.5],[10,32/11],[100,212/101],[INPUT_ONLY,2]]);
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
