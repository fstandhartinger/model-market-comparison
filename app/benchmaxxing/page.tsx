import type { Metadata } from 'next';
import Link from 'next/link';
import { getBenchmarkView } from '../../lib/benchmark-data';
import {
  DECILE_MIN_AXES,
  DECILE_MIN_FAMILIES,
  DECILE_MIN_PEERS,
  bottomDecileTags,
  computePairStats,
  evidencedAxisMaps,
  measuredAxisMaps,
  topPairs,
  topPredictions,
} from '../../lib/benchmax.mjs';
import { BenchmaxxExplorer } from '../../components/BenchmaxxExplorer';

export const metadata: Metadata = {
  title: 'Benchmaxxing — honest cross-benchmark estimates',
  description:
    'Cross-benchmark prediction for untested benchmark versions plus carefully qualified bottom-decile tags. Estimates with uncertainty intervals — never measurements.',
};

const fmtN = (n: number): string => {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 100) return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
  if (a >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (a === 0) return '0';
  return n.toLocaleString('en-US', { maximumSignificantDigits: 3 });
};

export default async function BenchmaxxingPage() {
  const view = await getBenchmarkView();
  const maps = measuredAxisMaps(view);
  const evid = evidencedAxisMaps(view);
  const stats = computePairStats(maps);
  const signals = topPairs(view, stats, { limit: 25, minN: 20 });
  const gapFillers = topPredictions(view, maps, evid, stats, { limit: 25 });
  const deciles = bottomDecileTags(view, {}, maps);

  const modelSet = new Set<string>();
  for (const mm of maps.values()) for (const k of mm.keys()) modelSet.add(k);
  const byId = new Map(view.models.map((m) => [m.id, m]));
  const modelOptions = [...modelSet]
    .map((id) => byId.get(id))
    .filter((m): m is Exclude<typeof m, undefined> => Boolean(m))
    .map((m) => ({ id: m!.id, name: m!.name, org: m!.org }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const axisOptions = view.axes
    .map((a) => ({ id: a.id, name: a.name, version: a.version, cohort: a.cohort, unit: a.unit, n: maps.get(a.id)?.size ?? 0 }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));

  const aggregate = deciles.aggregate;
  const perAxis = [...deciles.perAxis.values()].sort((a, b) => b.n - a.n);

  return (
    <>
      <header className="bh-page-head">
        <p className="bh-eyebrow">BENCHMAXXING</p>
        <h1>Predict what was never measured.</h1>
        <p className="bh-muted mt-3 max-w-3xl">
          Benchmaxxing usually means showing off flattering benchmark scores while staying quiet about the rest.
          This tab goes the other way: for benchmark versions a model was <em>never tested on</em>, cross-benchmark
          prediction says what it would probably score — with an uncertainty interval, in the benchmark&#39;s native
          unit, on that exact version. Every predicted number is an <strong>estimate, never a measurement</strong>;
          versions are never mixed or pooled, and sparse data is shown as unknown, never as certainty.
        </p>
      </header>

      <section className="bh-panel p-5" aria-label="Method and honesty">
        <p className="bh-eyebrow">Method &amp; honesty</p>
        <h2 className="text-xl font-semibold">How estimates and tags work</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Cross-benchmark prediction</h3>
            <ul className="bh-muted mt-2 list-disc space-y-1.5 pl-5 text-sm">
              <li>For a benchmark version T where a model has no result of any kind, find another version P where many catalog models have measured results on <strong>both</strong> T and P.</li>
              <li>Fit an ordinary least-squares line from P to T in native units across catalog models measured on both exact versions.</li>
              <li>Publish the fit only when the pair shares at least 12 measured catalog models and |Pearson r| is at least 0.5. Measured results only; self-reported claims and low-sample rows are excluded.</li>
              <li>The estimate is the line&#39;s value at the model&#39;s own measured P result — given in T&#39;s native unit.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Uncertainty, honestly</h3>
            <ul className="bh-muted mt-2 list-disc space-y-1.5 pl-5 text-sm">
              <li>Every estimate shows a roughly 95% prediction interval: ±2 × residual standard deviation, widened by √(1 + 1/n + (x − x̄)²/Sxx), so thin evidence or extrapolation widens the interval automatically.</li>
              <li>Estimates whose predictor value lies outside the fit cohort's range are flagged <span className="bh-badge bh-alert">extrapolation</span>.</li>
              <li>The target's observed cohort range is shown next to every estimate for grounding.</li>
              <li>When a target has a documented finite score range (for example, fraction 0–1), an OLS point outside it is omitted as unknown — never clipped into range. No bound is assumed for unbounded units such as Elo.</li>
              <li>Estimates appear only on this tab; they never enter rankings, radar charts, or the Composite.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Bottom-decile tags</h3>
            <ul className="bh-muted mt-2 list-disc space-y-1.5 pl-5 text-sm">
              <li>Per exact benchmark version and cohort: the worst decile of the measured catalog cohort, direction-adjusted, requiring at least {DECILE_MIN_PEERS} measured catalog models.</li>
              <li>The model-level tag <strong>Bottom decile on N axes</strong> requires bottom decile on at least {DECILE_MIN_AXES} distinct axes across at least 2 benchmark families.</li>
              <li>Measured results only; self-reported claims are excluded; missing benchmarks never count against a model; versions are never pooled.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Honesty rules</h3>
            <ul className="bh-muted mt-2 list-disc space-y-1.5 pl-5 text-sm">
              <li>Every estimate is labelled <strong>estimated · not a measurement</strong>; estimates live only on this tab and never enter rankings, radar charts, or the Composite.</li>
              <li>Versions and cohorts are never mixed or pooled — every estimate and tag cites one exact benchmark version and cohort.</li>
              <li>Nothing is invented: no value is shown where no qualified pair of measured axes exists; sparse data is shown as unknown, never as certainty.</li>
              <li>Bottom-decile tags flag where <em>measured</em> results are weakest — they are not a claim that a model is worst overall.</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <BenchmaxxExplorer models={modelOptions} axes={axisOptions} />
      </div>

      <section className="bh-panel mt-6 p-5" aria-label="Strongest cross-benchmark signals">
        <p className="bh-eyebrow">Cross-benchmark signals</p>
        <h2 className="text-xl font-semibold">Which benchmarks predict which</h2>
        <p className="bh-muted mt-2 max-w-3xl text-sm">
          The strongest linear relationships between exact benchmark versions, computed across catalog models measured on both sides
          (measured results only, at least 20 shared models shown here). High correlations are what make estimates possible;
          they are not claims that one score determines another, and they never substitute for a real result.
        </p>
        {signals.length ? (
          <div className="bh-table-wrap mt-4" tabIndex={0}>
            <table className="bh-table w-full text-sm">
              <caption className="sr-only">Strongest linear relationships between exact benchmark versions across shared measured catalog models.</caption>
              <thead>
                <tr>
                  <th scope="col">Predictor (exact version)</th>
                  <th scope="col">Target (exact version)</th>
                  <th scope="col">Shared models</th>
                  <th scope="col">r</th>
                  <th scope="col">R²</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((s) => (
                  <tr key={`${s.predictor.axisId}|${s.target.axisId}`}>
                    <td className="max-w-sm">{s.predictor.name}<p className="bh-muted mt-1 text-xs">{s.predictor.version} · {s.predictor.cohort}</p></td>
                    <td className="max-w-sm">{s.target.name}<p className="bh-muted mt-1 text-xs">{s.target.version} · {s.target.cohort}</p></td>
                    <td className="tabular">{s.n}</td>
                    <td className="tabular">{s.r.toFixed(3)}</td>
                    <td className="tabular">{s.r2.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="bh-panel mt-6 p-5" aria-label="Strongest predicted gap-fillers">
        <p className="bh-eyebrow">Sample predictions</p>
        <h2 className="text-xl font-semibold">Strongest predicted gap-fillers</h2>
        <p className="bh-muted mt-2 max-w-3xl text-sm">
          The strongest qualified estimates across every catalog gap — the exact benchmark versions where these models have no result of any kind.
          Every value here is an estimate from a cross-benchmark linear fit — <strong>never a measurement</strong>.
        </p>
        {gapFillers.length ? (
          <div className="bh-table-wrap mt-4" tabIndex={0}>
            <table className="bh-table w-full text-sm">
              <caption className="sr-only">Strongest estimated (not measured) benchmark results for catalog models with no recorded result on that exact version.</caption>
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  <th scope="col">Target benchmark</th>
                  <th scope="col">Estimate (not a measurement)</th>
                  <th scope="col">Fit evidence</th>
                  <th scope="col">Based on (exact version)</th>
                </tr>
              </thead>
              <tbody>
                {gapFillers.map((p) => (
                  <tr key={`${p.model.id}|${p.target.axisId}`}>
                    <th scope="row" className="max-w-xs text-left align-top font-medium">
                      <Link href={`/models/${encodeURIComponent(p.model.id)}#benchmark-sheet`} className="hover:underline">{p.model.name}</Link>
                      <p className="bh-muted mt-1 text-xs font-normal">{p.model.org}</p>
                    </th>
                    <td className="max-w-sm align-top">
                      {p.target.name}
                      <p className="bh-muted mt-1 text-xs">{p.target.version} · {p.target.cohort} · {p.target.unit}</p>
                      <p className="bh-muted mt-1 text-xs">
                        Observed cohort range {p.target.observedRange ? `${fmtN(p.target.observedRange[0])}–${fmtN(p.target.observedRange[1])} ${p.target.unit}` : '—'}
                      </p>
                    </td>
                    <td className="min-w-44 align-top">
                      <span className="tabular">
                        <span className="font-semibold">{fmtN(p.point)}</span> <span className="bh-muted text-xs">{p.target.unit}</span>
                        <span className="mt-1 block"><span className="bh-badge bh-alert">Estimated · not a measurement</span></span>
                        <span className="bh-muted mt-1 block text-xs">~95% interval {fmtN(p.low)}–{fmtN(p.high)} {p.target.unit}</span>
                        {p.outsideFitRange ? <span className="bh-badge bh-alert mt-1 inline-block">extrapolation — predictor beyond the fit cohort</span> : null}
                      </span>
                    </td>
                    <td className="align-top"><span className="text-xs tabular">n = {p.n} shared<br />r = {p.r.toFixed(3)}<br />R² = {p.r2.toFixed(3)}</span></td>
                    <td className="max-w-sm align-top text-sm">{p.predictor.name}<p className="bh-muted mt-1 text-xs">{p.predictor.version} · {p.predictor.cohort} · {p.predictor.unit}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="bh-panel mt-6 p-5" aria-label="Bottom decile measured results">
        <p className="bh-eyebrow">Bottom decile (carefully qualified)</p>
        <h2 className="text-xl font-semibold">Where measured results are weakest</h2>
        <p className="bh-muted mt-2 max-w-3xl text-sm">
          The opposite of benchmaxxing: measured results that land in the bottom decile of their cohort on an exact benchmark version.
          These tags flag where <em>measured</em> results are weakest — they are not a claim that a model is worst overall,
          and they are never applied to estimates.
        </p>
        <ul className="bh-muted mt-4 max-w-3xl list-disc space-y-1.5 pl-5 text-sm">
          <li>Per exact benchmark version and cohort: the worst decile of the measured catalog cohort (direction-adjusted), with at least {DECILE_MIN_PEERS} measured catalog models required.</li>
          <li>The model-level tag <strong>Bottom decile on N axes</strong> requires bottom decile on at least {DECILE_MIN_AXES} distinct axes across at least {DECILE_MIN_FAMILIES} benchmark families.</li>
          <li>Measured results only; self-reported claims are excluded; missing benchmarks never count against a model; versions are never pooled.</li>
          <li>Bottom decile flags where <em>measured</em> results are weakest — it is not a claim that a model is worst overall, and it can change with coverage.</li>
        </ul>

        {aggregate.length ? (
          <div className="mt-6">
            <h3 className="text-sm font-semibold">Models bottom-decile on the most measured axes</h3>
            <p className="bh-muted mt-1 max-w-3xl text-sm">
              {aggregate.length} catalog models meet the rule (bottom decile on at least {DECILE_MIN_AXES} distinct axes across at least {DECILE_MIN_FAMILIES} benchmark families, each axis with at least {DECILE_MIN_PEERS} measured catalog models).
              All entries below use measured results on exact versions only.
            </p>
            <ul className="mt-4 space-y-3">
              {aggregate.slice(0, 50).map((a) => (
                <li key={a.modelId} className="rounded-lg border border-line p-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link href={`/models/${encodeURIComponent(a.modelId)}#benchmark-sheet`} className="font-medium hover:underline">{a.name}</Link>
                    <span className="bh-badge bh-negative">Bottom decile on {a.count} axes</span>
                    <span className="bh-muted text-xs">{a.org} · {a.families.length} benchmark families</span>
                  </div>
                  <ul className="bh-muted mt-2 space-y-0.5 text-xs">
                    {a.detail.slice(0, 8).map((d) => (
                      <li key={d.axisId}>
                        {d.name} · {d.version} · {d.cohort}: <span className="tabular">{fmtN(d.value)} {d.unit}</span>
                        <span className="bh-muted"> · {d.n} measured peers · {d.higherBetter ? 'higher is better' : 'lower is better'}</span>
                      </li>
                    ))}
                    {a.detail.length > 8 ? <li className="bh-muted">+ {a.detail.length - 8} more axes under the same rule</li> : null}
                  </ul>
                </li>
              ))}
            </ul>
            {aggregate.length > 50 ? <p className="bh-muted mt-3 text-sm">+ {aggregate.length - 50} more models under the same rule.</p> : null}
          </div>
        ) : null}

        {perAxis.length ? (
          <div className="mt-8">
            <h3 className="text-sm font-semibold">Bottom decile by benchmark version</h3>
            <p className="bh-muted mt-1 text-sm">{perAxis.length} benchmark versions and cohorts have at least {DECILE_MIN_PEERS} measured catalog models and a known score direction.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {perAxis.map((a) => (
                <details key={a.axisId} className="rounded-lg border border-line p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    {a.name} · {a.version} · {a.cohort}
                    <span className="bh-muted ml-2 text-xs">{a.n} measured peers · worst {a.k}</span>
                  </summary>
                  <ul className="mt-3 space-y-0.5 text-sm">
                    {a.models.map((m) => (
                      <li key={m.modelId}>
                        {m.modelId ? (
                          <Link href={`/models/${encodeURIComponent(m.modelId)}#benchmark-sheet`} className="hover:underline">{m.name}</Link>
                        ) : (
                          m.name
                        )}{' '}
                        <span className="tabular">{fmtN(m.value)} {a.unit}</span>
                        <span className="bh-muted text-xs"> · bottom {a.k} of {a.n} measured</span> <span className="bh-badge bh-negative">Bottom decile</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
