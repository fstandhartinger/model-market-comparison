export const FALLBACK_OUTPUT_TOKENS: number;
export const FALLBACK_IO_RATIO: number;
export const INPUT_ONLY: number;
export const FIXED_BLENDS: { value: number; label: string }[];
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
export function fixedCost(input: number | null | undefined, output: number | null | undefined, inputWeight?: number): { value: number | null; assumptions: string[]; inputWeight: number };
