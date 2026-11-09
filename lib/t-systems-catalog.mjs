// R9.1: executable collector for T-Systems AI Foundation Services / LLM Hub
// (data/raw/t-systems-llm-hub.json). Pure parsers: the official model tables at
// docs.llmhub.t-systems.net/models/llms/ and /models/coding/ plus the previous snapshot and an ECB
// EUR/USD rate in, normalized rows out. Columns are located by header text. The separately audited
// hosting fields (hosting_class, server_location, is_externally_hosted, eu_hosted) are kept for
// known models; only new models derive them from the table's Cloud column.

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#8217;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const cellText = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
// "≤200k" and ">200k" are different price tiers of the same model; keep them apart.
export const nameKey = (name) => String(name || "").toLowerCase().replace(/≤|&le;/g, "le").replace(/>|&gt;/g, "gt").replace(/</g, "lt").replace(/[^a-z0-9]/g, "");

export function parseEur(text) {
  const t = String(text || "").trim();
  if (t === "" || t === "—" || t === "-" || /^n\/?a$/i.test(t)) return null;
  const m = /^€\s?([0-9]+(?:\.[0-9]+)?)$/.exec(t);
  if (!m) throw new Error(`T-Systems LLM Hub: unreadable price "${t}"`);
  return Number(m[1]);
}

// Two explicit header layouts are accepted; nothing is matched loosely. Legacy: a Provider column and
// "In €/M" style price names. Current (since 2026-11-05): no Provider column (the provider is the model
// logo's alt text, the model name sits in .mc-model__name) and price columns "Input"/"Output"/"Cached input"
// next to "Input types"/"Output types". Every column of a layout must be present or the table is rejected.
const LAYOUTS = [
  { name: "current", exact: true, cols: { model: "Model", cloud: "Cloud", input: "Input types", output: "Output types", context: "Context", in: "Input", out: "Output", cached: "Cached input", plans: "Plans" } },
  { name: "legacy", exact: false, cols: { model: "Model", provider: "Provider", cloud: "Cloud", input: "Input", output: "Output", context: "Context", in: "In €/M", out: "Out €/M", cached: "Cached €/M", plans: "Plans" } },
];

// Header label: the visible sort label when present (the <th> also carries tooltip prose), else the cell text.
const headerLabel = (html) => {
  const m = /<span[^>]*\bmc-sort-name\b[^>]*>([\s\S]*?)(?:<svg\b[\s\S]*?<\/svg>)?\s*<\/span>/i.exec(html);
  return cellText(m ? m[1] : html);
};
const matches = (h, title, exact) => h === title || (!exact && h.startsWith(`${title} `));

export function readHubTable(html, label = "table") {
  const table = /<table\b[\s\S]*?<\/table>/i.exec(String(html))?.[0];
  if (!table) throw new Error(`T-Systems LLM Hub: no <table> in ${label} (page layout changed?)`);
  const rows = [...table.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((r) => [...r[0].matchAll(/<t([dh])\b[^>]*>([\s\S]*?)<\/t\1>/gi)].map((c) => { const kind = c[1].toLowerCase(); return { kind, html: c[2], text: kind === "h" ? headerLabel(c[2]) : cellText(c[2]) }; }));
  const header = rows.find((r) => r[0]?.kind === "h" && r[0].text === "Model") || [];
  const locate = (L) => Object.fromEntries(Object.entries(L.cols).map(([key, title]) => [key, header.findIndex((h) => matches(h.text, title, L.exact))]));
  const missingOf = (L, idx) => Object.entries(idx).filter(([, i]) => i < 0).map(([k]) => L.cols[k]);
  let layout = null, idx = null;
  for (const L of LAYOUTS) { const cand = locate(L); if (missingOf(L, cand).length === 0) { layout = L; idx = cand; break; } }
  if (!layout) {
    const reports = LAYOUTS.map((L) => missingOf(L, locate(L)));
    throw new Error(`T-Systems LLM Hub: ${label} header columns missing (${reports.reduce((a, b) => (b.length < a.length ? b : a)).join(", ")})`);
  }
  // Rows with a different cell count are table chrome (filter-empty notice, hidden detail rows).
  return rows.filter((r) => r !== header && r.length === header.length && r.every((c) => c.kind === "d")).map((r) => {
    let name, provider;
    if (layout.name === "legacy") { name = r[idx.model].text; provider = r[idx.provider].text; }
    else {
      const n = /<(?:strong|span)\b[^>]*\bmc-model__name\b[^>]*>([\s\S]*?)<\/(?:strong|span)>/i.exec(r[idx.model].html)?.[1];
      name = n === undefined ? "" : cellText(n);
      provider = decode(/<img\b[^>]*\balt="([^"]+)"/i.exec(r[idx.model].html)?.[1] || "").trim();
      if (!name) throw new Error(`T-Systems LLM Hub: ${label} row without model name (mc-model__name missing)`);
      if (!provider) throw new Error(`T-Systems LLM Hub: ${label} ${name} has no provider (model logo alt missing)`);
    }
    return {
      model: name, provider, cloud: r[idx.cloud].text, input: r[idx.input].text, output: r[idx.output].text,
      context: r[idx.context].text, in: parseEur(r[idx.in].text), out: parseEur(r[idx.out].text), cached: parseEur(r[idx.cached].text), plans: r[idx.plans].text,
    };
  });
}

