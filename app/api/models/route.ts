import { NextResponse } from "next/server";
import { getDataset, cheapestOffers, modelCost, scoreOf } from "../../../lib/data";
import { clientData } from "../../../lib/client-model";
import { compositeBenchmaxxingSignals } from "../../../lib/composite-signals";
import type { ScoreKey } from "../../../lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const featured = searchParams.get("featured") === "1";
  const hasBenchmark = searchParams.get("hasBenchmark") === "1";
  const score = (searchParams.get("score") as ScoreKey) || "aa_coding_index";
  const ds = await getDataset();
  const clientById = new Map(clientData(ds, {}, await compositeBenchmaxxingSignals()).models.map((model) => [model.id, model]));

  let models = ds.models;
  if (featured) models = models.filter((m) => m.featured);
  if (hasBenchmark) models = models.filter((m) => m.has_benchmark);

  const out = models.map((m) => ({
    id: m.id,
    family_key: m.family_key,
    family_name: m.family_name,
    display_name: m.display_name,
    org: m.org,
    variant: m.variant,
    open_weights: m.open_weights,
    featured: m.featured,
    score: score === "composite" ? (clientById.get(m.id)?.scores.composite ?? 50) : scoreOf(m, score),
    // CR-74.4: `score` (composite) includes the marginal Benchmaxxing penalty, as on the site by default.
    composite_unpenalised: clientById.get(m.id)?.composite_raw ?? 50,
    benchmaxxing_signal: clientById.get(m.id)?.composite_signal ?? null,
    composite_base: clientById.get(m.id)?.composite_base ?? 50,
    composite_coverage: clientById.get(m.id)?.composite_coverage ?? 0,
    // CR-85.1: attached inputs count toward the thin-data rule (isThinComposite), so the daily digest can list thin rows.
    composite_attached: clientById.get(m.id)?.composite_attached ?? 0,
    release_date: m.release_date,
    benchmarks: m.benchmarks,
    designarena: m.designarena,
    cost_blended_10to1: modelCost(m),
    cheapest_offers: cheapestOffers(m, 5),
    offer_count: m.offers.length,
    copilot: m.copilot,
  }));

  return NextResponse.json({ generated_at: ds.generated_at, count: out.length, score, models: out });
}
