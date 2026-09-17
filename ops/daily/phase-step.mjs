#!/usr/bin/env node
// Execute data-bearing daily modules inside the isolated staged checkout.
// The parent process owns timeout/exit handling; this child cannot publish Git.
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { writeJSONAtomic } from '../../lib/snapshot.mjs';
import { reviewLive } from './review-live.mjs';
import { buildLiveContractUnits, reviewLiveContracts } from './live-contracts.mjs';
import { dailyConcurrency } from './concurrency.mjs';

const [step, directory] = process.argv.slice(2);
if (!directory || !['live', 'benchmarks'].includes(step)) throw new Error('Usage: node ops/daily/phase-step.mjs live|benchmarks RUN_DIR');
const runDir = resolve(directory);
process.env.BH_WORKER_MAX_PRICE_PER_1M = '4';
process.env.BH_WORKER_REASONING_EFFORT = 'low';
process.env.BH_STATE = join(runDir, 'workers');
await mkdir(process.env.BH_STATE, { recursive: true });
try {
  let result;
  if (step === 'benchmarks') {
    const { refreshBenchmarks } = await import('./refresh-benchmarks.mjs');
    result = await refreshBenchmarks({ runDir });
    if (result?.ok !== true) throw new Error('Benchmark refresh reported failure');
  } else {
    const verified = await reviewLive({ runDir, rawDir: resolve('data/raw'), batchSize: 10, maxPacketBytes: 50000 });
    if (!verified?.ok || !verified.evidence?.manifest?.coverage?.complete) throw new Error('Live primary-source verification failed');
    const manifest = verified.evidence.manifest;
    const verifier = await readFile('ops/daily/review-live.mjs', 'utf8');
    const aaEfficiencyParser = await readFile('lib/aa-efficiency.mjs', 'utf8');
    const limit = dailyConcurrency();
    const units = buildLiveContractUnits({ manifest, verified, verifier, aaEfficiencyParser });
    // CR-73.3: the seven contract reviews are independent and each writes only its own
    // gauntlet directory, so they share the waiting; every decision below stays in
    // manifest order (see ops/daily/live-contracts.mjs).
    console.log(`live gauntlet: reviewing ${units.length} source contracts with concurrency ${limit}`);
    const { reviewed, retained, deterministic } = await reviewLiveContracts({
      runDir, rawDir: resolve('data/raw'), units, limit,
    });
    const covered = reviewed.reduce((n, r) => n + r.programmatic_rows, 0);
    if (covered !== manifest.coverage.required_rows) throw new Error('Live verification did not cover every source row');
    result = { ok: true, deterministic: verified.report, gauntlet: { contracts: reviewed.length, concurrency: limit, programmatically_verified_rows: covered,
      model_reviewed_examples: reviewed.flatMap((r) => r.example_rows), complete: true, retained_contracts: retained, deterministic_fallback_contracts: deterministic,
      coverage_note: 'All rows verified programmatically against complete captured primary bodies. Different-model gauntlet verifies adapter contracts and explicit examples. No claim of full manual LLM numeric inspection.',
      reviews: reviewed.map((r) => ({ dataset: r.dataset, manifest: r.manifest })) } };

  }
  await writeJSONAtomic(join(runDir, 'reports', `${step}-step-result.json`), result);
  if (step === 'benchmarks') {
    // CR-38.5: per-source health across all held runs (reports/source-health.{json,md}). Never fails the step.
    try {
      const { writeSourceHealth } = await import('./source-health.mjs');
      const health = await writeSourceHealth({ runsDir: dirname(runDir), outDir: join(runDir, 'reports') });
      const failing = health.sources.filter((s) => s.kind === 'failing');
      console.log(`source health: ${failing.length} failing source(s)${failing.length ? ': ' + failing.map((s) => `${s.id} since ${s.failing_since.slice(0, 10)}`).join(', ') : ''}`);
    } catch (error) { console.warn(`WARN source health not written: ${error.message}`); }
  }
  console.log(`${step} stage complete`);
} catch (error) {
  await writeJSONAtomic(join(runDir, 'reports', `${step}-step-result.json`), { ok: false, error: error.message });
  console.error(`DAILY ${step.toUpperCase()} FAILED: ${error.message}`);
  process.exitCode = 1;
}
