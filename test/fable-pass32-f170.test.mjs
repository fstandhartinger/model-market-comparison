// Fable pass 32, F-170 (2026-09-23): no registry id and no internal marker as a sub-line; a benchmark
// name in the model page's sheet wraps instead of being cut. Behaviour first — the version rule is
// exercised against the live registry, not against a pinned spelling of it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { versionSuffix } from '../lib/version-label.ts';
import { buildBenchmarkView, cohortSubLabel, INSPECTION_MARKER } from '../lib/benchmark-view.mjs';

const dataset = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
const view = buildBenchmarkView(dataset);

test('F-170(a): a version the name already says as words prints no suffix', () => {
  assert.equal(versionSuffix('Terminal-Bench v4.0 (AA, upstream timeouts)', '4.0-upstream-timeouts'), null);
  assert.equal(versionSuffix('Terminal-Bench 4.0', '4.0'), null, 'the name spells the version without our "v"');
  assert.equal(versionSuffix('AIME 2025 (AA)', '2025'), null);
  assert.equal(versionSuffix('KernelBench-CUDA: DeepSeek NSA (RTX PRO 6000)', 'rtx-pro-6000'), null);
});

test('F-170(a): a version with a token the name lacks still prints, and pins/snapshots are unchanged', () => {
  assert.equal(versionSuffix('SWE-bench Verified', '1.1'), 'v1.1');
  assert.equal(versionSuffix('ResearchClawBench', '40-tasks'), '40-tasks', 'the name says neither token');
  assert.equal(versionSuffix('Terminal-Bench v4.0 (AA)', '4.0-upstream-timeouts'), '4.0-upstream-timeouts',
    'the run\'s own qualifier is the difference between two axes and must stay');
  assert.equal(versionSuffix('MMLU', 'snapshot-2026-09-13'), null);
  assert.equal(versionSuffix('MMLU', '1.1'), 'v1.1');
  assert.equal(versionSuffix('AA-LCR v1.10', '1.1'), 'v1.1', 'a token never hides inside a longer number');
});

test('F-170(a): every suffix the registry still prints says something the name does not', () => {
  const word = (token, name) =>
    new RegExp(`(^|[^A-Za-z0-9])v?${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Za-z0-9.])`, 'i').test(name);
  const redundant = view.axes
    .map((axis) => ({ axis, suffix: versionSuffix(axis.name, axis.version) }))
    .filter(({ axis, suffix }) => suffix && String(axis.version).split(/[-_]+/).filter(Boolean)
      .every((token) => word(token.replace(/^v(?=\d)/i, ''), axis.name)));
  assert.deepEqual([...new Set(redundant.map((r) => `${r.axis.name} → ${r.suffix}`))], []);
});

test('F-170(b): the unparsed-protocol marker is never a sub-line, and the real part survives', () => {
  assert.equal(cohortSubLabel(INSPECTION_MARKER), null);
  assert.equal(cohortSubLabel(`claude-code · ${INSPECTION_MARKER}`), 'Claude Code', 'a cohort that also names a harness keeps the harness');
  assert.equal(cohortSubLabel('Published board'), null);
  assert.equal(cohortSubLabel('claude-code'), 'Claude Code');
  const printed = view.axes.map((axis) => cohortSubLabel(axis.cohort)).filter(Boolean);
  assert.equal(printed.filter((line) => line.includes(INSPECTION_MARKER)).length, 0,
    'no axis on any surface prints the internal marker');
});

test('F-170(b): a retained source note no longer splits one board into two axes', () => {
  // The two Vals rows this found: same board, same protocol shape, one of them carrying a " Source note: …"
  // caveat the ingest kept. Before the parse fix that note put it in its own cohort and its own axis.
  assert.equal(view.axes.filter((axis) => String(axis.cohort).includes(INSPECTION_MARKER)).length, 0,
    'no axis is grouped by the marker any more');
  const proof = view.axes.filter((axis) => axis.benchmarkId === 'vals-proofbench-v1-1::1.1');
  assert.equal(proof.length, 1, `ProofBench v1.1 is one axis, not ${proof.length}`);
  assert.equal(proof[0].scores.length, 2, 'both published rows sit on it');
});

test('F-170(c): the sheet\'s benchmark name cell wraps at every width and keeps the full name in a title', async () => {
  const sheet = await readFile(new URL('../components/BenchmarkSheetLazy.tsx', import.meta.url), 'utf8');
  const cell = sheet.match(/<span className="col-span-2 min-w-0[^>]*>/)[0];
  assert.doesNotMatch(cell, /truncate|text-ellipsis|whitespace-nowrap/, 'the name cell never clips');
  assert.match(cell, /title=\{a\.suffix \? `\$\{a\.name\} \$\{a\.suffix\}` : a\.name\}/);
});
