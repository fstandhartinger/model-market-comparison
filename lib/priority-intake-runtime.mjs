// Data for the pre-payment intake check (fast lane). One place to edit when the pod runtime changes.
//
// SOURCES (read 8 Nov 2026, ops/priority-evaluation at 23f7dbd97):
//  - Limits: pod_runner.py MAX_HOURLY_USD = 5.00, PER_ORDER_CAP_USD = 20.0, EXPECTED_ROWS = 1624, TTL_CAP_HOURS = 3.0,
//    GPU_PREFERENCE = H100 80 GB, A100 80 GB, L40S 48 GB, RTX6000 48 GB, RTXPRO6000 96 GB.
//  - Runtime: each order pins its own container image by digest in trusted-runner/POD-RECIPE.json (PREP-OPEN-WEIGHTS-PROMPT.txt);
//    the repo records transformers 5.x pins (5.8.1 ... 5.20.1) and the author's vLLM image. No single vLLM version is pinned.
//    ARCHITECTURES below: the first group is mainstream decoder-only architectures that upstream vLLM and Transformers 5.x serve
//    out of the box; the second group (Qwen3.5 / Gemma 4 / Mistral3 families) was taken from orders that ran on the pod runtime
//    through 8 Nov 2026 (33 paid open-weights repos; flsla-arch.txt in the lead's job folder), plus the Qwen3.5 MoE siblings, which
//    no order has proven yet. Anything else goes to manual review, which is the safe direction. Extend it only after a real order
//    proves an architecture runs.
//  - Weights must be safetensors; pickle (.bin/.pt/.pkl) and trust_remote_code/auto_map weights are not supported
//    unless the repo has a reviewed runtime supplement (native_owner.SUPPLEMENTS; ops/priority-evaluation/test_priority_intake_registry.py
//    keeps REVIEWED_SUPPLEMENT_REPOS in sync with it).
//  - ImageJevBench on open weights runs only for independently reviewed `aplomb_native` recipes (PREP-OPEN-WEIGHTS-PROMPT.txt, item 1).

export const MAX_HOURLY_USD = 5.0;
export const PER_ORDER_CAP_USD = 20.0;

export const ARCHITECTURES = Object.freeze([
  'LlamaForCausalLM', 'MistralForCausalLM', 'MixtralForCausalLM',
  'Qwen2ForCausalLM', 'Qwen2MoeForCausalLM', 'Qwen3ForCausalLM', 'Qwen3MoeForCausalLM',
  'Gemma2ForCausalLM', 'Gemma3ForCausalLM', 'Gemma3ForConditionalGeneration',
  'Phi3ForCausalLM', 'PhiForCausalLM', 'OlmoForCausalLM', 'Olmo2ForCausalLM',
  'GraniteForCausalLM', 'Glm4ForCausalLM', 'SmolLM3ForCausalLM',
  // Taken from orders that ran on the pod runtime through 8 Nov 2026:
  'Qwen3_5ForConditionalGeneration', 'Qwen3_5ForCausalLM', 'Qwen3_5Model',
  'Gemma4ForConditionalGeneration', 'Gemma4UnifiedForConditionalGeneration', 'Gemma4ForCausalLM',
  'Mistral3ForConditionalGeneration',
  // MoE siblings of the Qwen3.5 family (not yet seen in an order; same runtime family):
  'Qwen3_5MoeForConditionalGeneration', 'Qwen3_5MoeForCausalLM', 'Qwen3_5MoeModel',
]);

// LoRA adapter repos: files that mean "more than a plain adapter" (pickled heads, code, scripts) and send the order to review.
export const ADAPTER_CUSTOM_FILE = /\.(pt|pth|bin|pkl|pickle|ckpt|py|sh|so)$/i;

// Hugging Face repos with a reviewed runtime supplement (lowercase org/name). Mirror of native_owner.SUPPLEMENTS (huggingface.co only).
export const REVIEWED_SUPPLEMENT_REPOS = Object.freeze([
  'lycheeai/lychee-27b', 'liqiiiii/jeva-4b', 'guru0381/krino-2b',
  'standardthinking/standardone-8b-sh', 'standardthinking/standardone-3b-sh',
  'ninhnv/chon-1.0-12b', 'oidlabs/cue-reflex-4b', 'sthanika-ai/sieve-31b-v3',
  'kingsoft-office/wps-decision-1', 'torchcast-ai/torchcast-decision-4b',
]);

// GPU cost model (planning constants, not quotes). Conservative on purpose: real marketplace H100/A100 80 GB prices were
// below this, and an over-estimate only sends a borderline order to manual review.
export const GPU_MEMORY_GB = 80;          // H100/A100 80 GB, first entries of GPU_PREFERENCE
export const GPU_HOURLY_USD = 2.0;        // per GPU per hour
export const VRAM_OVERHEAD = 1.2;         // weights x 1.2 for KV cache / activations
export const MAX_GPUS = Math.floor(MAX_HOURLY_USD / GPU_HOURLY_USD); // 2: one pod must stay <= USD 5/h
export const SETUP_HOURS = 1.0;           // image build <= 30 min + weight stream <= 45 min (pod_runner time budget), rounded
export const BASE_INFERENCE_HOURS = 0.5;  // one JevBench pass, 1624 rows, small model
export const INFERENCE_HOURS_PER_BILLION = 0.05; // extra inference time per billion parameters beyond 10 B

export const BYTES_PER_DTYPE = Object.freeze({
  F64: 8, F32: 4, I64: 8, BF16: 2, F16: 2, I32: 4, I16: 2, U16: 2, F8_E4M3: 1, F8_E5M2: 1, F8: 1, I8: 1, U8: 1, BOOL: 1,
});
