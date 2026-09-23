// R9.1: executable collector for Anthropic's first-party Claude API prices (data/raw/claude-code.json).
// Pure parser: the server-rendered docs pages platform.claude.com/docs/en/about-claude/pricing (model
// and batch price tables, cache and data-residency multipliers) and …/model-deprecations (lifecycle by
// API model id), plus claude.com/pricing (the Enterprise seat line), the previous snapshot in,
// normalized rows out. Rows the pricing table labels "retired" are not callable and are excluded.

const decode = (s) => String(s).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;| /g, " ").replace(/&#x27;/g, "'");
const text = (html) => decode(String(html).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
export const pipeText = (html) => decode(String(html).replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, "|")).replace(/\s+/g, " ").replace(/(\| ?)+/g, "|");

/** Every <table> as rows of cell texts; the first row is the header. */
export function readTables(html) {
  return [...String(html).matchAll(/<table[\s\S]*?<\/table>/g)].map((t) =>
    [...t[0].matchAll(/<tr[\s\S]*?<\/tr>/g)].map((tr) => [...tr[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => text(c[1]))));
}

const findTable = (tables, headers) => tables.find((rows) => rows.length > 1 && headers.every((h) => rows[0].includes(h)));
const money = (cell, where) => {
  const m = /^\$([0-9]+(?:\.[0-9]+)?) \/ MTok(?: \d)?$/.exec(cell);
  if (!m) throw new Error(`Claude pricing: unreadable price "${cell}" (${where})`);
  return Number(m[1]);
};
/** "Claude Opus 4.1 ( retired, except on Bedrock … )" → { name, label } */
const splitName = (cell) => {
  const m = /^(.*?)\s*\(\s*(.*?)\s*\)$/.exec(cell);
  return m ? { name: m[1], label: m[2] } : { name: cell, label: "" };
};

export function readPriceTables(html) {
  const tables = readTables(html);
  const main = findTable(tables, ["Model", "Base input tokens", "5m cache writes", "1h cache writes", "Cache hits and refreshes", "Output tokens"]);
  const batch = findTable(tables, ["Model", "Batch input", "Batch output"]);
  if (!main) throw new Error("Claude pricing: no model price table (page layout changed?)");
  if (!batch) throw new Error("Claude pricing: no batch price table (page layout changed?)");
  const col = (rows, h) => rows[0].indexOf(h);
  const batchByName = new Map(batch.slice(1).map((r) => [splitName(r[0]).name, { input: money(r[col(batch, "Batch input")], `${r[0]} batch input`), output: money(r[col(batch, "Batch output")], `${r[0]} batch output`) }]));
  const rows = main.slice(1).map((r) => {
    const { name, label } = splitName(r[0]);
    const p = (h) => money(r[col(main, h)], `${name} ${h}`);
    return {
      name, label, retired: /retired/i.test(label), limited: /limited availability/i.test(label),
      input: p("Base input tokens"), write5m: p("5m cache writes"), write1h: p("1h cache writes"), read: p("Cache hits and refreshes"), output: p("Output tokens"),
      batch: batchByName.get(name) ?? null,
    };
  });
  const names = new Set();
  for (const r of rows) { if (names.has(r.name)) throw new Error(`Claude pricing: ${r.name} listed twice`); names.add(r.name); }
  return rows;
}

const MONTHS = { January: "01", February: "02", March: "03", April: "04", May: "05", June: "06", July: "07", August: "08", September: "09", October: "10", November: "11", December: "12" };
const isoDate = (s) => { const m = /([A-Z][a-z]+) (\d{1,2}), (\d{4})/.exec(s || ""); return m && MONTHS[m[1]] ? `${m[3]}-${MONTHS[m[1]]}-${m[2].padStart(2, "0")}` : null; };

export function readLifecycle(html) {
  const table = findTable(readTables(html), ["API model name", "Current state"]);
  if (!table) throw new Error("Claude model deprecations: no lifecycle table (page layout changed?)");
  const retirement = table[0].findIndex((h) => /retirement/i.test(h));
  return new Map(table.slice(1).map((r) => [r[0], { state: r[1].toLowerCase(), retirement: r[retirement] ?? null, retirement_date: isoDate(r[retirement]) }]));
}

/** Multipliers the page states in prose; each must be present, or the run fails closed. */
export function readModifiers(html, rows) {
  const t = pipeText(html);
  const batchPct = Number(/Batch API allows [^|]*? with a (\d+)% discount on both input and output tokens/.exec(t)?.[1]);
  const usOnly = Number(/US-only inference through the \|?inference_geo\|?\s*parameter incurs a ([0-9.]+)x multiplier/.exec(t)?.[1]);
  // The page states the cache-hit rule as a standard multiplier plus one footnote per model family that
  // departs from it. The count of those footnotes is the page's to grow (Claude Opus 5.5 added a second on
  // 2026-09-23), so read them as a list rather than requiring the exception to abut "All other models".
  const cacheDefault = /All other models use the standard ([0-9.]+)x multiplier/.exec(t);
  const cacheExceptions = [...t.matchAll(/priced at ([0-9.]+)x the base input price/g)].map((m) => Number(m[1]));
  if (!Number.isFinite(batchPct) || !Number.isFinite(usOnly) || !cacheDefault || !cacheExceptions.length
      || cacheExceptions.some((x) => !Number.isFinite(x))) throw new Error("Claude pricing: batch, data-residency or cache-hit multiplier text not found (page layout changed?)");
  const ratio = (a, b) => Math.round((a / b) * 1000) / 1000;
  const live = rows.filter((r) => !r.retired);
  const write5m = [...new Set(live.map((r) => ratio(r.write5m, r.input)))];
  const write1h = [...new Set(live.map((r) => ratio(r.write1h, r.input)))];
  if (write5m.length !== 1 || write1h.length !== 1) throw new Error(`Claude pricing: inconsistent cache-write multipliers (${write5m.join(",")} / ${write1h.join(",")})`);
  const readDefault = Number(cacheDefault[1]);
  return { write5m: write5m[0], write1h: write1h[0], readDefault, readExceptions: [...new Set(cacheExceptions)].filter((x) => x !== readDefault), batchPct, usOnly };
}

/** Enterprise plan line on claude.com/pricing: "Seat price + usage at API rates | $20 | /seat". */
export function readEnterpriseSeat(html) {
  const m = /Enterprise\|[^]*?Seat price \+ usage at API rates\|\$([0-9]+(?:\.[0-9]+)?)\|\/seat/.exec(pipeText(html));
  return m ? { seat_monthly_usd: Number(m[1]), usage_at_api_rates: true } : null;
}

export function parseClaudeApiCatalog(pricingHtml, deprecationsHtml, previous = { models: [] }, { enterpriseHtml = null, today = new Date().toISOString().slice(0, 10), minRetainedShare = 0.5 } = {}) {
  const rows = readPriceTables(pricingHtml);
  const lifecycle = readLifecycle(deprecationsHtml);
  const mod = readModifiers(pricingHtml, rows);
  const prev = previous.models || [];
  const byName = new Map(prev.map((m) => [m.model_name, m]));
  const matched = new Set();
  const models = [];
  const excluded = [];
  for (const r of rows) {
    const old = byName.get(r.name);
    const life = old ? lifecycle.get(old.model_id) : null;
    if (r.retired || life?.state === "retired") { excluded.push(`${r.name} (${r.label || "retired"})`); continue; }
    if (!r.batch) throw new Error(`Claude pricing: ${r.name} has no batch price`);
    if (old) matched.add(old);
    const model = {
      ...(old || {}),
      model_name: r.name,
      model_id: old?.model_id ?? r.name.toLowerCase().replace(/\./g, "-").replace(/\s+/g, "-"),
      provider_org: "Anthropic",
      lifecycle_status: life?.state ?? old?.lifecycle_status ?? "active",
      input_per_1m_usd: r.input,
      output_per_1m_usd: r.output,
      cache_write_per_1m_usd: r.write5m,
      cache_write_1h_per_1m_usd: r.write1h,
      cache_read_per_1m_usd: r.read,
      batch_input_per_1m_usd: r.batch.input,
      batch_output_per_1m_usd: r.batch.output,
    };
    if (r.limited) model.availability = old?.availability?.startsWith("limited") ? old.availability : "limited_availability";
    if (life?.retirement_date) model.tentative_retirement = life.retirement;
    if (!old) { model.mapping = "derived"; model.model_id_source = "derived from the pricing-table name; not listed in the deprecations table"; }
    models.push(model);
  }
  if (models.length === 0) throw new Error("Claude pricing: no callable models");
  if (prev.length > 0 && matched.size < prev.length * minRetainedShare) {
    throw new Error(`Claude pricing: only ${matched.size}/${prev.length} previous models still listed; refusing to replace the snapshot`);
  }
  const exceptions = Object.fromEntries(models.flatMap((m) => {
    const stated = mod.readExceptions.find((x) => Math.abs(m.cache_read_per_1m_usd / m.input_per_1m_usd - x) < 1e-9);
    return stated === undefined ? [] : [[m.model_id, stated]];
  }));
  const pricing_modifiers = {
    ...(previous.pricing_modifiers || {}),
    prompt_cache_5m_write_multiplier: mod.write5m,
    prompt_cache_1h_write_multiplier: mod.write1h,
    prompt_cache_read_multiplier: mod.readDefault,
    batch_discount_pct: mod.batchPct,
    us_only_inference_multiplier: mod.usOnly,
    prompt_cache_read_multiplier_exceptions: exceptions,
  };
  const seat = enterpriseHtml ? readEnterpriseSeat(enterpriseHtml) : null;
  const oldEnterprise = previous.claude_code_enterprise || {};
  const claude_code_enterprise = seat
    ? { ...oldEnterprise, seat_monthly_usd: seat.seat_monthly_usd, seat_and_usage_checked_at: today, other_terms_checked_at: oldEnterprise.other_terms_checked_at ?? previous.collected_at ?? null }
    : { ...oldEnterprise, seat_and_usage_checked_at: oldEnterprise.seat_and_usage_checked_at ?? previous.collected_at ?? null, other_terms_checked_at: oldEnterprise.other_terms_checked_at ?? previous.collected_at ?? null };
  const before = (m) => prev.find((p) => matched.has(p) && p.model_name === m.model_name);
  const priceKeys = ["input_per_1m_usd", "output_per_1m_usd", "cache_write_per_1m_usd", "cache_write_1h_per_1m_usd", "cache_read_per_1m_usd", "batch_input_per_1m_usd", "batch_output_per_1m_usd"];
  return {
    models, excluded, pricing_modifiers, claude_code_enterprise,
    enterprise_seat_found: !!seat,
    diff: {
      added: models.filter((m) => !before(m)).map((m) => m.model_name),
      removed: prev.filter((p) => !matched.has(p)).map((p) => p.model_name),
      price_changed: models.filter((m) => { const o = before(m); return o && priceKeys.some((k) => o[k] !== m[k]); }).map((m) => m.model_name),
      lifecycle_changed: models.filter((m) => { const o = before(m); return o && o.lifecycle_status !== m.lifecycle_status; }).map((m) => m.model_name),
      enterprise_seat_changed: !!seat && oldEnterprise.seat_monthly_usd !== seat.seat_monthly_usd,
    },
  };
}
