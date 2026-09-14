// R9.1: executable collector for the Google Vertex AI catalog (data/raw/google-vertex.json).
// Pure parser: the public pricing page https://cloud.google.com/vertex-ai/generative-ai/pricing (it redirects to
// the Gemini Enterprise Agent Platform pricing page; every table, including the partner models and the per-region
// Claude panes, is in the server-rendered HTML) and the previous snapshot in, re-priced rows out. Each curated row
// names its exact place on the page in `price_ref`: { section, pane?, label, region? } — section = the heading above
// the table, pane = the region tab the table sits in (Claude only), label = the model cell, region = the Gemini 3
// "Region" column ("Global" / "Non-global"). Priority and Flex/Batch tables are ignored. The parser never adds a
// row; a row whose reference is gone or unreadable keeps its previous prices and `price_checked_at`.

const NAMED = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—" };
const decode = (s) => String(s)
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);
const text = (html) => decode(String(html).replace(/<[^>]+>/g, " ")).replace(/[\s​﻿]+/g, " ").trim();
/** Model and region cells lose footnote asterisks and extra spaces ("Gemini 3.7 Flash * through …"). */
export const cleanLabel = (s) => String(s).replace(/\*/g, " ").replace(/\s+/g, " ").trim();
const attr = (tag, name) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

// Unparseable cells ("No charge", per-page prices) become NaN; they only matter if a referenced row reads them.
function price(raw) {
  const t = cleanLabel(raw);
  if (!t || /^(N\/?A|-|—)$/i.test(t)) return null;
  const m = /^\$\s?([0-9]*\.?[0-9]+)$/.exec(t);
  return m ? Number(m[1]) : Number.NaN;
}

function divEnd(html, start) {
  const re = /<(\/?)div\b[^>]*>/g;
  re.lastIndex = start;
  let depth = 0;
  for (let m; (m = re.exec(html));) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return re.lastIndex;
  }
  return html.length;
}

/** Every standard price table: { section, pane, rows: [{ label, type, region, price, cached }] }. */
export function readVertexTables(html) {
  const src = String(html);
  const tabLabels = new Map();
  for (const m of src.matchAll(/<button\b[^>]*role="tab"[^>]*>/g)) {
    const id = attr(m[0], "id"), label = attr(m[0], "track-metadata-eventdetail");
    if (id && label) tabLabels.set(id, cleanLabel(decode(label)));
  }
  const panels = [...src.matchAll(/<div\b[^>]*role="tabpanel"[^>]*>/g)].map((m) => ({ start: m.index, end: divEnd(src, m.index), label: tabLabels.get(attr(m[0], "aria-labelledby")) ?? null }));
  const headings = [...src.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => ({ at: m.index, text: text(m[2]) }));
  const tables = [];
  for (const t of src.matchAll(/<table\b[\s\S]*?<\/table>/g)) {
    const section = headings.filter((h) => h.at < t.index).pop()?.text ?? "";
    const pane = panels.filter((p) => p.start < t.index && t.index < p.end).pop()?.label ?? null;
    const trs = [...t[0].matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map((r) => [...r[0].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => text(c[1])));
    if (trs.length < 2) continue;
    const header = trs[0];
    const typeIdx = header.findIndex((h) => /^type$/i.test(h));
    const regionIdx = header.findIndex((h) => /^region$/i.test(h));
    const priceIdx = header.findIndex((h, i) => i > Math.max(typeIdx, regionIdx) && /price/i.test(h));
    if (typeIdx !== 1 || priceIdx < 0 || /with (priority|flex|batch)/i.test(header[priceIdx])) continue;
    const cachedIdx = header.findIndex((h, i) => i > priceIdx && /cached input/i.test(h) && !/>\s*200K/i.test(h));
    let label = "", type = "", region = null;
    const rows = [];
    for (const cells of trs.slice(1)) {
      if (cells.length <= priceIdx) continue;
      label = cleanLabel(cells[0]) || label;
      type = cleanLabel(cells[typeIdx]) || type;
      if (regionIdx >= 0) region = cleanLabel(cells[regionIdx]) || region;
      rows.push({ label, type, region, price: price(cells[priceIdx]), cached: cachedIdx >= 0 ? price(cells[cachedIdx] ?? "") : null });
    }
    tables.push({ section, pane, rows });
  }
  if (tables.length === 0) throw new Error("Vertex pricing: no standard price tables (page layout changed?)");
  return tables;
}

const INPUT_RE = /^input(\s*\(text[^)]*\)|\s+text|\s+tokens)?$/i;
const OUTPUT_RE = /^(text\s+)?output(\s*\(response and reasoning\)|\s+text|\s+tokens)?$/i;
const CACHE_RE = /^(cache hit|cached input:?)$/i;

