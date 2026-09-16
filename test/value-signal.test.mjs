import test from 'node:test';
import assert from 'node:assert/strict';
import { valueSignals, VALUE_MIN_ROWS, VALUE_WEAK_RATIO } from '../lib/value-signal.mjs';

const strongOnly = (m) => new Map([...m].filter(([, v]) => v.level === 'strong'));

// Cost doubles every 10 score points, with a small deterministic wobble.
const line = (n = 12) => Array.from({ length: n }, (_, i) => ({ id: `m${i}`, score: 40 + i * 5, cost: 0.1 * 2 ** ((i * 5) / 10) * (1 + (i % 3 - 1) * 0.08) }));

test('CR-15.1: a model far below the cost its score predicts is cheap; far above is pricey; the rest stay unmarked', () => {
  const rows = line();
  rows[6] = { ...rows[6], cost: rows[6].cost / 5 };
  rows[9] = { ...rows[9], cost: rows[9].cost * 4 };
  const s = strongOnly(valueSignals(rows));
  assert.equal(s.get('m6')?.kind, 'cheap');
  assert.ok(s.get('m6').ratio > 3);
  assert.equal(s.get('m9')?.kind, 'pricey');
  assert.deepEqual([...s.keys()].sort(), ['m6', 'm9']);
});

test('CR-15.1: no marks on an orderly table, with too few rows, or without score spread; missing costs are ignored', () => {
  assert.equal(valueSignals(line()).size, 0);
  const few = line(VALUE_MIN_ROWS - 1); few[3] = { ...few[3], cost: few[3].cost / 10 };
  assert.equal(valueSignals(few).size, 0);
  assert.equal(valueSignals(line().map((r) => ({ ...r, score: 50 }))).size, 0);
  const holes = line(); holes.push({ id: 'free', score: 90, cost: 0 }, { id: 'none', score: 80, cost: null }, { id: 'unscored', score: null, cost: 1 });
  assert.equal(valueSignals(holes).size, 0);
});

// Deterministic log-uniform noise in [1/spread, spread] (small LCG), like real price scatter.
const noisy = (n, spread, seed = 7) => { let x = seed; return line(n).map((r) => { x = (x * 48271) % 2147483647; return { ...r, cost: r.cost * spread ** (2 * (x / 2147483647) - 1) }; }); };

test('CR-15.1: one extreme model does not tilt the robust line and flag its ordinary neighbours', () => {
  const rows = noisy(20, 1.5);
  assert.equal(valueSignals(rows).size, 0, 'no flag at either level on ordinary scatter');
  rows[5] = { ...rows[5], cost: rows[5].cost / 12 };
  assert.deepEqual([...strongOnly(valueSignals(rows)).keys()], ['m5']);
});

test('CR-15.1: in a widely scattered table the robust spread keeps flags rare', () => {
  const rows = noisy(40, 3.5);
  const naive = rows.filter((r, i) => Math.abs(Math.log(r.cost / line(40)[i].cost)) >= Math.log(2)).length;
  const flagged = strongOnly(valueSignals(rows)).size;
  assert.ok(naive >= 10, `fixture really is wide (${naive} rows off by ≥2×)`);
  assert.ok(flagged <= naive / 3, `robust threshold flags ${flagged}, a plain ×2 rule would flag ${naive}`);
});

test('CR-42.1: two levels — strong keeps the old rule, weak marks a smaller but still clear gap; the ordinary wobble stays unmarked', () => {
  const rows = line();
  rows[6] = { ...rows[6], cost: rows[6].cost / 5 };   // far off: strong
  rows[4] = { ...rows[4], cost: rows[4].cost * 1.9 }; // clearly, not far: weak (m4 carries no wobble)
  const s = valueSignals(rows);
  assert.equal(s.get('m6')?.level, 'strong');
  assert.equal(s.get('m4')?.kind, 'pricey');
  assert.equal(s.get('m4')?.level, 'weak');
  assert.ok(s.get('m4').ratio >= VALUE_WEAK_RATIO && s.get('m4').ratio < 2);
  for (const [id, v] of s) if (id !== 'm6' && id !== 'm4') assert.fail(`${id} flagged ${v.level} on a ±8 % wobble`);
  // a weak flag always needs the ratio: 1.6× off never marks, however tidy the rest of the table is
  const tidy = line(); tidy[4] = { ...tidy[4], cost: tidy[4].cost * 1.6 };
  assert.equal(valueSignals(tidy).size, 0);
  // and ordinary scatter of up to 1.5× either way stays unmarked at both levels
  assert.equal(valueSignals(noisy(20, 1.5)).size, 0);
});

