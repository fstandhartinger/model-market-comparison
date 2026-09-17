export const FALLBACK_OUTPUT_TOKENS: number;
export const FALLBACK_IO_RATIO: number;
export const INPUT_ONLY: number;
export const FIXED_BLENDS: { value: number; label: string }[];
export const DEFAULT_BLEND: number;
export interface EffectiveCostInputs {
  input_per_1m?: number | null;
  output_per_1m?: number | null;
  cache_read_per_1m?: number | null;
  cache_write_per_1m?: number | null;
  output_tokens_per_task?: number | null;
  input_output_ratio?: number | null;
  cache_hit_rate?: number | null;
  cache_write_tokens?: number | null;
}
export interface EffectiveCostResult {
  effective_cost_per_task: number | null;
  effective_cost_per_1m_tokens: number | null;
  inputs: Required<EffectiveCostInputs> & { input_tokens_per_task: number };
  terms: { uncached_input: number; cached_input: number; cache_write: number; output: number } | null;
  assumptions: string[];
  estimated: boolean;
}
export function effectiveCost(values?: EffectiveCostInputs): EffectiveCostResult;
export const CACHE_BASELINE_MIN_ENDPOINTS: number;
export const CACHE_BASELINE_MAX_AGE_DAYS: number;
export interface CacheHitBaseline {
  value: number; endpoints: number; basis: "derived"; source: string; url: string;
  collected_from: string; collected_to: string; definition: string;
}
export function cacheHitBaseline(efficiency: unknown, generatedAt: string): CacheHitBaseline | null;
export function fixedCost(input: number | null | undefined, output: number | null | undefined, inputWeight?: number): { value: number | null; assumptions: string[]; inputWeight: number };
export const CACHE_READ_RATIO_EXCEPTIONS: Readonly<Record<string, string>>;
export const CACHE_READ_RATIO_BAND: number;
export function cacheReadPriceOutliers(models: Array<{ id: string; family_key?: string; offers?: Array<{ platform?: string; provider?: string; input_per_1m?: number | null; cache_read_per_1m?: number | null }> }>, minOffers?: number): Array<{ provider: string; model_id: string; read_to_input: number; provider_median: number; documented: string | null }>;
