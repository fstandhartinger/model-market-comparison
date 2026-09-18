// CR-73.2 fixtures: reuse a prior verified outcome only for a byte-identical source unit.
//
// The acceptance the change request asks for, verbatim: "unchanged capture produces the same
// dataset/gate decision with no new worker call; a changed capture, parser/version change or
// missing/corrupt cache forces fresh parse/review; cached hashes/decision provenance are
// recorded." Each of those clauses has a test below, plus the ones that keep the guarantees:
// a withheld, rejected or fallback-accepted contract never becomes reusable, and a reuse never
// changes what the stage decides.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  openReuseCache, unitFingerprint, reuseEnabled, reuseProvenance, REUSE_CACHE_VERSION, DEFAULT_MAX_AGE_DAYS,
} from '../ops/daily/reuse-cache.mjs';
import { buildLiveContractUnits, reviewLiveContracts, LIVE_CONTRACT_CRITERIA } from '../ops/daily/live-contracts.mjs';
import { vendorUnitFingerprint, vendorReusable } from '../ops/daily/refresh-benchmarks.mjs';

const silent = { log() {}, warn() {} };

async function runDirectory(prefix = 'cr73-reuse-') {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  await mkdir(join(dir, 'reports'), { recursive: true });
  return dir;
}

// --- the key itself ---------------------------------------------------------

