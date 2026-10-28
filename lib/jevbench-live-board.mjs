// The JevBench board data path shared by JevBenchV16ReleaseRoute and the release gates: one function, so a gate checks
// exactly the rows and category cells the live pages render.
import { jevWithApiA4Rows } from './jevbench-scope.mjs';
import { withLiveCategoryCells } from './jevbench-categories.mjs';
import { withApiRerunSplits } from './jevbench-api-rerun-cells.mjs';
import { readApiFullAddenda, withApiFullAddenda, withApiFullAddendumCategories } from './jevbench-api-full-addenda.mjs';
import { readCohortRows, jevWithCohortRows, readDrawEquating } from './jevbench-cohort-merge.mjs';
import { readCarryAdditions, withCarryAdditions } from './jevbench-carry-additions.mjs';
import { readCohortTopicCells, withCohortCategoryCells } from './jevbench-cohort-categories.mjs';
import { readJevbenchV1715ForBoard, withV1715Addendum } from './jevbench-v1715-release.mjs';
import { readJevbenchV1714ForBoard, withV1714Addendum } from './jevbench-v1714-release.mjs';
import { readJevbenchV1713ForBoard, withV1713Addendum } from './jevbench-v1713-release.mjs';
import { readJevbenchV1712ForBoard, withV1712Addendum } from './jevbench-v1712-release.mjs';
import { readJevbenchV1711ForBoard, withV1711Addendum } from './jevbench-v1711-release.mjs';
import { readJevbenchV1710ForBoard, withV1710Addendum } from './jevbench-v1710-release.mjs';
import { readJevbenchV179ForBoard, withV179Addendum } from './jevbench-v179-release.mjs';
import { readJevbenchV178ForBoard, withV178Addendum } from './jevbench-v178-release.mjs';
import { readJevbenchV177ForBoard, withV177Addendum } from './jevbench-v177-release.mjs';
import { readJevbenchV176ForBoard, withV176Addendum } from './jevbench-v176-release.mjs';
import { readJevbenchV175ForBoard, withV175Addendum } from './jevbench-v175-release.mjs';
import { readJevbenchV174ForBoard, withV174Addendum } from './jevbench-v174-release.mjs';
import { readJevbenchV173ForBoard, withV173Addendum } from './jevbench-v173-release.mjs';
import { readJevbenchV172ForBoard, withV172Addendum } from './jevbench-v172-release.mjs';
import { readJevbenchV171ForBoard, withV171Addendum } from './jevbench-v171-release.mjs';
import { readJevbenchV170ForBoard, withV170Restatement } from './jevbench-v170-release.mjs';
import { jevScopeClassifier } from './jevbench-scope.mjs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

/** live: the merged boards (/jev-models, /jev-models/api); otherwise the release as published. apiA4 is
 *  data/jevbench-api-a4-equated.json (the route imports it so the bundle carries it). */
