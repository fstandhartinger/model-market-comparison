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
    is_reasoning?: boolean | null;
    commercial_allowed?: boolean | null;
    license_name?: string | null;
    license_url?: string | null;
    huggingface_url?: string | null;
    source_huggingface_url?: string | null;
    metadata_correction?: string;
    openrouter_api_id?: string | null;
    context_window_tokens?: number | null;
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
}

export interface Dataset {
  generated_at: string;
  counts: { models: number; families: number; providers: number; offers: number };
  sources: Record<string, string>;
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
  composite: "Composite (coverage-neutral percentiles, 0–100)",
  aa_coding_index: "ArtificialAnalysis — Coding Index",
  aa_coding_agent: "ArtificialAnalysis — Coding Agent Index (median harness)",
  aa_intelligence_index: "ArtificialAnalysis — Intelligence Index",
  designarena_frontend: "DesignArena — Agentic Web Dev (Frontend) Elo",
  designarena_fullstack: "DesignArena — Agentic Web Dev (Full-Stack) Elo",
};
