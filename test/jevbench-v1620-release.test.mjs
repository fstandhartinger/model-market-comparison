import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateJevbenchV1620Bundle } from '../lib/jevbench-v1620-release.mjs';
import { readOptionalJevbenchV1618Release, V1618_ROOT } from '../lib/jevbench-v1618-release.mjs';

const root = process.cwd();
const base = `${root}/${V1618_ROOT}`;
const json = async (name) => JSON.parse(await readFile(`${base}/jevbench-v1.6.20-${name}.json`, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const previous = await readOptionalJevbenchV1618Release(root);
const previousManifestSha256 = hash(await readFile(`${base}/jevbench-v1.6.18-publication.json`));
const resultsSha256 = hash(await readFile(`${base}/jevbench-v1.6.20-results.json`));
const [storedManifest, artifact, categories, proof] = await Promise.all([
  readFile(`${base}/jevbench-v1.6.20-publication.json`, 'utf8').then(JSON.parse),
  json('results'), json('categories'), json('proof'),
]);
const selectedLabel = 'Publish (recommended)';
const previewSha = 'c'.repeat(64);
function approvalBundle() {
  const manifest = structuredClone(storedManifest);
  manifest.review = { engine: 'independent-review-fixture', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) };
  const approvedProof = structuredClone(proof);
  approvedProof.refreshed_preview_go_card = '99999';
  approvedProof.refreshed_preview_approval = { card_id: '99999', selection: selectedLabel, preview_png_sha256: previewSha,
    channel: 'direct-message', button_tap: false, recorded_at: '2026-01-01T00:00:00Z',
    recorded_in: 'fixture decision log' };
  approvedProof.authority += ` Florian refreshed-preview approval: direct-message 2026-01-01T00:00:00Z, recorded as Telegram card #99999 = "${selectedLabel}" (fixture decision log; no button tap); preview PNG SHA-256 ${previewSha}.`;
  // critic r3 P3-1: the public note is now bound to the card id and the PNG hash too, so the fixture must
  // rewrite the note the same way it rewrites the proof.
  const approvedArtifact = structuredClone(artifact);
  approvedArtifact.measurement_notes = approvedArtifact.measurement_notes.map(n => n.includes('PRICE-ONLY')
    ? n.replace(/Telegram card #17515/g, 'Telegram card #99999')
       .replace(/8cb19a14e4304228b3fccbd1a4a12feabb53b5a9fb884434a9a95c6a7639d88e/g, previewSha)
    : n);
  return { manifest, artifact: approvedArtifact, categories: structuredClone(categories), proof: approvedProof,
    previous, previousManifestSha256, resultsSha256 };
}

test('v1.6.20 accepts the exact price-only addendum when a fresh merged-board GO is bound', () => {
  assert.doesNotThrow(() => validateJevbenchV1620Bundle(approvalBundle()));
});

test('v1.6.20 rejects stale, prefix, and non-Telegram IDs as refreshed GO even with matching synthetic fields', () => {
  for (const cardId of ['17513', '1751', '19174', '019174']) {
    const bundle = approvalBundle();
    bundle.proof.refreshed_preview_go_card = cardId;
    bundle.proof.refreshed_preview_approval.card_id = cardId;
    bundle.proof.authority = bundle.proof.authority.replace('Telegram card #99999 =', `Telegram card #${cardId} =`);
    assert.throws(() => validateJevbenchV1620Bundle(bundle), /fresh merged-board preview GO/);
  }
});

test('v1.6.20 rejects mismatched fresh-GO selection or preview image binding', () => {
  const wrongSelection = approvalBundle();
  wrongSelection.proof.refreshed_preview_approval.selection = 'Hold';
  assert.throws(() => validateJevbenchV1620Bundle(wrongSelection), /fresh merged-board preview GO/);
  const wrongMarker = approvalBundle();
  wrongMarker.proof.authority = wrongMarker.proof.authority.replace(previewSha, 'd'.repeat(64));
  assert.throws(() => validateJevbenchV1620Bundle(wrongMarker), /fresh merged-board preview GO authority binding/);
});

test('v1.6.20 refuses an approval that misstates how it arrived', () => {
  // The GO-binding critic's P1: a release may not tell the public Florian pressed a button he did not press.
  const claimsTap = approvalBundle();
  claimsTap.proof.refreshed_preview_approval.button_tap = true;
  assert.throws(() => validateJevbenchV1620Bundle(claimsTap), /approval channel and provenance/);
  const claimsButtonChannel = approvalBundle();
  claimsButtonChannel.proof.refreshed_preview_approval.channel = 'telegram-button';
  assert.throws(() => validateJevbenchV1620Bundle(claimsButtonChannel), /approval channel and provenance/);
  for (const field of ['channel', 'button_tap', 'recorded_at', 'recorded_in']) {
    const missing = approvalBundle();
    delete missing.proof.refreshed_preview_approval[field];
    assert.throws(() => validateJevbenchV1620Bundle(missing), /approval channel and provenance/);
  }
  const wrongProvenanceMarker = approvalBundle();
  // target the fixture's own appended marker, not the real one that is already in proof.authority
  wrongProvenanceMarker.proof.authority = wrongProvenanceMarker.proof.authority.replace(
    'fixture decision log; no button tap', 'fixture decision log; tapped');
  assert.throws(() => validateJevbenchV1620Bundle(wrongProvenanceMarker), /fresh merged-board preview GO authority binding/);
});

test('v1.6.20 refuses a public note that misdescribes how the approval arrived', () => {
  // critic-v1620-go-r2 P3-1: the public sentence, not only the authority string, must match button_tap.
  const droppedClause = approvalBundle();
  const notes = droppedClause.artifact.measurement_notes;
  const i = notes.findIndex((n) => n.includes('PRICE-ONLY'));
  notes[i] = notes[i].replace(" The card's own button was not pressed.", '');
  assert.throws(() => validateJevbenchV1620Bundle(droppedClause), /public note must describe how the approval arrived/);
  const claimsTapInPublic = approvalBundle();
  const notes2 = claimsTapInPublic.artifact.measurement_notes;
  const j = notes2.findIndex((n) => n.includes('PRICE-ONLY'));
  notes2[j] = notes2[j].replace("The card's own button was not pressed.",
    'Florian selected "Publish (recommended)" on Telegram card #17515.');
  assert.throws(() => validateJevbenchV1620Bundle(claimsTapInPublic), /public note must describe how the approval arrived/);
});

test('v1.6.20 refuses a missing public-preview or waitlist price disclosure', () => {
  const bundle = approvalBundle();
  const row = bundle.artifact.systems.find((s) => s.key === 'subq-snap-preview');
  row.cost.basis = row.cost.basis.replace(/waitlist/gi, 'capacity queue');
  bundle.proof.repriced_rows['subq-snap-preview'].current.cost.basis = row.cost.basis;
  assert.throws(() => validateJevbenchV1620Bundle(bundle), /SubQ public basis/);
});

test('v1.6.20 binds every raw hash to the validated predecessor', () => {
  const bundle = approvalBundle();
  const fake = 'b'.repeat(64);
  bundle.proof.raw_sha256['subq-snap-preview'] = fake;
  bundle.proof.repriced_rows['subq-snap-preview'].raw_sha256 = fake;
  assert.throws(() => validateJevbenchV1620Bundle(bundle), /frozen raw hash map/);
});

test('v1.6.20 binds tariff, cost, and proof aggregates to the result row', () => {
  const wrongPrice = approvalBundle();
  wrongPrice.proof.repriced_rows['subq-snap-preview'].price_per_million.input = 0.0498;
  assert.throws(() => validateJevbenchV1620Bundle(wrongPrice), /repriced tariff and usage/);

  const wrongAggregate = approvalBundle();
  wrongAggregate.proof.systems.find((s) => s.key === 'subq-snap-preview').composite_A = 99;
  assert.throws(() => validateJevbenchV1620Bundle(wrongAggregate), /proof row composite subq-snap-preview/);
});

test('v1.6.20 freezes preliminary rows and SubQ measurement details outside cost-derived values', () => {
  const preliminaryKey = previous.artifact.systems.find((s) => !s.ranked && s.key !== 'subq-snap-preview').key;
  const changedPreliminary = approvalBundle();
  changedPreliminary.artifact.systems.find((s) => s.key === preliminaryKey).capability += 1;
  assert.throws(() => validateJevbenchV1620Bundle(changedPreliminary), /carried preliminary row changed/);

  const changedUsage = approvalBundle();
  changedUsage.artifact.systems.find((s) => s.key === 'subq-snap-preview').status.rows -= 1;
  assert.throws(() => validateJevbenchV1620Bundle(changedUsage), /item count|SubQ frozen measurements or metadata changed/);

  const changedCI = approvalBundle();
  changedCI.artifact.systems.find((s) => s.key === 'subq-snap-preview').v16.ci95.I = [0, 100];
  assert.throws(() => validateJevbenchV1620Bundle(changedCI), /SubQ frozen measurements or metadata changed/);
});

test('v1.6.20 preserves SubQ endpoint metadata and binds category results to result bytes', () => {
  const missingRepo = approvalBundle();
  delete missingRepo.artifact.systems.find((s) => s.key === 'subq-snap-preview').repo;
  assert.throws(() => validateJevbenchV1620Bundle(missingRepo), /SubQ frozen measurements or metadata changed/);

  const wrongCategoryHash = approvalBundle();
  wrongCategoryHash.categories.results_sha256 = 'd'.repeat(64);
  assert.throws(() => validateJevbenchV1620Bundle(wrongCategoryHash), /category hashes and identity/);
});