/** restate:false returns the unchanged v1.6 chain output (what v1.7.0 restates and is bound to). */
export async function assembleJevBoard({ release, previous, live, apiA4, root = process.cwd(), restate = true }) {
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
  const chain = { merged, categories, published, publishedCarry, addenda, live: true };
  // v1.7.0 (10 s rule): the whole-board restatement. It is applied only for a PASS-reviewed publication and only after it proves it is bound to exactly this chain output.
  const v170 = restate ? await readJevbenchV170ForBoard(root) : null;
  if (!v170) return chain;
  const isApi = jevScopeClassifier(published.systems, publishedCarry.rows, previous.artifact.systems, previous.artifact.not_measured);
  const releaseSha256 = createHash('sha256').update(await readFile(path.join(root, 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-results.json'))).digest('hex');
  const restated = await withV170Restatement({ merged, published, categories, publishedCarry, isApi, releaseSha256, chainLatestRelease: await readChainLatestRelease(release_.revision, root) }, v170);
  const current = { ...chain, ...restated, method: v170.artifact.method };
  const v171 = await readJevbenchV171ForBoard(root);
  const throughV171 = v171 ? withV171Addendum(current, v171) : current;
  const v172 = await readJevbenchV172ForBoard(root);
  const throughV172 = v172 ? withV172Addendum(throughV171, v172) : throughV171;
  const v173 = await readJevbenchV173ForBoard(root);
  const throughV173 = v173 ? withV173Addendum(throughV172, v173) : throughV172;
  const v174 = await readJevbenchV174ForBoard(root);
  const throughV174 = v174 ? withV174Addendum(throughV173, v174) : throughV173;
  const v175 = await readJevbenchV175ForBoard(root);
  const throughV175 = v175 ? withV175Addendum(throughV174, v175) : throughV174;
  const v176 = await readJevbenchV176ForBoard(root);
  const throughV176 = v176 ? withV176Addendum(throughV175, v176) : throughV175;
  const v177 = await readJevbenchV177ForBoard(root);
  const throughV177 = v177 ? withV177Addendum(throughV176, v177) : throughV176;
  const v178 = await readJevbenchV178ForBoard(root);
  const throughV178 = v178 ? withV178Addendum(throughV177, v178) : throughV177;
  const v179 = await readJevbenchV179ForBoard(root);
  const throughV179 = v179 ? withV179Addendum(throughV178, v179) : throughV178;
  const v1710 = await readJevbenchV1710ForBoard(root);
  const throughV1710 = v1710 ? withV1710Addendum(throughV179, v1710) : throughV179;
  const v1711 = await readJevbenchV1711ForBoard(root);
  const throughV1711 = v1711 ? withV1711Addendum(throughV1710, v1711) : throughV1710;
  const v1712 = await readJevbenchV1712ForBoard(root);
  const throughV1712 = v1712 ? withV1712Addendum(throughV1711, v1712) : throughV1711;
  const v1713 = await readJevbenchV1713ForBoard(root);
  const throughV1713 = v1713 ? withV1713Addendum(throughV1712, v1713) : throughV1712;
  const v1714 = await readJevbenchV1714ForBoard(root);
  const throughV1714 = v1714 ? withV1714Addendum(throughV1713, v1714) : throughV1713;
  const v1715 = await readJevbenchV1715ForBoard(root);
  return v1715 ? withV1715Addendum(throughV1714, v1715) : throughV1714;
}

const releaseParts = (v) => String(v).replace(/^v/, '').split('.').map(Number);
const releaseNewer = (a, b) => {
  const x = releaseParts(a), y = releaseParts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] ?? 0) - (y[i] ?? 0); if (d) return d > 0; }
  return false;
};

/** Newest JevBench release on the live board: the newest `latest_release` in the draw-equating table (the table the cohort
 *  reader walks), never older than the base release. No hard-coded version list. */
export async function readChainLatestRelease(baseRelease, root = process.cwd()) {
  const { draws } = await readDrawEquating(root);
  return [baseRelease, ...draws.filter((d) => d.joins_via !== 'v1.7-addendum').map((d) => d.latest_release)].reduce((a, b) => (releaseNewer(b, a) ? b : a));
}

/** The newest release of the live board: v1.7.0 once its restatement is published, else the newest v1.6.x of the chain. */
export async function readLatestJevbenchRelease(baseRelease, root = process.cwd()) {
  return (await readJevbenchV1715ForBoard(root)) ? 'v1.7.15' : (await readJevbenchV1714ForBoard(root)) ? 'v1.7.14' : (await readJevbenchV1713ForBoard(root)) ? 'v1.7.13' : (await readJevbenchV1712ForBoard(root)) ? 'v1.7.12' : (await readJevbenchV1711ForBoard(root)) ? 'v1.7.11' : (await readJevbenchV1710ForBoard(root)) ? 'v1.7.10' : (await readJevbenchV179ForBoard(root)) ? 'v1.7.9' : (await readJevbenchV178ForBoard(root)) ? 'v1.7.8' : (await readJevbenchV177ForBoard(root)) ? 'v1.7.7' : (await readJevbenchV176ForBoard(root)) ? 'v1.7.6' : (await readJevbenchV175ForBoard(root)) ? 'v1.7.5' : (await readJevbenchV174ForBoard(root)) ? 'v1.7.4' : (await readJevbenchV173ForBoard(root)) ? 'v1.7.3' : (await readJevbenchV172ForBoard(root)) ? 'v1.7.2' : (await readJevbenchV171ForBoard(root)) ? 'v1.7.1' : (await readJevbenchV170ForBoard(root)) ? 'v1.7.0' : readChainLatestRelease(baseRelease, root);
}
