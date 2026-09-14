export interface MatrixRow {
  id: string;
  benchmarkId: string | null;
  key: string;
  name: string;
  cohort: string | null;
  description: string;
  unit: string;
  higherBetter: boolean | null;
  group: string;
  tags: string[];
  url: string;
  version: string;
  /** Registry benchmark id for the single-benchmark ranking, or null for model-row indices. */
  ranking: string | null;
}
export interface BenchmarkMatrix {
  version: string;
  groups: { id: string; label: string }[];
  tags: Record<string, { label: string; tip: string }>;
  rows: MatrixRow[];
  /** modelId → [row index, value, basis (0 measured, 1 self-reported, 2 other)] */
  values: Record<string, [number, number, number][]>;
  generatedAt: string;
}
export function baseKey(id: string): string;
export function rowBars(values: (number | null)[], higherBetter: boolean | null, unit: string): (number | null)[];
export function rowWinners(values: (number | null)[], higherBetter: boolean | null): boolean[];
export function formatValue(value: number | null, unit: string): string;
export function resultHref(axisId: string, modelId: string, models: string[], pinned: boolean): string;
export function groupOf(key: string, category: string | null, taxonomy: unknown): string;
export function rowTags(key: string, maintainer: string | null, taxonomy: unknown): string[];
export function buildBenchmarkMatrix(view: unknown, ds: unknown, taxonomy: unknown): BenchmarkMatrix;
