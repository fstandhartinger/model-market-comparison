export type TopicGap = { category: string; pairs: number; gap: number };
export function topicGapsByLean(report: { topicGaps?: TopicGap[] } | null | undefined): TopicGap[];
export function interpretBenchmaxxing(
  report: { status: string; score: number | null; topicGaps?: TopicGap[];
    /** CR-78.2: the jaggedness half of the published score, named in the reading. */
    parts?: { jaggedness: number | null; jaggednessMean: number | null; jaggednessTerm: number } } | null | undefined,
  level: 'light' | 'medium' | 'strong' | null,
  /** CR-77.2: why the tag rests on thin evidence; appended to the headline sentence. */
  uncertain?: string | null,
): { headline: string; detail: string | null; caveat: string };
