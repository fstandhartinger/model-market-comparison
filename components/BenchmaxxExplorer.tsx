"use client";
import { useEffect, useMemo, useState } from 'react';

type ModelOpt = { id: string; name: string; org: string };
type AxisOpt = { id: string; name: string; version: string; cohort: string; unit: string; n: number };

type PredictorLine = { name: string; version: string; unit: string };
type TargetMeta = { axisId: string; name: string; version: string; cohort: string; unit: string; observedRange: [number, number] | null };
type PredictionCore = {
  point: number; low: number; high: number; outsideFitRange: boolean; predictorValue: number;
  n: number; r: number; r2: number;
  predictor: PredictorLine;
};
type ModelPrediction = PredictionCore & { target: TargetMeta };
type AxisPrediction = PredictionCore & { model: { id: string; name: string; org: string } };
type ModelResponse = { model: { id: string; name: string; org: string }; predictions: ModelPrediction[] };
type AxisResponse = { axis: TargetMeta; predictions: AxisPrediction[] };

const fmt = (n: number): string => {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 100) return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
  if (a >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (a === 0) return '0';
  return n.toLocaleString('en-US', { maximumSignificantDigits: 3 });
};

const estBadge = <span className="bh-badge bh-alert">Estimated · not a measurement</span>;

function EstimateCell({ p, unit }: { p: { point: number; low: number; high: number; outsideFitRange: boolean }; unit: string }) {
  return (
    <span className="tabular">
      <span className="font-semibold">{fmt(p.point)}</span> <span className="bh-muted text-xs">{unit}</span>
      <span className="mt-1 block">{estBadge}</span>
      <span className="bh-muted mt-1 block text-xs">~95% interval {fmt(p.low)}–{fmt(p.high)} {unit}</span>
      {p.outsideFitRange ? <span className="bh-badge bh-alert mt-1 inline-block">extrapolation — predictor beyond the fit cohort</span> : null}
    </span>
  );
}

function EvidenceCell({ n, r, r2 }: { n: number; r: number; r2: number }) {
  return <span className="text-xs tabular">n = {n} shared<br />r = {r.toFixed(3)}<br />R² = {r2.toFixed(3)}</span>;
}

function EmptyNote({ title, body }: { title: string; body: string }) {
  return <div className="bh-empty min-h-40"><h3 className="font-semibold">{title}</h3><p className="mt-2 max-w-lg">{body}</p></div>;
}

