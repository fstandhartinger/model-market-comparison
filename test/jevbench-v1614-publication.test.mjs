import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateJevbenchV1614Bundle, readOptionalJevbenchV1614Release, hasPublishedJevbenchV1614Release, V1614_A2_LABEL, V1614_NEW_KEYS } from '../lib/jevbench-v1614-release.mjs';
import { readOptionalJevbenchV1613Release } from '../lib/jevbench-v1613-release.mjs';
import { jevPartialLabel, jevbenchScopeArtifact, isJevApiOffering, jevApiPreliminaryRows } from '../lib/jevbench-scope.mjs';
import { jevWithCohortRows, jevLiveAllArtifact } from '../lib/jevbench-cohort-merge.mjs';
import { jevV15BoardRow } from '../lib/jevbench-v15-board.mjs';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';
import { readApiFullAddenda, withApiFullAddenda } from '../lib/jevbench-api-full-addenda.mjs';
const root = 'data/raw/benchmarks/jevbench/v1.6/';
const read = async k => JSON.parse(await readFile(`${root}jevbench-v1.6.14-${k}.json`, 'utf8'));
const key = V1614_NEW_KEYS[0];
async function fixture() {
  const previous = await readOptionalJevbenchV1613Release();
  const [manifest, artifact, categories, proof, bytes] = await Promise.all([read('publication'), read('results'), read('categories'), read('proof'), readFile(`${root}jevbench-v1.6.13-publication.json`)]);
  manifest.review = { engine: 'claude', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) }; // in-memory validator fixture only
  return { manifest, artifact, categories, proof, previous, previousManifestSha256: createHash('sha256').update(bytes).digest('hex') };
}
test('v1.6.14 accepts exactly one unranked A2 measurement and retains every predecessor byte value', async () => {
  const b = await fixture(); validateJevbenchV1614Bundle(b);
  assert.deepEqual(b.artifact.systems.filter(s => s.key !== key), b.previous.artifact.systems);
  assert.deepEqual(b.artifact.board, b.previous.artifact.board);
  assert.equal(b.artifact.n_ranked, 7); assert.equal(b.artifact.systems.length, 8);
  assert.equal(b.categories.systems[key], undefined); assert.equal(b.categories.lanes[key], undefined);
  const s = b.artifact.systems.find(s => s.key === key);
  assert.equal(jevPartialLabel(s.listing, s.preliminary), V1614_A2_LABEL);
  for (const scope of ['all', 'api', 'open']) {
    const scoped = jevbenchScopeArtifact(b.artifact, scope);
    const s = scoped.systems.find(s => s.key === key);
    assert.equal(s.ranked, false); assert.equal(s.rank, null);
    assert.ok(Object.values(s.ranks).every(r => r === null));
    assert.ok(!scoped.board.A.order.includes(key));
  }
});
for (const [name, edit, error] of [
  ['key-pinned, no arbitrary second API exception', b => { b.artifact.systems.at(-1).key = 'other-a2'; }, /key-pinned/],
  ['cannot rank the preliminary row', b => { b.artifact.systems.at(-1).ranked = true; }, /n_ranked|listing/],
  ['all preliminary ranks must be null', b => { b.artifact.systems.at(-1).ranks.A = 1; }, /null A2 ranks/],
  ['regular rows keep full coverage', b => { b.artifact.systems[0].full_coverage = false; }, /inherited/],
  ['regular row ranks unchanged', b => { b.artifact.systems[0].rank += 1; }, /inherited/],
  ['regular scores unchanged', b => { b.artifact.systems[0].scores.A += .001; }, /inherited|headline/],
  ['A2 numbers bound to scorer', b => { b.artifact.systems.at(-1).axes.intelligence += .01; }, /numeric\/scored/],
  ['A2 interval bound to scorer', b => { b.artifact.systems.at(-1).composite_ci95.A[0] += .01; }, /numeric\/scored/],
  ['no category cells for A2', b => { b.categories.systems[key] = b.categories.systems['attest-31b-v1.0']; }, /categories/],
  ['label must disclose the measured scope', b => { b.artifact.systems.at(-1).preliminary.label = 'P300'; }, /scope\/label/],
  ['PENDING fails closed', b => { b.manifest.review.verdict = 'PENDING'; }, /independent release review/],
  ['reject item-level field', b => { b.artifact.systems.at(-1).item_text = 'private'; }, /private\/item-level/],
  ['predecessor manifest binding', b => { b.manifest.predecessor.publication_sha256 = 'b'.repeat(64); }, /predecessor binding/],
]) test(`v1.6.14 rejects ${name}`, async () => { const b = await fixture(); edit(b); assert.throws(() => validateJevbenchV1614Bundle(b), error); });
test('real PENDING manifest is hidden until independent review', async () => {
  if ((await read('publication')).review.verdict === 'PASS') return;
  await assert.rejects(readOptionalJevbenchV1614Release(), /independent release review/);
  assert.equal(await hasPublishedJevbenchV1614Release(process.cwd(), () => {}), false);
});
test('badge uses row disclosure while the existing OpenAI P300 badge is unchanged', async () => {
  const rows = jevApiPreliminaryRows({ rows: [{ role: 'carried', key: 'openai-decisions', composite: { A: 1 }, axes: {} }] }, new Map());
  assert.equal(jevPartialLabel(rows.prelim[0].listing, rows.prelim[0].preliminary), 'preliminary · public set (300 items) · full sealed run pending');
  assert.equal(jevPartialLabel('preliminary', { label: V1614_A2_LABEL }), V1614_A2_LABEL);
  const source = await readFile('components/JevBoardInteractive.tsx', 'utf8');
  assert.match(source, /partialLabel\(row.listing, row.preliminary\)/);
  assert.match(source, /export const partialLabel = jevPartialLabel/);
});
test('official Microsoft row and every ranked list remain unchanged after cohort addition', async () => {
  const base = withApiFullAddenda((await readCurrentJevbench()).artifact, await readApiFullAddenda());
  const beforeMs = base.systems.find(s => s.key === 'microsoft-decision-1');
  const row = (await fixture()).artifact.systems.at(-1);
  const after = jevWithCohortRows(base, { rows: [{ row, draw: { offset: { I: 0, C: 0 } } }] });
  assert.deepEqual(after.systems.find(s => s.key === 'microsoft-decision-1'), beforeMs);
  assert.deepEqual(after.board, base.board);
  for (const scope of ['all', 'api', 'open']) {
    const scopeView = a => scope === 'all' ? jevLiveAllArtifact(a, isJevApiOffering) : jevbenchScopeArtifact(a, scope);
    const before = scopeView(base), next = scopeView(after);
    assert.deepEqual(next.board, before.board);
    assert.deepEqual(next.systems.filter(s => s.ranked), before.systems.filter(s => s.ranked));
    assert.deepEqual(next.systems.filter(s => s.key !== key), before.systems);
  }
});

