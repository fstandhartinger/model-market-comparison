import { getDataset } from "./data";
import { clientData, type ClientBenchmaxxing, type FamilyOption, type ProviderInfo } from "./client-model";
import { getBenchmarkView } from "./benchmark-data";
import { benchmaxxingFamilySignals, scoreBenchmaxxing } from "./benchmax.mjs";
import { buildBenchmarkComparison } from "./benchmark-comparison.mjs";
import { getBenchmarkMatrixPage } from "./benchmark-matrix-data";
import { importantMatrix } from "./benchmark-matrix.mjs";
import { selectBenchmarkView, selectFamilyBenchmarkView } from "./benchmark-view.mjs";
import { defaultComparePicks } from "./radar.mjs";
import { DEFAULT_BENCHMAXXING_PRESET, presetRows, type BenchmaxxingOverviewRow } from "./benchmaxxing-presets";

/**
 * CR-62.1 (Florian 2026-09-16): link-preview crawlers (X, WhatsApp, Telegram, Facebook) give up on pages
 * of several MB, and the catalog pages inlined their whole client dataset into the server-rendered
 * flight payload (the homepage was 8.25 MB). The heavy props now travel as JSON from
 * `/api/page-data/<key>?v=<dataset version>`; the pages keep their server-rendered head and hero.
 * The payloads are exactly the props the pages used to pass, built by the same functions.
 */
export const PAGE_DATA_KEYS = ["home", "catalog", "benchmarks", "ranking", "compare", "benchmaxxing", "filters"] as const;
export type PageDataKey = (typeof PAGE_DATA_KEYS)[number];
export const isPageDataKey = (key: string): key is PageDataKey => (PAGE_DATA_KEYS as readonly string[]).includes(key);

/** Changes whenever the dataset does, so the versioned URL can be cached by browsers. */
export async function pageDataVersion(): Promise<string> {
  const ds = await getDataset();
  return String(ds.generated_at ?? "unknown");
}

