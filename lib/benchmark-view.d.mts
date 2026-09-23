import type { Dataset } from './types';
import type { BenchmarkDivergence, BenchmarkMissing } from './benchmark-scores.mjs';
export interface ViewModel { id: string; name: string; org: string; family: string; familyName?: string | null; variant?: string | null; released?: string | null; variantCount?: number; open: boolean; deprecated: boolean; historical?: boolean; outputTps?: number | null; ttftS?: number | null; contextTokens?: number | null }
export interface ViewScore { id: string; modelId: string | null; subjectId: string; name: string; value: number; basis: string; derived: boolean; source: number; date: string; variant: string | null; harness?: string | null; confidenceInterval?: { level: number; lower: number; upper: number } | null; costPerRollout?: number | null; publishedStddev?: number | null; sampleSize?: number | null; lowSample: boolean; battles?: number | null; variantId?: string; variantLabel?: string; bestOf?: number; percentile?: number }
export interface ViewPublicationScope { published_tasks: number; runs_per_task: number; configurations: number; rollouts: number; note: string }
export interface ViewEstimateSpread { min: number; q1: number; q3: number; max: number; iqr: number; iqr_relative: number }
export interface ViewEstimateUncertainty { lower: number; upper: number; min: number; max: number; iqr: number; iqr_relative: number }
export interface ViewEstimate {
  id: string; modelId: string | null; name: string; benchmarkId: string; sourceBenchmarkId: string; sourceStateId: string | null;
  value: number | null; unit: string | null; higherBetter: boolean | null; status: string; method: string;
  cohort: string | null; harness: string | null; variant: string | null;
  bridgeCount: number; aggregate: number | null; spread: ViewEstimateSpread | null; reason: string | null;
  sourceValue: number | null; uncertainty: ViewEstimateUncertainty | null; note: string | null;
  source: { url: string | null; retrieved_at: string | null; published_at: string | null; file: string | null; locator: string | null } | null;
}
export interface ViewStats { n: number; families: number; mean: number | null; sd: number | null; min: number | null; max: number | null }
export interface ViewAxis { id: string; benchmarkId: string; family: string; name: string; version: string; category: string; description: string; unit: string; higherBetter: boolean | null; publishedRange?: [number | null, number | null] | null; cohort: string; url: string; scores: ViewScore[]; percentileN?: number; stats: ViewStats; estimates?: ViewEstimate[]; historical?: boolean; /** CR-64: capability | cost | efficiency. */ kind?: string; publicationScope?: ViewPublicationScope | null; detailNote?: string | null; collection?: { status: string; reason: string; source_url?: string } }
export interface BenchmarkView { models: ViewModel[]; axes: ViewAxis[]; /** Radar-only family-scope indices (Epoch ECI); not part of `axes`. */ indexAxes?: ViewAxis[]; sources: { url: string; date: string; published: string | null; file: string }[]; divergences: BenchmarkDivergence[]; missing: BenchmarkMissing[]; generatedAt: string; registryCount: number; legacyDate: string; speedDate?: string | null; families?: CompareFamily[]; picks?: string[] }
export interface ProfileFlag { axisId: string; scoreId: string; direction: string; value: number; z: number; baseline: number; gap: number; profileN: number; peers: number; peerFamilies: number; mean: number; sd: number }
export const ANOMALY_POLICY: { minPeers: number; minFamilies: number; minProfile: number; peerZ: number; profileGap: number };
export const HARNESS_LABELS: Record<string, string>;
export function cohortLabel(cohort: string | null | undefined): string | null | undefined;
export function cohortSubLabel(cohort: string | null | undefined): string | null;
export function effectiveBasis(o: { source_basis?: string; basis: string }): string;
export function cohortOf(o: import('./benchmark-scores.mjs').BenchmarkObservation): string;
export function latestScores(rows: ViewScore[], basis?: string): ViewScore[];
export function distribution(axis: ViewAxis, models: ViewModel[]): ViewStats;
export function normalize(value: number | null, stats: ViewStats, higherBetter: boolean | null): number | null;
export function profileAnomalies(view: BenchmarkView, modelId: string): { flags: ProfileFlag[]; eligibleFamilies: number };
export function buildBenchmarkView(ds: Dataset): BenchmarkView;
export function selectBenchmarkView(view: BenchmarkView, modelIds?: string[], axisId?: string | null): BenchmarkView;
export interface CompareFamily { id: string; name: string; org: string; released: string | null; score: number | null; variants: string[]; current: boolean }
export function familyDisplayName(m: Pick<ViewModel, 'name' | 'familyName'>, variants?: number): string;
export function variantLabel(m: Pick<ViewModel, 'name' | 'variant'>): string;
export function compareFamilies(view: BenchmarkView): CompareFamily[];
export function selectFamilyBenchmarkView(view: BenchmarkView, modelIds?: string[], axisId?: string | null): BenchmarkView;
