#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { verifyScoreEvidence } from '../lib/benchmark-score-evidence.mjs';
import { buildBenchmarkResults } from '../lib/benchmark-scores.mjs';
import { readHistory } from './build-benchmark-history.mjs';
const read = async (file) => JSON.parse(await readFile(file, 'utf8'));
const registry = await read('data/raw/benchmarks/registry.json');
const snapshot = await read('data/raw/benchmarks/scores.json');
const approvals = await read('data/raw/benchmarks/score-approvals.json');
const checked = await verifyScoreEvidence(snapshot, registry, { approvals });
const dataset = await read('data/dataset.json');
const history = await readHistory();
if (!isDeepStrictEqual(buildBenchmarkResults(snapshot, registry, dataset.models, history.states.length ? history : null), dataset.benchmark_results)) throw new Error('Built benchmark data differs from validated scores; run data:build');
console.log('Benchmark source/build guard:', checked);
