// The JevBench board data path shared by JevBenchV16ReleaseRoute and the release gates: one function, so a gate checks
// exactly the rows and category cells the live pages render.
import { jevWithApiA4Rows } from './jevbench-scope.mjs';
import { withLiveCategoryCells } from './jevbench-categories.mjs';
import { withApiRerunSplits } from './jevbench-api-rerun-cells.mjs';
import { readApiFullAddenda, withApiFullAddenda, withApiFullAddendumCategories } from './jevbench-api-full-addenda.mjs';
import { readCohortRows, jevWithCohortRows } from './jevbench-cohort-merge.mjs';
import { readCarryAdditions, withCarryAdditions } from './jevbench-carry-additions.mjs';
import { readCohortTopicCells, withCohortCategoryCells } from './jevbench-cohort-categories.mjs';

/** live: the merged boards (/jev-models, /jev-models/api); otherwise the release as published. apiA4 is
 *  data/jevbench-api-a4-equated.json (the route imports it so the bundle carries it). */
export async function assembleJevBoard({ release, previous, live, apiA4, root = process.cwd() }) {
  const { artifact: release_, categories: releaseCategories, carry: releaseCarry } = release;
  if (!live || release_.revision !== 'v1.6.1') return { merged: release_, categories: releaseCategories, published: release_, publishedCarry: releaseCarry, addenda: { schema_version: 1, kind: 'jevbench-api-full-addenda', entries: [] }, live: false };
  // v1.7.7 (Florian 6 Oct 2026, Part 12b): on the live boards the API lane's full A4 u P re-run rows (equated) join the
  // release as measured API offerings and leave the dated carry; archived release pages show the release as published.
  const a4Meta = new Map([...previous.artifact.systems, ...releaseCarry.rows].map((r) => [r.key, r]));
  const addenda = await readApiFullAddenda(root);
  const historicalMerged = jevWithApiA4Rows(release_, withApiRerunSplits(apiA4), a4Meta);
  const withAddenda = addenda.entries.length ? withApiFullAddenda(historicalMerged, addenda) : historicalMerged;
  // Florian 10 Oct 2026: one merged board. Systems measured on a fresh draw after v1.6.1 join the live boards from their
  // own validated cohort publication, tagged with their draw and put on this scale by the draw's anchor offset.
  const cohort = await readCohortRows(root);
  const merged = jevWithCohortRows(withAddenda, cohort);
  // v1.7.12 (Part B): the live boards show language/use-case cells with the sealed L1/L2 supplements.
  // Standing rule (Florian 16 Oct 2026): rows from fresh draws show their own draw's topic, use-case and language cells.
  const categories = withCohortCategoryCells(withApiFullAddendumCategories(withLiveCategoryCells(releaseCategories), addenda), cohort, await readCohortTopicCells(root));
  const measured = new Set(merged.systems.map((s) => s.key));
  const published = { ...merged, not_measured: merged.not_measured.filter((r) => !measured.has(r.key)) };
  // 12 Oct 2026: dated v1.5-method rows listed after the frozen carry (live boards only).
  const carryBase = withCarryAdditions(releaseCarry, await readCarryAdditions(root), measured);
  const publishedCarry = { ...carryBase, rows: carryBase.rows.filter((r) => !measured.has(r.key)) };
  return { merged, categories, published, publishedCarry, addenda, live: true };
}
