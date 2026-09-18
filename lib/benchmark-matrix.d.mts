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
  /** CR-38.2: measured from the catalog's own results; null when the scale has no ceiling or too few models. */
  saturation?: Saturation | null;
  /** CR-38.3: a preference or judge score rather than task accuracy. */
  judged?: boolean;
  /** CR-41.1: the boards (family + version) a best-of row stands for; absent on a plain row. */
  boards?: string[];
  /** CR-41.1: a row merged from agent/version runs of one board — the runs and which one each model's value comes from. */
  bestOf?: { acrossVersions: boolean; variants: { id: string; benchmarkId: string | null; cohort: string | null; version: string }[]; pick: Record<string, number> };
  /** CR-38.2: what the verified source states about the task window and contamination control; null when it states nothing. */
  freshness?: Freshness | null;
  /** The date the benchmark's results were last verified from its source (YYYY-MM-DD). */
  asOf?: string | null;
  /** CR-65.15 D9: the source re-scored or stopped showing these results after our capture. */
  sourceChange?: SourceChange | null;
  /** CR-65.14: the maintainer no longer reports this board (registry `status: "retained"`). A best-of
   *  row is retired only when every version it merges is. */
  retired?: boolean;
}
export interface SourceChange { kind: string; note: string; checkedAt: string | null }
export function sourceChangeOf(key: string, caveats: unknown): SourceChange | null;
export function caveatTip(tag: string, row: Pick<MatrixRow, "sourceChange">, tags: Record<string, { label: string; tip: string }>): string;
export interface Saturation { saturated: boolean; topMean: number; ceiling: number; share: number; models: number; topN: number }
export interface Freshness {
  taskWindow: { from: string; to?: string; label?: string } | null;
  contamination: string | null;
  source: { quote: string; field: string | null } | null;
}
export interface FreshnessDefaults { taskWindowNote: string | null; contaminationNote: string | null }
export function freshnessDefaults(caveats: unknown): FreshnessDefaults;
export const SATURATION_TOP_N: number;
export const SATURATION_MIN_MODELS: number;
export const SATURATION_THRESHOLD: number;
export const SATURATED_WEIGHT: number;
export const CAVEAT_TAGS: string[];
export function scaleCeiling(row: Pick<MatrixRow, "unit" | "range" | "higherBetter">): number | null;
export function saturationOf(values: (number | null)[], row: Pick<MatrixRow, "unit" | "range" | "higherBetter">): Saturation | null;
export function isJudged(key: string, caveats: unknown): boolean;
export function freshnessOf(key: string, caveats: unknown): Freshness | null;
export function versionLine(row: Pick<MatrixRow, "version" | "asOf" | "freshness">): string;
export function cohortLabel(cohort: string | null | undefined): string | null | undefined;
export const COMPOSITE_MIN_ROWS: number;
export function scoreRowSubtitle(score: string, shortLabel: string): string;
export function compatibleRow(row: Pick<MatrixRow, "unit" | "higherBetter" | "range">): boolean;
export function categoryComposite<R extends Pick<MatrixRow, "unit" | "higherBetter" | "range" | "name"> & { judged?: boolean; saturation?: Saturation | null }>(entries: { row: R; vals: (number | null)[] }[], columns: number): { values: (number | null)[]; rows: R[]; excluded: number; judgedExcluded: number; saturated: R[]; kind: "measured" | "judged" };
export interface BenchmarkMatrix {
  version: string;
  groups: { id: string; label: string }[];
  tags: Record<string, { label: string; tip: string }>;
  rows: MatrixRow[];
  /** modelId → [row index, value, basis (0 measured, 1 self-reported, 2 other, 3 preliminary — display only, CR-65.10)] */
  values: Record<string, [number, number, number][]>;
  generatedAt: string;
  freshnessDefaults: FreshnessDefaults;
  /** F-102: boards (family + version) with at least one result in the whole catalog. */
  catalogBoards: number;
}
export function boardId(row: Pick<MatrixRow, "key" | "version">): string;
export function countBoards(rows: Pick<MatrixRow, "key" | "version" | "boards">[]): number;
export function cellVariant(row: Pick<MatrixRow, "bestOf">, modelId: string): { id: string; benchmarkId: string | null; cohort: string | null; version: string } | null;
export function cellAxisId(row: Pick<MatrixRow, "id" | "bestOf">, modelId: string): string;
export function variantLabel(row: Pick<MatrixRow, "bestOf">, modelId: string): string;
export function baseKey(id: string): string;
export function rowBars(values: (number | null)[], higherBetter: boolean | null, unit: string): (number | null)[];
export function rowWinners(values: (number | null)[], higherBetter: boolean | null): boolean[];
export function formatValue(value: number | null, unit: string): string;
export function formatNative(value: number | null, unit: string | null): string;
export function resultHref(axisId: string, modelId: string, models: string[], pinned: boolean): string;
export function cellHref(row: MatrixRow, modelId: string, models: string[], pinned: boolean): string;
export function groupOf(key: string, category: string | null, taxonomy: unknown): string;
export function rowTags(key: string, maintainer: string | null, taxonomy: unknown, caveats?: unknown, saturation?: Saturation | null, status?: string | null): string[];
export function isRetired(status: string | null | undefined): boolean;
export interface ChartScale { kind: 'bar' | 'log' | 'position'; domain: [number, number]; positions: (number | null)[] }
export function chartScale(values: (number | null)[], unit: string): ChartScale | null;
export function chartRows(rows: MatrixRow[], columns: Map<number, number | null>[]): { row: MatrixRow; vals: (number | null)[] }[];
export const IMPORTANT_TAGS: Set<string>;
export function importantMatrix(matrix: BenchmarkMatrix, modelIds?: string[] | null): BenchmarkMatrix;
export function buildBenchmarkMatrix(view: unknown, ds: unknown, taxonomy: unknown, caveats?: unknown): BenchmarkMatrix;
export const OUTLIER_MIN_VALUES: number;
export const OUTLIER_CORE_MULTIPLE: number;
export const OUTLIER_MIN_SHARE: number;
export function rowOutliers(values: (number | null)[], higherBetter: boolean | null): ("top" | "low" | null)[];
export function scoreTypeText(row: { unit: string; higherBetter: boolean | null; range?: readonly (number | null)[] | null }): string;
export function shortlistColumns<T extends { id: string; value: number | null }>(items: T[], unit: string, options?: { zeroBaseline?: boolean }): { columns: (T & { height: number | null; noData: boolean })[]; kind: 'bar' | 'log' | 'position' | 'zoomed' | null; domain: [number, number] | null; ticks: number[] };
export function zoomedScale(values: (number | null)[], unit: string): { kind: 'zoomed'; domain: [number, number]; positions: (number | null)[] } | null;
export function axisTicks(domain: [number, number]): number[];
export function matrixForModels(matrix: BenchmarkMatrix, modelIds: Iterable<string>): BenchmarkMatrix & { catalogRows: number };
