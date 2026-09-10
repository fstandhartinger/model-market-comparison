const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
function validDay(value) {
  return typeof value === "string" && dayPattern.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

// Chutes returns a complete, unpaginated array of chute/day aggregates. The
// endpoint also includes non-token usage; only paired positive token rows enter
// this LLM fallback. Sum tokens first: a mean of per-chute ratios is biased.
export function parseChutesUsage(payload, { start_date, end_date }) {
  if (!validDay(start_date) || !validDay(end_date) || start_date > end_date) throw new Error("Invalid Chutes date window");
  if (!Array.isArray(payload) || !payload.length) throw new Error("Chutes usage array missing or empty");
  const keys = new Set();
  const rows = payload.map((row) => {
    if (!row || typeof row.chute_id !== "string" || !row.chute_id.trim() || typeof row.name !== "string"
      || !validDay(row.date) || row.date < start_date || row.date > end_date) throw new Error("Invalid Chutes identity/date");
    const key = `${row.chute_id}::${row.date}`;
    if (keys.has(key)) throw new Error(`Duplicate Chutes chute/day: ${key}`);
    keys.add(key);
    for (const field of ["total_requests", "total_input_tokens", "total_output_tokens"]) {
      if (!Number.isSafeInteger(row[field]) || row[field] < 0) throw new Error(`Invalid Chutes ${field}: ${key}`);
    }
    if (!row.total_requests && (row.total_input_tokens || row.total_output_tokens)) throw new Error(`Tokens without requests: ${key}`);
    return Object.fromEntries(["chute_id", "name", "date", "total_requests", "total_input_tokens", "total_output_tokens"].map((field) => [field, row[field]]));
  });
  const included = rows.filter((row) => row.total_input_tokens > 0 && row.total_output_tokens > 0);
  const dates = new Set(included.map((row) => row.date));
  for (let day = Date.parse(start_date); day <= Date.parse(end_date); day += 86400000) {
    if (!dates.has(new Date(day).toISOString().slice(0, 10))) throw new Error("Incomplete Chutes window: missing token-positive day");
  }
  const totals = Object.fromEntries(["total_requests", "total_input_tokens", "total_output_tokens"].map((field) => [field, included.reduce((sum, row) => sum + row[field], 0)]));
  if (Object.values(totals).some((value) => !Number.isSafeInteger(value)) || !totals.total_output_tokens) throw new Error("Invalid Chutes aggregate totals");
  return {
    rows, totals, input_output_ratio: totals.total_input_tokens / totals.total_output_tokens,
    coverage: {
      returned_rows: rows.length, included_rows: included.length, excluded_rows: rows.length - included.length,
      included_chutes: new Set(included.map((row) => row.chute_id)).size, days: dates.size,
      selection: "Chute/day rows with both total_input_tokens > 0 and total_output_tokens > 0; includes anonymized [private] aggregates.",
      completeness: "Full JSON array, unique chute/date keys, all requested dates represented. Upstream has no independent total-count guarantee.",
    },
  };
}

export function completedWeek(now = new Date()) {
  const midnight = Date.parse(now.toISOString().slice(0, 10));
  return { start_date: new Date(midnight - 7 * 86400000).toISOString().slice(0, 10), end_date: new Date(midnight - 86400000).toISOString().slice(0, 10) };
}
