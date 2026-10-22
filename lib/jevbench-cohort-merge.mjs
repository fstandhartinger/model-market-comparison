// Florian, 10 Oct 2026: "We always have only one leaderboard and new items are mixed into it. We don't re-evaluate
// models anymore." The live boards (/jev-models, /jev-models/api) show every system's latest valid measurement in one
// ranking. Systems measured on a fresh draw after v1.6.1 (the fast-lane cohort v1.6.2-v1.6.4, the regular cohort
// v1.6.5-v1.6.9, the second regular cohort v1.6.10-v1.6.13) join it from their own validated publication, tagged with their draw and date, and are put on the v1.6.1
// scale with the per-draw anchor offset of data/jevbench-draw-equating.json (0 while the anchor runs are pending,
// in which case every published number is shown unchanged). Archived release pages never call this.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { readOptionalJevbenchV164Release } from './jevbench-v164-release.mjs';
import { readOptionalJevbenchV165Release } from './jevbench-v165-release.mjs';
import { readOptionalJevbenchV166Release } from './jevbench-v166-release.mjs';
import { readOptionalJevbenchV167Release } from './jevbench-v167-release.mjs';
import { readOptionalJevbenchV168Release } from './jevbench-v168-release.mjs';
import { readOptionalJevbenchV169Release } from './jevbench-v169-release.mjs';
import { readOptionalJevbenchV1610Release } from './jevbench-v1610-release.mjs';
import { readOptionalJevbenchV1611Release } from './jevbench-v1611-release.mjs';
import { readOptionalJevbenchV1612Release } from './jevbench-v1612-release.mjs';
import { readOptionalJevbenchV1613Release } from './jevbench-v1613-release.mjs';
import { readOptionalJevbenchV1614Release } from './jevbench-v1614-release.mjs';
import { readOptionalJevbenchV1615Release } from './jevbench-v1615-release.mjs';
import { readOptionalJevbenchV1616Release } from './jevbench-v1616-release.mjs';
import { readOptionalJevbenchV1617Release } from './jevbench-v1617-release.mjs';
import { readOptionalJevbenchV1618Release } from './jevbench-v1618-release.mjs';
import { readOptionalJevbenchV1620Release } from './jevbench-v1620-release.mjs';
import { readOptionalJevbenchV1621Release } from './jevbench-v1621-release.mjs';
import { readOptionalJevbenchV1622Release } from './jevbench-v1622-release.mjs';
import { readOptionalJevbenchV1623Release } from './jevbench-v1623-release.mjs';
import { readOptionalJevbenchV1624Release } from './jevbench-v1624-release.mjs';
import { readOptionalJevbenchV1625Release } from './jevbench-v1625-release.mjs';
import { readOptionalJevbenchV1626Release } from './jevbench-v1626-release.mjs';
import { readOptionalJevbenchV1627Release } from './jevbench-v1627-release.mjs';
import { readOptionalJevbenchV1628Release } from './jevbench-v1628-release.mjs';
import { readOptionalJevbenchV1629Release } from './jevbench-v1629-release.mjs';
import { readOptionalJevbenchV1630Release } from './jevbench-v1630-release.mjs';
import { readOptionalJevbenchV1631Release } from './jevbench-v1631-release.mjs';
import { readOptionalJevbenchV1632Release } from './jevbench-v1632-release.mjs';
import { readOptionalJevbenchV1633Release } from './jevbench-v1633-release.mjs';
import { readOptionalJevbenchV1634Release } from './jevbench-v1634-release.mjs';
import { readOptionalJevbenchV1635Release } from './jevbench-v1635-release.mjs';
import { readOptionalJevbenchV1636Release } from './jevbench-v1636-release.mjs';
import { readOptionalJevbenchV1637Release } from './jevbench-v1637-release.mjs';
import { readOptionalJevbenchV1638Release } from './jevbench-v1638-release.mjs';
import { readOptionalJevbenchV1639Release } from './jevbench-v1639-release.mjs';
import { readOptionalJevbenchV1640Release } from './jevbench-v1640-release.mjs';

export const DRAW_EQUATING_PATH = 'data/jevbench-draw-equating.json';
export const LISTING_CORRECTIONS_PATH = 'data/jevbench-listing-corrections.json';
export const SCORE_CORRECTIONS_PATH = 'data/jevbench-score-corrections.json';

