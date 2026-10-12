import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateJevbenchV1610Bundle, readOptionalJevbenchV1610Release, hasPublishedJevbenchV1610Release,
         V1610_KEYS, V1610_DIMS, V1610_BASE_DIMS, v1610Dims, V1610_DRAW_RELEASE, V1610_COST_CAP } from '../lib/jevbench-v1610-release.mjs';

const V = 'data/raw/benchmarks/jevbench/v1.6';
const h = 'a'.repeat(64);
const read = async name => JSON.parse(await readFile(`${V}/jevbench-v1.6.10-${name}.json`, 'utf8'));

/** The real published bundle, with only the independent-review verdict stubbed: the verdict is written
 *  by the reviewer, not by this job, and the loader must fail closed until it is PASS. */
async function fixture() {
  const [manifest, artifact, categories, proof] = await Promise.all(
    [read('publication'), read('results'), read('categories'), read('proof')]);
  manifest.review = { engine: 'claude', verdict: 'PASS', receipt_sha256: h };
  return { manifest, artifact, categories, proof, historicalSha256: manifest.historical_results_sha256 };
}

test('missing publication artifact keeps the release unavailable', async () => {
  const root = await mkdtemp(join(tmpdir(), 'jev1610-'));
  try { assert.equal(await readOptionalJevbenchV1610Release(root), null); }
  finally { await rm(root, { recursive: true }); }
});

test('the published four-system regular cohort validates', async () => assert.ok(validateJevbenchV1610Bundle(await fixture())));

test('the published bundle really is the four paid rows on the drawn set', async () => {
  const { artifact, proof } = await fixture();
  assert.deepEqual(artifact.systems.map(s => s.key).toSorted(), [...V1610_KEYS].toSorted());
  assert.equal(artifact.run_kind, 'regular-queue');
  assert.equal(artifact.v16.draw_release, V1610_DRAW_RELEASE);
  assert.equal(proof.draw_release, V1610_DRAW_RELEASE);
  for (const s of artifact.systems) {
    assert.equal(s.status.rows, 1500, s.key);
    assert.equal(s.status.status, 'complete', s.key);
    assert.ok(s.ranked, s.key);
    // Not one price here is a tariff these systems issued.
    assert.equal(s.cost.kind, 'estimate', s.key);
    assert.ok(s.cost.usd_per_1000 <= V1610_COST_CAP, s.key);
    assert.equal(s.measured_in, 'v1.6.10', s.key);
  }
  assert.equal(proof.abandoned_draw_note, null);
});

