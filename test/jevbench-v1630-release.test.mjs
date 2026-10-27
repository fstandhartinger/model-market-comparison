import { hasPublishedJevbenchV1713Release } from '../lib/jevbench-v1713-release.mjs';
import { hasPublishedJevbenchV1711Release } from '../lib/jevbench-v1711-release.mjs';
import { hasPublishedJevbenchV1710Release } from '../lib/jevbench-v1710-release.mjs';
import { hasPublishedJevbenchV179Release } from '../lib/jevbench-v179-release.mjs';
import { hasPublishedJevbenchV178Release } from '../lib/jevbench-v178-release.mjs';
import { hasPublishedJevbenchV177Release } from '../lib/jevbench-v177-release.mjs';
import { hasPublishedJevbenchV176Release } from '../lib/jevbench-v176-release.mjs';
import { hasPublishedJevbenchV175Release } from '../lib/jevbench-v175-release.mjs';
import { hasPublishedJevbenchV174Release } from '../lib/jevbench-v174-release.mjs';
import { hasPublishedJevbenchV173Release } from '../lib/jevbench-v173-release.mjs';
import { hasPublishedJevbenchV172Release } from '../lib/jevbench-v172-release.mjs';
import { hasPublishedJevbenchV171Release } from '../lib/jevbench-v171-release.mjs';
import test from 'node:test';
import { hasPublishedJevbenchV170Release } from '../lib/jevbench-v170-release.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateJevbenchV1630Bundle, V1630_RECOST_SPEC, V1630_RECOSTED_KEYS, V1630_CARRIED_KEYS, V1630_NEW_KEYS, V1630_CAP_ENTRANTS,
         V1630_COST_BASIS_SHA256, V1630_SUPERSEDED_COST_BASIS_SHA256, V1630_PRICING_MODULE_SHA256, V1630_COST_CAP, V1630_COST_RULE_GENERAL } from '../lib/jevbench-v1630-release.mjs';
import { readOptionalJevbenchV1629Release, V1629_ROOT, V1629_PRICING_MODULE_SHA256 } from '../lib/jevbench-v1629-release.mjs';
import { JEVBENCH_COST_RULE, JEVBENCH_COST_RULE_HISTORY } from '../lib/jevbench-cost-rule.mjs';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { assembleJevBoard } from '../lib/jevbench-live-board.mjs';
import { jevLiveAllArtifact } from '../lib/jevbench-cohort-merge.mjs';
import { jevClassRows, JEV_V16_CLASS_OPTIONS } from '../lib/jevbench-jev-class.mjs';
import { JEV_REFERENCE_KEY, JEV_OPEN_REFERENCE_KEYS, JEV_SCOPE_LISTING, jevApiOfferingKeys, jevRowScope, jevScopeClassifier, jevbenchScopeArtifact } from '../lib/jevbench-scope.mjs';

