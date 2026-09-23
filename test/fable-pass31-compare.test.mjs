// F-163 and F-164 (Fable pass 31 directives, implemented 2026-09-23, iteration 177).
//
// The Compare page had two ways of presenting a launch-day model as if it had been measured:
//   F-164  "91 evaluation rows in the full comparison" counted 26 developer claims as evaluations;
//   F-163  a model with nothing measured anywhere was listed in every one of the twelve snapshot
//          cards with an empty bar and "No measured result".
//
// These tests do not pin a sentence for one model: they run the shipped wording helpers over cases
// built by hand (so every branch is reachable regardless of today's data) and over the real dataset
// (so the live page's counts are re-derived, never copied). What a reader sees is checked last, by
// reading the component's own expressions back out of the source.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildBenchmarkView, selectFamilyBenchmarkView, latestScores, normalize } from '../lib/benchmark-view.mjs';
import { claimProfile, claimProfiles, compareClaimsSentence, unmeasuredNoticeLine, noticeKind } from '../lib/compare-claims.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const COMPARE = read('../components/BenchmarkCompare.tsx');
const view = buildBenchmarkView(JSON.parse(read('../data/dataset.json')));

/** The axes the Compare table renders for a selection, and the per-topic `measured` count its cards
 *  average — the component's own two expressions, kept in one place for the tests below. */
function compareState(picks) {
  const picked = selectFamilyBenchmarkView(view, picks);
  const ids = picks.filter((id) => picked.models.some((m) => m.id === id));
  const visibleAxes = picked.axes.filter((a) => a.scores.some((r) => r.modelId && ids.includes(r.modelId)));
  const categories = [...new Set(picked.axes.map((a) => a.category))].sort();
  const snapshots = categories.map((name) => {
    const axes = visibleAxes.filter((a) => a.category === name);
    return { name, models: ids.map((id) => ({ id, measured: axes.map((axis) => {
      const row = latestScores(axis.scores).find((s) => s.modelId === id);
      return row && !row.lowSample ? normalize(row.value, axis.stats, axis.higherBetter) : null;
    }).filter((v) => v != null).length })) };
  });
  return { view: picked, ids, visibleAxes, snapshots, profiles: claimProfiles(visibleAxes, ids, picked.models) };
}

const profile = (over) => ({ id: over.name, name: over.name, org: 'Acme', total: 0, selfReported: 0, preliminary: 0, measured: 0, measuredLowSample: 0, ...over });

test('F-164: a clause per model, in the sheet’s wording, with the repeated basis elided', () => {
  const sentence = compareClaimsSentence([
    profile({ name: 'Model A', org: 'Anthropic', total: 17, selfReported: 16, measured: 1 }),
    profile({ name: 'Model B', org: 'OpenAI', total: 6, selfReported: 5, measured: 1 }),
  ]);
  assert.equal(sentence, 'Model A: 16 of 17 values are Anthropic’s own claims (†) · Model B: 5 of 6 are OpenAI’s.');
});

test('F-164: a preliminary model reads in the sheet’s ‡ wording; a measured-only model is not mentioned', () => {
  assert.equal(compareClaimsSentence([
    profile({ name: 'Union Alpha', total: 2, preliminary: 2 }),
    profile({ name: 'Measured Only', total: 30, measured: 30 }),
  ]), 'Union Alpha: 2 of 2 values are announced, chart-read figures (‡).');
  assert.equal(compareClaimsSentence([profile({ name: 'Measured Only', total: 30, measured: 30 })]), '');
  assert.equal(compareClaimsSentence([]), '');
});

