// Florian 10 Oct 2026: one merged JevBench board (cohort rows join with their draw, anchor offsets per draw).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCohortRows, jevWithCohortRows, equateCohortRow, jevComposite, readDrawEquating, jevLiveAllArtifact } from '../lib/jevbench-cohort-merge.mjs';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';
import { isJevApiOffering } from '../lib/jevbench-scope.mjs';

// Cohort rows = the 34 rows of v1.6.4/v1.6.9/v1.6.16 + every row v1.6.17 adds to the regular draw (read from its own artifact).
const V1617_ADDED = JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.17-results.json', 'utf8')).systems.filter((s) => s.measured_in === 'v1.6.17').length;
const V1618_ADDED = JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.18-results.json', 'utf8')).systems.filter(s => s.measured_in === 'v1.6.18').length;
// v1.6.20 is a PRICE-ONLY addendum on the same draw: it adds no measured row, so the cohort count is unchanged.
const V1620_ADDED = JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.20-results.json', 'utf8')).systems.filter(s => s.measured_in === 'v1.6.20').length;
// v1.6.21 adds one measured row to the same draw (d1-ultra, priced and ranked).
const V1621_ADDED = JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.21-results.json', 'utf8')).systems.filter(s => s.measured_in === 'v1.6.21').length;
// v1.6.22 adds four measured rows to the same draw (two ranked, two listed without a rank: unpriced).
const V1622_ADDED = JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.22-results.json', 'utf8')).systems.filter(s => s.measured_in === 'v1.6.22').length;
// v1.6.23 is a PRICE-ONLY addendum on the same draw (Sage 1.4 and the two Nimble rows priced): no measured row joins.
const V1623_ADDED = JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.23-results.json', 'utf8')).systems.filter(s => s.measured_in === 'v1.6.23').length;
// v1.6.24 adds eight measured rows (six re-measured add-request systems, five ranked and one listed unpriced; the two paid
// Sqwish kettei rows, ranked).
const V1624_ADDED = JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.24-results.json', 'utf8')).systems.filter(s => s.measured_in === 'v1.6.24').length;
// v1.6.25 adds four measured rows (jebadiah-9b-v2-1, add request; the paid Celeris-1 Decision; StartLux-Decision v1.1 27B
// Instant and AutoThink, over the cost cap), all ranked.
const V1625_ADDED = JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.25-results.json', 'utf8')).systems.filter(s => s.measured_in === 'v1.6.25').length;
// v1.6.26 adds thirteen re-measured rows (Batch BCD: eight ranked, two of them over the cost cap; five listed unpriced).
const V1626_ADDED = JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.26-results.json', 'utf8')).systems.filter(s => s.measured_in === 'v1.6.26').length;
// v1.6.27 adds two measured rows (jev-1.14.0, hosted API; verdin-4b, self-hosted on CPU), both ranked.
const V1627_ADDED = JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.27-results.json', 'utf8')).systems.filter(s => s.measured_in === 'v1.6.27').length;
// v1.6.28 adds two measured self-hosted rows (basal-omni-1.0-ultra, ranked; purplemist-flash-1.0, listed unpriced).
const V1628_ADDED = JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.28-results.json', 'utf8')).systems.filter(s => s.measured_in === 'v1.6.28').length;
const COHORT_ROWS = 34 + V1617_ADDED + V1618_ADDED + V1620_ADDED + V1621_ADDED + V1622_ADDED + V1623_ADDED + V1624_ADDED + V1625_ADDED + V1626_ADDED + V1627_ADDED + V1628_ADDED;
// Rows the LATEST release of this draw still lists without a rank. v1.6.28 is what the cohort reader now takes;
// subq-snap-preview stopped being one of them in v1.6.20 (its published tariff gives it a cost axis); v1.6.22 adds two;
// sage-1.4.0, nimble-v4 and nimble-v4-max stop being among them in v1.6.23 (their public list prices give them a cost axis);
// v1.6.24 adds bongard-mini (unpriced); v1.6.25 adds none; v1.6.26 adds five unpriced re-measures; v1.6.27 adds none; v1.6.28 adds purplemist-flash-1.0 (unpriced).
const V1617_UNRANKED = JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.28-results.json', 'utf8')).systems.filter(s => ['v1.6.17', 'v1.6.18', 'v1.6.20', 'v1.6.21', 'v1.6.22', 'v1.6.24', 'v1.6.25', 'v1.6.26', 'v1.6.27', 'v1.6.28'].includes(s.measured_in) && !s.ranked).map(s => s.key);

