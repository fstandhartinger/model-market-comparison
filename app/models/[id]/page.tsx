import type { Metadata } from "next";
import Link from "next/link";
import { previewMetadata } from "../../../lib/seo";
import { benchmaxxingByFamily } from "../../../lib/page-data";
import { SignalValue } from "../../../components/SignalValue";
import { benchmaxxingLevelInfo } from "../../../lib/benchmaxxing-levels.mjs";
import { notFound } from "next/navigation";
import { getDataset } from "../../../lib/data";
import { num, pct, orgColor, usdPerM } from "../../../lib/format";
import { clientData } from "../../../lib/client-model";
import { compositeBenchmaxxingSignals } from "../../../lib/composite-signals";
import { CompositeScoreValue } from "../../../components/CompositeScoreValue";
import { cacheHitBaseline } from "../../../lib/effective-cost.mjs";
import { ModelDetailOffers } from "../../../components/ModelDetailOffers";

import { getBenchmarkView } from '../../../lib/benchmark-data';
import { selectBenchmarkView } from '../../../lib/benchmark-view.mjs';
import { BenchmarkSheet } from '../../../components/BenchmarkSheet';
import { scoreVersion } from '../../../lib/score-label';
import { percentileFor } from '../../../lib/benchmax.mjs';
import { MiniRadar } from '../../../components/MiniRadar';
import { InfoTip } from '../../../components/InfoTip';
import { SpeedLine } from '../../../components/SpeedContext';
import type { ScoreKey } from '../../../lib/types';
import { AaCredit } from '../../../components/AaCredit';
import { EpochCredit } from '../../../components/EpochCredit';

/** Mid-rank percentile of `value` among every model with a value on that input (0–100). */
function catalogPercentile(values: number[], value: number | null): number | null {
  if (value == null || values.length < 2) return null;
  const below = values.filter((v) => v < value).length;
  const equal = values.filter((v) => v === value).length;
  return ((below + (equal - 1) / 2) / (values.length - 1)) * 100;
}

export const dynamic = "force-dynamic";

// CR-62.2: each model page previews as itself.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const ds = await getDataset();
  const model = ds.models.find((m) => m.id === decodeURIComponent(id) || m.family_key === decodeURIComponent(id));
  if (!model) return { title: "Model not found" };
  return previewMetadata({ path: `/models/${encodeURIComponent(model.id)}`, documentTitle: `${model.display_name} — benchmarks & cost`, title: `${model.display_name} — Benchmark Heaven`,
    description: `${model.display_name} by ${model.org}: every benchmark result with its source, and what it actually costs per task across providers.` });
}