test('F-164: one value is never printed as "1 … values are" (D173)', () => {
  assert.equal(compareClaimsSentence([profile({ name: 'One', org: 'Acme', total: 1, selfReported: 1 })]),
    'One: 1 of 1 value is Acme’s own claim (†).');
  assert.equal(compareClaimsSentence([profile({ name: 'One', org: 'Acme', total: 9, selfReported: 1, measured: 8 })]),
    'One: 1 of 9 values is Acme’s own claim (†).');
  assert.equal(compareClaimsSentence([profile({ name: 'Pre', total: 3, preliminary: 1, measured: 2 })]),
    'Pre: 1 of 3 values is an announced, chart-read figure (‡).');
});

test('F-164: a model with both bases states both counts against one total', () => {
  assert.equal(compareClaimsSentence([profile({ name: 'Mixed', org: 'Acme', total: 10, selfReported: 6, preliminary: 2, measured: 2 })]),
    'Mixed: of 10 values, 6 are Acme’s own claims (†) and 2 are announced, chart-read figures (‡).');
});

test('F-163: the notice names the models and says what their values are', () => {
  assert.equal(unmeasuredNoticeLine([
    profile({ name: 'Claude Opus 5.5', org: 'Anthropic', total: 17, selfReported: 17 }),
    profile({ name: 'GPT-6 Sol', org: 'OpenAI', total: 6, selfReported: 6 }),
  ]), 'Claude Opus 5.5 and GPT-6 Sol have no independently measured result in any topic yet — their values are the developers’ own claims (†), listed in the full comparison below.');
  assert.equal(unmeasuredNoticeLine([profile({ name: 'Union Alpha', total: 2, preliminary: 2 })]),
    'Union Alpha has no independently measured result in any topic yet — its values are announced, chart-read figures (‡), listed in the full comparison below.');
  assert.equal(unmeasuredNoticeLine([]), '');
});

test('F-163: a model with nothing listed is never described by another model’s claims', () => {
  const line = unmeasuredNoticeLine([
    profile({ name: 'Union Alpha', total: 2, preliminary: 2 }),
    profile({ name: 'Empty One', total: 0 }),
  ]);
  assert.match(line, /Union Alpha has no independently measured result in any topic yet — its values are announced, chart-read figures \(‡\), listed in the full comparison below\./);
  assert.match(line, /Empty One has no independently measured result in any topic yet, and no value of its own is listed in the full comparison\./);
  assert.equal(line.includes('Empty One and'), false, 'the two models are described separately, not as one group');
});

test('F-163: measured rows that no peer range places are not called claims', () => {
  assert.equal(unmeasuredNoticeLine([profile({ name: 'Thin', total: 3, measured: 3, measuredLowSample: 3 })]),
    'Thin has no independently measured result in any topic yet — the 3 measurements it has cannot be placed against a peer range, so these averages exclude it; it is listed in the full comparison below.');
  assert.equal(noticeKind(profile({ name: 'Thin', total: 1, measured: 1 })), 'unplaced');
  assert.equal(noticeKind(profile({ name: 'Nothing', total: 0 })), 'none');
});

test('the counts come from the rows the table renders, for the real launch-day selection', () => {
  const state = compareState(['claude-opus-5.5::max', 'gpt-6-sol::max', 'union-alpha::default']);
  assert.equal(state.ids.length, 3, 'all three launch-day models resolve in the compare view');
  for (const p of state.profiles) {
    const rows = state.visibleAxes.filter((a) => latestScores(a.scores, 'all').some((r) => r.modelId === p.id));
    assert.equal(p.total, rows.length, `${p.name}: the total is the number of rows the table fills`);
    assert.equal(p.total, p.measured + p.selfReported + p.preliminary, `${p.name}: every row has a basis`);
  }
  // Union Alpha's two values are the chart-read ones CR-127.4 ingested; the sentence must say so.
  const union = state.profiles.find((p) => p.id === 'union-alpha::default');
  assert.ok(union.preliminary > 0 && union.measured === 0, `Union Alpha is preliminary-only, got ${JSON.stringify(union)}`);
  const sentence = compareClaimsSentence(state.profiles);
  assert.match(sentence, new RegExp(`Union Alpha: ${union.preliminary} of ${union.total}`));
  for (const p of state.profiles.filter((x) => x.selfReported > 0)) {
    assert.match(sentence, new RegExp(`${p.name}: ${p.selfReported} of ${p.total}`), `${p.name} states its own claim count`);
  }
});

