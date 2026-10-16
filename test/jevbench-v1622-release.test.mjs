import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateJevbenchV1622Bundle, V1622_NEW_KEYS } from '../lib/jevbench-v1622-release.mjs';
import { readOptionalJevbenchV1621Release, V1621_ROOT } from '../lib/jevbench-v1621-release.mjs';

const root = process.cwd();
const base = `${root}/${V1621_ROOT}`;
const json = async (name) => JSON.parse(await readFile(`${base}/jevbench-v1.6.22-${name}.json`, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const previous = await readOptionalJevbenchV1621Release(root);
const previousManifestSha256 = hash(await readFile(`${base}/jevbench-v1.6.21-publication.json`));
const [storedManifest, artifact, categories, proof] = await Promise.all([json('publication'), json('results'), json('categories'), json('proof')]);
const MESSIER = 'messier-one-v0.4', NEV = 'nev-2b', DECIFF = 'nemotron-deciffusion-8b-v2', TRIO = 'trio-spark-v1.3';
const PUB = 'Publication of v1.6.22:';

/** The stored build with a fake PASS review (the only thing the independent critic adds). */
function approvedBundle() {
  const manifest = structuredClone(storedManifest);
  manifest.review = { engine: 'independent-review-fixture', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) };
  return { manifest, artifact: structuredClone(artifact), categories: structuredClone(categories), proof: structuredClone(proof), previous, previousManifestSha256 };
}
const row = (b, key) => b.artifact.systems.find(s => s.key === key);
// the LAST note with the prefix: earlier releases' notes (e.g. their own 'Board effect') are inherited verbatim
const noteIndex = (b, prefix) => b.artifact.measurement_notes.findLastIndex(x => x.startsWith(prefix));
const rejects = (mutate, pattern) => { const b = approvedBundle(); mutate(b); assert.throws(() => validateJevbenchV1622Bundle(b), pattern); };

test('v1.6.22 accepts the stored build once the review passes', () => {
  assert.doesNotThrow(() => validateJevbenchV1622Bundle(approvedBundle()));
  assert.deepEqual(artifact.systems.filter(s => s.measured_in === 'v1.6.22').map(s => s.key).sort(), V1622_NEW_KEYS);
});

test('v1.6.22 is not publishable while the manifest is PENDING', () => {
  const manifest = { ...structuredClone(storedManifest), review: { engine: 'PENDING', verdict: 'PENDING', receipt_sha256: null } };
  assert.throws(() => validateJevbenchV1622Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }), /independent release review/);
});

test('v1.6.22 keeps the two unpriced rows listed, unranked and without a cost or composite', () => {
  for (const key of [DECIFF, TRIO]) {
    // an unpriced row that claims a rank
    rejects(b => { const s = row(b, key); s.ranked = true; s.listing = 'ranked'; s.rank = 21; }, /unpriced row has no composite and cannot be ranked|listed-not-ranked|n_ranked/);
    rejects(b => { row(b, key).ranks.capability = 9; }, /null ranks/);
    rejects(b => { const s = row(b, key); for (const o of ['A', 'B', 'C', 'capability']) b.artifact.board[o].order.push(key); }, /board membership|without an official placement|release: board A/);
    // a price or composite slipped in
    rejects(b => { const s = row(b, key); s.cost = { ...s.cost, kind: 'estimate', usd_per_1000: 0.02 }; }, /unpriced|cost/);
    rejects(b => { row(b, key).scores.A = 50; }, /no cost axis and no composite/);
    rejects(b => { row(b, key).views['Intelligence only'] = 40; }, /null presets/);
    rejects(b => { b.proof.new_rows[key].usd_per_1000 = 0.01; }, /carries no price|provenance/);
    rejects(b => { row(b, key).not_ranked_because = 'registry ranked=false or no composite'; }, /stated reason|ruling behind the missing rank|ranking reason verbatim/);
  }
  rejects(b => { row(b, DECIFF).not_ranked_because = row(b, DECIFF).not_ranked_because.replaceAll('#19427', '#1942'); }, /ruling behind the missing rank|ranking reason verbatim/);
});

