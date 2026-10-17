import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateJevbenchV1626Bundle, V1626_NEW_KEYS, V1626_RANKED_NEW_KEYS, V1626_UNRANKED_NEW_KEYS, V1626_OVER_CAP_NEW_KEYS,
         V1626_REPRICED_KEYS, V1626_ABOVE_COST_CAP_KEYS, V1626_DEPRECATION_TEXT } from '../lib/jevbench-v1626-release.mjs';
import { readOptionalJevbenchV1625Release, V1625_ROOT } from '../lib/jevbench-v1625-release.mjs';

const root = process.cwd();
const base = `${root}/${V1625_ROOT}`;
const json = async (name) => JSON.parse(await readFile(`${base}/jevbench-v1.6.26-${name}.json`, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
// v1.6.26 is stacked on v1.6.25: until v1.6.25 is reviewed and its approval filled, its predecessor does not load and the
// v1.6.26 bundle cannot be validated in this tree (the synthetic-PASS gate copy makes v1.6.25 loadable).
let previous = null, previousError = null;
try { previous = await readOptionalJevbenchV1625Release(root); } catch (error) { previousError = error.message; }
const skip = previous ? false : `the v1.6.25 predecessor does not load in this tree yet (${previousError ?? 'absent'})`;
const previousManifestSha256 = hash(await readFile(`${base}/jevbench-v1.6.25-publication.json`));
const [storedManifest, artifact, categories, proof] = await Promise.all([json('publication'), json('results'), json('categories'), json('proof')]);
const NMX = 'nimble-v4-max', NV4 = 'nimble-v4', KEV = 'kev-9b-v2', JEB = 'jeb-35b-a3b', TDE = 'tde-general-large', BLINK = 'blink-4b';
const PUB = 'Publication of v1.6.26:';
const PH_TEXT = 'Top-five preview approval: PLACEHOLDER - a top five changes and the preview card has not been answered yet; this build cannot be published until fill_approval_v1626.sh rebuilds it with the real card, channel and timestamps.';
const PH_MARKER = 'Florian top-five preview approval: PLACEHOLDER.';
const ownApproval = JSON.stringify(proof.publication_approval);
const stillPlaceholder = ownApproval.includes('PLACEHOLDER');
const pngSha = 'c'.repeat(64);
const fixtureApproval = { card_id: '99999', selection: 'Publish (recommended)', preview_png_sha256: pngSha, channel: 'direct-message',
  button_tap: false, recorded_at: '2026-01-01T00:00:00Z', recorded_in: 'fixture decision log' };
const fixtureText = `The top-five preview (PNG sha256 ${pngSha}) was sent to Florian as Telegram card #99999; it was published on his direct-message GO at ${fixtureApproval.recorded_at} ("${fixtureApproval.selection}"; ${fixtureApproval.recorded_in}). The card's own button was not pressed.`;
const fixtureMarker = `Florian top-five preview approval: direct-message ${fixtureApproval.recorded_at}, recorded as Telegram card #99999 = "${fixtureApproval.selection}" (${fixtureApproval.recorded_in}; no button tap); preview PNG SHA-256 ${pngSha}.`;

/** The stored build with a fake PASS review (the only thing the independent critic adds); while the preview card is
 *  unanswered, a fixture approval stands in for the one fill_approval_v1626.sh writes. */
function approvedBundle() {
  const manifest = structuredClone(storedManifest);
  manifest.review = { engine: 'independent-review-fixture', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) };
  const p = structuredClone(proof), a = structuredClone(artifact);
  if (stillPlaceholder) {
    p.publication_approval.top_five_preview = structuredClone(fixtureApproval);
    p.publication_approval.button_tap = false;
    const head = previous.proof.authority;
    p.authority = head + p.authority.slice(head.length).replace(PH_TEXT, fixtureText).replace(PH_MARKER, fixtureMarker);
    a.measurement_notes = a.measurement_notes.map((n, i) => i >= previous.artifact.measurement_notes.length && n.startsWith(PUB) ? n.replace(PH_TEXT, fixtureText) : n);
  }
  return { manifest, artifact: a, categories: structuredClone(categories), proof: p, previous, previousManifestSha256 };
}
const row = (b, key) => b.artifact.systems.find(s => s.key === key);
// the LAST note with the prefix: earlier releases' notes (e.g. their own 'Board effect') are inherited verbatim
const noteIndex = (b, prefix) => b.artifact.measurement_notes.findLastIndex(x => x.startsWith(prefix));
const editNote = (b, prefix, f) => { const i = noteIndex(b, prefix); b.artifact.measurement_notes[i] = f(b.artifact.measurement_notes[i]); };
const rejects = (mutate, pattern) => { const b = approvedBundle(); mutate(b); assert.throws(() => validateJevbenchV1626Bundle(b), pattern); };

test('v1.6.26 accepts the stored build once the review passes', { skip }, () => {
  assert.doesNotThrow(() => validateJevbenchV1626Bundle(approvedBundle()));
  assert.deepEqual(artifact.systems.filter(s => s.measured_in === 'v1.6.26').map(s => s.key).sort(), V1626_NEW_KEYS);
  assert.deepEqual(artifact.systems.filter(s => s.repriced_in === 'v1.6.26').map(s => s.key), V1626_REPRICED_KEYS);
});

test('v1.6.26 is not publishable while the manifest is PENDING', { skip }, () => {
  const b = approvedBundle();
  b.manifest.review = { engine: 'PENDING', verdict: 'PENDING', receipt_sha256: null };
  assert.throws(() => validateJevbenchV1626Bundle(b), /independent release review/);
});

test('v1.6.26 refuses a priced new row without its cost basis, tariff, own tokens or cap side', { skip }, () => {
  for (const key of V1626_RANKED_NEW_KEYS) {
    rejects(b => { delete row(b, key).cost.basis; }, /cost_basis verbatim|documented cost basis/);
    rejects(b => { row(b, key).cost.basis += ' '; }, /cost_basis verbatim/);
    rejects(b => { b.proof.new_rows[key].price_per_million.input *= 2; }, /tariff/);
    rejects(b => { b.proof.new_rows[key].input_tokens -= 1; }, /usage/);
    rejects(b => { row(b, key).cost.usd_per_1000 *= 1.01; }, /cost/);
    rejects(b => { b.proof.new_rows[key].under_cost_cap = !b.proof.new_rows[key].under_cost_cap; }, /cost binding/);
    rejects(b => { row(b, key).cost.usage_estimated_rows = 1; }, /tariff x own tokens/);
    rejects(b => { row(b, key).ranked = false; }, /./);
  }
  assert.deepEqual(V1626_ABOVE_COST_CAP_KEYS.filter(k => V1626_OVER_CAP_NEW_KEYS.includes(k)).sort(), [...V1626_OVER_CAP_NEW_KEYS].sort());
  for (const key of V1626_OVER_CAP_NEW_KEYS) {
    assert.ok(row(approvedBundle(), key).cost.usd_per_1000 > 0.06459465517241379, key);
    rejects(b => { row(b, key).cost.basis = row(b, key).cost.basis.replace('OVER THE OFFICIAL COST CAP', 'over'); }, /cost_basis verbatim|over-cap disclosure/);
    rejects(b => { b.proof.new_rows[key].treatment = 'ranked'; }, /new-row provenance/);
  }
  // jeb-35b-a3b: 1 output token per answered request is part of its cost (the engine's own count)
  rejects(b => { b.proof.new_rows[JEB].output_tokens = 0; }, /usage/);
});

test('v1.6.26 lists the five unpriced rows without a price, a composite or a rank', { skip }, () => {
  for (const key of V1626_UNRANKED_NEW_KEYS) {
    rejects(b => { row(b, key).ranked = true; }, /listed-not-ranked|every other|ranked/);
    rejects(b => { row(b, key).views[Object.keys(row(b, key).views)[0]] = 40; }, /null presets/);
    rejects(b => { row(b, key).not_ranked_because += ' '; }, /ranking reason verbatim/);
    rejects(b => { b.proof.new_rows[key].price_per_million = { input: 0.1, output: 0.15 }; }, /carries no price/);
    rejects(b => { b.artifact.board.A.order.push(key); }, /board membership|without an official placement|board A/);
  }
  // tde-general-large is scored from the receipted offline-token copy, the others from their raws
  rejects(b => { delete b.proof.new_rows[TDE].scoring_copy_receipt_sha256; }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[BLINK].scoring_copy_receipt_sha256 = 'b'.repeat(64); }, /measurement provenance/);
});

