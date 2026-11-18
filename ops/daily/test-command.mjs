// CR-777 (self-heal 2026-11-18): the daily npm-test step on a large host runs
// the suite with the same parallelism as the merge-queue gate lane.
//
// Both 18 Nov runs were killed at the 60 min npm-test cap with zero failing tests: at
// package.json's --test-concurrency=4 the suite grew from 2835 s (16 Nov) to 3165 s (17 Nov)
// to more than 3600 s (18 Nov) as per-release JevBench tests landed (v1.8.13-v1.8.15).
// The merge-queue gate lane on LeChonk has run the identical suite at concurrency 12 since
// 2 Nov (decision bh-gates-lane-test-concurrency-39197; ~1200 s) under the rule "if the suite
// outgrows its cap: shard / parallelise, never raise the timeout". This module applies the
// same rule, with the same exact-script guard, to the daily run. Every test still runs; only
// how many test files run side by side changes. A small host (Sandy fallback) keeps `npm test`.
import { availableParallelism } from 'node:os';

export const DEFAULT_TEST_SCRIPT = 'node --test --test-concurrency=4 test/';
export const LARGE_HOST_TEST_CONCURRENCY = 12;
export const LARGE_HOST_MIN_CPUS = 32;

/**
 * The command the daily npm-test step runs (in the step's unchanged isolated environment).
 * @param {string|undefined} script package.json scripts.test of the candidate checkout
 * @param {{cpus?: number}} [options]
 * @returns {{file: string, args: string[], concurrency: number|null}}
 */
export function dailyTestCommand(script, { cpus = availableParallelism() } = {}) {
  if (script !== DEFAULT_TEST_SCRIPT || !Number.isInteger(cpus) || cpus < LARGE_HOST_MIN_CPUS) {
    return { file: 'npm', args: ['test'], concurrency: null };
  }
  // Exactly the package script with only the concurrency changed; no test in the suite spawns a
  // node_modules/.bin tool by name, so npm's PATH prefix is not needed.
  return { file: 'node', args: ['--test', `--test-concurrency=${LARGE_HOST_TEST_CONCURRENCY}`, 'test/'], concurrency: LARGE_HOST_TEST_CONCURRENCY };
}
