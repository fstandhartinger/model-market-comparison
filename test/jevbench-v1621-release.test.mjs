import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateJevbenchV1621Bundle } from '../lib/jevbench-v1621-release.mjs';
import { readOptionalJevbenchV1620Release, V1620_ROOT } from '../lib/jevbench-v1620-release.mjs';

const root = process.cwd();
const base = `${root}/${V1620_ROOT}`;
const json = async (name) => JSON.parse(await readFile(`${base}/jevbench-v1.6.21-${name}.json`, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const previous = await readOptionalJevbenchV1620Release(root);
const previousManifestSha256 = hash(await readFile(`${base}/jevbench-v1.6.20-publication.json`));
const [storedManifest, artifact, categories, proof] = await Promise.all([json('publication'), json('results'), json('categories'), json('proof')]);
const D1U = 'liquid-d1-ultra';
const PH_TEXT = 'Top-five preview approval: PLACEHOLDER - the preview card has not been answered yet; this build cannot be published until fill_approval_v1621.sh rebuilds it with the real card, channel and timestamps.';
const PH_MARKER = 'Florian top-five preview approval: PLACEHOLDER.';
const stillPlaceholder = JSON.stringify(proof).includes('PLACEHOLDER');
const pngSha = 'c'.repeat(64);
const fixtureApproval = { card_id: '99999', selection: 'Publish (recommended)', preview_png_sha256: pngSha, channel: 'direct-message',
  button_tap: false, recorded_at: '2026-01-01T00:00:00Z', recorded_in: 'fixture decision log' };
const fixtureText = `Florian approved the top-five preview on ${fixtureApproval.recorded_at} in a direct message. It is recorded as the answer "${fixtureApproval.selection}" to Telegram card #99999 (${fixtureApproval.recorded_in}), the card the preview PNG sha256 ${pngSha} was sent on. The card's own button was not pressed.`;
const fixtureMarker = `Florian top-five preview approval: direct-message ${fixtureApproval.recorded_at}, recorded as Telegram card #99999 = "${fixtureApproval.selection}" (${fixtureApproval.recorded_in}; no button tap); preview PNG SHA-256 ${pngSha}.`;

/** The stored build with a fake PASS review; while the preview card is unanswered, a fixture approval stands in. */
function approvedBundle() {
  const manifest = structuredClone(storedManifest);
  manifest.review = { engine: 'independent-review-fixture', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) };
  const p = structuredClone(proof), a = structuredClone(artifact);
  if (stillPlaceholder) {
    p.publication_approval.top_five_preview = structuredClone(fixtureApproval);
    p.authority = p.authority.replace(PH_TEXT, fixtureText).replace(PH_MARKER, fixtureMarker);
    a.measurement_notes = a.measurement_notes.map(n => n.startsWith('Publication of v1.6.21:') ? n.replace(PH_TEXT, fixtureText) : n);
  }
  return { manifest, artifact: a, categories: structuredClone(categories), proof: p, previous, previousManifestSha256 };
}
const row = (b, key = D1U) => b.artifact.systems.find(s => s.key === key);
const lastIndex = (notes, prefix) => notes.map((x, i) => [x, i]).filter(([x]) => x.startsWith(prefix)).pop()[1];
const replaceLast = (s, a, b) => { const i = s.lastIndexOf(a); return i < 0 ? s : s.slice(0, i) + b + s.slice(i + a.length); };
const rejects = (mutate, pattern) => { const b = approvedBundle(); mutate(b); assert.throws(() => validateJevbenchV1621Bundle(b), pattern); };

test('v1.6.21 accepts the stored build once the review passes and the approval is real', () => {
  assert.doesNotThrow(() => validateJevbenchV1621Bundle(approvedBundle()));
});

test('v1.6.21 refuses an unfilled approval placeholder, wherever it is left', () => {
  // the stored build itself, with only the review flipped, while the card is unanswered
  if (stillPlaceholder) {
    const manifest = structuredClone(storedManifest);
    manifest.review = { engine: 'independent-review-fixture', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) };
    assert.throws(() => validateJevbenchV1621Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }), /approval placeholder not filled/);
  }
  rejects(b => { b.proof.publication_approval.top_five_preview.card_id = 'PLACEHOLDER-CARD-ID'; }, /approval placeholder not filled/);
  rejects(b => { b.proof.publication_approval.top_five_preview.recorded_in = 'PLACEHOLDER-RECORDED-IN'; }, /approval placeholder not filled/);
  rejects(b => { const n = b.artifact.measurement_notes; const i = n.findIndex(x => x.startsWith('Publication of v1.6.21:')); n[i] += ' PLACEHOLDER'; }, /approval placeholder not filled/);
});

