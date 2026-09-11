import type { Dataset } from './types';
import type { BenchmarkDivergence, BenchmarkMissing } from './benchmark-scores.mjs';
export interface ViewModel { id: string; name: string; org: string; family: string; open: boolean; deprecated: boolean }
export interface ViewScore { id: string; modelId: string | null; subjectId: string; name: string; value: number; basis: string; derived: boolean; source: number; date: string; variant: string | null; lowSample: boolean; battles?: number | null }
export interface ViewStats { n: number; families: number; mean: number | null; sd: number | null; min: number | null; max: number | null }
export interface ViewAxis { id: string; benchmarkId: string; family: string; name: string; version: string; category: string; description: string; unit: string; higherBetter: boolean | null; cohort: string; url: string; scores: ViewScore[]; stats: ViewStats; collection?: { status: string; reason: string; source_url?: string } }
export interface BenchmarkView { models: ViewModel[]; axes: ViewAxis[]; sources: { url: string; date: string; published: string | null; file: string }[]; divergences: BenchmarkDivergence[]; missing: BenchmarkMissing[]; generatedAt: string; registryCount: number; legacyDate: string }
export interface ProfileFlag { axisId: string; scoreId: string; direction: string; value: number; z: number; baseline: number; gap: number; profileN: number; peers: number; peerFamilies: number; mean: number; sd: number }
export const ANOMALY_POLICY: { minPeers: number; minFamilies: number; minProfile: number; peerZ: number; profileGap: number };
export function effectiveBasis(o: { source_basis?: string; basis: string }): string;
export function cohortOf(o: import('./benchmark-scores.mjs').BenchmarkObservation): string;
export function latestScores(rows: ViewScore[], basis?: string): ViewScore[];
export function distribution(axis: ViewAxis, models: ViewModel[]): ViewStats;
export function normalize(value: number | null, stats: ViewStats, higherBetter: boolean | null): number | null;
export function profileAnomalies(view: BenchmarkView, modelId: string): { flags: ProfileFlag[]; eligibleFamilies: number };
export function buildBenchmarkView(ds: Dataset): BenchmarkView;
export function selectBenchmarkView(view: BenchmarkView, modelIds?: string[], axisId?: string | null): BenchmarkView;
