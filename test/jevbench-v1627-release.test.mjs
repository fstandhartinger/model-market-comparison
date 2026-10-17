import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateJevbenchV1627Bundle, V1627_NEW_KEYS, V1627_RANKED_NEW_KEYS, V1627_JEV_KEY, V1627_JEV_REFERENCE,
         V1627_ABOVE_COST_CAP_KEYS } from '../lib/jevbench-v1627-release.mjs';
import { readOptionalJevbenchV1626Release, V1626_ROOT } from '../lib/jevbench-v1626-release.mjs';
import { JEV_CLASS_REFERENCE_KEY, JEV_V16_FROZEN_LIMITS } from '../lib/jevbench-jev-class.mjs';

const root = process.cwd();
const base = `${root}/${V1626_ROOT}`;
const json = async (name) => JSON.parse(await readFile(`${base}/jevbench-v1.6.27-${name}.json`, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
// v1.6.27 is stacked on v1.6.26: until v1.6.26 is reviewed and merged, its predecessor may not load in a tree and the v1.6.27
// bundle cannot be validated there (the synthetic-PASS gate copy makes it loadable).
let previous = null, previousError = null;
try { previous = await readOptionalJevbenchV1626Release(root); } catch (error) { previousError = error.message; }
const skip = previous ? false : `the v1.6.26 predecessor does not load in this tree yet (${previousError ?? 'absent'})`;
const previousManifestSha256 = hash(await readFile(`${base}/jevbench-v1.6.26-publication.json`));
const [storedManifest, artifact, categories, proof] = await Promise.all([json('publication'), json('results'), json('categories'), json('proof')]);
const JEV = V1627_JEV_KEY, VERDIN = 'verdin-4b';
const PUB = 'Publication of v1.6.27:';

/** The stored build with a fake PASS review (the only thing the independent critic adds). */
function approvedBundle() {
  const manifest = structuredClone(storedManifest);
  manifest.review = { engine: 'independent-review-fixture', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) };
  return { manifest, artifact: structuredClone(artifact), categories: structuredClone(categories), proof: structuredClone(proof), previous, previousManifestSha256 };
}
const row = (b, key) => b.artifact.systems.find(s => s.key === key);
// the LAST note with the prefix: earlier releases' notes (e.g. their own 'Board effect') are inherited verbatim
const noteIndex = (b, prefix) => b.artifact.measurement_notes.findLastIndex(x => x.startsWith(prefix));
const editNote = (b, prefix, f) => { const i = noteIndex(b, prefix); b.artifact.measurement_notes[i] = f(b.artifact.measurement_notes[i]); };
const rejects = (mutate, pattern) => { const b = approvedBundle(); mutate(b); assert.throws(() => validateJevbenchV1627Bundle(b), pattern); };

test('v1.6.27 accepts the stored build once the review passes', { skip }, () => {
  assert.doesNotThrow(() => validateJevbenchV1627Bundle(approvedBundle()));
  assert.deepEqual(artifact.systems.filter(s => s.measured_in === 'v1.6.27').map(s => s.key).sort(), V1627_NEW_KEYS);
  assert.deepEqual(V1627_NEW_KEYS, [JEV, VERDIN]);
  for (const key of V1627_NEW_KEYS) assert.equal(row(approvedBundle(), key).ranked, true, key);
});

test('v1.6.27 is not publishable while the manifest is PENDING', { skip }, () => {
  const b = approvedBundle();
  b.manifest.review = { engine: 'PENDING', verdict: 'PENDING', receipt_sha256: null };
  assert.throws(() => validateJevbenchV1627Bundle(b), /independent release review/);
});

test('v1.6.27 refuses a priced new row without its cost basis, tariff, own tokens or cap side', { skip }, () => {
  for (const key of V1627_RANKED_NEW_KEYS) {
    rejects(b => { delete row(b, key).cost.basis; }, /cost_basis verbatim|documented cost basis/);
    rejects(b => { row(b, key).cost.basis += ' '; }, /cost_basis verbatim/);
    rejects(b => { b.proof.new_rows[key].price_per_million.input *= 2; }, /tariff/);
    rejects(b => { b.proof.new_rows[key].input_tokens -= 1; }, /usage/);
    rejects(b => { row(b, key).cost.usd_per_1000 *= 1.01; }, /cost/);
    rejects(b => { b.proof.new_rows[key].under_cost_cap = false; }, /cost binding/);
    rejects(b => { row(b, key).cost.usage_estimated_rows = 1; }, /tariff x own tokens/);
    rejects(b => { row(b, key).ranked = false; }, /./);
    assert.ok(!V1627_ABOVE_COST_CAP_KEYS.includes(key) && row(approvedBundle(), key).cost.usd_per_1000 < 0.06459465517241379, key);
  }
  // jev-1.14.0: the TypeSafe tariff is USD 0.042/M input with output free, over its own provider-reported tokens
  const j = row(approvedBundle(), JEV);
  assert.equal(j.cost.usd_per_1000, 1000 * (1134053 * 0.042 + 71566 * 0) / 1e6 / 1500);
  rejects(b => { b.proof.new_rows[JEV].price_per_million.output = 0.15; }, /tariff/);
  // verdin-4b: its frozen base-model reference deepinfra:Qwen/Qwen3.5-4B, 0 output tokens (it generates no text)
  assert.equal(row(approvedBundle(), VERDIN).cost.usd_per_1000, 1000 * (902188 * 0.030000000000000002) / 1e6 / 1500);
  rejects(b => { b.proof.new_rows[VERDIN].output_tokens = 1485; }, /usage/);
});

test('v1.6.27 binds the hosted Jev 1.14.0 row to its public price, its served model and the API lane', { skip }, () => {
  rejects(b => { row(b, JEV).speed.adjustment = 'x2 + 0.15 s (assumption, not measured)'; }, /latency adjustment/);
  rejects(b => { row(b, JEV).api_flag = false; }, /lane\/endpoint kind|item count/);   // the shared v1.6 validator sees it first
  rejects(b => { row(b, JEV).v16.full_set_api = false; }, /lane\/endpoint kind|item count/);
  rejects(b => { row(b, JEV).model_pin = 'hosted-api:api.typesafe.ai/v1/systemone#jev-latest'; }, /model_pin verbatim/);
  rejects(b => { b.proof.new_rows[JEV].served_model = 'jev-1.13.0'; }, /hosted-API provenance/);
  rejects(b => { b.proof.new_rows[JEV].exposure_logged_to_provider = 'other'; }, /hosted-API provenance/);
  rejects(b => { b.proof.new_rows[JEV].price_source.saved_copy_sha256 = '0'.repeat(64); }, /hosted-API provenance/);
  rejects(b => { b.proof.new_rows[JEV].price_source.aliases_on_page['jev-latest'] = 'jev-1.14.0'; }, /version status/);
  rejects(b => { b.proof.new_rows[JEV].florian_ask.relay = 'x'; }, /ask provenance/);
  rejects(b => { b.proof.new_rows[JEV].custody = '#20475'; }, /new-row provenance/);
  rejects(b => { b.proof.new_rows[JEV].renormalised_rows = 0; }, /measurement provenance/);
  rejects(b => { b.categories.lanes[JEV] = 'selfhosted'; }, /category lane/);
  for (const fragment of ['jev-preview', 'max_tokens_exceeded', 'No pre-registration was written', 'sum to 0.99', 'not independently inspected'])
    rejects(b => { editNote(b, `${JEV}: `, n => n.replaceAll(fragment, 'x')); }, /required disclosure/);
});

test('v1.6.27 keeps Jev 1.13.0 (v1.5.7) as the Jev-class reference and says why', { skip }, () => {
  assert.equal(JEV_CLASS_REFERENCE_KEY, 'jev-1.13.0');
  assert.deepEqual({ cost: JEV_V16_FROZEN_LIMITS.cost, latency: JEV_V16_FROZEN_LIMITS.latency }, { cost: V1627_JEV_REFERENCE.cost_cap, latency: V1627_JEV_REFERENCE.latency_cap_s });
  rejects(b => { b.proof.new_rows[JEV].jev_class_reference.key = 'jev-1.14.0'; }, /Jev-class reference is unchanged/);
  rejects(b => { b.proof.new_rows[JEV].jev_class_reference.cost_cap = 2 * 0.031753484; }, /Jev-class reference is unchanged/);
  rejects(b => { editNote(b, 'v1.6.27 ADDS ', n => n.replace('JEV REFERENCE UNCHANGED', 'JEV REFERENCE')); }, /Jev reference stays Jev 1.13.0/);
  rejects(b => { editNote(b, `${JEV}: `, n => n.replaceAll('JEV REFERENCE UNCHANGED', 'x')); }, /required disclosure/);
  rejects(b => { b.proof.authority = b.proof.authority.replace('The Jev-class reference stays Jev 1.13.0', 'x'); }, /new publication authority/);
});

test('v1.6.27 carries the Verdin-4B device deviation, NC licence and every disclosure verbatim', { skip }, () => {
  rejects(b => { row(b, VERDIN).endpoint_kind = 'gpu'; }, /lane\/endpoint kind/);
  rejects(b => { row(b, VERDIN).speed.adjustment = 'none (API)'; }, /latency adjustment/);
  rejects(b => { row(b, VERDIN).licence = 'Apache-2.0'; }, /licence verbatim/);
  rejects(b => { b.proof.new_rows[VERDIN].licence_non_commercial = false; }, /verdin-4b provenance/);
  rejects(b => { b.proof.new_rows[VERDIN].device_deviation.speed_is_lower_bound = false; }, /verdin-4b provenance/);
  rejects(b => { row(b, VERDIN).model_pin = 'victorbennett/Verdin-4B@' + 'd'.repeat(40); }, /model_pin verbatim/);
  for (const fragment of ['SPEED IS A LOWER BOUND', 'RTX 5090', 'LICENCE (NC)', 'prefix-cache hit', 'checked by count', 'HTTP 422: 15'])
    rejects(b => { editNote(b, `${VERDIN}: `, n => n.replaceAll(fragment, 'x')); }, /required disclosure/);
  for (const key of V1627_NEW_KEYS) {
    rejects(b => { row(b, key).paid_fast_lane = true; }, /not a paid row/);
    rejects(b => { row(b, key).author += ' (someone@example.com)'; }, /author verbatim|personal e-mail/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} Contact: someone@example.com.`); }, /personal e-mail or internal path/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} Receipt /home/flori/jobs/x/r129/receipts/y.json.`); }, /personal e-mail or internal path/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} See PREREG-R128.`); }, /personal e-mail or internal path/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} bh-submit ff14417c.`); }, /personal e-mail or internal path/);
    rejects(b => { row(b, key).endpoint_condition += ' '; }, /endpoint_condition verbatim/);
    rejects(b => { row(b, key).display += ' '; }, /display verbatim/);
    rejects(b => { b.proof.systems.find(p => p.key === key).source_review_sha256 = 'b'.repeat(64); }, /independent review binding/);
    rejects(b => { b.proof.new_rows[key].raw_sha256 = 'e'.repeat(64); }, /new-row provenance/);
    rejects(b => { b.proof.new_rows[key].review_verdict = 'FAIL'; }, /measurement provenance/);
  }
});

