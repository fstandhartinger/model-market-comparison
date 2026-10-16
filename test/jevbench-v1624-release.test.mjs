import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateJevbenchV1624Bundle, V1624_NEW_KEYS, V1624_PAID_KEYS } from '../lib/jevbench-v1624-release.mjs';
import { readOptionalJevbenchV1623Release, V1623_ROOT } from '../lib/jevbench-v1623-release.mjs';

const root = process.cwd();
const base = `${root}/${V1623_ROOT}`;
const json = async (name) => JSON.parse(await readFile(`${base}/jevbench-v1.6.24-${name}.json`, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const previous = await readOptionalJevbenchV1623Release(root);
const previousManifestSha256 = hash(await readFile(`${base}/jevbench-v1.6.23-publication.json`));
const [storedManifest, artifact, categories, proof] = await Promise.all([json('publication'), json('results'), json('categories'), json('proof')]);
const FAT = 'kettei-fat', CHUB = 'kettei-chub', LUX = 'decision2-lux-9b', IM9 = 'imajev-9b', IM2 = 'imajev-2b', ARS = 'arsenelupin-v1.1',
  NOMA = 'noma', BONG = 'bongard-mini';
const PUB = 'Publication of v1.6.24:';
const PH = { card_id: 'PLACEHOLDER-CARD-ID', selection: 'PLACEHOLDER-SELECTION', preview_png_sha256: 'PLACEHOLDER-PNG-SHA256', channel: 'PLACEHOLDER-CHANNEL',
  button_tap: null, recorded_at: 'PLACEHOLDER-RECORDED-AT', recorded_in: 'PLACEHOLDER-RECORDED-IN' };

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
const rejects = (mutate, pattern) => { const b = approvedBundle(); mutate(b); assert.throws(() => validateJevbenchV1624Bundle(b), pattern); };

test('v1.6.24 accepts the stored build once the review passes', () => {
  assert.doesNotThrow(() => validateJevbenchV1624Bundle(approvedBundle()));
  assert.deepEqual(artifact.systems.filter(s => s.measured_in === 'v1.6.24').map(s => s.key).sort(), V1624_NEW_KEYS);
});

test('v1.6.24 is not publishable while the manifest is PENDING', () => {
  const manifest = { ...structuredClone(storedManifest), review: { engine: 'PENDING', verdict: 'PENDING', receipt_sha256: null } };
  assert.throws(() => validateJevbenchV1624Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }), /independent release review/);
});

test('v1.6.24 keeps bongard-mini listed, unranked and without a cost or composite', () => {
  rejects(b => { const s = row(b, BONG); s.ranked = true; s.listing = 'ranked'; s.rank = 21; }, /unpriced row has no composite and cannot be ranked|listed-not-ranked|ranked row count|n_ranked/);
  rejects(b => { row(b, BONG).ranks.capability = 9; }, /null ranks/);
  rejects(b => { for (const o of ['A', 'B', 'C', 'capability']) b.artifact.board[o].order.push(BONG); }, /board membership|without an official placement|release: board A/);
  rejects(b => { const s = row(b, BONG); s.cost = { ...s.cost, kind: 'estimate', usd_per_1000: 0.02 }; }, /unpriced|cost/);
  rejects(b => { row(b, BONG).scores.A = 50; }, /no cost axis and no composite/);
  rejects(b => { row(b, BONG).views['Intelligence only'] = 40; }, /null presets/);
  rejects(b => { b.proof.new_rows[BONG].usd_per_1000 = 0.01; }, /carries no price|provenance/);
  rejects(b => { row(b, BONG).not_ranked_because = 'registry ranked=false or no composite'; }, /stated reason|ruling behind the missing rank|ranking reason verbatim/);
  rejects(b => { row(b, BONG).not_ranked_because = row(b, BONG).not_ranked_because.replaceAll('google/t5gemma-2-4b-4b', 'its base'); }, /ruling behind the missing rank|ranking reason verbatim/);
});

