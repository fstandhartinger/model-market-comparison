// RELEASE GATE (Florian, standing rule 16 Oct 2026): "every system listed on JevBench (open-weights AND API boards) must have
// complete data in the Use-case radar, the Capability-by-subject-topic radar and the Languages table" (ImageJevBench: its
// image-type, use-case and TypeSafe-20 radars). This lists every row
// the live boards render without those cells; test/jevbench-breakdowns-every-listed-row.test.mjs fails on any gap that has
// no recorded exception in data/jevbench-breakdown-exceptions.json.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { jevbenchScopeArtifact, jevbenchScopeCarry, jevScopeClassifier } from './jevbench-scope.mjs';
import { jevLanguageRows } from './jevbench-categories.mjs';
import { languageRoster } from './jevbench-language-roster.mjs';

export const BREAKDOWN_EXCEPTIONS_PATH = 'data/jevbench-breakdown-exceptions.json';
export const BREAKDOWN_DIMS = ['topics', 'usecases', 'languages'];
// ImageJevBench v0.3: image-type radar, v0.3 use-case radar, TypeSafe-20 use-case radar.
export const IMAGEJEV_BREAKDOWN_DIMS = ['capabilities', 'usecases', 'typesafe'];
// Rows the compare radars skip (JevBenchV16Board compareRows filter); the all-data grid still shows their cells.
const OUTSIDE_RADARS = new Set(['preliminary', 'pending']);

const cells = (categories, key, dim) => Object.values(categories.systems[key]?.[dim] ?? {}).filter((c) => Number.isFinite(c?.competence) && (c.coverage_n ?? c.n) > 0).length;

/** board = assembleJevBoard(...) of the live boards; previous = the v1.5.7 release (scope classifier input). */
export function jevBreakdownGaps(board, previous) {
  const { published, publishedCarry, categories } = board;
  const isApi = jevScopeClassifier(published.systems, publishedCarry.rows, previous.artifact.systems, previous.artifact.not_measured);
  const gaps = new Map();
  const add = (key, display, scope, dim, where) => {
    const g = gaps.get(key) ?? { key, display, scopes: new Set(), dims: new Set(), where: new Set() };
    g.scopes.add(scope); g.dims.add(dim); g.where.add(where); gaps.set(key, g);
  };
  for (const scope of ['open', 'api']) {
    const a = jevbenchScopeArtifact(published, scope, isApi);
    // Radars: the compare view (ranked/listed rows) and the all-data grid (every row, incl. preliminary and not measured).
    for (const s of [...a.systems, ...(a.not_measured ?? [])]) {
      const where = OUTSIDE_RADARS.has(s.listing) || !a.systems.includes(s) ? 'all-data grid' : 'radar';
      for (const dim of ['topics', 'usecases']) if (!cells(categories, s.key, dim)) add(s.key, s.display, scope, dim, where);
    }
    // Languages table: the measured rows plus catalogue and historical (carry) rows.
    const carry = jevbenchScopeCarry(publishedCarry, scope === 'api' ? 'api' : 'all', isApi);
    const rows = jevLanguageRows(languageRoster(a.systems, a.not_measured, carry.rows, categories.systems, jevScopeClassifier(a.systems, carry.rows, a.not_measured), scope), scope);
    for (const r of rows) if (!cells(categories, r.key, 'languages')) add(r.key, r.display, scope, 'languages', 'language table');
  }
  return [...gaps.values()].map((g) => ({ ...g, scopes: [...g.scopes].sort(), dims: BREAKDOWN_DIMS.filter((d) => g.dims.has(d)), where: [...g.where].sort() }))
    .sort((x, y) => x.key.localeCompare(y.key));
}

/** ImageJevBench v0.3 rows (data/imagejev-v03.json ranking) without cells in one of the page's breakdown radars. */
export function imageJevBreakdownGaps(release, ts20) {
  const systems = release.categories?.systems ?? {};
  // ImageJev cells are [value, completed n, n]; JevBench-style cells are { competence, n }.
  const count = (cells) => Object.values(cells ?? {}).filter((c) => Number.isFinite(Array.isArray(c) ? c[0] : c?.competence)).length;
  return release.ranking.map((r) => ({ key: r.key, display: r.name ?? r.key, board: 'imagejevbench',
    dims: IMAGEJEV_BREAKDOWN_DIMS.filter((d) => !count(d === 'typesafe' ? ts20.systems?.[r.key]?.typesafe : systems[r.key]?.[d])) }))
    .filter((g) => g.dims.length);
}

/** Exceptions need a reason and a recorded decision (DECISIONS.md entry or board ruling), per key and dimension. */
export function validateBreakdownExceptions(e) {
  if (e?.kind !== 'jevbench-breakdown-exceptions' || e.schema_version !== 1 || !Array.isArray(e.entries)) throw new Error('breakdown exceptions: schema');
  const seen = new Set();
  for (const x of e.entries) {
    const board = x.board ?? 'jevbench';
    if (!['jevbench', 'imagejevbench'].includes(board)) throw new Error(`breakdown exceptions: ${x.key} board`);
    if (!x.key || seen.has(`${board}:${x.key}`)) throw new Error(`breakdown exceptions: duplicate or empty key ${x.key}`);
    seen.add(`${board}:${x.key}`);
    const dims = board === 'imagejevbench' ? IMAGEJEV_BREAKDOWN_DIMS : BREAKDOWN_DIMS;
    if (!Array.isArray(x.dims) || !x.dims.length || x.dims.some((d) => !dims.includes(d))) throw new Error(`breakdown exceptions: ${x.key} dims`);
    if (typeof x.reason !== 'string' || x.reason.length < 20) throw new Error(`breakdown exceptions: ${x.key} reason`);
    if (typeof x.decision !== 'string' || !/^(DECISIONS \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC|board #\d+)/.test(x.decision)) throw new Error(`breakdown exceptions: ${x.key} needs a recorded decision`);
  }
  return e;
}

export async function readBreakdownExceptions(root = process.cwd()) {
  return validateBreakdownExceptions(JSON.parse(await readFile(path.join(root, BREAKDOWN_EXCEPTIONS_PATH), 'utf8')));
}

/** Gaps not covered by an exception, and exceptions that no longer match a gap (stale entries must be removed). */
export function unexcusedBreakdownGaps(gaps, exceptions, board = 'jevbench') {
  const entries = exceptions.entries.filter((x) => (x.board ?? 'jevbench') === board);
  const byKey = new Map(entries.map((x) => [x.key, x]));
  const open = gaps.map((g) => ({ ...g, dims: g.dims.filter((d) => !byKey.get(g.key)?.dims.includes(d)) })).filter((g) => g.dims.length);
  const gapDims = new Map(gaps.map((g) => [g.key, new Set(g.dims)]));
  const stale = entries.filter((x) => x.dims.some((d) => !gapDims.get(x.key)?.has(d))).map((x) => x.key);
  return { open, stale };
}
