import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateJevbenchV1616Bundle, readOptionalJevbenchV1616Release, hasPublishedJevbenchV1616Release,
         V1616_NEW_KEYS, V1616_UNRANKED_KEYS, V1616_CARRIED_KEYS, V1616_KEYS, V1616_COST_CAP, V1616_FIXED_G_MED } from '../lib/jevbench-v1616-release.mjs';
import { readOptionalJevbenchV1615Release } from '../lib/jevbench-v1615-release.mjs';
import { jevbenchScopeArtifact } from '../lib/jevbench-scope.mjs';

const root = 'data/raw/benchmarks/jevbench/v1.6/';
const read = async k => JSON.parse(await readFile(`${root}jevbench-v1.6.16-${k}.json`, 'utf8'));
const d3 = V1616_NEW_KEYS[0];
const unranked = V1616_UNRANKED_KEYS[0];
const releaseNote = n => n.startsWith('v1.6.16 ADDS ONE');

async function fixture() {
  const previous = await readOptionalJevbenchV1615Release();
  const [manifest, artifact, categories, proof, bytes] = await Promise.all([
    read('publication'), read('results'), read('categories'), read('proof'),
    readFile(`${root}jevbench-v1.6.15-publication.json`)]);
  manifest.review = { engine: 'claude', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) }; // in-memory validator fixture only
  return { manifest, artifact, categories, proof, previous, previousManifestSha256: createHash('sha256').update(bytes).digest('hex') };
}

test('v1.6.16 adds exactly one self-hosted GPU row and keeps every predecessor point estimate', async () => {
  const b = await fixture();
  validateJevbenchV1616Bundle(b);
  assert.equal(b.artifact.systems.length, 12);
  assert.equal(b.artifact.n_ranked, 10);
  assert.deepEqual(b.artifact.systems.map(s => s.key).sort(), [...V1616_KEYS].sort());
  for (const p of b.previous.artifact.systems) {
    const s = b.artifact.systems.find(x => x.key === p.key);
    assert.deepEqual(s.scores, p.scores, `${p.key} scores`);
    assert.deepEqual(s.axes, p.axes, `${p.key} axes`);
    assert.equal(s.capability, p.capability);
    assert.deepEqual(s.cost, p.cost);
    assert.deepEqual(s.speed, p.speed);
    assert.deepEqual(s.composite_ci95, p.composite_ci95, `${p.key} interval did not move in v1.6.16`);
  }
  assert.equal(b.artifact.G_med, V1616_FIXED_G_MED);
});

test('v1.6.16 publishes the private d3 result unchanged, with its caveats', async () => {
  const b = await fixture();
  validateJevbenchV1616Bundle(b);
  const s = b.artifact.systems.find(x => x.key === d3);
  assert.equal(s.display, 'vLLM-SR d3');
  assert.equal(s.model_pin, 'vllm-sr/d3@5ce995dfb7ff07da00fec4211eb7f0560f52eaf8');
  assert.equal(s.capability, 82.96592796157353);
  assert.equal(s.axes.intelligence, 73.73157285955872);
  assert.equal(s.axes.calibration, 92.20028306358832);
  assert.equal(s.axes.speed, 87.36893361347018);
  assert.equal(s.axes.cost, 17.876172053883806);
  assert.equal(s.scores.A, 5.569947529283843);
  assert.equal(s.cost.usd_per_1000, 0.5463374);
  assert.equal(s.cost.kind, 'estimate');
  assert.ok(s.cost.usd_per_1000 > V1616_COST_CAP, 'above the Jev-class ceiling');
  assert.equal(s.endpoint_kind, 'gpu');
  assert.equal(s.status.answered_ok, 1500);
  assert.match(s.endpoint_condition, /RTX PRO 6000/);
  assert.equal(s.ranks.capability, 1);
  assert.equal(s.rank, 8);
  assert.equal(b.proof.new_rows[d3].raw_sha256, '460ba4d8d52ae5eb404836416add5623f862e6b811bf24e978770da6ab3a924e');
});

