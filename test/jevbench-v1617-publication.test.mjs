import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateJevbenchV1617Bundle, readOptionalJevbenchV1617Release, hasPublishedJevbenchV1617Release,
         V1617_CORE_NEW_KEYS, V1617_OPTIONAL_KEYS, V1617_PAID_KEYS, V1617_UNRANKED_CARRIED_KEYS, V1617_CARRIED_KEYS,
         V1617_COST_CAP, V1617_FIXED_G_MED } from '../lib/jevbench-v1617-release.mjs';
import { readOptionalJevbenchV1616Release } from '../lib/jevbench-v1616-release.mjs';
import { jevbenchScopeArtifact } from '../lib/jevbench-scope.mjs';

const root = 'data/raw/benchmarks/jevbench/v1.6/';
const read = async k => JSON.parse(await readFile(`${root}jevbench-v1.6.17-${k}.json`, 'utf8'));
const unranked = V1617_UNRANKED_CARRIED_KEYS[0];
const [paid] = V1617_PAID_KEYS;
const SUBQ = 'subq-snap-preview', AMOS = 'amos-1-medium', PJEV = 'pjev-2b', AMOSL = 'amos-1-large', SAGE = 'sage-1.4.0', PURPLE = 'purplemist-mini-1.0';
const releaseNote = n => n.startsWith('v1.6.17 ADDS ');

async function fixture() {
  const previous = await readOptionalJevbenchV1616Release();
  const [manifest, artifact, categories, proof, bytes] = await Promise.all([
    read('publication'), read('results'), read('categories'), read('proof'),
    readFile(`${root}jevbench-v1.6.16-publication.json`)]);
  manifest.review = { engine: 'claude', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) }; // in-memory validator fixture only
  return { manifest, artifact, categories, proof, previous, previousManifestSha256: createHash('sha256').update(bytes).digest('hex') };
}
const row = (b, k) => b.artifact.systems.find(x => x.key === k);
const newKeys = b => b.artifact.systems.filter(s => s.measured_in === 'v1.6.17').map(s => s.key);
const noteOf = (b, k) => b.artifact.measurement_notes.find(n => n.startsWith(`${k}: `));
const editNote = (b, k, f) => { b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => n.startsWith(`${k}: `) ? f(n) : n); };

test('v1.6.17 adds the core rows (and only known optional ones) and keeps every predecessor point estimate', async () => {
  const b = await fixture();
  validateJevbenchV1617Bundle(b);
  const added = newKeys(b);
  for (const k of V1617_CORE_NEW_KEYS) assert.ok(added.includes(k), k);
  for (const k of added) assert.ok(V1617_CORE_NEW_KEYS.includes(k) || V1617_OPTIONAL_KEYS.includes(k), k);
  assert.equal(b.artifact.systems.length, b.previous.artifact.systems.length + added.length);
  for (const p of b.previous.artifact.systems) {
    const s = row(b, p.key);
    assert.deepEqual(s.scores, p.scores, `${p.key} scores`);
    assert.deepEqual(s.axes, p.axes, `${p.key} axes`);
    assert.equal(s.capability, p.capability);
    assert.deepEqual(s.cost, p.cost);
    assert.deepEqual(s.speed, p.speed);
    assert.equal(s.display, p.display);
    assert.equal(s.model_pin, p.model_pin);
  }
  assert.equal(b.artifact.G_med, V1617_FIXED_G_MED);
  assert.ok(!JSON.stringify(b.artifact.measurement_notes).includes('PROVISIONAL-TOPFIVE'), 'the generated board-effect note replaced the first-pass placeholder');
});

test('v1.6.17 moves carried ranks only by the newly ranked rows above them and names every moved interval', async () => {
  const b = await fixture();
  validateJevbenchV1617Bundle(b);
  const ranked = newKeys(b).filter(k => row(b, k).ranked);
  const note = b.artifact.measurement_notes.find(releaseNote);
  for (const key of V1617_CARRIED_KEYS) {
    const a = b.previous.artifact.systems.find(s => s.key === key), s = row(b, key);
    if (!a.ranked) { assert.deepEqual(s.ranks, a.ranks); assert.equal(s.not_ranked_because, a.not_ranked_because); continue; }
    for (const o of ['A', 'B', 'C']) {
      const above = ranked.filter(k => b.artifact.board[o].order.indexOf(k) < b.artifact.board[o].order.indexOf(key)).length;
      assert.equal(s.ranks[o], a.ranks[o] + above, `${key}.${o}`);
    }
    if (JSON.stringify(s.composite_ci95) !== JSON.stringify(a.composite_ci95)) assert.ok(note.includes(key), `moved interval named: ${key}`);
  }
});

