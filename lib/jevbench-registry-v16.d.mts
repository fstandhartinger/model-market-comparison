import type { CurrentCategoryArtifact, CurrentCategoryMeasurement } from './jevbench-categories-v16.mjs';
import type { LanguageSystem } from './jevbench-languages-v16.mjs';
export type StoredPublicAggregate = { raw: string; sha256: string };
export type V16ProjectionInput = {
  registry: StoredPublicAggregate; release: StoredPublicAggregate; bindings: StoredPublicAggregate;
  categories: StoredPublicAggregate; languages: StoredPublicAggregate; origins: Record<string, StoredPublicAggregate>;
};
export type V16MeasurementBinding = {
  key: string; status: 'current' | 'carry'; measurement_revision: string; method_version: string;
  model_version: string; model_pin: string; measured_on: string | null;
  origin_sha256: string; score_row_sha256: string; scorer_sha256: string; cohort_sha256: string;
  serving: { lane: 'api' | 'selfhosted'; endpoint_kind: string; endpoint_condition: string | null; api_flag: boolean };
  cost_rank_eligible: boolean; cost_admission_sha256: string | null;
};
export type V16PriceBar = { role: 'served_cost' | 'base_model_reference' | 'developer_api_list';
  usd_per_1000: number | null; kind: string; basis: string; ranking_eligible: boolean; source_sha256?: string };
export type V16ProjectedRow = {
  key: string; display: string; status: 'current' | 'carry' | 'metadata-unavailable' | 'unmeasured'; ranked: boolean;
  catalogue: Record<string, string | boolean | null>; registration: { display: string; author: string | null; lane: 'api' | 'selfhosted'; endpoint_kind: string; support: Record<'choice' | 'noul' | 'score', string> } | null; measurement: V16MeasurementBinding | null;
  axes: Record<'intelligence' | 'calibration' | 'speed' | 'cost', number | null>; composite: number | null;
  capability: number | null; headline_eligible: boolean; eligibility_reasons: string[];
  cost: { kind: string; usd_per_1000: number | null; basis: string; cost_rank_eligible: boolean; bars: V16PriceBar[];
    admission_sha256?: string | null; serving_lane?: 'api' | 'selfhosted'; usage_estimated_rows?: number };
  speed: { p50_s_adjusted: number | null; p50_s_raw?: number | null; p95_s_raw?: number | null;
    p95_s_adjusted?: number | null; n?: number; adjustment?: string } | null;
  categories: (CurrentCategoryMeasurement & { kind: 'current' }) | null; language: LanguageSystem | null;
  historical_price: { kind: string | null; usd_per_1000: number | null; basis: string | null } | null;
  historical_price_scenario: Record<string, string | number | null> | null;
};
export type V16RegistryProjection = {
  revision: 'v1.6.0'; fixture: boolean; catalogue_count: number;
  reference: { key: string; usd_per_1000: number; p50_s_adjusted: number; cost_factor: 2; latency_factor: 2; source_sha256: string };
  reference_origin: { kind: 'jevbench-frozen-capability-reference'; key: string; model_version: string; model_pin: string | null; measurement_revision: string; measured_on: string | null; usd_per_1000: number; p50_s_adjusted: number; cost_factor: 2; latency_factor: 2 };
  rows: V16ProjectedRow[]; capability_order: string[]; composite_order: string[];
  category_descriptors: Pick<CurrentCategoryArtifact, 'topics' | 'usecases' | 'languages'>;
  language_descriptors: unknown[]; category_provenance: CurrentCategoryArtifact['provenance'];
  source_hashes: Record<'registry' | 'release' | 'bindings' | 'categories' | 'languages', string>; approval: null;
};
export function canonicalV16Aggregate(value: unknown): string;
export function projectJevV16Registry(input: V16ProjectionInput, options?: { allowFixture?: boolean }): Promise<V16RegistryProjection>;
