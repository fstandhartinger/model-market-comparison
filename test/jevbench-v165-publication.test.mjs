import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateJevbenchV165Bundle, readOptionalJevbenchV165Release, hasPublishedJevbenchV165Release,
         V165_KEYS, V165_DIMS, V165_BASE_DIMS, v165Dims, V165_DRAW_RELEASE } from '../lib/jevbench-v165-release.mjs';

const V = 'data/raw/benchmarks/jevbench/v1.6';
const h = 'a'.repeat(64);
const read = async name => JSON.parse(await readFile(`${V}/jevbench-v1.6.5-${name}.json`, 'utf8'));

/** The real published bundle, with only the independent-review verdict stubbed: the verdict is written
 *  by the reviewer, not by this job, and the loader must fail closed until it is PASS. */
async function fixture() {
  const [manifest, artifact, categories, proof] = await Promise.all(
    [read('publication'), read('results'), read('categories'), read('proof')]);
  manifest.review = { engine: 'claude', verdict: 'PASS', receipt_sha256: h };
  return { manifest, artifact, categories, proof, historicalSha256: manifest.historical_results_sha256 };
}

test('missing publication artifact keeps the release unavailable', async () => {
  const root = await mkdtemp(join(tmpdir(), 'jev165-'));
  try { assert.equal(await readOptionalJevbenchV165Release(root), null); }
  finally { await rm(root, { recursive: true }); }
});

test('the published eight-system regular cohort validates', async () => assert.ok(validateJevbenchV165Bundle(await fixture())));

test('the published bundle really is the eight regular-queue rows on the drawn set', async () => {
  const { artifact, proof } = await fixture();
  assert.deepEqual(artifact.systems.map(s => s.key).toSorted(), [...V165_KEYS].toSorted());
  assert.equal(artifact.run_kind, 'regular-queue');
  assert.equal(artifact.v16.draw_release, V165_DRAW_RELEASE);
  assert.equal(proof.draw_release, V165_DRAW_RELEASE);
  for (const s of artifact.systems) {
    assert.equal(s.status.rows, 1500, s.key);
    assert.equal(s.status.status, 'complete', s.key);
    assert.ok(s.ranked, s.key);
    // Not one price here is a tariff these systems issued.
    assert.equal(s.cost.kind, 'estimate', s.key);
  }
});

test('the field median is recomputable from the published gaps and is flagged above ten', async () => {
  const { artifact, proof } = await fixture();
  const gaps = proof.field_median.members.map(m => m.gap).toSorted((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  assert.ok(Math.abs(artifact.G_med - median) < 1e-9);
  assert.equal(artifact.G_med_flag_gt10, artifact.G_med > 10);
  assert.ok(artifact.measurement_notes.some(n => n.includes('G_med_flag_gt10')),
            'a flagged field median must be disclosed in the measurement notes');
});

test('v1.6.5 ships the topic radar labelled for its own draw', async () => {
  const { categories } = await fixture();
  assert.ok(Array.isArray(categories.topics) && categories.topics.length === 7);
  assert.equal(categories.labels_draw_release, V165_DRAW_RELEASE);
  assert.equal(categories.labels_sha256, 'aa0f82f0392b04c7ce21334d5a9e1df2ac3d3d4903aa95626f8849e5788bf0da');
  assert.equal(categories.topics.reduce((n, c) => n + c.n, 0), 1500);
});

test('every published dimension has at least five categories', async () => {
  const { categories } = await fixture();
  for (const dim of v165Dims(categories)) assert.ok(Array.isArray(categories[dim]) && categories[dim].length >= 5, dim);
  for (const dim of V165_BASE_DIMS) assert.ok(dim in categories, dim);
});

test('the topic radar is optional, and its absence is disclosed rather than silent', async () => {
  const { artifact, categories } = await fixture();
  if ('topics' in categories) {
    assert.match(categories.labels_sha256, /^[a-f0-9]{64}$/);
    assert.equal(categories.labels_draw_release, V165_DRAW_RELEASE);
  } else {
    assert.ok(artifact.measurement_notes.some(n => n.includes('topic')),
              'without a topic radar the release must say so');
  }
});

test('a pending review verdict keeps the release unavailable and the nav tab hidden', async () => {
  const manifest = await read('publication');
  if (manifest.review.verdict === 'PASS') return;   // after the review has landed
  await assert.rejects(readOptionalJevbenchV165Release(), /independent release review/);
  assert.equal(await hasPublishedJevbenchV165Release(process.cwd(), () => {}), false);
});

for (const [name, edit, error] of [
  ['pending review verdict', b => { b.manifest.review.verdict = 'PENDING'; }, /independent release review/],
  ['wrong revision', b => { b.artifact.revision = 'v1.6.4'; }, /regular-queue identity/],
  ['wrong run kind', b => { b.artifact.run_kind = 'paid-fast-lane'; }, /regular-queue identity/],
  // the shared v1.6 roster check fires before the v1.6.5 cohort check; either way it fails closed
  ['a row dropped from the cohort', b => { b.artifact.systems.pop(); }, /roster|exact eight-system cohort/],
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
  ['an undisclosed flagged median', b => { b.artifact.measurement_notes = ['nothing to see']; }, /disclosed in the measurement notes/],
  ['a dropped abandoned-draw disclosure', b => { b.proof.abandoned_draw_note = 'none'; }, /abandoned-draw disclosure/],
  ['a wrong penalty threshold', b => { b.proof.gap_penalty_threshold = 1; }, /gap penalty threshold/],
  ['a topic radar without its labelling provenance', b => { delete b.categories.labels_sha256; }, /labels digest/],
  ['topic labels built for a different draw', b => { b.categories.labels_draw_release = 'v1.6-fastlane-20261009'; }, /labels must be for this draw/],
  ['a silent omission of the topic radar', b => { delete b.categories.topics; b.artifact.measurement_notes = b.artifact.measurement_notes.filter(n => !n.includes('topic')); }, /must say so in its measurement notes/],
  ['a historical overlay in the categories', b => { b.categories.unavailable = {}; }, /historical category overlay/],
  ['category lanes that are not all self-hosted', b => { b.categories.lanes[V165_KEYS[0]] = 'api'; }, /category lanes/],
  ['a language denominator that is not 1500', b => { b.categories.languages[0].n += 1; }, /category (descriptor|language denominator)/],
  ['a broken file binding', b => { b.manifest.files.results.sha256 = 'nope'; }, /file binding/],
  ['a changed historical source', b => { b.manifest.historical_results_sha256 = h; }, /historical source binding/],
  ['item-level data in the proof', b => { b.proof.systems[0].task_id = 'x'; }, /private\/item-level field/],
]) {
  test(`published evidence fails closed: ${name}`, async () => {
    const bundle = await fixture();
    edit(bundle);
    assert.throws(() => validateJevbenchV165Bundle(bundle), error);
  });
}
