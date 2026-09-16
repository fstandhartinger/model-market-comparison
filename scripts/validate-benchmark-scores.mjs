#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { verifyScoreEvidence } from '../lib/benchmark-score-evidence.mjs';
import { buildBenchmarkResults } from '../lib/benchmark-scores.mjs';
import { buildHeadlineObservations } from '../lib/headline-history.mjs';
import { readHistory } from './build-benchmark-history.mjs';
const read = async (file) => JSON.parse(await readFile(file, 'utf8'));
const sha256 = async (file) => createHash('sha256').update(await readFile(file)).digest('hex');
const registry = await read('data/raw/benchmarks/registry.json');
const snapshot = await read('data/raw/benchmarks/scores.json');
const approvals = await read('data/raw/benchmarks/score-approvals.json');
const checked = await verifyScoreEvidence(snapshot, registry, { approvals });
const dataset = await read('data/dataset.json');
const history = await readHistory();
const artificialanalysis = await read('data/raw/artificialanalysis.json');
const designarena = await read('data/raw/designarena.json');
const epochEci = await read('data/raw/epoch-eci.json');
const headlineObservations = buildHeadlineObservations({
  artificialanalysis: { ...artificialanalysis, sha256: await sha256('data/raw/artificialanalysis.json') },
  designarena: { ...designarena, sha256: await sha256('data/raw/designarena.json') },
  epochEci,
  modelRows: dataset.models,
});
// CR-64: the per-benchmark kind map is copied from the taxonomy by build-dataset, not derived from scores; check it on its own.
// CR-65.7: likewise the judged-benchmark list, copied from data/benchmark-caveats.json.
const { benchmark_kinds: kinds, judged_benchmarks: judged, ...builtResults } = dataset.benchmark_results;
if (!isDeepStrictEqual(kinds, (await read('data/benchmark-taxonomy.json')).benchmark_kinds)) throw new Error('Dataset benchmark kinds differ from the taxonomy; run data:build');
if (!isDeepStrictEqual(judged, Object.keys((await read('data/benchmark-caveats.json')).judged).sort())) throw new Error('Dataset judged benchmarks differ from benchmark-caveats.json; run data:build');
if (!isDeepStrictEqual(buildBenchmarkResults(snapshot, registry, dataset.models, history.states.length ? history : null, headlineObservations), builtResults)) throw new Error('Built benchmark data differs from validated scores; run data:build');
console.log('Benchmark source/build guard:', checked);
