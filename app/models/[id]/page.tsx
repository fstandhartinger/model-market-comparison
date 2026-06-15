import Link from "next/link";
import { notFound } from "next/navigation";
import { getDataset, cheapestOffers, tokenOffers, blendedCost } from "../../../lib/data";
import { usdPerM, num, pct, orgColor } from "../../../lib/format";
import type { Offer } from "../../../lib/types";

export const dynamic = "force-dynamic";

export default async function ModelDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ds = await getDataset();
  const model = ds.models.find((m) => m.id === decodeURIComponent(id) || m.family_key === decodeURIComponent(id));
  if (!model) notFound();

  const variants = ds.models
    .filter((m) => m.family_key === model.family_key)
    .sort((a, b) => (b.benchmarks?.aa_coding_index ?? -1) - (a.benchmarks?.aa_coding_index ?? -1));
  const cheapest = cheapestOffers(model, 5);
  const allOffers = tokenOffers(model);
  const byPlatform = new Map<string, Offer[]>();
  for (const o of allOffers) {
    if (!byPlatform.has(o.platform)) byPlatform.set(o.platform, []);
    byPlatform.get(o.platform)!.push(o);
  }
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
        {model.org}{model.release_date ? ` · released ${model.release_date}` : ""} · {allOffers.length} token offers
      </div>
      {model.manual_notes && <p className="mt-2 max-w-3xl text-xs text-warn/90">{model.manual_notes}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Cheapest providers */}
        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Top {Math.min(5, cheapest.length)} cheapest providers <span className="text-xs font-normal text-gray-500">(10:1 blended)</span></h2>
          {cheapest.length ? (
            <table className="dtable w-full text-sm">
              <thead><tr>
                <th className="px-2 py-1 text-left text-xs text-gray-400">#</th>
                <th className="px-2 py-1 text-left text-xs text-gray-400">Provider</th>
                <th className="px-2 py-1 text-left text-xs text-gray-400">Platform</th>
                <th className="px-2 py-1 text-right text-xs text-gray-400">Input/1M</th>
                <th className="px-2 py-1 text-right text-xs text-gray-400">Output/1M</th>
                <th className="px-2 py-1 text-right text-xs text-gray-400">Blended</th>
              </tr></thead>
              <tbody>
                {cheapest.map((o, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1 text-gray-500">{i + 1}</td>
                    <td className="px-2 py-1">{o.provider}{o.estimated && <span className="ml-1 text-[10px] text-warn">est.</span>}</td>
                    <td className="px-2 py-1 text-gray-400">{o.platform}</td>
                    <td className="px-2 py-1 text-right tabular">{usdPerM(o.input_per_1m)}</td>
                    <td className="px-2 py-1 text-right tabular">{usdPerM(o.output_per_1m)}</td>
                    <td className="px-2 py-1 text-right tabular font-semibold">{usdPerM(o.blended)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-gray-500">No per-token pricing found for this model.</p>}
        </section>

        {/* Benchmarks */}
        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Benchmarks</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <Metric label="AA Coding Index" value={num(b.aa_coding_index)} hi />
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
        </section>
      </div>

      {/* Variants */}
      {variants.length > 1 && (
        <section className="card mt-6 p-4">
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
          <h2 className="mb-2 font-semibold">GitHub Copilot <span className="text-xs font-normal text-gray-500">(per premium request, not per token)</span></h2>
          <div className="flex flex-wrap gap-6 text-sm">
            <div><span className="text-gray-400">Multiplier</span> <span className="font-semibold tabular">{num(model.copilot.multiplier, 2)}×</span></div>
            <div><span className="text-gray-400">Effective cost</span> <span className="font-semibold tabular">${num(model.copilot.usd_per_request, 3)}</span> / request</div>
          </div>
          {model.copilot.notes && <p className="mt-2 text-xs text-gray-500">{model.copilot.notes}</p>}
        </section>
      )}

      {/* All offers grouped by platform */}
      <section className="card mt-6 p-4">
        <h2 className="mb-3 font-semibold">All token offers by platform</h2>
        {[...byPlatform.entries()].map(([platform, offers]) => (
          <div key={platform} className="mb-4">
            <h3 className="mb-1 text-sm font-medium text-accent">{platform} <span className="text-xs font-normal text-gray-500">({offers.length})</span></h3>
            <table className="dtable w-full text-sm">
              <tbody>
                {offers
                  .map((o) => ({ o, bl: blendedCost(o.input_per_1m, o.output_per_1m) ?? Infinity }))
                  .sort((a, b2) => a.bl - b2.bl)
                  .map(({ o, bl }, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1">{o.provider}</td>
                      <td className="px-2 py-1 text-xs text-gray-500">{o.region}</td>
                      <td className="px-2 py-1 text-right tabular">{usdPerM(o.input_per_1m)}<span className="text-gray-600"> in</span></td>
                      <td className="px-2 py-1 text-right tabular">{usdPerM(o.output_per_1m)}<span className="text-gray-600"> out</span></td>
                      <td className="px-2 py-1 text-right tabular font-semibold">{usdPerM(Number.isFinite(bl) ? bl : null)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
        {allOffers.length === 0 && <p className="text-sm text-gray-500">No token offers recorded.</p>}
      </section>
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
