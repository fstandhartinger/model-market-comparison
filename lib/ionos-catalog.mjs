// R9.1: executable collector for the IONOS AI Model Hub catalog (data/raw/ionos.json).
// Pure parser: the server-rendered price pages https://cloud.ionos.com/prices (official localized
// USD) and https://cloud.ionos.de/preise (original EUR), the previous snapshot in, normalized rows
// out. Each section is an `<h…><span>Heading</span>` followed by a `<table>` whose header names an
// input- and an output-token price; tables with a single price (embeddings) or per-image prices are
// not text-generating models. IONOS rounds its own USD prices, so no FX rate is applied.

const decode = (s) => String(s).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;| /g, " ");
const text = (html) => decode(String(html).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
export const nameKey = (name) => String(name || "").toLowerCase().replace(/\([^)]*\)/g, "").replace(/\binstruct\b/g, "").replace(/[^a-z0-9]/g, "");

/** Rows of every two-token-price table: { section, name, input, output } with prices as numbers. */
export function readPriceTables(html, currency) {
  const tables = [...String(html).matchAll(/<table[\s\S]*?<\/table>/g)];
  const rows = [];
  for (const t of tables) {
    const before = String(html).slice(Math.max(0, t.index - 4000), t.index);
    const section = text([...before.matchAll(/tw-text-5xl[^>]*>(?:\s*<[^>]+>)*([^<]+)</g)].pop()?.[1] ?? "").replace(/\s+(new|neu)$/i, "");
    const header = text(/<thead[\s\S]*?<\/thead>/.exec(t[0])?.[0] ?? /<tr[\s\S]*?<\/tr>/.exec(t[0])?.[0] ?? "");
    if (!/input/i.test(header) || !/output/i.test(header)) continue;
    for (const tr of t[0].matchAll(/<tr[\s\S]*?<\/tr>/g)) {
      const cells = [...tr[0].matchAll(/<td[\s\S]*?<\/td>/g)].map((c) => c[0]);
      // Some tables render their header as a <td> row ("Model | Price per 1 million input tokens").
      if (cells.length !== 3 || /input|output/i.test(text(cells[1]) + text(cells[2]))) continue;
      const name = text(cells[0].replace(/<span[^>]*tw-rounded-sm[^>]*>[\s\S]*?<\/span>/g, ""));
      const price = (cell) => {
        const raw = text(cell);
        const m = currency === "USD" ? /^\$\s?([0-9]*[.,]?[0-9]+)$/.exec(raw) : /^([0-9]+(?:[.,][0-9]+)?)\s?€$/.exec(raw);
        if (!m) throw new Error(`IONOS ${currency} prices: ${name} has unreadable price "${raw}"`);
        return Number(m[1].replace(",", "."));
      };
      if (!name) continue;
      rows.push({ section, name, input: price(cells[1]), output: price(cells[2]) });
    }
  }
  if (rows.length === 0) throw new Error(`IONOS ${currency} prices: no token price tables (page layout changed?)`);
  const byKey = new Map();
  for (const r of rows) {
    const seen = byKey.get(nameKey(r.name));
    if (seen && (seen.input !== r.input || seen.output !== r.output)) throw new Error(`IONOS ${currency} prices: ${r.name} listed twice with different prices`);
    if (!seen) byKey.set(nameKey(r.name), r);
  }
  return [...byKey.values()];
}

const ORG = [[/^qwen/i, "Alibaba"], [/^gpt-oss/i, "OpenAI"], [/llama/i, "Meta"], [/mistral|mixtral|codestral/i, "Mistral"], [/lighton/i, "LightOn"], [/deepseek/i, "DeepSeek"], [/gemma/i, "Google"]];
const eurLabel = (v) => `€${v.toFixed(2)}`;

export function parseIonosCatalog(usdHtml, eurHtml, previous = { models: [] }, { minRetainedShare = 0.5 } = {}) {
  const usdRows = readPriceTables(usdHtml, "USD");
  const eurByKey = new Map(readPriceTables(eurHtml, "EUR").map((r) => [nameKey(r.name), r]));
  const prev = previous.models || [];
  const findOld = (name) => prev.find((m) => m.catalog_name === name)
    ?? prev.find((m) => nameKey(m.model_name) === nameKey(name))
    ?? prev.find((m) => String(m.notes || "").includes(name));
  const matched = new Set();
  const models = [];
  const eur_missing = [];
  for (const row of usdRows) {
    const old = findOld(row.name);
    if (old) matched.add(old);
    const eur = eurByKey.get(nameKey(row.name));
    if (!eur) eur_missing.push(row.name);
    // The notes keep their curated tail; only the leading "€in/€out" EUR label is refreshed.
    const [, sep = "; ", tail = ""] = /^(?:€[0-9.]+\/€[0-9.]+)?(;\s*|\s+)?([\s\S]*)$/.exec(String(old?.notes || "")) ?? [];
    const model = {
      ...(old || {}),
      model_name: old?.model_name ?? row.name,
      catalog_name: row.name,
      provider_org: old?.provider_org ?? ORG.find(([re]) => re.test(row.name))?.[1],
      input_per_1m_usd: row.input,
      output_per_1m_usd: row.output,
      region: "eu",
      catalog_section: row.section || undefined,
      notes: (() => { const label = eur ? `${eurLabel(eur.input)}/${eurLabel(eur.output)}` : "EUR price not listed on cloud.ionos.de/preise at collection time"; const rest = tail || (old ? "" : row.name); return rest ? `${label}${sep}${rest}` : label; })(),
    };
    if (!old) model.mapping = "derived";
    for (const k of Object.keys(model)) if (model[k] === undefined) delete model[k];
    models.push(model);
  }
  if (prev.length > 0 && matched.size < prev.length * minRetainedShare) {
    throw new Error(`IONOS prices: only ${matched.size}/${prev.length} previous models still listed; refusing to replace the snapshot`);
  }
  return {
    models,
    eur_missing,
    diff: {
      added: models.filter((m) => m.mapping === "derived" && !prev.includes(m)).map((m) => m.catalog_name),
      removed: prev.filter((m) => !matched.has(m)).map((m) => m.model_name),
      usd_price_changed: models.filter((m) => {
        const o = prev.find((p) => matched.has(p) && p.model_name === m.model_name);
        return o && (o.input_per_1m_usd !== m.input_per_1m_usd || o.output_per_1m_usd !== m.output_per_1m_usd);
      }).map((m) => m.model_name),
    },
  };
}
