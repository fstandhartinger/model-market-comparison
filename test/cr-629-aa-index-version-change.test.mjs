// CR-629 (2026-10-31): Artificial Analysis moved its Intelligence Index from v4.x to v5.0 on 2026-10-28 and withdrew
// most index values plus every Coding and Math Index value. fetch-aa refused the response, correctly, and the daily
// died at fetch-aa from 28 to 31 Oct, so no other source published either.
//
// These tests pin the withheld path as a proof, not a bypass (same shape as CR-542):
//   * only a leaderboard that names one other major index version in every statement is a version change;
//     an absent, mixed or v4.x statement never is, and the ordinary withdrawal check then fails closed;
//   * the daily withholds only with the marker AND both staged AA files byte-identical to the run's copy of the
//     published snapshot;
//   * the live review re-derives the version change from the captured page bytes, and both staged files must equal
//     the snapshot the run started from with their own older dates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AA_INDEX_VERSION_CHANGED, aaIndexPageVersions, aaIndexVersionChangeMessage, changedAaIndexVersion } from '../lib/aa-index-version.mjs';
import { readAaIndexVersionChange } from '../ops/daily/daily.mjs';
import { verifyWithheldAa } from '../ops/daily/review-live.mjs';

const RUN_START = '2026-10-31T00:41:02.310Z';
// Synthetic fixtures shaped like the captured leaderboard Flight payload, deliberately not benchmark observations.
const page = (...versions) => `<script>self.__next_f.push([1,${JSON.stringify(JSON.stringify(versions.map((v, i) =>
  i === 0 ? { description: `Updated to Intelligence Index v${v}` } : { slug: 'artificial-analysis-intelligence-index', name: `Artificial Analysis Intelligence Index v${v}` })))}])</script>`;
const snapshot = () => ({ source: 'ArtificialAnalysis API v2', collected_at: '2026-10-27', count: 1,
  models: [{ id: 'm0', name: 'Fixture 0', slug: 'fixture-0', evaluations: { artificial_analysis_intelligence_index: 50, gpqa: 0.5 }, pricing: { price_1m_input_tokens: 1, price_1m_output_tokens: 2 } }] });
const efficiency = () => ({ source_url: 'https://artificialanalysis.ai/models/fixture-0', collected_at: '2026-10-27T01:00:00.000Z', count: 1, rows: [{ source_id: 'm0' }] });

// CR-634 (2026-10-31): v5.0 was adopted after review (Florian, card #19017); the pin is now 5. The same rules hold one
// major version later: a v6 page, or a page back on v4, is a version change; absent, mixed or v5.x statements are not.
test('a page naming one other major version everywhere is a version change; the marker names it', () => {
  assert.deepEqual(aaIndexPageVersions(page('6', '6.0', '6.0')), ['6', '6.0', '6.0']);
  assert.equal(changedAaIndexVersion(aaIndexPageVersions(page('6', '6.0', '6.0'))), '6.0');
  assert.equal(changedAaIndexVersion(['6.1']), '6.1');
  assert.equal(changedAaIndexVersion(aaIndexPageVersions(page('4.3.2'))), '4.3.2');
  assert.ok(aaIndexVersionChangeMessage('6.0').startsWith(`${AA_INDEX_VERSION_CHANGED} (page states v6.0, collector pinned to v5.x)`));
});

test('absent, mixed or v5.x statements are never a version change', () => {
  for (const html of [page(), page('5.0'), page('5', '5.0'), page('6.0', '5.0'), page('5.0', '4.3.2'), '<html>no statement</html>']) {
    assert.equal(changedAaIndexVersion(aaIndexPageVersions(html)), null, html);
  }
  // A minor version (5.0 → 5.1) rolls in as before; only the major version is pinned.
  assert.equal(changedAaIndexVersion(['5.1']), null);
  assert.throws(() => aaIndexPageVersions(''), /leaderboard page missing/);
});

async function runFixture({ staged = {}, before = {} }) {
  const runDir = await mkdtemp(join(tmpdir(), 'cr629-'));
  const work = join(runDir, 'work');
  await mkdir(join(work, 'data/raw'), { recursive: true });
  await mkdir(join(runDir, 'before/raw'), { recursive: true });
  for (const [file, bytes] of Object.entries(staged)) await writeFile(join(work, 'data/raw', file), bytes);
  for (const [file, bytes] of Object.entries(before)) await writeFile(join(runDir, 'before/raw', file), bytes);
  return { runDir, work };
}
const stepError = (detail) => new Error(`fetch-aa FAILED: Error: ${detail}`);