test('v1.6.26 carries the re-measure provenance and every disclosure verbatim', { skip }, () => {
  for (const key of V1626_NEW_KEYS) {
    rejects(b => { b.proof.new_rows[key].remeasure.custody = '#20150'; }, /measurement provenance/);
    rejects(b => { b.proof.new_rows[key].post_score_review_sha256 = null; }, /measurement provenance/);
    rejects(b => { row(b, key).speed.adjustment = 'none (API)'; }, /latency adjustment/);
    rejects(b => { row(b, key).paid_fast_lane = true; }, /not a paid row/);
    rejects(b => { row(b, key).author += ' (someone@example.com)'; }, /author verbatim|personal e-mail/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} Contact: someone@example.com.`); }, /personal e-mail or internal path/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} Receipt /home/flori/jobs/x/r129/receipts/y.json.`); }, /personal e-mail or internal path/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} See PREREG-R129-BCD.`); }, /personal e-mail or internal path/);
    rejects(b => { editNote(b, `${key}: `, n => n.replaceAll('RE-MEASURED on this draw', 'x')); }, /required disclosure/);
    rejects(b => { editNote(b, `${key}: `, n => n.replaceAll('H100', 'x')); }, /required disclosure/);
  }
  rejects(b => { b.proof.new_rows[KEV].remeasure.supersedes_historical = null; }, /measurement provenance/);
  rejects(b => { editNote(b, `${KEV}: `, n => n.replace('supersedes the historical v1.5 measurement', 'x')); }, /required disclosure/);
  rejects(b => { editNote(b, 'v1.6.26 ADDS ', n => n.replace('supersedes its historical v1.5 measurement', 'x')); }, /supersedes/);
  rejects(b => { editNote(b, `${JEB}: `, n => n.replaceAll('HTTP 529', 'HTTP 422')); }, /required disclosure/);
  rejects(b => { row(b, 'jpt-4b').licence = 'Apache-2.0'; }, /licence verbatim/);
  rejects(b => { row(b, 'jebadiah-9b-v2').model_pin = 'frontier-infra/jebadiah-9b-v2@' + 'd'.repeat(40); }, /model_pin verbatim/);
  rejects(b => { row(b, 'shisa-de-1').endpoint_condition += ' '; }, /endpoint_condition verbatim/);
  rejects(b => { row(b, 'ryotide-qwen').display = 'RYOTIDE-Qwen (csabag)'; }, /display verbatim/);
  rejects(b => { b.proof.systems.find(p => p.key === BLINK).source_review_sha256 = 'b'.repeat(64); }, /pre-score review binding/);
  rejects(b => { b.proof.new_rows[BLINK].raw_sha256 = 'e'.repeat(64); }, /new-row provenance/);
});

test('v1.6.26 re-prices nimble-v4-max from its own tokens and changes nothing else on the row', { skip }, () => {
  const s = row(approvedBundle(), NMX), a = previous.artifact.systems.find(x => x.key === NMX);
  assert.equal(s.cost.usd_per_1000, 1000 * (1935351 * 0.04) / 1e6 / 1500);
  assert.equal(a.cost.usd_per_1000, 1000 * (1935351 * 0.09) / 1e6 / 1500);
  assert.ok(s.cost.usd_per_1000 < 0.06459465517241379 && a.cost.usd_per_1000 > 0.06459465517241379);
  assert.equal(s.capability, a.capability); assert.deepEqual([s.axes.intelligence, s.axes.calibration, s.axes.speed], [a.axes.intelligence, a.axes.calibration, a.axes.speed]);
  assert.ok(!V1626_ABOVE_COST_CAP_KEYS.includes(NMX));
  rejects(b => { row(b, NMX).capability += 0.5; }, /measured value or identity field changed|capability/);
  rejects(b => { row(b, NMX).axes.intelligence += 0.5; }, /measured value|capability|reproduce/);
  rejects(b => { row(b, NMX).speed.p50_s_raw += 0.01; }, /measured value/);
  rejects(b => { row(b, NMX).measured_in = 'v1.6.26'; }, /measurement date|measured value/);
  rejects(b => { row(b, NMX).repriced_in = 'v1.6.23'; }, /reprice marker/);
  rejects(b => { row(b, NMX).cost.usd_per_1000 = a.cost.usd_per_1000; }, /cost: public tariff|above the published ceiling/);
  rejects(b => { row(b, NMX).cost.basis = row(b, NMX).cost.basis.replace('4d46184d', '4d46184e'); }, /cost basis verbatim/);
  rejects(b => { b.proof.repriced_rows[NMX].price_per_million.input = 0.09; }, /tariff/);
  rejects(b => { b.proof.repriced_rows[NMX].price_source.saved_copy_sha256 = '0'.repeat(64); }, /reprice provenance/);
  rejects(b => { b.proof.repriced_rows[NMX].previous_repricing.usd_per_1000 = 0.05; }, /earlier re-price record/);
  rejects(b => { b.proof.repriced_rows[NMX].current.scores = a.scores; }, /current proof state/);
  rejects(b => { b.proof.repriced_rows['sage-1.4.0'].usd_per_1000 = 0.02; }, /inherited repriced row/);
  rejects(b => { editNote(b, `${NMX} RE-PRICED in v1.6.26: `, n => n.replaceAll('listed USD 0.09', 'listed USD 0.08')); }, /required disclosure/);
  rejects(b => { editNote(b, 'v1.6.26 ADDS ', n => n.replace('RE-PRICED', 'PRICED')); }, /release note must name/);
  rejects(b => { b.proof.pricing_module_sha256 = '32556e546e062fb9e7e6c4c26c602acff9878aaa20261725d7c3e7ee93dfaf4b'; }, /re-freeze binding|reprice provenance/);
});

test('v1.6.26 states the nimble-v4 vendor status without changing the row', { skip }, () => {
  const s = row(approvedBundle(), NV4), a = previous.artifact.systems.find(x => x.key === NV4);
  for (const f of ['scores', 'axes', 'cost', 'capability', 'display', 'ranked', 'listing']) assert.deepEqual(s[f], a[f], f);
  rejects(b => { b.proof.vendor_status[NV4].pricing_page_still_lists = false; }, /vendor status provenance/);
  rejects(b => { delete b.proof.vendor_status; }, /vendor status/);
  rejects(b => { editNote(b, `${NV4} VENDOR STATUS: `, n => n.replace(V1626_DEPRECATION_TEXT, 'deprecated')); }, /vendor status must be stated/);
  rejects(b => { row(b, NV4).cost.usd_per_1000 *= 1.01; }, /carried row differs/);
});

test('v1.6.26 states how the approval arrived: a top five changes, so a real preview card is required', { skip }, () => {
  assert.equal(proof.publication_approval.top_five_effect, 'changes');
  assert.deepEqual(proof.publication_approval.top_five_changed_by, [NMX]);
  rejects(b => { b.proof.publication_approval.go.quote = 'go'; }, /publication GO provenance/);
  rejects(b => { b.proof.publication_approval.reprice.saved_copy_sha256 = 'f'.repeat(64); }, /re-price provenance/);
  rejects(b => { const c = b.proof.publication_approval.top_five_preview; c.button_tap = !c.button_tap; }, /approval channel and provenance/);
  rejects(b => { b.proof.publication_approval.top_five_preview.card_id = '17727'; }, /top-five preview approval card/);
  rejects(b => { b.proof.publication_approval.top_five_preview.card_id = '017800'; }, /top-five preview approval card/);
  rejects(b => { b.proof.publication_approval.top_five_preview.preview_png_sha256 = 'd'.repeat(64); }, /public note must describe|approval authority binding/);
  rejects(b => { b.proof.publication_approval = { ...b.proof.publication_approval, top_five_effect: 'none', top_five_preview: null, button_tap: false }; delete b.proof.publication_approval.top_five_changed_by; }, /no-change board note|no-card approval provenance|must not claim/);
  rejects(b => { b.proof.publication_approval.top_five_changed_by = [NMX, 'shisa-de-1']; }, /must name exactly the rows/);
  rejects(b => { editNote(b, 'Board effect', n => n.replace(`Top-five changes caused by: ${NMX}`, 'Top-five changes caused by: kettei-fat')); }, /must name exactly the rows|only a new ranked row or the re-priced row/);
});

test('v1.6.26 refuses an unfilled placeholder approval, wherever it is left', { skip }, () => {
  if (stillPlaceholder) {
    const b = approvedBundle(); b.proof = structuredClone(proof); b.artifact = structuredClone(artifact);
    assert.throws(() => validateJevbenchV1626Bundle(b), /approval placeholder not filled/);
  }
  rejects(b => { b.proof.publication_approval.top_five_preview.card_id = 'PLACEHOLDER-CARD-ID'; }, /approval placeholder not filled/);
  rejects(b => { editNote(b, PUB, n => `${n} PLACEHOLDER`); }, /approval placeholder not filled/);
  rejects(b => { b.proof.authority += ' ' + PH_MARKER; }, /approval placeholder not filled/);
});

test('v1.6.26 freezes every other carried point estimate and names every move', { skip }, () => {
  rejects(b => { row(b, 'kettei-fat').capability += 1; }, /carried row differs|capability/);
  rejects(b => { row(b, 'celeris-1-decision').cost.usd_per_1000 *= 1.01; }, /carried row differs/);
  rejects(b => { row(b, 'bongard-mini').views['Intelligence only'] = 28.39; }, /carried row differs/);
  rejects(b => { row(b, 'amos-1-large').ranks.A += 1; }, /rank|carried/);
  const moved = artifact.measurement_notes.find(x => x.startsWith('v1.6.26 ADDS '));
  const ciKey = moved.split('Carried rows whose intervals moved: ')[1].split('. DIAGNOSTICS')[0].split(', ').pop();
  rejects(b => { editNote(b, 'v1.6.26 ADDS ', n => n.replace(`, ${ciKey}. DIAGNOSTICS`, '. DIAGNOSTICS')); }, /moved carried interval must name its row/);
  const rankEntry = moved.split('RANKS: ')[1].split(', ')[0];
  rejects(b => { editNote(b, 'v1.6.26 ADDS ', n => n.replace(`${rankEntry}, `, '')); }, /moved carried rank must name its row/);
  rejects(b => { const a2 = b.artifact.systems.find(s => s.key === 'microsoft-decision-1-a2-20261012'); a2.display += ' '; }, /carried preliminary row unchanged/);
  rejects(b => { b.proof.raw_sha256['kettei-fat'] = 'b'.repeat(64); }, /inherited raw-output hashes unchanged/);
  rejects(b => { b.proof.new_rows['celeris-1-decision'].input_tokens += 1; }, /inherited new-row provenance/);
  rejects(b => { b.proof.authority = b.proof.authority.replace('a87f712c', 'a87f712d'); }, /inherited authority unchanged/);
  rejects(b => { b.proof.predecessor_pricing_module_sha256 = '3948e3f16e5959ab74bd328db17c2859d8384036cbc18e443a3dcf5a815ea4d0'; }, /pricing re-freeze binding/);
  rejects(b => { b.proof.predecessor_seal_sha256 = 'not-a-sha'; }, /predecessor seal binding/);
  rejects(b => { const c = b.categories.systems['krino-2b']; const d = Object.keys(c)[0]; const k = Object.keys(c[d])[0]; c[d][k] = { ...c[d][k], competence: c[d][k].competence + 1 }; }, /inherited category cells/);
  rejects(b => { b.categories.lanes[BLINK] = 'api'; }, /category lane/);
});

test('v1.6.26 needs the generated board-effect note, never the provisional one', { skip }, () => {
  rejects(b => { editNote(b, 'Board effect', () => 'Board effect PROVISIONAL-TOPFIVE: awaiting all 21 view/ranking comparisons; never publish this placeholder.'); }, /board effect|no-change board note|approval and top-five effect disagree/);
  rejects(b => { b.artifact.measurement_notes.splice(noteIndex(b, 'Board effect'), 1); }, /board effect|no-change board note|approval and top-five effect disagree/);
  rejects(b => { editNote(b, 'Board effect', n => n.replace('nagi-enormous #', 'nagi #')); }, /board effect/);
});
