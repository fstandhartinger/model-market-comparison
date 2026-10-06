export type BaseModelBenchmark = 'jevbench' | 'imagejevbench';
export type BaseModelStatus = 'disclosed' | 'self-reported' | 'undisclosed';

export type BaseModelSource = { url: string; title: string; evidence: string };

export type BaseModelEntry = {
  benchmark: string | null;
  key: string | null;
  status: BaseModelStatus;
  label: string;
  sources: BaseModelSource[];
  note: string | null;
};

export type BaseModelsMetadata = {
  schema_version: number;
  checked_utc: string;
  benchmarks: Record<string, Record<string, { label?: string; status?: string; sources?: unknown; note?: string }>>;
};

export declare const BASE_MODEL_SCHEMA_VERSION: number;
export declare const BASE_MODEL_BENCHMARKS: readonly string[];
export declare const BASE_MODEL_METADATA: BaseModelsMetadata;

export declare function baseModelFor(benchmark: string, key: string | null | undefined, overlay?: BaseModelsMetadata): BaseModelEntry;
export declare function isBaseModelDisclosed(entry: BaseModelEntry): boolean;
export declare function baseModelsForBenchmark(benchmark: string): Record<string, BaseModelEntry>;
export function baseModelFamilies(benchmark: string, systems?: { key: string; underlying?: string | null }[]): Record<string, string>;
export declare const ROUTINE_UNDISCLOSED_NOTE: string;
export declare function baseModelVisibleNote(entry: BaseModelEntry): string | null;
export type BaseModelFootnote = { key: string; n: number; label: string; note: string };
export declare function baseModelFootnotes(benchmark: string, keys: readonly string[]): { notes: BaseModelFootnote[]; index: Map<string, number> };