test('v1.6.24 refuses a priced row without its cost basis, tariff, own tokens or cap side', () => {
  for (const key of [LUX, IM9, IM2, ARS, NOMA, FAT, CHUB]) {
    rejects(b => { delete row(b, key).cost.basis; }, /cost_basis verbatim|documented cost basis/);
    rejects(b => { row(b, key).cost.basis += ' '; }, /cost_basis verbatim/);
    rejects(b => { const s = row(b, key); s.cost = { ...s.cost, kind: 'unpriced', usd_per_1000: null }; s.axes.cost = null; }, /unpriced|cost|reproduce/);
    rejects(b => { b.proof.new_rows[key].price_per_million.input *= 2; }, /tariff/);
    rejects(b => { b.proof.new_rows[key].input_tokens -= 1; }, /usage/);
    rejects(b => { row(b, key).cost.usd_per_1000 *= 1.01; }, /cost/);
    rejects(b => { row(b, key).ranked = false; }, /./);
  }
  // imajev-9b: over the cap, disclosed; it may not pretend to be inside it, nor drop the disclosure
  rejects(b => { b.proof.new_rows[IM9].under_cost_cap = true; }, /cost binding/);
  rejects(b => { b.proof.new_rows[IM9].treatment = 'ranked'; }, /new-row provenance/);
  rejects(b => { editNote(b, `${IM9}: `, n => n.replaceAll('OVER THE OFFICIAL COST CAP', 'over the cap')); }, /required disclosure/);
  // kettei: the scorer must not have filled any refused row from the runner's cost ceiling
  rejects(b => { row(b, FAT).cost.usage_estimated_rows = 15; }, /tariff x own tokens/);
  rejects(b => { row(b, FAT).cost.basis = row(b, FAT).cost.basis.replace('I-1', 'I-2'); }, /cost_basis verbatim|evidence and interpretation/);
});

test('v1.6.24 marks exactly the two kettei rows as paid fast-lane rows, with their orders and exposure', () => {
  assert.deepEqual(V1624_PAID_KEYS, [CHUB, FAT]);
  rejects(b => { delete row(b, FAT).paid_fast_lane; }, /paid fast-lane flag/);
  rejects(b => { row(b, LUX).paid_fast_lane = true; }, /paid fast-lane flag/);
  rejects(b => { b.proof.new_rows[FAT].paid_fast_lane = false; }, /new-row provenance/);
  rejects(b => { b.proof.new_rows[FAT].order = '6e10efe6'; }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[CHUB].exposure_logged_to_provider = 'liquid'; }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[FAT].price_source.saved_copy_sha256 = 'f'.repeat(64); }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[LUX].remeasure.custody = '#20151'; }, /measurement provenance/);
  rejects(b => { b.proof.new_rows[NOMA].post_score_review_sha256 = null; }, /measurement provenance/);
  rejects(b => { row(b, FAT).speed.adjustment = 'x2 + 0.15 s (assumption, not measured)'; }, /latency adjustment/);
  rejects(b => { row(b, IM9).speed.adjustment = 'none (API)'; }, /latency adjustment/);
});

test('v1.6.24 publishes no personal e-mail or internal path for the eight new rows', () => {
  for (const key of V1624_NEW_KEYS) {
    rejects(b => { row(b, key).author += ' (someone@example.com)'; }, /author verbatim|personal e-mail/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} Contact: someone@example.com.`); }, /personal e-mail or internal path/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} Receipt /home/flori/jobs/x/r129/receipts/y.json.`); }, /personal e-mail or internal path/);
    rejects(b => { editNote(b, `${key}: `, n => `${n} See PREREG-R129-A.`); }, /personal e-mail or internal path/);
  }
});

