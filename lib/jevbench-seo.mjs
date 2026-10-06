import { readCurrentJevbench, CURRENT_JEVBENCH_PAGE } from './jevbench-current.mjs';
import { readJevbenchAgentFeed } from './jevbench-agent-feed.mjs';
import { readSeoHistory } from './jevbench-seo-history.mjs';
import { isJevbenchV16ExcludedKey } from './jevbench-v16-public-scope.mjs';
import { jevScopeClassifier, jevScopeRows } from './jevbench-scope.mjs';
import { jevSystemSlug, jevSystemPath } from './jev-system-slug.mjs';

export const JEV_SEO_PATHS = {
  alternatives: '/jev-models/alternatives',
  chooser: '/jev-models/how-to-choose',
  openSource: '/jev-models/open-source-jev',
};

export const JEV_TOP_FIVE_COMPARISONS = [
  { key: 'imajev_4b', slug: 'jev-vs-imajev', label: 'Imajev-4B' },
  { key: 'plumb-4b', slug: 'jev-vs-plumb', label: 'Plumb-4B' },
  { key: 'decider-4b-v2', slug: 'jev-vs-decider-4b-v2', label: 'decider-4b v2' },
  { key: 'jevk5-v02', slug: 'jev-vs-jevk5', label: 'JevK5' },
];

// Searched-for pairs outside the top five (seo-routes-finish, 25 Sep 2026).
export const JEV_MORE_COMPARISONS = [
  { key: 'cygnet', slug: 'jev-vs-cygnet', label: 'Cygnet' },
  { key: 'hopper', slug: 'jev-vs-hopper', label: 'Hopper' },
  { key: 'winnow-12b', slug: 'jev-vs-winnow-12b-q8', label: 'Winnow-12B Q8' },
  { key: 'reflex-4b', slug: 'jev-vs-reflex-4b', label: 'reflex 4B' },
  { key: 'laya', slug: 'jev-vs-laya', label: 'Laya' },
];

export const JEV_LEGACY_COMPARISONS = [...JEV_TOP_FIVE_COMPARISONS, ...JEV_MORE_COMPARISONS];

