import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateJevbenchV1615Bundle, readOptionalJevbenchV1615Release, hasPublishedJevbenchV1615Release,
         V1615_NEW_KEYS, V1615_UNRANKED_NEW_KEYS, V1615_KEYS, V1615_COST_CAP, V1615_FIXED_G_MED } from '../lib/jevbench-v1615-release.mjs';
import { readOptionalJevbenchV1614Release } from '../lib/jevbench-v1614-release.mjs';
import { jevbenchScopeArtifact } from '../lib/jevbench-scope.mjs';

const root = 'data/raw/benchmarks/jevbench/v1.6/';
const read = async k => JSON.parse(await readFile(`${root}jevbench-v1.6.15-${k}.json`, 'utf8'));
const unranked = V1615_UNRANKED_NEW_KEYS[0];
const ranked = 'phocinae-largha-150m-v1';

async function fixture() {
  const previous = await readOptionalJevbenchV1614Release();
  const [manifest, artifact, categories, proof, bytes] = await Promise.all([
    read('publication'), read('results'), read('categories'), read('proof'),
    readFile(`${root}jevbench-v1.6.14-publication.json`)]);
  manifest.review = { engine: 'claude', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) }; // in-memory validator fixture only
  return { manifest, artifact, categories, proof, previous, previousManifestSha256: createHash('sha256').update(bytes).digest('hex') };
}

test('v1.6.15 adds exactly three self-hosted CPU rows and keeps every predecessor point estimate', async () => {
  const b = await fixture();
  validateJevbenchV1615Bundle(b);
  assert.equal(b.artifact.systems.length, 11);
  assert.equal(b.artifact.n_ranked, 9);
  assert.deepEqual(b.artifact.systems.map(s => s.key).sort(), [...V1615_KEYS].sort());
  for (const p of b.previous.artifact.systems) {
    const s = b.artifact.systems.find(x => x.key === p.key);
    assert.deepEqual(s.scores, p.scores, `${p.key} scores`);
    assert.deepEqual(s.axes, p.axes, `${p.key} axes`);
    assert.equal(s.capability, p.capability);
    assert.deepEqual(s.cost, p.cost);
    assert.equal(s.rank, p.rank);
  }
  // the three new rows are measured, priced as labelled estimates and under the published ceiling
  for (const key of V1615_NEW_KEYS) {
    const s = b.artifact.systems.find(x => x.key === key);
    assert.equal(s.measured_in, 'v1.6.15');
    assert.equal(s.endpoint_kind, 'cpu');
    assert.equal(s.cost.kind, 'estimate');
    assert.ok(s.cost.usd_per_1000 > 0 && s.cost.usd_per_1000 <= V1615_COST_CAP);
    assert.ok(s.endpoint_condition.length > 100);
    assert.ok(b.artifact.measurement_notes.some(n => n.startsWith(`${key}: `)));
  }
  assert.equal(b.artifact.G_med, V1615_FIXED_G_MED);
});