test('v1.6.16 moves carried ranks only by the one row that joined above them', async () => {
  const b = await fixture();
  validateJevbenchV1616Bundle(b);
  for (const key of V1616_CARRIED_KEYS) {
    const a = b.previous.artifact.systems.find(s => s.key === key), s = b.artifact.systems.find(x => x.key === key);
    if (!a.ranked) { assert.deepEqual(s, a); continue; }
    assert.equal(s.ranks.capability, a.ranks.capability + 1, key);
    const below = ['phocinae-largha-150m-v1', 'julia-1'].includes(key);
    for (const o of ['A', 'B', 'C']) assert.equal(s.ranks[o], a.ranks[o] + (below ? 1 : 0), `${key}.${o}`);
  }
});

test('v1.6.16 keeps the non-official-Speed row unranked in every scope', async () => {
  const b = await fixture();
  validateJevbenchV1616Bundle(b);
  const s = b.artifact.systems.find(x => x.key === unranked);
  assert.equal(s.ranked, false);
  assert.equal(s.rank, null);
  for (const scope of ['all', 'open']) {
    const scoped = jevbenchScopeArtifact(b.artifact, scope);
    for (const board of ['A', 'B', 'C']) assert.ok(!(scoped.board?.[board]?.order ?? []).includes(unranked));
  }
  const key = 'microsoft-decision-1-a2-20261012';
  assert.deepEqual(b.artifact.systems.find(x => x.key === key), b.previous.artifact.systems.find(x => x.key === key));
});

