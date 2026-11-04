// CR-680 (2026-11-04): the unattended daily stopped publishing. `scripts/ingest-benchmark-scores.mjs` refused
// "Unreviewed vendor score: public:0565ee3961b65e2ae5e94e18" (SWE-bench Multilingual, "Gemini 3 Pro") although nothing
// about the row had changed. The 2026-11-03 refresh reviewed T-Systems retiring its Gemini 3 Pro offers, those were the
// model's only offers, so gemini-3-pro::default left the catalog. The display-name bridge then no longer applied, the row
// came out unjoined, and its approval (bound to the joined row with its join_note) no longer hashed the same.
// A reviewed identity join was already immune (D174); this pins the same outcome for the bridge without widening the
// guard. The values are fixtures, not benchmark claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyScoreEvidence, sha256, observationDigest } from '../lib/benchmark-score-evidence.mjs';

const registry = { entries: [{ id: 'bench::1', version: '1', family: 'bench', scoring: { unit: 'fraction', range: [0, 1] } }] };
const collections = [{ benchmark_id: 'bench::1', status: 'collected', reason: 'Captured source', source_url: 'https://vendor.example.org/release' }];
const snapshot = (observations) => ({ schema_version: 1, observations, missing: [], rejected: [], collections });

const bridged = {
  id: 'public:fixture', value: 0.8, basis: 'self_reported', benchmark_id: 'bench::1', unit: 'fraction',
  subject: { source_id: 'fixture-board-row', name: 'Fixture Model', model_id: 'fixture-model::default', variant: null, harness: null },
  source: { url: 'https://vendor.example.org/release', retrieved_at: '2026-09-23', published_at: null, sha256: sha256('primary'), file: 'source.txt', locator: 'board row 1' },
  protocol: 'source row: {"cells":["1","Fixture Model","80 %"]}',
  comparison_key: null,
  join_note: 'Exact display name, unique default catalog configuration; no effort alias inference.',
};
const left = (row) => { const { join_note: _note, ...rest } = row; return { ...rest, subject: { ...row.subject, model_id: null } }; };

async function fixture(root, artifactRow) {
  await writeFile(join(root, 'source.txt'), 'primary');
  const artifact = JSON.stringify([artifactRow], null, 2) + '\n';
  const review = JSON.stringify({ verdict: 'pass', artifact_sha256: sha256(artifact), coverage_checked: [1, artifactRow.id], errors_found: 0, findings: [], fixed: [], missing_evidence: [] });
  await writeFile(join(root, 'artifact.json'), artifact);
  await writeFile(join(root, 'review.json'), review);
  await writeFile(join(root, 'review.json.meta.json'), JSON.stringify({ actual_model: 'deepseek/critic', producers: ['openai/producer'], output_sha256: sha256(review) }));
  return { rows: [{
    id: artifactRow.id, observation_sha256: observationDigest(artifactRow), critic_model: 'deepseek/critic', producer_models: ['openai/producer'],
    review_file: 'review.json', review_sha256: sha256(review), artifact_file: 'artifact.json', review_row: 1,
    verdict: 'accepted', evidence_locator: 'fixture row',
  }] };
}

const inRoot = (name, body) => test(name, async () => {
  const root = await mkdtemp(join(tmpdir(), 'cr680-'));
  try { await body(root); } finally { await rm(root, { recursive: true, force: true }); }
});

inRoot('CR-680: a bridged row keeps its value approval when its catalog configuration leaves', async (root) => {
  const approvals = await fixture(root, bridged);
  assert.equal((await verifyScoreEvidence(snapshot([bridged]), registry, { root, approvals })).self_reported_verified, 1);
  assert.equal((await verifyScoreEvidence(snapshot([left(bridged)]), registry, { root, approvals })).self_reported_verified, 1,
    'the production failure: the same row, unjoined');
});

inRoot('CR-680: only the join may go; anything the critic checked still needs a fresh approval', async (root) => {
  const approvals = await fixture(root, bridged);
  const row = left(bridged);
  for (const changed of [{ ...row, value: 0.9 }, { ...row, protocol: 'source row: {"cells":["5","Fixture Model","80 %"]}' },
    { ...row, source: { ...row.source, retrieved_at: '2026-09-24' } }, { ...row, subject: { ...row.subject, name: 'Other Model' } },
    { ...row, join_note: 'kept note' }]) {
    await assert.rejects(verifyScoreEvidence(snapshot([changed]), registry, { root, approvals }), /Unreviewed vendor score/);
  }
  await assert.rejects(verifyScoreEvidence(snapshot([{ ...bridged, subject: { ...bridged.subject, model_id: 'other::default' } }]), registry, { root, approvals }),
    /Unreviewed vendor score/, 'a join to a different configuration is not a lost join');
});

inRoot('CR-680: every other approval check still binds the unjoined row', async (root) => {
  const approvals = await fixture(root, bridged);
  const row = left(bridged);
  const [approval] = approvals.rows;
  await assert.rejects(verifyScoreEvidence(snapshot([row]), registry, { root, approvals: { rows: [{ ...approval, critic_model: 'openai/critic' }] } }),
    /Unreviewed vendor score/, 'a same-family critic is no review');
  await assert.rejects(verifyScoreEvidence(snapshot([row]), registry, { root, approvals: { rows: [{ ...approval, observation_sha256: sha256('other') }] } }),
    /Unreviewed vendor score/, 'the approval must name the row in the artifact');
  await assert.rejects(verifyScoreEvidence(snapshot([row]), registry, { root, approvals: { rows: [{ ...approval, verdict: 'pending' }] } }), /Missing owner acceptance/);
  await writeFile(join(root, 'review.json'), JSON.stringify({ verdict: 'revise' }));
  await assert.rejects(verifyScoreEvidence(snapshot([row]), registry, { root, approvals }), /Critic receipt digest mismatch/);
});

inRoot('CR-680: a row approved unjoined is not rescued by the join-loss path', async (root) => {
  const approvals = await fixture(root, left(bridged));
  assert.equal((await verifyScoreEvidence(snapshot([left(bridged)]), registry, { root, approvals })).self_reported_verified, 1);
  await assert.rejects(verifyScoreEvidence(snapshot([left({ ...bridged, value: 0.9 })]), registry, { root, approvals }), /Unreviewed vendor score/);
});
