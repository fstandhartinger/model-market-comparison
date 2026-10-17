import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateJevbenchV1625Bundle, V1625_NEW_KEYS, V1625_PAID_KEYS, V1625_STARTLUX_KEYS, V1625_ABOVE_COST_CAP_KEYS } from '../lib/jevbench-v1625-release.mjs';
import { readOptionalJevbenchV1624Release, V1624_ROOT } from '../lib/jevbench-v1624-release.mjs';

const root = process.cwd();
const base = `${root}/${V1624_ROOT}`;
const json = async (name) => JSON.parse(await readFile(`${base}/jevbench-v1.6.25-${name}.json`, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const previous = await readOptionalJevbenchV1624Release(root);
const previousManifestSha256 = hash(await readFile(`${base}/jevbench-v1.6.24-publication.json`));
const [storedManifest, artifact, categories, proof] = await Promise.all([json('publication'), json('results'), json('categories'), json('proof')]);
const CEL = 'celeris-1-decision', JEB = 'jebadiah-9b-v2-1';
const SLI = 'startlux-decision-v1.1-27b-instant', SLA = 'startlux-decision-v1.1-27b-autothink';
const PUB = 'Publication of v1.6.25:';
const PH_TEXT = 'Top-five preview approval: PLACEHOLDER - a non-paid row changes a top five and the preview card has not been answered yet; this build cannot be published until fill_approval_v1625.sh rebuilds it with the real card, channel and timestamps.';
const PH_MARKER = 'Florian top-five preview approval: PLACEHOLDER.';
const stillPlaceholder = JSON.stringify(proof).includes('PLACEHOLDER');
const pngSha = 'c'.repeat(64);
const fixtureApproval = { card_id: '99999', selection: 'Publish (recommended)', preview_png_sha256: pngSha, channel: 'direct-message',
  button_tap: false, recorded_at: '2026-01-01T00:00:00Z', recorded_in: 'fixture decision log' };
const fixtureText = `The top-five preview (PNG sha256 ${pngSha}) was sent to Florian as Telegram card #99999; it was published on his direct-message GO at ${fixtureApproval.recorded_at} ("${fixtureApproval.selection}"; ${fixtureApproval.recorded_in}). The card's own button was not pressed.`;
const fixtureMarker = `Florian top-five preview approval: direct-message ${fixtureApproval.recorded_at}, recorded as Telegram card #99999 = "${fixtureApproval.selection}" (${fixtureApproval.recorded_in}; no button tap); preview PNG SHA-256 ${pngSha}.`;

/** The stored build with a fake PASS review (the only thing the independent critic adds); while the preview card is
 *  unanswered, a fixture approval stands in for the one fill_approval_v1625.sh writes. */
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
// the LAST note with the prefix: earlier releases' notes (e.g. their own 'Board effect') are inherited verbatim
const noteIndex = (b, prefix) => b.artifact.measurement_notes.findLastIndex(x => x.startsWith(prefix));
const editNote = (b, prefix, f) => { const i = noteIndex(b, prefix); b.artifact.measurement_notes[i] = f(b.artifact.measurement_notes[i]); };
const rejects = (mutate, pattern) => { const b = approvedBundle(); mutate(b); assert.throws(() => validateJevbenchV1625Bundle(b), pattern); };

test('v1.6.25 accepts the stored build once the review passes', () => {
  assert.doesNotThrow(() => validateJevbenchV1625Bundle(approvedBundle()));
  assert.deepEqual(artifact.systems.filter(s => s.measured_in === 'v1.6.25').map(s => s.key).sort(), V1625_NEW_KEYS);
});

test('v1.6.25 is not publishable while the manifest is PENDING', () => {
  const manifest = { ...structuredClone(storedManifest), review: { engine: 'PENDING', verdict: 'PENDING', receipt_sha256: null } };
  assert.throws(() => validateJevbenchV1625Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }), /independent release review/);
});

