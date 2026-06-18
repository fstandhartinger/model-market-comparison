export interface Benchmarks {
  aa_intelligence_index?: number | null;
  aa_coding_index?: number | null;
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
  region: string;
  unit: string; // "per_1m_token" | "per_request"
  estimated?: boolean;
  notes?: string;
  or_model_id?: string;
  status?: number | null;
}

export interface CopilotPricing {
  multiplier: number | null;
  usd_per_request: number | null;
  notes?: string;
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
}

export interface Dataset {
  generated_at: string;
  counts: { models: number; families: number; providers: number; offers: number };
  sources: Record<string, string>;
  models: ModelRow[];
  providers: {
    platform: string; provider: string; model_count: number;
    eu_hosted?: boolean; non_us?: boolean; country?: string | null; note?: string; coming_soon?: boolean;
  }[];
}

export type ScoreKey =
  | "composite"
  | "aa_coding_index"
  | "aa_intelligence_index"
  | "designarena_frontend"
  | "designarena_fullstack";

export const SCORE_LABELS: Record<ScoreKey, string> = {
  composite: "Composite (blended, 0–100)",
  aa_coding_index: "ArtificialAnalysis — Coding Index",
  aa_intelligence_index: "ArtificialAnalysis — Intelligence Index",
  designarena_frontend: "DesignArena — Agentic Web Dev (Frontend) Elo",
  designarena_fullstack: "DesignArena — Agentic Web Dev (Full-Stack) Elo",
};