test('v1.6.24 keeps every row disclosure, licence and identity verbatim', () => {
  const cases = {
    [LUX]: ['HTTP 200 responses whose answer could not be parsed', 'public 231 items', 'supersedes the historical v1.5 measurement', 'RTX 5090'],
    [IM9]: ['SUM of the four option-order passes', 'INPUT-BASIS SENSITIVITY', 'reconstructed', 'quotes JevBench ranks of its own'],
    [IM2]: ['SUM of the four option-order passes', 'reconstructed'],
    [ARS]: ['prompt_tokens 0', 'wire-name proxy'],
    [NOMA]: ['TRUNCATES', 'supersedes the historical v1.5 measurement', 'MPL-2.0'],
    [BONG]: ['UNPRICED', 'google/t5gemma-2-4b-4b', 'Gemma terms of use'],
    [FAT]: ['Paid public fast-lane order a87f712c', '15 HTTP 422 context_too_long', 'no fallback size answered', 'COST-CEILING SENSITIVITY', '`sqwish` before dispatch'],
    [CHUB]: ['Paid public fast-lane order 6e10efe6', 'no fallback size answered', 'no API adjustment', 'not independently inspected'] };
  for (const [key, fragments] of Object.entries(cases)) for (const fragment of fragments) {
    rejects(b => { editNote(b, `${key}: `, n => n.replaceAll(fragment, 'x')); }, /required disclosure/);
  }
  rejects(b => { row(b, NOMA).licence = 'Apache-2.0'; }, /licence verbatim/);
  rejects(b => { row(b, BONG).licence = 'Apache-2.0'; }, /licence verbatim/);
  rejects(b => { row(b, LUX).display = 'Decision-2.0-Lux-9B (vllm-sr, self-hosted)'; }, /display verbatim/);
  rejects(b => { row(b, FAT).model_pin = 'hosted-api:api.sqwish.ai/v1/systemone#kettei-chub'; }, /model_pin verbatim/);
  rejects(b => { row(b, CHUB).endpoint_condition += ' '; }, /endpoint_condition verbatim/);
  rejects(b => { b.proof.new_rows[LUX].status_counts = { 200: 1485, 422: 15 }; }, /HTTP status counts/);
  rejects(b => { b.proof.systems.find(p => p.key === ARS).source_review_sha256 = 'b'.repeat(64); }, /pre-score review binding/);
  rejects(b => { b.proof.new_rows[FAT].raw_sha256 = b.proof.new_rows[FAT].original_raw_sha256; }, /new-row provenance/);
});

test('v1.6.24 states how the approval arrived: only the paid rows change top fives, so no card may be claimed', () => {
  assert.equal(proof.publication_approval.top_five_effect, 'changes-paid-only');
  assert.deepEqual(proof.publication_approval.top_five_changed_by, [CHUB, FAT]);
  assert.equal(proof.publication_approval.top_five_preview, null);
  rejects(b => { b.proof.publication_approval.go.quote = 'go'; }, /publication GO provenance/);
  rejects(b => { b.proof.publication_approval.paid_fast_lane.recorded_in = 'DECISIONS.md'; }, /paid fast-lane rule provenance/);
  rejects(b => { b.proof.publication_approval.button_tap = true; }, /paid fast-lane approval provenance/);
  rejects(b => { b.proof.publication_approval.top_five_preview = { card_id: '17800', selection: 'Publish', preview_png_sha256: 'c'.repeat(64), channel: 'telegram-button', button_tap: true, recorded_at: 'x', recorded_in: 'y' }; }, /paid fast-lane approval provenance/);
  rejects(b => { editNote(b, PUB, n => `${n} Florian selected "Publish" on Telegram card #17800.`); }, /claim no card/);
  rejects(b => { editNote(b, PUB, n => n.replace('no top-five preview card was sent and none is claimed', 'a card was sent')); }, /paid fast-lane exception and claim no card/);
  rejects(b => { const i = b.proof.authority.lastIndexOf('; no button tap.'); b.proof.authority = b.proof.authority.slice(0, i) + '; tapped.' + b.proof.authority.slice(i + 16); }, /approval authority binding/);
  // the exception covers only changes the paid rows cause: a non-paid cause, or a mismatched cause list, is refused
  rejects(b => { b.proof.publication_approval.top_five_changed_by = [CHUB, LUX, FAT]; }, /exactly the rows the board note says/);
  rejects(b => { editNote(b, 'Board effect', n => n.replace('Top-five changes caused by: kettei-chub, kettei-fat (paid fast-lane rows only)', 'Top-five changes caused by: kettei-chub, kettei-fat, decision2-lux-9b (non-paid: decision2-lux-9b)')); b.proof.publication_approval.top_five_changed_by = [CHUB, LUX, FAT]; }, /paid fast-lane exception covers only/);
  // claiming no change while the board note lists changes is refused, and so is the change path without a card
  rejects(b => { b.proof.publication_approval = { go: b.proof.publication_approval.go, paid_fast_lane: b.proof.publication_approval.paid_fast_lane, top_five_effect: 'none', top_five_preview: null, button_tap: false }; }, /no-change board note/);
  rejects(b => { b.proof.publication_approval.top_five_effect = 'changes'; }, /approval and top-five effect disagree/);
});

