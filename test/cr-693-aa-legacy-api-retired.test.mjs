// CR-693 (2026-11-05): Artificial Analysis retired its legacy /api/v2/data/* routes at 2026-11-04 23:59 UTC; the models
// route now answers 410 Gone. fetch-aa failed on it and the daily died at fetch-aa on 5 Nov, so no other source published.
// The supported replacement needs a Pro key (ours is Free) or a reviewed Free-tier migration that drops published fields.
//
// These tests pin the withheld path as a proof, not a bypass (same shape as CR-629):
//   * the daily withholds only with the collector's marker AND both staged AA files byte-identical to the run's copy of
//     the published snapshot; any other AA failure still fails closed;
//   * the live review re-derives the retirement from the captured 410 receipt of exactly the legacy route, and both
//     staged files must equal the snapshot the run started from with their own older dates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AA_LEGACY_API_RETIRED, AA_LEGACY_API_URL, aaLegacyApiRetiredMessage, isAaLegacyApiRetirement, AA_RETENTION_BASELINE, AA_RETAINED_EFFICIENCY_COLLECTED_AT } from '../lib/aa-legacy-api.mjs';
import { aaIndexVersionChangeMessage } from '../lib/aa-index-version.mjs';
import { readAaLegacyApiRetired } from '../ops/daily/daily.mjs';
import { verifyRetiredAa } from '../ops/daily/review-live.mjs';

const RUN_START = '2026-11-05T01:16:01.859Z';
const snapshot = () => ({ source: 'ArtificialAnalysis API v2', collected_at: '2026-11-04', index_version: '5.0', count: 1,
  models: [{ id: 'm0', name: 'Fixture 0', slug: 'fixture-0', evaluations: { artificial_analysis_intelligence_index: 50, gpqa: 0.5 }, pricing: { price_1m_input_tokens: 1, price_1m_output_tokens: 2 } }] });
const efficiency = () => ({ source_url: 'https://artificialanalysis.ai/models/fixture-0', collected_at: AA_RETAINED_EFFICIENCY_COLLECTED_AT, count: 1, rows: [{ source_id: 'm0' }] });

async function runFixture({ staged = {}, before = {} }) {
  const runDir = await mkdtemp(join(tmpdir(), 'cr693-'));
  const work = join(runDir, 'work');
  await mkdir(join(work, 'data/raw'), { recursive: true });
  await mkdir(join(runDir, 'before/raw'), { recursive: true });
  await mkdir(join(runDir, 'reports'));
  await writeFile(join(runDir, 'reports/dataset-before.json'), JSON.stringify({ generated_at: AA_RETENTION_BASELINE }));
  for (const [file, bytes] of Object.entries(staged)) await writeFile(join(work, 'data/raw', file), bytes);
  for (const [file, bytes] of Object.entries(before)) await writeFile(join(runDir, 'before/raw', file), bytes);
  return { runDir, work, runStart: RUN_START };
}
// Shaped like the step error daily.mjs builds from the collector's stderr tail.
const stepError = (detail) => new Error(`fetch-aa FAILED: → ArtificialAnalysis models …\n\nError: ${detail}\n    at fetchArtificialAnalysis (file:///x/scripts/fetch-live.mjs:91:9) {\n  status: 410\n}`);

test('the marker names the retired route', () => {
  assert.ok(aaLegacyApiRetiredMessage().startsWith(`${AA_LEGACY_API_RETIRED} (HTTP 410 at ${AA_LEGACY_API_URL};`));
});

