// CR-709 (2026-11-07): AA's Coding Agent Index v2.0 board dropped one published row (Mistral Large 4 (High),
// Mistral Vibe) and relabelled the retained Medium row as High. The collector refused the 33-row board against the
// 34-row snapshot, correctly, and the daily died at fetch-coding-v2.0 three runs in a row.
//
// These tests pin the withheld path as a proof, not a bypass:
//   * the collector still refuses every shrink; only a small pure removal of known identities with every
//     captured row valid carries the roster-shrink marker;
//   * the daily withholds only with the marker, a byte-identical staged snapshot and a snapshot inside the window;
//   * the live review re-derives the removal from the captured page and the starting snapshot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CODING_AGENT_ROSTER_SHRANK, CODING_AGENT_SHRINK_RETENTION_DAYS, codingAgentShrinkRetentionAllowed, parseCodingAgents } from '../lib/aa-coding-agents.mjs';
import { refreshCodingAgents } from '../scripts/fetch-aa-coding-agents.mjs';
import { readCodingAgentRosterShrink } from '../ops/daily/daily.mjs';
import { verifyWithheldCoding } from '../ops/daily/review-live.mjs';

const RUN_START = '2026-11-07T01:16:45.880Z';
// Synthetic fixtures, deliberately not benchmark observations.
const rows = (n = 16) => Array.from({ length: n }, (_, i) => ({
  id: `synthetic-${i}`, display: { model: `Fixture ${i}` }, agentName: 'Fixture harness', indexScore: 0.5, indexComponentCount: 3, evalCount: 3,
  evals: ['frontiercode-v1.1-main', 'swe-atlas-qna', 'terminal-bench-v4'].map((datasetIndexName) => ({ datasetIndexName, mean: { reward: 0.5 }, weight: 1 / 3 })),
}));
const page = (items = rows()) => {
  const records = `a:${JSON.stringify(['$', 'div', null, { rows: items }])}\nb:${JSON.stringify({ title: 'Performance', description: 'Performance across the Artificial Analysis Coding Agent Index.', change: '$undefined', benchmarkRows: items.map((_, i) => `$a:props:rows:${i}`) })}\n`;
  return '<span>Artificial Analysis Coding Agent Index v2.0 incorporates 3 benchmarks · Higher is better</span>'
    + `<script>self.__next_f.push(${JSON.stringify([1, records])})</script>`;
};
const published = () => ({ ...parseCodingAgents(page()), collected_at: '2026-11-05' });
const without = (...drop) => rows().filter((_, i) => !drop.includes(i));

test('a small pure removal is still refused, now with the roster-shrink marker', () => {
  const previous = published();
  assert.throws(() => parseCodingAgents(page(without(3)), previous),
    (e) => e.message === `${CODING_AGENT_ROSTER_SHRANK} (15 of 16 published rows; removed synthetic-3): AA Coding Agent incomplete scrape: 15 rows (minimum 16)`);
  // A relabelled retained identity is not a new identity: the removal still classifies.
  const relabelled = without(3); relabelled[4].display.model = 'Fixture 4 renamed';
  assert.throws(() => parseCodingAgents(page(relabelled), previous), (e) => e.message.startsWith(`${CODING_AGENT_ROSTER_SHRANK} (15 of 16 published rows; removed synthetic-3)`));
  assert.throws(() => parseCodingAgents(page(without(3, 7)), previous), /removed synthetic-3,synthetic-7\): AA Coding Agent incomplete scrape/);
});

test('larger drops, new identities, invalid rows or a rowless previous never carry the marker', () => {
  const previous = published();
  const plain = (fn) => assert.throws(fn, (e) => /incomplete scrape|invalid|mismatch/.test(e.message) && !e.message.includes(CODING_AGENT_ROSTER_SHRANK));
  plain(() => parseCodingAgents(page(without(1, 2, 3)), previous));
  const swapped = without(3, 4); swapped.push({ ...rows()[0], id: 'synthetic-new' });
  plain(() => parseCodingAgents(page(swapped), previous));
  const invalid = without(3); invalid[0].indexScore = 0.7;
  plain(() => parseCodingAgents(page(invalid), previous));
  plain(() => parseCodingAgents(page(without(3)), { version: '2.0', count: 16 }));
  plain(() => parseCodingAgents(page(rows(12)), null));
  // A full board is the ordinary path.
  assert.equal(parseCodingAgents(page(), previous).count, 16);
});

