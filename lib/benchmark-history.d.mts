import type { BenchmarkEntry, BenchmarkObservation } from './benchmark-scores.mjs';

export interface BridgePair { model_key: string; subject_name?: string | null; old_value: number; new_value: number; ratio: number }
export interface BridgeSpread { min: number; q1: number; q3: number; max: number; iqr: number; iqr_relative: number | null }
export interface BridgeComparison {
  bridge_count: number; comparable: boolean; reason: string | null; aggregate: number | null;
  spread: BridgeSpread | null; bridges?: BridgePair[];
}
export interface HistoryStateRow {
  benchmark_id: string; model_key: string; model_id: string | null; subject_name: string | null;
  harness: string | null; variant: string | null; value: number; unit: string; basis: string;
  source_url: string | null; source_retrieved_at: string | null;
}
export interface HistoryState {
  schema_version: 1; state_id: string; source: string; collected_at: string; content_sha256: string;
  count: number; benchmark_ids: string[]; rows: HistoryStateRow[];
}
export interface HistoryIndex { schema_version: 1; index_hash: string; states: { state_id: string; source: string; collected_at: string; content_sha256: string; count: number; benchmark_ids: string[]; file: string }[] }
export interface HistoryStore { schema_version: 1; index_hash: string | null; states: HistoryState[] }
export interface HistoricalEstimate {
  id: string; benchmark_id: string; family: string; source_benchmark_id: string; source_state_id: string | null;
  model_id: string | null; subject_name: string | null; harness: string | null; variant: string | null; cohort: string | null;
  unit: string | null; higher_better: boolean | null;
  method: 'bridge-median-ratio' | 'bridge-rank-shift' | 'recompute-required';
  status: 'estimated' | 'not_comparable' | 'recompute_required';
  source_value: number; value: number | null;
  uncertainty: { lower: number; upper: number; min: number; max: number; iqr: number; iqr_relative: number | null } | null;
  comparison: { bridge_count: number; aggregate: number | null; spread: BridgeSpread | null; comparable: boolean; reason: string | null; bridges: BridgePair[] };
  source: { url: string | null; retrieved_at: string | null; published_at: string | null; file: string | null; locator: string | null } | null;
  note: string;
}
export interface HistoricalResults {
  schema_version: 1; policy: { minBridges: number; maxIqrRelative: number; zeroFloor: number };
  states: { state_id: string; source: string; collected_at: string; content_sha256: string; count: number; benchmark_ids: string[] }[];
  counts: { estimated: number; not_comparable: number; recompute_required: number };
  estimates: HistoricalEstimate[];
}

export const HISTORY_SCHEMA_VERSION: 1;
export const BRIDGE_POLICY: { minBridges: number; maxIqrRelative: number; zeroFloor: number };
export const ESTIMATE_STATUS: string[];
export function modelKey(o: Pick<BenchmarkObservation, 'subject'>): string;
export function versionRank(entry: Pick<BenchmarkEntry, 'version'> & { first_seen?: string }): number;
export function buildState(observations: BenchmarkObservation[], meta: { state_id: string; source: string; collected_at: string }): HistoryState;
export function computeBridgeComparison(pairs: { model_key: string; subject_name?: string | null; old_value: number | null; new_value: number | null }[]): BridgeComparison;
export function computeRankShift(oldValues: { value: number }[], newValues: { value: number }[], pairs: { old_value: number; new_value: number }[]): { bridge_count: number; comparable: boolean; shift: number | null; spread: BridgeSpread | null; reason: string | null };
export function estimateFromRankShift(sourceValue: number, oldValues: { value: number }[], newValues: { value: number }[], comparison: { shift: number }): number;
export function crossVersionEstimates(observations: BenchmarkObservation[], registry: { entries: BenchmarkEntry[] }): HistoricalEstimate[];
export function datedEstimates(observations: BenchmarkObservation[], registry: { entries: BenchmarkEntry[] }, states: HistoryState[]): HistoricalEstimate[];
export function buildHistoricalEstimates(input: { observations: BenchmarkObservation[]; registry: { entries: BenchmarkEntry[] }; history?: HistoryStore | null }): HistoricalResults;