const root = process.cwd();
const base = `${root}/${V1629_ROOT}`;
const json = async (name) => JSON.parse(await readFile(`${base}/jevbench-v1.6.30-${name}.json`, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const previous = await readOptionalJevbenchV1629Release(root);
assert.ok(previous, 'live v1.6.29 must load');
const previousManifestSha256 = hash(await readFile(`${base}/jevbench-v1.6.29-publication.json`));
const [storedManifest, artifact, categories, proof] = await Promise.all([json('publication'), json('results'), json('categories'), json('proof')]);
const PUB = 'Publication of v1.6.30:';
const PH_TEXT = 'Top-five preview approval: PLACEHOLDER - public top fives change and the preview card has not been answered yet; this build cannot be published until fill_approval_v1630.sh rebuilds it with the real card, channel and timestamps.';
const PH_MARKER = 'Florian top-five preview approval: PLACEHOLDER.';
const stillPlaceholder = JSON.stringify(proof.publication_approval).includes('PLACEHOLDER');
const pngSha = 'c'.repeat(64);
const fixtureApproval = { card_id: '99999', selection: 'Publish (recommended)', preview_png_sha256: pngSha, channel: 'direct-message',
  button_tap: false, recorded_at: '2026-01-01T00:00:00Z', recorded_in: 'fixture decision log' };
const fixtureText = `The top-five preview (PNG sha256 ${pngSha}) was sent to Florian as Telegram card #99999; it was published on his direct-message GO at ${fixtureApproval.recorded_at} ("${fixtureApproval.selection}"; ${fixtureApproval.recorded_in}). The card's own button was not pressed.`;
const fixtureMarker = `Florian top-five preview approval: direct-message ${fixtureApproval.recorded_at}, recorded as Telegram card #99999 = "${fixtureApproval.selection}" (${fixtureApproval.recorded_in}; no button tap); preview PNG SHA-256 ${pngSha}.`;

/** The stored build with a fake PASS review (the only thing the independent critic adds); while the preview card is unanswered, a
 *  fixture approval stands in for the one fill_approval_v1630.sh writes. */
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
const prior = (key) => previous.artifact.systems.find(s => s.key === key);
const noteIndex = (b, prefix) => b.artifact.measurement_notes.findLastIndex(x => x.startsWith(prefix));
const editNote = (b, prefix, f) => { const i = noteIndex(b, prefix); b.artifact.measurement_notes[i] = f(b.artifact.measurement_notes[i]); };
const rejects = (mutate, pattern) => { const b = approvedBundle(); mutate(b); assert.throws(() => validateJevbenchV1630Bundle(b), pattern); };
const CAP = V1630_COST_CAP;

test('v1.6.30 accepts the stored build once the review passes', () => {
  assert.doesNotThrow(() => validateJevbenchV1630Bundle(approvedBundle()));
  assert.deepEqual(V1630_NEW_KEYS, []);
  assert.equal(V1630_CARRIED_KEYS.length, 57);
  assert.equal(artifact.systems.length, previous.artifact.systems.length);
  assert.equal(artifact.systems.length, 58);
  assert.equal(artifact.n_ranked, 47);
  assert.equal(V1630_PRICING_MODULE_SHA256, V1629_PRICING_MODULE_SHA256);
  assert.equal(V1630_PRICING_MODULE_SHA256.slice(0, 8), '6202ef78');
});

test('v1.6.30 is not publishable while the manifest is PENDING or the preview card is a placeholder', () => {
  assert.ok(['PENDING', 'PASS'].includes(storedManifest.review.verdict), 'the real tree is PENDING; the synthetic gate copy carries a fake PASS');
  rejects(b => { b.manifest.review = { engine: 'PENDING', verdict: 'PENDING', receipt_sha256: null }; }, /independent release review/);
  rejects(b => { b.manifest.review.verdict = 'REVISE'; }, /independent release review/);
  if (stillPlaceholder) {
    const real = approvedBundle();
    real.proof = structuredClone(proof); real.artifact = structuredClone(artifact);
    assert.throws(() => validateJevbenchV1630Bundle(real), /placeholder/);
  }
});

test('48 token-priced rows change cost on the common basis, 9 unpriced rows do not', () => {
  const changed = artifact.systems.filter(s => s.key !== 'microsoft-decision-1-a2-20261012' && s.cost.usd_per_1000 !== prior(s.key).cost.usd_per_1000).map(s => s.key).sort();
  assert.equal(changed.length, 48);
  assert.deepEqual(changed, [...V1630_RECOSTED_KEYS].sort());
  const unchanged = V1630_CARRIED_KEYS.filter(k => !changed.includes(k));
  assert.equal(unchanged.length, 9);
  for (const k of unchanged) { assert.equal(row({ artifact }, k).cost.kind, 'unpriced'); assert.equal(row({ artifact }, k).cost.usd_per_1000, null); assert.deepEqual(row({ artifact }, k), prior(k)); }
  for (const k of changed) {
    const s = row({ artifact }, k);
    assert.deepEqual(s.cost.common_basis, { n_items: 1485, rule: 'common', usd_per_1000_all_items: prior(k).cost.usd_per_1000 });
    assert.equal(V1630_RECOST_SPEC[k].usd, s.cost.usd_per_1000);
    assert.equal(V1630_RECOST_SPEC[k].usd_all, prior(k).cost.usd_per_1000);
  }
  assert.equal(artifact.v16.cost_basis.file_sha256, V1630_COST_BASIS_SHA256);
  assert.equal(artifact.v16.cost_basis.n_excluded, 15);
});

test('named rows: nimble-v4-max enters at #3, subq-snap-preview falls inside the official cost cap', () => {
  const nmx = row({ artifact }, 'nimble-v4-max');
  assert.equal(nmx.cost.usd_per_1000, 0.020350383838383838);
  assert.equal(nmx.cost.common_basis.usd_per_1000_all_items, 0.05160936000000001);
  assert.deepEqual([prior('nimble-v4-max').ranks.A, nmx.ranks.A], [12, 3]);
  const sq = row({ artifact }, 'subq-snap-preview'), sqOld = prior('subq-snap-preview');
  assert.equal(sq.cost.usd_per_1000, 0.025715993265993265);
  assert.ok(Math.abs(sqOld.cost.usd_per_1000 / CAP - 1.003) < 0.0005, 'before: 1.003x the cap');
  assert.ok(Math.abs(sq.cost.usd_per_1000 / CAP - 0.398) < 0.0005, 'after: 0.398x the cap');
  assert.ok(sqOld.cost.usd_per_1000 > CAP && sq.cost.usd_per_1000 < CAP);
  assert.deepEqual([sqOld.ranks.A, sq.ranks.A], [17, 4]);
  assert.deepEqual([...V1630_CAP_ENTRANTS].sort(), ['amos-1-medium', 'subq-snap-preview']);
  assert.ok(artifact.systems.filter(s => s.ranked && s.cost.usd_per_1000 > CAP).every(s => !V1630_CAP_ENTRANTS.includes(s.key)));
});

test('Intelligence, Calibration, Speed and Capability are byte-identical on all 57 rows', () => {
  for (const k of V1630_CARRIED_KEYS) {
    const a = prior(k), b = row({ artifact }, k);
    for (const f of ['intelligence', 'calibration', 'speed', 'capability', 'status']) assert.equal(JSON.stringify(b[f]), JSON.stringify(a[f]), `${k}.${f}`);
    for (const ax of ['intelligence', 'calibration', 'speed']) assert.equal(b.axes[ax], a.axes[ax], `${k}.axes.${ax}`);
    assert.equal(JSON.stringify([b.v16.ci95.I, b.v16.ci95.C, b.v16.ci95.capability, b.v16.raw_on_A]), JSON.stringify([a.v16.ci95.I, a.v16.ci95.C, a.v16.ci95.capability, a.v16.raw_on_A]), k);
    if (b.ranked) assert.equal(b.ranks.capability, a.ranks.capability, `${k} Capability rank`);
    assert.equal(JSON.stringify(categories.systems[k]), JSON.stringify(previous.categories.systems[k]), `${k} categories`);
  }
  assert.deepEqual(proof.raw_sha256, previous.proof.raw_sha256);
  assert.equal(proof.cost_basis_sha256, V1630_COST_BASIS_SHA256);
  assert.equal(proof.superseded_cost_basis_sha256, V1630_SUPERSEDED_COST_BASIS_SHA256);
  assert.equal(previous.proof.cost_basis_sha256, V1630_SUPERSEDED_COST_BASIS_SHA256);
});

test('cost, axes, composites and placement follow from the common-basis cost; mutations are rejected', () => {
  rejects(b => { row(b, 'nimble-v4-max').cost.usd_per_1000 *= 1.01; }, /common-basis cost pinned/);
  rejects(b => { row(b, 'nimble-v4-max').cost.common_basis.n_items = 1500; }, /common basis block/);
  rejects(b => { row(b, 'nimble-v4-max').cost.common_basis.usd_per_1000_all_items *= 2; }, /common basis block|all-items figure/);
  rejects(b => { row(b, 'kettei-fat').cost.basis += ' '; }, /cost basis text verbatim/);
  rejects(b => { row(b, 'kettei-fat').cost.basis = prior('kettei-fat').cost.basis; }, /cost basis text verbatim/);
  rejects(b => { row(b, 'nimble-v4-max').axes.cost += 1; }, /Cost axis does not follow|does not reproduce from the axes/);
  rejects(b => { row(b, 'nimble-v4-max').scores.A += 0.01; }, /composite A does not follow|does not reproduce from the axes/);
  rejects(b => { row(b, 'nimble-v4-max').axes.intelligence += 0.01; });
  rejects(b => { row(b, 'nimble-v4-max').capability += 0.01; });
  rejects(b => { row(b, 'nimble-v4-max').v16.ci95.I = [0, 1]; }, /intervals unchanged|differs outside/);
  rejects(b => { row(b, 'nimble-v4-max').composite_ci95 = prior('nimble-v4-max').composite_ci95; }, /re-drawn composite interval|interval/);
  rejects(b => { row(b, 'kettei-fat').ranks.capability += 1; }, /capability rank|Capability rank|current values recorded verbatim/);
  rejects(b => { row(b, 'bongard-mini').cost.basis += ' '; }, /unpriced row is unchanged/);
  rejects(b => { row(b, 'kettei-fat').speed.p50_s_raw *= 2; }, /speed is unchanged|differs outside/);
  rejects(b => { row(b, 'amos-1-medium').cost.basis = row(b, 'amos-1-medium').cost.basis.replace('INSIDE THE OFFICIAL COST CAP', 'OVER THE OFFICIAL COST CAP'); }, /cost basis text verbatim|moves inside/);
  rejects(b => { b.artifact.systems.push({ ...structuredClone(row(b, 'kettei-fat')), key: 'new-row' }); }, /exact cohort|no row is added|roster/);
  rejects(b => { b.artifact.systems = b.artifact.systems.filter(s => s.key !== 'kettei-fat'); }, /exact cohort|no row is added|roster/);
});

test('the proof binds the cost basis, the superseded freeze and every re-costed row', () => {
  rejects(b => { b.proof.cost_basis_sha256 = '0'.repeat(64); }, /superseded by the v1.6.30 cost basis/);
  rejects(b => { b.proof.superseded_cost_basis_sha256 = '0'.repeat(64); }, /superseded by the v1.6.30 cost basis/);
  rejects(b => { b.proof.cost_basis.n_left_out = 16; }, /proof cost-basis block/);
  rejects(b => { b.proof.cost_basis.n_items = 1500; }, /proof cost-basis block/);
  rejects(b => { delete b.proof.recosted_rows['kettei-fat']; }, /re-cost provenance/);
  rejects(b => { b.proof.recosted_rows['kettei-fat'].usd_per_1000_common *= 2; }, /re-cost provenance/);
  rejects(b => { b.proof.recosted_rows['kettei-fat'].previous.cost.usd_per_1000 *= 2; }, /previous values recorded verbatim/);
  rejects(b => { b.artifact.v16.cost_basis.file_sha256 = '1'.repeat(64); }, /cost basis the scorer ran with/);
  rejects(b => { b.proof.raw_sha256['kettei-fat'] = 'b'.repeat(64); }, /inherited raw-output hashes|re-cost provenance/);
  rejects(b => { b.proof.pricing_module_sha256 = 'b'.repeat(64); }, /pricing module stays in force/);
  rejects(b => { b.proof.predecessor_seal_sha256 = null; }, /seal binding/);
  rejects(b => { b.proof.new_rows['basal-omni-1.0-ultra'].input_tokens++; }, /inherited new-row provenance/);
  rejects(b => { b.proof.systems.find(s => s.key === 'nimble-v4-max').usd_per_1000 *= 1.1; }, /proof row cost/);
});

test('the release note states the rule, the unchanged measures, the cap moves and the superseded freeze', () => {
  const note = artifact.measurement_notes.find(n => n.startsWith('v1.6.30 APPLIES THE COMMON COST BASIS TO THIS DRAW.'));
  for (const fragment of ['1,485', 'very long items', 'max_tokens_exceeded', V1630_COST_RULE_GENERAL, 'published v1.6.1 rule', 'refusals still count as wrong answers',
                          'nimble-v4-max', 'subq-snap-preview', 'SUPERSEDED', V1630_SUPERSEDED_COST_BASIS_SHA256.slice(0, 8), V1630_COST_BASIS_SHA256.slice(0, 8), 'NO pricing change'])
    assert.ok(note.includes(fragment), fragment);
  for (const fragment of ['1,485', V1630_COST_RULE_GENERAL, 'SUPERSEDED', 'COST CAP:', 'RANKS:', 'CONFIDENCE INTERVALS:', 'refusals still count as wrong answers'])
    rejects(b => editNote(b, 'v1.6.30 APPLIES', n => n.replaceAll(fragment, 'x')), /release note must say|must name its row/);
  rejects(b => editNote(b, 'v1.6.30 APPLIES', n => n + ' write to someone@example.com'), /personal e-mail|internal path/);
  rejects(b => { b.artifact.measurement_notes[0] += ' '; }, /inherited measurement notes unchanged/);
  assert.ok(!/promis|guarantee|will rank/i.test(note), 'no wording that promises ranks to an author');
});

test('approval: a changed top five needs the preview card; placeholders and wrong provenance are rejected', () => {
  const a = proof.publication_approval;
  assert.equal(a.top_five_effect, 'changes');
  assert.ok(a.top_five_changed_by.includes('nimble-v4-max') && a.top_five_changed_by.includes('subq-snap-preview'));
  assert.ok(a.top_five_changed_by.every(k => V1630_RECOSTED_KEYS.includes(k)));
  assert.equal(a.go.recorded_in, 'DECISIONS.md 2026-10-19 16:40 UTC');
  assert.equal(a.cost_rule.relay, 'board #21769');
  assert.equal(a.cost_rule.supersedes_cost_basis_sha256, V1630_SUPERSEDED_COST_BASIS_SHA256);
  rejects(b => { b.proof.publication_approval.top_five_preview.card_id = '17896'; }, /preview approval card/);
  rejects(b => { b.proof.publication_approval.top_five_preview.card_id = 'PLACEHOLDER-CARD-ID'; }, /placeholder|preview approval card/);
  rejects(b => { b.proof.publication_approval.top_five_preview.preview_png_sha256 = 'zz'; }, /preview approval card/);
  rejects(b => { b.proof.publication_approval.top_five_changed_by = ['kettei-fat']; }, /exactly the rows|only a re-costed row/);
  rejects(b => { b.proof.publication_approval.go.recorded_at = '2026-10-19T17:00Z'; }, /GO provenance/);
  rejects(b => { b.proof.publication_approval.cost_rule.n_items = 1500; }, /cost-rule decision provenance/);
  rejects(b => { b.proof.publication_approval.top_five_effect = 'none'; }, /no-card approval|approval and top-five effect|board note/);
  rejects(b => { delete b.proof.publication_approval.top_five_preview; }, /preview approval card|approval/);
  const cardInNote = stillPlaceholder ? '99999' : a.top_five_preview.card_id;
  rejects(b => { editNote(b, PUB, n => n.replace(`Telegram card #${cardInNote}`, 'Telegram card #12345')); }, /how the approval arrived/);
});

test('the cost rule wording is general and appears on the methodology page and the board', async () => {
  assert.equal(JEVBENCH_COST_RULE, 'On every draw, very long items that a ranked row refuses because they exceed its context length are left out of cost for all rows: cost per 1,000 decisions is computed on the same remaining items for every row. A refused item still counts as a wrong answer for Intelligence.');
  assert.equal(V1630_COST_RULE_GENERAL, JEVBENCH_COST_RULE, 'the loader and the site state the general rule in the same words');
  assert.ok(!/Jev reference|max_tokens_exceeded/.test(JEVBENCH_COST_RULE), 'the general rule does not define itself by one reference run');
  assert.ok(!/23 items|1,485|1,500|v1\.6-regular|20261012/.test(JEVBENCH_COST_RULE), 'the rule itself names no draw');
  assert.equal(JEVBENCH_COST_RULE_HISTORY, 'First published as the v1.6.1 cost rule (5 Oct 2026; 23 items on that draw). From v1.6.30 it applies to draw v1.6-regular-20261012: the 15 items the Jev reference refused with max_tokens_exceeded are left out and 1,485 remain. Rows of draw v1.6-regular-20261010-a2 still show the all-items cost they were published with until a following release re-costs them under this rule.');
  const guide = await readFile(`${root}/components/DecisionBenchmarkGuide.tsx`, 'utf8');
  const board = await readFile(`${root}/components/JevBenchV16Board.tsx`, 'utf8');
  assert.ok(guide.includes('JEVBENCH_COST_RULE') && guide.includes('data-bh-jev-cost-rule'));
  assert.ok(board.includes('JEVBENCH_COST_RULE') && board.includes('data-bh-jev-cost-rule-general'));
  assert.ok(!board.includes('Nine A4 ∪ P items of about 77,000–82,000 input tokens, beyond the Jev reference&apos;s accepted input range, count against Intelligence when refused but are left out of cost.'),
    'the A4-specific wording is replaced by the general rule');
  // the history sentence stands next to the general rule wherever the rule is shown on its own
  assert.match(board, /data-bh-jev-cost-rule-general>Cost rule, generalised in v1\.6\.30: \{JEVBENCH_COST_RULE\} \{JEVBENCH_COST_RULE_HISTORY\}/);
  assert.match(board, /data-bh-jev-cost-rule>\{JEVBENCH_COST_RULE\} \{JEVBENCH_COST_RULE_HISTORY\}/);
  assert.ok(guide.includes('{JEVBENCH_COST_RULE} {JEVBENCH_COST_RULE_HISTORY}'));
});

test('the text about this draw\'s 15 items names who refused them and where the token figure comes from; no time-bound claim about authors', async () => {
  const REFUSED = 'the 15 items the Jev reference refused with max_tokens_exceeded, which the other rows that did not answer them refused or failed on';
  const TOKENS = 'at least 76,358 input tokens as counted by the rows that answered them';
  const page = await readFile(`${root}/app/jev-models/v1.6.30/page.tsx`, 'utf8');
  const board = await readFile(`${root}/components/JevBenchV16Board.tsx`, 'utf8');
  const releases = await readFile(`${root}/lib/jevbench-releases.mjs`, 'utf8');
  for (const [name, text] of [['page', page], ['board', board]]) assert.ok(text.includes(REFUSED) && text.includes(TOKENS.replace('at least', 'each at least')), name);
  assert.ok(releases.includes(REFUSED), 'release history entry');
  assert.ok(!/sent to any model author/i.test(page + board + releases), 'no time-bound claim about model authors');
  const note = artifact.measurement_notes.find(n => n.startsWith('v1.6.30 APPLIES THE COMMON COST BASIS TO THIS DRAW.'));
  assert.ok(note.includes(TOKENS) && note.includes('the 15 items the Jev reference (jev-1.14.0) refused with max_tokens_exceeded, which the other rows that did not answer them refused or failed on'));
  assert.ok(!/sent to any model author/i.test(JSON.stringify(artifact) + JSON.stringify(proof)));
  assert.equal(proof.cost_basis.min_input_tokens_note, TOKENS);
  assert.equal(proof.publication_approval.cost_rule.min_input_tokens_note, TOKENS);
  assert.ok(proof.publication_approval.cost_rule.left_out_are.endsWith('which the other rows that did not answer them refused or failed on'));
  for (const key of V1630_RECOSTED_KEYS) {
    const basis = artifact.systems.find(s => s.key === key).cost.basis;
    assert.ok(basis.includes(TOKENS) && basis.includes('They are ' + REFUSED), key);
  }
});

test('Delta 3 (display only): Jev 1.14.0 is a second unranked reference row on the open board without the toggle; every ranking and rank is unchanged', async () => {
  // v1.7.0 (10 s rule): once the PASS-reviewed release is published the board is restated and the v1.7.0 roster applies; before that the v1.6.39 roster.
  const frozen = JSON.parse(await readFile(`${root}/test/fixtures/jevbench-${(await hasPublishedJevbenchV1713Release()) ? 'v1713' : (await hasPublishedJevbenchV1711Release()) ? 'v1711' : (await hasPublishedJevbenchV1710Release()) ? 'v1710' : (await hasPublishedJevbenchV179Release()) ? 'v179' : (await hasPublishedJevbenchV178Release()) ? 'v178' : (await hasPublishedJevbenchV177Release()) ? 'v177' : (await hasPublishedJevbenchV176Release()) ? 'v176' : (await hasPublishedJevbenchV175Release()) ? 'v175' : (await hasPublishedJevbenchV174Release()) ? 'v174' : (await hasPublishedJevbenchV173Release()) ? 'v173' : (await hasPublishedJevbenchV172Release()) ? 'v172' : (await hasPublishedJevbenchV171Release()) ? 'v171' : (await hasPublishedJevbenchV170Release()) ? 'v170' : 'v1643'}-ranks.json`, 'utf8'));
  const [release, prev, apiA4] = await Promise.all([readJevbenchV161Release(), readJevbenchV157Release(), readFile(`${root}/data/jevbench-api-a4-equated.json`, 'utf8').then(JSON.parse)]);
  const { published, publishedCarry } = await assembleJevBoard({ release, previous: prev, live: true, apiA4 });
  const isApi = jevScopeClassifier(published.systems, publishedCarry.rows, prev.artifact.systems, prev.artifact.not_measured);
  assert.equal(JEV_REFERENCE_KEY, 'jev-1.13.0', 'the methodology reference (caps, equating, compare defaults) is unchanged');
  assert.deepEqual(JEV_OPEN_REFERENCE_KEYS, ['jev-1.13.0', 'jev-1.14.0']);
  const views = { all: jevLiveAllArtifact(published, isApi), open: jevbenchScopeArtifact(published, 'open', isApi), api: jevbenchScopeArtifact(published, 'api', isApi) };
  const OPTS = { official_caps: {}, no_caps: { costFactor: Infinity, latencyFactor: Infinity }, cost_off_latency_2x: { costFactor: Infinity }, latency_none: { latencyFactor: Infinity } };
  let lists = 0;
  for (const [name, art] of Object.entries(views)) {
    const ranked = art.systems.filter(s => s.ranked), want = frozen.views[name];
    for (const o of 'ABC') { assert.deepEqual(art.board[o].order.filter(k => ranked.some(s => s.key === k)), want.composite[o], `${name} composite ${o}`); lists++; }
    for (const [label, opt] of Object.entries(OPTS)) { assert.deepEqual(jevClassRows(ranked, { ...JEV_V16_CLASS_OPTIONS, ...opt }).rows.filter(r => r.inClass).map(r => r.row.key), want.capability[label], `${name} ${label}`); lists++; }
    assert.deepEqual(Object.fromEntries(ranked.map(s => [s.key, [s.rank, s.ranks.A, s.ranks.B, s.ranks.C, s.ranks.capability]])), want.ranks, `${name}: every rank`);
  }
  assert.equal(lists, 21, 'all 21 top-five lists (in full) compared');
  const open = Object.fromEntries(views.open.systems.map(s => [s.key, s])), api = Object.fromEntries(views.api.systems.map(s => [s.key, s]));
  for (const key of JEV_OPEN_REFERENCE_KEYS) {
    assert.equal(open[key].ranked, false, key); assert.equal(open[key].rank, null, key); assert.equal(open[key].listing, JEV_SCOPE_LISTING.reference, key);
    assert.ok(Object.values(open[key].ranks).every(v => v === null), key);
    assert.equal(open[key].jevbench_score, api[key].jevbench_score, `${key}: score untouched`);
  }
  assert.match(open['jev-1.14.0'].not_ranked_because, /^Reference row: Jev 1\.14\.0 is TypeSafe AI's current Jev version.*ranked on the API leaderboard/);
  assert.match(open['jev-1.13.0'].not_ranked_because, /^Reference row: Jev 1\.13\.0 is a hosted API and defines the Jev-class caps/);
  const hidden = jevApiOfferingKeys([...published.systems, ...published.not_measured, ...publishedCarry.rows], isApi);
  for (const key of JEV_OPEN_REFERENCE_KEYS) assert.ok(!hidden.includes(key), `${key} is visible without the toggle`);
  assert.ok(hidden.length > 40 && hidden.includes('wity-1') && hidden.includes('liquid-d1-ultra'), 'every other API offering stays behind the toggle');
  assert.equal(jevRowScope(published.systems.find(s => s.key === 'jev-1.14.0'), isApi), 'api', 'row scope of jev-1.14.0 is unchanged (feed, SEO and alternatives read it)');
  assert.equal(jevRowScope(published.systems.find(s => s.key === 'jev-1.13.0'), isApi), 'reference');
  assert.equal(api['jev-1.14.0'].ranked, true);
  assert.equal(api['jev-1.14.0'].rank, frozen.views.api.ranks['jev-1.14.0'][0], 'API-board rank of jev-1.14.0 unchanged');
  assert.equal(api['jev-1.14.0'].listing, 'ranked');
  const route = await readFile(`${root}/components/JevBenchV16ReleaseRoute.tsx`, 'utf8');
  assert.ok(route.includes('<b>Jev 1.13.0</b>, the reference that defines the Jev-class caps') && route.includes('<b>Jev 1.14.0</b>, TypeSafe&apos;s current version, shown for comparison (it is ranked on the API leaderboard)'));
  assert.ok(route.includes('Jev 1.13.0 and Jev 1.14.0 shown as references'));
  assert.match(await readFile(`${root}/app/llms.txt/route.ts`, 'utf8'), /two unranked Jev reference rows: the Jev version that defines the Jev-class caps, and TypeSafe's current Jev version \(ranked on the API board\)/);
  const note = 'Display only: Jev 1.14.0 is shown as a second unranked reference row on the open-weights board';
  assert.ok((await readFile(`${root}/lib/jevbench-releases.mjs`, 'utf8')).includes(note));
  assert.ok((await readFile(`${root}/app/jev-models/v1.6.30/page.tsx`, 'utf8')).includes('data-bh-jev-open-reference-note'));
});

test('release note [110] states the general rule and then its history sentence', () => {
  const note = artifact.measurement_notes.find(n => n.startsWith('v1.6.30 APPLIES THE COMMON COST BASIS TO THIS DRAW.'));
  assert.ok(note.includes(`wording is now general: ${JEVBENCH_COST_RULE} ${JEVBENCH_COST_RULE_HISTORY} WHY:`));
});