test('v1.6.22 refuses a priced row without its cost basis, tariff or own tokens', () => {
  for (const key of [MESSIER, NEV]) {
    rejects(b => { delete row(b, key).cost.basis; }, /cost_basis verbatim|documented cost basis/);
    rejects(b => { row(b, key).cost.basis += ' '; }, /cost_basis verbatim/);
    rejects(b => { const s = row(b, key); s.cost = { ...s.cost, kind: 'unpriced', usd_per_1000: null }; s.axes.cost = null; }, /unpriced|cost|reproduce/);
    rejects(b => { b.proof.new_rows[key].price_per_million.input *= 2; }, /tariff/);
    rejects(b => { b.proof.new_rows[key].input_tokens -= 1; }, /usage/);
    rejects(b => { row(b, key).cost.usd_per_1000 *= 1.01; }, /cost/);
    rejects(b => { row(b, key).ranked = false; }, /./);
  }
});

test('v1.6.22 keeps the messier licence and its non-commercial flag, and every row disclosure', () => {
  rejects(b => { row(b, MESSIER).licence = 'Apache-2.0'; }, /licence verbatim/);
  rejects(b => { row(b, MESSIER).licence = row(b, MESSIER).licence.replace('CC BY-NC 4.0 (non-commercial', 'CC BY 4.0 ('); }, /licence verbatim/);
  rejects(b => { delete row(b, MESSIER).licence; }, /licence verbatim/);
  const cases = { [MESSIER]: ['CC BY-NC 4.0', '--noul-floor 0.801', 'Floor-0 sensitivity', 'TRUNCATES', 'RTX A6000 48 GB'],
    [NEV]: ['15 HTTP 502 context-overflow refusals', 'ENGLISH-ONLY', 'SPEED is Sandy\'s loaded shared CPU, not the model'],
    [DECIFF]: ['about 10% of their state', 'UNPRICED', '#19427'],
    [TRIO]: ['102 HTTP 422 refusals', '58 because the question has 9 options', '`machinefi` before dispatch', 'no API adjustment'] };
  for (const [key, fragments] of Object.entries(cases)) for (const fragment of fragments) {
    rejects(b => { const i = noteIndex(b, `${key}: `); b.artifact.measurement_notes[i] = b.artifact.measurement_notes[i].replaceAll(fragment, 'x'); }, /required disclosure/);
  }
  rejects(b => { row(b, MESSIER).display = 'Messier One v0.4 (agentmessier)'; }, /display verbatim/);
  rejects(b => { row(b, TRIO).speed.adjustment = 'x2 + 0.15 s (assumption, not measured)'; }, /latency adjustment/);
  rejects(b => { row(b, TRIO).endpoint_condition += ' '; }, /endpoint_condition verbatim/);
  rejects(b => { b.proof.new_rows[NEV].status_counts = { 200: 1500 }; }, /HTTP status counts/);
  rejects(b => { b.proof.systems.find(p => p.key === MESSIER).source_review_sha256 = 'b'.repeat(64); }, /pre-score review binding/);
});

test('v1.6.22 states how the approval arrived: no top-five change, so no card may be claimed', () => {
  assert.equal(proof.publication_approval.top_five_effect, 'none');
  assert.equal(proof.publication_approval.top_five_preview, null);
  rejects(b => { b.proof.publication_approval.go.quote = 'go'; }, /publication GO provenance/);
  rejects(b => { b.proof.publication_approval.go.recorded_at = '2026-10-16T09:13Z'; }, /publication GO provenance/);
  rejects(b => { b.proof.publication_approval.button_tap = true; }, /no-card approval provenance/);
  rejects(b => { b.proof.publication_approval.top_five_preview = { card_id: '17700', selection: 'Publish', preview_png_sha256: 'c'.repeat(64), channel: 'telegram-button', button_tap: true, recorded_at: 'x', recorded_in: 'y' }; }, /no-card approval provenance/);
  rejects(b => { const i = noteIndex(b, PUB); b.artifact.measurement_notes[i] += ' Florian selected "Publish" on Telegram card #17700.'; }, /must not claim a preview card/);
  rejects(b => { const i = noteIndex(b, PUB); b.artifact.measurement_notes[i] = b.artifact.measurement_notes[i].replace('no top-five preview card was sent', 'a card was sent'); }, /must not claim a preview card/);
  rejects(b => { b.proof.authority = b.proof.authority.replace('; no button tap.', '; tapped.'); }, /approval authority binding/);
  // a top-five change needs a preview card: claiming "changes" while the board note says none is refused
  rejects(b => { b.proof.publication_approval.top_five_effect = 'changes'; }, /approval and top-five effect disagree/);
  // a no-card approval needs the generated no-change board note
  rejects(b => { const i = noteIndex(b, 'Board effect'); b.artifact.measurement_notes[i] = b.artifact.measurement_notes[i].replace('0 of 21 top-five lists change', '1 of 21 top-five lists change'); }, /no-change board note/);
});