// Scorer constants (score_v15.py, unchanged since v1.5): low-axis gate and sort-view weights I/C/S/$.
const AXIS_GATE = 50;
const SORT_VIEWS = {
  'Intelligence only': [1, 0, 0, 0],
  'Emphasis on Accuracy 60:20:20': [0.6, 0, 0.2, 0.2],
  'Emphasis on Speed 20:60:20': [0.2, 0, 0.6, 0.2],
  'Emphasis on Cost 20:20:60': [0.2, 0, 0.2, 0.6],
  'Balanced 33:33:33': [1 / 3, 0, 1 / 3, 1 / 3],
};
const AXES = ['intelligence', 'calibration', 'speed', 'cost'];
const clip = (x) => Math.min(100, Math.max(0, x));

/** score_v15.composite: weighted harmonic mean with the soft Intelligence gate and the speed/cost low-axis gates. */
export function jevComposite(axes, weights, gate) {
  const sel = Object.entries(weights).filter(([, w]) => w > 0).map(([a, w]) => [axes[a], w]);
  if (!sel.length || sel.some(([v]) => v == null)) return null;
  let score = sel.some(([v]) => v <= 0) ? 0 : sel.reduce((t, [, w]) => t + w, 0) / sel.reduce((t, [v, w]) => t + w / v, 0);
  const i = axes.intelligence;
  if (i != null && i < gate) score *= (Math.max(0, i) / gate) ** 2;
  for (const a of ['speed', 'cost']) if (axes[a] != null && axes[a] < AXIS_GATE) score *= (Math.max(0, axes[a]) / AXIS_GATE) ** 2;
  return score;
}

/** A row with its draw's anchor offset applied. Offset 0 returns the published numbers untouched. */
export function equateCohortRow(row, offset, options) {
  if (!offset || (!offset.I && !offset.C)) return row;
  const axes = { ...row.axes, intelligence: row.axes.intelligence == null ? null : clip(row.axes.intelligence + offset.I),
    calibration: row.axes.calibration == null ? null : clip(row.axes.calibration + offset.C) };
  const scores = Object.fromEntries(Object.entries(options).map(([o, { weights, intelligence_floor }]) =>
    [o, jevComposite(axes, Object.fromEntries(AXES.map((a) => [a, weights[a] / 100])), intelligence_floor)]));
  const views = Object.fromEntries(Object.entries(SORT_VIEWS).map(([n, w]) => [n, jevComposite(axes, Object.fromEntries(AXES.map((a, k) => [a, w[k]])), 50)]));
  return { ...row, axes, scores, views, jevbench_score: scores.A,
    capability: axes.intelligence == null || axes.calibration == null ? null : (axes.intelligence + axes.calibration) / 2,
    published_scores: { axes: row.axes, scores: row.scores, capability: row.capability } };
}

export async function readDrawEquating(root = process.cwd()) {
  const table = JSON.parse(await readFile(path.join(root, DRAW_EQUATING_PATH), 'utf8'));
  if (table.schema_version !== 1 || !Array.isArray(table.draws)) throw new Error('draw equating table: schema');
  for (const d of table.draws) {
    if (!['anchor-runs-pending', 'equated'].includes(d.status)) throw new Error(`draw equating ${d.draw}: status`);
    if (!Number.isFinite(d.offset?.I) || !Number.isFinite(d.offset?.C)) throw new Error(`draw equating ${d.draw}: offset`);
    if (d.status === 'anchor-runs-pending' && (d.offset.I !== 0 || d.offset.C !== 0)) throw new Error(`draw equating ${d.draw}: pending draws carry no offset`);
    if (d.status === 'equated' && (d.anchors?.length ?? 0) < 5) throw new Error(`draw equating ${d.draw}: at least 5 anchors`);
  }
  return table;
}

/**
 * Listing corrections (12 Oct 2026): label/listing changes layered on a published cohort row (e.g. a wrapper
 * reclassified as a ranked native system). Only presentation fields are accepted; a score, axis, cost or the
 * field median is never touched, and the published release artifacts stay byte-identical.
 */