// CR-46.1 regression (2026-09-16): the Overview's default table as served on 16 Sep 2026 (score, adjusted $/task).
// Judging only the rows left on screen made every tag disappear once the score slider narrowed the table.
const LIVE_20260916 = [['claude-fable-5.1', 99.2, 14.17], ['gpt-6-astra', 97.7, 3.7], ['claude-opus-5', 94.7, 5.74], ['claude-fable-5', 92.9, 24.06], ['kimi-k3', 91, 2.09], ['gpt-5.6-sol', 90.1, 2.32], ['glm-5.3', 89.8, 0.776], ['grok-4.6', 87.9, 1.04], ['claude-opus-4.8', 83.6, 8.11], ['claude-sonnet-5', 81.2, 3.47], ['gemini-3.8-flash', 80.8, 1.1], ['gpt-5.6-terra', 79.7, 1.07], ['glm-5.3-flash', 79.6, 0.0943], ['qwen3.8-2.4t', 79.5, 1.47], ['qwen3.8-flash-next', 79.5, 0.274], ['deepseek-v4.1-flash', 79.4, 0.313], ['gemini-3.7-flash', 78.1, 0.559], ['gpt-5.5', 73.6, 1.63], ['gpt-5.6-luna', 73.5, 0.198], ['deepseek-v4-pro-0813', 71.8, 0.528], ['deepseek-v4-flash-0731', 69.6, 0.0265], ['gemini-3.6-flash', 69.6, 0.398], ['gemini-3.5-flash', 69.6, 1.13], ['qwen3.8-27b', 69.5, 0.227]]
  .map(([id, score, cost]) => ({ id, score, cost }));

test('CR-46.1: over the reference population, qualifying pricey and cheap rows carry tags at both levels', () => {
  const s = valueSignals(LIVE_20260916);
  const at = (id) => s.get(id) && `${s.get(id).kind}/${s.get(id).level}`;
  assert.equal(at('claude-fable-5'), 'pricey/strong');
  assert.equal(at('claude-opus-4.8'), 'pricey/strong');
  assert.equal(at('glm-5.3-flash'), 'cheap/strong');
  assert.equal(at('deepseek-v4-flash-0731'), 'cheap/strong');
  assert.equal(at('glm-5.3'), 'cheap/weak');
  assert.equal(at('claude-sonnet-5'), 'pricey/weak');
  // Claude Fable 5.1 is 1.6× above the fitted cost for its top score — below the documented weak threshold today.
  assert.equal(s.get('claude-fable-5.1'), undefined);
  assert.ok(s.size <= LIVE_20260916.length / 2, 'tags stay a minority of rows');
});

test('CR-46.1: narrowing what is shown (score ≥ 80) no longer removes the tags — the fit uses the reference, not the shown rows', () => {
  const shown = LIVE_20260916.filter((r) => r.score >= 80);
  assert.equal(shown.length, 11);
  assert.equal(strongOnly(valueSignals(shown)).size, 0, 'the old behaviour (one level): judged among the 11 shown rows, nothing is flagged');
  const reference = valueSignals(LIVE_20260916);
  const tagged = shown.filter((r) => reference.has(r.id)).map((r) => r.id);
  assert.deepEqual(tagged, ['claude-fable-5', 'glm-5.3', 'claude-opus-4.8', 'claude-sonnet-5']);
});
