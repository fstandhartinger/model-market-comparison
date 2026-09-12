#!/usr/bin/env node
// Execute data-bearing daily modules inside the isolated staged checkout.
// The parent process owns timeout/exit handling; this child cannot publish Git.
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { writeJSONAtomic } from '../../lib/snapshot.mjs';
import { reviewLive, RULES } from './review-live.mjs';
import { reviewArtifact, sha256 } from './gauntlet.mjs';

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
    const reviewed = [];
    // All numeric records were compared against complete, hash-verified source
    // bodies above. LLM review covers the adapter contract and explicit examples,
    // not a false claim that a model manually inspected thousands of numbers.
    for (const dataset of manifest.datasets) {
      const packets = verified.evidence.packets.filter((p) => p.dataset === dataset.dataset);
      const allRows = packets.flatMap((p) => p.rows);
      const examples = [allRows[0], allRows.at(-1)].filter((r, i, a) => a.findIndex((x) => x.row_id === r.row_id) === i);
      const row = { id: dataset.dataset, mapping: RULES[dataset.dataset],
        required_rows: dataset.rows, programmatically_verified_rows: allRows.length,
        model_review_scope: 'extraction contract, failure/retention rules and explicitly supplied example rows',
        example_row_ids: examples.map((r) => r.row_id) };
      const functions = {
        aa: ['async function verifyAa(', 'async function verifyDa('],
        da: ['async function verifyDa(', 'async function verifyOr('],
        or: ['async function verifyOr(', 'async function verifyAaEfficiency('],
        aa_efficiency: ['function aaCarrierExtracts(', 'async function verifyOrEfficiency('],
        or_efficiency: ['async function verifyOrEfficiency(', 'async function verifyChutes('],
        chutes_efficiency: ['async function verifyChutes(', '// Raw benchmarkRows'],
        aa_coding_v15: ['function codingSourceRows(', '// --- evidence packets'],
      };
      const [start, end] = functions[dataset.dataset];
      const begin = verifier.indexOf(start), finish = verifier.indexOf(end, begin + start.length);
      if (begin < 0 || finish < 0) throw new Error(`Missing reviewed verifier section: ${dataset.dataset}`);
      const sources = [
        { url: 'repo:ops/daily/review-live.mjs', locator: `${start} through ${end}`, content: verifier.slice(verifier.indexOf('const RAW_DEFAULT'), verifier.indexOf('async function verifyAa(')) + '\n' + verifier.slice(begin, finish), sha256: sha256(verifier), retrieved_at: new Date().toISOString(), note: 'Exact local verifier code; hash binds its full file' },
        { url: 'execution:review-live', sha256: sha256(JSON.stringify(verified.report)), retrieved_at: new Date().toISOString(), locator: dataset.dataset, content: JSON.stringify({ run_started_at: verified.report.run?.first_receipt, dataset, execution_report: verified.report, complete_coverage: manifest.coverage }) },
        ...examples.map((r) => ({ ...r.source, locator: r.pointer, content: JSON.stringify({ row_id: r.row_id, staged: r.staged, primary: r.extract }) })),
      ];
      if (dataset.dataset === 'aa_efficiency') sources.splice(1, 0, {
        url: 'repo:lib/aa-efficiency.mjs', locator: 'complete file', content: aaEfficiencyParser,
        sha256: sha256(aaEfficiencyParser), retrieved_at: new Date().toISOString(), note: 'Complete local AA-efficiency parser used by the deterministic verifier',
      });
      const review = await reviewArtifact({ runDir, artifactId: `live-contract-${dataset.dataset}`, rows: [row], sources,
        criteria: [
          { id: 'mapping', text: 'Review this source adapter contract using the actual supplied native primary examples, verifier code, and successful execution report. The programmatic verifier compared EVERY numeric row against complete hash-verified primary bodies. LLM inspection is explicitly limited to the contract and listed examples, not manual full-row numeric coverage. Does the mapping preserve native units, identities, zero/null distinctions and required version boundaries?' },
          { id: 'safety', text: 'Trace missing/partial source, retained metadata and numeric equality checks in the supplied verifier. Retained values must equal prior accepted values and keep their original dates. Unreachable measurements cannot become fresh values. Hash checking and execution are performed by the owner program; inability to execute those yourself is not missing evidence. Raise actual unsupported claimed mapping or missing relevant evidence, without demanding unrelated fields or benchmarks on raw API data.' },
        ] });
      reviewed.push({ dataset: dataset.dataset, programmatic_rows: allRows.length, example_rows: examples.map((r) => r.row_id), ...review });
      await writeJSONAtomic(join(runDir, 'reports', 'live-gauntlet-progress.json'), { total_contracts: manifest.datasets.length, reviewed });
      if (!review.accepted || review.fingerprints.length !== 1 || review.quarantined.length) throw new Error(`Live source contract rejected ${dataset.dataset}: ${review.errors.join('; ')}`);
      console.log(`live gauntlet ${dataset.dataset}: contract accepted; ${allRows.length} rows verified against primary bodies; ${examples.length} explicit model examples`);
    }
    const covered = reviewed.reduce((n, r) => n + r.programmatic_rows, 0);
    if (covered !== manifest.coverage.required_rows) throw new Error('Live verification did not cover every source row');
    result = { ok: true, deterministic: verified.report, gauntlet: { contracts: reviewed.length, programmatically_verified_rows: covered,
      model_reviewed_examples: reviewed.flatMap((r) => r.example_rows), complete: true,
      coverage_note: 'All rows verified programmatically against complete captured primary bodies. Different-model gauntlet verifies adapter contracts and explicit examples. No claim of full manual LLM numeric inspection.',
      reviews: reviewed.map((r) => ({ dataset: r.dataset, manifest: r.manifest })) } };

  }
  await writeJSONAtomic(join(runDir, 'reports', `${step}-step-result.json`), result);
  console.log(`${step} stage complete`);
} catch (error) {
  await writeJSONAtomic(join(runDir, 'reports', `${step}-step-result.json`), { ok: false, error: error.message });
  console.error(`DAILY ${step.toUpperCase()} FAILED: ${error.message}`);
  process.exitCode = 1;
}