const CORRECTION_FIELDS = ['ranked', 'listing', 'display', 'author', 'licence', 'repo', 'listing_note'];
export async function readListingCorrections(root = process.cwd()) {
  const file = JSON.parse(await readFile(path.join(root, LISTING_CORRECTIONS_PATH), 'utf8'));
  if (file.schema_version !== 1 || file.kind !== 'jevbench-listing-corrections' || !Array.isArray(file.corrections)) throw new Error('listing corrections: schema');
  const byKey = new Map();
  for (const c of file.corrections) {
    if (typeof c.key !== 'string' || byKey.has(c.key)) throw new Error('listing corrections: key');
    const extra = Object.keys(c).filter((k) => !['key', 'decided_on', ...CORRECTION_FIELDS].includes(k));
    if (extra.length) throw new Error(`listing corrections ${c.key}: unsupported fields ${extra.join(', ')}`);
    byKey.set(c.key, c);
  }
  return byKey;
}

/** The published cohort row with its listing correction (if any) applied. */
export function applyListingCorrection(row, correction) {
  if (!correction) return row;
  const next = { ...row };
  for (const field of CORRECTION_FIELDS) if (field in correction) next[field] = correction[field];
  if (next.ranked) delete next.not_ranked_because;
  return next;
}

/**
 * Score corrections (12 Oct 2026): a reviewed, receipted restatement of ONE input of a published cohort row (today: the
 * cost axis after a price-reference correction) with the composite, interval and views that follow from it. This is a
 * different kind from a listing correction: it does change stored numbers, so it is explicit, dated, backed by a re-score
 * receipt and fails closed. It is applied on the live merged boards only (readCohortRows); the published release
 * artifacts and archived release pages never read it. Every other stored field must equal the published row
 * (Intelligence, Calibration, Speed, Capability, G_med, status) or the published row is shown unchanged.
 */
const SCORE_CORRECTION_FIELDS = ['key', 'release', 'decided_on', 'reason', 'note', 'published', 'unchanged', 'cost', 'axes', 'scores',
  'jevbench_score', 'composite_ci95', 'capability', 'receipt'];
const sha256Hex = (buf) => createHash('sha256').update(buf).digest('hex');
const sameJson = (a, b) => isDeepStrictEqual(a, b);
const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9;

export async function readScoreCorrections(root = process.cwd()) {
  const file = JSON.parse(await readFile(path.join(root, SCORE_CORRECTIONS_PATH), 'utf8'));
  if (file.schema_version !== 1 || file.kind !== 'jevbench-score-corrections' || !Array.isArray(file.corrections)) throw new Error('score corrections: schema');
  const byKey = new Map();
  for (const c of file.corrections) {
    if (typeof c.key !== 'string' || byKey.has(c.key)) throw new Error('score corrections: key');
    const extra = Object.keys(c).filter((k) => !SCORE_CORRECTION_FIELDS.includes(k));
    if (extra.length) throw new Error(`score corrections ${c.key}: unsupported fields ${extra.join(', ')}`);
    for (const k of SCORE_CORRECTION_FIELDS) if (c[k] === undefined) throw new Error(`score corrections ${c.key}: missing ${k}`);
    // The receipt is an aggregates-only re-score output kept next to the correction; a missing or altered file disables the correction.
    let receipt = null; let receiptError = null;
    try {
      const raw = await readFile(path.join(root, c.receipt.path));
      if (sha256Hex(raw) !== c.receipt.sha256) receiptError = 'receipt sha256 mismatch';
      else receipt = JSON.parse(raw.toString('utf8'));
    } catch (error) { receiptError = `receipt unreadable (${error.code ?? error.message})`; }
    byKey.set(c.key, { ...c, receiptContent: receipt, receiptError });
  }
  return byKey;
}