test('the notice covers exactly the models the cards would have listed with no average', () => {
  const state = compareState(['claude-opus-5.5::max', 'gpt-6-sol::max', 'union-alpha::default']);
  const unmeasured = state.ids.filter((id) => !state.snapshots.some((s) => s.models.find((m) => m.id === id)?.measured));
  const line = unmeasuredNoticeLine(state.profiles.filter((p) => unmeasured.includes(p.id)));
  for (const id of unmeasured) assert.match(line, new RegExp(state.profiles.find((p) => p.id === id).name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  for (const id of state.ids.filter((x) => !unmeasured.includes(x))) {
    const name = state.profiles.find((p) => p.id === id).name;
    assert.equal(line.includes(name), false, `${name} has measured results and stays in the cards`);
  }
});

test('a model page’s sheet line and the Compare clause count the same values', () => {
  // The sheet counts the rows of one model's own view; Compare counts the rows of the same model in
  // a multi-model view. For a single selection the two selections are the same rows.
  for (const id of ['claude-opus-5.5::max', 'union-alpha::default']) {
    const alone = compareState([id]).profiles[0];
    const sheetRows = selectFamilyBenchmarkView(view, [id]).axes.filter((a) => latestScores(a.scores, 'all').some((r) => r.modelId === id));
    assert.equal(alone.total, sheetRows.length, `${id}: same row population as the benchmark sheet`);
  }
});

test('the component renders both surfaces and no longer draws a bar without a value', () => {
  assert.match(COMPARE, /data-bh-compare-claims/, 'F-164: the status line carries the generated sentence');
  assert.match(COMPARE, /compareClaimsSentence\(profiles\)/, 'F-164: the sentence is generated, never pinned');
  assert.match(COMPARE, /data-bh-snapshot-unmeasured/, 'F-163: the one line under the intro');
  assert.match(COMPARE, /data-bh-snapshot-none/, 'F-163: the muted per-card line');
  assert.match(COMPARE, /models: snapshot\.models\.filter\(\(model\) => !unmeasuredIds\.includes\(model\.id\)\)/, 'F-163: the unmeasured models leave the cards');
  // The bar and its label are inside the branch that has an average; nothing renders a 0 % track.
  assert.equal(/width: model\.average == null \? '0%'/.test(COMPARE), false, 'no empty bar is drawn for a missing value');
  assert.match(COMPARE, /counted\(visibleAxes\.length, 'evaluation row'\)/, 'D173: the row count takes its noun from counted()');
});

test('F-164: the live region states the totals and says nothing when everything is measured', async () => {
  const { claimsSummaryClause } = await import('../lib/compare-claims.mjs');
  assert.equal(claimsSummaryClause([
    profile({ name: 'A', total: 46, selfReported: 16, measured: 30 }),
    profile({ name: 'B', total: 19, selfReported: 5, measured: 14 }),
    profile({ name: 'C', total: 2, preliminary: 2 }),
  ]), '; 23 of 67 values are not independent measurements');
  assert.equal(claimsSummaryClause([profile({ name: 'A', total: 9, selfReported: 1, measured: 8 })]),
    '; 1 of 9 values is not an independent measurement');
  assert.equal(claimsSummaryClause([profile({ name: 'A', total: 30, measured: 30 })]), '');
  // The line is a live region: the per-model clauses stay out of it.
  assert.match(COMPARE, /role="status"[\s\S]{0,700}?claimsSummary/, 'the status line carries the summary clause');
  assert.match(COMPARE, /data-bh-compare-claims>\{claimsSentence\}<\/p>/, 'the per-model clauses are a paragraph of their own');
});