test('v1.6.24 refuses an unfilled placeholder approval, wherever it is left', () => {
  rejects(b => { b.proof.publication_approval = { ...b.proof.publication_approval, top_five_effect: 'changes', top_five_preview: PH, button_tap: null }; }, /approval placeholder not filled/);
  rejects(b => { editNote(b, PUB, n => `${n} PLACEHOLDER`); }, /approval placeholder not filled/);
  rejects(b => { b.proof.authority += ' Florian top-five preview approval: PLACEHOLDER.'; }, /approval placeholder not filled/);
});

test('v1.6.24 freezes every carried point estimate and names every move', () => {
  rejects(b => { row(b, 'liquid-d1-ultra').capability += 1; }, /carried row differs|capability/);
  rejects(b => { row(b, 'sage-1.4.0').cost.usd_per_1000 *= 2; }, /carried row differs/);
  rejects(b => { row(b, 'trio-spark-v1.3').views['Intelligence only'] = 28.39; }, /carried row differs/);
  rejects(b => { row(b, 'amos-1-large').ranks.A += 1; }, /rank|carried/);
  const moved = artifact.measurement_notes.find(x => x.startsWith('v1.6.24 ADDS '));
  const ciKey = moved.split('Carried rows whose intervals moved: ')[1].split('. DIAGNOSTICS')[0].split(', ').pop();
  rejects(b => { editNote(b, 'v1.6.24 ADDS ', n => n.replace(`, ${ciKey}. DIAGNOSTICS`, '. DIAGNOSTICS')); }, /moved carried interval must name its row/);
  const rankEntry = moved.split('RANKS: ')[1].split(', ')[0];
  rejects(b => { editNote(b, 'v1.6.24 ADDS ', n => n.replace(`${rankEntry}, `, '')); }, /moved carried rank must name its row/);
  rejects(b => { editNote(b, 'v1.6.24 ADDS ', n => n.replace('standard_one_3b_sh: intelligence', 'standard_one_3b_sh intelligence')); }, /moved raw_on_A must name its row/);
  rejects(b => { const a2 = b.artifact.systems.find(s => s.key === 'microsoft-decision-1-a2-20261012'); a2.display += ' '; }, /carried preliminary row unchanged/);
  rejects(b => { b.proof.raw_sha256['liquid-d1-ultra'] = 'b'.repeat(64); }, /inherited raw-output hashes unchanged/);
  rejects(b => { b.proof.new_rows['trio-spark-v1.3'].input_tokens += 1; }, /inherited new-row provenance/);
  rejects(b => { b.proof.repriced_rows['sage-1.4.0'].usd_per_1000 = 0.02; }, /inherited proof field repriced_rows/);
  rejects(b => { b.proof.authority = b.proof.authority.replace('#20217', '#20218'); }, /inherited authority unchanged/);
  rejects(b => { b.proof.pricing_module_sha256 = '533d80f01a2d2e0d02515bec35e42208f5def86261a2857814730da244d960e5'; }, /pricing re-freeze binding/);
  rejects(b => { b.proof.predecessor_pricing_module_sha256 = 'dcfcecb06525ce4a5ece37400ea261b97d2fe5d41155f3cd02b03cac86572835'; }, /pricing re-freeze binding/);
  rejects(b => { const c = b.categories.systems['krino-2b']; const d = Object.keys(c)[0]; const k = Object.keys(c[d])[0]; c[d][k] = { ...c[d][k], competence: c[d][k].competence + 1 }; }, /inherited category cells/);
  rejects(b => { b.categories.lanes[FAT] = 'selfhosted'; }, /category lane/);
});

test('v1.6.24 needs the generated board-effect note, never the provisional one', () => {
  rejects(b => { editNote(b, 'Board effect', () => 'Board effect PROVISIONAL-TOPFIVE: awaiting all 21 view/ranking comparisons; never publish this placeholder.'); }, /board effect|approval and top-five effect disagree/);
  rejects(b => { b.artifact.measurement_notes.splice(noteIndex(b, 'Board effect'), 1); }, /board effect|approval and top-five effect disagree/);
});
