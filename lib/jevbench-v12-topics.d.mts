export type JevTopicCell = { n: number; attempted: number; correct: number; accuracy: number | null };
export type JevTopic = { key: string; label: string; short: string; covers: string; n: number; byTier: Record<string, number> };
export type JevTopicsView = { sha256: string; minAttempted: number; note: string; topics: JevTopic[]; systems: Record<string, Record<string, JevTopicCell>> };
export const JEVBENCH_V12_TOPICS_ARTIFACT: string;
export const JEVBENCH_V12_TOPICS_SHA256: string;
export const TOPIC_SHORT: Record<string, string>;
export function validateJevbenchV12Topics(artifact: any, v12: any): any;
export function readJevbenchV12Topics(v12: any, root?: string): Promise<{ artifact: any; sha256: string }>;
export function jevbenchV12TopicsView(data: { artifact: any; sha256: string }): JevTopicsView;
