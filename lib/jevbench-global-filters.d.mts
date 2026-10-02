/** CR-269: typed row metadata and filter state for the JevBench model grid.
 *
 *  `JevV15RowMeta` is the row shape the lead maps each release's systems into
 *  before handing them to `JevV15FilterProvider`. Null means "not reported for
 *  this row" and must stay null — filters never coerce missing values to zero
 *  or guess them from display text.
 */

export type JevV15OpenStatus = 'yes' | 'weights' | 'no' | 'unknown';
export type JevV15RowKind = 'open-weights' | 'open-code' | 'closed' | 'api';
export type JevV15ClassStatus = 'eligible' | 'outside' | 'unknown';
export type JevV15NumericField = 'parameters' | 'developerPrice' | 'basePrice' | 'officialCost' | 'alternativePrice' | 'p50' | 'p95';

export interface JevV15JevClass {
  status: JevV15ClassStatus;
  reason: string | null;
}

export interface JevV15Range {
  min: number | null;
  max: number | null;
}

export interface JevV15RowMeta {
  key: string;
  display: string;
  /** Provider / author as published for the row. */
  provider: string | null;
  /** Family / base-model identifier, only when explicitly supplied for the row. */
  family: string | null;
  /** Model class / type as published (e.g. 'native-logit', 'decision-api'). */
  modelClass: string | null;
  open: JevV15OpenStatus;
  /** Served through a public API (its own selectable model kind), when known. */
  api: boolean | null;
  /** New in this release relative to the previous one. */
  newInVersion: boolean;
  /** Exact parameter count, only when the release records one. */
  parameters: number | null;
  licence: string | null;
  /** Developer / API list price per 1,000 decisions, when present. */
  developerPrice: number | null;
  /** Base-model / reference price per 1,000 decisions, when present. */
  basePrice: number | null;
  /** Official cost per 1,000 decisions used by the release. */
  officialCost: number | null;
  /** Explicit alternative pricing scenario, when present. */
  alternativePrice: number | null;
  /** Adjusted p50 latency in seconds. */
  p50: number | null;
  /** Adjusted p95 latency in seconds. */
  p95: number | null;
  jevClass: JevV15JevClass;
}

export interface JevV15FilterState {
  /** Case-insensitive substring search over name, key, provider, family, class/type and licence. */
  q: string;
  /** Empty means all; a row matches when any of its kinds is selected. */
  kinds: JevV15RowKind[];
  providers: string[];
  families: string[];
  licences: string[];
  onlyNew: boolean;
  parameters: JevV15Range;
  developerPrice: JevV15Range;
  basePrice: JevV15Range;
  officialCost: JevV15Range;
  alternativePrice: JevV15Range;
  p50: JevV15Range;
  p95: JevV15Range;
  /** Empty means all; a row matches when its status is selected. */
  jevClass: JevV15ClassStatus[];
}

export declare const JEVBENCH_FILTER_PREFIX: 'jf-';
export declare const JEV_FILTER_KEYS: Readonly<Record<keyof JevV15FilterState, string>>;
export declare const JEV_ROW_KINDS: readonly JevV15RowKind[];
export declare const JEV_CLASS_STATUSES: readonly JevV15ClassStatus[];
export declare const JEV_NUMERIC_FIELDS: readonly JevV15NumericField[];

export declare function defaultJevFilters(): JevV15FilterState;
export declare function parseJevRange(text: string | null | undefined): JevV15Range;
export declare function formatJevRange(range: JevV15Range | null | undefined): string;
export declare function parseJevFilters(params: URLSearchParams): JevV15FilterState;
export declare function serializeJevFilters(params: URLSearchParams, state: JevV15FilterState): URLSearchParams;
export declare function resetJevFilterParams(params: URLSearchParams): URLSearchParams;
export declare function isJevFilterActive(state: JevV15FilterState): boolean;
export declare function jevRowKinds(row: Pick<JevV15RowMeta, 'open' | 'api'>): JevV15RowKind[];
export declare function matchesJevFilters(row: JevV15RowMeta, state: JevV15FilterState): boolean;
export declare function filterJevRows(rows: JevV15RowMeta[], state: JevV15FilterState): JevV15RowMeta[];
export declare function visibleJevKeys(rows: JevV15RowMeta[], state: JevV15FilterState): Set<string>;
export declare function jevFieldHasValues(rows: JevV15RowMeta[], field: JevV15NumericField): boolean;
export declare function jevHasNewRows(rows: JevV15RowMeta[]): boolean;
export declare function normalizeJevFilters(state: JevV15FilterState, rows: JevV15RowMeta[]): JevV15FilterState;
export declare function distinctJevValues(rows: JevV15RowMeta[], field: 'provider' | 'family' | 'licence'): string[];
