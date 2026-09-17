export type TopicGap = { category: string; pairs: number; gap: number };
export function topicGapsByLean(report: { topicGaps?: TopicGap[] } | null | undefined): TopicGap[];
export function interpretBenchmaxxing(
  report: { status: string; score: number | null; topicGaps?: TopicGap[] } | null | undefined,
  level: 'strong' | 'weak' | null,
): { headline: string; detail: string | null; caveat: string };