export default async function ModelDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ds = await getDataset();
  const data = clientData(ds, {}, await compositeBenchmaxxingSignals()); // CR-74.4
  const model = ds.models.find((m) => m.id === decodeURIComponent(id) || m.family_key === decodeURIComponent(id));
  if (!model) notFound();

  const variants = ds.models
    .filter((m) => m.family_key === model.family_key)
    .sort((a, b) => (b.benchmarks?.aa_coding_index ?? -1) - (a.benchmarks?.aa_coding_index ?? -1));
  const offers = data.offersByModel[model.id] || [];
  const clientModel = data.models.find((candidate) => candidate.id === model.id);
  if (!clientModel) notFound();
  // CR-62.1: only this model's endpoint observations reach the page (the full table is 1.1 MB); the
  // catalog-wide typical cache-hit rate those prices fall back to is computed here from the full table.
  const endpoints = data.efficiency?.openrouter_endpoints ?? {};
  const efficiency = data.efficiency && {
    ...data.efficiency,
    openrouter_endpoints: Object.fromEntries(offers.flatMap((o) => o.or_model_id && endpoints[o.or_model_id] ? [[o.or_model_id, endpoints[o.or_model_id]]] : [])),
    cache_hit_baseline: cacheHitBaseline(data.efficiency, data.generated_at),
  };
  const pricingData = { efficiency, sourceDates: data.sourceDates, generated_at: data.generated_at };
  // CR-62.1: the offers panels only look up the providers of this model's offers.
  const offerKeys = new Set(offers.map((o) => o.key));
  const providers = data.providers.filter((p) => offerKeys.has(p.key));
  const fullView = await getBenchmarkView();
  const benchmarkView = selectBenchmarkView(fullView, [model.id]);
  // F-08b: percentiles need the whole catalog, so they are taken before the view is narrowed.
  const percentiles = Object.fromEntries(fullView.axes
    .filter((axis) => axis.scores.some((row) => row.modelId === model.id))
    .map((axis) => [axis.id, percentileFor(axis, model.id)]));
  const b = model.benchmarks;
  const da = model.designarena;
  // CR-63.14: the family's Benchmaxxing verdict, the same one the Overview tag shows.
  const bmx = (await benchmaxxingByFamily()).get(model.family_key) ?? null;
  // The six Composite inputs of the mini radar (DesignArena's two boards share one axis: the
  // mean of the percentiles it has). Percentiles use the same display values as the ranking.
  const pctOf = (key: ScoreKey) => catalogPercentile(
    data.models.map((m) => m.scores[key]).filter((v): v is number => v != null), clientModel.scores[key]);
  const daPcts = [pctOf("designarena_frontend"), pctOf("designarena_fullstack")].filter((v): v is number => v != null);
  const radarAxes = [
    { label: "AA Coding", value: pctOf("aa_coding_index"), native: num(clientModel.scores.aa_coding_index), note: clientModel.composite_attachments.aa_coding_index?.note ?? null },
    { label: "Coding Agent v1.4", value: pctOf("aa_coding_agent"), native: num(clientModel.scores.aa_coding_agent), note: clientModel.composite_attachments.aa_coding_agent?.note ?? null },
    { label: "AA Intelligence", value: pctOf("aa_intelligence_index"), native: num(clientModel.scores.aa_intelligence_index), note: clientModel.composite_attachments.aa_intelligence_index?.note ?? null },
    { label: "AA Agentic", value: pctOf("aa_agentic_index"), native: num(clientModel.scores.aa_agentic_index), note: model.aa_agentic_attachment_note ?? null },
    { label: "Epoch ECI", value: pctOf("epoch_eci"), native: num(clientModel.scores.epoch_eci), note: model.epoch_eci_attachment_note ?? null },
    { label: "Software ECI", value: pctOf("epoch_eci_software"), native: num(clientModel.scores.epoch_eci_software), note: model.epoch_eci_attachment_note ?? null },
    { label: "DesignArena", value: daPcts.length ? daPcts.reduce((a, v) => a + v, 0) / daPcts.length : null,
      native: `${num(clientModel.scores.designarena_frontend, 0)}/${num(clientModel.scores.designarena_fullstack, 0)}`, note: model.designarena_attachment_note ?? null },
  ];

  return (
    <div>
      <Link href="/" className="text-sm text-accent">← All models</Link>
      {/* F-08b: title on one line; badges under it on phones, inline from md. */}
      <div className="mt-2 flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: orgColor(model.org) }} />
          {/* F-57: wraps on phones so the full name is readable; one truncated line from md. */}
          <h1 className="text-xl font-bold md:truncate md:text-2xl">{model.display_name}</h1>
        </div>
        {(model.open_weights || model.deprecated || model.featured) && <div className="flex flex-wrap gap-2">
          {model.open_weights && <span className="rounded bg-accent2/15 px-2 py-0.5 text-xs text-accent2">open weights</span>}
          {model.deprecated && <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">deprecated by benchmark source</span>}
          {model.featured && <span className="rounded bg-warn/15 px-2 py-0.5 text-xs text-warn">★ featured</span>}
        </div>}
      </div>
      <div className="mt-1 text-sm text-gray-400">
        {model.org}{model.release_date ? ` · released ${model.release_date}` : ""} · {offers.length} offers
      </div>
      <SpeedLine facts={{ outputTps: model.aa_speed?.output_tps, ttftS: model.aa_speed?.ttft_s, contextTokens: model.aa_metadata?.context_window_tokens }} date={ds.sources.artificialanalysis} />
      {model.manual_notes && <p className="mt-2 max-w-3xl text-xs text-warn/90">{model.manual_notes}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ModelDetailOffers offers={offers} providers={providers} model={clientModel} pricingData={pricingData} view="top" />

        {/* F-08b: the Composite as the headline, its inputs as a six-axis percentile radar,
            and the native numbers as a caption strip. */}
        <section className="card order-first min-w-0 p-4 lg:order-none" aria-label="Composite and its inputs">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Composite</h2>
            <span className="text-xs text-gray-500">{clientModel.composite_coverage + clientModel.composite_attached} of 7 inputs{clientModel.composite_attached ? ` · ${clientModel.composite_attached} from the model family` : ""}<span className="block text-right">6 radar axes: DesignArena&apos;s two boards share one</span></span>
          </div>
          {/* CR-74.4: the number follows the "Include Benchmaxxing signal in the score" option. */}
          <CompositeScoreValue raw={clientModel.composite_raw ?? clientModel.scores.composite} signal={clientModel.composite_signal ?? null} />
          {/* CR-65.3: a dominance adjustment above one point is disclosed where the number is. */}
          {clientModel.composite_raw != null && clientModel.composite_base != null && Math.abs(clientModel.composite_raw - clientModel.composite_base) > 1
            && <p className="text-xs text-gray-500" data-bh-composite-adjusted title="A better-measured model with results at least as good on every input this model has keeps the higher score">dominance-adjusted from {num(clientModel.composite_base)}: a better-measured model that is at least as good on each of these inputs ranks above it</p>}
          {bmx?.score != null && bmx.level && <p className="mt-2 text-sm" data-bh-model-benchmaxxing>
            <span className="bh-muted">Benchmaxxing signal</span> <SignalValue score={bmx.score} level={bmx.level} uncertain={bmx.uncertain} /> <span className="bh-muted">· {benchmaxxingLevelInfo(bmx.level)?.label}</span>{" "}
            <Link href={`/benchmaxxing?model=${encodeURIComponent(bmx.reportId)}#radar`} className="text-accent underline">report →</Link>
            {/* CR-77.2: the tag follows the score; where its evidence is thin the page says so instead of hiding the tag. */}
            {bmx.uncertain && <span className="bh-muted block text-xs" data-bh-model-benchmaxxing-uncertain>{bmx.uncertain}.</span>}
          </p>}
          <MiniRadar axes={radarAxes.map(({ label, value }) => ({ label, value }))} />
          <p className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-400">
            {radarAxes.map((axis) => (
              <span key={axis.label} className="inline-flex items-center whitespace-nowrap">
                {axis.label} <b className="ml-1 font-semibold tabular text-gray-200">{axis.native}</b>
                {axis.note && <InfoTip title={`${axis.label} attachment`} label={`the ${axis.label} attachment note`}>{axis.note}</InfoTip>}
              </span>
            ))}          </p>
          <p className="mt-1 text-center text-[11px] text-gray-500">Radar: percentile among all models measured on each input; a gap means not measured.</p>
          {model.benchmark_override_note && (
            <p className="mt-3 border-t border-line/50 pt-2 text-xs text-warn/90">⚠ {model.benchmark_override_note}</p>
          )}
        </section>
      </div>

      <BenchmarkSheet view={benchmarkView} modelId={model.id} percentiles={percentiles} attachments={clientModel.composite_attachments} />

      {/* Variants */}
      {variants.length > 1 && (
        <section className="card mt-6 overflow-x-auto p-4">
          <h2 className="font-semibold">Variants / reasoning settings</h2>
          <p className="mb-3 text-xs text-gray-500">Artificial Analysis snapshot {ds.sources.artificialanalysis} · <AaCredit /> · <EpochCredit /></p>
          <table className="dtable w-full text-sm">
            <thead><tr>
              <th className="px-2 py-1 text-left text-xs text-gray-400">Variant</th>
              <th className="px-2 py-1 text-right text-xs text-gray-400">AA Coding</th>
              <th className="px-2 py-1 text-right text-xs text-gray-400">AA Intelligence</th>
            </tr></thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} className={v.id === model.id ? "bg-accent/10" : ""}>
                  <td className="px-2 py-1">
                    <Link href={`/models/${encodeURIComponent(v.id)}`} className="hover:text-accent">{v.display_name}</Link>
                  </td>
                  <td className="px-2 py-1 text-right tabular">{num(v.benchmarks?.aa_coding_index)}</td>
                  <td className="px-2 py-1 text-right tabular">{num(v.benchmarks?.aa_intelligence_index)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* GitHub Copilot */}
      {model.copilot && (
        <section className="card mt-6 p-4">
          <p className="bh-eyebrow">SUBSCRIPTION PLAN</p>
          <h2 className="mb-2 font-semibold">GitHub Copilot</h2>
          {model.copilot.current && (
            <div>
              <p className="mb-2 text-xs text-gray-500">Current usage-based billing · model token cost is converted to AI Credits at 1 credit = $0.01.</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <div><span className="text-gray-400">Input</span> <span className="font-semibold tabular">{usdPerM(model.copilot.current.input_per_1m)}</span> / 1M</div>
                <div><span className="text-gray-400">Cached input</span> <span className="font-semibold tabular">{usdPerM(model.copilot.current.cached_input_per_1m)}</span> / 1M</div>
                {model.copilot.current.cache_write_per_1m != null && <div><span className="text-gray-400">Cache write</span> <span className="font-semibold tabular">{usdPerM(model.copilot.current.cache_write_per_1m)}</span> / 1M</div>}
                <div><span className="text-gray-400">Output</span> <span className="font-semibold tabular">{usdPerM(model.copilot.current.output_per_1m)}</span> / 1M</div>
                {model.copilot.current.release_status && <div><span className="text-gray-400">Status</span> <span className="font-semibold">{model.copilot.current.release_status}{model.copilot.current.feature_status ? ` · ${model.copilot.current.feature_status}` : ""}</span></div>}
              </div>
              {model.copilot.current.standard_pricing_from && (
                <p className="mt-2 text-xs text-warn/90">
                  Promotional pricing ends {model.copilot.current.promotion_ends_at}; from {model.copilot.current.standard_pricing_from}: {usdPerM(model.copilot.current.standard_input_per_1m)} input / {usdPerM(model.copilot.current.standard_output_per_1m)} output per 1M.
                </p>
              )}
              {model.copilot.current.notes && <p className="mt-2 text-xs text-gray-500">{model.copilot.current.notes}</p>}
            </div>
          )}
          {model.copilot.fast_mode && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-2 text-xs text-gray-500">Fast mode research preview · separate opt-in mode, not the standard model price.</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <div><span className="text-gray-400">Input</span> <span className="font-semibold tabular">{usdPerM(model.copilot.fast_mode.input_per_1m)}</span> / 1M</div>
                <div><span className="text-gray-400">Cached input</span> <span className="font-semibold tabular">{usdPerM(model.copilot.fast_mode.cached_input_per_1m)}</span> / 1M</div>
                <div><span className="text-gray-400">Output</span> <span className="font-semibold tabular">{usdPerM(model.copilot.fast_mode.output_per_1m)}</span> / 1M</div>
              </div>
              {model.copilot.fast_mode.notes && <p className="mt-2 text-xs text-gray-500">{model.copilot.fast_mode.notes}</p>}
            </div>
          )}
          {model.copilot.multiplier != null && (
            <div className={model.copilot.current ? "mt-4 border-t border-line pt-3" : ""}>
              <p className="mb-2 text-xs text-gray-500">Legacy annual Pro/Pro+ request billing only.</p>
              <div className="flex flex-wrap gap-6 text-sm">
                <div><span className="text-gray-400">Multiplier</span> <span className="font-semibold tabular">{num(model.copilot.multiplier, 2)}×</span></div>
                <div><span className="text-gray-400">Effective cost</span> <span className="font-semibold tabular">${num(model.copilot.usd_per_request, 3)}</span> / request</div>
              </div>
              {model.copilot.notes && <p className="mt-2 text-xs text-gray-500">{model.copilot.notes}</p>}
            </div>
          )}
        </section>
      )}

      <ModelDetailOffers offers={offers} providers={providers} model={clientModel} pricingData={pricingData} view="all" />
    </div>
  );
}

function Metric({ label, value, hi }: { label: string; value: string; hi?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line/50 py-0.5">
      <span className="text-gray-400">{label}</span>
      <span className={`tabular ${hi ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
