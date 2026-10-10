// Florian, 10 Oct 2026: "We always have only one leaderboard and new items are mixed into it. We don't re-evaluate
// models anymore." The live boards (/jev-models, /jev-models/api) show every system's latest valid measurement in one
// ranking. Systems measured on a fresh draw after v1.6.1 (the fast-lane cohort v1.6.2-v1.6.4, the regular cohort
// v1.6.5-v1.6.7) join it from their own validated publication, tagged with their draw and date, and are put on the v1.6.1
// scale with the per-draw anchor offset of data/jevbench-draw-equating.json (0 while the anchor runs are pending,
// in which case every published number is shown unchanged). Archived release pages never call this.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { readOptionalJevbenchV164Release } from './jevbench-v164-release.mjs';
import { readOptionalJevbenchV165Release } from './jevbench-v165-release.mjs';
import { readOptionalJevbenchV166Release } from './jevbench-v166-release.mjs';
import { readOptionalJevbenchV167Release } from './jevbench-v167-release.mjs';

export const DRAW_EQUATING_PATH = 'data/jevbench-draw-equating.json';

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
 * Every system's latest cohort measurement (a later release of the same draw supersedes an earlier one: v1.6.4
 * restates v1.6.2/v1.6.3) and its draw. Category cells stay on the release page (own item set and use-case labels). Releases that fail validation are skipped, so the
 * merged board never depends on a broken cohort publication.
 */
export async function readCohortRows(root = process.cwd(), log = console.error) {
  const equating = await readDrawEquating(root);
  const readers = { 'v1.6.4': readOptionalJevbenchV164Release, 'v1.6.5': readOptionalJevbenchV165Release, 'v1.6.6': readOptionalJevbenchV166Release, 'v1.6.7': readOptionalJevbenchV167Release };
  const rows = [];
  for (const draw of equating.draws) {
    const read = readers[draw.latest_release];
    if (!read) throw new Error(`draw equating ${draw.draw}: no reader for ${draw.latest_release}`);
    let release;
    try { release = await read(root); } catch (error) { log(`JevBench merged board: ${draw.latest_release} skipped (${error.message})`); continue; }
    if (!release) continue;
    const a = release.artifact;
    for (const s of a.systems) {
      rows.push({ row: s, draw: { id: draw.draw, label: draw.label, drawn_on: draw.drawn_on, release: a.revision,
        measured_on: s.last_measured_on ?? draw.drawn_on, status: draw.status, offset: draw.offset, offset_ci95: draw.offset_ci95,
        g_med: a.G_med, results_sha256: release.sha256 } });
    }
  }
  return { equating, rows };
}

/**
 * The live artifact with the cohort rows slotted in. Like jevWithApiA4Rows: rows already on the board are never
 * replaced, each option's published order gains the new ranked rows at their score position, and Capability ranks of
 * new rows inside the Jev-class caps (ranked by Capability in their own release) slot in by Capability, so scoped boards
 * re-number everything together. Published rows keep their relative order.
 */
export function jevWithCohortRows(artifact, cohort) {
  const have = new Set(artifact.systems.map((s) => s.key));
  const options = Object.keys(artifact.board ?? {});
  const added = cohort.rows.filter(({ row }) => !have.has(row.key)).map(({ row, draw }) => {
    const r = equateCohortRow(row, draw.offset, artifact.options);
    const ranked = !!row.ranked;
    return { ...r, ranked, rank: null, listing: row.listing ?? (ranked ? 'ranked' : 'wrapper'),
      ranks: { A: null, B: null, C: null, capability: row.ranks?.capability != null && ranked ? 0 : null },
      draw };
  });
  if (!added.length) return artifact;
  const rankedAdded = added.filter((s) => s.ranked);
  const score = (s, o) => s.scores?.[o] ?? -Infinity;
  const byKey = new Map([...artifact.systems, ...added].map((s) => [s.key, s]));
  const board = Object.fromEntries(options.map((o) => {
    const order = [...artifact.board[o].order];
    for (const s of [...rankedAdded].sort((x, y) => score(y, o) - score(x, o))) {
      const at = order.findIndex((key) => score(byKey.get(key) ?? {}, o) < score(s, o));
      order.splice(at < 0 ? order.length : at, 0, s.key);
    }
    return [o, { ...artifact.board[o], order }];
  }));
  const published = artifact.systems.filter((s) => s.ranked && s.ranks?.capability != null).sort((x, y) => x.ranks.capability - y.ranks.capability);
  const capable = rankedAdded.filter((s) => s.ranks.capability != null).sort((x, y) => y.capability - x.capability);
  capable.forEach((s, i) => {
    const above = published.filter((p) => p.capability >= s.capability);
    const base = above.length ? above[above.length - 1].ranks.capability : 0;
    s.ranks.capability = base + (i + 1) / (capable.length + 1);
  });
  return { ...artifact, systems: [...artifact.systems, ...added], board, n_ranked: (artifact.n_ranked ?? 0) + rankedAdded.length };
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
