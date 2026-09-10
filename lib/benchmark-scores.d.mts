export type MissingStatus = 'unknown' | 'not_tested' | 'not_published' | 'source_unreachable' | 'contested';
export interface ScoreSource { url: string; retrieved_at: string; published_at: string | null; sha256: string; file: string; locator: string }
export interface BenchmarkEntry { id: string; family: string; version: string; name: string; category: string; one_sentence_description: string; scoring: { metric: string; unit: string; range: [number | null, number | null]; higher_better: boolean | null; notes: string }; [key: string]: unknown }
export interface BenchmarkObservation {
  id: string; benchmark_id: string; subject: { source_id: string; name: string; model_id: string | null; variant: string | null; harness: string | null };
  value: number; unit: string; basis: 'measured' | 'self_reported' | 'derived'; source_basis?: 'measured' | 'self_reported'; derivation?: { formula: string; inputs: number[] }; source: ScoreSource; supporting_sources?: ScoreSource[]; protocol: string; comparison_key: string | null; comparison_note?: string;
}
export interface BenchmarkMissing { model_id: string; benchmark_id: string; status: MissingStatus; reason: string; source: ScoreSource }
export interface BenchmarkCollection { benchmark_id: string; status: 'collected' | 'not_published' | 'source_unreachable' | 'contested' | 'manual_required'; reason: string; source_url: string }
export interface BenchmarkDivergence {
  id: string; model_id: string; benchmark_id: string; basis: 'derived'; self_reported_id: string; measured_id: string;
  self_reported_value: number; measured_value: number; delta: number; unit: string; relative_percent: number | null;
  formula: string; comparison_key: string; source_urls: string[]; source_dates: string[];
}
export interface BenchmarkResults {
  schema_version: 1; registry: BenchmarkEntry[]; observations: BenchmarkObservation[]; missing: BenchmarkMissing[];
  collections: BenchmarkCollection[]; rejected: unknown[]; divergences: BenchmarkDivergence[];
  coverage: { by_model: Record<string, Record<string, number>>; by_benchmark: Record<string, Record<string, number>>; note: string };
}
export const MISSING_STATUSES: MissingStatus[];
export function benchmarkCell(results: BenchmarkResults, modelId: string, benchmarkId: string): { model_id: string; benchmark_id: string; status: MissingStatus | 'available'; reason?: string; observations: BenchmarkObservation[]; source?: ScoreSource; source_url?: string | null };
export function computeDivergences(observations: BenchmarkObservation[]): BenchmarkDivergence[];
