// JevBench v1.7.0 UI and machine surfaces. Fixture only: a fake board with the published v1.7 row shape.
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { register } from 'node:module';
import { V170_FIXTURE_SYSTEMS as SYS, V170_FIXTURE_CARRY as CARRY, V170_FIXTURE_CARRY_LABEL } from './fixtures/jev-v170-fixture.mjs';
import { jevV15BoardRow } from '../lib/jevbench-v15-board.mjs';
import { jevMethodView, jevDecisionLimitView, jevPreviousView, jevOldNewRows, jevDecisionLimitText, jevMethodJsonFields, isRemeasurePending, JEV_REMEASURE_PENDING_LABEL } from '../lib/jev-decision-limit.mjs';
import { projectJevbenchFeed } from '../lib/jevbench-agent-feed.mjs';
import { buildAllDataModel } from '../lib/jevbench-all-data-grid.mjs';
import { resultsCsv } from '../lib/decision-result-export.mjs';

register('./tsx-loader-hooks.mjs', import.meta.url);
const importSeoModule = (p) => import(`../${p}`);

const h = React.createElement;
const html = (el) => renderToStaticMarkup(el);
const byKey = (k) => SYS.find((s) => s.key === k);
const [gpu, api, pending, slow] = ['fx-gpu-rescored', 'fx-api-a4', 'fx-cpu-pending', 'fx-slow-tail'].map(byKey);

test('method view: re-scored, pending and carry chips', () => {
  assert.equal(jevMethodView(gpu).text, 'v1.7 · 10 s rule');
  assert.equal(jevMethodView(pending).text, 'v1.6 · re-measure pending');
  assert.equal(jevMethodView({}, { carry: true }).text, 'v1.5');
  assert.equal(jevMethodView({ key: 'old', axes: {} }), null, 'a pre-v1.7 row shows no chip');
  assert.ok(isRemeasurePending(pending) && !isRemeasurePending(gpu));
});

test('decision limit view: raw p95 sits next to the count; adjusted-over-10 with 0 failures is explained', () => {
  const v = jevDecisionLimitView(gpu);
  assert.equal(v.nOver, 0);
  assert.equal(v.p95Raw, 0.95);
  assert.match(v.text, /p95 0\.950 s \(measured\) · 0 of 1,500 over 10 s/);
  const s = jevDecisionLimitView(slow);
  assert.match(s.countText, /212 of 1,500 over 10 s/);
  assert.equal(jevDecisionLimitView(pending), null, 'a pending row has no v1.7 limit view');
  const adjOver = { ...gpu, speed: { ...gpu.speed, p95_s_adjusted: 12.5 } };
  assert.equal(jevDecisionLimitView(adjOver).adjustedOver, true);
  assert.match(jevDecisionLimitView(adjOver).note, /measured time/);
});

