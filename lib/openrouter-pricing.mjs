const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const finiteNonnegative = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const perMillion = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Number((n * 1_000_000).toPrecision(15)) : undefined;
};

/** Convert OpenRouter's per-token endpoint overrides to the catalog's per-million USD unit. */
export function normalizeOpenRouterPriceOverrides(overrides) {
  if (!Array.isArray(overrides)) return [];
  return overrides.flatMap((source) => {
    if (!source || typeof source !== "object") return [];
    const row = {};
    if (finiteNonnegative(source.min_prompt_tokens)) row.min_prompt_tokens = source.min_prompt_tokens;
    if (finiteNonnegative(source.utc_start)) row.utc_start = source.utc_start;
    if (finiteNonnegative(source.utc_end)) row.utc_end = source.utc_end;
    if (Array.isArray(source.utc_days) && source.utc_days.every((day) => DAY_NAMES.includes(String(day).toLowerCase()))) {
      row.utc_days = source.utc_days.map((day) => String(day).toLowerCase());
    }
    for (const [from, to] of [["prompt", "input_per_1m"], ["completion", "output_per_1m"],
      ["input_cache_read", "cache_read_per_1m"], ["input_cache_write", "cache_write_per_1m"]]) {
      const value = perMillion(source[from]);
      if (value !== undefined) row[to] = value;
    }
    const hasCondition = row.min_prompt_tokens != null || row.utc_start != null || row.utc_end != null || row.utc_days?.length;
    const hasPrice = ["input_per_1m", "output_per_1m", "cache_read_per_1m", "cache_write_per_1m"].some((key) => row[key] != null);
    return hasCondition && hasPrice ? [row] : [];
  });
}

function validHHMM(value) {
  return finiteNonnegative(value) && Number.isInteger(value)
    && value <= 2359 && value % 100 < 60;
}

function timeConditionMatches(override, date) {
  const hasStart = override.utc_start != null, hasEnd = override.utc_end != null;
  if (hasStart !== hasEnd) return false;
  if (!hasStart && !override.utc_days?.length) return true;
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return false;
  if (hasStart && (!validHHMM(override.utc_start) || !validHHMM(override.utc_end))) return false;
  const minute = date.getUTCHours() * 60 + date.getUTCMinutes();
  const start = hasStart ? Math.floor(override.utc_start / 100) * 60 + override.utc_start % 100 : 0;
  const end = hasEnd ? Math.floor(override.utc_end / 100) * 60 + override.utc_end % 100 : 24 * 60;
  const inTimeRange = !hasStart || start === end || (start < end ? minute >= start && minute < end : minute >= start || minute < end);
  if (!inTimeRange) return false;
  if (!override.utc_days?.length) return true;
  let day = date.getUTCDay();
  // For a window that crosses midnight, OpenRouter's listed day is the day the window starts.
  if (hasStart && start > end && minute < end) day = (day + 6) % 7;
  return override.utc_days.includes(DAY_NAMES[day]);
}

export function matchesOpenRouterPriceOverride(override, { promptTokens, date = new Date() } = {}) {
  if (!override || typeof override !== "object") return false;
  if (override.min_prompt_tokens != null && (!finiteNonnegative(promptTokens) || promptTokens < override.min_prompt_tokens)) return false;
  return timeConditionMatches(override, date);
}

/** Pick one matching source tier. Ambiguous overlapping time schedules fail closed to base pricing. */
export function selectOpenRouterPriceOverride(overrides, context = {}) {
  const rows = Array.isArray(overrides) ? overrides : [];
  const matches = rows.filter((row) => matchesOpenRouterPriceOverride(row, context));
  if (matches.length === 1) return { status: "matched", override: matches[0] };
  if (matches.length === 0) return { status: rows.length ? "no_match" : "none", override: null };
  if (matches.every((row) => row.min_prompt_tokens != null
    && row.utc_start == null && row.utc_end == null && !row.utc_days?.length)) {
    return { status: "matched", override: matches.reduce((best, row) => row.min_prompt_tokens > best.min_prompt_tokens ? row : best) };
  }
  return { status: "ambiguous", override: null };
}

const clock = (value) => `${String(Math.floor(value / 100)).padStart(2, "0")}:${String(value % 100).padStart(2, "0")}`;

export function describeOpenRouterPriceOverride(override) {
  if (!override) return "Published base rate";
  const parts = [];
  if (override.min_prompt_tokens != null) parts.push(`prompt length ≥ ${Math.round(override.min_prompt_tokens).toLocaleString("en-US")} tokens`);
  const days = override.utc_days?.length ? override.utc_days.map((day) => day.slice(0, 3)).join(", ") : null;
  const hasTime = override.utc_start != null && override.utc_end != null;
  if (hasTime) parts.push(`${days ? `${days}, ` : ""}${clock(override.utc_start)}–${clock(override.utc_end)} UTC`);
  else if (days) parts.push(`${days} (all day, UTC)`);
  return parts.join(" · ") || "Conditional OpenRouter rate";
}

export function describeOpenRouterPriceOverrideWithRates(override) {
  const rates = [];
  for (const [key, label] of [["input_per_1m", "input"], ["output_per_1m", "output"],
    ["cache_read_per_1m", "cache read"], ["cache_write_per_1m", "cache write"]]) {
    if (override?.[key] != null) rates.push(`${label} $${Number(override[key].toPrecision(6)).toLocaleString("en-US")}/1M`);
  }
  return [describeOpenRouterPriceOverride(override), rates.join("; ")].filter(Boolean).join(" — ");
}

export function applyOpenRouterPriceOverride(offer, override) {
  if (!override) return offer;
  const out = { ...offer };
  for (const key of ["input_per_1m", "output_per_1m", "cache_read_per_1m", "cache_write_per_1m"]) {
    if (override[key] != null) out[key] = override[key];
  }
  return out;
}
