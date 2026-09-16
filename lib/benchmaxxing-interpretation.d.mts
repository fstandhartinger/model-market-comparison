export type TopicSpread = { category: string; measured: number; spread: number };
export function unevenTopics(report: { topicSpread?: TopicSpread[] } | null | undefined): TopicSpread[];
export function interpretBenchmaxxing(
  report: { status: string; score: number | null; topicSpread?: TopicSpread[] } | null | undefined,
  level: 'strong' | 'weak' | null,
): { headline: string; detail: string | null; caveat: string };
