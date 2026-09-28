// How a HuggingFace repository identifies a model in this catalog.
//
// D248 (2026-09-28): two catalog rows held one product because the identity check
// compared repository names exactly. `stableHuggingFaceId` normalizes the spelling
// (URL prefix, trailing slash, case); `weightsHuggingFaceId` additionally drops a
// serving-precision suffix, which names how the weights are stored and not which
// model they are. NVIDIA publishes the same Nemotron 3 Super release as
// `NVIDIA-Nemotron-3-Super-120B-A12B-BF16` and `…-FP8`; Artificial Analysis linked
// the BF16 repository and OpenRouter serves the FP8 one, so the exact comparison
// read one product as two and put its benchmarks and its price on different rows.
//
// The suffix list is closed on purpose: measured over the whole catalog on
// 2026-09-28 it collapses exactly one pair (the Nemotron one) out of 343 repository
// ids, 11 of which carry such a suffix. A looser rule — for example stripping any
// trailing token — would merge genuinely different releases.

export const stableHuggingFaceId = (id) => String(id || "")
  .replace(/^https?:\/\/(?:www\.)?huggingface\.co\//i, "")
  .replace(/\/$/, "")
  .toLowerCase();

export const HF_PRECISION_SUFFIX_RE = /-(?:bf16|fp16|fp32|fp8|fp4|nvfp4|mxfp4|int8|int4|w8a8|w4a16|awq|gptq|gguf)$/;

export const weightsHuggingFaceId = (id) => {
  let value = stableHuggingFaceId(id);
  for (let previous = null; previous !== value; ) {
    previous = value;
    value = value.replace(HF_PRECISION_SUFFIX_RE, "");
  }
  return value;
};

// True only when both sides name a repository and they are the same model. An
// absent repository never matches anything — a missing id is not evidence.
export const sameHuggingFaceModel = (a, b) => {
  const left = weightsHuggingFaceId(a);
  return !!left && left === weightsHuggingFaceId(b);
};
