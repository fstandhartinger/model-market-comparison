import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateJevbenchV1628Bundle, V1628_NEW_KEYS, V1628_RANKED_NEW_KEYS, V1628_UNRANKED_NEW_KEYS, V1628_BASAL_KEY, V1628_PM_KEY,
         V1628_ABOVE_COST_CAP_KEYS, V1628_PRICING_MODULE_SHA256 } from '../lib/jevbench-v1628-release.mjs';
import { readOptionalJevbenchV1627Release, V1627_ROOT, V1627_PRICING_MODULE_SHA256 } from '../lib/jevbench-v1627-release.mjs';

const root = process.cwd();
const base = `${root}/${V1627_ROOT}`;
const json = async (name) => JSON.parse(await readFile(`${base}/jevbench-v1.6.28-${name}.json`, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const previous = await readOptionalJevbenchV1627Release(root);
const previousManifestSha256 = hash(await readFile(`${base}/jevbench-v1.6.27-publication.json`));
const [storedManifest, artifact, categories, proof] = await Promise.all([json('publication'), json('results'), json('categories'), json('proof')]);
const BAS = V1628_BASAL_KEY, PM = V1628_PM_KEY;
const PUB = 'Publication of v1.6.28:';
const PH_TEXT = 'Top-five preview approval: PLACEHOLDER - a top five changes and the preview card has not been answered yet; this build cannot be published until fill_approval_v1628.sh rebuilds it with the real card, channel and timestamps.';
const PH_MARKER = 'Florian top-five preview approval: PLACEHOLDER.';
const stillPlaceholder = JSON.stringify(proof).includes('PLACEHOLDER');
const pngSha = 'c'.repeat(64);
const fixtureApproval = { card_id: '99999', selection: 'Publish (recommended)', preview_png_sha256: pngSha, channel: 'direct-message',
  button_tap: false, recorded_at: '2026-01-01T00:00:00Z', recorded_in: 'fixture decision log' };
const fixtureText = `The top-five preview (PNG sha256 ${pngSha}) was sent to Florian as Telegram card #99999; it was published on his direct-message GO at ${fixtureApproval.recorded_at} ("${fixtureApproval.selection}"; ${fixtureApproval.recorded_in}). The card's own button was not pressed.`;
const fixtureMarker = `Florian top-five preview approval: direct-message ${fixtureApproval.recorded_at}, recorded as Telegram card #99999 = "${fixtureApproval.selection}" (${fixtureApproval.recorded_in}; no button tap); preview PNG SHA-256 ${pngSha}.`;

/** The stored build with a fake PASS review (the only thing the independent critic adds); while the preview card is
 *  unanswered, a fixture approval stands in for the one fill_approval_v1628.sh writes. */
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
const rejects = (mutate, pattern) => { const b = approvedBundle(); mutate(b); assert.throws(() => validateJevbenchV1628Bundle(b), pattern); };

test('v1.6.28 accepts the stored build once the review passes', () => {
  assert.doesNotThrow(() => validateJevbenchV1628Bundle(approvedBundle()));
  assert.deepEqual(artifact.systems.filter(s => s.measured_in === 'v1.6.28').map(s => s.key).sort(), V1628_NEW_KEYS);
  assert.deepEqual(V1628_NEW_KEYS, [BAS, PM]);
  assert.deepEqual(V1628_RANKED_NEW_KEYS, [BAS]);
  assert.deepEqual(V1628_UNRANKED_NEW_KEYS, [PM]);
  assert.equal(row(approvedBundle(), BAS).ranked, true);
  assert.equal(row(approvedBundle(), PM).ranked, false);
  assert.equal(V1628_PRICING_MODULE_SHA256, V1627_PRICING_MODULE_SHA256, 'no pricing re-freeze in v1.6.28');
});

test('v1.6.28 is not publishable while the manifest is PENDING', () => {
  const b = approvedBundle();
  b.manifest.review = { engine: 'PENDING', verdict: 'PENDING', receipt_sha256: null };
  assert.throws(() => validateJevbenchV1628Bundle(b), /independent release review/);
});

test('v1.6.28 reproduces the handoff numbers for both rows exactly', () => {
  const b = row(approvedBundle(), BAS), p = row(approvedBundle(), PM);
  const r4 = x => Number(x.toFixed(4));
  assert.deepEqual([r4(b.axes.intelligence), r4(b.axes.calibration), r4(b.axes.cost), r4(b.axes.speed), r4(b.capability), r4(b.scores.A)], [74.0581, 91.0179, 50.5051, 87.3102, 82.5380, 71.7577]);
  assert.deepEqual([b.ranks.A, b.ranks.capability], [4, 4]);
  assert.deepEqual([r4(p.axes.intelligence), r4(p.axes.calibration), r4(p.axes.speed), r4(p.capability)], [36.5767, 83.6448, 88.2507, 60.1107]);
  assert.equal(p.axes.cost, null);
  assert.equal(artifact.n_ranked, previous.artifact.n_ranked + 1);
  assert.equal(artifact.G_med, 9.839526770355711);
});

test('v1.6.28 refuses the priced basal row without its cost basis, tariff, own tokens or cap side', () => {
  rejects(b => { delete row(b, BAS).cost.basis; }, /cost_basis verbatim|documented cost basis/);
  rejects(b => { row(b, BAS).cost.basis += ' '; }, /cost_basis verbatim/);
  rejects(b => { b.proof.new_rows[BAS].price_per_million.input *= 2; }, /tariff/);
  rejects(b => { b.proof.new_rows[BAS].input_tokens -= 1; }, /usage/);
  rejects(b => { row(b, BAS).cost.usd_per_1000 *= 1.01; }, /cost/);
  rejects(b => { b.proof.new_rows[BAS].under_cost_cap = false; }, /cost binding/);
  rejects(b => { row(b, BAS).cost.usage_estimated_rows = 1; }, /tariff x own tokens/);
  rejects(b => { row(b, BAS).ranked = false; }, /./);
  assert.ok(!V1628_ABOVE_COST_CAP_KEYS.includes(BAS) && row(approvedBundle(), BAS).cost.usd_per_1000 < 0.06459465517241379);
  // the frozen base-model reference google/gemma-4-31b-it (USD 0.09 / 0.34 per M), 744,183 input tokens, 0 output tokens
  assert.equal(row(approvedBundle(), BAS).cost.usd_per_1000, 1000 * (744183 * 0.09) / 1e6 / 1500);
  rejects(b => { b.proof.new_rows[BAS].output_tokens = 1485; }, /usage/);
});

test('v1.6.28 lists purplemist-flash-1.0 unpriced and unranked: no cost, no composite, no rank, in no order', () => {
  const p = row(approvedBundle(), PM);
  assert.equal(p.cost.kind, 'unpriced'); assert.equal(p.rank, null); assert.equal(p.listing, 'listed');
  assert.ok(p.not_ranked_because.includes('Qwen/Qwen3.5-9B-Base'));
  assert.ok(!artifact.board.A.order.includes(PM) && !artifact.board.capability.order.includes(PM));
  rejects(b => { row(b, PM).ranked = true; }, /./);
  rejects(b => { row(b, PM).rank = 3; }, /listed-not-ranked row|rank/);
  rejects(b => { row(b, PM).not_ranked_because += ' '; }, /ranking reason verbatim/);
  rejects(b => { row(b, PM).not_ranked_because = 'unpriced'; }, /stated reason|ranking reason verbatim/);
  rejects(b => { row(b, PM).cost.usd_per_1000 = 0.04669947; }, /unpriced|cost/);
  rejects(b => { row(b, PM).axes.cost = 49.9206; }, /unpriced|cost axis|axis/);
  rejects(b => { row(b, PM).scores.A = 30.1986; }, /unpriced|composite/);
  rejects(b => { row(b, PM).views['Intelligence only'] = 36.5; }, /null presets/);
  rejects(b => { b.artifact.board.A.order.push(PM); }, /board A|board membership|may not enter a ranked board/);
  rejects(b => { b.proof.new_rows[PM].usd_per_1000 = 0.0467; }, /unpriced row carries no price/);
  rejects(b => { b.proof.new_rows[PM].price_per_million = { input: 0.1, output: 0.15 }; }, /unpriced row carries no price/);
  rejects(b => { b.proof.new_rows[PM].treatment = 'ranked'; }, /new-row provenance/);
  // the scoring copy differs from the raw only through the accepted offline input counts, and says so with its receipts
  rejects(b => { delete b.proof.new_rows[PM].scoring_copy_receipt_sha256; }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[PM].ar_scoring_copy_sha256 = null; }, /new-row provenance/);
  rejects(b => { b.proof.new_rows[PM].original_raw_sha256 = 'f'.repeat(64); }, /new-row provenance/);
  rejects(b => { delete b.proof.new_rows[PM].pricing_line_not_applied; }, /purplemist-flash-1.0 provenance/);
  rejects(b => { b.proof.new_rows[PM].pricing_line_not_applied = 'applied'; }, /purplemist-flash-1.0 provenance/);
  rejects(b => { b.proof.new_rows[PM].tokens_receipt_sha256 = 'x'; }, /purplemist-flash-1.0 provenance/);
  for (const fragment of ['SCORING COPY', 'offline count', 'NOT RANKED', 'Qwen/Qwen3.5-9B-Base', 'scored copy sha256', '--no-warmup', 'bfloat16'])
    rejects(b => { editNote(b, `${PM}: `, n => n.replaceAll(fragment, 'x')); }, /required disclosure/);
});

test('v1.6.28 carries the basal device deviation, its pre-registration amendment and every disclosure verbatim', () => {
  rejects(b => { row(b, BAS).endpoint_kind = 'cpu'; }, /lane\/endpoint kind/);
  rejects(b => { row(b, BAS).speed.adjustment = 'none (API)'; }, /latency adjustment/);
  rejects(b => { row(b, BAS).api_flag = true; }, /lane\/endpoint kind|item count/);
  rejects(b => { row(b, BAS).licence = 'MIT'; }, /licence verbatim/);
  rejects(b => { row(b, BAS).model_pin = 'Remek/basal-omni-1.0-ultra@' + 'd'.repeat(40); }, /model_pin verbatim/);
  rejects(b => { b.proof.new_rows[BAS].device_deviation.speed_comparable_to_h100_rows = true; }, /device-deviation provenance/);
  rejects(b => { b.proof.new_rows[BAS].device_deviation.measured = '1x H100 80 GB'; }, /device-deviation provenance/);
  rejects(b => { delete b.proof.new_rows[BAS].prereg_sha256.with_amendment_1_device; }, /device-deviation provenance/);
  rejects(b => { b.proof.new_rows[BAS].changes_top_five = false; }, /device-deviation provenance/);
  rejects(b => { b.proof.new_rows[BAS].post_score_review_sha256 = null; }, /measurement provenance/);
  for (const fragment of ['DEVICE DEVIATION', 'H200', 'spot tier', 'out of GPU memory', 'about 32,000 tokens', 'pre-registration was amended once', 'HTTP 422: 15', '744,183'])
    rejects(b => { editNote(b, `${BAS}: `, n => n.replaceAll(fragment, 'x')); }, /required disclosure/);
  for (const key of V1628_NEW_KEYS) {
    rejects(b => { row(b, key).paid_fast_lane = true; }, /not a paid row/);
    rejects(b => { row(b, key).author += ' (someone@example.com)'; }, /author verbatim|personal e-mail/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} Contact: someone@example.com.`); }, /personal e-mail or internal path/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} Receipt /home/flori/jobs/x/r132/receipts/y.json.`); }, /personal e-mail or internal path/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} See PREREG-R132.`); }, /personal e-mail or internal path/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} bh-submit c423c539.`); }, /personal e-mail or internal path/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} Pod id 89ca2dcb.`); }, /personal e-mail or internal path/);
    rejects(b => { row(b, key).endpoint_condition += ' '; }, /endpoint_condition verbatim/);
    rejects(b => { row(b, key).display += ' '; }, /display verbatim/);
    rejects(b => { b.proof.systems.find(p => p.key === key).source_review_sha256 = 'b'.repeat(64); }, /independent review binding/);
    rejects(b => { b.proof.new_rows[key].raw_sha256 = 'e'.repeat(64); }, /new-row provenance/);
    rejects(b => { b.proof.new_rows[key].review_verdict = 'FAIL'; }, /measurement provenance/);
    rejects(b => { b.proof.new_rows[key].custody = '#1'; }, /new-row provenance/);
    rejects(b => { b.proof.new_rows[key].request.relay = 'x'; }, /request provenance/);
    rejects(b => { b.categories.lanes[key] = 'api'; }, /category lane/);
  }
});

test('v1.6.28 states how the approval arrived: basal changes top fives, so a real preview card is required', () => {
  assert.equal(proof.publication_approval.top_five_effect, 'changes');
  assert.deepEqual(proof.publication_approval.top_five_changed_by, [BAS]);
  assert.ok(artifact.measurement_notes.some(n => n.startsWith('Board effect') && n.includes('of 21 top-five lists change') && !n.includes('0 of 21 top-five lists change')));
  rejects(b => { b.proof.publication_approval.go.quote = 'go'; }, /publication GO provenance/);
  rejects(b => { b.proof.publication_approval.asks[BAS].relay = 'x'; }, /request provenance/);
  rejects(b => { const c = b.proof.publication_approval.top_five_preview; c.button_tap = !c.button_tap; }, /approval channel and provenance/);
  rejects(b => { const c = b.proof.publication_approval.top_five_preview; c.channel = c.channel === 'telegram-button' ? 'direct-message' : 'telegram-button'; }, /approval channel and provenance/);
  // cards of the previous release lane are not a v1.6.28 top-five preview
  rejects(b => { b.proof.publication_approval.top_five_preview.card_id = '17730'; }, /top-five preview approval card/);
  rejects(b => { b.proof.publication_approval.top_five_preview.card_id = '017800'; }, /top-five preview approval card/);
  rejects(b => { b.proof.publication_approval.top_five_preview.preview_png_sha256 = 'd'.repeat(64); }, /public note must describe|approval authority binding/);
  const tapped = approvedBundle().proof.publication_approval.button_tap;
  rejects(b => { const i = noteIndex(b, PUB); const n = b.artifact.measurement_notes[i];
    b.artifact.measurement_notes[i] = tapped ? n + " The card's own button was not pressed." : n.replace("The card's own button was not pressed.", ''); }, /public note must describe/);
  // a no-card approval is refused when top fives change
  rejects(b => { b.proof.publication_approval = { ...b.proof.publication_approval, top_five_effect: 'none', top_five_preview: null, button_tap: false }; delete b.proof.publication_approval.top_five_changed_by; }, /no-change board note|no-card approval provenance|must not claim/);
  // the approval must name exactly the cause the generated board note names
  rejects(b => { b.proof.publication_approval.top_five_changed_by = [BAS, PM]; }, /must name exactly the rows/);
  rejects(b => { editNote(b, 'Board effect', n => n.replace(`Top-five changes caused by: ${BAS}`, 'Top-five changes caused by: basal-omni-1.0')); }, /must name exactly the rows/);
  // only the new ranked row may be a cause: the unranked row can never change a top five
  rejects(b => { editNote(b, 'Board effect', n => n.replace(`Top-five changes caused by: ${BAS}`, `Top-five changes caused by: ${PM}`)); b.proof.publication_approval.top_five_changed_by = [PM]; }, /only a new ranked row can change a top five/);
});

test('v1.6.28 refuses an unfilled placeholder approval, wherever it is left', () => {
  if (stillPlaceholder) {
    const manifest = structuredClone(storedManifest);
    manifest.review = { engine: 'independent-review-fixture', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) };
    assert.throws(() => validateJevbenchV1628Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }), /approval placeholder not filled/);
  }
  rejects(b => { b.proof.publication_approval.top_five_preview.card_id = 'PLACEHOLDER-CARD-ID'; }, /approval placeholder not filled/);
  rejects(b => { b.proof.publication_approval.top_five_preview.recorded_in = 'PLACEHOLDER-RECORDED-IN'; }, /approval placeholder not filled/);
  rejects(b => { editNote(b, PUB, n => `${n} PLACEHOLDER`); }, /approval placeholder not filled/);
  rejects(b => { b.proof.authority += ' ' + PH_MARKER; }, /approval placeholder not filled/);
});

test('v1.6.28 freezes every carried point estimate and names every move', () => {
  rejects(b => { row(b, 'kettei-fat').capability += 1; }, /carried row differs|capability/);
  rejects(b => { row(b, 'nimble-v4-max').cost.usd_per_1000 *= 1.01; }, /carried row differs/);
  rejects(b => { row(b, 'jevora-9b-v1').views['Intelligence only'] = 28.39; }, /carried row differs/);
  rejects(b => { row(b, 'amos-1-large').ranks.A += 1; }, /rank|carried/);
  rejects(b => { row(b, 'torchcast-decision-4b-v1.1').scores.A += 0.001; }, /headline score|carried row differs/);
  const moved = artifact.measurement_notes.find(x => x.startsWith('v1.6.28 ADDS '));
  const ciKey = moved.split('Carried rows whose intervals moved: ')[1].split('. DIAGNOSTICS')[0].split(', ').pop();
  rejects(b => { editNote(b, 'v1.6.28 ADDS ', n => n.replace(`, ${ciKey}. DIAGNOSTICS`, '. DIAGNOSTICS')); }, /moved carried interval must name its row/);
  const rankEntry = moved.split('RANKS: ')[1].split(', ')[0];
  rejects(b => { editNote(b, 'v1.6.28 ADDS ', n => n.replace(`${rankEntry}, `, '')); }, /moved carried rank must name its row/);
  rejects(b => { editNote(b, 'v1.6.28 ADDS ', n => n.replace('NO pricing change', 'a pricing change')); }, /pricing module is unchanged/);
  rejects(b => { const a2 = b.artifact.systems.find(s => s.key === 'microsoft-decision-1-a2-20261012'); a2.display += ' '; }, /carried preliminary row unchanged/);
  rejects(b => { b.proof.raw_sha256['kettei-fat'] = 'b'.repeat(64); }, /inherited raw-output hashes unchanged/);
  rejects(b => { b.proof.new_rows['verdin-4b'].input_tokens += 1; }, /inherited new-row provenance/);
  rejects(b => { b.proof.repriced_rows['nimble-v4-max'].usd_per_1000 = 0.02; }, /inherited repriced rows/);
  rejects(b => { b.proof.vendor_status['nimble-v4'].pricing_page_still_lists = false; }, /inherited vendor status/);
  rejects(b => { b.proof.authority = b.proof.authority.replace('a87f712c', 'a87f712d'); }, /inherited authority unchanged/);
  rejects(b => { b.proof.predecessor_pricing_module_sha256 = 'f661456e3edf0497239ef29431569c65bc0f34d9969495c03e7820e4fd51fd15'; }, /pricing module stays in force/);
  rejects(b => { b.proof.pricing_module_sha256 = 'f661456e3edf0497239ef29431569c65bc0f34d9969495c03e7820e4fd51fd15'; }, /pricing module stays in force|new-row provenance/);
  rejects(b => { b.proof.predecessor_seal_sha256 = null; }, /predecessor seal binding/);
  rejects(b => { b.proof.predecessor_seal_sha256 = 'not-a-sha'; }, /predecessor seal binding/);
  rejects(b => { const c = b.categories.systems['krino-2b']; const d = Object.keys(c)[0]; const k = Object.keys(c[d])[0]; c[d][k] = { ...c[d][k], competence: c[d][k].competence + 1 }; }, /inherited category cells/);
  rejects(b => { b.categories.lanes['blink-4b'] = 'api'; }, /category lane/);
});

test('v1.6.28 needs the generated board-effect note, never the provisional one', () => {
  rejects(b => { editNote(b, 'Board effect', () => 'Board effect PROVISIONAL-TOPFIVE: awaiting all 21 view/ranking comparisons; never publish this placeholder.'); }, /board effect|no-change board note|approval and top-five effect disagree/);
  rejects(b => { b.artifact.measurement_notes.splice(noteIndex(b, 'Board effect'), 1); }, /board effect|no-change board note|approval and top-five effect disagree/);
  rejects(b => { editNote(b, 'Board effect', n => n.replaceAll('basal-omni-1.0-ultra', 'basal')); }, /board effect|must name exactly the rows/);
});