test('v1.6.22 refuses an unfilled placeholder approval, wherever it is left', () => {
  const PH = { card_id: 'PLACEHOLDER-CARD-ID', selection: 'PLACEHOLDER-SELECTION', preview_png_sha256: 'PLACEHOLDER-PNG-SHA256', channel: 'PLACEHOLDER-CHANNEL',
    button_tap: null, recorded_at: 'PLACEHOLDER-RECORDED-AT', recorded_in: 'PLACEHOLDER-RECORDED-IN' };
  rejects(b => { b.proof.publication_approval = { ...b.proof.publication_approval, top_five_effect: 'changes', top_five_preview: PH, button_tap: null }; }, /approval placeholder not filled/);
  rejects(b => { const i = noteIndex(b, PUB); b.artifact.measurement_notes[i] += ' PLACEHOLDER'; }, /approval placeholder not filled/);
  rejects(b => { b.proof.authority += ' Florian top-five preview approval: PLACEHOLDER.'; }, /approval placeholder not filled/);
});

test('v1.6.22 freezes every carried point estimate and names every move', () => {
  rejects(b => { row(b, 'liquid-d1-ultra').capability += 1; }, /carried row differs|capability/);
  rejects(b => { row(b, 'nimble-v4').views['Intelligence only'] = 28.39; }, /carried row differs/);
  rejects(b => { row(b, 'amos-1-large').ranks.A += 1; }, /rank|carried/);
  const moved = artifact.measurement_notes.find(x => x.startsWith('v1.6.22 ADDS '));
  const ciKey = moved.split('Carried rows whose intervals moved: ')[1].split('. DIAGNOSTICS')[0].split(', ').pop();
  rejects(b => { const i = noteIndex(b, 'v1.6.22 ADDS '); b.artifact.measurement_notes[i] = b.artifact.measurement_notes[i].replace(`, ${ciKey}. DIAGNOSTICS`, '. DIAGNOSTICS'); }, /moved carried interval must name its row/);
  const rankEntry = moved.split('RANKS: ')[1].split(', ')[0];
  rejects(b => { const i = noteIndex(b, 'v1.6.22 ADDS '); b.artifact.measurement_notes[i] = b.artifact.measurement_notes[i].replace(`${rankEntry}, `, ''); }, /moved carried rank must name its row/);
  rejects(b => { const i = noteIndex(b, 'v1.6.22 ADDS '); b.artifact.measurement_notes[i] = b.artifact.measurement_notes[i].replace('14 Oct 2026 at 14:59Z', '15 Oct 2026'); }, /card-time correction/);
  rejects(b => { const a2 = b.artifact.systems.find(s => s.key === 'microsoft-decision-1-a2-20261012'); a2.display += ' '; }, /carried preliminary row unchanged/);
  rejects(b => { b.proof.raw_sha256['liquid-d1-ultra'] = 'b'.repeat(64); }, /inherited raw-output hashes unchanged/);
  rejects(b => { b.proof.authority = b.proof.authority.replace('#19174', '#19175'); }, /inherited authority unchanged/);
  rejects(b => { b.proof.pricing_module_sha256 = 'e'.repeat(64); }, /pricing module hash|provenance/);
  rejects(b => { const c = b.categories.systems['krino-2b']; const d = Object.keys(c)[0]; const k = Object.keys(c[d])[0]; c[d][k] = { ...c[d][k], competence: c[d][k].competence + 1 }; }, /inherited category cells/);
});

test('v1.6.22 needs the generated board-effect note, never the provisional one', () => {
  rejects(b => { const i = noteIndex(b, 'Board effect'); b.artifact.measurement_notes[i] = 'Board effect PROVISIONAL-TOPFIVE: awaiting all 21 view/ranking comparisons; never publish this placeholder.'; }, /board effect/);
  rejects(b => { b.artifact.measurement_notes.splice(noteIndex(b, 'Board effect'), 1); }, /board effect/);
});
