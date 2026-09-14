// R9.1: executable collector for the TensorX pricing table (data/raw/tensorx.json).
// Pure parser: the server-rendered https://tensorx.ai/pricing/ HTML plus the previous snapshot in,
// the normalized `models` array out. Columns are located by header text, not position. Curated
// rows are matched by `api_model_id` (the table's "provider/slug"), else by normalized name
// against the slug tail. The slug is stored as `api_model_id`, never `model_id`: build-dataset
// uses `model_id` as the family identity and the older rows are keyed by `model_name`.

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#8217;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const cellText = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
export const nameKey = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const ORG_BY_VENDOR = { "z-ai": "Z.ai", moonshotai: "Moonshot AI", qwen: "Alibaba", deepseek: "DeepSeek", minimax: "MiniMax", "meta-llama": "Meta", openai: "OpenAI", google: "Google", mistralai: "Mistral" };

export function parsePrice(text) {
  const t = String(text || "").trim();
  if (t === "-" || t === "" || /^n\/?a$/i.test(t)) return null;
  const m = /^\$([0-9]+(?:\.[0-9]+)?)$/.exec(t);
  if (!m) throw new Error(`TensorX pricing: unreadable price "${t}"`);
  return Number(m[1]);
}

export function readTable(html) {
  const table = /<table\b[\s\S]*?<\/table>/i.exec(String(html))?.[0];
  if (!table) throw new Error("TensorX pricing: no <table> (page layout changed?)");
  const rows = [...table.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((r) => [...r[0].matchAll(/<t([dh])\b[^>]*>([\s\S]*?)<\/t\1>/gi)].map((c) => cellText(c[2])));
  const header = rows.find((r) => r.includes("Model Name"));
  const need = ["Model Name", "Context", "Input Price", "Cache Read", "Output Price"];
  const idx = Object.fromEntries(need.map((h) => [h, header ? header.indexOf(h) : -1]));
  if (need.some((h) => idx[h] < 0)) throw new Error(`TensorX pricing: header columns missing (${need.filter((h) => idx[h] < 0).join(", ")})`);
  return rows.filter((r) => r !== header && r.length === header.length).map((r) => ({
    slug: r[idx["Model Name"]], context: r[idx.Context],
    input: parsePrice(r[idx["Input Price"]]), cache: parsePrice(r[idx["Cache Read"]]), output: parsePrice(r[idx["Output Price"]]),
  }));
}

export function derivedModelName(slug) {
  return String(slug).split("/").pop().split("-").map((w) => (/^[a-z]/.test(w) ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
}

export function parseTensorxPricing(html, previous = { models: [] }, { minRetainedShare = 0.5 } = {}) {
  const rows = readTable(html);
  if (rows.length === 0) throw new Error("TensorX pricing: empty table");
  const prev = previous.models || [];
  const byId = new Map(prev.filter((m) => m.api_model_id).map((m) => [m.api_model_id, m]));
  const byName = new Map(prev.map((m) => [nameKey(m.model_name), m]));
  const matched = new Set();
  const skipped = [];
  const seen = new Set();
  const models = [];
  for (const row of rows) {
    if (!/^[a-z0-9._-]+\/[a-z0-9._-]+$/i.test(row.slug)) throw new Error(`TensorX pricing: unexpected model name "${row.slug}"`);
    if (seen.has(row.slug)) throw new Error(`TensorX pricing: ${row.slug} listed twice`);
    seen.add(row.slug);
    // Embeddings show "-" for output; only rows with both token prices are chat models.
    if (row.input === null || row.output === null) { skipped.push(row.slug); continue; }
    const old = byId.get(row.slug) ?? byName.get(nameKey(row.slug.split("/").pop()));
    if (old) matched.add(old);
    const model = {
      ...(old || {}),
      model_name: old?.model_name ?? derivedModelName(row.slug),
      provider_org: old?.provider_org ?? ORG_BY_VENDOR[row.slug.split("/")[0].toLowerCase()],
      input_per_1m_usd: row.input,
      output_per_1m_usd: row.output,
      cache_read_per_1m_usd: row.cache ?? undefined,
      region: "eu",
      api_model_id: row.slug,
      notes: `tensorx.ai/pricing ${row.slug}; ${row.context} ctx`,
    };
    if (!old) model.mapping = "derived";
    for (const k of Object.keys(model)) if (model[k] === undefined) delete model[k];
    models.push(model);
  }
  if (models.length === 0) throw new Error("TensorX pricing: no priced chat models");
  if (prev.length > 0 && matched.size < prev.length * minRetainedShare) {
    throw new Error(`TensorX pricing: only ${matched.size}/${prev.length} previous models still listed; refusing to replace the snapshot`);
  }
  const oldBySlug = new Map(prev.filter((m) => matched.has(m)).map((m) => [models.find((n) => n.model_name === m.model_name)?.api_model_id, m]));
  return {
    models,
    skipped,
    diff: {
      added: models.filter((m) => m.mapping === "derived").map((m) => m.api_model_id),
      removed: prev.filter((m) => !matched.has(m)).map((m) => m.model_name),
      price_changed: models.filter((m) => {
        const o = oldBySlug.get(m.api_model_id);
        return o && ["input_per_1m_usd", "output_per_1m_usd", "cache_read_per_1m_usd"].some((k) => (o[k] ?? null) !== (m[k] ?? null));
      }).map((m) => m.api_model_id),
    },
  };
}