test('v1.6.27 states how the approval arrived: no top five changes, so no preview card may be claimed', { skip }, () => {
  assert.equal(proof.publication_approval.top_five_effect, 'none');
  assert.equal(proof.publication_approval.top_five_preview, null);
  assert.ok(artifact.measurement_notes.some(n => n.startsWith('Board effect') && n.includes('0 of 21 top-five lists change')));
  rejects(b => { b.proof.publication_approval.go.quote = 'go'; }, /publication GO provenance/);
  rejects(b => { b.proof.publication_approval.jev_ask.custody = '#1'; }, /ask provenance/);
  rejects(b => { b.proof.publication_approval.button_tap = true; }, /no-card approval provenance/);
  rejects(b => { b.proof.publication_approval.top_five_preview = { card_id: '17800' }; }, /no-card approval provenance/);
  rejects(b => { editNote(b, PUB, n => `${n} Florian selected "Release" on Telegram card #17800.`); }, /must not claim a preview card/);
  rejects(b => { b.proof.publication_approval.top_five_effect = 'changes'; b.proof.publication_approval.top_five_changed_by = [JEV]; }, /approval and top-five effect disagree/);
  rejects(b => { editNote(b, 'Board effect', n => n.replace('0 of 21 top-five lists change', '1 of 21 top-five lists change')); }, /no-change board note/);
  rejects(b => { const head = previous.proof.authority; b.proof.authority = head + b.proof.authority.slice(head.length).replace('no top-five preview card (no top-five list changes)', 'x'); }, /approval authority binding/);
});