test('v1.6.25 refuses a priced row without its cost basis, tariff, own tokens or cap side', () => {
  for (const key of [CEL, JEB, SLI, SLA]) {
    rejects(b => { delete row(b, key).cost.basis; }, /cost_basis verbatim|documented cost basis/);
    rejects(b => { row(b, key).cost.basis += ' '; }, /cost_basis verbatim/);
    rejects(b => { const s = row(b, key); s.cost = { ...s.cost, kind: 'unpriced', usd_per_1000: null }; s.axes.cost = null; }, /unpriced|cost|reproduce/);
    rejects(b => { b.proof.new_rows[key].price_per_million.input *= 2; }, /tariff/);
    rejects(b => { b.proof.new_rows[key].input_tokens -= 1; }, /usage/);
    rejects(b => { row(b, key).cost.usd_per_1000 *= 1.01; }, /cost/);
    rejects(b => { b.proof.new_rows[key].under_cost_cap = !b.proof.new_rows[key].under_cost_cap; }, /cost binding/);
    rejects(b => { row(b, key).cost.usage_estimated_rows = 1; }, /tariff x own tokens/);
    rejects(b => { row(b, key).ranked = false; }, /./);
  }
  // jebadiah: 1 output token per answered request is part of its cost (the server's usage, as the live jebadiah-27b row)
  rejects(b => { b.proof.new_rows[JEB].output_tokens = 0; }, /usage/);
  rejects(b => { row(b, CEL).cost.basis = row(b, CEL).cost.basis.replace('I-1', 'I-2'); }, /cost_basis verbatim|evidence and interpretation/);
  // StartLux: base-model reference 0.42/3.0, OVER the cap and disclosed; AutoThink's thought tokens are its output cost
  assert.deepEqual(V1625_ABOVE_COST_CAP_KEYS.filter(k => V1625_STARTLUX_KEYS.includes(k)).sort(), [SLA, SLI]);
  for (const key of [SLI, SLA]) {
    assert.ok(row(approvedBundle(), key).cost.usd_per_1000 > 0.06459465517241379, key);
    rejects(b => { row(b, key).cost.basis = row(b, key).cost.basis.replace('OVER THE OFFICIAL COST CAP', 'over'); }, /cost_basis verbatim|over-cap disclosure/);
    rejects(b => { b.proof.new_rows[key].over_cost_cap = false; }, /measurement provenance/);
  }
  rejects(b => { b.proof.new_rows[SLA].output_tokens = 0; }, /usage/);
});

test('v1.6.25 carries the StartLux request, the non-commercial licence flag and the AutoThink gate provenance', () => {
  for (const key of [SLI, SLA]) {
    rejects(b => { row(b, key).licence = 'Apache-2.0'; }, /licence verbatim|non-commercial licence flag/);
    rejects(b => { b.proof.new_rows[key].licence_non_commercial = false; }, /measurement provenance/);
    rejects(b => { b.proof.new_rows[key].florian_request.custody = '#20396'; }, /measurement provenance/);
    rejects(b => { b.proof.new_rows[key].florian_request.quote = 'add it'; }, /measurement provenance/);
    rejects(b => { b.proof.new_rows[key].florian_request.pre_registered_predictions_matched = false; }, /measurement provenance/);
    rejects(b => { b.proof.new_rows[key].florian_request.package_review_sha256 = null; }, /measurement provenance/);
    rejects(b => { b.proof.new_rows[key].post_score_review_sha256 = 'c'.repeat(64); }, /measurement provenance/);
    rejects(b => { row(b, key).speed.adjustment = 'none (API)'; }, /latency adjustment/);
  }
  rejects(b => { b.proof.new_rows[SLA].autothink.gate_measured = 0.9; }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[SLA].autothink.gate_0_9_measured = true; }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[SLI].autothink = structuredClone(b.proof.new_rows[SLA].autothink); }, /measurement provenance/);
  rejects(b => { b.proof.publication_approval.startlux_request.quote = 'add it'; }, /StartLux request provenance/);
  rejects(b => { delete b.proof.publication_approval.startlux_request; }, /StartLux request provenance/);
  rejects(b => { const i = noteIndex(b, PUB); b.artifact.measurement_notes[i] = b.artifact.measurement_notes[i].replace("if we don't have it on jevbench, add it", 'add it'); }, /public note must describe/);
});

