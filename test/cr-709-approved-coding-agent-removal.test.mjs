// Lead decision 2026-11-09: one reviewed AA removal (Mistral Large 4 (High), Mistral Vibe) is accepted.
// Synthetic fixtures; the approved id is the real one because the allowlist is keyed by it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { APPROVED_CODING_AGENT_REMOVALS, CODING_AGENT_ROSTER_SHRANK, parseCodingAgents } from '../lib/aa-coding-agents.mjs';
import { refreshCodingAgents } from '../scripts/fetch-aa-coding-agents.mjs';
import { verifyWithheldCoding } from '../ops/daily/review-live.mjs';

const APPROVED = '9fcf1e000a8ac75cca614977bcac25da';
const RUN_START = '2026-11-09T01:16:45.880Z';
const rows = (n = 16) => Array.from({ length: n }, (_, i) => ({
  id: i === 0 ? APPROVED : `synthetic-${i}`, display: { model: `Fixture ${i}` }, agentName: 'Fixture harness', indexScore: 0.5, indexComponentCount: 3, evalCount: 3,
  evals: ['frontiercode-v1.1-main', 'swe-atlas-qna', 'terminal-bench-v4'].map((datasetIndexName) => ({ datasetIndexName, mean: { reward: 0.5 }, weight: 1 / 3 })),
}));
const page = (items = rows()) => {
  const records = `a:${JSON.stringify(['$', 'div', null, { rows: items }])}\nb:${JSON.stringify({ title: 'Performance', description: 'Performance across the Artificial Analysis Coding Agent Index.', change: '$undefined', benchmarkRows: items.map((_, i) => `$a:props:rows:${i}`) })}\n`;
  return '<span>Artificial Analysis Coding Agent Index v2.0 incorporates 3 benchmarks · Higher is better</span>'
    + `<script>self.__next_f.push(${JSON.stringify([1, records])})</script>`;
};
const published = () => ({ ...parseCodingAgents(page()), collected_at: '2026-11-05' });
const without = (...drop) => rows().filter((r) => !drop.includes(r.id));

test('the allowlist is frozen and names the reviewed row only', () => {
  assert.deepEqual(Object.keys(APPROVED_CODING_AGENT_REMOVALS), [APPROVED]);
  assert.ok(Object.isFrozen(APPROVED_CODING_AGENT_REMOVALS));
});

test('an approved-only removal succeeds with the smaller board', () => {
  const next = parseCodingAgents(page(without(APPROVED)), published());
  assert.equal(next.count, 15);
  assert.equal(next.rows.length, 15);
  assert.ok(!next.rows.some((r) => r.source_id === APPROVED));
  // The next run compares against the new, smaller snapshot.
  assert.equal(parseCodingAgents(page(without(APPROVED)), next).count, 15);
  assert.throws(() => parseCodingAgents(page(without(APPROVED, 'synthetic-3')), next), new RegExp(CODING_AGENT_ROSTER_SHRANK));
});

test('approved plus one unapproved removal still raises the shrink marker', () => {
  assert.throws(() => parseCodingAgents(page(without(APPROVED, 'synthetic-3')), published()),
    (e) => e.message === `${CODING_AGENT_ROSTER_SHRANK} (14 of 15 published rows; removed synthetic-3): AA Coding Agent incomplete scrape: 14 rows (minimum 15)`);
  assert.throws(() => parseCodingAgents(page(without('synthetic-3')), published()), new RegExp(`${CODING_AGENT_ROSTER_SHRANK} \\(15 of 16`));
});

test('an approved id that is present again is kept', () => {
  const next = parseCodingAgents(page(), published());
  assert.equal(next.count, 16);
  assert.ok(next.rows.some((r) => r.source_id === APPROVED));
});

test('refresh writes the smaller snapshot; the review treats the run as ordinary, not withheld', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cr709-approved-'));
  try {
    const target = join(dir, 'snapshot.json');
    await writeFile(target, JSON.stringify(published(), null, 2));
    const snapshot = await refreshCodingAgents({ target, html: page(without(APPROVED)) });
    assert.equal(snapshot.count, 15);
    assert.equal(JSON.parse(await readFile(target, 'utf8')).count, 15);
    const beforeDir = await mkdtemp(join(tmpdir(), 'cr709-approved-before-'));
    try {
      await writeFile(join(beforeDir, 'aa-coding-agents-v2.0.json'), JSON.stringify(published()));
      const receipt = { url: 'https://artificialanalysis.ai/agents/coding-agents', sha256: 'f'.repeat(64), fetched_at: RUN_START, body: page(without(APPROVED)) };
      assert.equal(await verifyWithheldCoding({ staged: snapshot, src: { beforeDir }, runStart: RUN_START, receipt }), null);
    } finally { await rm(beforeDir, { recursive: true, force: true }); }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