/** The published cohort row with its score correction applied; throws (the caller then keeps the published row) on any mismatch. */
export function applyScoreCorrection(row, correction, context) {
  if (!correction) return row;
  const fail = (why) => { throw new Error(`score correction ${correction.key}: ${why}`); };
  if (correction.key !== row.key) fail('key');
  if (correction.receiptError || !correction.receiptContent) fail(correction.receiptError ?? 'no receipt');
  if (correction.release !== context.release) fail(`release ${context.release} is not ${correction.release}`);
  // 1. the row being corrected is exactly the published row the review looked at
  const pub = correction.published;
  for (const o of ['A', 'B', 'C']) if (row.scores?.[o] !== pub.scores[o]) fail(`published score ${o} differs`);
  if (row.axes?.cost !== pub.axes_cost) fail('published cost axis differs');
  if (row.cost?.usd_per_1000 !== pub.usd_per_1000) fail('published cost differs');
  if (sha256Hex(Buffer.from(row.cost?.basis ?? '', 'utf8')) !== pub.basis_sha256) fail('published cost basis differs');
  if (!sameJson(row.composite_ci95, pub.composite_ci95)) fail('published interval differs');
  // 2. everything the correction does not touch is equal
  const keep = correction.unchanged;
  for (const a of ['intelligence', 'calibration', 'speed']) {
    if (row.axes?.[a] !== keep.axes[a] || correction.axes[a] !== keep.axes[a]) fail(`${a} axis changed`);
  }
  if (row.capability !== keep.capability || correction.capability !== keep.capability) fail('capability changed');
  if (!sameJson(row.status, keep.status)) fail('status changed');
  if (context.gMed !== keep.g_med || context.gMed !== row.v16?.g_med_used) fail('G_med changed');
  // 3. the receipt, the file and the scoring rule agree
  const r = correction.receiptContent;
  for (const o of ['A', 'B', 'C']) {
    if (r[o] !== correction.scores[o]) fail(`receipt score ${o}`);
    if (!sameJson(r.composite_ci95?.[o], correction.composite_ci95[o])) fail(`receipt interval ${o}`);
  }
  if (!sameJson(r.axes, correction.axes) || r.capability !== correction.capability || r.G_med !== keep.g_med) fail('receipt axes');
  if (r.cost?.usd_per_1000 !== correction.cost.usd_per_1000 || !sameJson(r.status, keep.status)) fail('receipt cost');
  if (correction.jevbench_score !== correction.scores.A) fail('headline score');
  if (correction.cost.kind !== 'estimate' || !(correction.cost.usd_per_1000 > 0) || typeof correction.cost.basis !== 'string') fail('cost object');
  const weights = (o) => Object.fromEntries(AXES.map((a) => [a, context.options[o].weights[a] / 100]));
  for (const o of ['A', 'B', 'C']) {
    if (!near(jevComposite(correction.axes, weights(o), context.options[o].intelligence_floor), correction.scores[o])) fail(`score ${o} does not follow from the axes`);
  }
  const views = Object.fromEntries(Object.entries(SORT_VIEWS).map(([n, w]) => [n, jevComposite(correction.axes, Object.fromEntries(AXES.map((a, k) => [a, w[k]])), 50)]));
  const v16 = row.v16 ? { ...row.v16, ci95: { ...row.v16.ci95, composite: correction.composite_ci95 } } : row.v16;
  return { ...row, axes: correction.axes, scores: { ...row.scores, ...correction.scores }, jevbench_score: correction.jevbench_score,
    views, cost: correction.cost, composite_ci95: correction.composite_ci95, v16, listing_note: correction.note,
    score_correction: { decided_on: correction.decided_on, reason: correction.reason, receipt: correction.receipt,
      published: { scores: pub.scores, axes_cost: pub.axes_cost, usd_per_1000: pub.usd_per_1000, composite_ci95: pub.composite_ci95 } } };
}

/**
 * Every system's latest cohort measurement (a later release of the same draw supersedes an earlier one: v1.6.4
 * restates v1.6.2/v1.6.3) and its draw, plus each draw's category artifact (own item set and labels; the live boards show
 * those cells via withCohortCategoryCells). Releases that fail validation are skipped, so the
 * merged board never depends on a broken cohort publication.
 */