test('v1.6.25 marks exactly the Celeris row as a paid fast-lane row, with its order, exposure and price evidence', () => {
  assert.deepEqual(V1625_PAID_KEYS, [CEL]);
  rejects(b => { delete row(b, CEL).paid_fast_lane; }, /paid fast-lane flag/);
  rejects(b => { row(b, JEB).paid_fast_lane = true; }, /paid fast-lane flag/);
  rejects(b => { b.proof.new_rows[CEL].paid_fast_lane = false; }, /new-row provenance/);
  rejects(b => { b.proof.new_rows[CEL].order = 'a87f712c'; }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[CEL].exposure_logged_to_provider = 'sqwish'; }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[CEL].price_source.saved_copy_sha256 = 'f'.repeat(64); }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[CEL].price_source.docs_saved_copy_sha256 = 'f'.repeat(64); }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[CEL].probabilities_two_decimal_rows = 0; }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[JEB].add_request.custody = '#20324'; }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[JEB].add_request.re_review_sha256 = 'b'.repeat(64); }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[JEB].add_request.pre_registered_predictions_matched = false; }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[JEB].post_score_review_sha256 = 'c'.repeat(64); }, /measurement provenance/);
  rejects(b => { row(b, CEL).speed.adjustment = 'x2 + 0.15 s (assumption, not measured)'; }, /latency adjustment/);
  rejects(b => { row(b, JEB).speed.adjustment = 'none (API)'; }, /latency adjustment/);
});

