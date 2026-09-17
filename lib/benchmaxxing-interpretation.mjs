import { BENCHMAXX_LEVELS } from './benchmaxxing-levels.mjs';

// CR-43.3 (Florian 2026-09-16): the plain-language reading of one model's Benchmaxxing report for the
// expandable row on /benchmaxxing. Every sentence is derived from the report and the published tag level;
// nothing is written per model. CR-69.4 (2026-09-17): the score is the signed gap between public headline boards
// and held-out boards of the same topic, so the reading names the topic that leans furthest either way.

/** Topics with at least one headline/held-out pair, largest gap toward the headline boards first. */
export function topicGapsByLean(report) {
  return [...(report?.topicGaps ?? [])]
    .filter((t) => t.pairs >= 1 && Number.isFinite(t.gap))
    .sort((a, b) => b.gap - a.gap || String(a.category).localeCompare(String(b.category)));
}

/**
 * @param {{ status: string, score: number|null, topicGaps?: {category: string, pairs: number, gap: number}[] }} report
 * @param {"light"|"medium"|"strong"|null} level  the published tag level (CR-74.1 threshold + n ≥ 10 + bootstrap lower bound above zero)
 * @returns {{ headline: string, detail: string|null, caveat: string }}
 */
export function interpretBenchmaxxing(report, level) {
  const caveat = 'A screening flag, not proof of leakage, contamination or intent — a gap can also mean weaker long agent work.';
  if (!report || report.status !== 'scored' || report.score == null) {
    return { headline: 'Not enough headline and held-out benchmarks in shared topics to judge this model.', detail: null, caveat };
  }
  // CR-74.1: one sentence per level, thresholds from the shared level table.
  const [light, medium, strong] = BENCHMAXX_LEVELS;
  const headline = level === 'strong'
    ? `Very strong signal: ranks clearly higher on famous public benchmarks than on held-out ones — a score of +${strong.min} or more, and the gap stays above zero when its benchmarks are resampled.`
    : level === 'medium'
      ? `Medium signal: ranks higher on famous public benchmarks than on held-out ones — a score from +${medium.min} to below +${strong.min}, gap above zero when resampled.`
      : level === 'light'
        ? `Light signal: leans toward famous public benchmarks over held-out ones — a score from +${light.min} to below +${medium.min}, gap above zero when resampled.`
      : Number(report.score.toFixed(1)) >= light.min
        ? `No tag: the score reaches +${light.min} or more, but the evidence is too thin to flag it (a tag needs at least 10 comparisons and a gap that stays above zero when its benchmarks are resampled).`
      : report.score > 0
        ? 'No tag: a little better on famous public benchmarks than on held-out ones, but not clearly enough to flag.'
        : 'No tag: no sign of doing better on famous public benchmarks than on held-out ones.';
  const topics = topicGapsByLean(report);
  const pts = (x) => `${Math.abs(Math.round(x))} percentile point${Math.abs(Math.round(x)) === 1 ? '' : 's'}`;
  const lean = (t) => (Math.round(t.gap) === 0 ? `${t.category} (no gap)` : `${t.category} (${pts(t.gap)} ${t.gap > 0 ? 'higher on headline' : 'higher on held-out'} boards)`);
  const detail = topics.length
    ? `Leans most toward headline boards: ${lean(topics[0])}.` + (topics.length > 1 ? ` Least: ${lean(topics[topics.length - 1])}.` : '')
    : null;
  return { headline, detail, caveat };
}
