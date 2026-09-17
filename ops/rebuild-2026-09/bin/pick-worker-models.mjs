#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { candidateList, freeRouterCandidates } from './worker-policy.mjs';
const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : Number(args[i + 1]); };
try {
  const dataset = JSON.parse(await readFile(new URL('../../../data/dataset.json', import.meta.url), 'utf8'));
  const response = await fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(30_000), headers: { 'User-Agent': 'benchmarkheaven/1.0 (+https://benchmarkheaven.com)' } });
  if (!response.ok) throw new Error(`OpenRouter catalog HTTP ${response.status}`);
  const result = candidateList((await response.json()).data, dataset, option('--min-index', 34), option('--limit', 10));
  // CR-66.3: the qualified, healthy free router workers the daily run tries first (empty when unreadable).
  const health = await readFile(process.env.BH_LLM_HEALTH || `${process.env.HOME}/.llm-health.json`, 'utf8').then(JSON.parse).catch(() => null);
  result.free_router = process.env.BH_WORKER_FREE_ROUTER === '1' ? freeRouterCandidates(dataset, health) : [];
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`Worker candidates — minimum AA ${result.min_index}`);
    for (const name of ['free_router', 'free_verified', 'cheap_verified', 'free_unverified', 'excluded_too_weak']) {
      console.log(`\n${name}:`);
      for (const m of result[name]) console.log(`  ${m.id}: AA ${m.aa_intelligence_index ?? 'unknown'}, $${m.input_per_1m}/$${m.output_per_1m} per 1M (${m.aa_source})`);
      if (!result[name].length) console.log('  (none)');
    }
    console.log(`\n${result.note}`);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
