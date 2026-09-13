export interface ComparisonValue { value: number; approximate: boolean; coverage?: number }
export interface ComparisonAxis { id: string; name: string; category: string; unit: string; higherBetter: boolean; values: Record<string, ComparisonValue>; stats: { n: number; min: number; max: number } }
export interface ComparisonCategory { id: string; label: string; benchmarkCount: number; values: Record<string, ComparisonValue> }
export interface BenchmarkComparison { axes: ComparisonAxis[]; categories: ComparisonCategory[] }
export function buildBenchmarkComparison(view: import('./benchmark-view.mjs').BenchmarkView): BenchmarkComparison;