test('every cohort system joins once, from its latest release, with its draw', async () => {
  const { rows } = await readCohortRows();
  const keys = rows.map((r) => r.row.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(rows.length, COHORT_ROWS);
  assert.deepEqual([...new Set(rows.map((r) => r.draw.release))].sort(), ['v1.6.28', 'v1.6.4', 'v1.6.9']);
  assert.ok(rows.every((r) => r.draw.id && r.draw.measured_on));
});

test('the composite port reproduces the published scores', async () => {
  const { artifact } = await readCurrentJevbench();
  for (const s of artifact.systems.filter((x) => x.scores?.A != null).slice(0, 40)) {
    for (const [o, { weights, intelligence_floor }] of Object.entries(artifact.options)) {
      const w = Object.fromEntries(Object.entries(weights).map(([a, v]) => [a, v / 100]));
      assert.ok(Math.abs(jevComposite(s.axes, w, intelligence_floor) - s.scores[o]) < 1e-6, `${s.key} ${o}`);
    }
  }
});

test('pending draws show the published numbers unchanged; an offset moves the axes and recomputes', async () => {
  const table = await readDrawEquating();
  assert.ok(table.draws.every((d) => d.status === 'equated' || (d.offset.I === 0 && d.offset.C === 0)));
  const { artifact } = await readCurrentJevbench();
  const { rows } = await readCohortRows();
  const row = rows.find((r) => r.row.key === 'jeff_1_0_large').row;
  assert.equal(equateCohortRow(row, { I: 0, C: 0 }, artifact.options), row);
  const moved = equateCohortRow(row, { I: 2, C: -1 }, artifact.options);
  assert.ok(Math.abs(moved.axes.intelligence - (row.axes.intelligence + 2)) < 1e-9);
  assert.ok(Math.abs(moved.capability - (row.capability + 0.5)) < 1e-9);
  assert.notEqual(moved.scores.A, row.scores.A);
});

test('merged board slots ranked cohort rows by score and keeps published rows in order', async () => {
  const { artifact } = await readCurrentJevbench();
  const merged = jevWithCohortRows(artifact, await readCohortRows());
  assert.equal(merged.systems.length, artifact.systems.length + COHORT_ROWS);
  for (const o of Object.keys(artifact.board)) {
    const kept = merged.board[o].order.filter((k) => artifact.board[o].order.includes(k));
    assert.deepEqual(kept, artifact.board[o].order);
    const score = new Map(merged.systems.map((s) => [s.key, s.scores?.[o] ?? -Infinity]));
    const order = merged.board[o].order;
    for (let i = 1; i < order.length; i++) if (!artifact.board[o].order.includes(order[i])) assert.ok(score.get(order[i - 1]) >= score.get(order[i]), `${o}: ${order[i]}`);
  }
  const wrappers = merged.systems.filter((s) => s.draw && !s.ranked).map((s) => s.key).sort();
  // reflex-instinct-0.6b joins this list in v1.6.15: it is shown with its axes but carries no rank,
  // because CoS deputy decision #18761 declares its Speed figure non-official and the composite weights Speed.
  assert.deepEqual(wrappers, ['metask_jev_rain_12b', 'microsoft-decision-1-a2-20261012', 'reflex-instinct-0.6b', ...V1617_UNRANKED].sort());
  // v1.6.20: SubQ Snap is no longer among them. Its own release is what changed that, so assert the direction.
  assert.ok(!V1617_UNRANKED.includes('subq-snap-preview'));
  for (const key of ['sage-1.4.0', 'nimble-v4', 'nimble-v4-max']) assert.ok(!V1617_UNRANKED.includes(key), key);
  const reflex = merged.systems.find((s) => s.key === 'reflex-instinct-0.6b');
  assert.equal(reflex.rank, null);
  assert.match(reflex.not_ranked_because, /#18761/);
  for (const o of Object.keys(merged.board)) assert.ok(!merged.board[o].order.includes('reflex-instinct-0.6b'));
  // v1.6.16: vLLM-SR d3 joins the merged board as a ranked row of the regular draw, with its published numbers.
  const d3 = merged.systems.find((s) => s.key === 'vllm-sr-d3');
  assert.equal(d3.ranked, true); assert.equal(d3.draw.release, 'v1.6.28');
  assert.equal(d3.capability, 82.96592796157353); assert.equal(d3.scores.A, 5.569947529283843);
  assert.equal(d3.cost.usd_per_1000, 0.5463374);
  for (const o of ['A', 'B', 'C']) assert.ok(merged.board[o].order.includes('vllm-sr-d3'));
  // v1.6.17: the paid metask service-v3 row and the over-cap hosted Amos row are ranked cohort rows; SubQ Snap is listed without a rank.
  const v3 = merged.systems.find((s) => s.key === 'metask_jev_rain_31b_trained_v3');
  assert.equal(v3.ranked, true); assert.equal(v3.draw.release, 'v1.6.28');
  for (const o of ['A', 'B', 'C']) assert.ok(merged.board[o].order.includes('metask_jev_rain_31b_trained_v3'));
  // v1.6.20 (price-only, Florian's GO on card #17515): SubQ Snap is RANKED from its published USD 0.05/M input
  // tariff, 1.003x the official cap, so it carries a rank and a cost axis and is outside the cost-capped views.
  const subq = merged.systems.find((s) => s.key === 'subq-snap-preview');
  // `rank` is not assigned to cohort rows in this merged structure (vllm-sr-d3 and metask v3 are null too);
  // what changes with v1.6.20 is that the row is ranked, has a cost axis and carries no not-ranked reason.
  assert.equal(subq.ranked, true); assert.equal(subq.not_ranked_because ?? null, null);
  assert.equal(subq.cost.usd_per_1000, 0.06479016666666666);
  assert.equal(subq.draw.release, 'v1.6.28');
  for (const o of ['A', 'B', 'C']) assert.ok(merged.board[o].order.includes('subq-snap-preview'));
  // v1.6.21: d1-ultra joins the regular draw RANKED, priced from Liquid's public list price (USD 0.042/M input,
  // output free) over its own 638,436 input tokens, inside the official cost cap; it sits in all three board orders.
  const d1u = merged.systems.find((s) => s.key === 'liquid-d1-ultra');
  assert.equal(d1u.ranked, true); assert.equal(d1u.not_ranked_because ?? null, null); assert.equal(d1u.draw.release, 'v1.6.28');
  assert.equal(d1u.cost.usd_per_1000, 638436 * 0.042 / 1_000_000 / 1500 * 1000);
  assert.equal(d1u.capability, 80.47704277896817);
  for (const o of ['A', 'B', 'C']) assert.ok(merged.board[o].order.includes('liquid-d1-ultra'));
  // v1.6.22: Messier One v0.4 and Nev-2B join RANKED, priced from their frozen base-model references over their own
  // offline-counted tokens; Nemotron Deciffusion 8B v2 and Trio-Spark v1.3 join LISTED, unpriced, in no board order.
  const ms = merged.systems.find((s) => s.key === 'messier-one-v0.4');
  assert.equal(ms.ranked, true); assert.equal(ms.draw.release, 'v1.6.28');
  assert.equal(ms.cost.usd_per_1000, 1000 * (1105885 * 0.030000000000000002) / 1e6 / 1500);
  assert.equal(ms.capability, 62.443616494634156);
  const nev = merged.systems.find((s) => s.key === 'nev-2b');
  assert.equal(nev.ranked, true); assert.equal(nev.draw.release, 'v1.6.28');
  assert.equal(nev.cost.usd_per_1000, 1000 * (685652 * 0.02) / 1e6 / 1500);
  for (const o of ['A', 'B', 'C']) { assert.ok(merged.board[o].order.includes('messier-one-v0.4')); assert.ok(merged.board[o].order.includes('nev-2b')); }
  for (const key of ['nemotron-deciffusion-8b-v2', 'trio-spark-v1.3']) {
    const s = merged.systems.find((x) => x.key === key);
    assert.equal(s.ranked, false); assert.equal(s.draw.release, 'v1.6.28'); assert.equal(s.cost.usd_per_1000, null);
    assert.ok(s.not_ranked_because.length > 60);
    for (const o of ['A', 'B', 'C']) assert.ok(!merged.board[o].order.includes(key));
  }
  // v1.6.23 (price-only): Sage 1.4 (Levanto list tariff USD 0.05/M in, USD 10/M out; 0 output tokens measured) and Bespoke
  // Nimble-v4 / v4-max (USD 0.04 / 0.09 per M input, output free) are RANKED with a cost axis; nimble-v4-max was over the cap.
  // v1.6.26: Bespoke's public price for nimble-v4-max fell to USD 0.04/M input; re-priced (no new measurement), now inside the cap.
  const priced = { 'sage-1.4.0': 665989 * 0.05, 'nimble-v4': 1935351 * 0.04, 'nimble-v4-max': 1935351 * 0.04 };
  for (const [key, num] of Object.entries(priced)) {
    const s = merged.systems.find((x) => x.key === key);
    assert.equal(s.ranked, true, key); assert.equal(s.draw.release, 'v1.6.28'); assert.equal(s.not_ranked_because ?? null, null);
    assert.equal(s.cost.usd_per_1000, 1000 * num / 1e6 / 1500, key);
    for (const o of ['A', 'B', 'C']) assert.ok(merged.board[o].order.includes(key), `${key} in ${o}`);
  }
  assert.ok(merged.systems.find((x) => x.key === 'nimble-v4-max').cost.usd_per_1000 < 0.06459465517241379);
  assert.equal(merged.systems.find((x) => x.key === 'nimble-v4-max').repriced_in, 'v1.6.26');
  // v1.6.26: Bespoke told us Nimble-v4 is deprecated; a listing note on the live board, its numbers unchanged.
  assert.match(merged.systems.find((x) => x.key === 'nimble-v4').listing_note, /^Bespoke told us in a chat on 16 Oct 2026 that Nimble-v4 is deprecated; its pricing page still lists it \(only nimble-v3 is marked deprecated there\)\./);
  // Sage 1.3.0 (a v1.6.1 headline row) stays ranked: no presentation-layer mechanism unranks a published v1.6.1 row.
  assert.equal(merged.systems.find((x) => x.key === 'sage-1.3.0').ranked, true);
  // v1.6.24: five re-measured add-request rows join RANKED from their frozen base-model references (imajev-9b over the cap,
  // its four-pass token sum disclosed), bongard-mini joins LISTED (unpriced), and the paid Sqwish kettei-fat / kettei-chub
  // join RANKED from Sqwish's public list price over their own 650,605 input tokens.
  const added = { 'decision2-lux-9b': 776349 * 0.09999999999999999, 'imajev-2b': 3010517 * 0.02, 'imajev-9b': 3010517 * 0.09999999999999999,
    'arsenelupin-v1.1': 1011369 * 0.030000000000000002, 'noma': 980756 * 0.030000000000000002, 'kettei-fat': 650605 * 0.06, 'kettei-chub': 650605 * 0.04 };
  for (const [key, num] of Object.entries(added)) {
    const s = merged.systems.find((x) => x.key === key);
    assert.equal(s.ranked, true, key); assert.equal(s.draw.release, 'v1.6.28'); assert.equal(s.not_ranked_because ?? null, null);
    assert.equal(s.cost.usd_per_1000, 1000 * num / 1e6 / 1500, key);
    for (const o of ['A', 'B', 'C']) assert.ok(merged.board[o].order.includes(key), `${key} in ${o}`);
  }
  assert.ok(merged.systems.find((x) => x.key === 'imajev-9b').cost.usd_per_1000 > 0.06459465517241379);
  const bongard = merged.systems.find((x) => x.key === 'bongard-mini');
  assert.equal(bongard.ranked, false); assert.equal(bongard.cost.usd_per_1000, null); assert.match(bongard.not_ranked_because, /t5gemma/);
  for (const o of ['A', 'B', 'C']) assert.ok(!merged.board[o].order.includes('bongard-mini'));
  // v1.6.25: Jebadiah 9B v2.1 (add request, self-hosted, priced from its base model Qwen/Qwen3.5-9B over 750,303 input and
  // 1,485 output tokens), the paid Celeris-1 Decision (Celeris's public list price over its own 1,968,382 input tokens) and the two
  // StartLux-Decision v1.1 27B rows (base Qwen/Qwen3.8-27B at 0.42/3.0 per M, over the cost cap) join RANKED.
  const added25 = { 'jebadiah-9b-v2-1': 750303 * 0.09999999999999999 + 1485 * 0.15, 'celeris-1-decision': 1968382 * 0.04,
    'startlux-decision-v1.1-27b-instant': 737990 * 0.42, 'startlux-decision-v1.1-27b-autothink': 737990 * 0.42 + 72063 * 3.0 };
  for (const [key, num] of Object.entries(added25)) {
    const s = merged.systems.find((x) => x.key === key);
    assert.equal(s.ranked, true, key); assert.equal(s.draw.release, 'v1.6.28'); assert.equal(s.not_ranked_because ?? null, null);
    assert.equal(s.cost.usd_per_1000, 1000 * num / 1e6 / 1500, key);
    for (const o of ['A', 'B', 'C']) assert.ok(merged.board[o].order.includes(key), `${key} in ${o}`);
  }
  // v1.6.26: thirteen re-measured rows (Batch BCD) join from their frozen base-model references; jeb-35b-a3b and nagi-enormous
  // over the cost cap; five are LISTED, unpriced (no listing decision for their bases), in no board order.
  const added26 = { 'blink-4b': 1994295 * 0.030000000000000002, 'compass-0.2.0': 2466776 * 0.030000000000000002, 'jpt-4b': 764418 * 0.030000000000000002 + 1485 * 0.15,
    'ryotide-qwen': 2083222 * 0.030000000000000002, 'jebadiah-9b-v2': 750303 * 0.09999999999999999 + 1485 * 0.15, 'shisa-de-1': 779620 * 0.09,
    'jeb-35b-a3b': 781043 * 0.15 + 1485 * 1.0, 'nagi-enormous': 762436 * 0.42 };
  for (const [key, num] of Object.entries(added26)) {
    const s = merged.systems.find((x) => x.key === key);
    assert.equal(s.ranked, true, key); assert.equal(s.draw.release, 'v1.6.28'); assert.equal(s.not_ranked_because ?? null, null);
    assert.ok(Math.abs(s.cost.usd_per_1000 - 1000 * num / 1e6 / 1500) < 1e-15, key);
    for (const o of ['A', 'B', 'C']) assert.ok(merged.board[o].order.includes(key), `${key} in ${o}`);
  }
  for (const key of ['jevora-9b-v1', 'kev-9b-v2', 'nagi-huge', 'ryotide-gemma', 'tde-general-large']) {
    const s = merged.systems.find((x) => x.key === key);
    assert.equal(s.ranked, false, key); assert.equal(s.cost.usd_per_1000, null); assert.ok(s.not_ranked_because.length > 60);
    for (const o of ['A', 'B', 'C']) assert.ok(!merged.board[o].order.includes(key));
  }
  // v1.6.27: Jev 1.14.0 (TypeSafe AI, hosted API) joins RANKED from TypeSafe's public list price (USD 0.042/M input, output free,
  // the same tariff as jev-1.13.0) over its own 1,134,053 input tokens; Verdin-4B (self-hosted on CPU) from its frozen
  // base-model reference Qwen/Qwen3.5-4B (0 output tokens). Both inside the cost cap; the Jev-class reference stays jev-1.13.0.
  const added27 = { 'jev-1.14.0': 1134053 * 0.042, 'verdin-4b': 902188 * 0.030000000000000002 };
  for (const [key, num] of Object.entries(added27)) {
    const s = merged.systems.find((x) => x.key === key);
    assert.equal(s.ranked, true, key); assert.equal(s.draw.release, 'v1.6.28'); assert.equal(s.not_ranked_because ?? null, null);
    assert.ok(Math.abs(s.cost.usd_per_1000 - 1000 * num / 1e6 / 1500) < 1e-15, key);
    assert.ok(s.cost.usd_per_1000 < 0.06459465517241379, key);
    for (const o of ['A', 'B', 'C']) assert.ok(merged.board[o].order.includes(key), `${key} in ${o}`);
  }
  assert.ok(merged.systems.some((x) => x.key === 'jev-1.13.0'), 'the Jev reference row stays on the board');
  // v1.6.28: basal-omni-1.0-ultra (Remek Kinas, self-hosted on an H200) joins RANKED from its frozen base-model reference
  // google/gemma-4-31b-it (USD 0.09/M input) over its own 744,183 input tokens, inside the cost cap (0 output tokens);
  // purplemist-flash-1.0 (Olaverse) joins LISTED, unpriced, in no board order (no listing decision for Qwen/Qwen3.5-9B-Base).
  const bas = merged.systems.find((x) => x.key === 'basal-omni-1.0-ultra');
  assert.equal(bas.ranked, true); assert.equal(bas.draw.release, 'v1.6.28'); assert.equal(bas.not_ranked_because ?? null, null);
  assert.ok(Math.abs(bas.cost.usd_per_1000 - 1000 * (744183 * 0.09) / 1e6 / 1500) < 1e-15);
  assert.ok(bas.cost.usd_per_1000 < 0.06459465517241379);
  assert.equal(bas.capability, 82.53799311737751);
  for (const o of ['A', 'B', 'C']) assert.ok(merged.board[o].order.includes('basal-omni-1.0-ultra'));
  const pmf = merged.systems.find((x) => x.key === 'purplemist-flash-1.0');
  assert.equal(pmf.ranked, false); assert.equal(pmf.draw.release, 'v1.6.28'); assert.equal(pmf.cost.usd_per_1000, null);
  assert.ok(pmf.not_ranked_because.length > 60 && pmf.not_ranked_because.includes('Qwen/Qwen3.5-9B-Base'));
  for (const o of ['A', 'B', 'C']) assert.ok(!merged.board[o].order.includes('purplemist-flash-1.0'));
  assert.ok(merged.systems.some((x) => x.key === 'jev-1.14.0' && x.ranked), 'Jev 1.14.0 stays ranked');
  // 12 Oct 2026 listing correction: RYOTIDE-Qwen9 is a ranked native system; its stored v1.6.4 numbers are untouched.
  const ryotide = merged.systems.find((s) => s.key === 'ryotide_qwen9');
  const stored = (await readCohortRows()).rows.find((r) => r.row.key === 'ryotide_qwen9');
  assert.equal(ryotide.ranked, true); assert.equal(ryotide.listing, 'ranked');
  assert.equal(ryotide.display, 'RYOTIDE-Qwen9'); assert.equal(ryotide.licence, 'MIT engine on Apache-2.0 weights');
  assert.equal(ryotide.jevbench_score, 16.1347687863636); assert.equal(ryotide.capability, 53.473263564131784);
  assert.equal(ryotide.not_ranked_because, undefined);
  assert.equal(stored.corrected, true);
  assert.ok(merged.board.A.order.includes('ryotide_qwen9'));
  const all = jevLiveAllArtifact(merged, isJevApiOffering);
  const caps = all.systems.filter((s) => s.ranked && s.ranks.capability != null).map((s) => s.ranks.capability).sort((a, b) => a - b);
  assert.deepEqual(caps, caps.map((_, i) => i + 1));
});

test('live pages: filter presets, no version tabs, release history; archived pages keep their URLs', () => {
  const route = readFileSync(new URL('../components/JevBenchV16ReleaseRoute.tsx', import.meta.url), 'utf8');
  const live = route.slice(route.indexOf('if (live) return'), route.indexOf('\n  return <>'));
  assert.match(live, /<JevReleaseHistory \/>/); assert.doesNotMatch(live, /JevBenchReleaseVersionNav/);
  const notice = readFileSync(new URL('../components/JevApiOfferingsToggle.tsx', import.meta.url), 'utf8');
  assert.match(notice, /Show all mixed/); assert.match(notice, /'\/jev-models\/all'/); assert.match(notice, /API-hosted/);
  assert.match(readFileSync(new URL('../app/jev-models/all/page.tsx', import.meta.url), 'utf8'), /scope="all"/);
});

test('listing corrections: only presentation fields, the published release row is never mutated', async () => {
  const { applyListingCorrection } = await import('../lib/jevbench-cohort-merge.mjs');
  const row = { key: 'x', ranked: false, listing: 'wrapper', not_ranked_because: 'r', jevbench_score: 1, axes: { intelligence: 2 } };
  const out = applyListingCorrection(row, { key: 'x', ranked: true, listing: 'ranked', display: 'X' });
  assert.equal(out.ranked, true); assert.equal(out.not_ranked_because, undefined);
  assert.equal(out.jevbench_score, 1); assert.deepEqual(out.axes, row.axes);
  assert.equal(row.ranked, false); assert.equal(row.not_ranked_because, 'r');
  assert.equal(applyListingCorrection(row, undefined), row);
});

test('score correction: decisor-4b cost re-estimate applies on the live merged board only, every other stored field unchanged', async () => {
  const { readOptionalJevbenchV164Release } = await import('../lib/jevbench-v164-release.mjs');
  const published = (await readOptionalJevbenchV164Release()).artifact.systems.find((s) => s.key === 'decisor_4b');
  assert.equal(published.scores.A, 33.51963655001747); assert.equal(published.axes.cost, 51.35109809189328);
  assert.equal(published.cost.usd_per_1000, 0.04184369844489519);
  const live = (await readCohortRows()).rows.find((r) => r.row.key === 'decisor_4b').row;
  assert.equal(live.scores.A, 35.341565591640844); assert.equal(live.scores.B, 32.590313637312704); assert.equal(live.scores.C, 24.542753883083925);
  assert.equal(live.jevbench_score, live.scores.A);
  assert.equal(live.axes.cost, 64.04636047691767); assert.equal(live.cost.usd_per_1000, 0.015792636916835696);
  assert.equal(live.cost.kind, 'estimate'); assert.match(live.cost.basis, /^ESTIMATE \(base-model reference; self-hosted open weights/);
  assert.match(live.cost.basis, /Qwen\/Qwen3\.5-4B/); assert.match(live.listing_note, /composite A 33\.52 → 35\.34/);
  for (const a of ['intelligence', 'calibration', 'speed']) assert.equal(live.axes[a], published.axes[a]);
  assert.equal(live.capability, published.capability); assert.deepEqual(live.status, published.status);
  assert.deepEqual(live.calibration, published.calibration); assert.deepEqual(live.speed, published.speed);
  assert.deepEqual(live.composite_ci95.A, [24.74558117984167, 45.875966423832466]);
  assert.deepEqual(live.v16.ci95.composite, live.composite_ci95);
  assert.equal(live.score_correction.published.scores.A, 33.51963655001747);
  // views and composites follow the corrected axes through the scoring rule
  const { artifact } = await readCurrentJevbench();
  for (const [o, { weights, intelligence_floor }] of Object.entries(artifact.options)) {
    const w = Object.fromEntries(Object.entries(weights).map(([a, v]) => [a, v / 100]));
    assert.ok(Math.abs(jevComposite(live.axes, w, intelligence_floor) - live.scores[o]) < 1e-9, o);
  }
  // the same rule reproduces the published views from the published axes (so the recomputed views are trustworthy)
  assert.ok(Math.abs(jevComposite(published.axes, { intelligence: 0.6, calibration: 0, speed: 0.2, cost: 0.2 }, 50) - published.views['Emphasis on Accuracy 60:20:20']) < 1e-9);
  assert.ok(live.views['Emphasis on Cost 20:20:60'] > published.views['Emphasis on Cost 20:20:60']);
  // ranks on the merged boards: decisor keeps its Capability slot (capability unchanged) and Composite A moves up
  const merged = jevWithCohortRows(artifact, await readCohortRows());
  const all = jevLiveAllArtifact(merged, isJevApiOffering);
  const row = all.systems.find((s) => s.key === 'decisor_4b');
  assert.equal(row.scores.A, 35.341565591640844);
  assert.ok(row.ranks.A > 5 && row.ranks.capability > 5);
});

test('score correction: refuses to apply on any mismatch and shows the published row', async () => {
  const { readScoreCorrections, applyScoreCorrection } = await import('../lib/jevbench-cohort-merge.mjs');
  const { readOptionalJevbenchV164Release } = await import('../lib/jevbench-v164-release.mjs');
  const release = (await readOptionalJevbenchV164Release()).artifact;
  const row = release.systems.find((s) => s.key === 'decisor_4b');
  const correction = (await readScoreCorrections()).get('decisor_4b');
  const ctx = { release: 'v1.6.4', gMed: release.G_med, options: release.options };
  const ok = applyScoreCorrection(row, correction, ctx);
  assert.equal(ok.scores.A, correction.scores.A); assert.notEqual(ok, row);
  assert.equal(row.scores.A, 33.51963655001747, 'the published row object is never mutated');
  assert.equal(applyScoreCorrection(row, undefined, ctx), row);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const refused = (r, c = correction, x = ctx) => assert.throws(() => applyScoreCorrection(r, c, x), /score correction decisor_4b/);
  { const r = clone(row); r.axes.intelligence += 0.01; refused(r); }
  { const r = clone(row); r.axes.calibration += 0.01; refused(r); }
  { const r = clone(row); r.axes.speed += 0.01; refused(r); }
  { const r = clone(row); r.capability += 0.01; refused(r); }
  { const r = clone(row); r.status.missing = 1; refused(r); }
  { const r = clone(row); r.scores.A += 0.01; refused(r); }
  { const r = clone(row); r.cost.usd_per_1000 = 0.05; refused(r); }
  { const r = clone(row); r.cost.basis += ' '; refused(r); }
  { const r = clone(row); r.composite_ci95.A[0] += 0.1; refused(r); }
  refused(row, correction, { ...ctx, gMed: ctx.gMed + 0.1 });
  refused(row, correction, { ...ctx, release: 'v1.6.5' });
  refused({ ...clone(row), key: 'other' });
  { const c = clone(correction); c.axes.intelligence += 0.01; refused(row, c); }
  { const c = clone(correction); c.scores.A += 0.01; c.jevbench_score = c.scores.A; refused(row, c); }
  { const c = clone(correction); c.composite_ci95.A[1] += 0.1; refused(row, c); }
  { const c = clone(correction); c.cost.usd_per_1000 *= 2; refused(row, c); }
  refused(row, { ...clone(correction), receiptError: 'receipt sha256 mismatch' });
  refused(row, { ...clone(correction), receiptContent: null });
});

test('score correction: reader rejects unknown fields and an altered receipt disables the correction', async () => {
  const { readScoreCorrections, applyScoreCorrection } = await import('../lib/jevbench-cohort-merge.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const file = JSON.parse(readFileSync(new URL('../data/jevbench-score-corrections.json', import.meta.url), 'utf8'));
  const receiptRel = file.corrections[0].receipt.path;
  const stage = (mutate, receiptMutate) => {
    const root = mkdtempSync(path.join(tmpdir(), 'score-corr-'));
    mkdirSync(path.dirname(path.join(root, receiptRel)), { recursive: true });
    const receipt = readFileSync(new URL(`../${receiptRel}`, import.meta.url), 'utf8');
    writeFileSync(path.join(root, receiptRel), receiptMutate ? receiptMutate(receipt) : receipt);
    const copy = JSON.parse(JSON.stringify(file)); mutate?.(copy);
    writeFileSync(path.join(root, 'data/jevbench-score-corrections.json'), JSON.stringify(copy));
    return root;
  };
  const good = await readScoreCorrections(stage());
  assert.equal(good.get('decisor_4b').receiptError, null);
  const tampered = await readScoreCorrections(stage(null, (r) => r.replace('"A": 35.34', '"A": 36.34')));
  assert.match(tampered.get('decisor_4b').receiptError, /sha256 mismatch/);
  const missing = await readScoreCorrections(stage((f) => { f.corrections[0].receipt.path = 'data/nope.json'; }));
  assert.match(missing.get('decisor_4b').receiptError, /unreadable/);
  await assert.rejects(readScoreCorrections(stage((f) => { f.corrections[0].ranked = true; })), /unsupported fields ranked/);
  await assert.rejects(readScoreCorrections(stage((f) => { delete f.corrections[0].receipt; })), /missing receipt/);
  await assert.rejects(readScoreCorrections(stage((f) => { f.corrections.push(f.corrections[0]); })), /key/);
  await assert.rejects(readScoreCorrections(stage((f) => { f.kind = 'x'; })), /schema/);
  const { readOptionalJevbenchV164Release } = await import('../lib/jevbench-v164-release.mjs');
  const release = (await readOptionalJevbenchV164Release()).artifact;
  const row = release.systems.find((s) => s.key === 'decisor_4b');
  assert.throws(() => applyScoreCorrection(row, tampered.get('decisor_4b'), { release: 'v1.6.4', gMed: release.G_med, options: release.options }), /receipt sha256 mismatch/);
});

test('score correction: archived release pages and published files never read it', async () => {
  const { readdirSync, statSync } = await import('node:fs');
  const path = await import('node:path');
  const root = new URL('..', import.meta.url).pathname;
  const readers = [];
  const walk = (dir) => {
    for (const name of readdirSync(path.join(root, dir))) {
      const rel = path.join(dir, name);
      if (statSync(path.join(root, rel)).isDirectory()) { if (!['node_modules', '.next'].includes(name)) walk(rel); continue; }
      if (/\.(mjs|ts|tsx|js)$/.test(name) && /score-corrections|readScoreCorrections|applyScoreCorrection/.test(readFileSync(path.join(root, rel), 'utf8'))) readers.push(rel);
    }
  };
  for (const dir of ['lib', 'components', 'app']) walk(dir);
  assert.deepEqual(readers, ['lib/jevbench-cohort-merge.mjs']);
  const archived = readFileSync(path.join(root, 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.4-results.json'), 'utf8');
  assert.match(archived, /"jevbench_score": 33\.51963655001747/);
  assert.doesNotMatch(archived, /score_correction|Cost re-estimated/);
  // the route reads the corrected cohort only for the live boards
  const board = readFileSync(path.join(root, 'lib/jevbench-live-board.mjs'), 'utf8');
  assert.ok(board.indexOf("if (!live || release_.revision !== 'v1.6.1') return") < board.indexOf('await readCohortRows(root)'));
});