test('the field median is recomputable from the published gaps and its flag is consistent', async () => {
  const { artifact, proof } = await fixture();
  const gaps = proof.field_median.members.map(m => m.gap).toSorted((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  assert.ok(Math.abs(artifact.G_med - median) < 1e-9);
  assert.equal(artifact.G_med_flag_gt10, artifact.G_med > 10);
  if (artifact.G_med_flag_gt10) assert.ok(artifact.measurement_notes.some(n => n.includes('G_med_flag_gt10')),
            'a flagged field median must be disclosed in the measurement notes');
});

test('v1.6.10 ships without a topic radar and says so', async () => {
  const { artifact, categories } = await fixture();
  assert.equal('topics' in categories, false);
  assert.ok(artifact.measurement_notes.some(n => n.includes('topic')));
});

test('every published dimension has at least five categories', async () => {
  const { categories } = await fixture();
  for (const dim of v1610Dims(categories)) assert.ok(Array.isArray(categories[dim]) && categories[dim].length >= 5, dim);
  for (const dim of V1610_BASE_DIMS) assert.ok(dim in categories, dim);
});

test('the topic radar is optional, and its absence is disclosed rather than silent', async () => {
  const { artifact, categories } = await fixture();
  if ('topics' in categories) {
    assert.match(categories.labels_sha256, /^[a-f0-9]{64}$/);
    assert.equal(categories.labels_draw_release, V1610_DRAW_RELEASE);
  } else {
    assert.ok(artifact.measurement_notes.some(n => n.includes('topic')),
              'without a topic radar the release must say so');
  }
});

test('a pending review verdict keeps the release unavailable and the nav tab hidden', async () => {
  const manifest = await read('publication');
  if (manifest.review.verdict === 'PASS') return;   // after the review has landed
  await assert.rejects(readOptionalJevbenchV1610Release(), /independent release review/);
  assert.equal(await hasPublishedJevbenchV1610Release(process.cwd(), () => {}), false);
});

for (const [name, edit, error] of [
  ['pending review verdict', b => { b.manifest.review.verdict = 'PENDING'; }, /independent release review/],
  ['wrong revision', b => { b.artifact.revision = 'v1.6.9'; }, /regular-queue identity/],
  ['wrong run kind', b => { b.artifact.run_kind = 'paid-fast-lane'; }, /regular-queue identity/],
  // the shared v1.6 roster check fires before the v1.6.10 cohort check; either way it fails closed
  ['a row dropped from the cohort', b => { b.artifact.systems.pop(); }, /roster|exact four-system cohort/],
  ['a partial row', b => { b.artifact.systems[0].status.status = 'partial'; }, /complete 1500 rows/],
  ['an unranked row', b => { b.artifact.systems[0].ranked = false; }, /n_ranked|ranked and fully covered/],
  ['a price relabelled as measured', b => { b.artifact.systems[0].cost.kind = 'measured'; }, /labelled cost estimate/],
  ['an undocumented cost basis', b => { b.artifact.systems[0].cost.basis = 'registry'; }, /documented cost basis/],
  ['an unpinned model', b => { b.artifact.systems[0].model_pin = 'owner/model'; }, /pinned revision/],
  ['a missing decisiveness figure', b => { delete b.artifact.systems[0].noul_decisive; }, /noul decisiveness/],
  ['a foreign draw', b => { b.artifact.v16.draw_release = 'v1.6-somebody-elses'; }, /draw identity/],
  ['a proof that disagrees with its row', b => { b.proof.systems[0].composite_A += 1; }, /proof agrees with the row/],
  ['a proof row without a raw digest', b => { b.proof.systems[0].raw_sha256 = 'nope'; }, /system proof/],
  ['a silently absent source review', b => { delete b.proof.systems[0].source_review_note; }, /source review note/],
  ['a field median that does not match its members', b => { b.artifact.G_med = 4; }, /cohort G_med/],
  ['an undisclosed flagged median', b => { b.artifact.G_med_flag_gt10 = true; b.artifact.G_med = 11; b.proof.field_median.G_med = 11; b.artifact.measurement_notes = ['nothing to see']; }, /cohort G_med|disclosed in the measurement notes/],
  ['a cost above the published ceiling', b => { b.artifact.systems[0].cost.usd_per_1000 = 0.07; }, /cost above the published ceiling/],
  ['a row stamped as measured in another release', b => { b.artifact.systems[0].measured_in = 'v1.6.9'; }, /measurement stamp/],
  ['an invented abandoned-draw note', b => { b.proof.abandoned_draw_note = 'v1.6-regular-20261012 was abandoned'; }, /abandoned-draw disclosure/],
  ['a wrong penalty threshold', b => { b.proof.gap_penalty_threshold = 1; }, /gap penalty threshold/],
  ['a topic radar without its labelling provenance', b => { b.categories.topics = b.categories.families; }, /labels digest/],
  ['a silent omission of the topic radar', b => { delete b.categories.topics; b.artifact.measurement_notes = b.artifact.measurement_notes.filter(n => !n.includes('topic')); }, /must say so in its measurement notes/],
  ['a historical overlay in the categories', b => { b.categories.unavailable = {}; }, /historical category overlay/],
  ['category lanes that are not all self-hosted', b => { b.categories.lanes[V1610_KEYS[0]] = 'api'; }, /category lanes/],
  ['a language denominator that is not 1500', b => { b.categories.languages[0].n += 1; }, /category (descriptor|language denominator)/],
  ['a broken file binding', b => { b.manifest.files.results.sha256 = 'nope'; }, /file binding/],
  ['a changed historical source', b => { b.manifest.historical_results_sha256 = h; }, /historical source binding/],
  ['item-level data in the proof', b => { b.proof.systems[0].task_id = 'x'; }, /private\/item-level field/],
]) {
  test(`published evidence fails closed: ${name}`, async () => {
    const bundle = await fixture();
    edit(bundle);
    assert.throws(() => validateJevbenchV1610Bundle(bundle), error);
  });
}

test('the shared category view renders a fresh release without a topic radar, and still with one', async () => {
  const { jevbenchCategoryView } = await import('../lib/jevbench-categories.mjs');
  const { artifact, categories } = await fixture();
  const keys = artifact.systems.map(s => s.key);
  const v = jevbenchCategoryView('v1.6.10', keys, { artifact: categories });
  assert.deepEqual(v.dims.map(d => d.key), ['usecases']);
  assert.deepEqual(Object.keys(v.systems).toSorted(), [...keys].toSorted());
  const withTopics = { ...categories, topics: categories.families, systems: Object.fromEntries(Object.entries(categories.systems).map(([k, r]) => [k, { ...r, topics: r.families }])) };
  assert.deepEqual(jevbenchCategoryView('v1.6.10', keys, { artifact: withTopics }).dims.map(d => d.key), ['topics', 'usecases']);
});
