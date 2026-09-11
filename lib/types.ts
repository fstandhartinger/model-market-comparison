import type { BenchmarkResults } from "./benchmark-scores.mjs";
export interface Benchmarks {
  aa_intelligence_index?: number | null;
  aa_coding_index?: number | null;
  aa_coding_agent_index?: number | null;
  aa_math_index?: number | null;
  aa_livecodebench?: number | null;
  aa_scicode?: number | null;
  aa_terminalbench_hard?: number | null;
  aa_tau2?: number | null;
  aa_gpqa?: number | null;
  aa_mmlu_pro?: number | null;
}

export interface EfficiencyProvenance {
  source: string;
  url: string;
  collected_at: string;
  basis: "measured" | "self_reported" | "derived" | "assumed";
  source_basis?: "measured" | "self_reported" | "derived" | "assumed";
  scope?: string;
  formula?: string;
}

export interface EfficiencyObservation<T = number> extends EfficiencyProvenance {
  value: T;
  window?: { start_date: string; end_date: string };
  stale?: boolean;
}

export interface EfficiencyAttempt {
  source: string;
  url: string | null;
  collected_at: string | null;
  status: string;
  reason?: string;
  or_model_id?: string | null;
  dimension?: string;
  http_status?: number;
}

export interface TokenEfficiency {
  aa: {
    status: "available" | "not_published_in_collected_payload" | "not_in_aa";
    source_model_id: string | null;
    source_slug: string | null;
    source_variant: string | null;
    tokens_per_task: EfficiencyObservation<{ reasoning: number; answer: number; output: number }> | null;
    canonical_token_counts: EfficiencyObservation<{ input: number; output: number; answer: number; reasoning: number }> | null;
    benchmark_input_output_ratio: (EfficiencyObservation & { interpretation: "benchmark_proxy" }) | null;
  };
  input_output_ratio: EfficiencyObservation & {
    fallback: boolean;
    or_model_id?: string;
    fallback_reason?: string;
    evidence_ref?: string;
    configuration_scope?: string;
    source_updated_at?: string | null;
  };
  attempts: EfficiencyAttempt[];
}

export interface EndpointEfficiency {
  or_model_id: string;
  endpoint_tag: string;
  provider: string;
  endpoint_id: string | null;
  cache_hit_rate: (EfficiencyObservation & {
    total_tokens: number;
    source_provider_name: string;
    source_provider_slug: string;
    summary_window: null;
    chart_date_range: { first: string; last: string } | null;
    definition: string;
  }) | null;
  cache_read_per_1m: EfficiencyObservation | null;
  cache_write_per_1m: EfficiencyObservation | null;
  status: string;
  attempts: EfficiencyAttempt[];
}

export interface EfficiencyDataset {
  schema_version: 1;
  global_io_ratio: EfficiencyObservation & {
    totals: { total_input_tokens: number; total_output_tokens: number; total_requests: number };
    coverage: { returned_rows: number; included_rows: number; excluded_rows: number; included_chutes: number; days: number; selection: string; completeness: string };
  };
  openrouter_endpoints: Record<string, Record<string, EndpointEfficiency>>;
  aa_unmatched: EfficiencyObservation<Array<{ source_id: string; slug: string; name: string; variant: string | null;
    tokens_per_task: { reasoning: number; answer: number; output: number };
    canonical_token_counts: { input: number; output: number; answer: number; reasoning: number };
    derived: { basis: "derived"; input_output_ratio: number; reasoning_output_share: number | null } }>> & { reason: string };
  coverage: Record<string, number>;
}

export interface DesignArenaEntry {
  elo?: number | null;
  winRate?: number | null;
  battles?: number | null;
  modelId?: string;
}

export interface Offer {
  source: string;
  provider: string;
  platform: string;
  input_per_1m: number | null;
  output_per_1m: number | null;
  cache_read_per_1m?: number | null;
  cache_write_per_1m?: number | null;
  internal_reasoning_per_1m?: number | null;
  input_per_1m_eur?: number | null;
  output_per_1m_eur?: number | null;
  currency?: string;
  region: string;
  unit: string; // "per_1m_token" | "per_request"
  estimated?: boolean;
  notes?: string;
  or_model_id?: string;
  or_canonical_slug?: string | null;
  or_hugging_face_id?: string | null;
  status?: number | null;
  endpoint_tag?: string | null;
  quantization?: string | null;
  context_length?: number | null;
  max_completion_tokens?: number | null;
  provider_model_id?: string | null;
  catalog_status?: string | null;
  hosting_class?: string | null;
  pricing_tier?: string | null;
  route_type?: string | null;
  tee?: boolean; // runs in a Trusted Execution Environment (confidential compute)
  eu_hosted?: boolean; // this specific offer/model is served from an EU region
  eu_policy_equivalent?: boolean; // company-approved EU-filter equivalent; not a technical residency guarantee
  non_us?: boolean; // provider company is not US-based (copied from provider metadata)
}