test('the daily withholds only with the marker and both staged files byte-identical', async () => {
  const aa = JSON.stringify(snapshot(), null, 2) + '\n', eff = JSON.stringify(efficiency(), null, 2) + '\n';
  const files = { 'artificialanalysis.json': aa, 'aa-efficiency.json': eff };
  const error = stepError(`${aaIndexVersionChangeMessage('6.0')}: a new index methodology needs review`);
  const same = await runFixture({ staged: files, before: files });
  try {
    const retained = await readAaIndexVersionChange({ ...same, error });
    assert.equal(retained.page_version, '6.0');
    assert.equal(retained.pinned_version, '5.x');
    assert.equal(retained.retained_collected_at, '2026-10-27');
    assert.equal(retained.efficiency_collected_at, '2026-10-27T01:00:00.000Z');
    // The ordinary withdrawal error (no marker) still fails the run closed.
    assert.equal(await readAaIndexVersionChange({ ...same, error: stepError('AA m0: prior measurement artificial_analysis_coding_index absent; partial response or withdrawal requires review') }), null);
    // A marker for another pin is not this collector's.
    assert.equal(await readAaIndexVersionChange({ ...same, error: stepError(`${AA_INDEX_VERSION_CHANGED} (page states v5.0, collector pinned to v4.x)`) }), null);
  } finally { await rm(same.runDir, { recursive: true, force: true }); }
  const moved = await runFixture({ staged: { ...files, 'artificialanalysis.json': aa.replace('2026-10-27', '2026-10-31') }, before: files });
  const effMoved = await runFixture({ staged: { ...files, 'aa-efficiency.json': eff.replace('"count": 1', '"count": 2') }, before: files });
  const missing = await runFixture({ staged: { 'artificialanalysis.json': aa }, before: files });
  try {
    for (const d of [moved, effMoved, missing]) assert.equal(await readAaIndexVersionChange({ ...d, error }), null);
  } finally { for (const d of [moved, effMoved, missing]) await rm(d.runDir, { recursive: true, force: true }); }
});

test('the live review proves the withholding from the captured page and the starting snapshots', async () => {
  const beforeDir = await mkdtemp(join(tmpdir(), 'cr629-before-'));
  try {
    await writeFile(join(beforeDir, 'artificialanalysis.json'), JSON.stringify(snapshot()));
    await writeFile(join(beforeDir, 'aa-efficiency.json'), JSON.stringify(efficiency()));
    const src = { beforeDir };
    const lbReceipt = (body) => ({ url: 'https://artificialanalysis.ai/leaderboards/models', sha256: 'f'.repeat(64), fetched_at: RUN_START, body });
    const args = (body, staged = snapshot(), stagedEfficiency = efficiency()) => ({ staged, stagedEfficiency, src, runStart: RUN_START, lbReceipt: lbReceipt(body) });
    const withheld = await verifyWithheldAa(args(page('6', '6.0')));
    assert.deepEqual({ ...withheld, source: undefined }, { retained_collected_at: '2026-10-27', efficiency_collected_at: '2026-10-27T01:00:00.000Z',
      page_version: '6.0', pinned_version: '5.x', models: 1, source: undefined });
    // A v5.x or mixed page is the ordinary path, which then checks every row against the capture.
    assert.equal(await verifyWithheldAa(args(page('5.0'))), null);
    assert.equal(await verifyWithheldAa(args(page('6.0', '5.0'))), null);
    // The staged snapshots may not contribute one new value, nor claim this run's freshness.
    const changed = snapshot(); changed.models[0].evaluations.artificial_analysis_intelligence_index = 41;
    await assert.rejects(verifyWithheldAa(args(page('6.0'), changed)), /aa withheld snapshot equals the snapshot this run started from/);
    const effChanged = efficiency(); effChanged.rows.push({ source_id: 'm1' });
    await assert.rejects(verifyWithheldAa(args(page('6.0'), snapshot(), effChanged)), /aa-efficiency withheld snapshot equals/);
    const redated = { ...snapshot(), collected_at: '2026-10-31T01:00:00Z' };
    await writeFile(join(beforeDir, 'artificialanalysis.json'), JSON.stringify(redated));
    await assert.rejects(verifyWithheldAa(args(page('6.0'), redated)), /claims this run's freshness/);
  } finally { await rm(beforeDir, { recursive: true, force: true }); }
});