test('the daily withholds only with the marker and both staged files byte-identical', async () => {
  const aa = JSON.stringify(snapshot(), null, 2) + '\n', eff = JSON.stringify(efficiency(), null, 2) + '\n';
  const files = { 'artificialanalysis.json': aa, 'aa-efficiency.json': eff };
  const error = stepError(aaLegacyApiRetiredMessage());
  const same = await runFixture({ staged: files, before: files });
  try {
    const retained = await readAaLegacyApiRetired({ ...same, error });
    assert.equal(retained.retained_collected_at, '2026-11-04');
    assert.equal(retained.efficiency_collected_at, AA_RETAINED_EFFICIENCY_COLLECTED_AT);
    assert.match(retained.reason, /HTTP 410/);
    // The pre-CR-693 error (plain HTTP 410, no marker), any other HTTP failure, and other AA markers fail closed here.
    for (const other of [`HTTP 410 for ${AA_LEGACY_API_URL}`, `HTTP 500 for ${AA_LEGACY_API_URL}`, `HTTP 403 for ${AA_LEGACY_API_URL}`,
      aaLegacyApiRetiredMessage().replace(AA_LEGACY_API_URL, 'https://example.org/other'),
      'AA m0: prior measurement gpqa absent; partial response or withdrawal requires review', aaIndexVersionChangeMessage('6.0')]) {
      assert.equal(await readAaLegacyApiRetired({ ...same, error: stepError(other) }), null, other);
    }
  } finally { await rm(same.runDir, { recursive: true, force: true }); }
  const moved = await runFixture({ staged: { ...files, 'artificialanalysis.json': aa.replace('2026-11-04', '2026-11-05') }, before: files });
  const effMoved = await runFixture({ staged: { ...files, 'aa-efficiency.json': eff.replace('"count": 1', '"count": 2') }, before: files });
  const missing = await runFixture({ staged: { 'artificialanalysis.json': aa }, before: files });
  try {
    for (const d of [moved, effMoved, missing]) assert.equal(await readAaLegacyApiRetired({ ...d, error }), null);
  } finally { for (const d of [moved, effMoved, missing]) await rm(d.runDir, { recursive: true, force: true }); }
});

