import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reviewLiveContracts, buildLiveContractUnits, LIVE_CONTRACT_CRITERIA } from '../ops/daily/live-contracts.mjs';
import { GAUNTLET_LIMITS } from '../ops/daily/gauntlet.mjs';

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const silent = { log() {}, warn() {} };

const unit = (dataset, rows = 10) => ({ dataset, rows, examples: [`${dataset}-first`, `${dataset}-last`],
  row: { id: dataset }, sources: [{ url: `repo:${dataset}`, sha256: 'x'.repeat(64), content: '{}' }] });

// The seven contracts of a real run, in manifest order.
const UNITS = ['aa', 'da', 'or', 'aa_efficiency', 'or_efficiency', 'chutes_efficiency', 'aa_coding_v15'].map((d, i) => unit(d, 10 + i));

const accepted = (dataset) => ({ accepted: true, fingerprints: [{ id: dataset }], quarantined: [], errors: [],
  reviews: [{ round: 1, verdict: 'pass' }], manifest: { artifact_id: `live-contract-${dataset}`, rounds_used: 1 } });
const rejected = (dataset) => ({ accepted: false, fingerprints: [], quarantined: [{ id: dataset, reason: 'critic finding (blocker/major) without clean re-review' }],
  errors: [`round 1: critic blocked the artifact`], reviews: [{ round: 1, verdict: 'blocked', errors_found: 2, findings: ['x'], missing_evidence: [] }],
  producer_disputed: [], objections: 0, manifest: { artifact_id: `live-contract-${dataset}`, rounds_used: 1 } });
// Malformed answers for the full round budget: no substantive objection anywhere (CR-67.2 fallback).
const unusable = (dataset) => ({ accepted: false, fingerprints: [], quarantined: [{ id: dataset, reason: 'not accepted within the round budget; retained out of published data' }],
  errors: ['round 1: malformed', 'round 2: malformed', 'round 3: malformed'], reviews: [], producer_disputed: [], objections: 0,
  manifest: { artifact_id: `live-contract-${dataset}`, rounds_used: GAUNTLET_LIMITS.maxRounds } });

async function runDirectory() {
  const dir = await mkdtemp(join(tmpdir(), 'cr73-live-'));
  await mkdir(join(dir, 'reports'), { recursive: true });
  return dir;
}

/** Deterministic outcome per dataset, with delays that make completion order differ from manifest order. */
function fakeReviewer(outcomes, delays, seen = []) {
  return async ({ artifactId, rows, criteria }) => {
    const dataset = artifactId.replace('live-contract-', '');
    assert.equal(rows.length, 1);
    assert.deepEqual(criteria, LIVE_CONTRACT_CRITERIA);
    await sleep(delays[dataset] ?? 1);
    seen.push(dataset);
    return outcomes[dataset](dataset);
  };
}

const OUTCOMES = {
  aa: accepted, da: accepted, or: accepted,
  aa_efficiency: rejected,       // retainable → withheld
  or_efficiency: unusable,       // reviewer unavailable → deterministic fallback
  chutes_efficiency: rejected,   // retainable → withheld
  aa_coding_v15: accepted,
};
// The two withheld contracts finish first at concurrency 1 and last at concurrency 4 —
// if retention order followed completion order, the aggregate would differ.
const DELAYS = { aa: 60, da: 50, or: 40, aa_efficiency: 30, or_efficiency: 20, chutes_efficiency: 10, aa_coding_v15: 5 };

async function aggregate(limit) {
  const runDir = await runDirectory();
  const completion = [];
  const retainCalls = [];
  const result = await reviewLiveContracts({
    runDir, rawDir: join(runDir, 'raw'), units: UNITS, limit, log: silent,
    review: fakeReviewer(OUTCOMES, DELAYS, completion),
    retain: async ({ dataset, errors }) => { retainCalls.push(dataset); return { dataset, decision: 'withheld', reasons: errors.slice(0, 5), restored: [] }; },
  });
  return { runDir, result, completion, retainCalls };
}

test('CR-73.3: concurrent contract review aggregates exactly like the sequential loop', async () => {
  const sequential = await aggregate(1);
  const parallel = await aggregate(4);
  assert.deepEqual(sequential.completion, ['aa', 'da', 'or', 'aa_efficiency', 'or_efficiency', 'chutes_efficiency', 'aa_coding_v15']);
  assert.notDeepEqual(parallel.completion, sequential.completion, 'the fixture must actually complete out of manifest order');
  assert.equal(JSON.stringify(parallel.result), JSON.stringify(sequential.result));
  assert.deepEqual(parallel.result.reviewed.map((r) => r.dataset), sequential.completion);
  assert.deepEqual(parallel.retainCalls, ['aa_efficiency', 'chutes_efficiency']);
  assert.deepEqual(parallel.result.deterministic.map((d) => d.dataset), ['or_efficiency']);
  assert.equal(parallel.result.reviewed.reduce((n, r) => n + r.programmatic_rows, 0), UNITS.reduce((n, u) => n + u.rows, 0));
});

test('CR-73.3: the progress file ends deterministic and lists every contract', async () => {
  const { runDir, result } = await aggregate(4);
  const progress = JSON.parse(await readFile(join(runDir, 'reports', 'live-gauntlet-progress.json'), 'utf8'));
  assert.equal(progress.total_contracts, UNITS.length);
  assert.equal(progress.concurrency, 4);
  assert.deepEqual(progress.reviewed.map((r) => r.dataset), UNITS.map((u) => u.dataset));
  assert.deepEqual(progress.retained.map((r) => r.dataset), result.retained.map((r) => r.dataset));
});

