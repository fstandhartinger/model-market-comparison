import { readJevbenchV141, jevbenchV141View } from './jevbench-v141.mjs';

export const JEV_SEO_PATHS = {
  alternatives: '/jev-models/alternatives',
  chooser: '/jev-models/how-to-choose',
};

export const JEV_TOP_FIVE_COMPARISONS = [
  { key: 'jevk5-v02', slug: 'jev-vs-jevk5', label: 'JevK5' },
  { key: 'hopper', slug: 'jev-vs-hopper', label: 'Hopper' },
  { key: 'winnow-12b', slug: 'jev-vs-winnow-12b-q8', label: 'Winnow-12B Q8' },
  { key: 'reflex-4b', slug: 'jev-vs-reflex-4b', label: 'reflex 4B' },
];

const isRanked = (row) => row?.listing === 'ranked' && row?.ranked === true && Number.isInteger(row.rank);

export async function readJevbenchSeoData() {
  const result = await readJevbenchV141();
  const view = jevbenchV141View(result);
  const ranked = view.ranked.filter(isRanked).sort((a, b) => a.rank - b.rank);
  const jev = ranked.find((row) => row.key === 'jev-1.13.0');
  if (!jev || ranked.length !== 77) throw new Error('Invalid JevBench SEO source: expected v1.4.1 and 77 ranked systems');

  const topFive = ranked.slice(0, 5);
  if (topFive[0].key !== 'jev-1.13.0') throw new Error('Invalid JevBench SEO source: Jev is not the published leader');
  const comparisons = JEV_TOP_FIVE_COMPARISONS.map((pair) => {
    const rival = topFive.find((row) => row.key === pair.key);
    if (!rival) throw new Error(`Invalid JevBench SEO source: ${pair.key} is not in the published top five`);
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
  };
}
