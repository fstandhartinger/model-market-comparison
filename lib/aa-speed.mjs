// Artificial Analysis speed fields (API v2 `median_output_tokens_per_second`,
// `median_time_to_first_token_seconds`). AA sends 0 for both on models it has not
// speed-tested (460 of 650 rows on 2026-09-14, always paired). A measured speed is never 0,
// so a zero, negative or non-numeric value is "not measured" (null), never a value.

const measured = (v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

/** { output_tps, ttft_s } for one AA API row; each null when AA has no measurement. */
export function aaSpeed(row) {
  return {
    output_tps: measured(row?.median_output_tokens_per_second),
    ttft_s: measured(row?.median_time_to_first_token_seconds),
  };
}
