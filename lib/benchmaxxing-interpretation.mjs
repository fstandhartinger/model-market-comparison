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
 * @param {{ status: string, score: number|null, topicGaps?: {category: string, pairs: number, gap: number}[], parts?: {jaggedness: number|null, jaggednessMean: number|null, jaggednessTerm: number} }} report
 * @param {"light"|"medium"|"strong"|null} level  the published tag level (CR-74.1 thresholds; CR-77.1: the score alone decides)
 * @param {string|null} [uncertain]  CR-77.2: why the tag rests on thin evidence, appended to the reading
 * @returns {{ headline: string, detail: string|null, caveat: string }}
 */
export function interpretBenchmaxxing(report, level, uncertain = null) {
  const caveat = 'A screening flag, not proof of leakage, contamination or intent — a gap can also mean weaker long agent work.';
  if (!report || report.status !== 'scored' || report.score == null) {
    return { headline: 'Not enough headline and held-out benchmarks in shared topics to judge this model.', detail: null, caveat };
  }
  // CR-74.1: one sentence per level, thresholds from the shared level table. CR-77.1: the score alone decides the
  // level; CR-77.2 appends why the evidence behind it is thin, when it is.
  const [light, medium, strong] = BENCHMAXX_LEVELS;
  const caveatTail = uncertain ? ` ${uncertain}.` : '';
  // CR-78.2: the score has two parts, so the reading names both — the headline/held-out gap and the within-topic unevenness.
  const headline = level === 'strong'
    ? `Very strong signal: ranks clearly higher on famous public benchmarks than on held-out ones, or unusually unevenly across boards of one topic — a score of +${strong.min} or more.${caveatTail}`
    : level === 'medium'
      ? `Medium signal: ranks higher on famous public benchmarks than on held-out ones, or more unevenly within topics than the catalog — a score from +${medium.min} to below +${strong.min}.${caveatTail}`
      : level === 'light'
        ? `Light signal: leans toward famous public benchmarks over held-out ones, or ranks a little unevenly within topics — a score from +${light.min} to below +${medium.min}.${caveatTail}`
      : report.score > 0
        ? 'No tag: a little better on famous public benchmarks than on held-out ones, but not clearly enough to flag.'
        : 'No tag: no sign of doing better on famous public benchmarks than on held-out ones.';
  const topics = topicGapsByLean(report);
  const pts = (x) => `${Math.abs(Math.round(x))} percentile point${Math.abs(Math.round(x)) === 1 ? '' : 's'}`;
  const lean = (t) => (Math.round(t.gap) === 0 ? `${t.category} (no gap)` : `${t.category} (${pts(t.gap)} ${t.gap > 0 ? 'higher on headline' : 'higher on held-out'} boards)`);
  const jag = report.parts;
  const jaggedTail = jag && jag.jaggedness != null && jag.jaggednessMean != null
    ? ` Within-topic unevenness ${jag.jaggedness.toFixed(1)} against a catalog average of ${jag.jaggednessMean.toFixed(1)} (${jag.jaggednessTerm >= 0 ? '+' : ''}${jag.jaggednessTerm.toFixed(1)} of the score).`
    : '';
  const detail = topics.length
    ? `Leans most toward headline boards: ${lean(topics[0])}.` + (topics.length > 1 ? ` Least: ${lean(topics[topics.length - 1])}.` : '') + jaggedTail
    : (jaggedTail ? jaggedTail.trim() : null);
  return { headline, detail, caveat };
}
