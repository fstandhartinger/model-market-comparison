import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { readJevbenchV161Release } from './jevbench-v16-release.mjs';
import { readJevbenchV157Release } from './jevbench-v15-release.mjs';
import { jevScopeClassifier, jevbenchScopeArtifact, jevWithApiA4Rows } from './jevbench-scope.mjs';
import { jevClassRows, JEV_V16_CLASS_OPTIONS } from './jevbench-jev-class.mjs';

// Review 6 Oct 2026: the 18 rows of data/jevbench-api-a4-equated.json (v1.7.7) only exist on the API board, so their
// /jev-models/<key> pages showed the old v1.5 figures (or 404). This rebuilds the API board exactly as
// components/JevBenchV16ReleaseRoute.tsx does and hands the pages the board's own numbers and ranks.
const cache = new Map();
export function readJevbenchA4ModelPages(root = process.cwd()) {
  if (!cache.has(root)) cache.set(root, build(root).catch((error) => { cache.delete(root); throw error; }));
  return cache.get(root);
}

async function build(root) {
  const [a4, { artifact: release, carry }, previous] = await Promise.all([
    readFile(path.join(root, 'data/jevbench-api-a4-equated.json'), 'utf8').then(JSON.parse),
    readJevbenchV161Release(root), readJevbenchV157Release(root),
  ]);
  const meta = new Map([...previous.artifact.systems, ...carry.rows].map((r) => [r.key, r]));
  const merged = jevWithApiA4Rows(release, a4, meta);
  const isApi = jevScopeClassifier(merged.systems, carry.rows, previous.artifact.systems, previous.artifact.not_measured);
  const board = jevbenchScopeArtifact(merged, 'api', isApi);
  // Capability list of the board: numbered within the Jev-class caps, the rest sit below the divider.
  const classRows = jevClassRows(board.systems.filter((s) => s.ranked), JEV_V16_CLASS_OPTIONS).rows;
  const capabilityRank = new Map(classRows.filter((r) => r.inClass).map((r, i) => [r.row.key, i + 1]));
  const outside = new Map(classRows.filter((r) => !r.inClass).map((r) => [r.row.key, r.reasons.join('; ')]));
  const byKey = new Map(board.systems.map((s) => [s.key, s]));
  const pages = new Map();
  for (const r of a4.rows) {
    const s = byKey.get(r.key);
    if (!s) continue;
    pages.set(r.key, {
      row: s, ranked: !!s.ranked, compositeRank: s.ranked ? s.rank : null, capabilityRank: capabilityRank.get(r.key) ?? null,
      capabilityOutside: outside.get(r.key) ?? null, nRanked: board.n_ranked, nCapability: capabilityRank.size,
      nItems: r.n_rows, measuredOn: r.measured_on, round: a4.round, offsets: a4.a4_offsets,
    });
  }
  return pages;
}