function ModelPredictions({ data }: { data: ModelResponse }) {
  return (
    <div className="mt-5">
      <div className="bh-muted mb-3 max-w-3xl text-sm">
        Estimated results for <strong className="text-gray-100">{data.model.name}</strong> on benchmark versions where the catalog
        has <em>no result of any kind</em>. Every value below is an estimate from a cross-benchmark linear fit — <strong>never a measurement</strong>.
      </div>
      {data.predictions.length ? (
        <div className="bh-table-wrap" tabIndex={0}>
          <table className="bh-table w-full text-sm">
            <caption className="sr-only">Estimated (not measured) results for {data.model.name} on benchmark versions with no recorded result.</caption>
            <thead>
              <tr>
                <th scope="col">Target benchmark</th>
                <th scope="col">Estimate (not a measurement)</th>
                <th scope="col">Fit evidence</th>
                <th scope="col">Based on (exact version)</th>
              </tr>
            </thead>
            <tbody>
              {data.predictions.map((p) => (
                <tr key={p.target.axisId}>
                  <th scope="row" className="max-w-sm text-left align-top font-medium">
                    {p.target.name}
                    <p className="bh-muted mt-1 text-xs font-normal">{p.target.version} · {p.target.cohort} · {p.target.unit}</p>
                    <p className="bh-muted mt-1 text-xs font-normal">
                      Observed cohort range {p.target.observedRange ? `${fmt(p.target.observedRange[0])}–${fmt(p.target.observedRange[1])} ${p.target.unit}` : '—'}
                    </p>
                  </th>
                  <td className="min-w-44 align-top"><EstimateCell p={p} unit={p.target.unit} /></td>
                  <td className="align-top"><EvidenceCell n={p.n} r={p.r} r2={p.r2} /></td>
                  <td className="max-w-sm align-top text-sm">{p.predictor.name}
                    <p className="bh-muted mt-1 text-xs">{p.predictor.version} · measured value {fmt(p.predictorValue)} {p.predictor.unit}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyNote
          title="Nothing predictable for this model"
          body="No qualified benchmark pair exists: estimates need at least 12 shared measured catalog models and |r| of 0.5 or more. Sparse data stays what it is: unknown."
        />
      )}
    </div>
  );
}

function AxisPredictions({ data }: { data: AxisResponse }) {
  return (
    <div className="mt-5">
      <div className="my-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="bh-badge">Target</span>
        <span>{data.axis.name} · {data.axis.version} · {data.axis.cohort} · {data.axis.unit}</span>
        <span className="bh-muted text-xs">Observed cohort range {data.axis.observedRange ? `${fmt(data.axis.observedRange[0])}–${fmt(data.axis.observedRange[1])} ${data.axis.unit}` : '—'}</span>
      </div>
      <div className="bh-muted mb-3 max-w-3xl text-sm">
        Estimated results on this exact benchmark version for catalog models with <em>no recorded result</em>.
        Every value below is an estimate from a cross-benchmark linear fit — <strong>never a measurement</strong>.
      </div>
      {data.predictions.length ? (
        <div className="bh-table-wrap" tabIndex={0}>
          <table className="bh-table w-full text-sm">
            <caption className="sr-only">Estimated (not measured) results for {data.axis.name} {data.axis.version} for catalog models without a recorded result.</caption>
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Estimate (not a measurement)</th>
                <th scope="col">Fit evidence</th>
                <th scope="col">Based on (exact version)</th>
              </tr>
            </thead>
            <tbody>
              {data.predictions.map((p, i) => (
                <tr key={`${p.model.id}-${i}`}>
                  <th scope="row" className="max-w-sm text-left align-top font-medium">
                    {p.model.name}
                    <p className="bh-muted mt-1 text-xs font-normal">{p.model.org}</p>
                  </th>
                  <td className="min-w-44 align-top"><EstimateCell p={p} unit={data.axis.unit} /></td>
                  <td className="align-top"><EvidenceCell n={p.n} r={p.r} r2={p.r2} /></td>
                  <td className="max-w-sm align-top text-sm">{p.predictor.name}
                    <p className="bh-muted mt-1 text-xs">{p.predictor.version} · measured value {fmt(p.predictorValue)} {p.predictor.unit}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyNote
          title="Nothing predictable for this benchmark"
          body="Every comparable catalog model already has a result here, or no qualified pair exists: estimates need at least 12 shared measured catalog models and |r| of 0.5 or more. Sparse data stays what it is: unknown."
        />
      )}
    </div>
  );
}

export function BenchmaxxExplorer({ models, axes }: { models: ModelOpt[]; axes: AxisOpt[] }) {
  const [mode, setMode] = useState<'model' | 'axis'>('model');
  const [mQuery, setMQuery] = useState('');
  const [modelId, setModelId] = useState(models[0]?.id ?? '');
  const [aQuery, setAQuery] = useState('');
  const [axisId, setAxisId] = useState(axes[0]?.id ?? '');
  const [data, setData] = useState<ModelResponse | AxisResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const visibleModels = useMemo(() => {
    const q = mQuery.trim().toLowerCase();
    return q ? models.filter((m) => `${m.name} ${m.org}`.toLowerCase().includes(q)) : models;
  }, [models, mQuery]);
  const visibleAxes = useMemo(() => {
    const q = aQuery.trim().toLowerCase();
    return q ? axes.filter((a) => `${a.name} ${a.version} ${a.cohort}`.toLowerCase().includes(q)) : axes;
  }, [axes, aQuery]);

  useEffect(() => {
    const wanted = mode === 'model' ? modelId : axisId;
    if (!wanted) return;
    const controller = new AbortController();
    setBusy(true);
    setError('');
    setData(null);
    const url = mode === 'model' ? `/api/benchmaxxing?model=${encodeURIComponent(modelId)}` : `/api/benchmaxxing?axis=${encodeURIComponent(axisId)}`;
    fetch(url, { signal: controller.signal })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error || 'Predictions could not be loaded.');
        return body as ModelResponse | AxisResponse;
      })
      .then((d) => { setData(d); setBusy(false); })
      .catch((e) => { if ((e as Error).name !== 'AbortError') { setError((e as Error).message); setBusy(false); } });
    return () => controller.abort();
  }, [mode, modelId, axisId, retry]);

  const predCount = data?.predictions?.length ?? 0;
  const status = data
    ? predCount
      ? `${predCount} estimated ${predCount === 1 ? 'result' : 'results'} — estimates only, never measurements.`
      : 'No qualified estimates under the gates (12 shared measured models and |r| of 0.5 or more).'
    : 'Pick a model or a benchmark to see honest gap-filling estimates.';

  return (
    <section className="bh-panel p-5" aria-label="Gap-fill explorer">
      <p className="bh-eyebrow">Gap-fill explorer</p>
      <h2 className="text-xl font-semibold">What would the missing numbers look like?</h2>
      <p className="bh-muted mt-2 max-w-3xl text-sm">
        Pick any model to see its estimated results on benchmark versions it was never tested on,
        or pick a benchmark to see estimated results for its untested catalog models. Estimates are never measurements.
      </p>
      <div className="mt-4 flex gap-2" role="group" aria-label="Explorer mode">
        <button type="button" className={`bh-button ${mode === 'model' ? 'border-accent text-accent' : ''}`} aria-pressed={mode === 'model'} onClick={() => setMode('model')}>
          Fill a model&#39;s gaps
        </button>
        <button type="button" className={`bh-button ${mode === 'axis' ? 'border-accent text-accent' : ''}`} aria-pressed={mode === 'axis'} onClick={() => setMode('axis')}>
          Fill a benchmark&#39;s gaps
        </button>
      </div>

      {mode === 'model' ? (
        <div className="mt-4 grid gap-4 md:grid-cols-[2fr_3fr]">
          <div>
            <label htmlFor="bm-model-filter" className="text-sm">Filter models</label>
            <input id="bm-model-filter" type="search" className="bh-input mt-1 w-full" placeholder="Type to narrow…" value={mQuery} onChange={(e) => setMQuery(e.target.value)} />
          </div>
          <div>
            <label htmlFor="bm-model-select" className="text-sm">Model</label>
            <select id="bm-model-select" className="bh-input mt-1 w-full" value={modelId} onChange={(e) => setModelId(e.target.value)}>
              {visibleModels.slice(0, 200).map((m) => <option key={m.id} value={m.id}>{m.name}{m.org ? ` · ${m.org}` : ''}</option>)}
            </select>
            {visibleModels.length > 200 ? <p className="bh-muted mt-1 text-xs">First 200 matches shown — type to narrow the list.</p> : null}
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-[2fr_3fr]">
          <div>
            <label htmlFor="bm-axis-filter" className="text-sm">Filter benchmarks</label>
            <input id="bm-axis-filter" type="search" className="bh-input mt-1 w-full" placeholder="Type to narrow…" value={aQuery} onChange={(e) => setAQuery(e.target.value)} />
          </div>
          <div>
            <label htmlFor="bm-axis-select" className="text-sm">Benchmark and version</label>
            <select id="bm-axis-select" className="bh-input mt-1 w-full" value={axisId} onChange={(e) => setAxisId(e.target.value)}>
              {visibleAxes.slice(0, 200).map((a) => (
                <option key={a.id} value={a.id}>{a.name} · {a.version} · {a.cohort}</option>
              ))}
            </select>
            {visibleAxes.length > 200 ? <p className="bh-muted mt-1 text-xs">First 200 matches shown — type to narrow the list.</p> : null}
          </div>
        </div>
      )}

      <p role="status" className="mt-4 text-sm bh-muted">
        {busy ? 'Loading estimates…' : error || status}
        {error ? <button type="button" className="bh-button ml-3" onClick={() => setRetry((n) => n + 1)}>Retry loading</button> : null}
      </p>

      {busy ? <div className="bh-empty mt-4 min-h-40" aria-busy="true">Estimating…</div> : null}
      {!busy && mode === 'model' && data && (data as ModelResponse).model ? <ModelPredictions data={data as ModelResponse} /> : null}
      {!busy && mode === 'axis' && data && (data as AxisResponse).axis ? <AxisPredictions data={data as AxisResponse} /> : null}
    </section>
  );
}
