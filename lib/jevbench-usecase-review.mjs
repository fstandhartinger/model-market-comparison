import { jevClassRows, JEV_V16_CLASS_OPTIONS } from './jevbench-jev-class.mjs';

/** Actually ranked, Jev-class eligible models on either board, counted once. */
export function rankedEligibleUsecaseKeys(boards) {
  return [...new Set(Object.values(boards).flatMap((board) =>
    jevClassRows(board.systems, JEV_V16_CLASS_OPTIONS).rows
      .filter(({ row, inClass }) => row.ranked === true && row.listing === 'ranked' && inClass)
      .map(({ row }) => row.key)))].sort();
}

/** Review displayed use-case spokes only; missing/low-n cells never enter the statistics. */
export function usecaseReleaseReview(view, keys) {
  const eligibleKeys = [...new Set(keys)].sort();
  const dim = view?.dims?.find((d) => d.key === 'usecases');
  if (!dim) throw new Error('Missing shipped use-case category view');
  const spokes = dim.cats.filter((c) => c.plotted);
  const categories = spokes.map((cat) => {
    const cells = [], missingKeys = [];
    for (const key of eligibleKeys) {
      const cell = view.systems[key]?.usecases?.[cat.key];
      if (!Number.isFinite(cell?.[0]) || !Number.isInteger(cell?.[1]) || cell[1] < view.radarMinN) {
        missingKeys.push(key);
      } else {
        cells.push({ key, value: cell[0], n: cell[1], pools: view.categoryPools?.[key] ?? null });
      }
    }
    const values = cells.map((c) => c.value).sort((a, b) => a - b);
    const n = values.length, mid = Math.floor(n / 2);
    const best = n ? values[n - 1] : null;
    const median = n ? n % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2 : null;
    const bestMinusMedian = n ? best - median : null;
    // Whole-cohort claims require complete coverage. Gaps independently require review.
    const complete = eligibleKeys.length > 0 && missingKeys.length === 0;
    const flags = [];
    if (complete && best < 10) flags.push('all_below_10');
    if (complete && bestMinusMedian < 5) flags.push('best_minus_median_below_5');
    const coverageIssues = eligibleKeys.length === 0 ? ['no_ranked_eligible_models']
      : missingKeys.length ? ['incomplete_coverage'] : [];
    return { key: cat.key, label: cat.label, poolN: cat.n, measured: n, eligible: eligibleKeys.length,
      coverage: eligibleKeys.length ? n / eligibleKeys.length : null, missingKeys,
      best, median, bestMinusMedian, flags, coverageIssues, reviewRequired: flags.length > 0 || coverageIssues.length > 0, cells };
  });
  if (!spokes.length) throw new Error('No displayed use-case spokes');
  return { revision: view.revision, metric: view.metric, eligibleKeys, thresholds: { allBelow: 10, bestMinusMedianBelow: 5, strict: true },
    radarMinN: view.radarMinN, methodNote: 'Shipped category values use final category clipping 0..100; pre-clipping negative cells cannot be recovered from these aggregates.',
    categories, reviewRequired: categories.some((c) => c.reviewRequired) };
}