async function build(key: PageDataKey): Promise<unknown> {
  const ds = await getDataset();
  if (key === "catalog") return clientData(ds);
  if (key === "filters") {
    // The Options sheet's provider and model lists (every page's layout used to inline them, ~80 KB).
    const providers: ProviderInfo[] = ds.providers.map((p) => ({
      key: `${p.platform}::${p.provider}`, platform: p.platform, provider: p.provider, model_count: p.model_count,
      eu_hosted: p.eu_hosted, eu_dedicated: p.eu_dedicated, non_us: p.non_us,
      hyperscaler: p.hyperscaler, country: p.country, note: p.note, coming_soon: p.coming_soon, website: p.website ?? null,
    }));
    const famMap = new Map<string, FamilyOption>();
    for (const m of ds.models) if (!famMap.has(m.family_key)) famMap.set(m.family_key, { key: m.family_key, name: m.family_name, org: m.org });
    return { providers, families: [...famMap.values()].sort((a, b) => a.name.localeCompare(b.name)) };
  }
  const view = await getBenchmarkView();
  if (key === "home") {
    // Overview carries the same tag as the dedicated Benchmaxxing page (one shared implementation
    // over the whole catalog). CR-21.1: the verdict belongs to the model (family), so every reasoning
    // variant shows its family's score and tag.
    const { reports, tagged, weak, representatives } = benchmaxxingFamilySignals(view);
    const familyScore = new Map(reports.map(([id, report]) => [view.models.find((m) => m.id === id)?.family ?? id, report.score ?? null]));
    const benchmaxxing: Record<string, ClientBenchmaxxing> = Object.fromEntries(view.models.filter((m) => familyScore.has(m.family ?? m.id))
      .map((m) => [m.id, { score: familyScore.get(m.family ?? m.id) ?? null, signal: tagged.has(m.id), level: tagged.has(m.id) ? "strong" : weak.has(m.id) ? "weak" : null,
        reportId: representatives.get(m.family ?? m.id) ?? m.id }]));
    const data = { ...clientData(ds, benchmaxxing), comparison: buildBenchmarkComparison(view) };
    // CR-7.1: the simple Benchmarks section gets only the "Important" rows, not the full matrix.
    return { data, matrix: importantMatrix((await getBenchmarkMatrixPage()).matrix) };
  }
  if (key === "benchmarks") return getBenchmarkMatrixPage();
  if (key === "ranking") {
    const first = view.axes.find((a) => a.family === "aa_intelligence_index") || view.axes[0];
    return { initialView: selectBenchmarkView(view, [], first.id), axisList: view.axes.map((a) => ({ ...a, scores: [], estimates: [] })) };
  }
  if (key === "compare") {
    // CR-14.1: the two most capable current model families, from the data (not a fixed pair).
    const initialView = selectFamilyBenchmarkView(view, defaultComparePicks(view));
    return { initialView, initialPicks: initialView.picks ?? [] };
  }
  // benchmaxxing
  const compositeById = new Map(clientData(ds).models.map((m) => [m.id, m.scores.composite]));
  // CR-21.1: one row per model family (its most-covered scored variant); the tag is the family's verdict.
  const { reports, tagged, taggedFamilies, weak } = benchmaxxingFamilySignals(view);
  const reportsById = new Map(view.models.map((m) => [m.id, scoreBenchmaxxing(view, m.id)]));
  const models = view.models.map((m) => {
    const report = reportsById.get(m.id)!;
    return { id: m.id, name: m.name, org: m.org, composite: compositeById.get(m.id) ?? null,
      coverageAxes: report.profile.measured, totalAxes: report.profile.total, tagged: tagged.has(m.id) };
  }).sort((a, b) => b.coverageAxes - a.coverageAxes || (b.composite ?? -Infinity) - (a.composite ?? -Infinity) || a.name.localeCompare(b.name));
  const byId = new Map(models.map((m) => [m.id, m]));
  const scored = reports.map(([id, report]) => ({ model: byId.get(id), report })).filter((item): item is { model: (typeof models)[number]; report: ReturnType<typeof scoreBenchmaxxing> } => Boolean(item.model && item.report.status === "scored"));
  // CR-15.2: every scored model family reaches the client; the table's preset (Featured by default) chooses the list.
  // A family counts as featured when any of its variants is featured.
  const featuredFamilies = new Set(ds.models.filter((m) => m.featured).map((m) => m.family_key));
  const rows: BenchmaxxingOverviewRow[] = scored.map(({ model, report }) => ({
    id: model.id, name: model.name, org: model.org, score: report.score!, comparisons: report.comparisons, topics: report.topics,
    measured: report.profile.measured, total: report.profile.total, domainSpecialization: report.domainSpecialization,
    composite: model.composite, featured: featuredFamilies.has(view.models.find((m) => m.id === model.id)?.family ?? ""), tagged: tagged.has(model.id),
    level: tagged.has(model.id) ? "strong" : weak.has(model.id) ? "weak" : null,
  }));
  // The report opens on the first row of the default preset (CR-63.4: the strongest signal).
  const defaultModel = presetRows(rows, DEFAULT_BENCHMAXXING_PRESET)[0] ?? [...models].filter((m) => m.coverageAxes >= 40).sort((a, b) => (b.composite ?? -Infinity) - (a.composite ?? -Infinity) || a.name.localeCompare(b.name))[0] ?? models[0];
  const initial = defaultModel ? { id: defaultModel.id, report: scoreBenchmaxxing(view, defaultModel.id) } : null;
  return { rows, models, initial, taggedCount: taggedFamilies.size };
}

// One serialised body per key and dataset version: the JSON is built once, not per request.
const memo = new Map<PageDataKey, { version: string; body: Promise<string> }>();
export async function pageDataBody(key: PageDataKey): Promise<{ version: string; body: string }> {
  const version = await pageDataVersion();
  let hit = memo.get(key);
  if (!hit || hit.version !== version) {
    hit = { version, body: build(key).then((value) => JSON.stringify(value)) };
    hit.body.catch(() => memo.delete(key));
    memo.set(key, hit);
  }
  return { version, body: await hit.body };
}