test('previous view keeps v1.6 values labelled v1.6', () => {
  const p = jevPreviousView(slow);
  assert.equal(p.release, 'v1.6.37');
  assert.equal(p.composite, 78.9);
  assert.match(p.label, /method v1\.6, before the 10 s rule/);
  assert.match(p.short, /v1\.6\.37: A 78\.90 · #4/);
});

test('board projection passes the v1.7 fields through and leaves older rows byte-identical', () => {
  const r = jevV15BoardRow(slow);
  assert.equal(r.speed.p95_s_raw, 31.4);
  assert.equal(r.speed.n, 1500);
  assert.equal(r.decision_limit.n_over_limit, 212);
  assert.equal(r.method, 'v1.7');
  assert.equal(r.previous.jevbench_score, 78.9);
  const old = jevV15BoardRow({ key: 'o', display: 'O', author: 'A', listing: 'ranked', ranked: true, axes: {}, speed: { p50_s_raw: 1, p50_s_adjusted: 1 } });
  assert.deepEqual(Object.keys(old.speed), ['p50_s_raw', 'p50_s_adjusted', 'adjustment']);
  assert.equal('method' in old, false);
  assert.equal('previous' in old, false);
});

test('old/new rows: pending rows carry no v1.7 value, carry rows sit last, sorted by new rank', () => {
  const rows = jevOldNewRows(SYS, CARRY);
  assert.deepEqual(rows.map((r) => r.key), ['fx-gpu-rescored', 'fx-api-a4', 'fx-slow-tail', 'fx-cpu-pending', 'fx-carry']);
  const p = rows.find((r) => r.key === 'fx-cpu-pending');
  assert.equal(p.newA, null); assert.equal(p.newRank, null); assert.equal(p.oldA, 52.5); assert.equal(p.status, 'remeasure-pending');
  const s = rows.find((r) => r.key === 'fx-slow-tail');
  assert.equal(s.oldA, 78.9); assert.equal(s.newA, 61.3); assert.ok(s.dA < -17);
  assert.equal(rows.at(-1).status, 'carry');
});

test('old/new table: details block, every row, labels', async () => {
  const mod = await importSeoModule('components/JevV170OldNewTable.tsx');
  const out = html(h(mod.JevV170OldNewTable, { systems: SYS, carryRows: CARRY, carryLabel: V170_FIXTURE_CARRY_LABEL, csvHref: '/api/decision-results/jevbench/v1.7.0/csv' }));
  assert.match(out, /<details[^>]*data-bh-jev-v170-old-new/);
  for (const k of ['fx-gpu-rescored', 'fx-api-a4', 'fx-cpu-pending', 'fx-slow-tail', 'fx-carry']) assert.match(out, new RegExp(`data-bh-jev-v170-row="${k}"`));
  assert.match(out, /v1\.7 · 10 s rule/);
  assert.match(out, /v1\.6 · re-measure pending/);
  assert.match(out, /re-measure pending under the 10 s rule/);
  assert.match(out, /212 of 1500/);
  assert.match(out, /counts as a wrong answer and as zero calibration/);
  assert.doesNotMatch(out, /worst calibration/);
  // the pending row's v1.7 cells are empty: its A v1.6 value 52.50 only appears in the old column
  const pendingRow = out.match(/<tr[^>]*data-bh-jev-v170-row="fx-cpu-pending"[\s\S]*?<\/tr>/)[0];
  assert.match(pendingRow, /data-bh-jev-v170-old-a="true">52\.50</);
  assert.match(pendingRow, /data-bh-jev-v170-new-a="true"><span class="bh-muted">—</);
  assert.match(pendingRow, /data-bh-jev-v170-over="true">—</);
  assert.match(out, /Download the table as CSV/);
});

test('board table: method tag on every row, p95 raw + count, pending unranked with label and v1.6 marker', async () => {
  const mod = await importSeoModule('components/JevBoardInteractive.tsx');
  const rows = SYS.map((s) => jevV15BoardRow(s, { headline: 'A' }));
  const out = html(h(mod.JevAxesTable, { rows, publicDecisions: 300, sealedDecisions: 1200, newLabel: null }));
  for (const s of SYS) {
    const tr = out.match(new RegExp(`<tr id="jev14-row-${s.key}"[\\s\\S]*?</tr>`))[0];
    assert.match(tr, /data-bh-jev-method-tag="(v1\.7|v1\.6-pending)"/, `${s.key} shows the method tag`);
  }
  const slowTr = out.match(/<tr id="jev14-row-fx-slow-tail"[\s\S]*?<\/tr>/)[0];
  assert.match(slowTr, /31\.400 s/);
  assert.match(slowTr, /212 of 1,500 over 10 s/);
  assert.match(slowTr, /title="v1\.6\.37: A 78\.90 · #4"/);
  assert.match(slowTr, /data-bh-jev14-score[^>]*>61\.3</, 'the v1.7 score is the displayed one');
  const gpuTr = out.match(/<tr id="jev14-row-fx-gpu-rescored"[\s\S]*?<\/tr>/)[0];
  assert.match(gpuTr, /0 of 1,500 over 10 s/);
  const pTr = out.match(/<tr id="jev14-row-fx-cpu-pending"[\s\S]*?<\/tr>/)[0];
  assert.match(pTr, /data-bh-jev14-ranked="0"/);
  assert.match(pTr, new RegExp(JEV_REMEASURE_PENDING_LABEL));
  assert.match(pTr, /data-bh-jev-v16-value="fx-cpu-pending">v1\.6</);
  assert.match(pTr, /re-measure pending/);
  assert.match(out, /data-bh-jev-limit-legend/);
  assert.match(out, /decisions over 10 s/);
});

test('board table without v1.7 rows is unchanged (no limit column, no method tag)', async () => {
  const mod = await importSeoModule('components/JevBoardInteractive.tsx');
  const old = SYS.map((s) => jevV15BoardRow({ ...s, method: undefined, decision_limit: undefined, previous: undefined, rescored_in: undefined, listing: s.listing === 'remeasure-pending' ? 'ranked' : s.listing }, { headline: 'A' }));
  const out = html(h(mod.JevAxesTable, { rows: old, publicDecisions: 300, sealedDecisions: 1200, newLabel: null }));
  assert.doesNotMatch(out, /data-bh-jev-method-tag|data-bh-jev-limit/);
});

test('NOT_RANKED and unrankedNote carry the pending text', async () => {
  const shared = await importSeoModule('components/JevBoardShared.tsx');
  assert.equal(shared.NOT_RANKED['remeasure-pending'], JEV_REMEASURE_PENDING_LABEL);
  const rank = await importSeoModule('components/JevCapabilityRanking.tsx');
  assert.match(rank.unrankedNote('remeasure-pending', 'JevBench'), /re-measure pending under the 10 s rule.*v1\.6 values/);
});

test('model-page panel: v1.6 values labelled v1.6; pending row says so; limit block shows raw p95', async () => {
  const panel = await importSeoModule('components/JevPreviousValuesPanel.tsx');
  const ok = html(h(panel.JevPreviousValuesPanel, { row: slow }));
  assert.match(ok, /data-bh-jev-v16-previous="rescored"/);
  assert.match(ok, /JevBench v1\.6\.37 values \(method v1\.6, before the 10 s rule\)/);
  assert.match(ok, /Composite 78\.90/);
  assert.match(ok, /re-scored under the 10 s rule from the recorded per-decision times/);
  const remeasured = html(h(panel.JevPreviousValuesPanel, { row: { ...slow, remeasured_in: 'v1.7.0' } }));
  assert.match(remeasured, /come from a new GPU measurement on the same items and replace them/);
  assert.doesNotMatch(remeasured, /re-scored under the 10 s rule from the recorded/);
  const pend = html(h(panel.JevPreviousValuesPanel, { row: pending }));
  assert.match(pend, /data-bh-jev-v16-previous="pending"/);
  assert.match(pend, /Re-measure pending under the 10 s rule/);
  assert.equal(html(h(panel.JevPreviousValuesPanel, { row: { key: 'x' } })), '');
  const cell = await importSeoModule('components/JevDecisionLimitCell.tsx');
  const d = html(h(cell.JevDecisionLimitDetail, { row: slow }));
  assert.match(d, /p95 31\.400 s/);
  assert.match(d, /212 decisions over 10 s \(140 of them answered correctly, counted as wrong\)/);
  assert.match(d, /uses the measured time/);
  assert.match(html(h(cell.JevDecisionLimitDetail, { row: pending })), /not yet re-scored under the 10 s rule/);
});

test('method tag component renders each kind', async () => {
  const mod = await importSeoModule('components/JevMethodTag.tsx');
  assert.match(html(h(mod.JevMethodTag, { row: gpu })), /v1\.7 · 10 s rule/);
  assert.match(html(h(mod.JevMethodTag, { row: pending })), /v1\.6 · re-measure pending/);
  assert.match(html(h(mod.JevMethodTag, { row: {}, carry: true, carryLabel: V170_FIXTURE_CARRY_LABEL })), /title="measured before the 10 s rule/);
  assert.equal(html(h(mod.JevMethodTag, { row: { key: 'old' } })), '');
});

test('agent feed fields: method, limit and previous per system; top-level method block', () => {
  assert.equal(typeof projectJevbenchFeed, 'function');
  const f = jevMethodJsonFields(slow);
  assert.equal(f.p95_s_raw, 31.4);
  assert.equal(f.decisions_over_10s, 212);
  assert.equal(f.previous.composite_score, 78.9);
  assert.equal(f.previous.board_release, 'v1.6.37');
  const p = jevMethodJsonFields(pending);
  assert.equal(p.method, 'v1.6'); assert.equal(p.decisions_over_10s, null); assert.equal(p.method_status, 'v1.6-pending');
  assert.equal(jevDecisionLimitText(pending), JEV_REMEASURE_PENDING_LABEL);
});

test('all-data grid: new columns only on a v1.7 board', () => {
  const art = (systems) => ({ revision: 'v1.7.0', headline: 'A', systems, not_measured: [], v16: { counts: {} } });
  const m = buildAllDataModel({ artifact: art(SYS) });
  const ids = m.columns.map((c) => c.id);
  for (const id of ['method', 'over10', 'over10Ok', 'prevScore', 'prevCapability', 'prevRank', 'prevSpeed']) assert.ok(ids.includes(id), id);
  const row = m.rows.find((r) => r.key === 'fx-slow-tail') ?? m.rows.find((r) => r.values?.key === 'fx-slow-tail');
  const vals = row.values ?? row;
  assert.equal(vals.over10, 212); assert.equal(vals.prevScore, 78.9); assert.equal(vals.prevRank, 4); assert.equal(vals.method, 'v1.7');
  const pv = (m.rows.find((r) => (r.values ?? r).key === 'fx-cpu-pending').values ?? {});
  assert.equal(pv.over10, null);
  const oldIds = buildAllDataModel({ artifact: art(SYS.map((s) => ({ ...s, method: undefined, decision_limit: undefined }))) }).columns.map((c) => c.id);
  assert.ok(!oldIds.includes('over10') && !oldIds.includes('method'));
});

test('export CSV keeps v1.6 values in previous_* columns, never in v1.7 columns', () => {
  const rows = [{ key: 'a', method: 'v1.7', p95_raw_s: 1.5, decisions_over_10s: 3, previous_composite: 70 }, { key: 'b', method: 'v1.6', p95_raw_s: null, decisions_over_10s: null, previous_composite: 52.5 }];
  const csv = resultsCsv({ version: 'v1.7.0', rows });
  assert.match(csv, /"method","p95_raw_s","decisions_over_10s","previous_composite"/);
  assert.match(csv, /"b","v1\.6","","","52\.5"/);
});

test('a row measured first under v1.7.0 (new_in): chip, old/new status "new", no previous block, disclosure reaches the board row', async () => {
  const fresh = { ...structuredClone(gpu), key: 'fx-new-row', display: 'Fixture new row', new_in: 'v1.7.0', measured_in: 'v1.7.0', underlying: 'MANDATORY DISCLOSURE: second and last use by this author on this draw.' };
  delete fresh.previous; delete fresh.rescored_in;
  const chip = jevMethodView(fresh);
  assert.equal(chip.text, 'v1.7 · 10 s rule'); assert.match(chip.title, /New in v1\.7\.0/); assert.match(chip.title, /no v1\.6 value/);
  assert.equal(jevPreviousView(fresh), null);
  const rows = jevOldNewRows([...SYS, fresh], CARRY);
  const n = rows.find((r) => r.key === 'fx-new-row');
  assert.equal(n.status, 'new'); assert.equal(n.oldA, null); assert.equal(n.dA, null); assert.ok(n.newA > 0); assert.equal(n.method, 'v1.7');
  const board = jevV15BoardRow(fresh);
  assert.equal(board.new_in, 'v1.7.0'); assert.match(board.underlying, /^MANDATORY DISCLOSURE/); assert.equal('previous' in board, false);
  assert.equal('underlying' in jevV15BoardRow({ ...structuredClone(gpu), underlying: 'older note' }), false, 'a re-scored row keeps its published page unchanged');
  assert.equal(jevMethodJsonFields(fresh).new_in, 'v1.7.0'); assert.equal(jevMethodJsonFields(fresh).previous, null);
  const mod = await importSeoModule('components/JevV170OldNewTable.tsx');
  const out = html(h(mod.JevV170OldNewTable, { systems: [...SYS, fresh], carryRows: CARRY, carryLabel: V170_FIXTURE_CARRY_LABEL }));
  const row = out.match(/<tr[^>]*data-bh-jev-v170-row="fx-new-row"[\s\S]*?<\/tr>/)[0];
  assert.match(row, /data-bh-jev-v170-status="new"/); assert.match(row, /new in v1\.7\.0 \(no v1\.6 value\)/); assert.doesNotMatch(row, /re-scored</);
  assert.match(out, /1 new in v1\.7\.0/);
});

test('a re-measured row (GPU, same items): own status, chip title, pass-through of the marks and the disclosure, old value from the CPU row', async () => {
  const rem = { ...gpu, key: 'fx-gpu-remeasured', display: 'Remeasured', rescored_in: undefined, remeasured_in: 'v1.7.0', endpoint_kind: 'gpu',
    remeasure: { kind: 're-measure on the same items', draw: 'd', replaces: { board_release: 'v1.6.37', endpoint_kind: 'cpu', in_full: 'scores and times' }, disclosure: 'Re-measure on the same items: this GPU row replaces the earlier loaded-CPU row.' } };
  delete rem.rescored_in;
  const view = jevMethodView(rem);
  assert.equal(view.kind, 'v1.7'); assert.match(view.title, /Re-measured in v1\.7\.0 on the same items on a GPU.*replaces the earlier CPU row in full/);
  const [row] = jevOldNewRows([rem]);
  assert.equal(row.status, 'remeasured'); assert.equal(row.oldA, gpu.previous.jevbench_score ?? row.oldA); assert.ok(row.newA != null && row.newRank === rem.rank);
  const j = jevMethodJsonFields(rem);
  assert.equal(j.remeasured_in, 'v1.7.0'); assert.equal(j.rescored_in, null); assert.equal('new_in' in j, false);
  const board = jevV15BoardRow(rem);
  assert.equal(board.remeasured_in, 'v1.7.0'); assert.match(board.remeasure.disclosure, /^Re-measure on the same items/);
  assert.equal('remeasured_in' in jevV15BoardRow(gpu), false, 'other rows are byte-identical');
  const mod = await import('../components/JevV170OldNewTable.tsx');
  const out = html(h(mod.JevV170OldNewTable, { systems: [rem, pending], carryRows: [], previousRelease: 'v1.6.37' }));
  assert.match(out, /data-bh-jev-v170-status="remeasured"/); assert.match(out, /1 re-measured on a GPU/); assert.match(out, /re-measured on a GPU \(replaces the CPU row\)/);
  const rowHtml = out.match(/<tr[^>]*data-bh-jev-v170-row="fx-gpu-remeasured"[\s\S]*?<\/tr>/)[0];
  assert.doesNotMatch(rowHtml, /data-bh-jev-v170-new-a="true"><span class="bh-muted">—/, 'a re-measured row shows its new A value');
});

test('release stamp follows the row; the in-force method sentence only appears on a v1.7 board', async () => {
  const seo = await importSeoModule('components/JevBenchSeoBlocks.tsx');
  const data = { artifact: { revision: 'v1.7.0' }, date: '2026-10-24T00:00:00.000Z', releasePage: '/jev-models/v1.7.0', feed: { method: { label: 'v1.7' } } };
  const stamp = (row, d = data) => html(h(seo.JevReleaseStamp, { data: d, row }));
  assert.match(stamp(gpu), /re-scored from the recorded per-decision times/);
  assert.match(stamp(pending), /re-measure pending under the 10 s rule \(v1.6 values\)/);
  assert.doesNotMatch(stamp(pending), /re-scored|method v1\.7/);
  assert.match(stamp({ ...gpu, new_in: 'v1.7.0' }), /measured under the rule/);
  assert.doesNotMatch(stamp(pending, { ...data, feed: {} }), /data-bh-jev-method-stamp/, 'no method stamp on a v1.6 board');
  const lat = await importSeoModule('components/JevLatency.tsx');
  assert.match(html(h(lat.JevLatencyMethodNote, {})), /not before 24 October 2026/);
  assert.match(html(h(lat.JevLatencyMethodNote, { inForce: true })), /method v1\.7/);
});

test('methodology: the 10 s rule is in force only on the current page of a published v1.7.0; an archived method page keeps its text and never links to itself', async () => {
  const guide = await importSeoModule('components/DecisionBenchmarkGuide.tsx');
  const { hasPublishedJevbenchV170Release } = await importSeoModule('lib/jevbench-v170-release.mjs');
  const published = await hasPublishedJevbenchV170Release();
  const current = html(await guide.DecisionMethodology({}));
  assert.equal(/data-bh-jev-decision-limit(?!-)/.test(current), published);
  assert.equal(/data-bh-jev-decision-limit-upcoming/.test(current), !published);
  const archived = html(await guide.DecisionMethodology({ version: 'v1.6.1' }));
  assert.match(archived, /data-bh-jev-decision-limit-upcoming/);
  assert.doesNotMatch(archived, /href="\/jev-models\/methodology\/v1\.6\.1"/);
});