test('CR-73.2: the fingerprint depends on content, not on property order', () => {
  const a = unitFingerprint({ kind: 'live-contract', id: 'aa', inputs: { rows: 3, contract: 'x', captures: ['a', 'b'] } });
  const b = unitFingerprint({ kind: 'live-contract', id: 'aa', inputs: { captures: ['a', 'b'], contract: 'x', rows: 3 } });
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('CR-73.2: any change of unit, id, input or cache meaning changes the key', () => {
  const base = { kind: 'live-contract', id: 'aa', inputs: { contract: 'x', captures: ['a'], rows_sha256: 'deadbeef' } };
  const key = unitFingerprint(base);
  const variants = [
    { ...base, kind: 'vendor-source' },
    { ...base, id: 'da' },
    { ...base, inputs: { ...base.inputs, contract: 'x ' } },          // one byte of the contract
    { ...base, inputs: { ...base.inputs, captures: ['a', 'b'] } },     // a second capture
    { ...base, inputs: { ...base.inputs, rows_sha256: 'deadbeee' } },  // one changed row
    { ...base, inputs: { ...base.inputs, verifier_sha256: 'z' } },     // reviewed code version
  ];
  for (const variant of variants) assert.notEqual(unitFingerprint(variant), key);
  // The ordering of an array input is content, not noise: a reordered capture list is a new key.
  assert.notEqual(unitFingerprint({ ...base, inputs: { ...base.inputs, captures: ['b', 'a'] } }),
    unitFingerprint({ ...base, inputs: { ...base.inputs, captures: ['a', 'b'] } }));
});

test('CR-73.2: reuse is opt-in and never guesses', () => {
  assert.equal(reuseEnabled({}), false);
  assert.equal(reuseEnabled({ BH_DAILY_REUSE: '' }), false);
  assert.equal(reuseEnabled({ BH_DAILY_REUSE: '0' }), false);
  assert.equal(reuseEnabled({ BH_DAILY_REUSE: 'false' }), false);
  assert.equal(reuseEnabled({ BH_DAILY_REUSE: '1' }), true);
  assert.equal(reuseEnabled({ BH_DAILY_REUSE: 'true' }), true);
  assert.throws(() => reuseEnabled({ BH_DAILY_REUSE: 'maybe' }), /BH_DAILY_REUSE/);
});

// --- the log ----------------------------------------------------------------

const entry = (fingerprint, extra = {}) => ({
  fingerprint, kind: 'live-contract', id: 'aa', decision: 'accepted', run_id: 'run-1',
  captures: ['c'.repeat(64)], outcome: { accepted: true, fingerprints: [{ id: 'aa' }], manifest: { artifact_id: 'live-contract-aa' } }, ...extra,
});

test('CR-73.2: a stored acceptance is found again, with its provenance', async () => {
  const dir = await runDirectory();
  const fp = 'a'.repeat(64);
  const first = await openReuseCache({ dir, enabled: true });
  assert.equal(await first.put(entry(fp)), true);

  const second = await openReuseCache({ dir, enabled: true });
  const hit = second.get(fp);
  assert.ok(hit, 'an identical fingerprint is a hit in a later run');
  assert.equal(hit.run_id, 'run-1');
  const provenance = reuseProvenance(hit);
  assert.equal(provenance.reused, true);
  assert.equal(provenance.fingerprint, fp);
  assert.equal(provenance.accepted_run_id, 'run-1');
  assert.deepEqual(provenance.captures, ['c'.repeat(64)]);
  assert.equal(second.stats().hits, 1);
});

test('CR-73.2: only an acceptance is ever stored', async () => {
  const dir = await runDirectory();
  const cache = await openReuseCache({ dir, enabled: true });
  for (const decision of ['rejected', 'retained', 'deterministic-fallback', undefined]) {
    assert.equal(await cache.put(entry('b'.repeat(64), { decision })), false, `${decision} must not be storable`);
  }
  assert.equal(cache.get('b'.repeat(64)), null);
  assert.equal(cache.stats().stored, 0);
});

test('CR-73.2: a disabled cache misses on everything and writes nothing', async () => {
  const dir = await runDirectory();
  const cache = await openReuseCache({ dir, enabled: false });
  assert.equal(await cache.put(entry('c'.repeat(64))), false);
  assert.equal(cache.get('c'.repeat(64)), null);
  assert.equal(cache.stats().enabled, false);
  await assert.rejects(readFile(join(dir, 'reuse-cache.jsonl')), /ENOENT/);
});

test('CR-73.2: a corrupt, truncated or foreign-version log is a miss, not a hit', async () => {
  const dir = await runDirectory();
  const fp = 'd'.repeat(64);
  await writeFile(join(dir, 'reuse-cache.jsonl'), [
    '{ this is not json',
    '{"no_fingerprint":true}',
    JSON.stringify(entry(fp, { cache_version: 'not-this-version' })),
    JSON.stringify(entry('e'.repeat(64), { outcome: undefined })),
    '',
  ].join('\n'));
  const cache = await openReuseCache({ dir, enabled: true });
  assert.equal(cache.get(fp), null, 'another cache version is never reused');
  assert.equal(cache.get('e'.repeat(64)), null, 'an entry without an outcome is never reused');
  assert.equal(cache.stats().corrupt_lines, 2);
  assert.equal(cache.stats().misses, 2);
});

test('CR-73.2: an unreadable cache directory is a miss and is reported', async () => {
  const warnings = [];
  const cache = await openReuseCache({ dir: '/proc/1/nonexistent-reuse', enabled: true, log: { warn: (m) => warnings.push(m) } });
  assert.equal(cache.get('f'.repeat(64)), null);
  assert.equal(cache.stats().misses, 1);
});

test('CR-73.2: a decision older than the age bound is re-reviewed', async () => {
  const dir = await runDirectory();
  const fp = '1'.repeat(64);
  const day = 86_400_000;
  const past = Date.parse('2026-01-01T00:00:00.000Z');
  const writer = await openReuseCache({ dir, enabled: true, now: () => past });
  await writer.put(entry(fp));

  const justInside = await openReuseCache({ dir, enabled: true, now: () => past + (DEFAULT_MAX_AGE_DAYS - 1) * day });
  assert.ok(justInside.get(fp), 'inside the bound the decision still holds');
  const tooOld = await openReuseCache({ dir, enabled: true, now: () => past + (DEFAULT_MAX_AGE_DAYS + 1) * day });
  assert.equal(tooOld.get(fp), null, 'code the fingerprint does not bind drifts — an old decision expires');
  assert.equal(tooOld.stats().expired, 1);
});

// --- the live-contract stage ------------------------------------------------

const contractUnits = (datasets) => datasets.map((dataset, i) => ({
  dataset, rows: 10 + i, examples: [`${dataset}#00001`], row: { id: dataset },
  sources: [{ url: `repo:${dataset}`, sha256: 'x'.repeat(64), content: '{}' }],
  fingerprint: unitFingerprint({ kind: 'live-contract', id: dataset, inputs: { rows_sha256: `rows-${dataset}` } }),
  captures: [`capture-${dataset}`],
}));
// Two core contracts for the ordinary path, two retainable ones for the withheld path.
const CONTRACT_UNITS = contractUnits(['aa', 'da']);
const RETAINABLE_UNITS = contractUnits(['aa_efficiency', 'chutes_efficiency']);

const acceptedResult = (dataset) => ({ accepted: true, fingerprints: [{ id: dataset }], quarantined: [], errors: [],
  reviews: [{ round: 1, verdict: 'pass' }], manifest: { artifact_id: `live-contract-${dataset}`, rounds_used: 1 } });

async function stage({ dir, units = CONTRACT_UNITS, result = acceptedResult, calls = [] }) {
  const runDir = await runDirectory('cr73-stage-');
  const cache = await openReuseCache({ dir, enabled: true });
  const outcome = await reviewLiveContracts({
    runDir, rawDir: runDir, units, limit: 2, log: silent, cache, runId: 'run-x',
    review: async ({ artifactId }) => { const dataset = artifactId.replace('live-contract-', ''); calls.push(dataset); return result(dataset); },
    retain: async ({ dataset, errors }) => ({ dataset, errors }),
  });
  return { outcome, calls, runDir };
}

test('CR-73.2: an unchanged unit reaches the same decision with no new worker call', async () => {
  const dir = await runDirectory('cr73-store-');
  const first = await stage({ dir });
  assert.deepEqual(first.calls, ['aa', 'da'], 'the first run reviews both contracts for real');
  assert.deepEqual(first.outcome.reused, []);

  const second = await stage({ dir });
  assert.deepEqual(second.calls, [], 'no worker call for a unit whose inputs have not moved');
  assert.equal(second.outcome.reviewed.length, 2);
  assert.equal(second.outcome.retained.length, 0);
  assert.equal(second.outcome.deterministic.length, 0);
  // Same decision, and the reused manifest says where it came from.
  assert.deepEqual(second.outcome.reviewed.map((r) => [r.dataset, r.accepted, r.fingerprints.length]),
    first.outcome.reviewed.map((r) => [r.dataset, r.accepted, r.fingerprints.length]));
  assert.equal(second.outcome.reused.length, 2);
  for (const reuse of second.outcome.reused) {
    assert.equal(reuse.accepted_run_id, 'run-x');
    assert.match(reuse.fingerprint, /^[0-9a-f]{64}$/);
    assert.deepEqual(reuse.captures, [`capture-${reuse.dataset}`]);
  }
  for (const review of second.outcome.reviewed) assert.equal(review.manifest.reused.reused, true);
  assert.equal(second.outcome.reuse_stats.hits, 2);
});

test('CR-73.2: a changed capture forces a fresh review of exactly that unit', async () => {
  const dir = await runDirectory('cr73-change-');
  await stage({ dir });
  const changed = CONTRACT_UNITS.map((unit) => unit.dataset !== 'da' ? unit : {
    ...unit, fingerprint: unitFingerprint({ kind: 'live-contract', id: 'da', inputs: { rows_sha256: 'rows-da-NEW' } }),
  });
  const second = await stage({ dir, units: changed });
  assert.deepEqual(second.calls, ['da'], 'only the unit whose bytes moved is reviewed again');
  assert.deepEqual(second.outcome.reused.map((r) => r.dataset), ['aa']);
});

test('CR-73.2: a withheld or fallback-accepted contract never becomes reusable', async () => {
  const dir = await runDirectory('cr73-withheld-');
  const rejected = (dataset) => ({ accepted: false, fingerprints: [], quarantined: [{ id: dataset }],
    errors: ['critic blocked the artifact'], reviews: [], manifest: { artifact_id: `live-contract-${dataset}`, rounds_used: 1 } });
  // A malformed reviewer for the whole round budget: accepted on the deterministic verification only.
  const unusable = (dataset) => ({ accepted: false, fingerprints: [], quarantined: [{ id: dataset, reason: 'not accepted within the round budget; retained out of published data' }],
    errors: ['round 1: malformed', 'round 2: malformed', 'round 3: malformed'], reviews: [], producer_disputed: [], objections: 0,
    manifest: { artifact_id: `live-contract-${dataset}`, rounds_used: 3 } });

  const withheld = await stage({ dir, units: RETAINABLE_UNITS, result: rejected });
  assert.equal(withheld.outcome.retained.length, 2);
  const again = await stage({ dir, units: RETAINABLE_UNITS, result: rejected });
  assert.deepEqual(again.calls, ['aa_efficiency', 'chutes_efficiency'], 'a withheld contract is asked again tomorrow, never reused');

  const fallbackDir = await runDirectory('cr73-fallback-');
  const fallback = await stage({ dir: fallbackDir, result: unusable });
  assert.equal(fallback.outcome.deterministic.length, 2);
  const fallbackAgain = await stage({ dir: fallbackDir, result: unusable });
  assert.deepEqual(fallbackAgain.calls, ['aa', 'da'], 'an acceptance without a model review is not a verified outcome');
});

test('CR-73.2: a missing cache reviews everything, and reuse off is the default', async () => {
  const runDir = await runDirectory('cr73-nocache-');
  const calls = [];
  const outcome = await reviewLiveContracts({
    runDir, rawDir: runDir, units: CONTRACT_UNITS, limit: 2, log: silent,
    review: async ({ artifactId }) => { calls.push(artifactId); return acceptedResult(artifactId.replace('live-contract-', '')); },
    retain: async () => ({}),
  });
  assert.equal(calls.length, 2, 'with no cache handed in, nothing is reused');
  assert.deepEqual(outcome.reused, []);
  assert.equal(outcome.reuse_stats.enabled, false);
});

// --- the unit builder binds the right things --------------------------------

const VERIFIER = [
  'const RAW_DEFAULT = 1;', 'async function verifyAa(', 'aa body', 'async function verifyDa(', 'da body',
  'async function verifyOr(', 'or body', 'async function verifyAaEfficiency(', 'function aaCarrierExtracts(',
  'async function verifyOrEfficiency(', 'async function verifyChutes(', '// Raw benchmarkRows',
  'function codingSourceRows(', '// --- evidence packets',
].join('\n');

function buildUnits({ verifier = VERIFIER, parser = 'parser v1', extract = 1, reviewerSource = 'gauntlet v1' } = {}) {
  const rows = [
    { row_id: 'aa#00001', pointer: '/models/0', staged: { a: 1 }, extract: { a: extract }, source: { url: 'https://aa/api', sha256: '1'.repeat(64), retrieved_at: new Date().toISOString() } },
    { row_id: 'aa#00002', pointer: '/models/1', staged: { a: 2 }, extract: { a: 2 }, source: { url: 'https://aa/api', sha256: '1'.repeat(64), retrieved_at: new Date().toISOString() } },
  ];
  return buildLiveContractUnits({
    manifest: { datasets: [{ dataset: 'aa', rows: rows.length }], coverage: { required_rows: rows.length, complete: true } },
    verified: { evidence: { packets: [{ dataset: 'aa', rows }] }, report: { run: { first_receipt: new Date().toISOString() } } },
    verifier, aaEfficiencyParser: parser, reviewerSource,
  });
}

test('CR-73.2: the built fingerprint ignores run-varying metadata and binds the reviewed code', () => {
  const [a] = buildUnits();
  const [b] = buildUnits();
  assert.equal(a.fingerprint, b.fingerprint, 'timestamps and receipt paths differ between runs and must not matter');
  assert.deepEqual(a.captures, ['1'.repeat(64)]);

  const [changedCode] = buildUnits({ verifier: VERIFIER + '\n// one more line' });
  assert.notEqual(changedCode.fingerprint, a.fingerprint, 'a change to the reviewed verifier invalidates the reuse');
  const [changedData] = buildUnits({ extract: 99 });
  assert.notEqual(changedData.fingerprint, a.fingerprint, 'a changed primary extract invalidates the reuse');
  const [changedReviewer] = buildUnits({ reviewerSource: 'gauntlet v2' });
  assert.notEqual(changedReviewer.fingerprint, a.fingerprint, 'a change to the code that asks the question invalidates the reuse');
});

test('CR-73.2: without the reviewer code version there is no fingerprint, so nothing is reused', () => {
  const [unit] = buildUnits({ reviewerSource: null });
  assert.equal(unit.fingerprint, null);
  assert.equal(vendorUnitFingerprint({ url: 'https://vendor.example/report', captureSha256: '9'.repeat(64),
    extractionParserSha256: 'p'.repeat(64), rows: SLOTS }), null);
});

test('CR-73.2: the criteria are part of the question being reused', () => {
  const [unit] = buildUnits();
  const withOtherCriteria = unitFingerprint({
    kind: 'live-contract', id: 'aa',
    inputs: { criteria: LIVE_CONTRACT_CRITERIA.map((c) => ({ id: c.id, text: c.text + '!' })) },
  });
  assert.notEqual(unit.fingerprint, withOtherCriteria);
  assert.equal(REUSE_CACHE_VERSION, '1');
});

// --- the vendor extraction unit ---------------------------------------------

const SLOTS = [
  { id: 'v1', benchmark_id: 'b', subject: 'model-a', unit: 'percent', protocol: 'pass@1', value: 91.2, source: { locator: 'Table 3, row 2' } },
  { id: 'v2', benchmark_id: 'b', subject: 'model-b', unit: 'percent', protocol: 'pass@1', value: 88.0, source: { locator: 'Table 3, row 3' } },
];
const vendorKey = (over = {}) => vendorUnitFingerprint({
  url: 'https://vendor.example/report', captureSha256: '9'.repeat(64), recipe: null,
  extractionParserSha256: 'p'.repeat(64), reviewerSource: 'gauntlet v1', rows: SLOTS, ...over,
});

test('CR-73.2 vendor: the key binds the capture, the local parser, the slots and the task', () => {
  const key = vendorKey();
  assert.equal(key, vendorKey(), 'identical inputs, identical key');
  assert.notEqual(vendorKey({ captureSha256: '8'.repeat(64) }), key, 'a changed capture re-extracts');
  assert.notEqual(vendorKey({ extractionParserSha256: 'q'.repeat(64) }), key, 'a changed extraction parser re-extracts');
  assert.notEqual(vendorKey({ recipe: 'deepseek-v3-table6' }), key, 'a changed recipe re-extracts');
  assert.notEqual(vendorKey({ url: 'https://vendor.example/other' }), key);
  assert.notEqual(vendorKey({ reviewerSource: 'gauntlet v2' }), key, 'a changed worker/policy code path re-extracts');
  assert.notEqual(vendorKey({ rows: [{ ...SLOTS[0], protocol: 'pass@5' }, SLOTS[1]] }), key, 'a changed slot protocol re-extracts');
  assert.notEqual(vendorKey({ rows: [SLOTS[0]] }), key, 'a dropped slot re-extracts');
});

test('CR-73.2 vendor: the locator is an output, not part of the question', () => {
  const moved = SLOTS.map((r) => ({ ...r, source: { locator: 'Table 4, somewhere else' } }));
  assert.equal(vendorKey({ rows: moved }), vendorKey());
});

test('CR-73.2 vendor: a cached extraction is only reusable while its numbers are the live ones', () => {
  const cached = { outcome: { values: [['v1', 91.2], ['v2', 88.0]], model: 'z-ai/glm-5.3-flash' } };
  assert.equal(vendorReusable(cached, SLOTS), true);
  assert.equal(vendorReusable(cached, [...SLOTS].reverse()), true, 'slot order is not a difference');
  assert.equal(vendorReusable(cached, [{ ...SLOTS[0], value: 91.3 }, SLOTS[1]]), false, 'a corrected value re-extracts');
  assert.equal(vendorReusable(cached, [{ ...SLOTS[0], value: null }, SLOTS[1]]), false, 'a withdrawn value re-extracts');
  assert.equal(vendorReusable(cached, SLOTS.slice(0, 1)), false, 'a dropped slot re-extracts');
  assert.equal(vendorReusable(null, SLOTS), false);
  assert.equal(vendorReusable({ outcome: {} }, SLOTS), false);
});
