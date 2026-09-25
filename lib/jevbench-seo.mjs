import { readJevbenchV142, jevbenchV142View } from './jevbench-v142.mjs';

export const JEV_SEO_PATHS = {
  alternatives: '/jev-models/alternatives',
  chooser: '/jev-models/how-to-choose',
  openSource: '/jev-models/open-source-jev',
};

export const JEV_TOP_FIVE_COMPARISONS = [
  { key: 'decider-4b-v2', slug: 'jev-vs-decider-4b-v2', label: 'decider-4b v2' },
  { key: 'jevk5-v02', slug: 'jev-vs-jevk5', label: 'JevK5' },
  { key: 'cygnet', slug: 'jev-vs-cygnet', label: 'Cygnet' },
  { key: 'hopper', slug: 'jev-vs-hopper', label: 'Hopper' },
  { key: 'winnow-12b', slug: 'jev-vs-winnow-12b-q8', label: 'Winnow-12B Q8' },
  { key: 'reflex-4b', slug: 'jev-vs-reflex-4b', label: 'reflex 4B' },
];

// Searched-for pairs outside the top five (seo-routes-finish, 25 Sep 2026).
export const JEV_MORE_COMPARISONS = [
  { key: 'laya', slug: 'jev-vs-laya', label: 'Laya' },
];

export const JEV_COMPARISONS = [...JEV_TOP_FIVE_COMPARISONS, ...JEV_MORE_COMPARISONS];

// Open-weight inventory for the alternatives and open-source pages: Jev-style systems whose code or weights are
// public. The artifact's `open` field is empty on a few Apache-2.0 rows (JevK5, for example), so an empty field
// counts as open unless the licence names a proprietary or closed release, as on the board.
const OPEN_WEIGHT_CLASSES = new Set(['jev-rebuild', 'system-one-open']);
export function isOpenWeightJevRow(row) {
  if (!OPEN_WEIGHT_CLASSES.has(row?.class)) return false;
  if (typeof row?.licence !== 'string' || !row.licence.trim() || typeof row?.repo !== 'string' || !/^https:\/\//i.test(row.repo)) return false;
  if (row.open === 'no' || row.open === false) return false;
  if (row.open === 'yes' || row.open === 'weights' || row.open === true) return true;
  return !/proprietary|closed weights|weights not published|hosted service/i.test(row.licence);
}

const isRanked = (row) => row?.listing === 'ranked' && row?.ranked === true && Number.isInteger(row.rank);

export async function readJevbenchSeoData() {
  const result = await readJevbenchV142();
  const view = jevbenchV142View(result);
  const ranked = view.ranked.filter(isRanked).sort((a, b) => a.rank - b.rank);
  const jev = ranked.find((row) => row.key === 'jev-1.13.0');
  if (!jev || ranked.length !== 89) throw new Error('Invalid JevBench SEO source: expected v1.4.2 and 89 ranked systems');

  const topFive = ranked.slice(0, 5);
  if (!topFive.some((row) => row.key === 'jev-1.13.0')) throw new Error('Invalid JevBench SEO source: Jev is not in the published top five');
  // CR-152: since v1.4.2 Jev is #2; the comparison pages stay for these rivals as long as they are ranked.
  const comparisons = JEV_COMPARISONS.map((pair) => {
    const rival = ranked.find((row) => row.key === pair.key);
    if (!rival) throw new Error(`Invalid JevBench SEO source: ${pair.key} is not ranked`);
    return { ...pair, jev, rival };
  });

  const best = (rows, metric) => rows.reduce((winner, row) => {
    const value = metric(row);
    return value !== null && Number.isFinite(value) && (winner === null || value > metric(winner)) ? row : winner;
  }, null);
  const costEvidence = (row) => ['measured', 'estimate', 'announced'].includes(row?.cost?.kind)
    && Number.isFinite(row?.cost?.usd_per_1000)
    && Number.isFinite(row?.axes?.cost);
  const explicitOpen = (row) => (row?.open === 'yes' || row?.open === 'weights' || row?.open === true)
    && typeof row?.licence === 'string' && row.licence.trim().length > 0
    && typeof row?.repo === 'string' && /^https:\/\//i.test(row.repo);

  return {
    artifact: view.artifact,
    sha256: result.sha256,
    ranked,
    topFive,
    comparisons,
    winners: {
      mostAccurate: best(ranked, (row) => row.sealed_accuracy),
      fastest: best(ranked, (row) => row.axes?.speed),
      cheapest: best(ranked.filter(costEvidence), (row) => row.axes?.cost),
    },
    selfHostable: ranked.filter(explicitOpen),
    openWeightAlternatives: view.systems.filter(isOpenWeightJevRow).sort((a, b) => {
      const aRank = Number.isInteger(a.rank) ? a.rank : Number.POSITIVE_INFINITY;
      const bRank = Number.isInteger(b.rank) ? b.rank : Number.POSITIVE_INFINITY;
      return aRank - bRank || a.display.localeCompare(b.display);
    }),
  };
}
