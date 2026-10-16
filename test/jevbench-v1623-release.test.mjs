import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateJevbenchV1623Bundle, V1623_REPRICED_KEYS, V1623_REPRICE_SPEC } from '../lib/jevbench-v1623-release.mjs';
import { readOptionalJevbenchV1622Release, V1622_ROOT } from '../lib/jevbench-v1622-release.mjs';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';
import { readListingCorrections, applyListingCorrection, jevWithCohortRows, readCohortRows } from '../lib/jevbench-cohort-merge.mjs';

const root = process.cwd();
const base = `${root}/${V1622_ROOT}`;
const json = async (name) => JSON.parse(await readFile(`${base}/jevbench-v1.6.23-${name}.json`, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const previous = await readOptionalJevbenchV1622Release(root);
const previousManifestSha256 = hash(await readFile(`${base}/jevbench-v1.6.22-publication.json`));
const [storedManifest, artifact, categories, proof] = await Promise.all([json('publication'), json('results'), json('categories'), json('proof')]);
const SAGE = 'sage-1.4.0', NIMBLE = 'nimble-v4', NIMBLE_MAX = 'nimble-v4-max';
const PUB = 'Publication of v1.6.23:';
const NOTE = 'v1.6.23 PRICES 3 ROWS';
const PH_TEXT = 'Top-five preview approval: PLACEHOLDER - a top five changes and the preview card has not been answered yet; this build cannot be published until fill_approval_v1623.sh rebuilds it with the real card, channel and timestamps.';
const PH_MARKER = 'Florian top-five preview approval: PLACEHOLDER.';
const stillPlaceholder = JSON.stringify(proof).includes('PLACEHOLDER');
const pngSha = 'c'.repeat(64);
const fixtureApproval = { card_id: '99999', selection: 'Publish (recommended)', preview_png_sha256: pngSha, channel: 'direct-message',
  button_tap: false, recorded_at: '2026-01-01T00:00:00Z', recorded_in: 'fixture decision log' };
const fixtureText = `The top-five preview (PNG sha256 ${pngSha}) was sent to Florian as Telegram card #99999; it was published on his direct-message GO at ${fixtureApproval.recorded_at} ("${fixtureApproval.selection}"; ${fixtureApproval.recorded_in}). The card's own button was not pressed.`;
const fixtureMarker = `Florian top-five preview approval: direct-message ${fixtureApproval.recorded_at}, recorded as Telegram card #99999 = "${fixtureApproval.selection}" (${fixtureApproval.recorded_in}; no button tap); preview PNG SHA-256 ${pngSha}.`;

/** The stored build with a fake PASS review; while the preview card is unanswered, a fixture approval stands in. */
function approvedBundle() {
  const manifest = structuredClone(storedManifest);
  manifest.review = { engine: 'independent-review-fixture', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) };
  const p = structuredClone(proof), a = structuredClone(artifact);
  if (stillPlaceholder) {
    p.publication_approval.top_five_preview = structuredClone(fixtureApproval);
    p.publication_approval.button_tap = false;
    p.authority = p.authority.replace(PH_TEXT, fixtureText).replace(PH_MARKER, fixtureMarker);
    a.measurement_notes = a.measurement_notes.map(n => n.startsWith(PUB) ? n.replace(PH_TEXT, fixtureText) : n);
  }
  return { manifest, artifact: a, categories: structuredClone(categories), proof: p, previous, previousManifestSha256 };
}
const row = (b, key) => b.artifact.systems.find(s => s.key === key);
const noteIndex = (b, prefix) => b.artifact.measurement_notes.findLastIndex(x => x.startsWith(prefix));
const rejects = (mutate, pattern) => { const b = approvedBundle(); mutate(b); assert.throws(() => validateJevbenchV1623Bundle(b), pattern); };

test('v1.6.23 accepts the stored build once the review passes and the approval is real', () => {
  assert.doesNotThrow(() => validateJevbenchV1623Bundle(approvedBundle()));
  assert.deepEqual(artifact.systems.filter(s => s.repriced_in === 'v1.6.23').map(s => s.key).sort(), V1623_REPRICED_KEYS);
  assert.equal(artifact.systems.filter(s => s.measured_in === 'v1.6.23').length, 0);
});

test('v1.6.23 is not publishable while the manifest is PENDING', () => {
  const b = approvedBundle();
  b.manifest.review = { engine: 'PENDING', verdict: 'PENDING', receipt_sha256: null };
  assert.throws(() => validateJevbenchV1623Bundle(b), /independent release review/);
});

test('v1.6.23 refuses an unfilled approval placeholder, wherever it is left', () => {
  if (stillPlaceholder) {
    const manifest = structuredClone(storedManifest);
    manifest.review = { engine: 'independent-review-fixture', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) };
    assert.throws(() => validateJevbenchV1623Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }), /approval placeholder not filled/);
  }
  rejects(b => { b.proof.publication_approval.top_five_preview.card_id = 'PLACEHOLDER-CARD-ID'; }, /approval placeholder not filled/);
  rejects(b => { b.proof.publication_approval.top_five_preview.recorded_in = 'PLACEHOLDER-RECORDED-IN'; }, /approval placeholder not filled/);
  rejects(b => { const i = noteIndex(b, PUB); b.artifact.measurement_notes[i] += ' PLACEHOLDER'; }, /approval placeholder not filled/);
  rejects(b => { b.proof.authority += ' ' + PH_MARKER; }, /approval placeholder not filled/);
});

