import { jevbenchCategoryView } from './jevbench-categories.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { readJevbenchV161Release } from './jevbench-v16-release.mjs';
import { readJevbenchV157Release } from './jevbench-v15-release.mjs';
import { jevScopeClassifier, jevbenchScopeArtifact } from './jevbench-scope.mjs';
import { jevClassRows, JEV_V16_CLASS_OPTIONS } from './jevbench-jev-class.mjs';
import { readApiFullAddenda, withRowPoolCategoryRows } from './jevbench-api-full-addenda.mjs';
import { assembleJevBoard } from './jevbench-live-board.mjs';

// Review 6 Oct 2026: the 18 rows of data/jevbench-api-a4-equated.json (v1.7.7) only exist on the API board, so their
// /jev-models/<key> pages showed the old v1.5 figures (or 404). This rebuilds the API board exactly as
// components/JevBenchV16ReleaseRoute.tsx does and hands the pages the board's own numbers and ranks.
const cache = new Map();
export function readJevbenchA4ModelPages(root = process.cwd()) {
  if (!cache.has(root)) cache.set(root, build(root).catch((error) => { cache.delete(root); throw error; }));
  return cache.get(root);
}

async function build(root) {
  const [a4, { artifact: release, carry, categories }, previous, addenda] = await Promise.all([
    readFile(path.join(root, 'data/jevbench-api-a4-equated.json'), 'utf8').then(JSON.parse),
    readJevbenchV161Release(root), readJevbenchV157Release(root), readApiFullAddenda(root),
  ]);
  // v1.7.0: these pages follow the assembled live board (the restated rows when v1.7.0 is published), never a private rebuild from v1.6.1 + the A4 file.
  const live = await assembleJevBoard({ release: { artifact: release, categories, carry }, previous, live: true, apiA4: a4, root });
  const isApi = jevScopeClassifier(live.published.systems, live.publishedCarry.rows, previous.artifact.systems, previous.artifact.not_measured);
  const board = jevbenchScopeArtifact(live.published, 'api', isApi);
  // Capability list of the board: numbered within the Jev-class caps, the rest sit below the divider.
  const classRows = jevClassRows(board.systems.filter((s) => s.ranked), { ...JEV_V16_CLASS_OPTIONS, nearCapPrecision: true }).rows;
  const capabilityRank = new Map(classRows.filter((r) => r.inClass).map((r, i) => [r.row.key, i + 1]));
  const outside = new Map(classRows.filter((r) => !r.inClass).map((r) => [r.row.key, r.reasons.join('; ')]));
  const byKey = new Map(board.systems.map((s) => [s.key, s]));
  const pages = new Map();
  const categoryArtifact = live.categories;
  // v1.7.8: full_rows (e.g. Liquid AI d1) answered the full S ∪ P set after the release and are not equated.
  // v1.7.10: a5_rows (OpenAI Decisions) answered A5 u P and carry A5's round and offsets.
  for (const r of [...a4.rows, ...(a4.a5_rows ?? []).map((row) => ({ ...row, a5: true })), ...(a4.full_rows ?? []).map((row) => ({ ...row, full: true })), ...addenda.entries.map((e) => ({ ...e.row, full: true, measured_on: e.row.last_measured_on ?? e.published_at, addendum: e }))]) {
    const s = byKey.get(r.key);
    if (!s) continue;
    pages.set(r.key, {
      categoryView: jevbenchCategoryView('v1.6.1', [r.key], { artifact: withRowPoolCategoryRows(categoryArtifact, categoryArtifact.systems[r.key] ? { [r.key]: categoryArtifact.systems[r.key] } : {}, {}) }),   // (the live artifact mixes the cells of several draws; the view validates only this row's; its per-row pool bounds travel with the trimmed copy)
      row: s, ranked: !!s.ranked, compositeRank: s.ranked ? s.rank : null, capabilityRank: capabilityRank.get(r.key) ?? null,
      capabilityOutside: outside.get(r.key) ?? null, nRanked: board.n_ranked, nCapability: capabilityRank.size,
      nItems: r.full ? 1500 : r.n_rows, measuredOn: r.measured_on ?? r.last_measured_on, round: r.addendum ? r.addendum.provenance.parent : r.a5 ? a4.a5.round : a4.round, offsets: r.addendum ? null : r.a5 ? a4.a5.a5_offsets : a4.a4_offsets, subset: r.a5 ? 'A5' : 'A4', full: !!r.full,
    });
  }
  return pages;
}