test('the refusal never overwrites the published snapshot', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cr709-'));
  try {
    const target = join(dir, 'snapshot.json');
    const original = JSON.stringify(published(), null, 2);
    await writeFile(target, original);
    await assert.rejects(refreshCodingAgents({ target, html: page(without(3)) }), new RegExp(CODING_AGENT_ROSTER_SHRANK));
    assert.equal(await (await import('node:fs/promises')).readFile(target, 'utf8'), original);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('retention window is bounded and never covers a future snapshot', () => {
  assert.equal(codingAgentShrinkRetentionAllowed(RUN_START, '2026-11-05'), true);
  assert.equal(codingAgentShrinkRetentionAllowed(RUN_START, '2026-10-25'), true);
  assert.equal(CODING_AGENT_SHRINK_RETENTION_DAYS, 14);
  assert.equal(codingAgentShrinkRetentionAllowed(RUN_START, '2026-10-23'), false);
  assert.equal(codingAgentShrinkRetentionAllowed(RUN_START, '2026-11-08'), false);
  assert.equal(codingAgentShrinkRetentionAllowed(RUN_START, null), false);
});

async function runFixture({ staged, before }) {
  const runDir = await mkdtemp(join(tmpdir(), 'cr709-run-'));
  const work = join(runDir, 'work');
  await mkdir(join(work, 'data/raw'), { recursive: true });
  await mkdir(join(runDir, 'before/raw'), { recursive: true });
  if (staged !== undefined) await writeFile(join(work, 'data/raw/aa-coding-agents-v2.0.json'), staged);
  if (before !== undefined) await writeFile(join(runDir, 'before/raw/aa-coding-agents-v2.0.json'), before);
  return { runDir, work };
}
const stepError = (detail) => new Error(`fetch-coding-v2.0 FAILED: AA CODING AGENT REFRESH FAILED: ${detail}`);

test('the daily withholds only with the marker, a byte-identical snapshot and inside the window', async () => {
  const bytes = JSON.stringify(published(), null, 2) + '\n';
  let error; try { parseCodingAgents(page(without(3)), published()); } catch (e) { error = stepError(e.message); }
  const same = await runFixture({ staged: bytes, before: bytes });
  try {
    const retained = await readCodingAgentRosterShrink({ ...same, error, runStart: RUN_START });
    assert.deepEqual(retained.removed, ['synthetic-3']);
    assert.equal(retained.rows, 15);
    assert.equal(retained.previous_count, 16);
    assert.equal(retained.retained_collected_at, '2026-11-05');
    assert.match(retained.reason, /stays with its own date/);
    assert.equal(await readCodingAgentRosterShrink({ ...same, error: stepError('AA Coding Agent incomplete scrape: 13 rows (minimum 16)'), runStart: RUN_START }), null);
    assert.equal(await readCodingAgentRosterShrink({ ...same, error, runStart: '2026-11-20T01:00:00Z' }), null);
  } finally { await rm(same.runDir, { recursive: true, force: true }); }
  const moved = await runFixture({ staged: bytes.replace('2026-11-05', '2026-11-07'), before: bytes });
  const missing = await runFixture({ staged: bytes });
  try {
    assert.equal(await readCodingAgentRosterShrink({ ...moved, error, runStart: RUN_START }), null);
    assert.equal(await readCodingAgentRosterShrink({ ...missing, error, runStart: RUN_START }), null);
  } finally { for (const d of [moved, missing]) await rm(d.runDir, { recursive: true, force: true }); }
});

test('the live review proves the shrink withholding from the captured page and the starting snapshot', async () => {
  const beforeDir = await mkdtemp(join(tmpdir(), 'cr709-before-'));
  try {
    await writeFile(join(beforeDir, 'aa-coding-agents-v2.0.json'), JSON.stringify(published()));
    const src = { beforeDir };
    const receipt = (body) => ({ url: 'https://artificialanalysis.ai/agents/coding-agents', sha256: 'f'.repeat(64), fetched_at: RUN_START, body });
    const withheld = await verifyWithheldCoding({ staged: published(), src, runStart: RUN_START, receipt: receipt(page(without(3))) });
    assert.deepEqual({ ...withheld, source: undefined }, { retained_collected_at: '2026-11-05', removed: ['synthetic-3'], page_rows: 15, pinned_version: '2.0', rows: 16, source: undefined });
    // A full page is the ordinary path; a larger drop is not withheld (the ordinary path then fails closed).
    assert.equal(await verifyWithheldCoding({ staged: published(), src, runStart: RUN_START, receipt: receipt(page()) }), null);
    assert.equal(await verifyWithheldCoding({ staged: published(), src, runStart: RUN_START, receipt: receipt(page(without(1, 2, 3))) }), null);
    const changed = published(); changed.rows[0].score = 0.6;
    await assert.rejects(verifyWithheldCoding({ staged: changed, src, runStart: RUN_START, receipt: receipt(page(without(3))) }), /equals the snapshot this run started from/);
    await assert.rejects(verifyWithheldCoding({ staged: published(), src, runStart: '2026-11-25T00:00:00Z', receipt: receipt(page(without(3))) }), /retention window/);
  } finally { await rm(beforeDir, { recursive: true, force: true }); }
});
