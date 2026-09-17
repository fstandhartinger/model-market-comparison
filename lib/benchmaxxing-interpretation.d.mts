export type TopicGap = { category: string; pairs: number; gap: number };
export function topicGapsByLean(report: { topicGaps?: TopicGap[] } | null | undefined): TopicGap[];
export function interpretBenchmaxxing(
  report: { status: string; score: number | null; topicGaps?: TopicGap[] } | null | undefined,
  level: 'light' | 'medium' | 'strong' | null,
  /** CR-77.2: why the tag rests on thin evidence; appended to the headline sentence. */
  uncertain?: string | null,
): { headline: string; detail: string | null; caveat: string };