export interface CopilotTokenPricing {
  input_per_1m: number | null;
  cached_input_per_1m: number | null;
  cache_write_per_1m: number | null;
  output_per_1m: number | null;
  release_status?: string;
  feature_status?: string;
  category?: string;
  long_context?: Record<string, unknown> | null;
  promotion_ends_at?: string | null;
  standard_pricing_from?: string | null;
  standard_input_per_1m?: number | null;
  standard_cached_input_per_1m?: number | null;
  standard_cache_write_per_1m?: number | null;
  standard_output_per_1m?: number | null;
  notes?: string;
}

export interface CopilotPricing {
  multiplier: number | null;
  usd_per_request: number | null;
  notes?: string;
  current?: CopilotTokenPricing;
  fast_mode?: CopilotTokenPricing;
}

export interface ModelRow {
  id: string;
  family_key: string;
  family_name: string;
  display_name: string;
  org: string;
  variant: string;
  open_weights: boolean;
  release_date: string | null;
  deprecated?: boolean;
  aa_model_id?: string | null;
  aa_metadata?: {
    available?: boolean;
    is_open_weights?: boolean | null;
    deprecated?: boolean | null;
    is_reasoning?: boolean | null;
    commercial_allowed?: boolean | null;
    license_name?: string | null;
    license_url?: string | null;
    huggingface_url?: string | null;
    source_huggingface_url?: string | null;
    metadata_correction?: string;
    openrouter_api_id?: string | null;
    context_window_tokens?: number | null;
    retained_fields?: Record<string, { source: string; collected_at: string; reason: string }>;
  };
  openrouter_metadata?: {
    id?: string | null;
    canonical_slug?: string | null;
    hugging_face_id?: string | null;
    context_window_tokens?: number | null;
  };
  coding_agent_results?: { harness: string; score: number; source_model_name?: string }[];
  featured: boolean;
  has_benchmark: boolean;
  has_pricing: boolean;
  benchmarks: Benchmarks;
  aa_reference_price: { input_per_1m?: number | null; output_per_1m?: number | null; blended_3to1?: number | null };
  aa_speed: { output_tps?: number | null; ttft_s?: number | null };
  designarena: { frontend?: DesignArenaEntry; fullstack?: DesignArenaEntry };
  copilot: CopilotPricing | null;
  offers: Offer[];
  manual_notes?: string;
  benchmark_override_note?: string;
  designarena_attachment_note?: string;
  token_efficiency?: TokenEfficiency;
}

export interface Dataset {
  benchmark_results: BenchmarkResults;
  generated_at: string;
  counts: { models: number; families: number; providers: number; offers: number };
  sources: Record<string, string>;
  efficiency?: EfficiencyDataset;
  source_status?: Record<string, { version: string; status: string; collected_at?: string; note?: string; count?: number; path?: string; url?: string }>;
  models: ModelRow[];
  providers: {
    platform: string; provider: string; model_count: number;
    eu_hosted?: boolean; eu_dedicated?: boolean; non_us?: boolean; hyperscaler?: boolean;
    country?: string | null; note?: string; coming_soon?: boolean;
  }[];
}

export type ScoreKey =
  | "composite"
  | "aa_coding_index"
  | "aa_coding_agent"
  | "aa_intelligence_index"
  | "designarena_frontend"
  | "designarena_fullstack";

export const SCORE_LABELS: Record<ScoreKey, string> = {
  composite: "Composite (coverage-neutral, dominance-safe percentiles, 0–100)",
  aa_coding_index: "ArtificialAnalysis — Coding Index",
  aa_coding_agent: "ArtificialAnalysis — Coding Agent Index v1.4 (median harness)",
  aa_intelligence_index: "ArtificialAnalysis — Intelligence Index",
  designarena_frontend: "DesignArena — Agentic Web Dev (Frontend) Elo",
  designarena_fullstack: "DesignArena — Agentic Web Dev (Full-Stack) Elo",
};