export async function readCohortRows(root = process.cwd(), log = console.error) {
  const equating = await readDrawEquating(root);
  const readers = { 'v1.6.4': readOptionalJevbenchV164Release, 'v1.6.5': readOptionalJevbenchV165Release, 'v1.6.6': readOptionalJevbenchV166Release, 'v1.6.7': readOptionalJevbenchV167Release, 'v1.6.8': readOptionalJevbenchV168Release, 'v1.6.9': readOptionalJevbenchV169Release, 'v1.6.10': readOptionalJevbenchV1610Release, 'v1.6.11': readOptionalJevbenchV1611Release, 'v1.6.12': readOptionalJevbenchV1612Release, 'v1.6.13': readOptionalJevbenchV1613Release, 'v1.6.14': readOptionalJevbenchV1614Release, 'v1.6.15': readOptionalJevbenchV1615Release, 'v1.6.16': readOptionalJevbenchV1616Release, 'v1.6.17': readOptionalJevbenchV1617Release, 'v1.6.18': readOptionalJevbenchV1618Release, 'v1.6.20': readOptionalJevbenchV1620Release, 'v1.6.21': readOptionalJevbenchV1621Release, 'v1.6.22': readOptionalJevbenchV1622Release, 'v1.6.23': readOptionalJevbenchV1623Release, 'v1.6.24': readOptionalJevbenchV1624Release, 'v1.6.25': readOptionalJevbenchV1625Release, 'v1.6.26': readOptionalJevbenchV1626Release, 'v1.6.27': readOptionalJevbenchV1627Release, 'v1.6.28': readOptionalJevbenchV1628Release, 'v1.6.29': readOptionalJevbenchV1629Release, 'v1.6.30': readOptionalJevbenchV1630Release, 'v1.6.31': readOptionalJevbenchV1631Release, 'v1.6.32': readOptionalJevbenchV1632Release, 'v1.6.33': readOptionalJevbenchV1633Release, 'v1.6.34': readOptionalJevbenchV1634Release, 'v1.6.35': readOptionalJevbenchV1635Release, 'v1.6.36': readOptionalJevbenchV1636Release, 'v1.6.37': readOptionalJevbenchV1637Release, 'v1.6.38': readOptionalJevbenchV1638Release, 'v1.6.39': readOptionalJevbenchV1639Release, 'v1.6.40': readOptionalJevbenchV1640Release };
  const corrections = await readListingCorrections(root);
  const scoreCorrections = await readScoreCorrections(root);
  const rows = [], categories = [];
  for (const draw of equating.draws) {
    const read = readers[draw.latest_release];
    if (!read) throw new Error(`draw equating ${draw.draw}: no reader for ${draw.latest_release}`);
    let release;
    try { release = await read(root); } catch (error) { log(`JevBench merged board: ${draw.latest_release} skipped (${error.message})`); continue; }
    if (!release) continue;
    const a = release.artifact;
    categories.push({ draw: draw.draw, release: a.revision, categories: release.categories, categoriesSha256: release.categoriesSha256 });
    for (const s of a.systems) {
      let scored = s;
      try { scored = applyScoreCorrection(s, scoreCorrections.get(s.key), { release: a.revision, gMed: a.G_med, options: a.options }); }
      catch (error) { log(`JevBench merged board: ${error.message}; the published row is shown unchanged`); }
      rows.push({ row: applyListingCorrection(scored, corrections.get(s.key)), corrected: corrections.has(s.key), draw: { id: draw.draw, label: draw.label, drawn_on: draw.drawn_on, release: a.revision,
        measured_on: s.last_measured_on ?? draw.drawn_on, status: draw.status, offset: draw.offset, offset_ci95: draw.offset_ci95,
        g_med: a.G_med, results_sha256: release.sha256 } });
    }
  }
  return { equating, rows, categories };
}

/** Keys explicitly superseded by a cohort row for this exact base revision. */
export function jevSupersededBaseKeys(artifact, cohort) {
  const have = new Set(artifact.systems.map(s => s.key));
  return new Set(cohort.rows.filter(({ row }) => have.has(row.key)
    && typeof artifact.revision === 'string' && row.supersedes_base_row === artifact.revision).map(({ row }) => row.key));
}

/**
 * The live artifact with the cohort rows slotted in. Like jevWithApiA4Rows: rows already on the board are never
 * replaced unless a cohort row explicitly supersedes the base artifact revision. Each option's published order gains the new ranked rows at their score position, and Capability ranks of
 * new rows inside the Jev-class caps (ranked by Capability in their own release) slot in by Capability, so scoped boards
 * re-number everything together. Published rows keep their relative order.
 */
