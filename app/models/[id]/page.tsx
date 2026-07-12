import Link from "next/link";
import { notFound } from "next/navigation";
import { getDataset } from "../../../lib/data";
import { num, pct, orgColor, usdPerM } from "../../../lib/format";
import { clientData } from "../../../lib/client-model";
import { ModelDetailOffers } from "../../../components/ModelDetailOffers";

export const dynamic = "force-dynamic";

export default async function ModelDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ds = await getDataset();
  const data = clientData(ds);
  const model = ds.models.find((m) => m.id === decodeURIComponent(id) || m.family_key === decodeURIComponent(id));
  if (!model) notFound();

  const variants = ds.models
    .filter((m) => m.family_key === model.family_key)
    .sort((a, b) => (b.benchmarks?.aa_coding_index ?? -1) - (a.benchmarks?.aa_coding_index ?? -1));
  const offers = data.offersByFamily[model.family_key] || [];
  const b = model.benchmarks;
  const da = model.designarena;

  return (
    <div>
      <Link href="/" className="text-sm text-accent">← All models</Link>
      <div className="mt-2 flex items-center gap-3">
        <span className="inline-block h-3 w-3 rounded-full" style={{ background: orgColor(model.org) }} />
        <h1 className="text-2xl font-bold">{model.family_name}</h1>
        {model.open_weights && <span className="rounded bg-accent2/15 px-2 py-0.5 text-xs text-accent2">open weights</span>}
        {model.featured && <span className="rounded bg-warn/15 px-2 py-0.5 text-xs text-warn">★ featured</span>}
      </div>
      <div className="mt-1 text-sm text-gray-400">
        {model.org}{model.release_date ? ` · released ${model.release_date}` : ""} · {offers.length} recorded token offers
      </div>
      {model.manual_notes && <p className="mt-2 max-w-3xl text-xs text-warn/90">{model.manual_notes}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ModelDetailOffers offers={offers} providers={data.providers} view="top" />

        {/* Benchmarks */}
        <section className="card min-w-0 p-4">
          <h2 className="mb-3 font-semibold">Benchmarks</h2>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            <Metric label="AA Coding Index" value={num(b.aa_coding_index)} hi />
            <Metric label="AA Coding Agent Index" value={num(b.aa_coding_agent_index)} hi />
            <Metric label="AA Intelligence Index" value={num(b.aa_intelligence_index)} hi />
            <Metric label="DesignArena Frontend Elo" value={num(da?.frontend?.elo, 0)} hi />
            <Metric label="DesignArena Full-Stack Elo" value={num(da?.fullstack?.elo, 0)} hi />
            <Metric label="LiveCodeBench" value={pct(b.aa_livecodebench)} />
            <Metric label="SciCode" value={pct(b.aa_scicode)} />
            <Metric label="Terminal-Bench Hard" value={pct(b.aa_terminalbench_hard)} />
            <Metric label="τ²-Bench (tool use)" value={pct(b.aa_tau2)} />
            <Metric label="GPQA Diamond" value={pct(b.aa_gpqa)} />
            <Metric label="MMLU-Pro" value={pct(b.aa_mmlu_pro)} />
            <Metric label="AA Math Index" value={num(b.aa_math_index)} />
            <Metric label="Output speed (t/s)" value={num(model.aa_speed?.output_tps, 0)} />
          </div>
          {model.benchmark_override_note && (
            <p className="mt-3 border-t border-line/50 pt-2 text-xs text-warn/90">⚠ {model.benchmark_override_note}</p>
          )}
        </section>
      </div>

      {/* Variants */}
      {variants.length > 1 && (
        <section className="card mt-6 overflow-x-auto p-4">
          <h2 className="mb-3 font-semibold">Variants / reasoning settings</h2>
          <table className="dtable w-full text-sm">
            <thead><tr>
              <th className="px-2 py-1 text-left text-xs text-gray-400">Variant</th>
              <th className="px-2 py-1 text-right text-xs text-gray-400">Coding</th>
              <th className="px-2 py-1 text-right text-xs text-gray-400">Intelligence</th>
              <th className="px-2 py-1 text-right text-xs text-gray-400">LiveCodeBench</th>
              <th className="px-2 py-1 text-right text-xs text-gray-400">Terminal-Bench</th>
            </tr></thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} className={v.id === model.id ? "bg-accent/10" : ""}>
                  <td className="px-2 py-1">
                    <Link href={`/models/${encodeURIComponent(v.id)}`} className="hover:text-accent">{v.display_name}</Link>
                  </td>
                  <td className="px-2 py-1 text-right tabular">{num(v.benchmarks?.aa_coding_index)}</td>
                  <td className="px-2 py-1 text-right tabular">{num(v.benchmarks?.aa_intelligence_index)}</td>
                  <td className="px-2 py-1 text-right tabular">{pct(v.benchmarks?.aa_livecodebench)}</td>
                  <td className="px-2 py-1 text-right tabular">{pct(v.benchmarks?.aa_terminalbench_hard)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* GitHub Copilot */}
      {model.copilot && (
        <section className="card mt-6 p-4">
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

      <ModelDetailOffers offers={offers} providers={data.providers} view="all" />
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
