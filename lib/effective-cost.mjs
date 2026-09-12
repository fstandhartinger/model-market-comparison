/** Pure cost arithmetic. All prices are USD / million tokens; results are USD.
 * Constants below are explicit scenario assumptions, never measured statistics.
 * See docs/effective-cost.md for scope, fallbacks and cache-write semantics.
 */
export const FALLBACK_OUTPUT_TOKENS = 1000;
export const FALLBACK_IO_RATIO = 10;
export const INPUT_ONLY = 1000000;
// R4.2: 20:1 is the default blend — the realistic input:output ratio for agentic
// coding work — with 30:1 offered next to it.
export const FIXED_BLENDS = [
  { value: 0, label: "Output only (0:1)" },
  { value: 1, label: "1:1 input/output" },
  { value: 3, label: "3:1 input/output" },
  { value: 10, label: "10:1 input/output" },
  { value: 20, label: "20:1 input/output" },
  { value: 30, label: "30:1 input/output" },
  { value: 100, label: "100:1 input/output" },
  { value: INPUT_ONLY, label: "Input only (1:0)" },
];
export const DEFAULT_BLEND = 20;

const nonnegative = (x) => typeof x === "number" && Number.isFinite(x) && x >= 0;
const positive = (x) => nonnegative(x) && x > 0;

function prices(input, output, assumptions) {
  const i = nonnegative(input) ? input : null;
  const o = nonnegative(output) ? output : null;
  if (i == null && o == null) assumptions.push("No valid public input or output price; cost unavailable.");
  else {
    if (i == null) assumptions.push("Input price missing/invalid: output list price substituted (assumed).");
    if (o == null) assumptions.push("Output price missing/invalid: input list price substituted (assumed).");
  }
  return [i ?? o, o ?? i];
}

/** Fixed list-price scenarios deliberately do not use token/task or caching data. */
export function fixedCost(input, output, inputWeight = 10) {
  const assumptions = [];
  if (!nonnegative(inputWeight)) {
    inputWeight = 10;
    assumptions.push("Invalid fixed blend: 10:1 input/output assumed.");
  }
  const [i, o] = prices(input, output, assumptions);
  const value = i == null || o == null ? null : inputWeight === INPUT_ONLY ? i
    : (inputWeight / (inputWeight + 1)) * i + o / (inputWeight + 1);
  return { value, assumptions, inputWeight };
}

export function effectiveCost(values = {}) {
  const assumptions = [];
  const [inputPrice, outputPrice] = prices(values.input_per_1m, values.output_per_1m, assumptions);
  const choose = (key, fallback, valid, note) => {
    if (valid(values[key])) return values[key];
    assumptions.push(note);
    return fallback;
  };
  const output = choose("output_tokens_per_task", FALLBACK_OUTPUT_TOKENS, positive,
    "AA tokens/task missing/invalid: 1,000 output tokens/task assumed; this is a scenario, not a measured task.");
  const ratio = choose("input_output_ratio", FALLBACK_IO_RATIO, nonnegative,
    "I/O ratio missing/invalid: 10:1 input/output assumed as a last-resort scenario.");
  const hit = choose("cache_hit_rate", 0, (x) => nonnegative(x) && x <= 1,
    "Cache-hit rate missing/invalid: 0% assumed; no cache discount credited.");
  const readPrice = choose("cache_read_per_1m", inputPrice, nonnegative,
    "Cache-read price missing/invalid: regular input price assumed; no read discount.");
  const writes = choose("cache_write_tokens", 0, nonnegative,
    "Cache-write volume unmeasured: 0 additional billed write tokens assumed; write charges are excluded.");
  const writePrice = choose("cache_write_per_1m", inputPrice, nonnegative,
    "Cache-write price missing/invalid: regular input price assumed (only charged if write tokens > 0).");
  const input = output * ratio;
  const inputs = {
    input_tokens_per_task: input, output_tokens_per_task: output, input_output_ratio: ratio,
    cache_hit_rate: hit, cache_write_tokens: writes,
    input_per_1m: inputPrice, output_per_1m: outputPrice,
    cache_read_per_1m: readPrice, cache_write_per_1m: writePrice,
  };
  let terms = inputPrice == null || outputPrice == null ? null : {
    uncached_input: input * (1 - hit) / 1e6 * inputPrice,
    cached_input: input * hit / 1e6 * readPrice,
    cache_write: writes / 1e6 * writePrice,
    output: output / 1e6 * outputPrice,
  };
  let perTask = terms ? Object.values(terms).reduce((a, b) => a + b, 0) : null;
  // Never leak NaN/Infinity or convert malformed overflow into a bargain.
  if (!Number.isFinite(input) || (perTask != null && !Number.isFinite(perTask))) {
    assumptions.push("Cost arithmetic overflow: cost unavailable.");
    perTask = null;
    terms = null;
  }
  const perMillion = perTask == null ? null : perTask / (input + output) * 1e6;
  return {
    effective_cost_per_task: perTask,
    effective_cost_per_1m_tokens: Number.isFinite(perMillion) ? perMillion : null,
    inputs, terms, assumptions, estimated: assumptions.length > 0,
  };
}
