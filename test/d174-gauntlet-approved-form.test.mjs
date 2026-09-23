// D174 (2026-09-23): the unattended daily stopped publishing. `scripts/ingest-benchmark-scores.mjs`
// refused a re-captured vendor row — "Unreviewed vendor score: public:a6733a51ed77c54d4c74c4b0"
// (CursorBench 4.0, "Fable 5.1 Max") — although the run's own gauntlet had just minted an approval
// for it. The two sides disagreed about *which form of the row* an approval binds:
//
//   ops/daily/gauntlet.mjs        fingerprinted the row as the draft ingest handed it over — joined,
//                                 with subject.model_id, join_note and identity_review;
//   lib/benchmark-score-evidence  looks the approval up under observationDigest(unjoined(o)) for
//                                 exactly those rows, because the join carries its own receipt.
//
// So every self-reported row with a reviewed identity join failed the ingest the first day its
// source was re-captured (a new capture file, a new retrieved_at, or — as there — the board moving
// the row from rank 1 to rank 5 inside `protocol`). These tests pin both halves of the fix on a
// synthetic row of the same shape; the values are fixtures, not benchmark claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyScoreEvidence, sha256, observationDigest, unjoined } from '../lib/benchmark-score-evidence.mjs';
import { approvedForm } from '../ops/daily/gauntlet.mjs';

const registry = { entries: [{ id: 'bench::1', version: '1', family: 'bench', scoring: { unit: 'fraction', range: [0, 1] } }] };
const collections = [{ benchmark_id: 'bench::1', status: 'collected', reason: 'Captured source', source_url: 'https://vendor.example.org/release' }];
const snapshot = (observations) => ({ schema_version: 1, observations, missing: [], rejected: [], collections });

/** A vendor claim whose subject was joined to the catalog by a reviewed identity map. */
const joinedRow = (overrides = {}) => ({
  id: 'public:fixture', value: 0.8, basis: 'self_reported', benchmark_id: 'bench::1', unit: 'fraction',
  subject: { source_id: 'Fixture Model Max', name: 'Fixture Model Max', model_id: 'model::max', variant: null, harness: null },
  source: { url: 'https://vendor.example.org/release', retrieved_at: '2026-09-23', published_at: null, sha256: sha256('primary'), file: 'source.txt', locator: 'html_table; source row 1' },
  protocol: 'source row: {"cells":["1","Fixture Model Max","80 %"]}',
  comparison_key: 'confirmed-protocol', comparison_note: 'Synthetic fixture',
  join_note: 'Reviewed identity map 2026-09-15: label states model and effort',
  identity_review: { packet_file: 'packet.json', packet_sha256: '', verdict_file: 'verdict.json', verdict_sha256: '',
    critic_model: 'deepseek/critic', producer_models: ['openai/producer'] },
  ...overrides,
});

/** Writes the receipts a run produces around one reviewed row, with the artifact holding `form`. */
async function fixture(root, row, form) {
  await writeFile(join(root, 'source.txt'), 'primary');
  const packet = JSON.stringify({ joins: [{ key: `${row.benchmark_id}|${row.subject.source_id}|${row.subject.model_id}` }] });
  const verdict = JSON.stringify({ packet_sha256: sha256(packet), checked: 1, rejected: [] });
  await writeFile(join(root, 'packet.json'), packet);
  await writeFile(join(root, 'verdict.json'), verdict);
  const reviewed = { ...row, identity_review: { ...row.identity_review, packet_sha256: sha256(packet), verdict_sha256: sha256(verdict) } };
  const artifactRow = form === 'joined' ? reviewed : unjoined(reviewed);
  const artifact = JSON.stringify([artifactRow], null, 2) + '\n';
  const review = JSON.stringify({ verdict: 'pass', artifact_sha256: sha256(artifact), coverage_checked: [row.id], errors_found: 0, findings: [], fixed: [], missing_evidence: [] });
  await writeFile(join(root, 'artifact.json'), artifact);
  await writeFile(join(root, 'review.json'), review);
  await writeFile(join(root, 'review.json.meta.json'), JSON.stringify({ actual_model: 'deepseek/critic', producers: ['openai/producer'], output_sha256: sha256(review) }));
  const approvals = { rows: [{
    id: row.id, observation_sha256: observationDigest(artifactRow), critic_model: 'deepseek/critic', producer_models: ['openai/producer'],
    review_file: 'review.json', review_sha256: sha256(review), artifact_file: 'artifact.json', review_row: row.id,
    verdict: 'accepted', evidence_locator: 'fixture row',
  }] };
  return { reviewed, approvals };
}

