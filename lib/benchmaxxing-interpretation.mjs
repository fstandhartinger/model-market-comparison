// CR-43.3 (Florian 2026-09-16): the plain-language reading of one model's Benchmaxxing report for the
// expandable row on /benchmaxxing. Every sentence is derived from the report and the published tag level;
// nothing is written per model.

/** Topics with at least two measured benchmarks, most uneven first. */
export function unevenTopics(report) {
  return [...(report?.topicSpread ?? [])]
    .filter((t) => t.measured >= 2 && Number.isFinite(t.spread))
    .sort((a, b) => b.spread - a.spread || String(a.category).localeCompare(String(b.category)));
}

/**
 * @param {{ status: string, score: number|null, topicSpread?: {category: string, measured: number, spread: number}[] }} report
 * @param {"strong"|"weak"|null} level  the published tag level (rank-based, see BENCHMAXX_TAG_SHARE / BENCHMAXX_WEAK_SHARE)
 * @returns {{ headline: string, detail: string|null, caveat: string }}
 */
export function interpretBenchmaxxing(report, level) {
  const caveat = 'A screening flag, not proof of leakage, contamination or intent.';
  if (!report || report.status !== 'scored' || report.score == null) {
    return { headline: 'Not enough related benchmarks to judge how even this model is.', detail: null, caveat };
  }
  const headline = level === 'strong'
    ? 'Strong signal: results jump a lot between related benchmarks — among the most uneven 10 % of scored models.'
    : level === 'weak'
      ? 'Weak signal: noticeably uneven between related benchmarks — in the next 10 % of scored models.'
      : 'No tag: results are about as consistent between related benchmarks as most models.';
  const [top, ...rest] = unevenTopics(report);
  const calm = rest.length ? rest[rest.length - 1] : null;
  const pts = (x) => `${Math.round(x)} percentile point${Math.round(x) === 1 ? '' : 's'}`;
  const detail = top
    ? `Most uneven topic: ${top.category} — its ${top.measured} benchmarks differ by ${pts(top.spread)} on average.`
      + (calm && calm.category !== top.category ? ` Most even: ${calm.category} (${pts(calm.spread)}).` : '')
    : null;
  return { headline, detail, caveat };
}