test('v1.6.23 refuses an approval that misstates how it arrived', () => {
  assert.equal(proof.publication_approval.top_five_effect, 'changes');
  rejects(b => { const c = b.proof.publication_approval.top_five_preview; c.button_tap = !c.button_tap; }, /approval channel and provenance/);
  rejects(b => { const c = b.proof.publication_approval.top_five_preview; c.channel = c.channel === 'telegram-button' ? 'direct-message' : 'telegram-button'; }, /approval channel and provenance/);
  rejects(b => { b.proof.publication_approval.top_five_preview.card_id = '17683'; }, /top-five preview approval card/);
  rejects(b => { b.proof.publication_approval.top_five_preview.card_id = '017700'; }, /top-five preview approval card/);
  rejects(b => { b.proof.publication_approval.top_five_preview.preview_png_sha256 = 'd'.repeat(64); }, /public note must describe|approval authority binding/);
  // the note must match the stored channel: no tap claimed without a tap, no "not pressed" after a tap
  const tapped = approvedBundle().proof.publication_approval.button_tap;
  rejects(b => { const i = noteIndex(b, PUB); const n = b.artifact.measurement_notes[i];
    b.artifact.measurement_notes[i] = tapped ? n + " The card's own button was not pressed." : n.replace("The card's own button was not pressed.", ''); }, /public note must describe/);
  rejects(b => { const i = noteIndex(b, PUB); const n = b.artifact.measurement_notes[i];
    b.artifact.measurement_notes[i] = tapped ? n.replace(/selected "[^"]*" on Telegram card/, 'answered Telegram card') : n + ' Florian selected "Publish" on Telegram card #99999.'; }, /public note must describe/);
  rejects(b => { b.proof.publication_approval.go.quote = 'go'; }, /publication GO provenance/);
  rejects(b => { b.proof.publication_approval.go_priority.recorded_in = 'board #9'; }, /priority GO provenance/);
  rejects(b => { delete b.proof.publication_approval.go_priority; }, /priority GO provenance/);
  rejects(b => { const i = noteIndex(b, PUB); b.artifact.measurement_notes[i] = b.artifact.measurement_notes[i].replace('(and actually do it please)', ''); }, /public note must describe/);
  // a top-five change needs a preview card: the no-card path is refused while the board note says lists change
  rejects(b => { b.proof.publication_approval = { go: b.proof.publication_approval.go, go_priority: b.proof.publication_approval.go_priority, top_five_effect: 'none', top_five_preview: null, button_tap: false }; }, /no-change board note|public note must not claim|approval authority binding/);
});

test('v1.6.23 prices each row at its public tariff over its own tokens, and nothing else', () => {
  for (const key of V1623_REPRICED_KEYS) {
    // a priced row with the wrong tariff
    rejects(b => { b.proof.repriced_rows[key].price_per_million.input *= 2; }, /tariff|cost binding/);
    rejects(b => { const s = row(b, key); s.cost = { ...s.cost, usd_per_1000: s.cost.usd_per_1000 * 1.01 }; }, /cost/);
    rejects(b => { b.proof.repriced_rows[key].input_tokens -= 1; }, /usage/);
    rejects(b => { row(b, key).cost.basis += ' '; }, /cost basis verbatim/);
    rejects(b => { delete row(b, key).cost.basis; }, /documented cost basis|cost basis/);
    rejects(b => { b.proof.repriced_rows[key].price_source.saved_copy_sha256 = 'b'.repeat(64); }, /reprice provenance/);
    rejects(b => { b.proof.repriced_rows[key].pricing_module_sha256 = 'dcfcecb06525ce4a5ece37400ea261b97d2fe5d41155f3cd02b03cac86572835'; }, /reprice provenance/);
    // unpriced again, or not ranked
    rejects(b => { const s = row(b, key); s.cost = { ...s.cost, kind: 'unpriced', usd_per_1000: null }; s.axes.cost = null; }, /unpriced|cost|axis|reproduce/);
    rejects(b => { const s = row(b, key); s.ranked = false; s.listing = 'listed'; }, /is ranked|ranked row count|board membership|n_ranked/);
    rejects(b => { row(b, key).not_ranked_because = 'registry ranked=false or no composite'; }, /is ranked/);
    rejects(b => { row(b, key).views['Intelligence only'] = null; }, /publishes its presets/);
    // a measured value may not move in a price-only release
    rejects(b => { row(b, key).capability += 0.001; }, /measured value|capability/);
    rejects(b => { row(b, key).axes.speed += 0.001; }, /measured value/);
    rejects(b => { row(b, key).speed.p50_s_raw += 0.001; }, /measured value/);
    rejects(b => { row(b, key).endpoint_condition += ' '; }, /measured value/);
    rejects(b => { row(b, key).measured_in = 'v1.6.23'; }, /measurement date/);
    rejects(b => { delete row(b, key).repriced_in; }, /reprice marker/);
    rejects(b => { b.proof.repriced_rows[key].previous.scores.A = 1; }, /previous proof state/);
    rejects(b => { b.proof.repriced_rows[key].current.rank += 1; }, /current proof state/);
    rejects(b => { b.proof.raw_sha256[key] = 'b'.repeat(64); }, /reprice provenance|inherited proof field raw_sha256/);
    // public text: no personal e-mail or internal path
    rejects(b => { const i = noteIndex(b, `${key} PRICED in v1.6.23: `); b.artifact.measurement_notes[i] += ' Contact: someone@example.com.'; }, /personal e-mail or internal path/);
    rejects(b => { const i = noteIndex(b, `${key} PRICED in v1.6.23: `); b.artifact.measurement_notes[i] += ' Receipt /home/flori/jobs/x/v1623/receipts/y.json.'; }, /personal e-mail or internal path/);
    for (const fragment of V1623_REPRICE_SPEC[key].disclosures) {
      rejects(b => { const i = noteIndex(b, `${key} PRICED in v1.6.23: `); b.artifact.measurement_notes[i] = b.artifact.measurement_notes[i].replaceAll(fragment, 'x'); }, /required disclosure/);
    }
  }
  // a Nimble row claiming output cost (Bespoke bills input tokens only)
  for (const key of [NIMBLE, NIMBLE_MAX]) {
    rejects(b => { const n = b.proof.repriced_rows[key]; n.price_per_million.output = 0.1; n.usd_per_1000 = 1000 * (n.input_tokens * n.price_per_million.input + n.output_tokens * 0.1) / 1e6 / 1500; }, /tariff|cost binding/);
    rejects(b => { const s = row(b, key); s.cost = { ...s.cost, usd_per_1000: 1000 * (1935351 * V1623_REPRICE_SPEC[key].price.input + 3000 * 0.1) / 1e6 / 1500 }; }, /cost/);
  }
  // Sage 1.4: the measured output tokens are zero; a basis or proof claiming otherwise is refused
  rejects(b => { b.proof.repriced_rows[SAGE].output_tokens = 1000; }, /usage/);
  // the over-cap disclosure: required on nimble-v4-max, forbidden on the two rows under the cap
  rejects(b => { const s = row(b, NIMBLE_MAX); s.cost.basis = s.cost.basis.replace('OVER THE OFFICIAL COST CAP', 'over the cap'); }, /cost basis verbatim|over-cap disclosure/);
  rejects(b => { b.proof.repriced_rows[NIMBLE_MAX].under_cost_cap = true; }, /cost binding/);
  rejects(b => { b.proof.repriced_rows[NIMBLE].treatment = 'ranked_over_cap'; }, /cost binding/);
  assert.ok(row(approvedBundle(), NIMBLE_MAX).cost.usd_per_1000 > 0.06459465517241379);
  assert.ok(row(approvedBundle(), NIMBLE).cost.usd_per_1000 < 0.06459465517241379 && row(approvedBundle(), SAGE).cost.usd_per_1000 < 0.06459465517241379);
});

test('v1.6.23 freezes every carried point estimate and interval and names every rank move', () => {
  rejects(b => { row(b, 'liquid-d1-ultra').capability += 1; }, /carried row differs|capability/);
  rejects(b => { row(b, 'liquid-d1-ultra').composite_ci95.A[0] -= 0.1; }, /carried row differs/);
  rejects(b => { row(b, 'amos-1-large').ranks.A += 1; }, /rank|carried/);
  rejects(b => { const s = row(b, 'trio-spark-v1.3'); s.ranked = true; s.listing = 'ranked'; s.rank = 24; }, /cannot be ranked|listed-not-ranked|carried row differs|ranked row count|n_ranked/);
  const note = artifact.measurement_notes.find(x => x.startsWith(NOTE));
  const rankEntry = note.split('RANKS: ')[1].split(', ')[0];
  rejects(b => { const i = noteIndex(b, NOTE); b.artifact.measurement_notes[i] = b.artifact.measurement_notes[i].replace(`${rankEntry}, `, ''); }, /moved carried rank must name its row/);
  rejects(b => { const i = noteIndex(b, NOTE); b.artifact.measurement_notes[i] = b.artifact.measurement_notes[i].replace('Carried rows whose intervals moved: none.', ''); }, /no carried interval moved/);
  rejects(b => { const a2 = b.artifact.systems.find(s => s.key === 'microsoft-decision-1-a2-20261012'); a2.display += ' '; }, /carried preliminary row unchanged/);
  rejects(b => { b.proof.raw_sha256['liquid-d1-ultra'] = 'b'.repeat(64); }, /inherited proof field raw_sha256/);
  rejects(b => { b.proof.authority = b.proof.authority.replace('#19174', '#19175'); }, /inherited authority unchanged/);
  rejects(b => { b.proof.pricing_module_sha256 = 'dcfcecb06525ce4a5ece37400ea261b97d2fe5d41155f3cd02b03cac86572835'; }, /pricing re-freeze binding/);
  rejects(b => { b.proof.repriced_rows['subq-snap-preview'].usd_per_1000 = 0.01; }, /inherited repriced row/);
  rejects(b => { const c = b.categories.systems['krino-2b']; const d = Object.keys(c)[0]; const k = Object.keys(c[d])[0]; c[d][k] = { ...c[d][k], competence: c[d][k].competence + 1 }; }, /changes no category cell/);
  rejects(b => { b.artifact.G_med_api_basis_P_vs_A += 1; }, /moves no diagnostic/);
});

test('v1.6.23 does not unrank Sage 1.3.0: no presentation mechanism can, and the bundle cannot carry it', async () => {
  // Sage 1.3.0 is a v1.6.1 headline row, not a row of this draw: adding it to this bundle (e.g. as an unranked
  // "superseded" row) is refused as a cohort change.
  rejects(b => { b.artifact.systems.push({ ...structuredClone(row(b, SAGE)), key: 'sage-1.3.0', ranked: false, rank: null, listing: 'listed' }); b.artifact.roster_count += 1; }, /exact cohort/);
  // The listing-correction layer only applies to cohort rows: a correction for sage-1.3.0 would not touch its v1.6.1 row.
  const corrections = await readListingCorrections(root);
  assert.equal(corrections.has('sage-1.3.0'), false, 'no listing correction for sage-1.3.0 in this release');
  const { artifact: headline } = await readJevbenchV161Release();
  const sage13 = headline.systems.find(s => s.key === 'sage-1.3.0');
  assert.equal(sage13.ranked, true);
  const cohort = await readCohortRows(root, () => {});
  assert.ok(!cohort.rows.some(r => r.row.key === 'sage-1.3.0'), 'sage-1.3.0 is not a cohort row');
  const unrank = { key: 'sage-1.3.0', ranked: false, listing: 'listed', listing_note: 'older version' };
  const merged = jevWithCohortRows(headline, { ...cohort, rows: cohort.rows.map(r => ({ ...r, row: applyListingCorrection(r.row, r.row.key === 'sage-1.3.0' ? unrank : undefined) })) });
  assert.equal(merged.systems.find(s => s.key === 'sage-1.3.0').ranked, true, 'the cohort listing layer cannot unrank a v1.6.1 row');
  // Sage 1.4 itself is now a ranked row of the merged board
  const s14 = cohort.rows.find(r => r.row.key === SAGE);
  if (s14?.draw.release === 'v1.6.23') assert.equal(merged.systems.find(s => s.key === SAGE).ranked, true);
});

test('v1.6.23 needs the generated board-effect note, never the provisional one', () => {
  rejects(b => { const i = noteIndex(b, 'Board effect'); b.artifact.measurement_notes[i] = 'Board effect PROVISIONAL-TOPFIVE: awaiting all 21 view/ranking comparisons; never publish this placeholder.'; }, /board effect/);
  rejects(b => { b.artifact.measurement_notes.splice(noteIndex(b, 'Board effect'), 1); }, /board effect/);
  rejects(b => { const i = noteIndex(b, 'Board effect'); b.artifact.measurement_notes[i] = b.artifact.measurement_notes[i].replaceAll('sage-1.4.0', 'Sage'); }, /board effect/);
});
