export type BaseModelBenchmark = 'jevbench' | 'imagejevbench';
export type BaseModelStatus = 'disclosed' | 'undisclosed';

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
