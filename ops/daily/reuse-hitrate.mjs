#!/usr/bin/env node
// CR-73.2: how often a live source contract would actually have been reusable — measured from
// stored runs, not predicted.
//
// A reuse cache is only worth its risk if the units really do repeat. This tool answers that from
// evidence that already exists: every run keeps its live-evidence packets (`review/packets/*.txt`),
// and those packets carry the exact row objects the fingerprint is built from — `row_id`,
// `pointer`, `source`, `staged`, `extract`. So for any two stored runs we can recompute the
// data half of the CR-73.2 fingerprint and see, per dataset, whether the later run was asking a
// question the earlier one had already answered.
//
// What it does NOT claim: the real key also binds the reviewed verifier, the parser and the
// reviewer code (see ops/daily/reuse-cache.mjs). Those are properties of the *commit* a run
// executed, not of its stored evidence, so this tool reports the data half and says so. A run
// whose code changed is a miss regardless of what the numbers below show — which is exactly why
// the reuse rate will be low while the pipeline is under active change and high once it settles.
//
// Usage: node ops/daily/reuse-hitrate.mjs [runsDir] [--json out.json] [--limit N]
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { withoutCaptureStamps } from './reuse-cache.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** The rows of one run's live evidence, per dataset, in packet order. */
export async function runRows(runDir) {
  const dir = join(runDir, 'review', 'packets');
  let names;
  try { names = (await readdir(dir)).filter((n) => n.endsWith('.txt')); } catch { return null; }
  if (!names.length) return null;
  // `aa-001.txt` … `aa-030.txt`: dataset, then zero-padded sequence — sort restores list order.
  names.sort();
  const byDataset = new Map();
  for (const name of names) {
    const text = await readFile(join(dir, name), 'utf8');
    for (const line of text.split('\n')) {
      if (!line.startsWith('{')) continue;
      let row;
      try { row = JSON.parse(line); } catch { continue; }
      const dataset = String(row.row_id ?? '').split('#')[0];
      if (!dataset) continue;
      if (!byDataset.has(dataset)) byDataset.set(dataset, []);
      byDataset.get(dataset).push(row);
    }
  }
  return byDataset;
}

/** The data half of the CR-73.2 live-contract key: the same digest `buildLiveContractUnits` takes. */
export function datasetDigest(rows) {
  return {
    rows: rows.length,
    captures: [...new Set(rows.map((r) => r.source?.sha256).filter(Boolean))].sort(),
    rows_sha256: sha256(JSON.stringify(rows.map((r) => [r.row_id, r.pointer, r.source?.url ?? null, r.source?.sha256 ?? null,
      withoutCaptureStamps(r.staged), withoutCaptureStamps(r.extract)]))),
  };
}

export async function compareRuns(runsDir, { limit = 12 } = {}) {
  const runs = (await readdir(runsDir)).filter((n) => /^\d{4}-\d{2}-\d{2}T/.test(n)).sort().slice(-limit);
  const digests = [];
  for (const run of runs) {
    const rows = await runRows(join(runsDir, run));
    if (!rows) continue;
    digests.push({ run, datasets: Object.fromEntries([...rows].map(([dataset, list]) => [dataset, datasetDigest(list)])) });
  }
  const pairs = [];
  for (let i = 1; i < digests.length; i++) {
    const previous = digests[i - 1], current = digests[i];
    const datasets = [...new Set([...Object.keys(previous.datasets), ...Object.keys(current.datasets)])].sort();
    const per = datasets.map((dataset) => {
      const a = previous.datasets[dataset], b = current.datasets[dataset];
      return { dataset, identical: !!a && !!b && a.rows_sha256 === b.rows_sha256,
        rows: b?.rows ?? null, previous_rows: a?.rows ?? null,
        captures_identical: !!a && !!b && JSON.stringify(a.captures) === JSON.stringify(b.captures) };
    });
    pairs.push({ from: previous.run, to: current.run, datasets: per,
      identical: per.filter((d) => d.identical).length, total: per.length });
  }
  return { runs: digests.map((d) => d.run), pairs };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const runsDir = args.find((a) => !a.startsWith('--')) ?? '/opt/benchmarkheaven-daily/runs';
  const jsonAt = args.indexOf('--json');
  const limitAt = args.indexOf('--limit');
  const result = await compareRuns(runsDir, { limit: limitAt >= 0 ? Number(args[limitAt + 1]) : 12 });
  for (const pair of result.pairs) {
    console.log(`${pair.from.slice(0, 19)} → ${pair.to.slice(0, 19)}: ${pair.identical}/${pair.total} datasets byte-identical`);
    for (const d of pair.datasets) console.log(`    ${d.identical ? 'same ' : 'MOVED'} ${d.dataset.padEnd(18)} rows ${String(d.previous_rows ?? '—').padStart(5)} → ${String(d.rows ?? '—').padStart(5)}`);
  }
  const totals = result.pairs.reduce((acc, p) => ({ identical: acc.identical + p.identical, total: acc.total + p.total }), { identical: 0, total: 0 });
  console.log(`\nTOTAL ${totals.identical}/${totals.total} dataset comparisons byte-identical across ${result.pairs.length} consecutive run pairs`);
  console.log('Data half of the CR-73.2 key only — the real key also binds the verifier, the parser and the reviewer code.');
  if (jsonAt >= 0) await writeFile(args[jsonAt + 1], JSON.stringify({ ...result, totals }, null, 2) + '\n');
}