test('v1.6.27 refuses an unfilled placeholder approval, wherever it is left', { skip }, () => {
  rejects(b => { editNote(b, PUB, n => `${n} PLACEHOLDER`); }, /approval placeholder not filled/);
  rejects(b => { b.proof.authority += ' Florian top-five preview approval: PLACEHOLDER.'; }, /approval placeholder not filled/);
  rejects(b => { b.proof.publication_approval.go.where = 'PLACEHOLDER'; }, /publication GO provenance|approval placeholder/);
});

test('v1.6.27 freezes every carried point estimate and names every move', { skip }, () => {
  rejects(b => { row(b, 'kettei-fat').capability += 1; }, /carried row differs|capability/);
  rejects(b => { row(b, 'nimble-v4-max').cost.usd_per_1000 *= 1.01; }, /carried row differs/);
  rejects(b => { row(b, 'jevora-9b-v1').views['Intelligence only'] = 28.39; }, /carried row differs/);
  rejects(b => { row(b, 'amos-1-large').ranks.A += 1; }, /rank|carried/);
  const moved = artifact.measurement_notes.find(x => x.startsWith('v1.6.27 ADDS '));
  const ciKey = moved.split('Carried rows whose intervals moved: ')[1].split('. DIAGNOSTICS')[0].split(', ').pop();
  rejects(b => { editNote(b, 'v1.6.27 ADDS ', n => n.replace(`, ${ciKey}. DIAGNOSTICS`, '. DIAGNOSTICS')); }, /moved carried interval must name its row/);
  const rankEntry = moved.split('RANKS: ')[1].split(', ')[0];
  rejects(b => { editNote(b, 'v1.6.27 ADDS ', n => n.replace(`${rankEntry}, `, '')); }, /moved carried rank must name its row/);
  rejects(b => { const a2 = b.artifact.systems.find(s => s.key === 'microsoft-decision-1-a2-20261012'); a2.display += ' '; }, /carried preliminary row unchanged/);
  rejects(b => { b.proof.raw_sha256['kettei-fat'] = 'b'.repeat(64); }, /inherited raw-output hashes unchanged/);
  rejects(b => { b.proof.new_rows['blink-4b'].input_tokens += 1; }, /inherited new-row provenance/);
  rejects(b => { b.proof.repriced_rows['nimble-v4-max'].usd_per_1000 = 0.02; }, /inherited repriced rows/);
  rejects(b => { b.proof.vendor_status['nimble-v4'].pricing_page_still_lists = false; }, /inherited vendor status/);
  rejects(b => { b.proof.authority = b.proof.authority.replace('a87f712c', 'a87f712d'); }, /inherited authority unchanged/);
  rejects(b => { b.proof.predecessor_pricing_module_sha256 = '32556e546e062fb9e7e6c4c26c602acff9878aaa20261725d7c3e7ee93dfaf4b'; }, /pricing re-freeze binding/);
  rejects(b => { b.proof.pricing_module_sha256 = 'f661456e3edf0497239ef29431569c65bc0f34d9969495c03e7820e4fd51fd15'; }, /pricing re-freeze binding|new-row provenance/);
  rejects(b => { b.proof.predecessor_seal_sha256 = 'not-a-sha'; }, /predecessor seal binding/);
  rejects(b => { const c = b.categories.systems['krino-2b']; const d = Object.keys(c)[0]; const k = Object.keys(c[d])[0]; c[d][k] = { ...c[d][k], competence: c[d][k].competence + 1 }; }, /inherited category cells/);
  rejects(b => { b.categories.lanes['blink-4b'] = 'api'; }, /category lane/);
});

test('v1.6.27 needs the generated board-effect note, never the provisional one', { skip }, () => {
  rejects(b => { editNote(b, 'Board effect', () => 'Board effect PROVISIONAL-TOPFIVE: awaiting all 21 view/ranking comparisons; never publish this placeholder.'); }, /board effect|no-change board note|approval and top-five effect disagree/);
  rejects(b => { b.artifact.measurement_notes.splice(noteIndex(b, 'Board effect'), 1); }, /board effect|no-change board note|approval and top-five effect disagree/);
  rejects(b => { editNote(b, 'Board effect', n => n.replace('verdin-4b #', 'verdin #')); }, /board effect/);
});