test('CR-73.3: every withheld contract is retained once, in manifest order', async () => {
  const runDir = await runDirectory();
  const outcomes = Object.fromEntries(UNITS.map((u) => [u.dataset, ['aa', 'da', 'or'].includes(u.dataset) ? accepted : rejected]));
  const retainCalls = [];
  const result = await reviewLiveContracts({
    runDir, rawDir: join(runDir, 'raw'), units: UNITS, limit: 4, log: silent,
    review: fakeReviewer(outcomes, DELAYS),
    retain: async ({ dataset, errors }) => { retainCalls.push(dataset); return { dataset, decision: 'withheld', reasons: errors.slice(0, 5), restored: [] }; },
  });
  // The four retainable contracts finish in reverse manifest order in this fixture;
  // planRejectedContract counts them, so their order must follow the manifest.
  assert.deepEqual(retainCalls, ['aa_efficiency', 'or_efficiency', 'chutes_efficiency', 'aa_coding_v15']);
  assert.deepEqual(result.retained.map((r) => r.dataset), retainCalls);
  assert.equal(result.deterministic.length, 0);
});

test('CR-73.3: a core source rejection fails the stage even when later units passed', async () => {
  const runDir = await runDirectory();
  const outcomes = { ...OUTCOMES, da: rejected };
  await assert.rejects(() => reviewLiveContracts({
    runDir, rawDir: join(runDir, 'raw'), units: UNITS, limit: 4, log: silent,
    review: fakeReviewer(outcomes, DELAYS),
    retain: async ({ dataset }) => ({ dataset, decision: 'withheld', restored: [] }),
  }), /Live source contract rejected da: .*core source/);
});

test('CR-73.3: a thrown review fails the stage with the first error in manifest order', async () => {
  const runDir = await runDirectory();
  const reviewed = [];
  await assert.rejects(() => reviewLiveContracts({
    runDir, rawDir: join(runDir, 'raw'), units: UNITS, limit: 4, log: silent,
    review: async ({ artifactId }) => {
      const dataset = artifactId.replace('live-contract-', '');
      await sleep(DELAYS[dataset]);
      reviewed.push(dataset);
      if (dataset === 'or' || dataset === 'aa_coding_v15') throw new Error(`packet too large: ${dataset}`);
      return accepted(dataset);
    },
  }), /packet too large: or/);
  assert.ok(reviewed.includes('aa_coding_v15'), 'every unit still spends its own budget before the stage fails');
});

test('CR-73.3: buildLiveContractUnits keeps manifest order and one artifact per dataset', () => {
  const verifier = ['const RAW_DEFAULT', 'async function verifyAa(', 'async function verifyDa(', 'async function verifyOr(',
    'async function verifyAaEfficiency(', 'function aaCarrierExtracts(', 'async function verifyOrEfficiency(',
    'async function verifyChutes(', '// Raw benchmarkRows', 'function codingSourceRows(', '// --- evidence packets'].join('\n');
  const datasets = ['aa', 'da'];
  const manifest = { datasets: datasets.map((d) => ({ dataset: d, rows: 2 })), coverage: { required_rows: 4 } };
  const packets = datasets.flatMap((d) => [{ dataset: d, rows: [
    { row_id: `${d}-1`, source: { url: `https://example.test/${d}`, sha256: 'a'.repeat(64) }, pointer: 'p1', staged: 1, extract: 1 },
    { row_id: `${d}-2`, source: { url: `https://example.test/${d}`, sha256: 'a'.repeat(64) }, pointer: 'p2', staged: 2, extract: 2 },
  ] }]);
  const units = buildLiveContractUnits({ manifest, verifier, aaEfficiencyParser: '// parser',
    verified: { evidence: { packets }, report: { run: { first_receipt: '2026-09-17T00:00:00Z' } } }, now: () => '2026-09-17T00:00:00Z' });
  assert.deepEqual(units.map((u) => u.dataset), datasets);
  assert.deepEqual(units.map((u) => u.rows), [2, 2]);
  assert.deepEqual(units[0].examples, ['aa-1', 'aa-2']);
  assert.ok(units[0].sources.every((s) => s.url && s.sha256 && s.content));
});

test('live contract examples skip a row whose example would exceed the per-source bound (or_efficiency, 2026-09-20)', () => {
  const verifier = ['const RAW_DEFAULT', 'async function verifyAa(', 'async function verifyDa(', 'async function verifyOr(',
    'async function verifyAaEfficiency(', 'function aaCarrierExtracts(', 'async function verifyOrEfficiency(',
    'async function verifyChutes(', '// Raw benchmarkRows', 'function codingSourceRows(', '// --- evidence packets'].join('\n');
  const row = (id, bytes) => ({ row_id: id, source: { url: 'https://openrouter.test/page', sha256: 'a'.repeat(64) }, pointer: id, staged: 1, extract: { endpoint_rows: 'x'.repeat(bytes) } });
  const build = (rows) => buildLiveContractUnits({ manifest: { datasets: [{ dataset: 'or_efficiency', rows: rows.length }], coverage: {} }, verifier, aaEfficiencyParser: '',
    verified: { evidence: { packets: [{ dataset: 'or_efficiency', rows }] }, report: {} }, now: () => '2026-09-21T00:00:00Z' })[0];
  const unit = build([row('big-page', 137_000), row('bigger-page', 187_000), row('page', 81_000), row('ranking', 900)]);
  assert.deepEqual(unit.examples, ['page', 'ranking']);
  assert.equal(unit.row.programmatically_verified_rows, 4);
  // Nothing fits: the oversized rows stay the examples, so the packet builder still refuses the unit.
  assert.deepEqual(build([row('a', 140_000), row('b', 150_000)]).examples, ['a', 'b']);
});