test('v1.6.21 refuses an approval that misstates how it arrived', () => {
  rejects(b => { b.proof.publication_approval.top_five_preview.button_tap = true; }, /approval channel and provenance/);
  rejects(b => { b.proof.publication_approval.top_five_preview.channel = 'telegram-button'; }, /approval channel and provenance/);
  for (const field of ['channel', 'button_tap', 'recorded_at', 'recorded_in']) {
    rejects(b => { delete b.proof.publication_approval.top_five_preview[field]; }, /approval channel and provenance/);
  }
  for (const id of ['17515', '17513', '0099999', 'abc']) {
    rejects(b => { b.proof.publication_approval.top_five_preview.card_id = id; }, /top-five preview approval card/);
  }
  rejects(b => { b.proof.publication_approval.top_five_preview.preview_png_sha256 = 'd'.repeat(64); }, /approval authority binding/);
  rejects(b => { b.proof.authority = replaceLast(b.proof.authority, '; no button tap)', '; tapped)'); }, /approval authority binding/);
  rejects(b => { const n = b.artifact.measurement_notes; const i = n.findIndex(x => x.startsWith('Publication of v1.6.21:')); n[i] = n[i].replace(" The card's own button was not pressed.", ''); }, /public note must describe how the approval arrived/);
  rejects(b => { const n = b.artifact.measurement_notes; const i = n.findIndex(x => x.startsWith('Publication of v1.6.21:')); n[i] += ' Florian selected "Publish (recommended)" on Telegram card #99999.'; }, /public note must describe how the approval arrived/);
  rejects(b => { b.proof.publication_approval.go.quote = 'go'; }, /publication GO provenance/);
});

test('v1.6.21 refuses a d1-ultra row without its cost basis, tariff or price', () => {
  rejects(b => { delete row(b).cost.basis; }, /registry cost_basis verbatim|documented cost basis/);
  rejects(b => { row(b).cost.basis = row(b).cost.basis.replace('USD 0.042/M input, output free', 'USD 0.042/M input'); }, /registry cost_basis verbatim/);
  rejects(b => { const s = row(b); s.cost = { ...s.cost, kind: 'unpriced', usd_per_1000: null }; s.axes.cost = null; }, /unpriced|cost|reproduce/);
  rejects(b => { b.proof.new_rows[D1U].price_per_million.input = 0.02; }, /tariff/);
  rejects(b => { b.proof.new_rows[D1U].input_tokens -= 1; }, /usage/);
  rejects(b => { b.proof.new_rows[D1U].price_evidence_sha256 = 'e'.repeat(64); }, /price evidence/);
  rejects(b => { b.proof.pricing_module_sha256 = b.proof.predecessor_pricing_module_sha256; }, /pricing module hash|price evidence/);
});

test('v1.6.21 keeps d1-ultra ranked, complete-denominator and disclosed', () => {
  rejects(b => { row(b).ranked = false; }, /./);
  rejects(b => { row(b).status.answered_ok = 1500; }, /completeness|proof|provenance/);
  rejects(b => { b.proof.new_rows[D1U].status_counts = { 200: 1500 }; }, /HTTP status counts/);
  for (const fragment of ['15 HTTP 422', '`liquid` before dispatch', 'scored as wrong']) {
    rejects(b => { const n = b.artifact.measurement_notes; const i = n.findIndex(x => x.startsWith(`${D1U}: `)); n[i] = n[i].replaceAll(fragment, 'x'); }, new RegExp('required disclosure'));
  }
  rejects(b => { row(b).display = 'd1-ultra'; }, /display verbatim/);
  rejects(b => { row(b).speed.adjustment = 'x2 + 0.15 s (assumption, not measured)'; }, /no latency adjustment/);
});

test('v1.6.21 freezes every carried point estimate and names every move', () => {
  rejects(b => { row(b, 'subq-snap-preview').capability += 1; }, /carried row differs|capability/);
  rejects(b => { row(b, 'nimble-v4').views['Intelligence only'] = 28.39; }, /carried row differs/);
  rejects(b => { row(b, 'amos-1-large').ranks.A += 1; }, /rank|carried/);
  rejects(b => {
    const n = b.artifact.measurement_notes; const i = n.findIndex(x => x.startsWith('v1.6.21 ADDS '));
    n[i] = n[i].replace('vllm-sr-d3. DIAGNOSTICS', 'DIAGNOSTICS');
  }, /moved carried interval must name its row/);
  rejects(b => {
    const n = b.artifact.measurement_notes; const i = n.findIndex(x => x.startsWith('v1.6.21 ADDS '));
    n[i] = n[i].replace('julia-1 A 17 -> 18; B 17 -> 18; C 17 -> 18; capability 17 -> 18, ', '');
  }, /moved carried rank must name its row/);
  rejects(b => { const a2 = b.artifact.systems.find(s => s.key === 'microsoft-decision-1-a2-20261012'); a2.display += ' '; }, /carried preliminary row unchanged/);
  rejects(b => { b.proof.raw_sha256['vllm-sr-d3'] = 'b'.repeat(64); }, /inherited raw-output hashes unchanged/);
  rejects(b => { b.proof.authority = b.proof.authority.replace('#19174', '#19175'); }, /inherited authority unchanged/);
  rejects(b => { b.proof.repriced_rows['subq-snap-preview'].input_tokens = 1; }, /inherited proof field repriced_rows/);
  rejects(b => { const c = b.categories.systems['krino-2b']; const d = Object.keys(c)[0]; const k = Object.keys(c[d])[0]; c[d][k] = { ...c[d][k], competence: c[d][k].competence + 1 }; }, /inherited category cells/);
});

test('v1.6.21 needs the generated board-effect note, never the provisional one', () => {
  rejects(b => {
    const n = b.artifact.measurement_notes; const i = lastIndex(n, 'Board effect');
    n[i] = 'Board effect PROVISIONAL-TOPFIVE: awaiting all 21 view/ranking comparisons; never publish this placeholder.';
  }, /board effect/);
  rejects(b => { b.artifact.measurement_notes.splice(lastIndex(b.artifact.measurement_notes, 'Board effect'), 1); }, /board effect/);
});
