import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readOptionalJevbenchV170Release, readJevbenchV170ForBoard, hasPublishedJevbenchV170Release, validateJevbenchV170Bundle, withV170Restatement, V170_ROW_SPEC, V170_PENDING_KEYS, V170_BASE_RELEASE,
         V170_PENDING_WHY, V170_CARRY_LABEL, V170_NEW_KEYS, V170_REMEASURED_KEYS, V170_PRICING_MODULE_SHA256, V170_PRICING_ADDED_KEYS, V170_PREDECESSOR_PRICING_MODULE_SHA256 } from '../lib/jevbench-v170-release.mjs';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { assembleJevBoard, readChainLatestRelease, readLatestJevbenchRelease } from '../lib/jevbench-live-board.mjs';
import { jevScopeClassifier } from '../lib/jevbench-scope.mjs';
import { JEVBENCH_RELEASES } from '../lib/jevbench-releases.mjs';

const ROOT = 'data/raw/benchmarks/jevbench';
const manifestOnDisk = JSON.parse(await readFile(`${ROOT}/v1.7/jevbench-v1.7.0-publication.json`, 'utf8'));
const reviewed = manifestOnDisk.review.verdict === 'PASS';
const sha = async (p) => createHash('sha256').update(await readFile(p)).digest('hex');

test('the unreviewed build is not published: the reader rejects it, the board stays on the validated v1.6 chain', { skip: reviewed }, async () => {
  await assert.rejects(() => readOptionalJevbenchV170Release(), /independent release review/);
  assert.equal(await readJevbenchV170ForBoard(), null);
  assert.equal(await hasPublishedJevbenchV170Release(), false);
  // the route and the release page must not throw while the review is pending (that would fail `next build`): both read through the non-throwing board reader (404 / notFound)
  for (const file of ['app/api/jevbench/v1.7.0/route.ts', 'app/jev-models/v1.7.0/page.tsx']) assert.match(await readFile(file, 'utf8'), /readJevbenchV170ForBoard\(\)/, file);
  assert.equal(await readLatestJevbenchRelease('v1.6.1'), await readChainLatestRelease('v1.6.1'));
});

