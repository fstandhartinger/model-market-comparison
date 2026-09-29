import type { Metadata } from 'next';
import {
  AUDIOJEV_EXAMPLES_FILE, AUDIOJEV_JEV_CLASS, AUDIOJEV_PREVIEW_FILE, audiojevView, readAudiojevExamples, readAudiojevPreview,
  robustnessColumns, type AudioJevRow,
} from '../../../lib/audiojev-preview.mjs';
import { AudioJevCapability } from '../../../components/AudioJevCapability';

// Unlisted WORK IN PROGRESS preview of AudioJevBench v0.1 for Florian (job audiojev-build-20260925, 26 Sep 2026).
// Not linked from anywhere, not in app/sitemap.ts, noindex/nofollow (plus an X-Robots-Tag header in next.config.mjs).
// Every number comes from data/audiojev-preview.json (the harness scorer output); examples are PUBLIC items only.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'WORK IN PROGRESS — AudioJevBench preview',
  description: 'Unreleased AudioJevBench v0.1 preview. Not published.',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};

const one = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1));
const pct = (v: number | null | undefined) => (v == null ? '—' : `${(100 * v).toFixed(0)}%`);
const signedPts = (v: number | null | undefined) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${(100 * v).toFixed(0)} pts`);
const usd = (v: number | null) => (v == null ? '—' : v === 0 ? 'Free' : v >= 1 ? `$${v.toFixed(2)}` : `$${v.toPrecision(2)}`);
const secs = (v: number | null) => (v == null ? '—' : v >= 1 ? `${v.toFixed(2)} s` : `${Math.round(v * 1000)} ms`);
const th = 'p-2.5 text-right font-semibold whitespace-nowrap';
const td = 'p-2.5 text-right tabular-nums whitespace-nowrap';
const sticky = 'sticky left-0 z-[1] bg-[var(--surface)] p-2.5 text-left shadow-[inset_-1px_0_0_rgb(var(--line))]';

function SystemCell({ r }: { r: AudioJevRow }) {
  return <th scope="row" className={`${sticky} min-w-48 font-semibold`}>
    {r.key}
    {r.apiFlag && <span className="ml-1.5 inline-block rounded-full border border-accent px-1.5 text-[10px] font-bold text-accent">API</span>}
    {r.nErrors != null && r.nErrors > 0 && <p className="mt-0.5 text-[11px] font-normal text-red-500">{r.nErrors} of {r.nRows ?? '?'} requests failed (scored wrong)</p>}
    {r.families && <p className="bh-muted mt-0.5 text-[11px] font-normal">covers: {r.families.join(', ').replace(/_/g, ' ')}</p>}
  </th>;
}

function Price({ r }: { r: AudioJevRow }) {
  return <>{usd(r.usd)}{r.usdEstimate && <span className="bh-muted" title={`estimated price${r.usdSource ? ` — ${r.usdSource}` : ''}`}>*</span>}</>;
}

function FullTable({ rows }: { rows: AudioJevRow[] }) {
  if (!rows.length) return <p className="bh-panel bh-muted mt-3 p-3 text-sm" data-bh-audiojev-full-empty>No system has completed the sealed split yet. The full ranking appears here once sealed runs are scored.</p>;
  return <div className="mt-3 overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[1100px] text-sm" data-bh-audiojev-table="full" aria-label="Full ranking, sealed plus public">
    <thead><tr><th className={`${sticky} w-10`}>#</th><th className="p-2.5 text-left">System</th><th className={th}>Score (B)</th><th className={th}>Intelligence</th><th className={th}>Calibration</th><th className={th}>Speed</th><th className={th}>Cost</th><th className={th}>Capability</th><th className={th}>Public</th><th className={th}>Sealed</th><th className={th}>Gap</th><th className={th}>Penalty</th><th className={th}>p50 / p95 adj.</th><th className={th}>$/1k</th><th className={th}>n</th><th className={th}>Jev-class</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.key} className="border-t border-line" data-bh-audiojev-row={r.key}>
      <td className={`${sticky} font-bold tabular-nums`}>{r.rank ?? '–'}</td>
      <td className="p-2.5 font-semibold">{r.key}{r.apiFlag && <span className="ml-1.5 inline-block rounded-full border border-accent px-1.5 text-[10px] font-bold text-accent">API</span>}</td>
      <td className={`${td} font-bold`}>{one(r.headline)}</td><td className={td}>{one(r.intelligence)}</td><td className={td}>{one(r.calibration)}</td>
      <td className={td}>{one(r.speed)}</td><td className={td}>{one(r.cost)}</td><td className={td}>{one(r.capability)}</td>
      <td className={td}>{one(r.iPublic)}</td><td className={td}>{one(r.iSealed)}</td><td className={td}>{one(r.gap)}</td><td className={td}>{r.penalty == null ? '—' : `×${r.penalty.toFixed(3)}`}</td>
      <td className={td}>{secs(r.p50Adj)} / {secs(r.p95Adj)}</td><td className={td}><Price r={r} /></td><td className={td}>{r.nItems ?? '—'}</td><td className={td}>{r.jevClass ? 'yes' : 'no'}</td>
    </tr>)}</tbody>
  </table></div>;
}

function PublicOnlyTable({ rows, partial = false }: { rows: AudioJevRow[]; partial?: boolean }) {
  const name = partial ? 'partial' : 'public-only';
  if (!rows.length) return <p className="bh-panel bh-muted mt-3 p-3 text-sm">No {partial ? 'partial-coverage' : 'public-only'} systems in this data.</p>;
  return <div className="mt-3 overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[980px] text-sm" data-bh-audiojev-table={name} aria-label={partial ? 'Partial-coverage systems' : 'Public-only provisional hosted APIs'}>
    <thead><tr><th className={sticky}>System</th><th className={th}>n items</th><th className={th}>Public Intelligence</th><th className={th}>95% CI</th><th className={th}>Calibration</th><th className={th}>Speed</th><th className={th}>Cost</th><th className={th}>Capability (prov.)</th><th className={th}>p50 / p95 adj.</th><th className={th}>$/1k</th><th className={th}>Jev-class</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.key} className="border-t border-line" data-bh-audiojev-row={r.key}>
      <SystemCell r={r} />
      <td className={td}>{r.nItems ?? '—'}</td><td className={`${td} font-bold`}>{one(r.iPublic)}</td>
      <td className={td}>{r.iPublicCi ? `${one(r.iPublicCi[0])}–${one(r.iPublicCi[1])}` : '—'}</td>
      <td className={td}>{one(r.calibration)}</td><td className={td}>{one(r.speed)}</td><td className={td}>{one(r.cost)}</td><td className={td}>{one(r.capability)}</td>
      <td className={td}>{secs(r.p50Adj)} / {secs(r.p95Adj)}</td><td className={td}><Price r={r} /></td>
      <td className={`${td} text-left`}>{r.jevClass ? 'yes' : <span className="bh-muted text-xs" title={r.outsideBecause.join(', ')}>no</span>}</td>
    </tr>)}</tbody>
  </table></div>;
}

function RobustnessTable({ rows }: { rows: AudioJevRow[] }) {
  const withData = rows.filter((r) => r.robustness);
  const cols = robustnessColumns(withData);
  if (!withData.length || (!cols.slices.length && !cols.deltas.length && !cols.lift.length)) return <p className="bh-panel bh-muted mt-3 p-3 text-sm">No robustness slices in this data yet.</p>;
  const slice = (r: AudioJevRow, k: string) => {
    const s = r.robustness?.[k] as { acc: number | null; n: number } | undefined;
    return s?.acc == null ? <span className="bh-muted">—</span> : <>{pct(s.acc)} <span className="bh-muted text-[11px]">n={s.n}</span></>;
  };
  return <div className="mt-3 overflow-x-auto rounded-xl border border-line"><table className="w-full text-sm" data-bh-audiojev-table="robustness" aria-label="Robustness diagnostics">
    <thead><tr><th className={sticky}>System</th>
      {cols.slices.map(([k, label]) => <th key={k} className={th}>{label}</th>)}
      {cols.deltas.map(([k, label]) => <th key={k} className={th}>{label}</th>)}
      {cols.lift.map((k) => <th key={k} className={th}>Audio lift {k.replace('|', ' / ').replace(/_/g, ' ')}</th>)}
    </tr></thead>
    <tbody>{withData.map((r) => <tr key={r.key} className="border-t border-line">
      <SystemCell r={r} />
      {cols.slices.map(([k]) => <td key={k} className={td}>{slice(r, k)}</td>)}
      {cols.deltas.map(([k]) => <td key={k} className={td}>{signedPts(r.robustness?.[k] as number | null)}</td>)}
      {cols.lift.map((k) => { const l = r.robustness?.audio_lift_vs_text_blind?.[k]; return <td key={k} className={td}>{l?.lift == null ? '—' : signedPts(l.lift)}</td>; })}
    </tr>)}</tbody>
  </table></div>;
}

export default async function WipAudioJevPreview() {
  const scores = await readAudiojevPreview();
  const v = audiojevView(scores);
  const examples = await readAudiojevExamples();
  const blend = v.blend && v.blend[0] != null && v.blend[1] != null ? `${Math.round(100 * v.blend[0])}% public / ${Math.round(100 * v.blend[1])}% sealed` : '—';
  return <div className="mx-auto max-w-6xl" data-bh-audiojev-preview>
    <div className="mb-6 rounded-xl border-4 border-red-600 bg-red-50 px-5 py-4 text-red-900 dark:bg-red-950 dark:text-red-100" role="note" data-bh-wip-banner>
      <p className="text-2xl font-black tracking-wide">WORK IN PROGRESS</p>
      <p className="mt-1 text-sm"><b>Preview — not published, numbers may change.</b> Unreleased AudioJevBench v0.1 candidate. Method, systems and layout may still change. Please don&apos;t share.</p>
    </div>

    <header>
      <p className="bh-eyebrow">Benchmark Heaven · preview</p>
      <h1 className="mt-1 text-3xl font-bold sm:text-4xl">AudioJevBench v0.1</h1>
      <p className="mt-2 max-w-3xl text-[15px]">How well do audio models make the typed decisions a voice agent has to make — straight from the caller&apos;s audio, with calibrated probabilities, fast and cheaply?</p>
      <p className="bh-muted mt-2 text-xs" data-bh-audiojev-meta>
        {v.method ?? 'method not stated'} · blend {blend} · overfit allowance {v.gapAllowance == null ? '—' : `${v.gapAllowance} pts`} · field median gap {v.gMed == null ? 'n/a (no full-coverage ranked system yet)' : one(v.gMed)}
        {v.difficultyMismatch && <b className="text-red-500"> · difficulty-mismatch flag set</b>}
        {' '}· data file <code>{AUDIOJEV_PREVIEW_FILE}</code>{v.meta?.exported_at ? <> exported {String(v.meta.exported_at)}</> : null}
      </p>
    </header>

    {!scores && <p className="bh-panel mt-6 p-4" data-bh-audiojev-nodata>No scorer output found at <code>{AUDIOJEV_PREVIEW_FILE}</code>.</p>}

    <section className="bh-panel mt-6 max-w-4xl p-4 text-sm leading-relaxed" aria-labelledby="audiojev-method" data-bh-audiojev-method>
      <h2 id="audiojev-method" className="text-lg font-semibold">What AudioJevBench measures</h2>
      <p className="mt-1">Each item is a 16 kHz mono clip plus a short text context and a typed question. The system answers with a probability for every allowed label — a <b>choice</b> among named options, a <b>yes/no</b>, or a <b>0–4 score</b> — the same contract as JevBench, but the evidence is only in the audio.</p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5">
        <li>Voice-agent decisions: <b>intent routing</b>, <b>escalation</b> to a human, <b>command safety</b>, caller <b>sentiment</b>, <b>urgency</b> triage, <b>speaker verification</b> (enrolment vs caller) and <b>sound events</b> (alarms, chimes, background sounds).</li>
        <li><b>Sealed vs public:</b> public items and the harness are open; sealed items are never published and are only sent to systems we run ourselves or that have a sealed route. Intelligence blends {blend}; a public-minus-sealed gap beyond the allowance costs Intelligence. Hosted APIs without a sealed route are scored on public items only and shown as provisional with a 95% bootstrap interval.</li>
        <li>Four axes, 0–100: <b>Intelligence</b> (typed accuracy), <b>Calibration</b> (are the probabilities honest), <b>Speed</b> (adjusted p50/p95 latency, log scale) and <b>Cost</b> (USD per 1,000 decisions, log scale). The official score (B) weighs them 40:20:20:20 with the JevBench v1.5 gates; <b>Capability</b> = mean(Intelligence, Calibration).</li>
        <li><b>Jev-class</b> = adjusted median latency ≤ {AUDIOJEV_JEV_CLASS.p50AdjS.toFixed(1)} s and ≤ {usd(AUDIOJEV_JEV_CLASS.usdPer1000)} per 1,000 decisions.</li>
      </ul>
    </section>

    <AudioJevCapability rows={v.capability} limits={AUDIOJEV_JEV_CLASS} />
    {v.withoutCapability.length > 0 && <p className="bh-muted mt-2 text-xs">No Capability yet (Intelligence or Calibration missing): {v.withoutCapability.map((r) => r.key).join(', ')}.</p>}

    <section className="mt-10" aria-labelledby="audiojev-full" data-bh-audiojev-group="full">
      <h2 id="audiojev-full" className="text-xl font-semibold">1 · Full ranking (sealed + public)</h2>
      <p className="bh-muted mt-1 text-sm">Systems scored on both splits. Ranked by the official score (B). {v.full.length} systems.</p>
      <FullTable rows={v.full} />
    </section>

    <section className="mt-10" aria-labelledby="audiojev-public" data-bh-audiojev-group="public-only">
      <h2 id="audiojev-public" className="text-xl font-semibold">2 · Public-only, provisional (hosted APIs)</h2>
      <p className="bh-muted mt-1 text-sm">Hosted APIs we cannot send sealed items to. Public Intelligence with n and a stratified 95% bootstrap interval — not comparable to the full ranking, never ranked with it. {v.publicOnly.length} systems.</p>
      <PublicOnlyTable rows={v.publicOnly} />
    </section>

    <section className="mt-10" aria-labelledby="audiojev-partial" data-bh-audiojev-group="partial">
      <h2 id="audiojev-partial" className="text-xl font-semibold">3 · Partial coverage (classifiers)</h2>
      <p className="bh-muted mt-1 text-sm">Systems that answer only some families or request types (for example sound-event classifiers). Their numbers cover only the listed families. {v.partial.length} systems.</p>
      <PublicOnlyTable rows={v.partial} partial />
    </section>

    <section className="mt-10" aria-labelledby="audiojev-robustness" data-bh-audiojev-robustness>
      <h2 id="audiojev-robustness" className="text-xl font-semibold">Robustness diagnostics</h2>
      <p className="bh-muted mt-1 text-sm">Per-slice accuracy (Score items count 1 − normalised error). Diagnostics only — not part of any axis or score. Small n means wide uncertainty.</p>
      <RobustnessTable rows={v.systems} />
    </section>

    <section className="mt-10 max-w-4xl" aria-labelledby="audiojev-examples" data-bh-audiojev-examples>
      <h2 id="audiojev-examples" className="text-xl font-semibold">Public example items</h2>
      {examples.length === 0 ? <p className="bh-muted mt-1 text-sm" data-bh-audiojev-examples-empty>No public examples attached to this preview yet ({AUDIOJEV_EXAMPLES_FILE}).</p> : <>
        <p className="bh-muted mt-1 text-sm">A few public items as the model sees them (text side only; the clip itself is not embedded here). Sealed items are never shown.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">{examples.map((e) => <article key={e.id} className="bh-panel p-4 text-sm" data-bh-audiojev-example={e.id}>
          <p className="bh-eyebrow">{e.family.replace(/_/g, ' ')} · {e.type} · {e.tier}{e.durationS != null ? ` · ${e.durationS.toFixed(1)} s clip` : ''}</p>
          <p className="mt-1"><span className="bh-muted">Context:</span> {e.context}</p>
          <p className="mt-1 font-semibold">{e.question}</p>
          <ul className="mt-2 space-y-0.5">{e.labels.map((l) => <li key={l} className={l === e.gold ? 'font-semibold' : ''}>
            <code>{l}</code>{e.descriptions[l] ? <span className="bh-muted"> — {e.descriptions[l]}</span> : null}{l === e.gold && <span className="ml-1.5 rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">gold</span>}
          </li>)}</ul>
          {e.gold != null && !e.labels.includes(e.gold) && <p className="mt-1">Gold: <code>{e.gold}</code></p>}
        </article>)}</div>
      </>}
    </section>

    <p className="bh-muted mb-10 mt-10 text-xs">Preview — not published, numbers may change. Placeholder or partial data may be shown while runs are in progress.</p>
  </div>;
}
