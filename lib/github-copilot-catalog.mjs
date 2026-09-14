// R9.1: executable collector for GitHub Copilot model billing (data/raw/github-copilot.json).
// Pure parser: three server-rendered GitHub Docs pages — supported-models (the current catalog and
// retirement history), models-and-pricing (per-token USD tables, long-context tiers, footnotes) and
// model-multipliers-for-annual-plans (legacy request multipliers) — plus the previous snapshot in,
// normalized rows out. current_models[] is the intersection of the supported catalog and the pricing
// tables, matched by exact model name after footnote markers are removed.

const decode = (s) => String(s).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;| /g, " ");
const text = (html) => decode(String(html).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
/** A cell's text without footnote markers, and the footnote ids it references. */
const cell = (html) => ({
  text: text(String(html).replace(/<sup>\s*<a[^>]*data-footnote-ref[^>]*>[\s\S]*?<\/a>\s*<\/sup>/g, "")),
  footnotes: [...String(html).matchAll(/href="#user-content-fn-([^"]+)"/g)].map((m) => m[1]),
});

export function readTables(html) {
  return [...String(html).matchAll(/<table[\s\S]*?<\/table>/g)].map((t) =>
    [...t[0].matchAll(/<tr[\s\S]*?<\/tr>/g)].map((tr) => [...tr[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => cell(c[1]))));
}
export function readFootnotes(html) {
  return new Map([...String(html).matchAll(/<li id="user-content-fn-([^"]+)">([\s\S]*?)<\/li>/g)].map((m) => [m[1], text(m[2]).replace(/\s*↩.*$/, "")]));
}
const header = (rows) => rows[0].map((c) => c.text);
const findTables = (tables, required) => tables.filter((rows) => rows.length > 0 && required.every((h) => header(rows).includes(h)));

const MONTHS = { January: "01", February: "02", March: "03", April: "04", May: "05", June: "06", July: "07", August: "08", September: "09", October: "10", November: "11", December: "12" };
const isoDate = (s) => { const m = /([A-Z][a-z]+) (\d{1,2}), (\d{4})/.exec(s || ""); return m && MONTHS[m[1]] ? `${m[3]}-${MONTHS[m[1]]}-${m[2].padStart(2, "0")}` : null; };
const usd = (value, where) => {
  if (/^Not applicable$/i.test(value)) return null;
  const m = /^\$([0-9]+(?:\.[0-9]+)?)$/.exec(value);
  if (!m) throw new Error(`Copilot pricing: unreadable price "${value}" (${where})`);
  return Number(m[1]);
};
const threshold = (value) => {
  const m = /^[>≤<]=?\s*([0-9]+(?:\.[0-9]+)?)\s*([KM])$/i.exec(value || "");
  return m ? Math.round(Number(m[1]) * (m[2].toUpperCase() === "M" ? 1e6 : 1e3)) : null;
};

export function readSupported(html) {
  const tables = readTables(html);
  const catalog = findTables(tables, ["Model name", "Provider", "Release status"])[0];
  if (!catalog) throw new Error("Copilot supported models: no catalog table (page layout changed?)");
  const models = catalog.slice(1).map((r) => ({ name: r[0].text, provider: r[1].text, release_status: r[2].text }));
  const history = findTables(tables, ["Model name", "Retirement date", "Suggested alternative"])[0];
  const retired = history ? history.slice(1).map((r) => ({ name: r[0].text, retirement_date: r[1].text, alternative: r[2].text })) : [];
  if (models.length === 0) throw new Error("Copilot supported models: empty catalog");
  return { models, retired };
}

export function readPricing(html) {
  if (!/1 AI credit = \$0\.01 USD/.test(text(html))) throw new Error("Copilot pricing: '1 AI credit = $0.01 USD' not stated (page layout changed?)");
  const notes = readFootnotes(html);
  const tables = findTables(readTables(html), ["Model", "Release status", "Category", "Input", "Cached input", "Output"]);
  if (tables.length === 0) throw new Error("Copilot pricing: no per-token pricing tables (page layout changed?)");
  const byName = new Map();
  for (const rows of tables) {
    const h = header(rows);
    const at = (r, name) => (h.includes(name) ? r[h.indexOf(name)].text : null);
    for (const r of rows.slice(1)) {
      const name = r[0].text;
      const tier = at(r, "Tier") || "Default";
      const prices = {
        input_per_1m_usd: usd(at(r, "Input"), `${name} input`),
        cached_input_per_1m_usd: usd(at(r, "Cached input"), `${name} cached input`),
        cache_write_per_1m_usd: h.includes("Cache write") ? usd(at(r, "Cache write"), `${name} cache write`) : null,
        output_per_1m_usd: usd(at(r, "Output"), `${name} output`),
      };
      if (prices.input_per_1m_usd == null || prices.output_per_1m_usd == null) throw new Error(`Copilot pricing: ${name} (${tier}) lacks an input or output price`);
      const entry = byName.get(name) || { name, release_status: at(r, "Release status"), category: at(r, "Category"), footnotes: [] };
      entry.footnotes.push(...r[0].footnotes.map((id) => notes.get(id)).filter(Boolean));
      if (/^Long context$/i.test(tier)) {
        if (entry.long_context) throw new Error(`Copilot pricing: ${name} has two long-context rows`);
        entry.long_context = { ...prices, threshold_input_tokens_gt: threshold(at(r, "Threshold (input tokens)")) };
      } else if (/^Default$/i.test(tier)) {
        if (entry.prices) throw new Error(`Copilot pricing: ${name} listed twice`);
        entry.prices = prices;
      } else throw new Error(`Copilot pricing: ${name} has unknown tier "${tier}"`);
      byName.set(name, entry);
    }
  }
  for (const e of byName.values()) if (!e.prices) throw new Error(`Copilot pricing: ${e.name} has a long-context row but no default row`);
  return byName;
}

export function readMultipliers(html) {
  const table = findTables(readTables(html), ["Model", "Multiplier"])[0];
  if (!table) throw new Error("Copilot legacy multipliers: no multiplier table (page layout changed?)");
  const rows = table.slice(1).map((r) => {
    const value = Number(r[1].text);
    if (!Number.isFinite(value) || value < 0) throw new Error(`Copilot legacy multipliers: ${r[0].text} has unreadable multiplier "${r[1].text}"`);
    return { name: r[0].text, multiplier: value };
  });
  const s = String(html);
  const noteAt = s.search(/multiplier for these models (?:are|is) subject to change/i);
  const list = noteAt >= 0 ? /<ul>([\s\S]*?)<\/ul>/.exec(s.slice(noteAt, noteAt + 3000))?.[1] ?? "" : "";
  const subjectToChange = [...list.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => text(m[1]));
  const discount = Number(/qualify for a (\d+)% discount/.exec(text(html))?.[1]);
  return { rows, subjectToChange, autoDiscountPct: Number.isFinite(discount) ? discount : null };
}

const LEGACY_PLAIN = "Legacy annual-plan multiplier.";
const LEGACY_CHANGE = "GitHub marks this multiplier as subject to change.";
const LEGACY_NOT_CURRENT = "Legacy annual-plan model; not in the current usage-based supported-model catalog.";

export function parseGithubCopilotCatalog(supportedHtml, pricingHtml, multipliersHtml, previous = {}, { today = new Date().toISOString().slice(0, 10), minRetainedShare = 0.5 } = {}) {
  const { models: supported, retired } = readSupported(supportedHtml);
  const pricing = readPricing(pricingHtml);
  const legacy = readMultipliers(multipliersHtml);
  const prevCurrent = previous.current_models || [];
  const prevLegacy = previous.models || [];
  const oldCurrent = new Map(prevCurrent.map((m) => [m.model_name, m]));
  const oldLegacy = new Map(prevLegacy.map((m) => [m.model_name, m]));
  const supportedNames = new Set(supported.map((m) => m.name));

  const current_models = [];
  const supported_without_price = [];
  for (const s of supported) {
    const p = pricing.get(s.name);
    if (!p) { supported_without_price.push(s.name); continue; }
    const old = oldCurrent.get(s.name);
    // The footnote lists prices ("$0.75 per 1M …") before the date, so match across decimal points.
    const promo = p.footnotes.map((n) => /promotional pricing[\s\S]*? through ([A-Z][a-z]+ \d{1,2}, \d{4})/.exec(n)?.[1]).find(Boolean);
    const model = {
      ...(old || {}),
      model_name: s.name,
      provider_org: old?.provider_org ?? s.provider,
      release_status: p.release_status || s.release_status,
      category: p.category,
      ...p.prices,
    };
    if (model.cache_write_per_1m_usd == null) delete model.cache_write_per_1m_usd;
    if (p.long_context) {
      model.long_context = { ...p.long_context };
      if (model.long_context.cache_write_per_1m_usd == null) delete model.long_context.cache_write_per_1m_usd;
    } else delete model.long_context;
    if (promo) model.promotion_ends_at = isoDate(promo);
    else if (old?.promotion_ends_at) { delete model.promotion_ends_at; if (/promotional/i.test(model.notes || "")) delete model.notes; }
    if (!old) {
      model.mapping = "derived";
      if (/\(preview\)/i.test(s.name)) model.feature_status = "preview";
      if (promo) model.notes = `Official promotional token rates through ${promo}; no post-promotion rate inferred.`;
    }
    current_models.push(model);
  }
  const priced_not_supported = [...pricing.keys()].filter((n) => !supportedNames.has(n));
  if (current_models.length === 0) throw new Error("Copilot: no model is both supported and priced");
  const keptCurrent = prevCurrent.filter((m) => current_models.some((c) => c.model_name === m.model_name)).length;
  if (prevCurrent.length > 0 && keptCurrent < prevCurrent.length * minRetainedShare) {
    throw new Error(`Copilot: only ${keptCurrent}/${prevCurrent.length} previous current models still supported and priced; refusing to replace the snapshot`);
  }

  const perRequest = Number(previous.per_premium_request_usd ?? 0.04);
  const changeSet = new Set(legacy.subjectToChange);
  const models = legacy.rows.map((r) => {
    const old = oldLegacy.get(r.name);
    let notes = old?.notes;
    const flagged = changeSet.has(r.name);
    if (flagged) notes = LEGACY_CHANGE;
    else if (!notes || notes === LEGACY_CHANGE) notes = supportedNames.has(r.name) ? LEGACY_PLAIN : LEGACY_NOT_CURRENT;
    const row = {
      ...(old || {}),
      model_name: r.name,
      provider_org: old?.provider_org ?? supported.find((s) => s.name === r.name)?.provider,
      premium_request_multiplier: r.multiplier,
      effective_usd_per_request: Math.round(r.multiplier * perRequest * 1e6) / 1e6,
      notes,
    };
    if (!old) row.mapping = "derived";
    if (row.provider_org === undefined) delete row.provider_org;
    return row;
  });
  const keptLegacy = prevLegacy.filter((m) => models.some((c) => c.model_name === m.model_name)).length;
  if (prevLegacy.length > 0 && keptLegacy < prevLegacy.length * minRetainedShare) {
    throw new Error(`Copilot legacy multipliers: only ${keptLegacy}/${prevLegacy.length} previous rows still listed; refusing to replace the snapshot`);
  }

  const priceKeys = ["input_per_1m_usd", "cached_input_per_1m_usd", "cache_write_per_1m_usd", "output_per_1m_usd"];
  return {
    current_models, models, retired, supported_without_price, priced_not_supported,
    legacy_auto_selection_discount_pct: legacy.autoDiscountPct ?? previous.legacy_auto_selection_discount_pct,
    retirement_overlap: retired.filter((r) => supportedNames.has(r.name)).map((r) => `${r.name} (${r.retirement_date})`),
    plans_checked_at: previous.plans_checked_at ?? previous.collected_at ?? null,
    diff: {
      current_added: current_models.filter((m) => !oldCurrent.has(m.model_name)).map((m) => m.model_name),
      current_removed: prevCurrent.filter((m) => !current_models.some((c) => c.model_name === m.model_name)).map((m) => m.model_name),
      current_price_changed: current_models.filter((m) => { const o = oldCurrent.get(m.model_name); return o && (priceKeys.some((k) => o[k] !== m[k]) || JSON.stringify(o.long_context ?? null) !== JSON.stringify(m.long_context ?? null)); }).map((m) => m.model_name),
      legacy_added: models.filter((m) => !oldLegacy.has(m.model_name)).map((m) => m.model_name),
      legacy_removed: prevLegacy.filter((m) => !models.some((c) => c.model_name === m.model_name)).map((m) => m.model_name),
      legacy_multiplier_changed: models.filter((m) => { const o = oldLegacy.get(m.model_name); return o && o.premium_request_multiplier !== m.premium_request_multiplier; }).map((m) => m.model_name),
    },
    checked_on: today,
  };
}
