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
