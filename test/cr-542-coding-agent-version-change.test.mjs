// CR-542 (2026-10-23): Artificial Analysis replaced Coding Agent Index v1.5 by v2.0 (FrontierCode v1.1,
// Terminal-Bench 4.0, SWE-Atlas). The v1.5 collector refused the page, correctly, and the daily died at
// fetch-coding-v1.5 three runs in a row, so no source published that day.
//
// These tests pin the withheld path as a proof, not a bypass:
//   * only a page that names one other version in every statement carries the version-change marker;
//     an absent, mixed or partial version statement still fails closed without it;
//   * the daily withholds only with the marker AND a staged v1.5 file byte-identical to the run's copy
//     of the published snapshot;
//   * the live review re-derives the version change from the captured page bytes, and the staged v1.5
//     snapshot must equal the snapshot the run started from with its own older date.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CODING_AGENT_VERSION_CHANGED, changedCodingAgentVersion, codingAgentPageVersions, parseCodingAgents } from '../lib/aa-coding-agents.mjs';
import { readCodingAgentVersionChange } from '../ops/daily/daily.mjs';
import { verifyWithheldCodingV15 } from '../ops/daily/review-live.mjs';

const RUN_START = '2026-10-23T01:15:48.365Z';
// Synthetic fixtures, deliberately not benchmark observations.
const rows = (components = ['deep-swe-v1.1', 'swe-atlas-qna', 'terminal-bench-v4']) => Array.from({ length: 13 }, (_, i) => ({
  id: `synthetic-${i}`, display: { model: `Fixture ${i}` }, agentName: 'Fixture harness', indexScore: 0.5, indexComponentCount: 3, evalCount: 3,
  evals: components.map((datasetIndexName) => ({ datasetIndexName, mean: { reward: 0.5 }, weight: 1 / 3 })),
}));
const page = ({ badge = null, subtitle = null, items = rows() } = {}) => {
  const change = badge ? { description: `Coding Agent Index v${badge}:` } : '$undefined';
  const records = `a:${JSON.stringify(['$', 'div', null, { rows: items }])}\nb:${JSON.stringify({ title: 'Performance', description: 'Performance across the Artificial Analysis Coding Agent Index.', change, benchmarkRows: items.map((_, i) => `$a:props:rows:${i}`) })}\n`;
  const head = subtitle ? `<span>Artificial Analysis Coding Agent Index v${subtitle} incorporates 3 benchmarks · Higher is better</span>` : '';
  return head + `<script>self.__next_f.push(${JSON.stringify([1, records])})</script>`;
};
const V20 = () => page({ subtitle: '2.0', items: rows(['frontiercode-v1.1', 'swe-atlas-qna', 'terminal-bench-v4']) });
const published = () => ({ source: 'ArtificialAnalysis Coding Agent Index', version: '1.5', collected_at: '2026-10-22', count: 1,
  rows: [{ source_id: 's0', model_name: 'Fixture 0', harness: 'Fixture harness', score: 0.5, complete: true }] });

test('a page that names one other version everywhere carries the version-change marker', () => {
  assert.throws(() => parseCodingAgents(V20()), (e) => e.message.startsWith(`${CODING_AGENT_VERSION_CHANGED} (page states v2.0, collector pinned to v1.5)`) && /version absent or changed/.test(e.message));
  assert.throws(() => parseCodingAgents(page({ badge: '2.0', subtitle: '2.0' })), new RegExp(CODING_AGENT_VERSION_CHANGED));
  assert.equal(changedCodingAgentVersion(codingAgentPageVersions(V20())), '2.0');
});

test('absent, mixed or expected version statements never carry the marker', () => {
  for (const html of [page(), page({ badge: '1.6', subtitle: '1.5' }), page({ badge: '1.5', subtitle: '2.0' })]) {
    assert.equal(changedCodingAgentVersion(codingAgentPageVersions(html)), null);
    assert.throws(() => parseCodingAgents(html), (e) => !e.message.includes(CODING_AGENT_VERSION_CHANGED));
  }
  // A page without a Flight payload is a broken capture, never a version change.
  assert.throws(() => codingAgentPageVersions('<html>unavailable</html>'), /Flight payload missing/);
  assert.throws(() => parseCodingAgents('<html>unavailable</html>'), (e) => !e.message.includes(CODING_AGENT_VERSION_CHANGED));
  assert.equal(parseCodingAgents(page({ subtitle: '1.5' })).version, '1.5');
});