test('the paid metask service-v3 row is a distinct, disclosed re-submission and the earlier row is untouched', async () => {
  const b = await fixture();
  validateJevbenchV1617Bundle(b);
  const s = row(b, paid), old = b.previous.artifact.systems.find(x => x.key === 'metask_jev_rain_31b_trained');
  assert.equal(s.display, 'metask-jev-rain-31B-trained service v3');
  assert.equal(s.ranked, true);
  assert.equal(s.endpoint_kind, 'gpu');
  assert.match(s.endpoint_condition, /RE-SUBMISSION/);
  assert.match(s.endpoint_condition, /#18945/);
  assert.match(s.endpoint_condition, /RTX PRO 6000/);
  assert.ok(s.cost.usd_per_1000 < V1617_COST_CAP);
  const kept = row(b, 'metask_jev_rain_31b_trained');
  for (const f of ['scores', 'axes', 'capability', 'cost', 'speed', 'display', 'model_pin', 'endpoint_condition', 'noul_decisive']) assert.deepEqual(kept[f], old[f], f);
  assert.equal(b.proof.new_rows[paid].paid_fast_lane, true);
  assert.match(b.proof.authority, /4d9fef10/);
});

test('subq-snap-preview is listed, unpriced and unranked in every scope, with the ruling named', async () => {
  const b = await fixture();
  validateJevbenchV1617Bundle(b);
  const s = row(b, SUBQ);
  assert.equal(s.ranked, false); assert.equal(s.rank, null); assert.equal(s.listing, 'listed');
  assert.deepEqual(s.ranks, { A: null, B: null, C: null, capability: null });
  assert.equal(s.cost.kind, 'unpriced'); assert.equal(s.cost.usd_per_1000, null); assert.equal(s.axes.cost, null);
  assert.match(s.not_ranked_because, /#18975/);
  assert.ok(Number.isFinite(s.capability) && Number.isFinite(s.axes.intelligence) && Number.isFinite(s.axes.calibration));
  for (const scope of ['all', 'open', 'api']) {
    const scoped = jevbenchScopeArtifact(b.artifact, scope);
    for (const board of ['A', 'B', 'C']) assert.ok(!(scoped.board?.[board]?.order ?? []).includes(SUBQ), `${scope}.${board}`);
  }
  // the carried listed-not-ranked row keeps its published wording byte for byte
  assert.equal(row(b, unranked).not_ranked_because, b.previous.artifact.systems.find(x => x.key === unranked).not_ranked_because);
});

test('amos-1-medium is a ranked hosted row above the cost ceiling, with its disclosure', async () => {
  const b = await fixture();
  validateJevbenchV1617Bundle(b);
  const s = row(b, AMOS);
  assert.equal(s.ranked, true); assert.equal(s.endpoint_kind, 'api'); assert.equal(s.api_flag, true);
  assert.ok(s.cost.usd_per_1000 > V1617_COST_CAP);
  assert.ok(s.axes.cost < 50);
  assert.match(s.cost.basis, /OVER THE OFFICIAL COST CAP/);
  assert.ok(b.artifact.measurement_notes.some(n => n.includes(AMOS) && n.includes('NOT true of') && n.includes('cost ceiling')));
  assert.equal(b.proof.new_rows[AMOS].under_cost_cap, false);
});

test('amos-1-large is published on Florian\'s GO #17487: ranked above the ceiling, hosted pin, disclosed', async () => {
  const b = await fixture();
  validateJevbenchV1617Bundle(b);
  const s = row(b, AMOSL);
  assert.equal(s.ranked, true); assert.equal(s.endpoint_kind, 'api');
  assert.equal(s.model_pin, 'hosted-api:api.amos.scira.ai/v1/systemone#amos-1-large');
  assert.equal(row(b, AMOS).model_pin, 'hosted-api:api.amos.scira.ai/v1/systemone#amos-1-medium');
  assert.ok(s.cost.usd_per_1000 > V1617_COST_CAP && s.axes.cost < 50);
  assert.match(s.cost.basis, /OVER THE OFFICIAL COST CAP/);
  assert.ok(b.artifact.measurement_notes.some(n => n.includes(AMOSL) && n.includes('NOT true of') && n.includes('cost ceiling')));
  assert.match(b.proof.authority, /#17487/);
  assert.ok(b.artifact.measurement_notes.some(n => n.startsWith('Board effect') && n.includes('#17487')));
  assert.ok(!noteOf(b, AMOS).includes('amos-1-*'), 'no wildcard hint of a sibling');
  assert.doesNotMatch(b.proof.authority, /amos-1-medium[^.]*card 17392/);
});

test('sage-1.4.0 is listed, unpriced and unranked with its ruling question named', async () => {
  const b = await fixture();
  validateJevbenchV1617Bundle(b);
  const s = row(b, SAGE);
  assert.equal(s.ranked, false); assert.equal(s.rank, null); assert.equal(s.cost.kind, 'unpriced');
  assert.match(s.not_ranked_because, /#18983/);
  assert.equal(row(b, 'sage-1.3.0')?.key ?? 'sage-1.3.0', 'sage-1.3.0');
});

test('pjev-2b carries its split-window and refusal-set disclosures', async () => {
  const b = await fixture();
  validateJevbenchV1617Bundle(b);
  const s = row(b, PJEV);
  assert.equal(s.status.answered_ok, 1485);
  assert.equal(s.endpoint_kind, 'cpu');
  const note = noteOf(b, PJEV);
  assert.match(note, /four sittings/);
  assert.match(note, /torchcast-decision-4b-v1\.1/);
});

test('purplemist-mini-1.0 carries its refusal, split-window and offline-count disclosures', async () => {
  const b = await fixture();
  validateJevbenchV1617Bundle(b);
  const s = row(b, PURPLE);
  assert.equal(s.status.answered_ok, 1485);
  assert.equal(s.endpoint_kind, 'cpu');
  assert.match(noteOf(b, PURPLE), /predicted 0 refusals/);
  assert.match(s.endpoint_condition, /SPLIT WINDOW/);
  assert.equal(b.proof.new_rows[PURPLE].input_tokens, 700492);
  assert.match(s.cost.basis, /700,492 input tokens over the/);
});

test('v1.6.17 keeps the non-official-Speed row unranked and the A2 alias untouched', async () => {
  const b = await fixture();
  validateJevbenchV1617Bundle(b);
  const s = row(b, unranked);
  assert.equal(s.ranked, false); assert.equal(s.rank, null);
  for (const scope of ['all', 'open']) {
    const scoped = jevbenchScopeArtifact(b.artifact, scope);
    for (const board of ['A', 'B', 'C']) assert.ok(!(scoped.board?.[board]?.order ?? []).includes(unranked));
  }
  const key = 'microsoft-decision-1-a2-20261012';
  assert.deepEqual(row(b, key), b.previous.artifact.systems.find(x => x.key === key));
});

for (const [name, edit, error] of [
  ['a core row missing', b => { b.artifact.systems = b.artifact.systems.filter(x => x.key !== PJEV); }, /roster|required new row missing|exact cohort|added rows/],
  ['an unknown extra row', b => { b.artifact.systems.push({ ...row(b, PJEV), key: 'extra-row' }); }, /roster|unknown new row/],
  ['subq promoted to a rank', b => { const s = row(b, SUBQ); s.ranked = true; s.listing = 'ranked'; s.rank = 14; }, /n_ranked|treatment of .* is fixed|ranked row count|board|unpriced row/],
  ['subq given a price', b => { const s = row(b, SUBQ); s.cost.usd_per_1000 = 0.01; }, /unpriced row has no cost axis|cost figure/],
  ['subq losing the ruling', b => { row(b, SUBQ).not_ranked_because = 'x'.repeat(100); }, /ruling behind the missing rank/],
  ['subq note without its ruling', b => editNote(b, SUBQ, n => n.replaceAll('#18975', '#0')), /required disclosure "#18975"/],
  ['the reflex wording rewritten', b => { row(b, unranked).not_ranked_because = row(b, unranked).not_ranked_because + ' '; }, /keeps its placement and wording|carried row differs/],
  ['the reflex promoted', b => { const s = row(b, unranked); s.ranked = true; s.listing = 'ranked'; s.rank = 9; }, /n_ranked|listed-not-ranked|ranked row count|board|non-official/],
  ['an inherited point score moved', b => { row(b, 'krino-2b').scores.A += 0.001; }, /headline score|earlier row point score|carried row differs/],
  ['an inherited axis moved', b => { row(b, 'krino-2b').axes.speed += 0.001; }, /earlier row axis|carried row differs/],
  ['an inherited cost object rewritten', b => { row(b, 'krino-2b').cost.usd_per_1000 *= 0.5; }, /earlier row cost object|carried row differs/],
  ['an inherited rank moved by more than the rows above', b => { row(b, 'krino-2b').ranks.capability += 1; }, /capability rank is not the capability order|moved by more than/],
  ['a moved interval left unnamed', b => { const s = row(b, 'krino-2b'); s.composite_ci95 = { ...s.composite_ci95, A: [s.scores.A - 1, s.scores.A + 1] };
    b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => releaseNote(n) ? n.replaceAll('krino-2b', 'a row') : n); }, /must name its row/],
  ['a carried interval excluding its own point', b => { row(b, 'krino-2b').composite_ci95.A = [1, 2]; }, /carried row interval does not contain/],
  ['the carried A2 row edited', b => { row(b, 'microsoft-decision-1-a2-20261012').axes.intelligence += 0.01; }, /carried preliminary row unchanged/],
  ['a carried row above the cost ceiling', b => { row(b, 'julia-1').cost.usd_per_1000 = 0.1; }, /cost above the published ceiling|earlier row cost/],
  ['the cost-ceiling correction dropped', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.filter(n => !n.includes('NOT true of')); }, /must correct the inherited/],
  ['the over-cap row losing its cost-basis statement', b => { row(b, AMOS).cost.basis = row(b, AMOS).cost.basis.replace('OVER THE OFFICIAL COST CAP', 'above'); }, /states it in its cost basis/],
  ['an over-cap row quietly unranked', b => { const s = row(b, AMOS); s.ranked = false; s.listing = 'listed'; s.rank = null; s.ranks = { A: null, B: null, C: null, capability: null }; s.not_ranked_because = 'x'.repeat(80); }, /n_ranked|treatment of .* is fixed|ranked row count|board|ranked and disclosed/],
  ['the paid row losing its re-submission disclosure', b => { row(b, paid).endpoint_condition = row(b, paid).endpoint_condition.replaceAll('RE-SUBMISSION', 'new submission'); }, /re-submission and hardware disclosure/],
  ['the paid row note without its order', b => editNote(b, paid, n => n.replaceAll('4d9fef10', 'xxxxxxxx')), /required disclosure "4d9fef10"/],
  ['the paid row note without the hardware difference', b => editNote(b, paid, n => n.replaceAll('H100', 'a GPU')), /required disclosure "H100"/],
  ['the paid row on the same display as the old row', b => { row(b, paid).display = 'metask-jev-rain-31B-trained'; }, /display/],
  ['pjev note without the split-window disclosure', b => editNote(b, PJEV, n => n.replaceAll('SPLIT WINDOW', 'window')), /required disclosure "SPLIT WINDOW"/],
  ['pjev note naming the wrong peers', b => editNote(b, PJEV, n => n.replaceAll('torchcast-decision-4b-v1.1', 'a row')), /required disclosure "torchcast-decision-4b-v1.1"/],
  ['purplemist note without the predicted-0-refusals disclosure', b => editNote(b, PURPLE, n => n.replaceAll('predicted 0 refusals', 'predicted some')), /required disclosure "predicted 0 refusals"/],
  ['purplemist note with another token total', b => editNote(b, PURPLE, n => n.replaceAll('700,492', '700,000')), /required disclosure "700,492"/],
  ['purplemist note without the 15 not answered', b => editNote(b, PURPLE, n => n.replaceAll('15 not answered', 'a few')), /required disclosure "15 not answered"/],
  ['purplemist without the split-window disclosure', b => { row(b, PURPLE).endpoint_condition = row(b, PURPLE).endpoint_condition.replaceAll('SPLIT WINDOW', 'window'); }, /required condition disclosure "SPLIT WINDOW"/],
  ['purplemist endpoint condition without the predicted-0-refusals sentence', b => { row(b, PURPLE).endpoint_condition = row(b, PURPLE).endpoint_condition.replaceAll('predicted 0 refusals', 'predicted some'); }, /required condition disclosure "predicted 0 refusals"/],
  ['purplemist endpoint condition without the manual stop time', b => { row(b, PURPLE).endpoint_condition = row(b, PURPLE).endpoint_condition.replaceAll('21:19:35Z', 'some time'); }, /required condition disclosure "21:19:35Z"/],
  ['purplemist cost basis with another base model', b => { row(b, PURPLE).cost.basis = row(b, PURPLE).cost.basis.replaceAll('Qwen3.5-2B-Base', 'Qwen3.5-9B'); }, /required cost-basis statement "Qwen3.5-2B-Base"/],
  ['purplemist cost basis without the offline-count decision', b => { row(b, PURPLE).cost.basis = row(b, PURPLE).cost.basis.replaceAll('#18974', '#0'); }, /required cost-basis statement "#18974"/],
  ['purplemist proof input tokens differing from the cost basis', b => { b.proof.new_rows[PURPLE].input_tokens += 1; }, /offline token count in the proof/],
  ['purplemist cost basis quoting another token total', b => { row(b, PURPLE).cost.basis = row(b, PURPLE).cost.basis.replaceAll('700,492 input tokens', '700,493 input tokens'); }, /required cost-basis statement "700,492"/],
  ['card 17487 moved onto amos-1-medium', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => n.startsWith('Board effect')
      ? n.replaceAll("Amos 1 large's entry is not", "Amos 1 medium (Scira)'s entry is not").replaceAll('Amos 1 large (Scira) enters', 'Amos 1 medium (Scira) enters') : n); }, /card 17487 must be tied to Amos 1 large/],
  ['card 17487 sentence also naming another new row', b => { b.proof.authority += ' pjev-2b is covered by card 17487 as well.'; }, /card 17487 must not be attached|card 17487 must be tied/],
  ['a cost_cap_ratio that is not usd over the cap', b => { b.proof.new_rows[AMOSL].cost_cap_ratio = 1.0; }, /cost_cap_ratio must equal usd\/cap/],
  ['a new row without a note', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.filter(n => !n.startsWith(`${PJEV}: `)); }, /too thin/],
  ['a new row interval excluding its point', b => { row(b, PJEV).composite_ci95.A = [0, 0.1]; }, /new row interval does not contain/],
  ['a new row priced as a tariff', b => { row(b, PJEV).cost.kind = 'tariff'; }, /labelled cost estimate/],
  ['a hosted row with a latency adjustment', b => { row(b, AMOS).speed.adjustment = SELF; }, /full-set API row/],
  ['a self-hosted row without the adjustment', b => { row(b, PJEV).speed.adjustment = 'none (API)'; }, /self-hosted latency adjustment/],
  ['a new row with an incomplete run', b => { row(b, PJEV).status.rows = 1499; }, /item count|complete 1500 rows/],
  ['the release note losing its interval count', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => releaseNote(n) ? n.replace('CONFIDENCE INTERVALS', 'intervals') : n); }, /must count rank, interval and diagnostic/],
  ['the release note not naming an added row', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => releaseNote(n) ? n.replaceAll(AMOS, 'a row') : n); }, /must name every added row/],
  ['the diagnostic stripped of its numbers', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => releaseNote(n) ? n.replace(/\d\.\d{8,}/g, 'some value') : n); }, /both values|must name its row/],
  ['the board-effect note dropped', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.filter(n => !(n.startsWith('Board effect') && n.includes('4d9fef10'))); }, /board effect and the paid-exception basis/],
  ['an invented raw_on_A on a carried row', b => { row(b, 'krino-2b').v16.raw_on_A = { intelligence: 99, calibration: 99, capability: 99 }; }, /raw_on_A|carried row differs/],
  ['inherited measurement notes rewritten', b => { b.artifact.measurement_notes[0] = 'rewritten'; }, /inherited measurement notes/],
  ['an inherited category cell changed', b => { b.categories.systems['krino-2b'].languages.en.competence += 1; }, /inherited category cells/],
  ['a new row missing its raw-output hash', b => { delete b.proof.raw_sha256[PJEV]; }, /raw-output coverage/],
  ['a new row provenance claiming under the cap', b => { b.proof.new_rows[AMOS].under_cost_cap = true; }, /new-row provenance/],
  ['the paid flag removed from provenance', b => { b.proof.new_rows[paid].paid_fast_lane = false; }, /new-row provenance/],
  ['the authority losing the paid order', b => { b.proof.authority = b.proof.authority.replaceAll('4d9fef10', 'an order'); }, /publication authority/],
  ['the frozen median replaced', b => { b.artifact.G_med = 2.573387642438244; }, /G_med|median/],
  ['PENDING fails closed', b => { b.manifest.review.verdict = 'PENDING'; }, /independent release review/],
  ['a predecessor other than v1.6.16', b => { b.previous.manifest.revision = 'v1.6.15'; }, /predecessor/],
  ['the predecessor manifest hash rewritten', b => { b.manifest.predecessor.publication_sha256 = 'b'.repeat(64); }, /predecessor binding/],
  ['an item-level field in the artifact', b => { row(b, PJEV).item_text = 'private'; }, /private\/item-level/],
  ['an invented Capability on a new row', b => { row(b, PJEV).capability = 99; }, /capability: |capability is the mean/],
  ['subq inserted into the capability order', b => { b.artifact.board.capability.order = [SUBQ, ...b.artifact.board.capability.order]; }, /board membership capability/],
  ['sage promoted to a rank', b => { const s = row(b, SAGE); s.ranked = true; s.listing = 'ranked'; s.rank = 14; }, /n_ranked|treatment of .* is fixed|ranked row count|board|unpriced row/],
  ['sage given a price', b => { row(b, SAGE).cost.usd_per_1000 = 0.02; }, /unpriced row has no cost axis|cost figure/],
  ['sage note claiming a full answer set', b => editNote(b, SAGE, n => n.replaceAll('1,483 of 1,500', '1,500 of 1,500')), /required disclosure "1,483 of 1,500"/],
  ['sage note without its carry-over statement', b => editNote(b, SAGE, n => n.replaceAll('not carried over', 'carried over')), /required disclosure "not carried over"/],
  ['sage losing the open question', b => { row(b, SAGE).not_ranked_because = 'x'.repeat(100); }, /ruling behind the missing rank/],
  ['amos-1-large without Florian\'s GO in the authority', b => { b.proof.authority = b.proof.authority.replaceAll('#17487', '#0'); }, /needs Florian's GO #17487/],
  ['amos-1-large without Florian\'s GO in the board-effect note', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => n.startsWith('Board effect') ? n.replaceAll('#17487', '#0') : n); }, /board-effect note must carry Florian's GO/],
  ['amos-1-large losing its over-cap cost note', b => { b.artifact.measurement_notes = b.artifact.measurement_notes.filter(n => !(n.startsWith('Cost on amos-1-large'))); }, /must correct the inherited/],
  ['amos-1-large losing its custody condition', b => editNote(b, AMOSL, n => n.replaceAll('CUSTODY CONDITION', 'condition')), /required disclosure "CUSTODY CONDITION"/],
  ['a moved interval named only outside its clause', b => {
    b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => {
      if (!releaseNote(n)) return n;
      const i = n.indexOf('Carried rows whose intervals moved:'), j = n.indexOf('DIAGNOSTICS', i);
      return n.slice(0, i) + n.slice(i, j).replace(' krino-2b,', '') + n.slice(j);
    });
  }, /must name its row/],
  ['a swapped rank between a new and a carried row', b => { const p = row(b, 'phocinae-largha-150m-v1'), j = row(b, PJEV); [p.rank, j.rank] = [j.rank, p.rank]; [p.ranks, j.ranks] = [j.ranks, p.ranks]; }, /rank .* is not the board position|rank is not the|capability rank|moved by more than/],
]) test(`v1.6.17 rejects ${name}`, async () => {
  const b = await fixture();
  edit(b);
  assert.throws(() => validateJevbenchV1617Bundle(b), error);
});
const SELF = 'x2 + 0.15 s (assumption, not measured)';

test('the real PENDING v1.6.17 manifest stays hidden until the independent review lands', async () => {
  if ((await read('publication')).review.verdict === 'PASS') return;
  await assert.rejects(readOptionalJevbenchV1617Release(), /independent release review/);
  assert.equal(await hasPublishedJevbenchV1617Release(process.cwd(), () => {}), false);
});
