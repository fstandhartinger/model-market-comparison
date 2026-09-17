import type { BenchmarkView } from './benchmark-view.mjs';

export const MIN_OVERLAP: number;
export const MIN_ABS_R: number;
export const DECILE_MIN_PEERS: number;
export const DECILE_MIN_AXES: number;
export const DECILE_MIN_FAMILIES: number;

export interface FitStats {
  n: number; r: number; r2: number; slope: number; intercept: number;
  meanX: number; meanY: number; sxx: number; rss: number; residSd: number;
  minX: number; maxX: number;
}
export interface Interval { point: number; half: number; low: number; high: number }
export interface AxisShort { axisId: string; benchmarkId: string; name: string; version: string; cohort: string; unit: string }
export interface TargetMeta extends AxisShort { higherBetter: boolean | null; category: string; publishedRange: [number, number] | null; observedRange: [number, number] | null }
export interface ModelRef { id: string; name: string; org: string }

export interface GapPredictionBase {
  point: number; low: number; high: number; half: number;
  predictor: AxisShort; predictorValue: number; outsideFitRange: boolean;
  n: number; r: number; r2: number;
}
export interface ModelGapPrediction extends GapPredictionBase { target: TargetMeta }
export interface AxisGapPrediction extends GapPredictionBase { model: ModelRef }
export interface GapPrediction extends GapPredictionBase { target: TargetMeta; model: ModelRef }
export interface ModelGapResult { model: ModelRef; predictions: ModelGapPrediction[] }
export interface AxisGapResult { axis: TargetMeta; predictions: AxisGapPrediction[] }
export interface PairSignal { predictor: AxisShort; target: AxisShort; n: number; r: number; r2: number }

export interface DecileAxisInfo {
  axisId: string; benchmarkId: string; name: string; version: string; cohort: string; unit: string;
  higherBetter: boolean; family: string; category: string; n: number; k: number;
  models: { modelId: string; name: string; org: string; value: number }[];
}
export interface DecileRecord {
  axisId: string; name: string; version: string; cohort: string; unit: string;
  family: string; category: string; value: number; n: number; higherBetter: boolean;
}
export interface DecileAggregate { modelId: string; name: string; org: string; count: number; families: string[]; detail: DecileRecord[] }
export interface DecileResult {
  perAxis: Map<string, DecileAxisInfo>;
  perModel: Map<string, DecileRecord[]>;
  aggregate: DecileAggregate[];
}

