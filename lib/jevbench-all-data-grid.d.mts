import type { JevV15Artifact, JevV15System, JevV15NotMeasured } from './jevbench-v15-preview.mjs';
import type { CompareCategories } from './jevbench-categories.mjs';
import type { JevClassResult } from './jevbench-jev-class.mjs';

export type JevV15AllDataCell = number | string | boolean | null;

export type JevV15AllDataColumn = {
  id: string;
  label: string;
  group: string;
  kind: 'number' | 'text' | 'boolean';
  style: 'p1' | 'p2' | 'p3' | 'int' | 'secs' | 'usd' | 'signed' | 'mult' | 'text' | 'bool';
  title?: string;
  visible: boolean;
  lockVisible: boolean;
};

export type JevV15AllDataRow = {
  key: string;
  system: JevV15System | JevV15NotMeasured;
  notMeasured: boolean;
  values: Record<string, JevV15AllDataCell>;
};

export type JevV15AllDataModel = {
  revision: string;
  headline: string;
  columns: JevV15AllDataColumn[];
  rows: JevV15AllDataRow[];
  revisionNote: string | null;
};

export type JevV15AllDataMetadata = {
  params?: Record<string, number>;
  families?: Record<string, string>;
  firstAdded?: Record<string, string>;
  apiPriceUsdPer1000?: Record<string, number>;
  basePriceUsdPer1000?: Record<string, number>;
  alternativePriceUsdPer1000?: Record<string, number>;
  revisionNotesHref?: Record<string, string>;
};

export type JevV15RevisionLinks = {
  method?: string;
  pricing?: string;
  revisionNotes?: string;
  addenda?: Record<string, string>;
};

export type JevV15AllDataFilter = { id: string; text?: string | null; min?: number | null; max?: number | null };
export type JevV15AllDataSort = { id: string; dir: 'asc' | 'desc' };

export declare const ALL_DATA_BASE_GROUPS: string[];

export declare function buildAllDataModel(input: {
  artifact: JevV15Artifact;
  categoryView?: CompareCategories | null;
  previousKeys?: string[] | null;
  eligibility?: JevClassResult | null;
  metadata?: JevV15AllDataMetadata | null;
}): JevV15AllDataModel;

export declare function columnHasValues(rows: JevV15AllDataRow[], column: JevV15AllDataColumn): boolean;
export declare function matchesFilters(row: JevV15AllDataRow, columns: JevV15AllDataColumn[], filters: JevV15AllDataFilter[]): boolean;
export declare function applyFilters(rows: JevV15AllDataRow[], columns: JevV15AllDataColumn[], filters: JevV15AllDataFilter[]): JevV15AllDataRow[];
export declare function sortRows(rows: JevV15AllDataRow[], columns: JevV15AllDataColumn[], sorts: JevV15AllDataSort[]): JevV15AllDataRow[];
export declare function toCsv(columns: JevV15AllDataColumn[], rows: JevV15AllDataRow[]): string;
export declare function toJson(columns: JevV15AllDataColumn[], rows: JevV15AllDataRow[]): Array<Record<string, JevV15AllDataCell>>;

export declare function baseModelFamilies(benchmark: string, systems?: { key: string; underlying?: string | null }[]): Record<string, string>;
