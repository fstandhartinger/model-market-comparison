import { withPublicationValidationScope } from './jevbench-publication-validation-scope.mjs';
// The JevBench board data path shared by JevBenchV16ReleaseRoute and the release gates: one function, so a gate checks
// exactly the rows and category cells the live pages render.
import { jevWithApiA4Rows } from './jevbench-scope.mjs';
import { withLiveCategoryCells } from './jevbench-categories.mjs';
import { withApiRerunSplits } from './jevbench-api-rerun-cells.mjs';
import { readApiFullAddenda, withApiFullAddenda, withApiFullAddendumCategories } from './jevbench-api-full-addenda.mjs';
import { readCohortRows, jevWithCohortRows, readDrawEquating } from './jevbench-cohort-merge.mjs';
import { readCarryAdditions, withCarryAdditions } from './jevbench-carry-additions.mjs';
import { readCohortTopicCells, withCohortCategoryCells } from './jevbench-cohort-categories.mjs';
import { readJevbenchV187ForBoard, withV187Addendum } from './jevbench-v187-release.mjs';
import { readJevbenchV186ForBoard, withV186Addendum } from './jevbench-v186-release.mjs';
import { readJevbenchV185ForBoard, withV185Addendum } from './jevbench-v185-release.mjs';
import { readJevbenchV184ForBoard, withV184Addendum } from './jevbench-v184-release.mjs';
import { readJevbenchV183ForBoard, withV183Addendum } from './jevbench-v183-release.mjs';
import { readJevbenchV182ForBoard, withV182Addendum } from './jevbench-v182-release.mjs';
import { readJevbenchV181ForBoard, withV181Addendum } from './jevbench-v181-release.mjs';
import { readJevbenchV180ForBoard, withV180Addendum } from './jevbench-v180-release.mjs';
import { readJevbenchV1723ForBoard, withV1723Addendum } from './jevbench-v1723-release.mjs';
import { readJevbenchV1722ForBoard, withV1722Addendum } from './jevbench-v1722-release.mjs';
import { readJevbenchV1721ForBoard, withV1721Addendum } from './jevbench-v1721-release.mjs';
import { readJevbenchV1720ForBoard, withV1720Addendum } from './jevbench-v1720-release.mjs';
import { readJevbenchV1719ForBoard, withV1719Addendum } from './jevbench-v1719-release.mjs';
import { readJevbenchV1718ForBoard, withV1718Addendum } from './jevbench-v1718-release.mjs';
import { readJevbenchV1717ForBoard, withV1717Addendum } from './jevbench-v1717-release.mjs';
import { readJevbenchV1716ForBoard, withV1716Addendum } from './jevbench-v1716-release.mjs';
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
async function assembleValidatedJevBoard({ release, previous, live, apiA4, root = process.cwd(), restate = true }) {
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
  let current = { ...chain, ...restated, method: v170.artifact.method };
  // Keep only the current board: block-scoped intermediates let older bundles
  // be collected instead of retaining every release until this function returns.
  for (const [read, apply] of [
    [readJevbenchV171ForBoard, withV171Addendum],
    [readJevbenchV172ForBoard, withV172Addendum],
    [readJevbenchV173ForBoard, withV173Addendum],
    [readJevbenchV174ForBoard, withV174Addendum],
    [readJevbenchV175ForBoard, withV175Addendum],
    [readJevbenchV176ForBoard, withV176Addendum],
    [readJevbenchV177ForBoard, withV177Addendum],
    [readJevbenchV178ForBoard, withV178Addendum],
    [readJevbenchV179ForBoard, withV179Addendum],
    [readJevbenchV1710ForBoard, withV1710Addendum],
    [readJevbenchV1711ForBoard, withV1711Addendum],
    [readJevbenchV1712ForBoard, withV1712Addendum],
    [readJevbenchV1713ForBoard, withV1713Addendum],
    [readJevbenchV1714ForBoard, withV1714Addendum],
    [readJevbenchV1715ForBoard, withV1715Addendum],
    [readJevbenchV1716ForBoard, withV1716Addendum],
    [readJevbenchV1717ForBoard, withV1717Addendum],
    [readJevbenchV1718ForBoard, withV1718Addendum],
    [readJevbenchV1719ForBoard, withV1719Addendum],
    [readJevbenchV1720ForBoard, withV1720Addendum],
    [readJevbenchV1721ForBoard, withV1721Addendum],
    [readJevbenchV1722ForBoard, withV1722Addendum],
    [readJevbenchV1723ForBoard, withV1723Addendum],
    [readJevbenchV180ForBoard, withV180Addendum],
    [readJevbenchV181ForBoard, withV181Addendum],
    [readJevbenchV182ForBoard, withV182Addendum],
    [readJevbenchV183ForBoard, withV183Addendum],
    [readJevbenchV184ForBoard, withV184Addendum],
    [readJevbenchV185ForBoard, withV185Addendum],
    [readJevbenchV186ForBoard, withV186Addendum],
    [readJevbenchV187ForBoard, withV187Addendum],
  ]) {
    const next = await read(root);
    if (next) current = apply(current, next);
  }
  return current;
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
  return (await readJevbenchV187ForBoard(root)) ? 'v1.8.7' : (await readJevbenchV186ForBoard(root)) ? 'v1.8.6' : (await readJevbenchV185ForBoard(root)) ? 'v1.8.5' : (await readJevbenchV184ForBoard(root)) ? 'v1.8.4' : (await readJevbenchV183ForBoard(root)) ? 'v1.8.3' : (await readJevbenchV182ForBoard(root)) ? 'v1.8.2' : (await readJevbenchV181ForBoard(root)) ? 'v1.8.1' : (await readJevbenchV180ForBoard(root)) ? 'v1.8.0' : (await readJevbenchV1723ForBoard(root)) ? 'v1.7.23' : (await readJevbenchV1722ForBoard(root)) ? 'v1.7.22' : (await readJevbenchV1721ForBoard(root)) ? 'v1.7.21' : (await readJevbenchV1720ForBoard(root)) ? 'v1.7.20' : (await readJevbenchV1719ForBoard(root)) ? 'v1.7.19' : (await readJevbenchV1718ForBoard(root)) ? 'v1.7.18' : (await readJevbenchV1717ForBoard(root)) ? 'v1.7.17' : (await readJevbenchV1716ForBoard(root)) ? 'v1.7.16' : (await readJevbenchV1715ForBoard(root)) ? 'v1.7.15' : (await readJevbenchV1714ForBoard(root)) ? 'v1.7.14' : (await readJevbenchV1713ForBoard(root)) ? 'v1.7.13' : (await readJevbenchV1712ForBoard(root)) ? 'v1.7.12' : (await readJevbenchV1711ForBoard(root)) ? 'v1.7.11' : (await readJevbenchV1710ForBoard(root)) ? 'v1.7.10' : (await readJevbenchV179ForBoard(root)) ? 'v1.7.9' : (await readJevbenchV178ForBoard(root)) ? 'v1.7.8' : (await readJevbenchV177ForBoard(root)) ? 'v1.7.7' : (await readJevbenchV176ForBoard(root)) ? 'v1.7.6' : (await readJevbenchV175ForBoard(root)) ? 'v1.7.5' : (await readJevbenchV174ForBoard(root)) ? 'v1.7.4' : (await readJevbenchV173ForBoard(root)) ? 'v1.7.3' : (await readJevbenchV172ForBoard(root)) ? 'v1.7.2' : (await readJevbenchV171ForBoard(root)) ? 'v1.7.1' : (await readJevbenchV170ForBoard(root)) ? 'v1.7.0' : readChainLatestRelease(baseRelease, root);
}

// A render validates each successor against the immediately preceding bundle,
// without re-reading that whole predecessor chain for every addendum.
export async function assembleJevBoard({ release, previous, live, apiA4, root = process.cwd(), restate = true }) {
  return withPublicationValidationScope(() => assembleValidatedJevBoard({ release, previous, live, apiA4, root, restate }));
}