if (!reviewed) {
  test.skip('mutation and chain-binding tests run on the PASS copy (synthetic review) and on the final reviewed tree');
} else {
  const r = await readOptionalJevbenchV170Release();
  const prevManifestPath = `${ROOT}/v1.6/jevbench-${V170_BASE_RELEASE}-publication.json`;
  const prevManifest = JSON.parse(await readFile(prevManifestPath, 'utf8'));
  const predecessor = { manifest: prevManifest, historical: r.historical };
  const base = { manifest: r.manifest, artifact: r.artifact, categories: r.categories, carry: r.carry, proof: r.proof, predecessor, predecessorManifestSha256: await sha(prevManifestPath) };
  const rejects = (edit, pattern) => { const b = structuredClone(base); edit(b); assert.throws(() => validateJevbenchV170Bundle(b), pattern); };
  const row = (b, k) => b.artifact.systems.find((s) => s.key === k);
  const PENDING = V170_PENDING_KEYS;
  const rescored = r.artifact.systems.filter((s) => s.method === 'v1.7' && s.rescored_in);
  const newRows = r.artifact.systems.filter((s) => s.new_in);
  const remRows = r.artifact.systems.filter((s) => s.remeasured_in);
  const newKey = V170_NEW_KEYS[0];
  const remKey = V170_REMEASURED_KEYS[0];
  const plain = rescored.find((s) => s.ranked && s.decision_limit.n_over_limit === 0 && !s.a4 && s.v16.equating_offset == null && s.v16.ci95);   // a re-scored row with no decision over the limit
  const over = rescored.find((s) => s.key === 'chon-1.0-12b') ?? rescored.find((s) => s.decision_limit.n_over_limit > 0 && s.ranked);
  const equated = rescored.find((s) => s.a4);
  const pendingKey = PENDING[0];
  const W = { A: [25, 25, 25, 25, 50], B: [40, 20, 20, 20, 50], C: [25, 25, 25, 25, 60] };
  // score_v15.composite, to re-derive consistent composites for the mutations that must reach the invariance / monotonic checks
  const comp = (axes, [i, c, s, k, floor]) => { const w = { intelligence: i, calibration: c, speed: s, cost: k }; const sel = Object.entries(w).filter(([, x]) => x > 0);
    let v = sel.reduce((t, [, x]) => t + x, 0) / sel.reduce((t, [a, x]) => t + x / axes[a], 0); if (axes.intelligence < floor) v *= (axes.intelligence / floor) ** 2;
    for (const a of ['speed', 'cost']) if (axes[a] < 50) v *= (axes[a] / 50) ** 2; return v; };
  const VIEWS = { 'Intelligence only': [1, 0, 0, 0, 50], 'Emphasis on Accuracy 60:20:20': [0.6, 0, 0.2, 0.2, 50], 'Emphasis on Speed 20:60:20': [0.2, 0, 0.6, 0.2, 50],
    'Emphasis on Cost 20:20:60': [0.2, 0, 0.2, 0.6, 50], 'Balanced 33:33:33': [1 / 3, 0, 1 / 3, 1 / 3, 50] };
  const setAxes = (s, patch) => { Object.assign(s.axes, patch); s.capability = (s.axes.intelligence + s.axes.calibration) / 2;
    for (const o of 'ABC') s.scores[o] = comp(s.axes, W[o]); s.jevbench_score = s.scores.A;
    for (const [name, w] of Object.entries(VIEWS)) if (s.views?.[name] != null) s.views[name] = comp(s.axes, w); };

  test('v1.7.0 restates exactly the live board of its base release: every row, the pending set, the carry', () => {
    assert.equal(r.artifact.systems.length, V170_ROW_SPEC.n_rows);
    assert.equal(r.artifact.n_ranked, V170_ROW_SPEC.n_ranked);
    assert.equal(r.artifact.systems.filter((s) => s.ranked).length, r.artifact.n_ranked);
    assert.deepEqual(r.artifact.systems.filter((s) => s.listing === 'remeasure-pending').map((s) => s.key).sort(), [...PENDING].sort());
    assert.equal(rescored.length + PENDING.length + newRows.length + remRows.length, r.artifact.systems.length);
    assert.deepEqual(remRows.map((s) => s.key).sort(), [...V170_REMEASURED_KEYS].sort());
    assert.ok(V170_REMEASURED_KEYS.every((k) => !PENDING.includes(k)), 'a re-measured row is not on the pending list');
    assert.deepEqual(newRows.map((s) => s.key).sort(), [...V170_NEW_KEYS].sort());
    assert.equal(r.artifact.restates.board_release, V170_BASE_RELEASE);
    assert.deepEqual(r.artifact.method, { label: 'v1.7', decision_limit_s: 10, rule: 'latency_s > 10.000 s -> failed', treatment: 'share' });
    assert.equal(r.carry.label, V170_CARRY_LABEL);
    assert.equal(r.proof.pricing_module_sha256, 'aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7');
    assert.equal(r.proof.pricing_module_sha256, V170_PRICING_MODULE_SHA256);
    assert.ok(['81e3578ff652f4eb05829f2068ee7810a0d13a227a9eaf3683aef6d07ba25524', V170_PRICING_MODULE_SHA256].includes(r.proof.predecessor_pricing_module_sha256));
    assert.equal(r.proof.predecessor_pricing_module_sha256, V170_PREDECESSOR_PRICING_MODULE_SHA256);
    assert.deepEqual(r.proof.pricing_change.added_keys, V170_PREDECESSOR_PRICING_MODULE_SHA256 === V170_PRICING_MODULE_SHA256 ? [] : [...V170_PRICING_ADDED_KEYS]); assert.equal(r.proof.pricing_change.rows_whose_price_changes, 0);
  });
  test('every re-scored row shows its v1.6 values next to the v1.7 values and the time-limit evidence', () => {
    for (const s of rescored) {
      assert.equal(s.rescored_in, 'v1.7.0', s.key);
      assert.equal(s.previous.board_release, V170_BASE_RELEASE, s.key);
      assert.equal(s.decision_limit.treatment, 'share'); assert.equal(s.decision_limit.limit_s, 10);
      assert.equal(s.speed.n, s.decision_limit.speed_n, s.key);
      assert.equal(s.axes.cost, s.previous.axes.cost, `${s.key}: tokens were spent, cost is unchanged`);
    }
  });
  test('pinned rows: chon-1.0-12b collapses under the limit, sage-1.3.0 and an A4 row follow the rule, the pending row keeps its v1.6 numbers', () => {
    const chon = rescored.find((s) => s.key === 'chon-1.0-12b');
    assert.equal(chon.decision_limit.n_over_limit, 540); assert.equal(chon.decision_limit.speed_n, 1500);
    assert.equal(+chon.previous.capability.toFixed(2), 85.34); assert.equal(+chon.capability.toFixed(3), 42.994);
    const sage = rescored.find((s) => s.key === 'sage-1.3.0');
    assert.equal(sage.decision_limit.n_over_limit, 0); assert.equal(sage.axes.intelligence, sage.previous.axes.intelligence); assert.equal(sage.axes.calibration, sage.previous.axes.calibration);
    assert.equal(+sage.scores.A.toFixed(3), 73.728); assert.ok(sage.scores.A < sage.previous.scores.A);
    const pend = r.artifact.systems.find((s) => s.key === 'chon-1.0-e4b');
    assert.equal(pend.method, 'v1.6'); assert.equal(pend.ranked, false); assert.equal(pend.decision_limit, null); assert.equal(pend.not_ranked_because, V170_PENDING_WHY);
    assert.equal(pend.scores.A, pend.previous.scores.A);
    assert.ok(equated, 'an equated A4/A5 row exists'); assert.equal(Math.round(equated.scores.A * 100) / 100, equated.scores.A); assert.equal(equated.v16.equated, true);
    assert.equal(r.carry.rows.length, 14); assert.ok(r.carry.rows.every((c) => !c.ranked));
  });
  test('fastino-glide-api (v1.6.40 row, scored on 1,497 of 1,500 items) is re-scored under the rule on the same 1,497 items; two answered decisions over 10 s count failed', () => {
    const g = rescored.find((s) => s.key === 'fastino-glide-api');
    assert.ok(g, 'the hosted GLiDE row is a chain row of v1.7.0');
    assert.equal(g.previous.board_release, V170_BASE_RELEASE); assert.equal(+g.previous.scores.A.toFixed(3), 76.609); assert.equal(+g.previous.capability.toFixed(3), 84.702);
    assert.equal(g.decision_limit.speed_n, 1497); assert.equal(g.speed.n, 1497);
    assert.equal(g.decision_limit.n_over_limit, 2); assert.equal(g.decision_limit.n_over_limit_answered_ok, 2);
    assert.equal(+g.scores.A.toFixed(3), 76.441); assert.equal(+g.capability.toFixed(3), 84.456);
    assert.ok(g.scores.A < g.previous.scores.A && g.axes.intelligence < g.previous.axes.intelligence && g.axes.calibration < g.previous.axes.calibration);
    assert.equal(g.axes.cost, g.previous.axes.cost); assert.equal(g.cost.usd_per_1000, 0.023065479082321188);
    assert.deepEqual(g.custody_exclusion, { derived_gold_sha256: '9f1f8200d0a1b4384f43ffc0a91f3f36e4790fc3dbcef7486bf233b0142baa47', exclusion_list_sha256: '31b47af58dce134a70e5cbf60aad40db0000dd398f26649070fb7c9dfd1deeb3', items: 3, scored_items: 1497, rule: g.custody_exclusion.rule });
    assert.match(g.underlying, /SCORED ON 1,497 OF THE DRAW'S 1,500 ITEMS/);
    assert.match(g.cost.basis, /pricing_v15 \(sha256 aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7\)/);
    assert.equal(r.proof.systems.find((s) => s.key === 'fastino-glide-api').n_decisions, 1497);
  });
  test('the four intake handoffs retain their distinct identities, frozen costs and disclosures', () => {
    const by = Object.fromEntries(r.artifact.systems.map(s => [s.key,s]));
    for (const [key,cap] of Object.entries({'bobcat-1.3':77.86,'wald-26b-a4b':76.78,'standard_one_3b_sh_v4':56.04,'seb-9b-v2':64.82,'knowline-35b-a3b-gen1.5':76.65,'fastino-glide-1.2-open':84.92})) {
      assert.equal(+by[key].capability.toFixed(2),cap,key); assert.equal(by[key].new_in,'v1.7.0'); assert.equal(by[key].ranked,true);
    }
    for (const [old,key] of [['standard_one_3b_sh','standard_one_3b_sh_v4'],['seb-9b','seb-9b-v2']]) {
      assert.match(by[key].underlying,new RegExp('PREDECESSOR: '+old)); assert.match(by[old].underlying,new RegExp('SUPERSEDED BY: '+key)); assert.ok(by[old].previous);
    }
    assert.match(by['wald-26b-a4b'].underlying,/0[.]81/); assert.match(by['wald-26b-a4b'].underlying,/123 of 375/); assert.match(by['wald-26b-a4b'].cost.basis,/Cost effect of the \+1: 0[.]19/);
    const know=by['knowline-35b-a3b-gen1.5']; assert.equal(+know.cost.usd_per_1000.toFixed(6),0.322975); assert.match(know.cost.basis,/0[.]3125/); assert.match(know.cost.basis,/DeepInfra/); assert.ok(know.cost.usd_per_1000>0.06459465517241379);
    const g=by['fastino-glide-1.2-open']; assert.equal(g.decision_limit.speed_n,1497); assert.equal(g.decision_limit.n_over_limit,0); assert.equal(g.cost.common_basis.n_items,1482); assert.equal(+g.cost.usd_per_1000.toFixed(6),0.205364); assert.match(g.cost.basis,/0[.]42/); assert.match(g.cost.basis,/3[.]0/);
    assert.equal(g.custody_exclusion.derived_gold_sha256,'9f1f8200d0a1b4384f43ffc0a91f3f36e4790fc3dbcef7486bf233b0142baa47'); assert.match(g.underlying,/Built with Fastino GLiDE/); assert.match(g.underlying,/does not establish that the hosted fastino-glide-api row uses the same weights/);
    for(const key of ['torchcast-decision-4b-v1.3','subq-snap-1.1']) { const s=by[key]; assert.equal(s.previous.board_release,'v1.6.43'); assert.equal(s.rescored_in,'v1.7.0'); assert.equal(s.decision_limit.n_over_limit,0); assert.equal(s.axes.cost,s.previous.axes.cost); }
  });
  test('v1.7.0 archive files and the base release stay byte-identical', async () => {
    const m = JSON.parse(await readFile(`${ROOT}/v1.6/jevbench-${V170_BASE_RELEASE}-publication.json`, 'utf8'));
    for (const [k, f] of Object.entries(m.files)) assert.equal(await sha(f.path), f.sha256, `${V170_BASE_RELEASE} ${k}`);
    assert.equal(await sha(`${ROOT}/v1.7/jevbench-v1.7.0-history.json`), m.files.history.sha256);
    assert.equal(JEVBENCH_RELEASES[0].version, 'v1.7.0'); assert.equal(JEVBENCH_RELEASES[1].version, V170_BASE_RELEASE);
  });

  test('v1.7.0 rejects altered evidence (bundle checks)', () => {
    rejects((b) => { b.manifest.review.verdict = 'PENDING'; }, /independent release review/);
    rejects((b) => { b.predecessorManifestSha256 = '0'.repeat(64); }, /predecessor binding/);
    rejects((b) => { b.manifest.files.carry.sha256 = 'xyz'; }, /file binding/);
    rejects((b) => { b.artifact.method.label = 'v1.6'; }, /method label/);
    rejects((b) => { b.artifact.restates.feed_sha256 = 'abc'; }, /restates binding/);
    rejects((b) => { b.artifact.systems.pop(); }, /row count|row set/);
    rejects((b) => { row(b, plain.key).key = 'invented-row'; }, /row set differs/);
    rejects((b) => { row(b, plain.key).axes.cost += 1; }, /cost axis is unchanged/);
    rejects((b) => { row(b, plain.key).scores.A += 0.5; }, /score A does not follow|headline score/);
    rejects((b) => { row(b, plain.key).axes.speed += 3; }, /Speed axis does not follow/);
    rejects((b) => { row(b, over.key).decision_limit.n_over_limit -= 1; }, /independent count of the raw|decision_limit counts/);
    rejects((b) => { row(b, over.key).decision_limit.n_over_limit_answered_ok = row(b, over.key).decision_limit.n_over_limit + 1; }, /decision_limit counts/);
    rejects((b) => { row(b, plain.key).decision_limit.treatment = 'worst'; }, /decision_limit/);
    rejects((b) => { row(b, plain.key).method = 'v1.6'; }, /method label/);
    rejects((b) => { row(b, plain.key).rescored_in = 'v1.6.37'; }, /method label/);
    rejects((b) => { setAxes(row(b, over.key), { calibration: over.previous.axes.calibration + 1 }); }, /Calibration can only fall/);
    rejects((b) => { setAxes(row(b, over.key), { intelligence: over.previous.axes.intelligence + 0.4 }); }, /Intelligence (can only fall|rose)/);
    rejects((b) => { setAxes(row(b, plain.key), { intelligence: plain.axes.intelligence - 0.5 }); }, /no decision over the limit/);
    rejects((b) => { row(b, plain.key).composite_ci95.A[1] = row(b, plain.key).scores.A - 1; }, /interval does not contain/);
    rejects((b) => { row(b, plain.key).v16.ci95.composite.B[0] -= 1; }, /interval fields agree/);
    rejects((b) => { row(b, pendingKey).ranked = true; }, /ranked row count|never ranked|pending/);
    rejects((b) => { row(b, pendingKey).decision_limit = { limit_s: 10 }; }, /pending row mark/);
    rejects((b) => { row(b, pendingKey).not_ranked_because = 'Pending.'; }, /pending reason/);
    rejects((b) => { row(b, pendingKey).scores.A += 1; }, /shows its v1\.6/);
    rejects((b) => { b.categories.systems[pendingKey] = { families: {} }; }, /no v1\.7 cells|pending row has cells/);
    rejects((b) => { b.carry.label = 'carried'; }, /carry label/);
    rejects((b) => { b.carry.rows[0].ranked = true; }, /carry rows/);
    rejects((b) => { const o = b.artifact.board.A.order; [o[0], o[1]] = [o[1], o[0]]; }, /sorted by score|not the board position/);
    rejects((b) => { row(b, plain.key).ranks.A += 1; }, /not the board position/);
    rejects((b) => { const x = b.artifact.systems.filter((s) => s.ranked); x[1].ranks.capability = x[0].ranks.capability; }, /capability ranks are 1\.\.n/);
    rejects((b) => { b.artifact.measurement_notes[0] += ' Failures count as the worst calibration.'; }, /worst calibration/);
    rejects((b) => { b.artifact.measurement_notes[1] += ' (see /home/flori/jobs/x)'; }, /internal path/);
    rejects((b) => { b.proof.systems.find((x) => x.key === plain.key).raw_sha256 = 'f'.repeat(64); }, /raw sha256/);
    rejects((b) => { b.proof.pricing_module_sha256 = '0'.repeat(64); }, /pricing module/);
    rejects((b) => { b.proof.predecessor_pricing_module_sha256 = '0'.repeat(64); }, /pricing module/);
    rejects((b) => { b.proof.pricing_change.rows_whose_price_changes = 1; }, /pricing change record/);
    rejects((b) => { b.proof.pricing_change.added_keys = ['drex-max', 'other']; }, /pricing change record/);
    rejects((b) => { b.proof.pricing_change.added_keys = V170_PREDECESSOR_PRICING_MODULE_SHA256 === V170_PRICING_MODULE_SHA256 ? [...V170_PRICING_ADDED_KEYS] : []; }, /pricing change record/);
    rejects((b) => { b.proof.scorers.score_v17 = '0'.repeat(64); }, /scorer pins/);
    rejects((b) => { b.proof.publication_approval.top_five_preview.card_id = '12345'; }, /preview approval card/);
    rejects((b) => { b.proof.publication_approval.top_five_preview.selection = 'PLACEHOLDER-SELECTION'; }, /placeholder not filled/);
    rejects((b) => { b.artifact.measurement_notes = b.artifact.measurement_notes.map((n) => n.startsWith('Board effect') ? n + ' PROVISIONAL-TOPFIVE' : n); }, /board effect/);
  });

  test('a new row (measured first under v1.7.0) has its own shape: no previous, new_in, disclosure and licence, ranked with the re-scored rows', () => {
    assert.ok(newKey, 'this build has a new row');
    for (const s of newRows) {
      assert.equal(s.method, 'v1.7'); assert.equal(s.new_in, 'v1.7.0'); assert.equal(s.measured_in, 'v1.7.0'); assert.equal(s.draw.release, 'v1.7.0');
      assert.ok(!('previous' in s) && !('rescored_in' in s), s.key);
      assert.match(s.underlying, /MANDATORY DISCLOSURE|FIRST MEASUREMENT/); assert.ok(s.licence.length > 0); assert.equal(s.decision_limit.treatment, 'share');
      assert.ok(r.artifact.board.A.order.includes(s.key) === Boolean(s.ranked), s.key);
      assert.ok(r.artifact.measurement_notes.some((n) => n.startsWith('New in v1.7.0:') && n.includes(`(${s.key})`)));
    }
  });
  test('v1.7.0 rejects a malformed new row (6+ mutations)', { skip: !newKey }, () => {
    const nr = (b) => row(b, newKey);
    rejects((b) => { nr(b).previous = structuredClone(rescored[0].previous); }, /a new row has no previous/);
    rejects((b) => { nr(b).rescored_in = 'v1.7.0'; }, /a new row has no rescored_in/);
    rejects((b) => { nr(b).measured_in = 'v1.6.37'; }, /new row marks/);
    rejects((b) => { delete nr(b).new_in; }, /new row marks/);
    rejects((b) => { nr(b).draw.release = 'v1.6.37'; }, /new row marks/);
    rejects((b) => { nr(b).method = 'v1.6'; }, /new row marks|method label/);
    rejects((b) => { delete nr(b).decision_limit; }, /decision_limit/);
    rejects((b) => { nr(b).decision_limit.n_over_limit += 1; }, /independent count of the raw|decision_limit counts/);
    rejects((b) => { nr(b).underlying = nr(b).underlying.replace(/MANDATORY DISCLOSURE|FIRST MEASUREMENT/g, 'Note'); }, /mandatory disclosure and licence/);
    rejects((b) => { nr(b).licence = ''; }, /mandatory disclosure and licence/);
    rejects((b) => { nr(b).axes.speed += 3; }, /Speed axis does not follow/);
    rejects((b) => { nr(b).scores.A += 0.5; }, /score A does not follow|headline score/);
    rejects((b) => { nr(b).composite_ci95.A[1] = nr(b).scores.A - 1; }, /interval does not contain/);
    rejects((b) => { for (const o of 'ABC') b.artifact.board[o].order = b.artifact.board[o].order.filter((k) => k !== newKey); }, /board membership/);
    rejects((b) => { b.artifact.measurement_notes = b.artifact.measurement_notes.filter((n) => !n.startsWith('New in v1.7.0:')); }, /new-rows note/);
    rejects((b) => { b.artifact.systems = b.artifact.systems.filter((s) => s.key !== newKey); b.artifact.roster_count -= 1; }, /row count|row set|ranked row count|new-row set/);
    rejects((b) => { b.proof.systems = b.proof.systems.filter((s) => s.key !== newKey); }, /system proof coverage/);
    rejects((b) => { b.proof.systems.find((s) => s.key === newKey).kind = 'full'; }, /proof agrees with the row/);
  });


  test('the two Super Decider rows are ranked, priced at the launch list price of the provider\'s public product page, and say where the price comes from', () => {
    const sd = r.artifact.systems.filter((s) => s.key.startsWith('singularity-super-decider'));
    assert.deepEqual(sd.map((s) => s.key).sort(), ['singularity-super-decider', 'singularity-super-decider-thinking']);
    assert.deepEqual([...V170_PRICING_ADDED_KEYS].sort(), sd.map((s) => s.key).sort());
    const usd = { 'singularity-super-decider': 0.03919652, 'singularity-super-decider-thinking': 0.0520983 };
    for (const s of sd) {
      assert.ok(s.ranked && s.listing === 'ranked' && Number.isFinite(s.scores.A) && Number.isFinite(s.axes.cost), s.key);
      assert.equal(s.cost.kind, 'listed');
      assert.ok(Math.abs(s.cost.common_basis.usd_per_1000_all_items - usd[s.key]) < 1e-9, `${s.key}: all-items cost from the launch list price`);
      assert.match(s.cost.basis, /singularitycompute\.com\/super-decider, fetched 22 Oct 2026: USD 0\.03 per 1M input tokens, output tokens free/);
      assert.match(s.cost.basis, /ASI:Cloud catalogue itself was not reachable/);
      assert.doesNotMatch(s.cost.basis, /I-1|I-3|interpretation/);
      assert.match(s.underlying, /MANDATORY DISCLOSURE/); assert.equal(s.paid_fast_lane, true);
    }
  });
  test('a re-measured row (GPU, same items) replaces its CPU row in full: GPU scores and times, the CPU row as previous, disclosure on the row', () => {
    assert.ok(remKey, 'this build has re-measured rows');
    for (const s of remRows) {
      assert.equal(s.method, 'v1.7'); assert.equal(s.remeasured_in, 'v1.7.0'); assert.equal(s.measured_in, 'v1.7.0'); assert.equal(s.draw.release, 'v1.7.0');
      assert.ok(!('rescored_in' in s) && !('new_in' in s), s.key);
      assert.equal(s.endpoint_kind, 'gpu'); assert.equal(s.previous.method, 'v1.6'); assert.equal(s.previous.board_release, V170_BASE_RELEASE);
      assert.ok(s.ranked && s.listing === 'ranked' && r.artifact.board.A.order.includes(s.key), s.key);
      assert.match(s.remeasure.disclosure, /^Re-measure on the same items/); assert.equal(s.remeasure.replaces.in_full, 'scores and times'); assert.equal(s.remeasure.replaces.endpoint_kind, 'cpu');
      assert.ok(s.speed.p95_s_raw < s.previous.speed.p95_s_raw, `${s.key}: the GPU times are not the CPU times`);
      assert.equal(s.axes.cost, s.previous.axes.cost, `${s.key}: same tokens, same price basis`);
      assert.doesNotMatch(`${s.endpoint_condition} ${s.remeasure.disclosure}`, /#\d{3,}|custody|\br1\d\d\b|\/home\//i, s.key);
      assert.ok(r.artifact.measurement_notes.some((n) => n.startsWith('Re-measured in v1.7.0:') && n.includes(`(${s.key})`)));
      assert.ok(!(s.key in (r.proof.pending.keys.reduce((o, k) => ({ ...o, [k]: 1 }), {}))), s.key);
      assert.equal(r.proof.remeasured[s.key].raw_sha256, V170_ROW_SPEC.rows[s.key].raw_sha256);
      assert.notEqual(r.proof.remeasured[s.key].replaces_raw_sha256, r.proof.remeasured[s.key].raw_sha256);
    }
  });
  test('the new row carries no board/issue number or custody reference in its public text', { skip: !newKey }, () => {
    for (const s of newRows) assert.doesNotMatch(`${s.underlying} ${s.endpoint_condition} ${s.licence}`, /#\d{3,}|custody/i, s.key);
    for (const s of newRows) assert.doesNotMatch(s.underlying, /[a-z] (MANDATORY DISCLOSURE|FIRST MEASUREMENT)|Same-author use \d of \d/, `${s.key}: separator before the disclosure, no custody wording`);
  });
  test('v1.7.0 rejects a malformed re-measured row (GPU numbers with CPU times, still pending, no disclosure, wrong marks, ...)', { skip: !remKey }, () => {
    const rr = (b) => row(b, remKey);
    rejects((b) => { rr(b).speed = structuredClone(rr(b).previous.speed); }, /CPU times|speed basis|speed block/);                       // GPU scores with the CPU speed block
    rejects((b) => { const cpu = rr(b).previous.axes; rr(b).axes = { ...rr(b).axes, intelligence: cpu.intelligence, calibration: cpu.calibration, speed: cpu.speed }; }, /Speed axis does not follow|capability is the mean|score A does not follow/);   // CPU axes with the GPU times
    rejects((b) => { rr(b).method = 'v1.6'; rr(b).listing = 'remeasure-pending'; }, /re-measured row marks|pending/);                    // still listed pending
    rejects((b) => { b.proof.pending.keys = [...b.proof.pending.keys, remKey]; }, /proof pending set/);
    rejects((b) => { delete rr(b).remeasure.disclosure; }, /re-measure disclosure/);
    rejects((b) => { rr(b).remeasure.disclosure = 'GPU row.'; }, /re-measure disclosure/);
    rejects((b) => { delete rr(b).remeasure; }, /re-measure disclosure|Cannot read/);
    rejects((b) => { rr(b).remeasure.replaces.in_full = 'scores'; }, /re-measure disclosure/);
    rejects((b) => { rr(b).remeasure.replaces.board_release = 'v1.6.1'; }, /re-measure disclosure/);
    rejects((b) => { rr(b).endpoint_kind = 'cpu'; }, /GPU endpoint|another endpoint|re-measure disclosure/);
    rejects((b) => { delete rr(b).remeasured_in; }, /re-measured row marks|method label/);
    rejects((b) => { rr(b).measured_in = 'v1.6.17'; }, /re-measured row marks/);
    rejects((b) => { rr(b).rescored_in = 'v1.7.0'; }, /neither new nor re-scored/);
    rejects((b) => { rr(b).new_in = 'v1.7.0'; }, /neither new nor re-scored/);
    rejects((b) => { delete rr(b).previous; }, /previous block|Cannot read/);
    rejects((b) => { rr(b).previous.method = 'v1.7'; }, /previous block/);
    rejects((b) => { rr(b).endpoint_condition += ' (custody #23411)'; }, /internal reference/);
    rejects((b) => { rr(b).axes.speed += 3; }, /Speed axis does not follow/);
    rejects((b) => { rr(b).decision_limit.n_over_limit += 1; }, /independent count of the raw|decision_limit counts/);
    rejects((b) => { b.artifact.measurement_notes = b.artifact.measurement_notes.filter((n) => !n.startsWith('Re-measured in v1.7.0:')); }, /re-measured-rows note/);
    rejects((b) => { delete b.proof.remeasured[remKey]; }, /proof re-measured set/);
    rejects((b) => { b.proof.remeasured[remKey].replaces_raw_sha256 = b.proof.remeasured[remKey].raw_sha256; }, /proof re-measured record/);
    rejects((b) => { b.proof.systems.find((s) => s.key === remKey).kind = 'full'; }, /proof agrees with the row/);
    rejects((b) => { b.artifact.systems = b.artifact.systems.filter((s) => s.key !== remKey); b.artifact.roster_count -= 1; }, /row count|row set|ranked row count/);
  });

  const apiA4 = JSON.parse(await readFile('data/jevbench-api-a4-equated.json', 'utf8'));
  const [release, previous] = await Promise.all([readJevbenchV161Release(), readJevbenchV157Release()]);
  const chainBoard = await assembleJevBoard({ release, previous, live: true, apiA4, restate: false });
  const isApi = jevScopeClassifier(chainBoard.published.systems, chainBoard.publishedCarry.rows, previous.artifact.systems, previous.artifact.not_measured);
  const chainInput = async () => ({ merged: structuredClone(chainBoard.merged), published: structuredClone(chainBoard.published), publishedCarry: structuredClone(chainBoard.publishedCarry), categories: chainBoard.categories, isApi,
    releaseSha256: await sha(`${ROOT}/v1.6/jevbench-v1.6.1-results.json`), chainLatestRelease: await readChainLatestRelease('v1.6.1') });
  const v170Clone = () => structuredClone({ artifact: r.artifact, categories: r.categories, carry: r.carry, sha256: r.sha256 });
  const bound = async (edit, pattern, chainEdit = () => {}) => {
    const v = v170Clone(); edit(v); const c = await chainInput(); chainEdit(c);
    await assert.rejects(() => withV170Restatement(c, v), pattern);
  };

  test('the restatement is bound to the live v1.6 chain: it passes on the chain it was built for', async () => {
    const restated = await withV170Restatement(await chainInput(), v170Clone());
    assert.equal(restated.published.restated_by, 'v1.7.0');
    assert.equal(restated.published.systems.length, V170_ROW_SPEC.n_rows);
    assert.equal(restated.published.n_ranked, V170_ROW_SPEC.n_ranked);
    assert.deepEqual(restated.publishedCarry.rows, chainBoard.publishedCarry.rows);
  });
  test('v1.7.0 rejects a restatement that does not match the chain (previous, identity, cost, row set, newer release, feed hash, seeds)', async () => {
    await bound((v) => { v.artifact.systems.find((s) => s.key === plain.key).previous.scores.A += 0.01; }, /previous differs from the live chain row/);
    await bound((v) => { v.artifact.systems.find((s) => s.key === plain.key).previous.rank += 1; }, /previous differs/);
    await bound((v) => { v.artifact.systems.find((s) => s.key === plain.key).cost.usd_per_1000 += 1e-6; }, /identity, cost or presentation/);
    await bound((v) => { v.artifact.systems.find((s) => s.key === plain.key).display += ' (new)'; }, /identity, cost or presentation/);
    await bound((v) => { v.artifact.systems.find((s) => s.key === plain.key).draw = { id: 'other' }; }, /identity, cost or presentation|draw/);
    await bound((v) => { v.artifact.systems.find((s) => s.key === plain.key).v16.ci95.seed += 1; }, /published seed/);
    await bound((v) => { v.artifact.systems.find((s) => s.key === pendingKey).cost = { kind: 'estimate' }; }, /pending row differs from the chain/);
    await bound((v) => { v.artifact.restates.feed_sha256 = 'a'.repeat(64); }, /feed_sha256/);
    await bound(() => {}, /row set differs/, (c) => { const x = structuredClone(c.published.systems[0]); x.key = 'v1.6.38-new-row'; c.published.systems.push(x); });
    await bound(() => {}, /rebuild v1\.7\.0/, (c) => { c.chainLatestRelease = 'v1.6.99'; });
    if (newKey) {
      // a new row whose key reaches the chain (the row was published in a newer release) must fail closed: it has to be rebuilt as a re-scored row
      await bound(() => {}, /collides with a row of the live board/, (c) => { const x = structuredClone(c.published.systems[0]); x.key = newKey; c.published.systems.push(x); });
      // a re-scored row posing as new (previous dropped) is not a chain-bound row and is refused by the row set
      await bound((v) => { delete v.artifact.systems.find((s) => s.key === plain.key).previous; }, /previous|differs/);
    }
    await bound((v) => { v.carry.rows[0].display += 'x'; }, /dated carry rows differ/);
  });
  test('a re-measured row is bound to the CPU row it replaces (previous == chain, same weights, same draw, another endpoint kind, same cost)', { skip: !remKey }, async () => {
    const rk = (v) => v.artifact.systems.find((s) => s.key === remKey);
    await bound((v) => { rk(v).previous.scores.A += 0.01; }, /previous differs from the live chain row/);                      // previous != chain
    await bound((v) => { rk(v).previous.speed.p50_s_raw += 1; }, /previous differs from the live chain row/);
    await bound((v) => { rk(v).model_pin += 'x'; }, /identity, cost or presentation/);                                           // other weights
    await bound((v) => { rk(v).cost.usd_per_1000 += 1e-6; }, /identity, cost or presentation/);
    await bound((v) => { rk(v).draw.id = 'other'; }, /same draw/);
    await bound((v) => { rk(v).remeasure.replaces.endpoint_kind = 'gpu'; rk(v).endpoint_kind = 'cpu'; }, /another endpoint kind/);   // it does not replace the endpoint kind of the published row
    await bound((v) => { rk(v).ranked = false; }, /identity, cost or presentation|ranked flag/);
    await bound((v) => { rk(v).display += ' (GPU)'; }, /identity, cost or presentation/);
  });
  test('a published v1.7.0 board is live: restated rows, v1.7.0 as the latest release, archive pages untouched', async () => {
    const live = await assembleJevBoard({ release, previous, live: true, apiA4 });
    assert.equal(live.published.restated_by, 'v1.7.0'); assert.equal(live.published.revision, 'v1.6.1');
    assert.equal(live.published.systems.find((s) => s.key === 'chon-1.0-12b').method, 'v1.7');
    assert.equal(await readLatestJevbenchRelease('v1.6.1'), 'v1.7.0');
    const archived = await assembleJevBoard({ release, previous, live: false, apiA4 });
    assert.equal(archived.published.restated_by, undefined); assert.equal(archived.live, false);
    const page = await readFile('app/jev-models/v1.7.0/page.tsx', 'utf8'); assert.match(page, /readJevbenchV170ForBoard\(\)/); assert.match(page, /<JevV170OldNewTable systems=/);
    assert.match(await readFile('components/JevV170OldNewTable.tsx', 'utf8'), /data-bh-jev-v170-old-new/);
    // the history shows the in-force text only once published (this is the PASS state) and the announcement paragraph only before
    assert.match(await readFile('components/JevReleaseHistory.tsx', 'utf8'), /\{v170\n\s+\? <p[^>]*data-bh-jev-method-in-force>[^]*\n\s+: <p[^>]*data-bh-jev-upcoming>/);
  });
}