test('v1.6.25 publishes no personal e-mail or internal path for the four new rows', () => {
  for (const key of V1625_NEW_KEYS) {
    rejects(b => { row(b, key).author += ' (someone@example.com)'; }, /author verbatim|personal e-mail/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} Contact: someone@example.com.`); }, /personal e-mail or internal path/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} Receipt /home/flori/jobs/x/r130/receipts/y.json.`); }, /personal e-mail or internal path/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} See PREREG-R130.`); }, /personal e-mail or internal path/);
  }
});

test('v1.6.25 keeps every row disclosure, licence and identity verbatim', () => {
  const cases = {
    [JEB]: ['scripts/', '--allow-contract-mismatch was NOT used', '8,192-token prompt cap', 'output_tokens is 1 per answered request', '51.53', 'T1e',
      'temperatures.json', 'lower bound', 'different model from the published jebadiah-27b row', 'every pre-registered prediction matched'],
    [CEL]: ['Paid public fast-lane order 70c4455b', '`celeris` (no proxy) before dispatch', 'two-decimal precision', 'TOKEN COUNTING',
      'everything the model reads', '14 Oct 2026 ruling', 'activation waitlist', 'no API adjustment', 'not independently inspected'],
    [SLI]: ['LICENCE (NC)', 'CC BY-NC 4.0', 'JevBench had no StartLux row before', 'torchcast-decision-27b', 'over the 65,536-token context',
      'none_check', 'OVER THE OFFICIAL COST CAP', 'think_mode never', 'every pre-registered prediction matched'],
    [SLA]: ['LICENCE (NC)', 'SERVER DEFAULT gate 0.6', 'gate 0.9, which was NOT measured', '72,063 thought tokens', 'Latency includes the thought time',
      'OVER THE OFFICIAL COST CAP', 'JevBench had no StartLux row before'] };
  for (const [key, fragments] of Object.entries(cases)) for (const fragment of fragments) {
    rejects(b => { editNote(b, `${key}: `, n => n.replaceAll(fragment, 'x')); }, /required disclosure/);
  }
  rejects(b => { row(b, JEB).licence = 'MIT'; }, /licence verbatim/);
  rejects(b => { row(b, JEB).display = 'Jebadiah 9B v2.1 (Frontier Infra, Qwen3.5-9B + merged LoRA, label-logit readout)'; }, /display verbatim/);
  rejects(b => { row(b, JEB).model_pin = 'frontier-infra/jebadiah-9b-v2-1@' + 'd'.repeat(40); }, /model_pin verbatim/);
  rejects(b => { row(b, CEL).model_pin = 'hosted-api:inference.celeris.ai/celeris-1#celeris-1'; }, /model_pin verbatim/);
  rejects(b => { row(b, CEL).endpoint_condition += ' '; }, /endpoint_condition verbatim/);
  rejects(b => { row(b, SLI).display = 'StartLux-Decision v1.1 27B Instant (StartLux Labs, Qwen3.8-27B fine-tune, option-letter readout)'; }, /display verbatim/);
  rejects(b => { row(b, SLA).model_pin = 'startlux-models/StartLux-Decision-v1.1-27B-AutoThink@' + 'd'.repeat(40); }, /model_pin verbatim/);
  rejects(b => { row(b, SLA).endpoint_condition += ' '; }, /endpoint_condition verbatim/);
  rejects(b => { b.proof.new_rows[CEL].status_counts = { 200: 1485, 422: 15 }; }, /HTTP status counts/);
  rejects(b => { b.proof.systems.find(p => p.key === JEB).source_review_sha256 = 'b'.repeat(64); }, /pre-score review binding/);
  rejects(b => { b.proof.new_rows[CEL].raw_sha256 = 'e'.repeat(64); }, /new-row provenance/);
});

test('v1.6.25 states how the approval arrived: a non-paid row changes top fives, so a real preview card is required', () => {
  assert.equal(proof.publication_approval.top_five_effect, 'changes');
  assert.deepEqual(proof.publication_approval.top_five_changed_by, [SLI]);
  rejects(b => { b.proof.publication_approval.go.quote = 'go'; }, /publication GO provenance/);
  rejects(b => { b.proof.publication_approval.paid_fast_lane.recorded_in = 'DECISIONS.md'; }, /paid fast-lane rule provenance/);
  rejects(b => { b.proof.publication_approval.paid_fast_lane.orders = { 'kettei-fat': 'a87f712c' }; }, /paid fast-lane rule provenance/);
  rejects(b => { const c = b.proof.publication_approval.top_five_preview; c.button_tap = !c.button_tap; }, /approval channel and provenance/);
  rejects(b => { const c = b.proof.publication_approval.top_five_preview; c.channel = c.channel === 'telegram-button' ? 'direct-message' : 'telegram-button'; }, /approval channel and provenance/);
  // the StartLux GPU card #17713 and older cards are not a v1.6.25 top-five preview
  rejects(b => { b.proof.publication_approval.top_five_preview.card_id = '17713'; }, /top-five preview approval card/);
  rejects(b => { b.proof.publication_approval.top_five_preview.card_id = '017800'; }, /top-five preview approval card/);
  rejects(b => { b.proof.publication_approval.top_five_preview.preview_png_sha256 = 'd'.repeat(64); }, /public note must describe|approval authority binding/);
  const tapped = approvedBundle().proof.publication_approval.button_tap;
  rejects(b => { const i = noteIndex(b, PUB); const n = b.artifact.measurement_notes[i];
    b.artifact.measurement_notes[i] = tapped ? n + " The card's own button was not pressed." : n.replace("The card's own button was not pressed.", ''); }, /public note must describe/);
  // the paid exception does not cover a change caused by a non-paid row, and a no-card approval is refused
  rejects(b => { b.proof.publication_approval = { ...b.proof.publication_approval, top_five_effect: 'changes-paid-only', top_five_preview: null, button_tap: false }; }, /paid fast-lane exception covers only|paid fast-lane approval provenance|approval authority binding/);
  rejects(b => { b.proof.publication_approval = { ...b.proof.publication_approval, top_five_effect: 'none', top_five_preview: null, button_tap: false }; delete b.proof.publication_approval.top_five_changed_by; }, /no-change board note|no-card approval provenance|must not claim/);
  // the approval must name exactly the cause the generated board note names (a key with dots, v1.1)
  rejects(b => { b.proof.publication_approval.top_five_changed_by = [SLI, SLA]; }, /must name exactly the rows/);
  rejects(b => { editNote(b, 'Board effect', n => n.replace(`Top-five changes caused by: ${SLI}`, 'Top-five changes caused by: startlux-decision-v1')); }, /must name exactly the rows/);
});

test('v1.6.25 refuses an unfilled placeholder approval, wherever it is left', () => {
  if (stillPlaceholder) {
    const manifest = structuredClone(storedManifest);
    manifest.review = { engine: 'independent-review-fixture', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) };
    assert.throws(() => validateJevbenchV1625Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }), /approval placeholder not filled/);
  }
  rejects(b => { b.proof.publication_approval.top_five_preview.card_id = 'PLACEHOLDER-CARD-ID'; }, /approval placeholder not filled/);
  rejects(b => { b.proof.publication_approval.top_five_preview.recorded_in = 'PLACEHOLDER-RECORDED-IN'; }, /approval placeholder not filled/);
  rejects(b => { editNote(b, PUB, n => `${n} PLACEHOLDER`); }, /approval placeholder not filled/);
  rejects(b => { b.proof.authority += ' ' + PH_MARKER; }, /approval placeholder not filled/);
});

test('v1.6.25 freezes every carried point estimate and names every move', () => {
  rejects(b => { row(b, 'kettei-fat').capability += 1; }, /carried row differs|capability/);
  rejects(b => { row(b, 'kettei-chub').cost.usd_per_1000 *= 2; }, /carried row differs/);
  rejects(b => { row(b, 'bongard-mini').views['Intelligence only'] = 28.39; }, /carried row differs/);
  rejects(b => { row(b, 'bongard-mini').ranks.A = 20; }, /listed-not-ranked|null ranks|carried/);
  rejects(b => { row(b, 'amos-1-large').ranks.A += 1; }, /rank|carried/);
  const moved = artifact.measurement_notes.find(x => x.startsWith('v1.6.25 ADDS '));
  const ciKey = moved.split('Carried rows whose intervals moved: ')[1].split('. DIAGNOSTICS')[0].split(', ').pop();
  rejects(b => { editNote(b, 'v1.6.25 ADDS ', n => n.replace(`, ${ciKey}. DIAGNOSTICS`, '. DIAGNOSTICS')); }, /moved carried interval must name its row/);
  const rankEntry = moved.split('RANKS: ')[1].split(', ')[0];
  rejects(b => { editNote(b, 'v1.6.25 ADDS ', n => n.replace(`${rankEntry}, `, '')); }, /moved carried rank must name its row/);
  rejects(b => { editNote(b, 'v1.6.25 ADDS ', n => n.replace('standard_one_3b_sh: intelligence', 'standard_one_3b_sh intelligence')); }, /moved raw_on_A must name its row/);
  rejects(b => { const a2 = b.artifact.systems.find(s => s.key === 'microsoft-decision-1-a2-20261012'); a2.display += ' '; }, /carried preliminary row unchanged/);
  rejects(b => { b.proof.raw_sha256['kettei-fat'] = 'b'.repeat(64); }, /inherited raw-output hashes unchanged/);
  rejects(b => { b.proof.new_rows['kettei-chub'].input_tokens += 1; }, /inherited new-row provenance/);
  rejects(b => { b.proof.repriced_rows['sage-1.4.0'].usd_per_1000 = 0.02; }, /inherited proof field repriced_rows/);
  rejects(b => { b.proof.authority = b.proof.authority.replace('a87f712c', 'a87f712d'); }, /inherited authority unchanged/);
  rejects(b => { b.proof.pricing_module_sha256 = '3948e3f16e5959ab74bd328db17c2859d8384036cbc18e443a3dcf5a815ea4d0'; }, /pricing re-freeze binding/);
  rejects(b => { b.proof.predecessor_pricing_module_sha256 = '533d80f01a2d2e0d02515bec35e42208f5def86261a2857814730da244d960e5'; }, /pricing re-freeze binding/);
  rejects(b => { const c = b.categories.systems['krino-2b']; const d = Object.keys(c)[0]; const k = Object.keys(c[d])[0]; c[d][k] = { ...c[d][k], competence: c[d][k].competence + 1 }; }, /inherited category cells/);
  rejects(b => { b.categories.lanes[CEL] = 'selfhosted'; }, /category lane/);
});

test('v1.6.25 needs the generated board-effect note, never the provisional one', () => {
  rejects(b => { editNote(b, 'Board effect', () => 'Board effect PROVISIONAL-TOPFIVE: awaiting all 21 view/ranking comparisons; never publish this placeholder.'); }, /board effect|no-change board note|approval and top-five effect disagree/);
  rejects(b => { b.artifact.measurement_notes.splice(noteIndex(b, 'Board effect'), 1); }, /board effect|no-change board note|approval and top-five effect disagree/);
  rejects(b => { editNote(b, 'Board effect', n => n.replace(`${SLA} #`, 'startlux-autothink #')); }, /board effect/);
});