const d3row = b => b.artifact.systems.find(x => x.key === d3);
const editD3Note = (b, f) => { b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => n.startsWith(`${d3}: `) ? f(n) : n); };
for (const [name, edit, error] of [
  ['a second new row sneaked in', b => { b.artifact.systems.push({ ...d3row(b), key: 'extra-row' }); }, /cohort|added row|roster/],
  ['the unranked row promoted to a rank', b => { const s = b.artifact.systems.find(x => x.key === unranked); s.ranked = true; s.listing = 'ranked'; s.rank = 9; }, /listed-not-ranked|ten ranked|board|non-official|n_ranked/],
  ['an inherited point score moved', b => { b.artifact.systems.find(x => x.key === 'krino-2b').scores.A += 0.001; }, /earlier row point score|carried row differs|headline score/],
  ['an inherited axis moved', b => { b.artifact.systems.find(x => x.key === 'krino-2b').axes.speed += 0.001; }, /earlier row axis|carried row differs/],
  ['an inherited cost object rewritten', b => { b.artifact.systems.find(x => x.key === 'krino-2b').cost.usd_per_1000 *= 0.5; }, /earlier row cost object|carried row differs/],
  ['an inherited rank moved by more than d3', b => { const s = b.artifact.systems.find(x => x.key === 'krino-2b'); s.ranks.capability += 1; }, /capability rank is not the capability order|moved by more than/],
  ['an inherited interval moved silently', b => { const s = b.artifact.systems.find(x => x.key === 'krino-2b'); s.composite_ci95 = { ...s.composite_ci95, A: [s.scores.A - 1, s.scores.A + 1] }; }, /carried interval moved although/],
  ['the carried A2 row edited', b => { b.artifact.systems.find(x => x.key === 'microsoft-decision-1-a2-20261012').axes.intelligence += 0.01; }, /carried preliminary row unchanged/],
  ['a carried row above the cost ceiling', b => { b.artifact.systems.find(x => x.key === 'julia-1').cost.usd_per_1000 = 0.1; }, /cost above the published ceiling|earlier row cost/],
  ['d3 priced as a tariff', b => { d3row(b).cost.kind = 'tariff'; }, /labelled cost estimate/],
  ['d3 with an incomplete run', b => { d3row(b).status.rows = 1499; }, /complete 1500 rows|item count/],
  ['d3 hardware disclosure dropped', b => { d3row(b).endpoint_condition = 'evaluator-owned GPU'; }, /hardware disclosure/],
  ['d3 note without the hardware', b => editD3Note(b, n => n.replaceAll('RTX PRO 6000', 'a GPU')), /required disclosure "RTX PRO 6000"/],
  ['d3 note without the training-data caveat', b => editD3Note(b, n => n.replace('training data is not disclosed', 'training data is fine')), /required disclosure "training data is not disclosed"/],
  ['d3 note without the cost cap', b => editD3Note(b, n => n.replaceAll('cost cap', 'budget')), /required disclosure "cost cap"/],
  ['d3 note without the determinism receipt', b => editD3Note(b, n => n.replace('50/50 bit-identical', 'stable')), /required disclosure "50\/50 bit-identical"/],
  ['d3 note removed', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.filter(n => !n.startsWith(`${d3}: `)); }, /too thin/],
  ['the cost-ceiling correction dropped', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.filter(n => !n.includes('NOT true of')); }, /must correct the inherited/],
  ['the top-five/GO disclosure dropped', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.filter(n => !n.includes('card 17392')); }, /top-five change and the GO/],
  ['the release note losing a moved rank', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => releaseNote(n) ? n.replaceAll('uniphore-4b-decider', 'a row') : n); }, /moved carried rank must name its row/],
  ['the release note losing its count of intervals', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => releaseNote(n) ? n.replace('CONFIDENCE INTERVALS', 'intervals') : n); }, /must count rank, interval and diagnostic/],
  ['the diagnostic disclosure stripped of its numbers', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => releaseNote(n) ? n.replace(/9\.\d{6,}/g, 'some value') : n); }, /must state both values|must name its row/],
  ['an invented raw_on_A on a carried row', b => { b.artifact.systems.find(x => x.key === 'krino-2b').v16.raw_on_A = { intelligence: 99, calibration: 99, capability: 99 }; }, /raw_on_A may only move|carried row differs/],
  ['inherited measurement notes rewritten', b => { b.artifact.measurement_notes[0] = 'rewritten'; }, /inherited measurement notes/],
  ['an inherited category cell changed', b => { b.categories.systems['krino-2b'].languages.en.competence += 1; }, /inherited category cells/],
  ['d3 missing its raw-output hash', b => { delete b.proof.raw_sha256[d3]; }, /raw-output coverage/],
  ['d3 provenance claiming it is under the cap', b => { b.proof.new_rows[d3].under_cost_cap = true; }, /new-row provenance/],
  ['d3 determinism receipt dropped', b => { delete b.proof.new_rows[d3].determinism; }, /determinism receipt/],
  ['the authority losing the GO', b => { b.proof.authority = b.proof.authority.replaceAll('card 17392', 'a card'); }, /publication authority/],
  ['the frozen median replaced', b => { b.artifact.G_med = 2.573387642438244; }, /G_med|median/],
  ['PENDING fails closed', b => { b.manifest.review.verdict = 'PENDING'; }, /independent release review/],
  ['a predecessor other than v1.6.15', b => { b.previous.manifest.revision = 'v1.6.14'; }, /predecessor/],
  ['the predecessor manifest hash rewritten', b => { b.manifest.predecessor.publication_sha256 = 'b'.repeat(64); }, /predecessor binding/],
  ['an item-level field in the artifact', b => { d3row(b).item_text = 'private'; }, /private\/item-level/],
  ['an invented Capability on d3', b => { d3row(b).capability = 99; }, /capability is the mean|capability: vllm-sr-d3/],
  ['a swapped rank between d3 and phocinae', b => { const p = b.artifact.systems.find(x => x.key === 'phocinae-largha-150m-v1'), j = d3row(b); [p.rank, j.rank] = [j.rank, p.rank]; [p.ranks, j.ranks] = [j.ranks, p.ranks]; }, /rank .* is not the board position|rank is not the|capability rank/],
]) test(`v1.6.16 rejects ${name}`, async () => {
  const b = await fixture();
  edit(b);
  assert.throws(() => validateJevbenchV1616Bundle(b), error);
});

test('the real PENDING v1.6.16 manifest stays hidden until the independent review lands', async () => {
  if ((await read('publication')).review.verdict === 'PASS') return;
  await assert.rejects(readOptionalJevbenchV1616Release(), /independent release review/);
  assert.equal(await hasPublishedJevbenchV1616Release(process.cwd(), () => {}), false);
});
