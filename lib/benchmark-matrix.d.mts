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
  /** Registry scoring range, [min, max] (null ends are open); null for model-row indices. */
  range?: [number | null, number | null] | null;
}
export const COMPOSITE_MIN_ROWS: number;
export function scoreRowSubtitle(score: string, shortLabel: string): string;
export function compatibleRow(row: Pick<MatrixRow, "unit" | "higherBetter" | "range">): boolean;
export function categoryComposite<R extends Pick<MatrixRow, "unit" | "higherBetter" | "range" | "name">>(entries: { row: R; vals: (number | null)[] }[], columns: number): { values: (number | null)[]; rows: R[]; excluded: number };
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
export function cellHref(row: MatrixRow, modelId: string, models: string[], pinned: boolean): string;
export function groupOf(key: string, category: string | null, taxonomy: unknown): string;
export function rowTags(key: string, maintainer: string | null, taxonomy: unknown): string[];
export interface ChartScale { kind: 'bar' | 'log' | 'position'; domain: [number, number]; positions: (number | null)[] }
export function chartScale(values: (number | null)[], unit: string): ChartScale | null;
export function chartRows(rows: MatrixRow[], columns: Map<number, number | null>[]): { row: MatrixRow; vals: (number | null)[] }[];
export const IMPORTANT_TAGS: Set<string>;
export function importantMatrix(matrix: BenchmarkMatrix, modelIds?: string[] | null): BenchmarkMatrix;
export function buildBenchmarkMatrix(view: unknown, ds: unknown, taxonomy: unknown): BenchmarkMatrix;