test('D174: the gauntlet fingerprints a reviewed-join row in the form the ingest approves', () => {
  const row = joinedRow();
  const form = approvedForm(row);
  assert.equal(form.subject.model_id, null, 'the value approval binds the row before the join');
  assert.equal('identity_review' in form, false);
  assert.equal('join_note' in form, false);
  assert.equal(observationDigest(form), observationDigest(unjoined(row)));
  // Everything the critic actually checks is still in front of it.
  assert.equal(form.value, row.value);
  assert.deepEqual(form.source, row.source);
  assert.equal(form.protocol, row.protocol);
  // A row without a reviewed join, and any artifact that is not an observation, pass through.
  const plain = { ...row, subject: { ...row.subject }, join_note: undefined, identity_review: undefined };
  assert.equal(approvedForm(plain), plain);
  assert.deepEqual(approvedForm({ id: 'contract-1', unit: 'n/a' }), { id: 'contract-1', unit: 'n/a' });
  assert.equal(approvedForm(null), null);
});

test('D174: the joined fingerprint is what the daily refused; the approved form is accepted', async () => {
  const root = await mkdtemp(join(tmpdir(), 'd174-'));
  try {
    const row = joinedRow();
    // What the run of 2026-09-23 00:41 produced: artifact and approval on the joined row.
    const before = await fixture(root, row, 'joined');
    await assert.rejects(verifyScoreEvidence(snapshot([before.reviewed]), registry, { root, approvals: before.approvals }),
      /Unreviewed vendor score/, 'the production failure is reproduced');
    // What the fix produces: both on the approved (unjoined) form.
    const after = await fixture(root, row, 'approved');
    const result = await verifyScoreEvidence(snapshot([after.reviewed]), registry, { root, approvals: after.approvals });
    assert.equal(result.self_reported_verified, 1);
    // The fingerprint alone is not enough: the guard re-hashes the row it finds in the artifact.
    const halfFixed = { rows: [{ ...before.approvals.rows[0], observation_sha256: observationDigest(unjoined(before.reviewed)) }] };
    await fixture(root, row, 'joined');
    await assert.rejects(verifyScoreEvidence(snapshot([before.reviewed]), registry, { root, approvals: halfFixed }),
      /differs from critic artifact/, 'artifact and fingerprint have to move together');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('D174: a re-captured row still needs a fresh approval — the fix does not widen the guard', async () => {
  const root = await mkdtemp(join(tmpdir(), 'd174-recapture-'));
  try {
    const row = joinedRow();
    const { reviewed, approvals } = await fixture(root, row, 'approved');
    // The same row after tomorrow's capture: new file, new date, and the board's rank moved.
    const recaptured = { ...reviewed, source: { ...reviewed.source, retrieved_at: '2026-09-24', file: 'source.txt' },
      protocol: 'source row: {"cells":["5","Fixture Model Max","80 %"]}' };
    await assert.rejects(verifyScoreEvidence(snapshot([recaptured]), registry, { root, approvals }), /Unreviewed vendor score/);
    // And a changed value never rides in on yesterday's approval either.
    await assert.rejects(verifyScoreEvidence(snapshot([{ ...reviewed, value: 0.9 }]), registry, { root, approvals }), /Unreviewed vendor score/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('D174: the gauntlet reviews and fingerprints the same rows it normalised', async () => {
  const src = await readFile(new URL('../ops/daily/gauntlet.mjs', import.meta.url), 'utf8');
  assert.match(src, /let current = \(Array\.isArray\(rows\) \? rows : \[\]\)\.map\(approvedForm\);/, 'rows are normalised once, before the artifact is frozen');
  assert.match(src, /JSON\.stringify\(current, null, 2\)/, 'the artifact is written from those rows');
  assert.match(src, /observation_sha256: observationDigest\(row\)/, 'the fingerprint hashes a row of `current`');
});
