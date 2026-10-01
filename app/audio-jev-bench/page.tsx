import type { Metadata } from 'next';
import {
  AUDIOJEV_JEV_CLASS, GROUP_LABEL, audiojevView, readAudiojevExamples, readAudiojevPreview, robustnessColumns, type AudioJevRow,
} from '../../lib/audiojev-preview.mjs';
import { AudioJevBenchCharts } from '../../components/AudioJevBenchCharts';
import { AudioJevCompare } from '../../components/AudioJevCompare';

// CR-214 (29 Sep 2026): public AudioJevBench v0.1 page. Section order follows the binding /jev-models structure:
// Capability bars, the two synced speed/cost charts (3D toggle), composite score chart, direct comparison, full table,
// then method notes and revision history. Every number is read from data/audiojev-preview.json (the frozen scorer's
// aggregate output); examples are public items only (the reader throws on anything else).
export const dynamic = 'force-static';

const title = 'AudioJevBench v0.1 — audio decision benchmark';
const description = 'Which audio models make the typed decisions a voice agent needs — intent, sentiment, urgency, speaker verification, sound events — straight from audio, calibrated, fast and cheap? 17 systems on 988 public and sealed items.';
const image = 'https://benchmarkheaven.com/audio-jev-bench/opengraph-image';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/audio-jev-bench' },
  openGraph: {
    type: 'website', siteName: 'Benchmark Heaven', locale: 'en_US', url: '/audio-jev-bench',
    title, description,
    images: [{ url: image, width: 1200, height: 630, alt: 'AudioJevBench v0.1: compare audio decision systems' }],
  },
  twitter: { card: 'summary_large_image', site: '@benchmarkheaven', title, description, images: [image] },
};