export function hostingFor(cloud) {
  if (/^(?:Telekom|T-Cloud)\b/.test(cloud)) return { hosting_class: "sovereign_germany", server_location: "Germany", is_externally_hosted: false };
  if (/^Azure\b/.test(cloud)) return { hosting_class: "routed_azure_eu", server_location: "Azure EU regions", is_externally_hosted: true };
  // "GCP / Azure" (Claude) follows the audited precedent of every existing Claude row.
  if (/^GCP\b/.test(cloud)) return { hosting_class: "routed_gcp_eu", server_location: "GCP EU regions", is_externally_hosted: true };
  return null;
}

const ORG = { "zhipu ai": "Z.ai", "alibaba cloud": "Alibaba", "google gemini": "Google", "google gemma": "Google", "mistral ai": "Mistral", openai: "OpenAI", anthropic: "Anthropic", google: "Google", alibaba: "Alibaba", nvidia: "NVIDIA" };
const usd = (eur, rate) => (eur === null ? null : Math.round(eur * rate * 100) / 100);

export function parseTSystemsCatalog(pages, previous = { models: [] }, fx, { day, minRetainedShare = 0.5 } = {}) {
  if (!fx || !Number.isFinite(fx.rate)) throw new Error("T-Systems LLM Hub: no FX rate");
  const live = new Map();
  for (const [label, html] of Object.entries(pages)) {
    for (const row of readHubTable(html, label)) {
      const key = nameKey(row.model);
      const seen = live.get(key);
      if (seen && (seen.in !== row.in || seen.out !== row.out || seen.cached !== row.cached || seen.cloud !== row.cloud)) throw new Error(`T-Systems LLM Hub: ${row.model} differs between tables`);
      if (!seen) live.set(key, { ...row, table: label });
    }
  }
  if (live.size === 0) throw new Error("T-Systems LLM Hub: empty model tables");
  const prev = previous.models || [];
  const oldByKey = new Map(prev.map((m) => [nameKey(m.model_name), m]));
  const models = [];
  for (let [key, row] of live) {
    const old = oldByKey.get(key);
    const derivedHosting = hostingFor(row.cloud);
    if (!old && !derivedHosting) throw new Error(`T-Systems LLM Hub: unknown Cloud "${row.cloud}" for new model ${row.model}`);
    const preview = /^test$/i.test(row.plans.trim());
    // Since 2026-11-05 some rows show €0.00 with "Free on any active plan": the model is included in a paid LLM Hub
    // plan, not free per token. A 0 would rank it as the cheapest route anywhere, so it is published without a
    // per-token price (price_status "n/a") and the plan wording in the notes.
    const planIncluded = /^free on any active plan$/i.test(row.plans.trim()) && row.in === 0 && row.out === 0;
    if (planIncluded) { row = { ...row, in: null, out: null, cached: null }; }
    const model = {
      ...(old || {}),
      model_name: old?.model_name ?? row.model,
      provider_org: old?.provider_org ?? ORG[row.provider.toLowerCase()],
      input_per_1m_eur: row.in,
      output_per_1m_eur: row.out,
      input_per_1m_usd: usd(row.in, fx.rate),
      output_per_1m_usd: usd(row.out, fx.rate),
      cache_read_per_1m_eur: row.cached ?? undefined,
      cache_read_per_1m_usd: row.cached === null ? undefined : usd(row.cached, fx.rate),
      ...(old ? {} : { ...derivedHosting, region: "eu", eu_hosted: true, mapping: "derived" }),
      status: preview ? "preview" : "active",
      ...(planIncluded ? { price_status: "n/a" } : {}),
      context_length_label: row.context,
      notes: `Official ${preview ? "preview" : "active"} model table (${row.table}) checked ${day}. ${row.cloud}; ${row.input} input / ${row.output} output. Plans: ${row.plans}.`,
    };
    if (row.cached === null) { delete model.cache_read_per_1m_eur; delete model.cache_read_per_1m_usd; }
    if (!planIncluded && old?.price_status === "n/a") delete model.price_status;
    for (const k of Object.keys(model)) if (model[k] === undefined) delete model[k];
    models.push(model);
  }
  const retained = prev.filter((m) => live.has(nameKey(m.model_name))).length;
  if (prev.length > 0 && retained < prev.length * minRetainedShare) {
    throw new Error(`T-Systems LLM Hub: only ${retained}/${prev.length} previous models still listed; refusing to replace the snapshot`);
  }
  return {
    models,
    diff: {
      added: models.filter((m) => m.mapping === "derived" && !oldByKey.has(nameKey(m.model_name))).map((m) => m.model_name),
      removed: prev.filter((m) => !live.has(nameKey(m.model_name))).map((m) => m.model_name),
      eur_price_changed: models.filter((m) => {
        const o = oldByKey.get(nameKey(m.model_name));
        return o && ((o.input_per_1m_eur ?? null) !== m.input_per_1m_eur || (o.output_per_1m_eur ?? null) !== m.output_per_1m_eur);
      }).map((m) => m.model_name),
    },
  };
}