test('v1.6.15 shows the non-official-Speed row without ranking it, in every scope', async () => {
  const b = await fixture();
  validateJevbenchV1615Bundle(b);
  const s = b.artifact.systems.find(x => x.key === unranked);
  assert.equal(s.ranked, false);
  assert.equal(s.rank, null);
  assert.equal(s.listing, 'listed');
  assert.ok(Object.values(s.ranks).every(r => r === null));
  assert.match(s.not_ranked_because, /#18761/);
  assert.ok(Number.isFinite(s.capability) && Number.isFinite(s.axes.intelligence) && Number.isFinite(s.axes.calibration));
  for (const scope of ['all', 'open']) {
    const scoped = jevbenchScopeArtifact(b.artifact, scope);
    const row = scoped.systems.find(x => x.key === unranked);
    if (!row) continue;
    assert.equal(row.ranked, false);
    for (const board of ['A', 'B', 'C']) assert.ok(!(scoped.board?.[board]?.order ?? []).includes(unranked));
  }
  // and it keeps its category cells, unlike the carried A2 measurement
  assert.ok(b.categories.systems[unranked]);
  assert.equal(b.categories.systems['microsoft-decision-1-a2-20261012'], undefined);
});

test('v1.6.15 carries the v1.6.14 A2 measurement through byte for byte', async () => {
  const b = await fixture();
  validateJevbenchV1615Bundle(b);
  const key = 'microsoft-decision-1-a2-20261012';
  assert.deepEqual(b.artifact.systems.find(s => s.key === key), b.previous.artifact.systems.find(s => s.key === key));
  assert.deepEqual(b.proof.a2_supplement, b.previous.proof.a2_supplement);
});

for (const [name, edit, error] of [
  ['a fourth row sneaked in', b => { b.artifact.systems.push({ ...b.artifact.systems[0], key: 'extra-row' }); }, /cohort|added rows|roster/],
  ['the unranked row promoted to a rank', b => { const s = b.artifact.systems.find(x => x.key === unranked); s.ranked = true; s.listing = 'ranked'; s.rank = 8; }, /listed-not-ranked|nine ranked|n_ranked|board|non-official/],
  ['the unranked row given a board placement', b => { b.artifact.board.A.order.push(unranked); }, /board/],
  ['the reason for not ranking removed', b => { delete b.artifact.systems.find(x => x.key === unranked).not_ranked_because; }, /stated reason/],
  ['a null rank filled in', b => { b.artifact.systems.find(x => x.key === unranked).ranks.A = 8; }, /null ranks/],
  ['an inherited point score moved', b => { b.artifact.systems.find(x => x.key === 'krino-2b').scores.A += 0.001; }, /earlier row point score|headline score/],
  ['an inherited axis moved', b => { b.artifact.systems.find(x => x.key === 'krino-2b').axes.speed += 0.001; }, /earlier row axis|carried row differs/],
  ['an inherited cost object rewritten', b => { b.artifact.systems.find(x => x.key === 'krino-2b').cost.usd_per_1000 *= 0.5; }, /earlier row cost object|carried row differs/],
  ['an inherited rank moved', b => { b.artifact.systems.find(x => x.key === 'krino-2b').rank = 9; }, /earlier row rank|board|carried row differs/],
  ['the carried A2 row edited', b => { b.artifact.systems.find(x => x.key === 'microsoft-decision-1-a2-20261012').axes.intelligence += 0.01; }, /carried preliminary row unchanged/],
  ['a new row above the cost ceiling', b => { b.artifact.systems.find(x => x.key === ranked).cost.usd_per_1000 = 0.1; }, /cost above the published ceiling|provenance/],
  ['a new row priced as a tariff rather than an estimate', b => { b.artifact.systems.find(x => x.key === ranked).cost.kind = 'tariff'; }, /labelled cost estimate/],
  ['a new row with an incomplete run', b => { b.artifact.systems.find(x => x.key === ranked).status.rows = 1499; }, /complete 1500 rows|system proof|item count/],
  ['a new row claiming no shared-host disclosure', b => { b.artifact.systems.find(x => x.key === ranked).endpoint_condition = 'a dedicated machine'; }, /shared-host disclosure/],
  ['a new row with API latency semantics', b => { const s = b.artifact.systems.find(x => x.key === ranked); s.speed.adjustment = 'none (API)'; }, /self-hosted latency adjustment/],
  ['a new row without its measurement note', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.filter(n => !n.startsWith(`${ranked}: `)); }, /row note/],
  ['the shared-resample disclosure dropped', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.filter(n => !(n.includes('confidence interval') && n.includes('paired resample'))); }, /shared-resample disclosure/],
  ['the non-official Speed disclosure dropped', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.filter(n => !(n.includes('#18761') && n.includes('LISTED BUT NOT RANKED'))); }, /non-official Speed disclosure|shared-resample disclosure/],
  ['inherited measurement notes rewritten', b => { b.artifact.measurement_notes[0] = 'rewritten'; }, /inherited measurement notes/],
  ['category cells invented for the carried A2 row', b => { b.categories.systems['microsoft-decision-1-a2-20261012'] = b.categories.systems[ranked]; }, /category cohort|no category cells/],
  ['an inherited category cell changed', b => { b.categories.systems['krino-2b'].languages.en.competence += 1; }, /inherited category cells/],
  ['a new row missing its raw-output hash', b => { delete b.proof.raw_sha256[ranked]; }, /raw-output coverage/],
  ['new-row provenance disagreeing with the row', b => { b.proof.new_rows[ranked].answered_ok += 1; }, /provenance agrees/],
  ['the pricing module hash dropped from the proof', b => { delete b.proof.pricing_module_sha256; }, /draw\/cohort binding/],
  ['the authority losing its admission decisions', b => { b.proof.authority = 'because we felt like it'; }, /publication authority/],
  ['the frozen median replaced', b => { b.artifact.G_med = 2.573387642438244; }, /G_med|median/],
  ['PENDING fails closed', b => { b.manifest.review.verdict = 'PENDING'; }, /independent release review/],
  ['a predecessor other than v1.6.14', b => { b.previous.manifest.revision = 'v1.6.13'; }, /predecessor/],
  ['the predecessor manifest hash rewritten', b => { b.manifest.predecessor.publication_sha256 = 'b'.repeat(64); }, /predecessor binding/],
  ['an item-level field in the artifact', b => { b.artifact.systems.find(x => x.key === ranked).item_text = 'private'; }, /private\/item-level/],
  // the mutations the v1.6.15 critic round found this loader accepting (finding F8)
  ['an invented Capability on the unranked row', b => { b.artifact.systems.find(x => x.key === unranked).capability = 99; }, /capability is the mean/],
  ['an invented Intelligence on the unranked row', b => { b.artifact.systems.find(x => x.key === unranked).axes.intelligence = 99; }, /capability is the mean|axis/],
  ['a deleted Speed axis', b => { delete b.artifact.systems.find(x => x.key === ranked).axes.speed; }, /axis speed|does not reproduce from the axes/],
  ['a deleted Cost axis', b => { delete b.artifact.systems.find(x => x.key === ranked).axes.cost; }, /axis cost|does not reproduce from the axes/],
  ['the truncation disclosure removed from the unranked row', b => { const s = b.artifact.systems.find(x => x.key === unranked); s.endpoint_condition = s.endpoint_condition.replace(/truncat\w*/g, 'handles'); b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => n.startsWith(`${unranked}: `) ? n.replace(/truncat\w*/g, 'handles') : n); }, /required disclosure/],
  ['the shim disclosure removed from the phocinae row', b => { const s = b.artifact.systems.find(x => x.key === ranked); s.endpoint_condition = s.endpoint_condition.replace(/shim/g, 'server'); b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => n.startsWith(`${ranked}: `) ? n.replace(/shim/g, 'server') : n); }, /required disclosure/],
  ['a one-word reason for not ranking', b => { b.artifact.systems.find(x => x.key === unranked).not_ranked_because = '#18761'; }, /stated reason/],
  ['a row note replaced by a stub', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => n.startsWith(`${ranked}: `) ? `${ranked}: fine.` : n); }, /row note is too thin/],
  ['a carried row changed outside its intervals', b => { b.artifact.systems.find(x => x.key === 'krino-2b').display = 'Krino 2B (renamed)'; }, /carried row differs|earlier row identity/],
  ['the moved API-basis diagnostic left undisclosed', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => n.replace('API-basis median diagnostic', 'api basis thing')); }, /API-basis diagnostic must be disclosed/],
]) test(`v1.6.15 rejects ${name}`, async () => {
  const b = await fixture();
  edit(b);
  assert.throws(() => validateJevbenchV1615Bundle(b), error);
});

test('the real PENDING manifest stays hidden until the independent review lands', async () => {
  if ((await read('publication')).review.verdict === 'PASS') return;
  await assert.rejects(readOptionalJevbenchV1615Release(), /independent release review/);
  assert.equal(await hasPublishedJevbenchV1615Release(process.cwd(), () => {}), false);
});