test('the live review proves the withholding from the captured 410 and the starting snapshots', async () => {
  const fixture = await runFixture({});
  const beforeDir = join(fixture.runDir, 'before/raw');
  try {
    await writeFile(join(beforeDir, 'artificialanalysis.json'), JSON.stringify(snapshot()));
    await writeFile(join(beforeDir, 'aa-efficiency.json'), JSON.stringify(efficiency()));
    const src = { beforeDir };
    const receipt = (extra = {}) => ({ url: AA_LEGACY_API_URL, method: 'GET', status: 410, sha256: 'f'.repeat(64), fetched_at: RUN_START, body: '{"error":"Gone"}', ...extra });
    const args = (apiReceipt, staged = snapshot(), stagedEfficiency = efficiency()) => ({ staged, stagedEfficiency, src, runStart: RUN_START, apiReceipt });
    const withheld = await verifyRetiredAa(args(receipt()));
    assert.deepEqual({ ...withheld, source: undefined }, { cause: 'legacy_api_retired', retained_collected_at: '2026-11-04',
      efficiency_collected_at: AA_RETAINED_EFFICIENCY_COLLECTED_AT, models: 1, source: undefined });
    // No receipt, a 200, another status, or a 410 from another URL is the ordinary path, which requires a usable capture.
    for (const r of [undefined, receipt({ status: 200 }), receipt({ status: 404 }), receipt({ url: 'https://artificialanalysis.ai/api/v2/data/media/text-to-image' }), receipt({ method: 'POST' })]) {
      assert.equal(isAaLegacyApiRetirement(r), false);
      assert.equal(await verifyRetiredAa(args(r)), null);
    }
    // The staged snapshots may not contribute one new value, nor claim this run's freshness.
    const changed = snapshot(); changed.models[0].evaluations.gpqa = 0.6;
    await assert.rejects(verifyRetiredAa(args(receipt(), changed)), /aa withheld snapshot equals the snapshot this run started from/);
    const effChanged = efficiency(); effChanged.rows.push({ source_id: 'm1' });
    await assert.rejects(verifyRetiredAa(args(receipt(), snapshot(), effChanged)), /aa-efficiency withheld snapshot equals/);
    const redated = { ...snapshot(), collected_at: '2026-11-05T02:00:00Z' };
    await writeFile(join(beforeDir, 'artificialanalysis.json'), JSON.stringify(redated));
    await assert.rejects(verifyRetiredAa(args(receipt(), redated)), /claims this run's freshness/);
  } finally { await rm(fixture.runDir, { recursive: true, force: true }); }
});


test('CR-705 window: 5 Nov to 6 Dec from any published dataset since the baseline; outside it fails closed', async () => {
  const aa = JSON.stringify(snapshot()), eff = JSON.stringify(efficiency());
  const files = { 'artificialanalysis.json': aa, 'aa-efficiency.json': eff };
  const fixture = await runFixture({ staged: files, before: files });
  const proof = join(fixture.runDir, 'reports/dataset-before.json');
  const apiReceipt = { url: AA_LEGACY_API_URL, status: 410, method: 'GET', fetched_at: RUN_START };
  const error = stepError(aaLegacyApiRetiredMessage());
  const verify = (runStart = RUN_START) => verifyRetiredAa({ staged: snapshot(), stagedEfficiency: efficiency(),
    src: { beforeDir: join(fixture.runDir, 'before/raw') }, runStart, apiReceipt });
  try {
    assert.ok(await readAaLegacyApiRetired({ ...fixture, error }));
    // Later dailies in the window start from a dataset a previous daily published.
    await writeFile(proof, JSON.stringify({ generated_at: '2026-11-05T17:19:30.190Z' }));
    for (const runStart of ['2026-11-06T01:14:00Z', '2026-12-06T23:59:59Z']) {
      assert.ok(await readAaLegacyApiRetired({ ...fixture, error, runStart }));
      assert.ok(await verify(runStart));
    }
    for (const runStart of ['2026-11-04T23:59:59Z', '2026-12-07T00:00:00Z', undefined, 'invalid']) {
      assert.equal(await readAaLegacyApiRetired({ ...fixture, error, runStart }), null);
      if (runStart) await assert.rejects(verify(runStart), /retention window/);
    }
    // A dataset older than the baseline, from the future, or no valid proof is denied.
    for (const generated_at of ['2026-11-04T09:00:00Z', '2026-11-06T09:00:00Z', null, 'invalid']) {
      await writeFile(proof, JSON.stringify({ generated_at }));
      assert.equal(await readAaLegacyApiRetired({ ...fixture, error, runStart: '2026-11-06T01:14:00Z' }), null);
      await assert.rejects(verify('2026-11-06T01:14:00Z'), /retention window/);
    }
    await rm(proof);
    assert.equal(await readAaLegacyApiRetired({ ...fixture, error }), null);
    await assert.rejects(verify(), /ENOENT/);
  } finally { await rm(fixture.runDir, { recursive: true, force: true }); }
});

test('CR-705 pins the 4 Nov snapshot: any other retained AA date fails closed in daily and review', async () => {
  const other = { ...snapshot(), collected_at: '2026-11-03' };
  const files = { 'artificialanalysis.json': JSON.stringify(other), 'aa-efficiency.json': JSON.stringify(efficiency()) };
  const fixture = await runFixture({ staged: files, before: files });
  try {
    assert.equal(await readAaLegacyApiRetired({ ...fixture, error: stepError(aaLegacyApiRetiredMessage()) }), null);
    await assert.rejects(verifyRetiredAa({ staged: other, stagedEfficiency: efficiency(),
      src: { beforeDir: join(fixture.runDir, 'before/raw') }, runStart: RUN_START,
      apiReceipt: { url: AA_LEGACY_API_URL, status: 410, method: 'GET', fetched_at: RUN_START } }), /pinned 4 Nov AA snapshot/);
  } finally { await rm(fixture.runDir, { recursive: true, force: true }); }
});