test('preliminary measurement is included in all/versioned and API chart/table projections with canonical links', async () => {
  const board = await readFile('components/JevBenchV16Board.tsx', 'utf8');
  assert.match(board, /scope === 'all' \? jevScopeDisplayOrder\(a.systems.filter\(\(s\) => s.ranked \|\| s.listing === JEV_PRELIMINARY_LISTING\)\)/);
  assert.match(board, /const listedRow[^;]+JEV_PRELIMINARY_LISTING/);
  const table = await readFile('components/JevBoardInteractive.tsx', 'utf8');
  assert.match(table, /jevSystemPath\(row.canonical_system_key \?\? row.key\)/);
  assert.match(table, /jevSourceUrl\(row.canonical_system_key \?\? row.key, row.repo\)/);
});

test('A2 chart mapper preserves its exact per-row label and canonical identity; legacy P300 stays unchanged', async () => {
  const row = (await fixture()).artifact.systems.at(-1);
  const chart = jevV15BoardRow(row);
  assert.equal(chart.canonical_system_key, 'microsoft-decision-1');
  assert.deepEqual(chart.preliminary, row.preliminary);
  assert.equal(jevPartialLabel(chart.listing, chart.preliminary), V1614_A2_LABEL);
  assert.equal(chart.rank, null);
  const source = await readFile('components/JevBoardShared.tsx', 'utf8');
  assert.match(source, /data-bh-jev-preliminary-label=\{row.key\}>\{row.preliminary.label\}/);
  const old = jevV15BoardRow({ key: 'openai-decisions', display: 'OpenAI Decisions', author: 'OpenAI', listing: 'preliminary', ranked: false, axes: {}, preliminary: { n_items: 300 } });
  assert.equal(jevPartialLabel(old.listing, old.preliminary), 'preliminary · public set (300 items) · full sealed run pending');
});