// Open-weight inventory for the alternatives and open-source pages: Jev-style systems whose code or weights are
// public. The artifact's `open` field is empty on a few Apache-2.0 rows (JevK5, for example), so an empty field
// counts as open unless the licence names a proprietary or closed release, as on the board.
const OPEN_WEIGHT_CLASSES = new Set(['jev-rebuild', 'system-one-open', 'Jev-compatible decision model']);
export function isOpenWeightJevRow(row) {
  if (!OPEN_WEIGHT_CLASSES.has(row?.class)) return false;
  if (typeof row?.licence !== 'string' || !row.licence.trim() || typeof row?.repo !== 'string' || !/^https:\/\//i.test(row.repo)) return false;
  if (row.open === 'no' || row.open === false) return false;
  if (row.open === 'yes' || row.open === 'weights' || row.open === 'open weights' || row.open === true) return true;
  return !/proprietary|closed weights|weights not published|hosted service/i.test(row.licence);
}


export function releaseDate(artifact) {
  const raw = artifact.published_on ?? artifact.published_utc ?? artifact.generated_utc ?? artifact.generated ?? artifact.overnight?.scored_utc;
  if (!raw) throw new Error(`Release ${artifact.revision} has no published/generated timestamp`);
  const date = new Date(String(raw).replace(' UTC', 'Z').replace(' ', 'T'));
  if (!Number.isFinite(date.getTime())) throw new Error(`Invalid release date: ${raw}`);
  return date.toISOString();
}

export function currentComparisonPairs(ranked) {
  const pairs = [...JEV_LEGACY_COMPARISONS];
  for (const row of ranked.slice(0, 8)) {
    if (row.key === 'jev-1.13.0' || pairs.some((p) => p.key === row.key)) continue;
    pairs.push({ key: row.key, slug: `jev-vs-${jevSystemSlug(row.key)}`, label: row.display.split(' (')[0].split(', formerly')[0] });
  }
  return pairs;
}

const seoCache = new Map();
// The release pointer and committed artifacts are immutable within a deployment.
export function readJevbenchSeoData(root = process.cwd()) {
  if (!seoCache.has(root)) seoCache.set(root, buildJevbenchSeoData(root).catch((error) => { seoCache.delete(root); throw error; }));
  return seoCache.get(root);
}
async function buildJevbenchSeoData(root) {
  const [release, { feed }, history] = await Promise.all([
    readCurrentJevbench(root), readJevbenchAgentFeed(root),
    readCurrentJevbench(root).then(({artifact}) => readSeoHistory(root, artifact.revision)),
  ]);
  const date = releaseDate(release.artifact);
  const metadata = (key, field) => history.map((h) => h.systems.find((s) => s.key === key)?.[field]).find((v) => v != null && v !== '') ?? null;
  const systems = feed.systems.filter((s) => !isJevbenchV16ExcludedKey(s.key)).map((s) => {
    const raw = release.artifact.systems.find((r) => r.key === s.key);
    return { ...raw, class: raw.class || metadata(s.key, 'class') || 'unclassified', display: s.name, composite_rank: s.board === 'open' ? s.open_board_rank ?? null : null,
      // Review 6 Oct 2026: `rank` is the rank the visitor sees on /jev-models (open-weights board). API rows and the Jev reference have none;
      // `combined_rank` keeps the old all-systems Capability rank for internal use only.
      board: s.board, open_board_rank: s.capability.open_board_rank, combined_rank: s.capability.rank,
      rank: s.board === 'open' ? s.capability.open_board_rank ?? null : null,
      capability: s.capability.score, capability_eligible: s.capability.eligible, capability_reasons: s.capability.reasons,
      axes: s.axes, jevbench_score: s.composite_score, source_url: s.source_url,
      sealed_accuracy: null, public_accuracy: null,
      open: raw.open ?? metadata(s.key, 'open'), licence: raw.licence || metadata(s.key, 'licence'),
      repo: raw.repo || metadata(s.key, 'repo'),
      last_measured_on: raw.last_measured_on ?? (raw.measurement_date_status === 'unknown' ? null : date.slice(0, 10)), measurement_revision: feed.revision,
    };
  });
  // The combined list only feeds the comparison-pair selection (so sitemap/link sets stay unchanged); every page ranking uses the open board.
  const combinedRanked = systems.filter((s) => s.capability_eligible && s.ranked && s.listing === 'ranked').sort((a,b) => a.combined_rank - b.combined_rank);
  const openRanked = systems.filter((s) => s.board === 'open' && s.open_board_rank != null && s.listing === 'ranked').sort((a,b) => a.open_board_rank - b.open_board_rank);
  const ranked = openRanked;
  const apiRows = systems.filter((s) => s.board === 'api' && s.listing === 'ranked');
  const jev = systems.find((s) => s.key === 'jev-1.13.0');
  if (!jev || !combinedRanked.length || !openRanked.length) throw new Error('Current SEO release has no reference or eligible models');
  const historical = new Map();
  // Dated carry is the board's authoritative last measurement, ahead of older full artifacts.
  for (const row of release.carry?.rows ?? []) {
    if (isJevbenchV16ExcludedKey(row.key)) continue;
    const source = history.find((h) => h.revision === row.measured_revision);
    const older = source?.systems.find((s) => s.key === row.key) ?? {};
    historical.set(row.key, { ...older, ...row, rank: null, composite_rank: row.v156_rank,
      jevbench_score: row.composite_v15, measurement_revision: row.measured_revision,
      last_measured_on: row.measured_label?.match(/\((\d{4}-\d{2}-\d{2})\)/)?.[1] ?? source?.date,
      capability_eligible: false, current: false });
  }
  for (const h of history) for (const row of h.systems) if (!historical.has(row.key)) historical.set(row.key, {
    ...row, rank: null, composite_rank: row.rank, capability: Number.isFinite(row.axes?.intelligence) && Number.isFinite(row.axes?.calibration) ? (row.axes.intelligence + row.axes.calibration)/2 : null,
    measurement_revision: h.revision, last_measured_on: h.date ?? release.carry?.releases?.find((r) => r.revision === h.revision)?.published_on ?? null, capability_eligible: false, current: false,
  });
  const comparisons = currentComparisonPairs(combinedRanked).map((pair) => {
    const current = systems.find((s) => s.key === pair.key);
    const rival = current?.ranked ? current : historical.get(pair.key) ?? current;
    if (!rival) throw new Error(`No public measurement for comparison ${pair.key}`);
    return { ...pair, jev, rival, inCurrentRelease: !!current?.ranked };
  });
  const best = (rows, metric) => rows.filter((r) => Number.isFinite(metric(r))).sort((a,b) => metric(b)-metric(a))[0] ?? null;
  // v1.7 scope rule (lib/jevbench-scope.mjs): the open-weights board holds only systems we ran ourselves; hosted API offerings are never listed here.
  const openWeightAlternatives = jevScopeRows(systems, 'open', jevScopeClassifier(release.artifact.systems, systems)).filter((r) => r.key !== jev.key && isOpenWeightJevRow(r)).sort((a,b) => (a.rank ?? Infinity)-(b.rank ?? Infinity) || a.display.localeCompare(b.display));
  return { artifact: { ...release.artifact, generated_utc: date, score_one_liner: feed.capability_policy.definition },
    sha256: release.sha256, feed, releasePage: CURRENT_JEVBENCH_PAGE, date,
    month: new Date(date).toLocaleDateString('en-US', {month: 'long', year: 'numeric', timeZone: 'UTC'}),
    systems, reference: jev, ranked, topFive: ranked.slice(0,5), comparisons, historical: [...historical.values()],
    modelKeys: [...new Set([...systems, ...historical.values()].map((s) => s.key))],
    winners: { mostAccurate: best(ranked, (r) => r.axes.intelligence), fastest: best(ranked, (r) => r.axes.speed),
      cheapest: best(ranked.filter((r) => Number.isFinite(r.cost?.usd_per_1000)), (r) => -r.cost.usd_per_1000) },
    // The page counts the unranked Jev reference among the systems that qualify on the open-weights board.
    openRanked, apiRows, openQualifying: openRanked.length + (jev.capability_eligible ? 1 : 0),
    selfHostable: ranked.filter(isOpenWeightJevRow), openWeightAlternatives,
  };
}

// Server consumers use the live list, including every current top-eight rival.
export async function readJevbenchComparisonLinks() {
  return (await readJevbenchSeoData()).comparisons;
}
export async function readJevbenchSeoUrls() {
  const data = await readJevbenchSeoData();
  return { date: data.date, urls: [...new Set(['/jev-models', data.releasePage, ...Object.values(JEV_SEO_PATHS),
    ...data.comparisons.map((p) => `/jev-models/${p.slug}`), ...data.modelKeys.map(jevSystemPath)])] };
}