/** { status: "ok", input, output, cached } | { status: "missing" } | { status: "unreadable", reason } for one price_ref. */
export function lookupPriceRef(tables, ref) {
  const hits = tables
    .filter((t) => t.section === ref.section && t.pane === (ref.pane ?? null))
    .map((t) => t.rows.filter((r) => r.label === ref.label && (ref.region == null || r.region === ref.region)))
    .filter((rows) => rows.length);
  if (hits.length === 0) return { status: "missing" };
  if (hits.length > 1) return { status: "unreadable", reason: `listed in ${hits.length} standard tables` };
  const rows = hits[0];
  const one = (re, kind) => {
    const values = [...new Set(rows.filter((r) => re.test(r.type) && r.price != null).map((r) => r.price))];
    if (values.some(Number.isNaN)) throw new Error(`unreadable ${kind} price`);
    if (values.length > 1) throw new Error(`${values.length} different ${kind} prices`);
    return values[0] ?? null;
  };
  try {
    const input = one(INPUT_RE, "input"), output = one(OUTPUT_RE, "output");
    if (input == null || output == null) return { status: "unreadable", reason: `no ${input == null ? "input" : "output"} price row` };
    const cacheRow = one(CACHE_RE, "cache hit");
    const cachedCol = [...new Set(rows.filter((r) => INPUT_RE.test(r.type) && Number.isFinite(r.cached)).map((r) => r.cached))];
    return { status: "ok", input, output, cached: cacheRow ?? (cachedCol.length === 1 ? cachedCol[0] : null) };
  } catch (error) {
    return { status: "unreadable", reason: error.message };
  }
}

const refText = (ref) => [ref.section, ref.pane, ref.label, ref.region].filter(Boolean).join(" / ");

export function parseVertexCatalog(html, previous = { models: [] }, { minRetainedShare = 0.5, today = new Date().toISOString().slice(0, 10) } = {}) {
  const prev = previous.models ?? [];
  const mapped = prev.filter((m) => m.price_ref);
  if (mapped.length === 0) throw new Error("Vertex pricing: previous snapshot has no price_ref mapping");
  const tables = readVertexTables(html);
  if (mapped.some((m) => m.price_ref.pane) && !tables.some((t) => t.pane)) throw new Error("Vertex pricing: no region panes found (page layout changed?)");
  const models = [], unlisted = [], unreadable = [], priceChanged = [], suspicious = [], unmapped = [];
  let confirmed = 0;
  for (const row of prev) {
    const checked = row.price_checked_at ?? previous.collected_at ?? null;
    if (!row.price_ref) { models.push(row); unmapped.push(row.model_name); continue; }
    const hit = lookupPriceRef(tables, row.price_ref);
    const keep = () => models.push({ ...row, price_checked_at: checked });
    if (hit.status === "missing") { unlisted.push(`${row.model_name} [${row.region}] (${refText(row.price_ref)} not on the page)`); keep(); continue; }
    if (hit.status === "unreadable") { unreadable.push(`${row.model_name} [${row.region}] (${refText(row.price_ref)}: ${hit.reason})`); keep(); continue; }
    if (hit.input > hit.output) { suspicious.push(`${row.model_name} [${row.region}]: input ${hit.input} > output ${hit.output}; previous prices kept`); keep(); continue; }
    const next = { ...row, input_per_1m_usd: hit.input, output_per_1m_usd: hit.output, price_checked_at: today };
    if (row.cache_read_per_1m_usd != null && hit.cached != null) next.cache_read_per_1m_usd = hit.cached;
    if (row.input_per_1m_usd !== next.input_per_1m_usd || row.output_per_1m_usd !== next.output_per_1m_usd) {
      priceChanged.push(`${row.model_name} [${row.region}]: ${row.input_per_1m_usd}/${row.output_per_1m_usd} -> ${next.input_per_1m_usd}/${next.output_per_1m_usd}`);
    }
    confirmed += 1;
    models.push(next);
  }
  if (confirmed < mapped.length * minRetainedShare) throw new Error(`Vertex pricing: only ${confirmed}/${mapped.length} mapped rows readable; refusing to replace the snapshot`);
  // Models priced in the sections we already track but referenced by no row — a curation hint, never auto-added.
  const sections = new Set(mapped.map((m) => m.price_ref.section));
  const referenced = new Set(mapped.map((m) => `${m.price_ref.section} ${m.price_ref.label}`));
  const unreferenced = [...new Set(tables.filter((t) => sections.has(t.section)).flatMap((t) => t.rows.map((r) => `${t.section} ${r.label}`)))]
    .filter((k) => !referenced.has(k)).map((k) => k.replace(" ", " / "));
  return { models, confirmed, diff: { price_changed: priceChanged, unlisted, unreadable, suspicious, unmapped, unreferenced } };
}
