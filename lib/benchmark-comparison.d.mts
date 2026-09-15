export interface BridgeSummary { fromDate: string | null; fromBenchmark: string | null; anchors: number | null; hops: number | null; spreadRelative: number | null }
export interface ComparisonValue { value: number; approximate: boolean; coverage?: number; approximateCount?: number; bridge?: BridgeSummary }
export function bridgeSummary(estimate: Record<string, unknown>): BridgeSummary;
export function bridgeDisclosure(value: ComparisonValue | null | undefined): string;
export interface ComparisonAxis { id: string; name: string; label: string; version: string | null; cohort: string | null; category: string; unit: string; higherBetter: boolean; values: Record<string, ComparisonValue>; stats: { n: number; min: number; max: number } }
export interface ComparisonCategory { id: string; label: string; benchmarkCount: number; values: Record<string, ComparisonValue> }
export interface BenchmarkComparison { axes: ComparisonAxis[]; categories: ComparisonCategory[] }
export function buildBenchmarkComparison(view: import('./benchmark-view.mjs').BenchmarkView): BenchmarkComparison;