async function runFixture({ staged, before }) {
  const runDir = await mkdtemp(join(tmpdir(), 'cr542-'));
  const work = join(runDir, 'work');
  await mkdir(join(work, 'data/raw'), { recursive: true });
  await mkdir(join(runDir, 'before/raw'), { recursive: true });
  if (staged !== undefined) await writeFile(join(work, 'data/raw/aa-coding-agents-v1.5.json'), staged);
  if (before !== undefined) await writeFile(join(runDir, 'before/raw/aa-coding-agents-v1.5.json'), before);
  return { runDir, work };
}
const stepError = (detail) => new Error(`fetch-coding-v1.5 FAILED: AA CODING AGENT REFRESH FAILED: ${detail}`);

test('the daily withholds only with the marker and a byte-identical staged snapshot', async () => {
  const bytes = JSON.stringify(published(), null, 2) + '\n';
  let error; try { parseCodingAgents(V20()); } catch (e) { error = stepError(e.message); }
  const same = await runFixture({ staged: bytes, before: bytes });
  try {
    const retained = await readCodingAgentVersionChange({ ...same, error });
    assert.equal(retained.page_version, '2.0');
    assert.equal(retained.pinned_version, '1.5');
    assert.equal(retained.retained_collected_at, '2026-10-22');
    assert.equal(await readCodingAgentVersionChange({ ...same, error: stepError('AA Coding Agent version absent or changed; review methodology before updating the collector') }), null);
    assert.equal(await readCodingAgentVersionChange({ ...same, error: stepError('AA Coding Agent incomplete scrape: 3 rows (minimum 42)') }), null);
  } finally { await rm(same.runDir, { recursive: true, force: true }); }
  const moved = await runFixture({ staged: bytes.replace('2026-10-22', '2026-10-23'), before: bytes });
  const missing = await runFixture({ staged: bytes });
  try {
    assert.equal(await readCodingAgentVersionChange({ ...moved, error }), null);
    assert.equal(await readCodingAgentVersionChange({ ...missing, error }), null);
  } finally { for (const d of [moved, missing]) await rm(d.runDir, { recursive: true, force: true }); }
});

test('the live review proves the withholding from the captured page and the starting snapshot', async () => {
  const beforeDir = await mkdtemp(join(tmpdir(), 'cr542-before-'));
  try {
    await writeFile(join(beforeDir, 'aa-coding-agents-v1.5.json'), JSON.stringify(published()));
    const src = { beforeDir };
    const receipt = (body) => ({ url: 'https://artificialanalysis.ai/agents/coding-agents', sha256: 'f'.repeat(64), fetched_at: RUN_START, body });
    const withheld = await verifyWithheldCodingV15({ staged: published(), src, runStart: RUN_START, receipt: receipt(V20()) });
    assert.deepEqual({ ...withheld, source: undefined }, { retained_collected_at: '2026-10-22', page_version: '2.0', pinned_version: '1.5', rows: 1, source: undefined });
    // A v1.5 page is the ordinary path: no withholding.
    assert.equal(await verifyWithheldCodingV15({ staged: published(), src, runStart: RUN_START, receipt: receipt(page({ subtitle: '1.5' })) }), null);
    // A mixed page is not a version change either; the ordinary path then fails closed on it.
    assert.equal(await verifyWithheldCodingV15({ staged: published(), src, runStart: RUN_START, receipt: receipt(page({ badge: '1.5', subtitle: '2.0' })) }), null);
    // The staged snapshot may not contribute one new value, nor claim this run's freshness.
    const changed = published(); changed.rows[0].score = 0.6;
    await assert.rejects(verifyWithheldCodingV15({ staged: changed, src, runStart: RUN_START, receipt: receipt(V20()) }), /equals the snapshot this run started from/);
    const redated = { ...published(), collected_at: '2026-10-23T02:00:00Z' };
    await writeFile(join(beforeDir, 'aa-coding-agents-v1.5.json'), JSON.stringify(redated));
    await assert.rejects(verifyWithheldCodingV15({ staged: redated, src, runStart: RUN_START, receipt: receipt(V20()) }), /claims this run's freshness/);
  } finally { await rm(beforeDir, { recursive: true, force: true }); }
});