const one = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1));
const pct = (v: number | null | undefined) => (v == null ? '—' : `${(100 * v).toFixed(0)}%`);
const signedPts = (v: number | null | undefined) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${(100 * v).toFixed(0)} pts`);
const usd = (v: number | null) => (v == null ? '—' : v === 0 ? 'Free' : v >= 1 ? `$${v.toFixed(2)}` : `$${v.toPrecision(2)}`);
const secs = (v: number | null) => (v == null ? '—' : v >= 1 ? `${v.toFixed(2)} s` : `${Math.round(v * 1000)} ms`);
const th = 'p-2.5 text-right font-semibold whitespace-nowrap';
const td = 'p-2.5 text-right tabular-nums whitespace-nowrap';
const sticky = 'sticky left-0 z-[1] bg-[var(--surface)] p-2.5 text-left shadow-[inset_-1px_0_0_rgb(var(--line))]';
const GROUP_VAR: Record<string, string> = { full: '--jev-t-jev', 'public-only': '--jev-t-api', partial: '--jev-t-classifier' };

/** Why a composite is (near) zero, for the sub-line under a bar. */
function gateNote(r: AudioJevRow): string | null {
  if ((r.headline ?? 0) >= 5) return null;
  if (r.group === 'partial') return 'no calibrated probabilities (Calibration 0) and only one family covered';
  if (r.intelligence != null && r.intelligence <= 0) return 'Intelligence 0: at or below chance after chance correction';
  if (r.cost != null && r.cost < 10) return `gated by Cost (${usd(r.usd)} per 1,000 decisions)`;
  if (r.calibration != null && r.calibration <= 0) return 'Calibration 0';
  return null;
}

function Name({ r }: { r: AudioJevRow }) {
  return <>
    <span className="block">{r.name}{r.apiFlag && <span className="bh-thin-tag ml-1.5" title="Hosted API">API</span>}</span>
    {r.config && <span className="bh-muted block text-[11px] font-normal leading-snug">{r.config}</span>}
  </>;
}

function CompositeBars({ ranked, provisional }: { ranked: AudioJevRow[]; provisional: AudioJevRow[] }) {
  const row = (r: AudioJevRow, rank: string) => {
    const v = Math.max(0, r.headline ?? 0);
    const note = gateNote(r);
    return <li key={r.key} className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.2rem] items-center gap-x-2 text-sm sm:grid-cols-[1.6rem_17rem_minmax(0,1fr)_3.4rem]" data-bh-audiojev-composite-row={r.key}>
      <span className="bh-muted text-right text-xs tabular-nums">{rank}</span>
      <span className="min-w-0 truncate font-semibold sm:text-right" title={r.key}>{r.name}</span>
      <span className="col-span-3 col-start-1 row-start-2 mt-1 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:mt-0" aria-hidden="true">
        <span className="bh-jevc-grid flex h-[14px] rounded-sm"><span className={'bh-jevc-bar' + (r.group === 'full' ? '' : ' is-partial')} style={{ width: `${Math.max(0.4, v).toFixed(3)}%`, ['--jev-t' as string]: `var(${GROUP_VAR[r.group]})` }} /></span>
      </span>
      <b className="text-right text-base tabular-nums">{one(r.headline)}</b>
      {note && <span className="bh-muted col-span-2 col-start-2 mt-0.5 text-[11px] leading-snug sm:col-start-3" data-bh-audiojev-gate>{note}</span>}
    </li>;
  };
  return <section id="audiojev-composite" className="mt-10 scroll-mt-6" aria-labelledby="audiojev-composite-title" data-bh-audiojev-composite>
    <h2 id="audiojev-composite-title" className="text-2xl font-semibold">Composite score</h2>
    <p className="bh-muted mt-1 max-w-4xl text-sm">The official AudioJevBench score (option B): a weighted harmonic mean of Intelligence 40, Calibration 20, Speed 20 and Cost 20, with the JevBench v1.5 low-axis gates. Every full-coverage system is ranked here, including those outside Jev-class; a weak axis pulls the score down hard, and the row says which one.</p>
    <figure className="bh-panel mt-4 p-4 sm:p-5">
      <ol className="space-y-2.5" data-bh-audiojev-composite-list>{ranked.map((r) => row(r, r.rank != null ? String(r.rank) : '–'))}</ol>
      <div className="mt-6 border-t border-dashed border-line pt-4">
        <p className="bh-eyebrow">Not ranked · provisional and partial rows</p>
        <p className="bh-muted mt-1 text-[12px]">Same formula on what these systems could be measured on; not comparable with the ranking above.</p>
        <ol className="mt-3 space-y-2.5">{provisional.map((r) => row(r, '–'))}</ol>
      </div>
    </figure>
  </section>;
}

function FullTable({ groups }: { groups: Array<[string, AudioJevRow[]]> }) {
  return <div className="mt-4 overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[1320px] text-sm" data-bh-audiojev-table="all" aria-label="All AudioJevBench v0.1 systems">
    <thead><tr><th className={`${sticky} w-10`}>#</th><th className="min-w-56 p-2.5 text-left">System</th><th className={th}>Composite (B)</th><th className={th}>Capability</th><th className={th}>Intelligence</th><th className={th}>Public I (95% CI)</th><th className={th}>Sealed I</th><th className={th}>Gap · penalty</th><th className={th}>Calibration</th><th className={th}>Speed</th><th className={th}>Cost</th><th className={th}>p50 / p95 adj.</th><th className={th}>$/1k</th><th className={th}>Items</th><th className={th}>Jev-class</th></tr></thead>
    {groups.map(([group, rows]) => <tbody key={group} data-bh-audiojev-group={group}>
      <tr className="border-t border-line bg-[rgb(var(--line)/.25)]"><th colSpan={15} className="p-2.5 text-left text-xs font-bold uppercase tracking-wide">{GROUP_LABEL[group as keyof typeof GROUP_LABEL]} · {rows.length}{group === 'full' ? ' · ranked by composite' : ' · not ranked'}</th></tr>
      {rows.map((r) => <tr key={r.key} className="border-t border-line align-top" data-bh-audiojev-row={r.key}>
        <td className={`${sticky} font-bold tabular-nums`}>{group === 'full' ? r.rank ?? '–' : '–'}</td>
        <th scope="row" className="p-2.5 text-left font-semibold"><Name r={r} />
          {r.families && <span className="bh-muted block text-[11px] font-normal">covers: {r.families.join(', ').replace(/_/g, ' ')}</span>}
        </th>
        <td className={`${td} font-bold`}>{one(r.headline)}</td><td className={td}>{one(r.capability)}</td><td className={td}>{one(r.intelligence)}</td>
        <td className={td}>{one(r.iPublic)}{r.iPublicCi && <span className="bh-muted text-[11px]"> [{one(r.iPublicCi[0])}, {one(r.iPublicCi[1])}]</span>}</td>
        <td className={td}>{one(r.iSealed)}</td>
        <td className={td}>{r.gap == null ? '—' : `${one(r.gap)} · ×${(r.penalty ?? 1).toFixed(2)}`}</td>
        <td className={td}>{one(r.calibration)}</td><td className={td}>{one(r.speed)}</td><td className={td}>{one(r.cost)}</td>
        <td className={td}>{secs(r.p50Adj)} / {secs(r.p95Adj)}</td>
        <td className={td}>{usd(r.usd)}{r.usdEstimate && <span className="bh-muted" title="Estimated from a catalogue price (see method)">*</span>}</td>
        <td className={td}>{r.nItems ?? '—'}</td>
        <td className={`${td} text-left`}>{r.jevClass ? 'yes' : <span className="bh-muted" title={r.outsideBecause.join('; ')}>no</span>}</td>
      </tr>)}
    </tbody>)}
  </table></div>;
}

function RobustnessTable({ rows }: { rows: AudioJevRow[] }) {
  const withData = rows.filter((r) => r.robustness);
  const cols = robustnessColumns(withData);
  if (!withData.length || !cols.slices.length) return null;
  const slice = (r: AudioJevRow, k: string) => {
    const s = r.robustness?.[k] as { acc: number | null; n: number } | undefined;
    return s?.acc == null ? <span className="bh-muted">—</span> : <>{pct(s.acc)} <span className="bh-muted text-[11px]">n={s.n}</span></>;
  };
  return <details className="mt-6 rounded-xl border border-line bg-[var(--surface)] p-4" data-bh-audiojev-robustness>
    <summary className="cursor-pointer text-lg font-semibold">Robustness diagnostics (not scored)</summary>
    <p className="bh-muted mt-2 text-sm">Accuracy per condition slice (Score items count 1 − normalised error). Diagnostics only — not part of any axis. Small n means wide uncertainty; public-only rows cover public items only.</p>
    <div className="mt-3 overflow-x-auto rounded-lg border border-line"><table className="w-full text-sm" data-bh-audiojev-table="robustness">
      <thead><tr><th className={sticky}>System</th>
        {cols.slices.map(([k, label]) => <th key={k} className={th}>{label}</th>)}
        {cols.deltas.map(([k, label]) => <th key={k} className={th}>{label}</th>)}
      </tr></thead>
      <tbody>{withData.map((r) => <tr key={r.key} className="border-t border-line">
        <th scope="row" className={`${sticky} min-w-48 font-semibold`}><Name r={r} /></th>
        {cols.slices.map(([k]) => <td key={k} className={td}>{slice(r, k)}</td>)}
        {cols.deltas.map(([k]) => <td key={k} className={td}>{signedPts(r.robustness?.[k] as number | null)}</td>)}
      </tr>)}</tbody>
    </table></div>
  </details>;
}

export default async function AudioJevBenchPage() {
  const scores = await readAudiojevPreview();
  if (!scores) throw new Error('data/audiojev-preview.json is missing');
  const v = audiojevView(scores);
  const examples = await readAudiojevExamples();
  const ranked = v.full; // sorted by composite, numbered by rank
  const byCap = (a: AudioJevRow, b: AudioJevRow) => (b.capability ?? -1) - (a.capability ?? -1) || a.key.localeCompare(b.key);
  const capRanked = [...ranked].sort(byCap);
  const provisional = [...v.publicOnly, ...v.partial].sort(byCap);
  const total = ranked[0]?.nItems ?? null;
  const publicN = v.publicOnly[0]?.nItems ?? null;
  const sealedN = total != null && publicN != null ? total - publicN : null;
  const blend = v.blend && v.blend[0] != null && v.blend[1] != null ? `${Math.round(100 * v.blend[0])}% public / ${Math.round(100 * v.blend[1])}% sealed` : '25% public / 75% sealed';
  const top = ranked.filter((r) => r.jevClass);
  const all = [...ranked, ...v.publicOnly, ...v.partial];
  const canonical = 'https://benchmarkheaven.com/audio-jev-bench';
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${canonical}#page`, url: canonical, name: title, description, isPartOf: { '@id': 'https://benchmarkheaven.com/#website' }, mainEntity: { '@id': `${canonical}#dataset` } },
      {
        '@type': 'Dataset', '@id': `${canonical}#dataset`, name: 'AudioJevBench v0.1 results', url: canonical,
        description: `Aggregate results for ${all.length} audio decision systems on ${total ?? 988} public and sealed audio items.`,
        creator: { '@type': 'Organization', name: 'Benchmark Heaven', url: 'https://benchmarkheaven.com' },
        isAccessibleForFree: true, datePublished: '2026-09-29',
        variableMeasured: ['Composite score', 'Capability', 'Intelligence', 'Calibration', 'Speed', 'Cost'],
      },
    ],
  };

  return <div data-bh-audiojev-page>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <header className="bh-page-head max-w-5xl" data-bh-audiojev-header>
      <p className="bh-eyebrow">Audio benchmark · v0.1 · 29 Sep 2026</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">AudioJevBench v0.1</h1>
      <p className="mt-3 max-w-3xl text-lg">Which audio models can make the decisions a voice agent needs — straight from the caller&apos;s audio, with honest probabilities, fast and cheaply?</p>
      <p className="bh-muted mt-2 max-w-4xl text-sm" data-bh-audiojev-meta>
        {all.length} systems · {total ?? '—'} scored items ({publicN ?? '—'} public + {sealedN ?? '—'} sealed) · intent, escalation, command safety, sentiment, urgency, speaker verification and sound events · only system-level aggregates are published; sealed items stay private.
      </p>
      <p className="mt-3 max-w-3xl text-sm">Text decisions: <a className="text-accent underline" href="/jev-models">JevBench</a> · Image decisions: <a className="text-accent underline" href="/image-jev-bench">Image JevBench</a> · <a className="text-accent underline" href="#audiojev-method">How it is measured</a></p>
    </header>

    <AudioJevBenchCharts ranked={capRanked} provisional={provisional} limits={AUDIOJEV_JEV_CLASS} />

    <CompositeBars ranked={ranked} provisional={[...v.publicOnly, ...v.partial].sort((a, b) => (b.headline ?? -1) - (a.headline ?? -1) || a.key.localeCompare(b.key))} />

    <AudioJevCompare rows={all} defaults={[top[0]?.key ?? all[0]?.key, top[1]?.key ?? all[1]?.key]} />

    <section id="audiojev-table" className="mt-10 scroll-mt-6" aria-labelledby="audiojev-table-title" data-bh-audiojev-full-table>
      <h2 id="audiojev-table-title" className="text-2xl font-semibold">Full table</h2>
      <p className="bh-muted mt-1 max-w-4xl text-sm">All {all.length} measured systems in three labelled groups. Only the full-coverage group is ranked. Public-only rows show their public Intelligence with a stratified 95% bootstrap interval. Scroll sideways on small screens.</p>
      <FullTable groups={[['full', ranked], ['public-only', v.publicOnly], ['partial', v.partial]]} />
      <RobustnessTable rows={all} />
    </section>

    <section className="mt-10 max-w-5xl" aria-labelledby="audiojev-examples" data-bh-audiojev-examples>
      <h2 id="audiojev-examples" className="text-2xl font-semibold">Public example items</h2>
      <p className="bh-muted mt-1 text-sm">Public items as the system receives them: an operator context, a typed question and the allowed labels, plus the audio clip (not embedded here). Gold is marked. Sealed items are never shown.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{examples.map((e) => <article key={e.id} className="bh-panel p-4 text-sm" data-bh-audiojev-example={e.id}>
        <p className="bh-eyebrow">{e.family.replace(/_/g, ' ')} · {e.type === 'noul' ? 'yes/no' : e.type === 'score' ? '0–4 score' : 'choice'}{e.durationS != null ? ` · ${e.durationS.toFixed(1)} s clip` : ''}</p>
        <p className="mt-1"><span className="bh-muted">Context:</span> {e.context}</p>
        <p className="mt-1 font-semibold">{e.question}</p>
        <ul className="mt-2 space-y-0.5">{e.labels.map((l) => <li key={l} className={l === e.gold ? 'font-semibold' : ''}>
          <code>{l}</code>{e.descriptions[l] ? <span className="bh-muted"> — {e.descriptions[l]}</span> : null}{l === e.gold && <span className="ml-1.5 rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">gold</span>}
        </li>)}</ul>
      </article>)}</div>
    </section>

    <section id="audiojev-method" className="bh-panel mt-10 max-w-5xl scroll-mt-6 space-y-3 p-5 text-sm leading-relaxed" aria-labelledby="audiojev-method-title" data-bh-audiojev-method>
      <h2 id="audiojev-method-title" className="text-2xl font-semibold">Method notes</h2>
      <p><b>What it measures.</b> Each item is a 16 kHz mono clip plus a short operator context and a typed question. The decisive evidence is only in the audio. The system answers with a probability for every allowed label: a <b>choice</b> among named options, a <b>yes/no</b>, or a <b>0–4 score</b> — the same contract as JevBench. Decision families: speech <b>intent</b> routing, <b>escalation</b> to a human, <b>command safety</b>, caller <b>sentiment</b> and <b>urgency</b>, <b>overlapping and background talkers</b>, <b>speaker verification</b> (enrolment sample vs caller) and <b>sound events</b> (alarms, horns, animals, household sounds), under clean and noisy conditions (15 to 0 dB SNR) and in 13 languages and 12 English accents.</p>
      <p><b>Public and sealed.</b> {publicN ?? 112} public items (authored separately, commercially usable voices) and {sealedN ?? 876} sealed items are scored; a pre-registered audio-quality gate removed a further 6 public and 18 sealed items for every system alike. Sealed items are never published and go only to systems we run ourselves, on our own rented GPUs (offline container, no gold, pod removed afterwards) or on this server. Intelligence blends {blend} (the public set is about an eighth of the items); a public-minus-sealed gap beyond {v.gapAllowance ?? 15} points above the field median costs Intelligence.</p>
      <p><b>Hosted APIs are public-only.</b> Sealed items are never sent to third-party APIs: no enforced zero-retention route was available for these providers. Gemini and OpenAI models are therefore scored on the public items only, shown as provisional with a 95% bootstrap interval, and never ranked with the full-coverage systems. Their numbers can move once a sealed-safe route exists.</p>
      <p><b>Partial coverage.</b> CLAP and AST are sound classifiers: they answer only the sound-event family (choice), so their Intelligence covers that family alone. Their label softmax is not treated as calibrated, so Calibration is 0.</p>
      <p><b>Axes and scores.</b> Four axes, 0–100: <b>Intelligence</b> (tier- and type-weighted accuracy, chance-corrected; missing or invalid answers count wrong), <b>Calibration</b> (are the probabilities honest), <b>Speed</b> (100 − 20·log10(latency / 0.1 s), mean of p50 and p95; self-hosted latency gets the JevBench ×2 + 0.15 s adjustment) and <b>Cost</b> (100 − 30·log10(USD per 1,000 / 0.001)). <b>Capability</b> = mean(Intelligence, Calibration). The <b>composite</b> (option B) is a weighted harmonic mean 40:20:20:20 with the JevBench v1.5 gates.</p>
      <p><b>Jev-class gate.</b> Adjusted median latency ≤ {AUDIOJEV_JEV_CLASS.p50AdjS.toFixed(1)} s <b>and</b> ≤ {usd(AUDIOJEV_JEV_CLASS.usdPer1000)} per 1,000 decisions, fixed before any result because there is no audio Jev reference model. It decides who gets a Capability rank number; the composite ranks every full-coverage system.</p>
      <p><b>Pricing basis.</b> Hosted rows use the provider&apos;s standard list price in force for at least 30 days, applied to the measured audio and text tokens; promotional prices with an end date do not count, so Gemini 3.8 Flash is priced at its announced regular rate. Self-hosted rows (marked *) are estimates: the exact model&apos;s public catalogue price if one exists, otherwise its base model&apos;s or the nearest same-family size (erring high), applied to the tokens counted by the model&apos;s own processor. Classifiers use the JevBench size-class rule for small encoders.</p>
      <p data-bh-reevaluation-policy><b>Re-evaluation policy.</b> Every release re-evaluates the current top 10 on the composite score. Models ranked #11 and below are re-evaluated on a slower cadence — at least monthly, or with every third scheduled refresh release, whichever comes first — and their score is shown as last measured on its release. A material method change re-evaluates every model. Paid fast-lane runs are evaluated within 48 hours of payment, and new submissions are evaluated in the order received.</p>
      <p><b>Limits.</b> Speech clips are synthetic (text-to-speech voices with added real and synthetic noise); sound events are real recordings. One run per system at temperature 0. A system at Intelligence 0 answered at or below chance after correction, often by refusing or returning invalid output. Results describe these exact configurations.</p>
    </section>

    <section className="mt-10 max-w-5xl" aria-labelledby="audiojev-history" data-bh-audiojev-history>
      <h2 id="audiojev-history" className="text-2xl font-semibold">Revision history</h2>
      <ul className="mt-3 space-y-2 text-sm">
        <li><b>v0.1 · 29 Sep 2026</b> — first public release. Method frozen on 26 Sep 2026 before any sealed response (freeze sha256 <code>7f78d3ee…d50b</code>), inheriting the JevBench v1.5 method and pricing rules; two scorer implementation errata logged before scoring (gate exclusions, public-only scoring), no formula change. {all.length} systems: {ranked.length} full coverage, {v.publicOnly.length} public-only, {v.partial.length} partial.</li>
      </ul>
    </section>

    <p className="bh-muted mb-10 mt-9 max-w-5xl border-t border-line pt-4 text-xs">AudioJevBench is a separate benchmark from the text-only JevBench and from Image JevBench. Sealed item content stays private; this page shows system-level aggregates only. <a className="text-accent underline" href="/submit" data-bh-submit-link>Submit a model for evaluation →</a></p>
  </div>;
}
