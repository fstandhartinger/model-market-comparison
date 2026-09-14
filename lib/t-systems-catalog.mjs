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

const COLUMNS = { model: "Model", provider: "Provider", cloud: "Cloud", input: "Input", output: "Output", context: "Context", in: "In €/M", out: "Out €/M", cached: "Cached €/M", plans: "Plans" };

export function readHubTable(html, label = "table") {
  const table = /<table\b[\s\S]*?<\/table>/i.exec(String(html))?.[0];
  if (!table) throw new Error(`T-Systems LLM Hub: no <table> in ${label} (page layout changed?)`);
  const rows = [...table.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((r) => [...r[0].matchAll(/<t([dh])\b[^>]*>([\s\S]*?)<\/t\1>/gi)].map((c) => cellText(c[2])));
  const header = rows.find((r) => r[0] === "Model");
  const idx = {};
  for (const [key, title] of Object.entries(COLUMNS)) idx[key] = header ? header.findIndex((h) => h === title || h.startsWith(`${title} `)) : -1;
  const missing = Object.entries(idx).filter(([, i]) => i < 0).map(([k]) => COLUMNS[k]);
  if (missing.length) throw new Error(`T-Systems LLM Hub: ${label} header columns missing (${missing.join(", ")})`);
  // Rows with a different cell count are table chrome ("No models match the current filters.").
  return rows.filter((r) => r !== header && r.length === header.length).map((r) => ({
    model: r[idx.model], provider: r[idx.provider], cloud: r[idx.cloud], input: r[idx.input], output: r[idx.output],
    context: r[idx.context], in: parseEur(r[idx.in]), out: parseEur(r[idx.out]), cached: parseEur(r[idx.cached]), plans: r[idx.plans],
  }));
}

export function hostingFor(cloud) {
  if (/^Telekom\b/.test(cloud)) return { hosting_class: "sovereign_germany", server_location: "Germany", is_externally_hosted: false };
  if (/^Azure\b/.test(cloud)) return { hosting_class: "routed_azure_eu", server_location: "Azure EU regions", is_externally_hosted: true };
  // "GCP / Azure" (Claude) follows the audited precedent of every existing Claude row.
  if (/^GCP\b/.test(cloud)) return { hosting_class: "routed_gcp_eu", server_location: "GCP EU regions", is_externally_hosted: true };
  return null;
}

const ORG = { "zhipu ai": "Z.ai", "mistral ai": "Mistral", openai: "OpenAI", anthropic: "Anthropic", google: "Google", alibaba: "Alibaba", nvidia: "NVIDIA" };
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
  for (const [key, row] of live) {
    const old = oldByKey.get(key);
    const derivedHosting = hostingFor(row.cloud);
    if (!old && !derivedHosting) throw new Error(`T-Systems LLM Hub: unknown Cloud "${row.cloud}" for new model ${row.model}`);
    const preview = /^test$/i.test(row.plans.trim());
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
      context_length_label: row.context,
      notes: `Official ${preview ? "preview" : "active"} model table (${row.table}) checked ${day}. ${row.cloud}; ${row.input} input / ${row.output} output. Plans: ${row.plans}.`,
    };
    if (row.cached === null) { delete model.cache_read_per_1m_eur; delete model.cache_read_per_1m_usd; }
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