export function jevWithCohortRows(artifact, cohort) {
  const have = new Set(artifact.systems.map((s) => s.key));
  // Supersession is opt-in and bound to this base revision; ordinary duplicate keys stay ignored.
  const superseded = jevSupersededBaseKeys(artifact, cohort);
  const systems = superseded.size ? artifact.systems.filter(s => !superseded.has(s.key)) : artifact.systems;
  const removedRanked = artifact.systems.filter(s => superseded.has(s.key) && s.ranked).length;
  const options = Object.keys(artifact.board ?? {});
  const added = cohort.rows.filter(({ row }) => !have.has(row.key) || superseded.has(row.key)).map(({ row, draw, corrected }) => {
    const r = equateCohortRow(row, draw.offset, artifact.options);
    const ranked = !!row.ranked;
    // A row reclassified to ranked by a listing correction has no published ranks; it takes a Capability position by value.
    const capable = ranked && (row.ranks?.capability != null || (corrected && Number.isFinite(row.capability)));
    return { ...r, ranked, rank: null, listing: row.listing ?? (ranked ? 'ranked' : 'wrapper'),
      ranks: { A: null, B: null, C: null, capability: capable ? 0 : null },
      draw };
  });
  if (!added.length) return artifact;
  const rankedAdded = added.filter((s) => s.ranked);
  const score = (s, o) => s.scores?.[o] ?? -Infinity;
  const byKey = new Map([...systems, ...added].map((s) => [s.key, s]));
  const board = Object.fromEntries(options.map((o) => {
    const order = artifact.board[o].order.filter(key => !superseded.has(key));
    for (const s of [...rankedAdded].sort((x, y) => score(y, o) - score(x, o))) {
      const at = order.findIndex((key) => score(byKey.get(key) ?? {}, o) < score(s, o));
      order.splice(at < 0 ? order.length : at, 0, s.key);
    }
    return [o, { ...artifact.board[o], order }];
  }));
  const published = systems.filter((s) => s.ranked && s.ranks?.capability != null).sort((x, y) => x.ranks.capability - y.ranks.capability);
  const capable = rankedAdded.filter((s) => s.ranks.capability != null).sort((x, y) => y.capability - x.capability);
  capable.forEach((s, i) => {
    const above = published.filter((p) => p.capability >= s.capability);
    const base = above.length ? above[above.length - 1].ranks.capability : 0;
    s.ranks.capability = base + (i + 1) / (capable.length + 1);
  });
  return { ...artifact, systems: [...systems, ...added], board, n_ranked: (artifact.n_ranked ?? 0) - removedRanked + rankedAdded.length };
}

/**
 * The live "All" view: every ranked system of the merged board (open weights and APIs) numbered together, Capability
 * first. Ranks follow each option's merged order; fractional Capability ranks of added rows are re-numbered.
 */
export function jevLiveAllArtifact(artifact, isApi) {
  const rankedKeys = new Set(artifact.systems.filter((s) => s.ranked).map((s) => s.key));
  const options = Object.keys(artifact.board ?? {});
  const board = Object.fromEntries(options.map((o) => [o, { ...artifact.board[o], order: artifact.board[o].order.filter((k) => rankedKeys.has(k)) }]));
  const position = Object.fromEntries(options.map((o) => [o, new Map(board[o].order.map((key, i) => [key, i + 1]))]));
  const capabilityOrder = artifact.systems.filter((s) => rankedKeys.has(s.key) && s.ranks?.capability != null)
    .sort((x, y) => x.ranks.capability - y.ranks.capability).map((s) => s.key);
  const systems = artifact.systems.map((s) => {
    const group = isApi(s) ? 'api' : 'open';
    if (!rankedKeys.has(s.key)) return { ...s, group };
    const ranks = { ...(s.ranks ?? {}) };
    for (const o of options) if (o in ranks) ranks[o] = position[o].get(s.key) ?? null;
    if ('capability' in ranks) ranks.capability = ranks.capability == null ? null : capabilityOrder.indexOf(s.key) + 1;
    return { ...s, rank: position[artifact.headline]?.get(s.key) ?? null, ranks, group };
  });
  return { ...artifact, systems, board, n_ranked: rankedKeys.size };
}