export function measuredAxisMaps(view: BenchmarkView): Map<string, Map<string, number>>;
export function evidencedAxisMaps(view: BenchmarkView): Map<string, Map<string, number>>;
export function observedRange(map?: Map<string, number>): [number, number] | null;
export function fitPair(xs: number[], ys: number[]): FitStats | null;
export function predictionInterval(x: number, st: FitStats): Interval;
export function computePairStats(maps: Map<string, Map<string, number>>, opts?: { minOverlap?: number; minAbsR?: number }): Map<string, FitStats>;
export function predictForModel(view: BenchmarkView, maps: Map<string, Map<string, number>>, evid: Map<string, Map<string, number>>, stats: Map<string, FitStats>, modelId: string, opts?: { limit?: number }): ModelGapResult | null;
export function predictForAxis(view: BenchmarkView, maps: Map<string, Map<string, number>>, evid: Map<string, Map<string, number>>, stats: Map<string, FitStats>, axisId: string, opts?: { limit?: number }): AxisGapResult | null;
export function topPairs(view: BenchmarkView, stats: Map<string, FitStats>, opts?: { limit?: number; minN?: number }): PairSignal[];
export function topPredictions(view: BenchmarkView, maps: Map<string, Map<string, number>>, evid: Map<string, Map<string, number>>, stats: Map<string, FitStats>, opts?: { limit?: number }): GapPrediction[];
export function bottomDecileTags(view: BenchmarkView, opts?: { minPeers?: number; minAxes?: number; minFamilies?: number }, maps?: Map<string, Map<string, number>>): DecileResult;
export type BenchmaxxingTier = 'headline' | 'heldout' | 'domain' | 'secondary' | 'aggregate' | 'judged';
export interface RadarAxis { id: string; name: string; version: string; category: string; value: number | null; missing: boolean; unit: string; nativeValue?: number | null; observedDate?: string | null; tier: BenchmaxxingTier; side: 'headline' | 'heldout' | null }
export interface BenchmaxxingPair {
  category: string;
  headline: { id: string; name: string; version: string };
  heldout: { id: string; name: string; version: string };
  headlinePercentile: number;
  heldoutPercentile: number;
  /** headlinePercentile − heldoutPercentile, both ranked among the pair's common cohort. */
  gap: number;
  cohort: number;
}
export interface BenchmaxxingReport {
  status: 'scored' | 'insufficient-coverage';
  /** CR-69.2: mean signed headline − held-out gap, shrunk toward zero; null below the coverage rule. */
  score: number | null;
  rawScore: number | null;
  coverage: number;
  profile: { modelId: string; axes: RadarAxis[]; measured: number; total: number };
  domainSpecialization: number | null;
  /** n = distinct headline boards + distinct held-out boards in the model's pairs − 1. */
  comparisons: number;
  topics: number;
  headlineBoards: number;
  heldoutBoards: number;
  pairCount: number;
  topicGaps: { category: string; pairs: number; gap: number }[];
  drivers: { positive: BenchmaxxingPair[]; negative: BenchmaxxingPair[] };
  rule: { minComparisons: number; minTopics: number };
  shrinkage?: { priorMean: number; k: number };
  interval?: { lower: number; upper: number; level: number; replicates: number } | null;
}
export const BENCHMAXX_TIERS: readonly BenchmaxxingTier[];
export const BENCHMAXX_TIER_TABLE: { version: string; note: string; tiers: Record<string, { tier: BenchmaxxingTier; reason: string; domain?: string }> };
export function benchmaxxingTier(axis: { family?: string; version?: string; benchmaxxingTier?: BenchmaxxingTier }): { tier: BenchmaxxingTier; reason: string; domain?: string | null; untiered?: boolean };
export function benchmaxxingSide(axis: BenchmarkView['axes'][number]): 'headline' | 'heldout' | null;
export const BENCHMAXX_MIN_COMPARISONS: number;
export const BENCHMAXX_TAG_MIN_COMPARISONS: number;
export const BENCHMAXX_PAIR_MIN_MODELS: number;
export const BENCHMAXX_MIN_TOPICS: number;
export const BENCHMAXX_MIN_SHRINK: number;
export const BENCHMAXX_MAX_SHRINK: number;
export const BENCHMAXX_TAG_SHARE: number;
export const BENCHMAXX_WEAK_SHARE: number;
export function percentileFor(axis: BenchmarkView['axes'][number], modelId: string): number | null;
export function percentileCohortSize(axis: BenchmarkView['axes'][number]): number;
export function groupedRadarProfile(view: BenchmarkView, modelId: string): BenchmaxxingReport['profile'];
export function scoreBenchmaxxing(view: BenchmarkView, modelId: string, opts?: { minComparisons?: number; minTopics?: number }): BenchmaxxingReport;
export function benchmaxxingPrior(view: BenchmarkView): { mean: number; catalogMean: number | null; shrink: number; eligible: number };
export const BENCHMAXX_BOOTSTRAP_REPLICATES: number;
export const BENCHMAXX_INTERVAL: number;
export function benchmaxxingInterval(view: BenchmarkView, modelId: string, opts?: { replicates?: number; level?: number }): { lower: number; upper: number; level: number; replicates: number } | null;
export type BenchmaxxingBanded = { id: string; band: 'strong' | 'weak'; passes: boolean };
export function benchmaxxingSignals(view: BenchmarkView, modelIds?: Iterable<string> | null): { reports: [string, BenchmaxxingReport][]; tagged: Set<string>; weak: Set<string>; average: number | null; banded: BenchmaxxingBanded[] };
export function benchmaxxingFamilySignals(view: BenchmarkView): { reports: [string, BenchmaxxingReport][]; tagged: Set<string>; taggedFamilies: Set<string>; weak: Set<string>; weakFamilies: Set<string>; representatives: Map<string, string>; variantsOf: (id: string) => number; average: number | null; banded: BenchmaxxingBanded[] };
export function isCapabilityAxis(axis: { kind?: string; category?: string }): boolean;
