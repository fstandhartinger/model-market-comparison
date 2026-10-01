import { imageJevBoardSystems, imageJevBoardRows, imageJevCompareRows, imageJevCapabilityLimits, imageJevSliderPresets } from '../../../lib/imagejev-board.mjs';
import { JevCapabilityRanking } from '../../../components/JevCapabilityRanking';
import { jevClassView } from '../../../components/jevClassView';
import { JevBubbleCharts } from '../../../components/JevBubbleChart';
import { JevCapabilityLazy } from '../../../components/JevCapabilityLazy';
import { JevScoreChart } from '../../../components/JevBoardInteractive';
import { JevCompareV15 } from '../../../components/JevCompareV15';
import { imageJevCategoryView } from '../../../lib/jevbench-categories.mjs';
import { ImageJevRevisionHistory } from '../../../components/ImageJevRevisionHistory';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BaseModelDisplay } from '../../../components/BaseModelDisplay';
import { imageJevSystemPath as imageSystemPath, imageJevSourceUrl } from '../../../lib/imagejev-system-links.mjs';

// CR-254 (2026-10-01): each ImageJevBench system gets its own detail page under /image-jev-bench/<key>.
// Image keys are already URL-safe (lowercase, digits and underscores); encode defensively anyway.
import type { CSSProperties } from 'react';
import { defaultMultimodalPreviewVersion, formatMatchedGapPp, multimodalPreviewV02VisibleKeys, readArchivedMultimodalPreviewV014, readMultimodalPreview, readMultimodalPreviewV02PageData } from '../../../lib/jevbench-multimodal-preview.mjs';
import { ImageJevExamples } from '../../../components/ImageJevExamples';
import { ImageJevRadar } from '../../../components/ImageJevRadar';
import { ImageJevV02Charts, ImageJevV02Legend } from '../../../components/ImageJevV02Charts';
import { ImageJevV02RankingTable } from '../../../components/ImageJevV02RankingTable';
import { ImageJevV02WhatIf } from '../../../components/ImageJevV02WhatIf';
import { jevClassRows } from '../../../lib/jevbench-jev-class.mjs';

export const metadata: Metadata = {
  title: 'Image JevBench v0.1.5',
  description: 'JevImageBench Capability Score leads Image JevBench v0.1.5: image decision systems inside the frozen JevBench cost and median-latency budget.',
  alternates: { canonical: '/image-jev-bench' },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const score = (v: number) => Number(v).toFixed(2);
const unitCost = (v: number | null) => v == null ? 'Not measured' : `USD ${v.toFixed(4)}`;
const time = (v: number) => `${v.toFixed(3)} s`;
const timeOrDash = (v: unknown) => Number.isFinite(v) ? time(v as number) : '—';
type Track = 'all' | 'core' | 'everyday_photo' | 'computer-use' | 'browser-use';
type FamilyCount = { public: number; sealed: number; retired: number };
const trackLabel: Record<Track, string> = {
  all: 'Full benchmark', core: 'CORE', everyday_photo: 'Everyday photo',
  'computer-use': 'Computer-use', 'browser-use': 'Browser-use',
};

// F-198 (pass 36): a gated row says so. A row whose composite is below 1 because a gate factor is below 0.5
// gets a muted sub-line naming the gate — in the bars and in the table's System cell.
type GateInfo = { gate: string; line: string } | null;
function gateOf(t: any, row: any, version = 'v0.1.4'): GateInfo {
  if (t.composite.score >= 1) return null;
  if (version === 'v0.2.0') {
    if (t.axes?.calibration === 0) return { gate: 'Calibration', line: 'Calibration is zero' };
    const gates = t.composite?.gates ?? {};
    for (const [axis, label] of [['cost', 'Cost'], ['intelligence', 'Intelligence'], ['speed', 'Speed']]) {
      if ((gates[axis] ?? 1) < 0.5) return { gate: label, line: `Reduced by low ${label} (${t.axes[axis].toFixed(1)} / 100)` };
    }
    return null;
  }
  if ((t.axes?.calibration ?? 0) < 0.5) return { gate: 'Calibration', line: `0.0 · gated by Calibration (no probabilities reported)` };
  const g = t.composite?.gates ?? {};
  if ((g.cost ?? 1) < 0.5) return { gate: 'Cost', line: `0.0 · gated by Cost (USD ${t.cost.usd_per_1000.toFixed(2)} per 1,000 decisions)` };
  if ((g.intelligence ?? 1) < 0.5) return { gate: 'Intelligence', line: `0.0 · gated by Intelligence (below the Jev-class floor)` };
  if ((g.speed ?? 1) < 0.5) return { gate: 'Speed', line: `0.0 · gated by Speed (below the Jev-class floor)` };
  return null;
}

// F-198 (pass 36): a parenthetical configuration leaves the bold name and becomes a muted sub-line;
// quantisation keys keep the artifact's spelling but live in <code>.
function splitName(name: string): { main: string; config: string | null } {
  const m = name.match(/^(.*?)\s*\(([^()]*)\)$/);
  return m ? { main: m[1].trim(), config: m[2] } : { main: name, config: null };
}
const CodeQuant = ({ text }: { text: string }) => {
  const parts = text.split(/(PQ2_0|Q8_0)/);
  return <>{parts.map((p, i) => p === 'PQ2_0' || p === 'Q8_0' ? <code key={i}>{p}</code> : p)}</>;
};
function SystemName({ name, gate }: { name: string; gate?: GateInfo }) {
  const { main, config } = splitName(name);
  return <>
    <span><CodeQuant text={main} /></span>
    {config && <span className="bh-muted block text-[11.5px] leading-snug">{config}</span>}
    {gate && <span className="block text-[11.5px] leading-snug text-[rgb(var(--accent,234_88_12))]" data-bh-mm-gated={gate.gate}>{gate.line}</span>}
  </>;
}

function RankingTable({ systems, track, all = false, showPrevious = true, diagnosticTracks = false, compactMobile = false, version = 'v0.1.4' }: { systems: any[]; track: Track; all?: boolean; showPrevious?: boolean; diagnosticTracks?: boolean; compactMobile?: boolean; version?: string }) {
  const rows = [...systems].sort((x, y) => y.tracks[track].composite.score - x.tracks[track].composite.score);
  const showGap = all && rows.length > 0 && rows.every((system) => Number.isFinite(system.tracks[track].matched_gap_pp));
  const compact = compactMobile ? 'hidden sm:table-cell' : '';
  return <div className="mt-4 overflow-x-auto rounded-xl border border-line">
    <table className={`w-full ${compactMobile ? 'min-w-[590px] sm:min-w-[1240px]' : all ? 'min-w-[1240px]' : 'min-w-[1080px]'} text-left text-sm`} data-bh-mm-ranking={track} aria-label={`${trackLabel[track]} ranking`}>
      <thead><tr>
        <th scope="col" className="sticky left-0 z-[1] w-14 min-w-14 bg-[var(--surface)] p-3 shadow-[inset_-1px_0_0_rgb(var(--line))]">#</th><th scope="col" className="sticky left-14 z-[1] w-52 min-w-52 bg-[var(--surface)] p-3 shadow-[inset_-1px_0_0_rgb(var(--line))]">System</th><th scope="col" className="p-3 text-right">Composite</th>
        <th scope="col" className="p-3 text-right">Intelligence</th><th scope="col" className={`${compact} p-3 text-right`}>Calibration</th><th scope="col" className={`${compact} p-3 text-right`}>Speed</th><th scope="col" className={`${compact} p-3 text-right`}>Cost</th>
        {showGap && <th scope="col" className={`${compact} p-3 text-right`}>Gap (matched)</th>}{all && showPrevious && <th scope="col" className={`${compact} p-3 text-right`}>Earlier split</th>}
        <th scope="col" className={`${compact} p-3 text-right`}>Public accuracy</th><th scope="col" className={`${compact} p-3 text-right`}>Sealed accuracy</th><th scope="col" className="p-3 text-right">USD / 1,000</th>
        {all && <th scope="col" className="p-3 text-right">p50 / p95</th>}
        {diagnosticTracks && <><th scope="col" className={`${compact} border-l border-line p-3 text-right text-xs font-medium bh-muted`}>CU diag.</th><th scope="col" className={`${compact} p-3 text-right text-xs font-medium bh-muted`}>BU diag.</th></>}
      </tr></thead>
      <tbody>{rows.map((s, i) => {
        const t = s.tracks[track];
        const gate = gateOf(t, s, version);
        // F-198 (pass 36): "Cost coverage" is no longer a column — rows under 100% receipt coverage fold it into the
        // System cell. The "Penalty" column is gone (×1.000 on every row; the intro keeps the allowance sentence).
        return <tr key={s.key} id={all ? `imagejev-system-${s.key}` : undefined} className="scroll-mt-6 border-t border-line">
          <td className="sticky left-0 z-[1] w-14 min-w-14 bg-[var(--surface)] p-3 font-bold tabular-nums shadow-[inset_-1px_0_0_rgb(var(--line))]">{i + 1}</td>
          <th scope="row" className="sticky left-14 z-[1] w-52 min-w-52 bg-[var(--surface)] p-3 text-left font-semibold shadow-[inset_-1px_0_0_rgb(var(--line))]">
            {imageJevSourceUrl(s.key, s.repo)
              ? <a href={imageJevSourceUrl(s.key, s.repo)!} target="_blank" rel="noopener noreferrer" className="underline" data-bh-jev-source={s.key}><SystemName name={s.name} gate={gate} /></a>
              : <SystemName name={s.name} gate={gate} />}
            {version !== 'v0.2.0' && s.key === 'wity_1' && <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300" data-bh-mm-author-review>Under author review: server build ID was not recorded; this score may change after verification.</p>}
            {s.inference_setting && (version === 'v0.2.0'
              ? <details className="bh-muted mt-1 text-xs [overflow-wrap:anywhere]"><summary className="cursor-pointer text-accent">Configuration details</summary><p className="mt-2">Setting: {s.inference_setting}</p></details>
              : <p className="bh-muted mt-1 text-xs">Setting: {s.inference_setting}</p>)}
            {t.cost.coverage < 0.9995 && <p className="bh-muted mt-1 text-xs">Cost receipts cover {pct(t.cost.coverage)} of calls</p>}
            {s.api_flag && <span className="mt-1 inline-block rounded-full border border-accent px-2 py-0.5 text-[0.68rem] font-bold text-accent">API</span>}
            <BaseModelDisplay benchmark="imagejevbench" systemKey={s.key} className="mt-1 block text-[11px] font-normal leading-tight" />
            <Link href={imageSystemPath(s.key)} className="mt-0.5 inline-block text-[11px] font-normal text-accent underline decoration-[rgb(var(--line))] underline-offset-2 hover:decoration-current" data-bh-mm-system-details={s.key}>details</Link>
          </th>
          <td className="p-3 text-right font-bold tabular-nums">{score(t.composite.score)}</td>
          <td className="p-3 text-right tabular-nums">{score(t.axes.intelligence)}</td>
          <td className={`${compact} p-3 text-right tabular-nums`}>{score(t.axes.calibration)}</td>
          <td className={`${compact} p-3 text-right tabular-nums`}>{score(t.axes.speed)}</td>
          <td className={`${compact} p-3 text-right tabular-nums`}>{score(t.axes.cost)}</td>
          {showGap && <td className={`${compact} p-3 text-right tabular-nums whitespace-nowrap`}>{formatMatchedGapPp(t.matched_gap_pp)}</td>}{all && showPrevious && <td className={`${compact} p-3 text-right tabular-nums whitespace-nowrap`}>{s.previous_rank != null ? `#${s.previous_rank} · ${score(s.previous_score)}` : '—'}</td>}
          <td className={`${compact} p-3 text-right tabular-nums`}><span className="whitespace-nowrap">{t.public.correct}/{t.public.n} · {pct(t.public.accuracy)}</span></td>
          <td className={`${compact} p-3 text-right tabular-nums`}><span className="whitespace-nowrap">{t.sealed.correct}/{t.sealed.n} · {pct(t.sealed.accuracy)}</span></td>
          <td className="p-3 text-right tabular-nums">{unitCost(t.cost.usd_per_1000)}</td>
          {all && <td className="p-3 text-right tabular-nums whitespace-nowrap">{timeOrDash(t.speed?.raw_p50_s ?? t.speed?.p50_s_raw ?? t.speed?.p50_s)} / {timeOrDash(t.speed?.raw_p95_s ?? t.speed?.p95_s_raw ?? t.speed?.p95_s)}</td>}
          {diagnosticTracks && <><td className={`${compact} border-l border-line p-3 text-right tabular-nums`}>{Number.isFinite(s.tracks?.['computer-use']?.composite?.score) ? score(s.tracks['computer-use'].composite.score) : '—'}</td><td className={`${compact} p-3 text-right tabular-nums`}>{Number.isFinite(s.tracks?.['browser-use']?.composite?.score) ? score(s.tracks['browser-use'].composite.score) : '—'}</td></>}
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

function ScoreBars({ systems, track, version = 'v0.1.4' }: { systems: any[]; track: Track; version?: 'v0.1.4' | 'v0.2.0' }) {
  const rows = [...systems].sort((x, y) => y.tracks[track].composite.score - x.tracks[track].composite.score);
  return <ol className="mt-4 grid gap-2" data-bh-mm-bars={track}>{rows.map((s, i) => {
    const v = s.tracks[track].composite.score;
    const gate = gateOf(s.tracks[track], s, version);
    const color = version === 'v0.2.0' ? (s.api_flag ? 'bg-pink-400' : 'bg-teal-400') : i === 0 ? 'bg-amber-400' : s.api_flag ? 'bg-pink-400' : 'bg-teal-400';
    // 1 Oct 2026: an API row ranked at its stated tariff also shows a striped bar at its base-model reference price.
    const alt = version === 'v0.2.0' ? s.pricing_alternative : null;
    const altScore: number | null = alt?.tracks?.[track]?.composite?.score ?? null;
    const altRank = altScore == null ? null : 1 + rows.filter((other) => other.key !== s.key && other.tracks[track].composite.score > altScore).length;
    return <li key={s.key} className="grid grid-cols-[minmax(0,11rem)_1fr_3.2rem] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,17rem)_1fr_3.5rem]" data-bh-imagejev-v02-bar={version === 'v0.2.0' ? s.key : undefined}>
      <span className="min-w-0 break-words text-sm font-semibold leading-tight" title={s.name}>
        {i + 1}. {imageJevSourceUrl(s.key, s.repo)
          ? <a href={imageJevSourceUrl(s.key, s.repo)!} target="_blank" rel="noopener noreferrer" className="underline" data-bh-jev-source={s.key}><SystemName name={s.name} gate={gate} /></a>
          : <Link href={imageSystemPath(s.key)}><SystemName name={s.name} gate={gate} /></Link>}
        {s.api_flag && <span className="ml-1 whitespace-nowrap text-[0.68rem] font-bold text-accent">API</span>}
        <BaseModelDisplay benchmark="imagejevbench" systemKey={s.key} className="mt-1 block text-[11px] font-normal leading-tight" />
        {imageJevSourceUrl(s.key, s.repo) && <Link href={imageSystemPath(s.key)} className="text-[11px] font-normal text-accent underline">details</Link>}
      </span>
      <span className="h-5 rounded-md bg-black/10 dark:bg-white/10"><span className={`block h-full rounded-md ${color}`} style={{ width: `${Math.max(0.5, v)}%` }} /></span>
      <span className="text-right font-bold tabular-nums">{score(v)}</span>
      {altScore != null && <>
        <span className="bh-muted text-right text-[11px] leading-snug sm:text-xs">{alt.label} <span className="whitespace-nowrap">(would be #{altRank})</span></span>
        <span className="h-2.5 rounded-sm" style={{ '--jev-t': '244 114 182' } as CSSProperties} title={`${alt.label}: ${alt.basis}`} data-bh-imagejev-v02-alt-bar={s.key} data-bh-imagejev-v02-alt-score={altScore.toFixed(3)} data-bh-imagejev-v02-alt-rank={altRank ?? undefined}>
          <span className="bh-jev-alt-bar block h-full rounded-sm !opacity-90" style={{ width: `${Math.max(0.5, altScore)}%` }} />
        </span>
        <span className="bh-muted text-right text-sm tabular-nums">{score(altScore)}</span>
      </>}
    </li>;
  })}</ol>;
}

function CandidateCoverageTable({ candidates }: { candidates: any[] }) {
  return <div className="mt-4 overflow-x-auto rounded-xl border border-line">
    <table className="w-full min-w-[1050px] text-left text-sm" data-bh-mm-candidate-coverage>
      <thead><tr>
        <th scope="col" className="p-3">Candidate</th>
        <th scope="col" className="p-3">Source revision</th>
        <th scope="col" className="p-3">Access</th>
        <th scope="col" className="p-3">Status</th>
        <th scope="col" className="p-3">Reason</th>
      </tr></thead>
      <tbody>{candidates.map((candidate: any) => <tr key={candidate.candidate} className="border-t border-line align-top">
        <th scope="row" className="p-3 font-semibold">{candidate.candidate}</th>
        <td className="p-3 text-xs"><code title={candidate.source_revision}>{String(candidate.source_revision).slice(0, 12)}</code></td>
        <td className="p-3 text-xs">{candidate.access}</td>
        <td className="p-3 font-semibold">{candidate.status}</td>
        <td className="p-3">{candidate.reason}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export async function MultimodalPreviewContent({ versionTabs }: { versionTabs?: VersionTabCounts } = {}) {
  const a: any = await readMultimodalPreview();
  const s = a.split;
  const chartSystems = imageJevBoardSystems(a);
  const limits = imageJevCapabilityLimits(a);
  const classOptions = { limits, factor: limits.factor, referenceLabel: limits.referenceLabel };
  const capability = jevClassView(chartSystems, classOptions);
  const qualifying = capability.rows.filter((row) => row.inClass).length;
  const relaxed = jevClassView(chartSystems, {
    ...classOptions, factor: 3, limits: { cost: limits.cost * 3 / limits.factor, latency: limits.latency * 3 / limits.factor },
  });
  const addedAtThree = relaxed.rows.filter((row) => row.inClass).length - qualifying;
  const eligibility = <>Jev itself cannot read images, so there is no Jev row to anchor on. We use the same absolute budget as JevBench: at most {limits.factor}× Jev 1.13.0&apos;s JevBench v1.5.4 cost (≤ USD {limits.cost.toFixed(4)} per 1,000 decisions) and at most {limits.factor}× its median latency (≤ {limits.latency.toFixed(2)} s, adjusted p50), frozen in this release. A decision model in this class should fit the same budget whether the input is text or an image. {qualifying} of {chartSystems.length} systems qualify, a larger share than on JevBench, so we keep {limits.factor}×. Loosening to 3× would add {addedAtThree} Jev-compatible fine-tunes that sit just above the cost line; the general-purpose hosted LLMs stay outside even at 3×.</>;

  const djevSpark = a.ranking.find((x: any) => x.key === 'djev_spark_nvfp4');
  const photoSealed = djevSpark.tracks.everyday_photo.sealed;
  const familyRows = Object.entries(s.family_counts) as [string, FamilyCount][];
  const compareRows = imageJevCompareRows(a);
  const systemsOverAllowance = a.ranking.filter((row: any) => row.tracks.all.matched_gap_pp > a.gap_allowance_pp).length;
  const reasons = s.public_reason_counts;

  return <>
    <header className="bh-page-head max-w-5xl">
      <p className="bh-eyebrow">Image benchmark · {a.release_version}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Image JevBench</h1>
      <p className="mt-3 max-w-3xl text-lg">The JevImageBench Capability Score compares intelligence and calibration inside the same cost and speed budget as JevBench.</p>
      {versionTabs && <VersionTabs selected="v0.1.5" {...versionTabs} />}
    </header>

    <JevCapabilityRanking systems={chartSystems} revision={a.release_version} officialHref="#jev14-chart-title"
      benchName="JevImageBench" benchmark="imagejevbench" {...classOptions} eligibilityNote={eligibility}
      correlationReason="mostly because self-hosted cost is computed from measured GPU time; both bars are kept for consistency with JevBench" />
    <JevBubbleCharts points={capability.points} costLimit={limits.cost} latencyCap={limits.latency} referenceName={limits.referenceLabel} benchName="Image JevBench" />
    <details className="mt-4" data-bh-mm-3d-toggle><summary className="cursor-pointer text-sm font-semibold text-accent">Explore capability, cost and speed in 3D</summary>
      <JevCapabilityLazy revision={a.release_version} systems={chartSystems} classOptions={classOptions} benchName="Image JevBench" only3d />
    </details>
    <JevScoreChart revision={a.release_version} benchName="Image JevBench" scoreLabel="Image JevBench Score" costHref="#imagejev-pricing"
      rows={imageJevBoardRows(a)} rankedCount={a.n_systems} newLabel={null} fairness={null} capabilityHref="#jev-capability"
      presets={imageJevSliderPresets(a)} compactMobile scoreKind="v15" methodLink={{ href: '#method-heading', label: 'Method notes ↓' }} benchmark="imagejevbench" />
    <p className="bh-muted mt-2 max-w-5xl text-sm" data-bh-mm-wity-pricing-note>Wity-1 is ranked at Wity&apos;s own stated API price (USD 0.042 per million input tokens, output free). The striped bar shows the score at the Qwen3.6-35B-A3B base-model reference price we use for self-hosted open weights of the same base. <a className="text-accent underline" href="#imagejev-pricing">See pricing note ↓</a></p>
    <JevCompareV15 rows={compareRows} openDecisions={s.items_public} sealedDecisions={s.items_sealed} axesOnly categories={imageJevCategoryView(a.revision, compareRows.map((r: { key: string }) => r.key))} />
    <ImageJevRadar systems={a.ranking} />

    <section className="mt-10 max-w-none" aria-labelledby="overall-heading">
      <h2 id="overall-heading" className="text-2xl font-semibold">Full ranking</h2>
      <p className="bh-muted mt-2 max-w-5xl text-sm">Ranked by the composite score: equal-weight Intelligence, Calibration, Speed and Cost axes, then the unchanged Jev-class gates. Matched gap is signed public-minus-sealed accuracy within the matched families. {systemsOverAllowance === 0 ? `No system currently exceeds the ${a.gap_allowance_pp} pp allowance.` : `${systemsOverAllowance} systems currently exceed the ${a.gap_allowance_pp} pp allowance.`} Hosted systems are marked API because their providers received sealed images and questions; the Gemma 4 endpoint is identified separately in the exposure note.</p>
      <RankingTable systems={a.ranking} track="all" all />
    </section>

    <div className="mt-6 max-w-5xl" data-bh-mm-review-notes>
      <p className="bh-muted mt-2 max-w-4xl">The frozen benchmark has {s.items_total} scored items: {s.items_public} public and {s.items_sealed} sealed; {s.items_retired} further items are retired and not scored. This page shows aggregate sealed results only. It contains no sealed task, image, answer key, or per-item prediction.</p>
      {a.ranking.some((row: any) => row.key === 'wity_1') && <p className="mt-3 max-w-4xl rounded-lg border border-amber-600 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100" role="note" data-bh-mm-author-review-summary><b>Wity-1 under author review.</b> The run used the listed production endpoint, but its response did not identify the deployed build. The author is checking the build; this score may change after a full rerun.</p>}
      <p className="mt-3 max-w-4xl rounded-lg border border-amber-600 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100" role="note" data-bh-mm-difficulty-caveat><b>Caveat:</b> {a.method.difficulty_caveat}</p>
    </div>
    <ImageJevExamples />

    <section className="mt-10 max-w-6xl" aria-labelledby="track-heading">
      <h2 id="track-heading" className="text-2xl font-semibold">Results by track</h2>
      <p className="bh-muted mt-2 max-w-5xl text-sm">Each track is ranked on its own public and sealed items. The licensed core and synthetic everyday-photo results remain separately visible.</p>
      <article className="mt-6" aria-labelledby="core-heading"><h3 id="core-heading" className="text-xl font-semibold">Core · {s.core_total} items</h3><p className="bh-muted mt-1 text-sm">{s.core_public} public · {s.core_sealed} sealed: {s.licensed_core_sealed} real-source items and {s.pool_core_sealed} fresh synthetic pool items (documents, charts, inventory, safety).</p><RankingTable systems={a.ranking} track="core" /><details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-accent">Licensed core composite bars</summary><ScoreBars systems={a.ranking} track="core" /></details></article>
      <article className="mt-10" aria-labelledby="photo-heading"><h3 id="photo-heading" className="text-xl font-semibold">Everyday photo decisions · {s.everyday_photo_total} synthetic items</h3><p className="bh-muted mt-1 text-sm">{s.everyday_photo_public} public images from the promo set; {s.everyday_photo_sealed} sealed: {s.everyday_photo_sealed - s.everyday_photo_sealed_fresh} variants from the reviewed v0.1 candidate pool across {s.everyday_photo_situations} matched situations and {s.everyday_photo_sealed_fresh} fresh pool photos. Ambiguous labels were dropped after visual, two-model and gold-blind human checks. No brands and no focused faces.</p><RankingTable systems={a.ranking} track="everyday_photo" /><details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-accent">Everyday photo composite bars</summary><ScoreBars systems={a.ranking} track="everyday_photo" /></details></article>
      <p className="mt-4 rounded-lg border border-line p-4 text-sm" data-bh-djev-spark-sealed-photo><b>djev-spark sealed photo result:</b> {photoSealed.correct}/{photoSealed.n} sealed decisions · {pct(photoSealed.accuracy)}. It saw the public promo images in an earlier inference-only video run, with no training; this sealed score is the independent measurement for it.</p>
    </section>

    <section className="mt-10 max-w-6xl" aria-labelledby="split-heading">
      <h2 id="split-heading" className="text-2xl font-semibold">Split</h2>
      <p className="mt-3 text-sm">The split is {s.items_public} public / {s.items_sealed} sealed ({s.public_percent.toFixed(1)}% / {s.sealed_percent.toFixed(1)}%). The public part is unchanged. The sealed part is {s.kept_sealed} never-exposed v0.1 items plus {s.fresh_sealed} fresh items from our private synthetic rotation pool, and all {a.n_systems} systems were re-run on the fresh items with their original settings. {s.items_retired} legacy items are retired and not scored. {s.disposition.frozen_before_results}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Benchmark size">
        <article className="bh-panel p-4"><p className="bh-eyebrow">Public / sealed split</p><p className="mt-1 text-2xl font-bold">{s.items_public} / {s.items_sealed}</p><p className="bh-muted mt-1 text-sm">{s.public_percent.toFixed(1)}% public · {s.sealed_percent.toFixed(1)}% sealed · was {s.previous_split.public} / {s.previous_split.sealed}</p></article>
        <article className="bh-panel p-4"><p className="bh-eyebrow">Licensed real-source items</p><p className="mt-1 text-2xl font-bold">{s.licensed_core_total} items</p><p className="bh-muted mt-1 text-sm">{s.licensed_core_public} public · {s.licensed_core_sealed} sealed · {s.items_retired} retired</p></article>
        <article className="bh-panel p-4"><p className="bh-eyebrow">Fresh sealed items</p><p className="mt-1 text-2xl font-bold">{s.fresh_sealed} items</p><p className="bh-muted mt-1 text-sm">Our own synthetic renders and photos · {s.pool_core_sealed} core · {s.everyday_photo_sealed_fresh} everyday photos</p></article>
        <article className="bh-panel p-4"><p className="bh-eyebrow">Synthetic share</p><p className="mt-1 text-2xl font-bold">{s.synthetic_share_percent.toFixed(1)}%</p><p className="bh-muted mt-1 text-sm">{s.synthetic_total}/{s.items_total} scored items are our own synthetic content</p></article>
      </div>
      <div className="bh-panel mt-4 space-y-3 p-5 text-sm">
        <p><b>Public</b> means an item was already exposed anywhere. That includes all {reasons.mind2web_public_only} Mind2Web-derived items because Kev's training data overlaps Mind2Web; the {reasons.shown_in_promo_videos} promo photos shown in videos; the {reasons.shown_on_wip_page_and_status_video} example cards on this page and in the status video; and {reasons['in_public_repo_2026-09-21_preview']} source rows in the public site repository since the 21 Sep preview. The split also counts {reasons.image_in_public_repo} image asset already present in that repository. Every scored item that has never been exposed is sealed.</p>
        <p><b>Sealed</b> is {s.kept_sealed} never-exposed v0.1 items plus {s.fresh_sealed} fresh items drawn from our private synthetic rotation pool (documents, charts, inventory and safety scenes, and everyday photos). The draw was stratified by family and difficulty with a seeded draw, and the split counts and hashes were frozen before any system saw a fresh item. Computer Use and Browser Use pool items were excluded because those tracks stay separate. Existing item-level outputs are reused for the public and kept sealed items; every system was run on the fresh items with the same code, pinned revisions, prompts and settings as its original run.</p>
        <p><b>Retired.</b> {s.items_retired} items (ScreenSpot {s.family_counts.ScreenSpot.retired}, ScreenSpot-Pro {s.family_counts['ScreenSpot-Pro'].retired}, Android-in-the-Wild {s.family_counts['Android-in-the-Wild (AITW_Single mirror)'].retired}) were moved from public to sealed on 24 Sep while their inputs and every system's predictions sat outside the sealed store, so they cannot count as an unseen holdout. They are not scored and not relabelled.</p>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm" data-bh-mm-family-counts>
            <thead><tr className="border-b border-line"><th scope="col" className="p-3">Family</th><th scope="col" className="p-3 text-right">Public</th><th scope="col" className="p-3 text-right">Sealed</th><th scope="col" className="p-3 text-right">Retired</th></tr></thead>
            <tbody>{familyRows.map(([family, counts]) => <tr key={family} className="border-b border-line last:border-0"><th scope="row" className="p-3 font-medium">{family}</th><td className="p-3 text-right tabular-nums">{counts.public}</td><td className="p-3 text-right tabular-nums">{counts.sealed}</td><td className="p-3 text-right tabular-nums">{counts.retired}</td></tr>)}
              <tr className="font-bold"><th scope="row" className="p-3">Total</th><td className="p-3 text-right tabular-nums">{s.items_public}</td><td className="p-3 text-right tabular-nums">{s.items_sealed}</td><td className="p-3 text-right tabular-nums">{s.items_retired}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section className="mt-10 max-w-6xl" aria-labelledby="preview-tracks-heading">
      <h2 id="preview-tracks-heading" className="text-2xl font-semibold">Computer Use and Browser Use tracks (preview)</h2>
      <p className="bh-muted mt-2 max-w-5xl text-sm">Two planned tracks extend the image benchmark to computer and browser interactions.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(['computer_use', 'browser_use'] as const).map((key) => {
          const track = a.preview_tracks[key];
          const title = key === 'computer_use' ? 'Computer Use' : 'Browser Use';
          return <article key={key} className="bh-panel p-5" data-bh-mm-preview-track={key}>
            <p className="bh-eyebrow">{title}</p>
            <p className="mt-1 text-2xl font-bold">{track.items_total} items</p>
            <p className="bh-muted mt-1 text-sm"><span className="font-semibold text-[rgb(var(--text))]">{track.public} public</span> · <span className="font-semibold text-[rgb(var(--text))]">{track.sealed} sealed</span></p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(['public', 'sealed'] as const).map((part) => <div key={part} className="rounded-lg border border-line p-3">
                <p className="bh-eyebrow">{part === 'public' ? 'Public' : 'Sealed'} decision types</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{track[`${part}_decision_types`].map((type: string) => <li key={type}>{type}</li>)}</ul>
              </div>)}
            </div>
            <p className="bh-muted mt-4 border-t border-line pt-3 text-sm"><b className="text-[rgb(var(--text))]">Sealed origin:</b> {track.sealed_origin}</p>
          </article>;
        })}
      </div>
      <div className="mt-4 space-y-3 rounded-xl border border-line bg-[var(--surface)] p-4 text-sm">
        <p><b>Cross-track sealing rule.</b> {a.preview_tracks.cross_track_rule}</p>
        <p><b>Kev / Mind2Web flag.</b> {a.preview_tracks.browser_use.mind2web_public_only} {a.preview_tracks.kev_flag}</p>
      </div>
      <p className="mt-4 rounded-lg border border-amber-600 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 dark:bg-amber-950/40 dark:text-amber-100" role="note" data-bh-mm-unmeasured>Not measured yet — no scores. {a.preview_tracks.scoring_status}</p>
    </section>

    <section className="mt-10 max-w-6xl" aria-labelledby="method-heading">
      <h2 id="method-heading" className="text-2xl font-semibold">Method and limitations</h2>
      <div className="bh-panel mt-4 space-y-4 p-5 text-sm">
        <p><b>Intelligence.</b> Accuracy counts missing, invalid and unparseable answers as wrong. Each part is chance-corrected against its own average chance rate, then combined as {a.weights.public * 100}% public and {a.weights.sealed * 100}% sealed. Calibration uses the same weights.</p>
        <p><b>Matched-family overfit penalty.</b> The gap is public accuracy minus sealed accuracy within families that have at least 10 items on both sides: ScreenSpot and Everyday photo. If that matched gap is above {a.gap_allowance_pp} percentage points, Intelligence is multiplied by max(0, 1 − (gap − {a.gap_allowance_pp})/100). The same rule applies to every system. The raw overall gap is shown in the data but does not affect the score.</p>
        <p><b>Calibration.</b> Ten-bin top-label ECE is scaled by valid probability coverage. Label-only output receives zero calibration. OpenJev's NLI entailment values select an answer but are not treated as categorical probabilities.</p>
        <p><b>Speed and cost.</b> Speed uses whole-call p50 and p95 latency; local latency uses the v1.4 2× plus 0.15-second adjustment. Hosted unit cost uses returned per-call usage receipts; missing receipts are not zero-filled, and the Cost axis is scaled by receipt coverage. Retry costs are tracked separately. Local cost uses measured GPU seconds at the recorded per-system GPU-hour rate and excludes loading, downloads, build, and idle time. For self-hosted systems, the original run&apos;s timings are combined with the fresh-item run on the same GPU type.</p>
        <p><b>Capability eligibility.</b> {eligibility}</p>
        <p id="imagejev-pricing" className="scroll-mt-6" data-bh-mm-pricing-method><b>API pricing (1 Oct 2026).</b> API models whose base model we know are ranked at the developer&apos;s stated API price. A striped second bar shows the score and would-be rank at the base-model reference price we use for self-served open weights of the same base. Wity-1 uses USD 0.042 per million input tokens, with output free, on its measured 120,542 input and zero output tokens. Its Qwen3.6-35B-A3B reference is USD 0.15 per million input and USD 1.00 per million output tokens. The API does not quantify image or thinking work, so token pricing may understate full image-compute cost. <a className="text-accent underline" href="https://github.com/fstandhartinger/model-market-comparison/blob/main/data/raw/benchmarks/jevbench/multimodal-preview/PRICING-v0.1.5.md" target="_blank" rel="noopener noreferrer">Pricing provenance</a>.</p>
        <p data-bh-mm-whatif><b>Presets and What-If.</b> Equal 25/25/25/25 weights reproduce the official composite ranking. Capability-only, accuracy, speed and cost presets and the weight sliders explore the same measured axes; the low Intelligence, Speed and Cost gates still apply, including at zero weight. Under custom weights every gated row carries a “gate ×…” tag naming the axis and factor, and the weights panel lists the gates that fire. The striped price alternative re-scores under the same selected weights; its rank is hypothetical. Capability Score and its official frozen eligibility budget stay fixed; the cost and latency cap sliders on the Capability ranking give an unofficial, shareable view with other caps.</p>
        <p><b>Composite and gates.</b> These rules are unchanged. The four axes use an equal-weight harmonic mean, followed by the Jev-class Intelligence, Speed, and Cost gates below 50. Gemini 3.8 Flash's high raw accuracy but near-zero composite reflects its measured cost and the Cost gate; label-only systems have zero Calibration under the inherited convention.</p>
        <p><b>Difficulty balance.</b> The split follows exposure, not a stratified draw, so the parts differ in family mix: browser actions (Mind2Web), chart questions (FinQA) and geometry are public-only, while ScreenSpot-Pro, Android-in-the-Wild and the fresh pool families are sealed-only. This is why the overfit penalty compares only matched families (ScreenSpot and Everyday photo).</p>
        <p><b>Fresh-item difficulty.</b> {a.method.difficulty_caveat} Scores on this split are therefore not comparable with the earlier 228/216 preview.</p>
        <p data-bh-reevaluation-policy><b>Re-evaluation policy.</b> Every release re-evaluates the current top 10 on the composite score. Models ranked #11 and below are re-evaluated on a slower cadence — at least monthly, or with every third scheduled refresh release, whichever comes first — and their score is shown as last measured on its release. A material method change re-evaluates every model. Paid fast-lane runs are evaluated within 48 hours of payment, and new submissions are evaluated in the order received.</p>
        <p><b>Exposure.</b> GPT-6 Luna and Gemini 3.8 Flash previously saw public promo-photo candidates and sealed-photo candidates in stateless label-check calls, including candidates later dropped. The checks showed no gold; human gold-blind adjudication decided inclusion. GPT-6 Luna is the saved low-reasoning-effort setting. {a.exposure.hosted} {a.exposure.gemma} {a.exposure.djev_spark} Local systems ran without network, credentials, or gold maps. {a.exposure.fresh_pool}</p>
      </div>
    </section>

    <details className="mt-10 max-w-6xl rounded-xl border border-line bg-[var(--surface)] p-5" data-bh-mm-candidates-details>
      <summary className="cursor-pointer text-2xl font-semibold">Requested and excluded candidates ({a.candidate_coverage.candidates.length})</summary>
      <p className="bh-muted mt-3 max-w-5xl text-sm">The ranking covers {a.n_systems} measured configurations. {a.candidate_coverage.included_note} Candidates below have no score unless listed in the ranking. Requested rows remain visible with the exact access or review blocker; exclusions describe the reviewed interface, license or duplicate status.</p>
      <CandidateCoverageTable candidates={a.candidate_coverage.candidates} />
    </details>

    <ImageJevRevisionHistory current={a} />

    <p className="bh-muted mt-9 max-w-6xl border-t border-line pt-4 text-xs">Image JevBench is a separate benchmark from the text-only JevBench Score. <a className="text-accent underline" href="/submit" data-bh-submit-link>Submit a model for evaluation →</a> Sealed item-level content remains private. Public/sealed item counts, accuracy, track and score breakdowns are aggregates. Results describe these exact tested configurations and do not establish absence from model training data.</p>
  </>;
}

function scalarNotes(value: any, label = ''): Array<{ label: string; value: string }> {
  if (typeof value === 'string') {
    if (!value.trim() || /^[a-f0-9]{64}$/i.test(value.trim())) return [];
    return [{ label: label.replace(/[_-]+/g, ' '), value: value.trim() }];
  }
  if (typeof value === 'number' || typeof value === 'boolean') return [{ label: label.replace(/[_-]+/g, ' '), value: String(value) }];
  if (Array.isArray(value)) return value.flatMap((item, index) => scalarNotes(item, `${label} ${index + 1}`));
  if (value && typeof value === 'object') return Object.entries(value)
    .filter(([key]) => !/sha|hash|secret|token/i.test(key))
    .flatMap(([key, child]) => scalarNotes(child, label ? `${label} · ${key}` : key));
  return [];
}

function PublicNote({ item }: { item: { label: string; value: string } }) {
  const plain = item.label.endsWith('Rune infrastructure failure')
    ? 'An earlier Rune run failed to load its weights and produced no predictions. The score shown here comes from the later complete evaluation. We corrected the earlier run history; measured outputs, scores and configuration are unchanged.'
    : item.value.replace(/\bSandy\b/g, 'our evaluation server')
      .replace(/Florian-selected/g, 'maintainer-selected')
      .replace(/clean-sealed kitA run receipt/g, 'sealed evaluation receipt')
      .replace(/\bkitA\b/g, 'evaluation')
      .replace(/\b[a-f0-9]{40,64}\b/gi, 'pinned revision');
  return <div><p><b>{item.label}.</b> {plain}</p>
    {plain !== item.value && <details className="mt-2" data-bh-imagejev-v02-technical-provenance><summary className="cursor-pointer text-accent">Technical provenance</summary><p className="bh-muted mt-2">{item.value}</p></details>}
  </div>;
}

/** Archived v0.1.4 release, rendered as published from its byte-pinned artifact (385aba04…). */
async function ArchivedV014Content({ versionTabs }: { versionTabs: VersionTabCounts }) {
  const a: any = (await readArchivedMultimodalPreviewV014()).artifact;
  const s = a.split;
  const djevSpark = a.ranking.find((x: any) => x.key === 'djev_spark_nvfp4');
  const photoSealed = djevSpark.tracks.everyday_photo.sealed;
  const familyRows = Object.entries(s.family_counts) as [string, FamilyCount][];
  const systemsOverAllowance = a.ranking.filter((row: any) => row.tracks.all.matched_gap_pp > a.gap_allowance_pp).length;
  const reasons = s.public_reason_counts;

  return <>
    <header className="bh-page-head max-w-5xl">
      <p className="bh-eyebrow">Image benchmark · {a.release_version}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Image JevBench {a.release_version}</h1>
      <p className="mt-3 max-w-3xl text-lg">A held-out comparison of systems that make decisions from images, from interface targets to everyday scenes.</p>
      <VersionTabs selected="v0.1.4" {...versionTabs} />
      <p className="bh-muted mt-2 max-w-4xl">The frozen benchmark has {s.items_total} scored items: {s.items_public} public and {s.items_sealed} sealed; {s.items_retired} further items are retired and not scored. This page shows aggregate sealed results only. It contains no sealed task, image, answer key, or per-item prediction.</p>
      {a.revision === 'v0.1.4' && <p className="mt-3 max-w-4xl rounded-lg border border-amber-600 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100" role="note" data-bh-mm-author-review-summary><b>Wity-1 under author review.</b> The run used the listed production endpoint, but its response did not identify the deployed build. The author is checking the build; this score may change after a full rerun.</p>}
      <p className="mt-3 max-w-4xl rounded-lg border border-amber-600 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100" role="note" data-bh-mm-difficulty-caveat><b>Caveat:</b> {a.method.difficulty_caveat}</p>
    </header>

    <section className="mt-10" aria-labelledby="bars-heading">
      <h2 id="bars-heading" className="text-2xl font-semibold">Composite score</h2>
      <p className="bh-muted mt-1 text-sm">Whole benchmark, {s.items_total} decisions. Bars include all {a.n_systems} systems. Pink bars are hosted APIs; Wity-1 and Gemma are hosted endpoints without a no-retention claim. A system whose Cost or Calibration axis falls under the gate scores 0; the row says which gate it is.</p>
      <ScoreBars systems={a.ranking} track="all" />
    </section>

    <section className="mt-10 max-w-none" aria-labelledby="overall-heading">
      <h2 id="overall-heading" className="text-2xl font-semibold">Full ranking</h2>
      <p className="bh-muted mt-2 max-w-5xl text-sm">Ranked by the composite score: equal-weight Intelligence, Calibration, Speed and Cost axes, then the unchanged Jev-class gates. Matched gap is signed public-minus-sealed accuracy within the matched families. {systemsOverAllowance === 0 ? `No system currently exceeds the ${a.gap_allowance_pp} pp allowance.` : `${systemsOverAllowance} systems currently exceed the ${a.gap_allowance_pp} pp allowance.`} Hosted systems are marked API because their providers received sealed images and questions; the Gemma 4 endpoint is identified separately in the exposure note.</p>
      <RankingTable systems={a.ranking} track="all" all />
    </section>

    <ImageJevRadar systems={a.ranking} />
    <ImageJevExamples />

    <section className="mt-10 max-w-6xl" aria-labelledby="track-heading">
      <h2 id="track-heading" className="text-2xl font-semibold">Results by track</h2>
      <p className="bh-muted mt-2 max-w-5xl text-sm">Each track is ranked on its own public and sealed items. The licensed core and synthetic everyday-photo results remain separately visible.</p>
      <article className="mt-6" aria-labelledby="core-heading"><h3 id="core-heading" className="text-xl font-semibold">Core · {s.core_total} items</h3><p className="bh-muted mt-1 text-sm">{s.core_public} public · {s.core_sealed} sealed: {s.licensed_core_sealed} real-source items and {s.pool_core_sealed} fresh synthetic pool items (documents, charts, inventory, safety).</p><RankingTable systems={a.ranking} track="core" /></article>
      <article className="mt-10" aria-labelledby="photo-heading"><h3 id="photo-heading" className="text-xl font-semibold">Everyday photo decisions · {s.everyday_photo_total} synthetic items</h3><p className="bh-muted mt-1 text-sm">{s.everyday_photo_public} public images from the promo set; {s.everyday_photo_sealed} sealed: {s.everyday_photo_sealed - s.everyday_photo_sealed_fresh} variants from the reviewed v0.1 candidate pool across {s.everyday_photo_situations} matched situations and {s.everyday_photo_sealed_fresh} fresh pool photos. Ambiguous labels were dropped after visual, two-model and gold-blind human checks. No brands and no focused faces.</p><RankingTable systems={a.ranking} track="everyday_photo" /></article>
      <p className="mt-4 rounded-lg border border-line p-4 text-sm" data-bh-djev-spark-sealed-photo><b>djev-spark sealed photo result:</b> {photoSealed.correct}/{photoSealed.n} sealed decisions · {pct(photoSealed.accuracy)}. It saw the public promo images in an earlier inference-only video run, with no training; this sealed score is the independent measurement for it.</p>
    </section>

    <section className="mt-10 max-w-6xl" aria-labelledby="split-heading">
      <h2 id="split-heading" className="text-2xl font-semibold">Split</h2>
      <p className="mt-3 text-sm">The split is {s.items_public} public / {s.items_sealed} sealed ({s.public_percent.toFixed(1)}% / {s.sealed_percent.toFixed(1)}%). The public part is unchanged. The sealed part is {s.kept_sealed} never-exposed v0.1 items plus {s.fresh_sealed} fresh items from our private synthetic rotation pool, and all {a.n_systems} systems were re-run on the fresh items with their original settings. {s.items_retired} legacy items are retired and not scored. {s.disposition.frozen_before_results}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Benchmark size">
        <article className="bh-panel p-4"><p className="bh-eyebrow">Public / sealed split</p><p className="mt-1 text-2xl font-bold">{s.items_public} / {s.items_sealed}</p><p className="bh-muted mt-1 text-sm">{s.public_percent.toFixed(1)}% public · {s.sealed_percent.toFixed(1)}% sealed · was {s.previous_split.public} / {s.previous_split.sealed}</p></article>
        <article className="bh-panel p-4"><p className="bh-eyebrow">Licensed real-source items</p><p className="mt-1 text-2xl font-bold">{s.licensed_core_total} items</p><p className="bh-muted mt-1 text-sm">{s.licensed_core_public} public · {s.licensed_core_sealed} sealed · {s.items_retired} retired</p></article>
        <article className="bh-panel p-4"><p className="bh-eyebrow">Fresh sealed items</p><p className="mt-1 text-2xl font-bold">{s.fresh_sealed} items</p><p className="bh-muted mt-1 text-sm">Our own synthetic renders and photos · {s.pool_core_sealed} core · {s.everyday_photo_sealed_fresh} everyday photos</p></article>
        <article className="bh-panel p-4"><p className="bh-eyebrow">Synthetic share</p><p className="mt-1 text-2xl font-bold">{s.synthetic_share_percent.toFixed(1)}%</p><p className="bh-muted mt-1 text-sm">{s.synthetic_total}/{s.items_total} scored items are our own synthetic content</p></article>
      </div>
      <div className="bh-panel mt-4 space-y-3 p-5 text-sm">
        <p><b>Public</b> means an item was already exposed anywhere. That includes all {reasons.mind2web_public_only} Mind2Web-derived items because Kev's training data overlaps Mind2Web; the {reasons.shown_in_promo_videos} promo photos shown in videos; the {reasons.shown_on_wip_page_and_status_video} example cards on this page and in the status video; and {reasons['in_public_repo_2026-09-21_preview']} source rows in the public site repository since the 21 Sep preview. The split also counts {reasons.image_in_public_repo} image asset already present in that repository. Every scored item that has never been exposed is sealed.</p>
        <p><b>Sealed</b> is {s.kept_sealed} never-exposed v0.1 items plus {s.fresh_sealed} fresh items drawn from our private synthetic rotation pool (documents, charts, inventory and safety scenes, and everyday photos). The draw was stratified by family and difficulty with a seeded draw, and the split counts and hashes were frozen before any system saw a fresh item. Computer Use and Browser Use pool items were excluded because those tracks stay separate. Existing item-level outputs are reused for the public and kept sealed items; every system was run on the fresh items with the same code, pinned revisions, prompts and settings as its original run.</p>
        <p><b>Retired.</b> {s.items_retired} items (ScreenSpot {s.family_counts.ScreenSpot.retired}, ScreenSpot-Pro {s.family_counts['ScreenSpot-Pro'].retired}, Android-in-the-Wild {s.family_counts['Android-in-the-Wild (AITW_Single mirror)'].retired}) were moved from public to sealed on 24 Sep while their inputs and every system's predictions sat outside the sealed store, so they cannot count as an unseen holdout. They are not scored and not relabelled.</p>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm" data-bh-mm-family-counts>
            <thead><tr className="border-b border-line"><th scope="col" className="p-3">Family</th><th scope="col" className="p-3 text-right">Public</th><th scope="col" className="p-3 text-right">Sealed</th><th scope="col" className="p-3 text-right">Retired</th></tr></thead>
            <tbody>{familyRows.map(([family, counts]) => <tr key={family} className="border-b border-line last:border-0"><th scope="row" className="p-3 font-medium">{family}</th><td className="p-3 text-right tabular-nums">{counts.public}</td><td className="p-3 text-right tabular-nums">{counts.sealed}</td><td className="p-3 text-right tabular-nums">{counts.retired}</td></tr>)}
              <tr className="font-bold"><th scope="row" className="p-3">Total</th><td className="p-3 text-right tabular-nums">{s.items_public}</td><td className="p-3 text-right tabular-nums">{s.items_sealed}</td><td className="p-3 text-right tabular-nums">{s.items_retired}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section className="mt-10 max-w-6xl" aria-labelledby="preview-tracks-heading">
      <h2 id="preview-tracks-heading" className="text-2xl font-semibold">Computer Use and Browser Use tracks (preview)</h2>
      <p className="bh-muted mt-2 max-w-5xl text-sm">Two planned tracks extend the image benchmark to computer and browser interactions.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(['computer_use', 'browser_use'] as const).map((key) => {
          const track = a.preview_tracks[key];
          const title = key === 'computer_use' ? 'Computer Use' : 'Browser Use';
          return <article key={key} className="bh-panel p-5" data-bh-mm-preview-track={key}>
            <p className="bh-eyebrow">{title}</p>
            <p className="mt-1 text-2xl font-bold">{track.items_total} items</p>
            <p className="bh-muted mt-1 text-sm"><span className="font-semibold text-[rgb(var(--text))]">{track.public} public</span> · <span className="font-semibold text-[rgb(var(--text))]">{track.sealed} sealed</span></p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(['public', 'sealed'] as const).map((part) => <div key={part} className="rounded-lg border border-line p-3">
                <p className="bh-eyebrow">{part === 'public' ? 'Public' : 'Sealed'} decision types</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{track[`${part}_decision_types`].map((type: string) => <li key={type}>{type}</li>)}</ul>
              </div>)}
            </div>
            <p className="bh-muted mt-4 border-t border-line pt-3 text-sm"><b className="text-[rgb(var(--text))]">Sealed origin:</b> {track.sealed_origin}</p>
          </article>;
        })}
      </div>
      <div className="mt-4 space-y-3 rounded-xl border border-line bg-[var(--surface)] p-4 text-sm">
        <p><b>Cross-track sealing rule.</b> {a.preview_tracks.cross_track_rule}</p>
        <p><b>Kev / Mind2Web flag.</b> {a.preview_tracks.browser_use.mind2web_public_only} {a.preview_tracks.kev_flag}</p>
      </div>
      <p className="mt-4 rounded-lg border border-amber-600 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 dark:bg-amber-950/40 dark:text-amber-100" role="note" data-bh-mm-unmeasured>Not measured yet — no scores. {a.preview_tracks.scoring_status}</p>
    </section>

    <section className="mt-10 max-w-6xl" aria-labelledby="method-heading">
      <h2 id="method-heading" className="text-2xl font-semibold">Method and limitations</h2>
      <div className="bh-panel mt-4 space-y-4 p-5 text-sm">
        <p><b>Intelligence.</b> Accuracy counts missing, invalid and unparseable answers as wrong. Each part is chance-corrected against its own average chance rate, then combined as {a.weights.public * 100}% public and {a.weights.sealed * 100}% sealed. Calibration uses the same weights.</p>
        <p><b>Matched-family overfit penalty.</b> The gap is public accuracy minus sealed accuracy within families that have at least 10 items on both sides: ScreenSpot and Everyday photo. If that matched gap is above {a.gap_allowance_pp} percentage points, Intelligence is multiplied by max(0, 1 − (gap − {a.gap_allowance_pp})/100). The same rule applies to every system. The raw overall gap is shown in the data but does not affect the score.</p>
        <p><b>Calibration.</b> Ten-bin top-label ECE is scaled by valid probability coverage. Label-only output receives zero calibration. OpenJev's NLI entailment values select an answer but are not treated as categorical probabilities.</p>
        <p><b>Speed and cost.</b> Speed uses whole-call p50 and p95 latency; local latency uses the v1.4 2× plus 0.15-second adjustment. Hosted unit cost uses returned per-call usage receipts; missing receipts are not zero-filled, and the Cost axis is scaled by receipt coverage. Retry costs are tracked separately. Wity-1 uses an <a className="text-accent underline" href="https://github.com/fstandhartinger/model-market-comparison/blob/main/data/raw/benchmarks/jevbench/multimodal-preview/PRICING-v0.1.4.md" target="_blank" rel="noopener noreferrer">estimated base-model price</a> of USD 0.15 per million input tokens and USD 1.00 per million output tokens, applied to its measured 120,542 input and zero output tokens. Florian chose this basis on 29 Sep because Wity&apos;s younger public tariff is below the base-model reference. The API does not quantify image or thinking work, so this estimate may understate full image-compute cost. Local cost uses measured GPU seconds at the recorded per-system GPU-hour rate and excludes loading, downloads, build, and idle time. For self-hosted systems, the original run&apos;s timings are combined with the fresh-item run on the same GPU type.</p>
        <p><b>Composite and gates.</b> These rules are unchanged. The four axes use an equal-weight harmonic mean, followed by the Jev-class Intelligence, Speed, and Cost gates below 50. Gemini 3.8 Flash's high raw accuracy but near-zero composite reflects its measured cost and the Cost gate; label-only systems have zero Calibration under the inherited convention.</p>
        <p><b>Difficulty balance.</b> The split follows exposure, not a stratified draw, so the parts differ in family mix: browser actions (Mind2Web), chart questions (FinQA) and geometry are public-only, while ScreenSpot-Pro, Android-in-the-Wild and the fresh pool families are sealed-only. This is why the overfit penalty compares only matched families (ScreenSpot and Everyday photo).</p>
        <p><b>Fresh-item difficulty.</b> {a.method.difficulty_caveat} Scores on this split are therefore not comparable with the earlier 228/216 preview.</p>
        <p><b>Exposure.</b> GPT-6 Luna and Gemini 3.8 Flash previously saw public promo-photo candidates and sealed-photo candidates in stateless label-check calls, including candidates later dropped. The checks showed no gold; human gold-blind adjudication decided inclusion. GPT-6 Luna is the saved low-reasoning-effort setting. {a.exposure.hosted} {a.exposure.gemma} {a.exposure.djev_spark} Local systems ran without network, credentials, or gold maps. {a.exposure.fresh_pool}</p>
      </div>
    </section>

    <details className="mt-10 max-w-6xl rounded-xl border border-line bg-[var(--surface)] p-5" data-bh-mm-candidates-details>
      <summary className="cursor-pointer text-2xl font-semibold">Requested and excluded candidates ({a.candidate_coverage.candidates.length})</summary>
      <p className="bh-muted mt-3 max-w-5xl text-sm">The ranking covers {a.n_systems} measured configurations. {a.candidate_coverage.included_note} Candidates below have no score unless listed in the ranking. Requested rows remain visible with the exact access or review blocker; exclusions describe the reviewed interface, license or duplicate status.</p>
      <CandidateCoverageTable candidates={a.candidate_coverage.candidates} />
    </details>

    <p className="bh-muted mt-9 max-w-6xl border-t border-line pt-4 text-xs">Image JevBench is a separate benchmark from the text-only JevBench Score. Sealed item-level content remains private. Public/sealed item counts, accuracy, track and score breakdowns are aggregates. Results describe these exact tested configurations and do not establish absence from model training data.</p>
  </>;
}

type ImageJevTabVersion = 'v0.2.0' | 'v0.1.5' | 'v0.1.4';
type VersionTabCounts = { v02Count: number; v02UnrankableCount?: number; v015Count: number; v014Count: number; unavailable?: boolean };

function VersionTabs({ selected, v02Count, v02UnrankableCount = 0, v015Count, v014Count, unavailable = false }: VersionTabCounts & { selected: ImageJevTabVersion }) {
  const label = (version: ImageJevTabVersion) => version === 'v0.2.0'
    ? `v0.2 · ${unavailable ? 'unavailable' : v02Count || v02UnrankableCount ? `${v02Count} ranked${v02UnrankableCount ? ` · ${v02UnrankableCount} no composite` : ''}` : 'measuring'}`
    : version === 'v0.1.5' ? `v0.1.5 · ${v015Count} ranked · archived` : `v0.1.4 · ${v014Count} ranked · archived`;
  return <div className="mt-4 flex flex-wrap items-center gap-3" data-bh-imagejev-version-tabs>
    <nav className="flex w-full gap-1 rounded-lg border border-line p-0.5 sm:w-fit" aria-label="Image JevBench version">
    {(['v0.2.0', 'v0.1.5', 'v0.1.4'] as const).map((version) => <a key={version}
      href={`/image-jev-bench?version=${version}`}
      aria-current={selected === version ? 'page' : undefined}
      className={`flex min-h-10 flex-1 items-center justify-center rounded-md px-2 py-2 text-center text-xs sm:flex-none sm:px-4 sm:text-sm ${selected === version ? 'bg-accent text-ink' : 'bh-muted'}`}
      data-bh-imagejev-version-tab={version}>
      {label(version)}
    </a>)}
    </nav>
    <p className="bh-muted text-xs">Scores are not comparable across versions. v0.1.5 re-priced Wity-1 on the v0.1.4 pool; v0.2 uses a new pool.</p>
  </div>;
}

function ReferenceRows({ rows }: { rows: any[] }) {
  if (!rows.length) return null;
  return <section id="imagejev-v02-references" className="mt-10 max-w-6xl scroll-mt-6" aria-labelledby="imagejev-v02-references-heading" data-bh-imagejev-v02-references>
    <h2 id="imagejev-v02-references-heading" className="text-2xl font-semibold">v0.1.4 reference rows · not ranked in v0.2</h2>
    <p className="bh-muted mt-2 text-xs">Scroll or swipe the table to read each reference score and reason.</p>
    <p className="bh-muted mt-2 max-w-5xl text-sm">These systems have no ranked v0.2 CORE composite. Their earlier v0.1.4 scores are shown for reference only and do not affect v0.2 charts, comparisons, tables or ranks.</p>
    <div className="mt-4 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[760px] text-left text-sm" data-bh-imagejev-v02-reference-table>
        <thead><tr><th scope="col" className="p-3">System</th><th scope="col" className="p-3">Status</th><th scope="col" className="p-3 text-right">v0.1.4 score · reference</th><th scope="col" className="p-3">Reason</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.key} className="border-t border-line" data-bh-imagejev-v02-reference-row={row.key}>
          <th scope="row" className="p-3 font-semibold">{row.name}{row.kind === 'api' && <span className="bh-thin-tag ml-1.5">API</span>}</th>
          <td className="p-3">Reference only</td><td className="p-3 text-right tabular-nums">{Number(row.reference_score).toFixed(2)}</td><td className="p-3">{row.reason}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

function MeasuredWithoutCompositeRows({ rows, references }: { rows: any[]; references: any[] }) {
  if (!rows.length) return null;
  const referenceByKey = new Map(references.map((row) => [row.key, row]));
  const axis = (value: unknown) => Number.isFinite(value) ? (value as number).toFixed(2) : '—';
  return <section id="imagejev-v02-measured-unrankable" className="mt-10 max-w-6xl scroll-mt-6" aria-labelledby="imagejev-v02-measured-unrankable-heading" data-bh-imagejev-v02-measured-unrankable>
    <h2 id="imagejev-v02-measured-unrankable-heading" className="text-2xl font-semibold">Measured without a CORE composite</h2>
    <p className="bh-muted mt-2 text-xs">Scroll or swipe for missing-cost details, reasons and any labelled v0.1.4 reference score.</p>
    <p className="bh-muted mt-2 max-w-5xl text-sm">These complete v0.2 runs retain their measured CORE Intelligence, Calibration and Speed axes. Missing Cost prevents a CORE composite under the frozen method, so they have no rank and do not enter charts, comparisons or the ranking table. Available v0.1.4 scores are labeled as references; historical additions without a v0.1.4 row are identified separately.</p>
    <div className="mt-4 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[880px] text-left text-sm" data-bh-imagejev-v02-unrankable-table>
        <thead><tr className="border-b border-line"><th scope="col" className="p-3">System</th><th scope="col" className="p-3 text-right">Intelligence</th><th scope="col" className="p-3 text-right">Calibration</th><th scope="col" className="p-3 text-right">Speed</th><th scope="col" className="p-3 text-right">Cost</th><th scope="col" className="p-3 text-right">CORE composite</th><th scope="col" className="p-3 text-right">v0.1.4 score · reference</th><th scope="col" className="p-3">Reason</th></tr></thead>
        <tbody>{rows.map((row) => {
          const core = row.tracks.core;
          const reference = referenceByKey.get(row.key);
          return <tr key={row.key} className="border-t border-line align-top" data-bh-imagejev-v02-unrankable-row={row.key}>
            <th scope="row" className="p-3 text-left font-semibold">{row.name}{row.api_flag && <span className="bh-thin-tag ml-1.5">API</span>}<span className="bh-muted mt-0.5 block text-xs font-normal">Measured on v0.2 · no rank</span></th>
            <td className="p-3 text-right tabular-nums">{axis(core.axes.intelligence)}</td><td className="p-3 text-right tabular-nums">{axis(core.axes.calibration)}</td><td className="p-3 text-right tabular-nums">{axis(core.axes.speed)}</td><td className="p-3 text-right tabular-nums">{axis(core.axes.cost)}</td><td className="p-3 text-right tabular-nums">—</td>
            <td className="p-3 text-right tabular-nums">{reference
              ? <><span className="bh-thin-tag">REFERENCE v0.1.4</span><b className="mt-1 block">{Number(reference.reference_score).toFixed(2)}</b></>
              : <span>No v0.1.4 score (historical addition)</span>}</td>
            <td className="p-3">{row.reason}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}

function CapabilityStatusRows({ measured, references }: { measured: any[]; references: any[] }) {
  if (!measured.length && !references.length) return null;
  const capability = (row: any) => (row.tracks.core.axes.intelligence + row.tracks.core.axes.calibration) / 2;
  return <div className="bh-panel mt-3 max-w-4xl p-4 text-sm" data-bh-imagejev-v02-capability-status>
    <h3 className="text-base font-semibold">Not in the Capability Score ranking</h3>
    {measured.length > 0 && <>
      <p className="bh-muted mt-1 text-[13px]">Measured on v0.2 without a cost receipt ({measured.length}). Their Capability is measured, but eligibility needs cost, so they are neither ranked nor counted as outside the limits.</p>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-3" data-bh-imagejev-v02-capability-unmeasured-cost>
        {measured.map((row) => <li key={row.key} className="rounded-lg border border-line px-3 py-2" data-bh-imagejev-v02-capability-null={row.key}><b className="block">{row.name}</b><span className="bh-muted text-xs">Capability {capability(row).toFixed(1)} · cost not measured · no rank</span></li>)}
      </ul>
    </>}
    {references.length > 0 && <>
      <p className="bh-muted mt-3 text-[13px]">Not re-measured in v0.2 ({references.length}). Only their v0.1.4 score exists; it is a historical reference and has no v0.2 Capability value.</p>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-3" data-bh-imagejev-v02-capability-references>
        {references.map((row) => <li key={row.key} className="rounded-lg border border-dashed border-line px-3 py-2" data-bh-imagejev-v02-capability-reference={row.key}><b className="block">{row.name}</b><span className="bh-muted text-xs"><span className="bh-thin-tag">REFERENCE v0.1.4</span> {Number(row.reference_score).toFixed(2)} · not ranked</span></li>)}
      </ul>
      <a className="mt-2 inline-block text-xs text-accent underline" href="#imagejev-v02-references">Reference details ↓</a>
    </>}
  </div>;
}

function ImageJevV02Page({ artifact, staging, archiveCounts }: { artifact: any; staging: boolean; archiveCounts: { v015: number; v014: number } }) {
  const systems: any[] = artifact.ranking;
  const measuredWithoutComposite: any[] = artifact.measured_unrankable_rows ?? [];
  const allReferences: any[] = artifact.reference_rows;
  const measuredWithoutCompositeKeys = new Set(measuredWithoutComposite.map((row) => row.key));
  const referenceOnlyRows = allReferences.filter((row) => !measuredWithoutCompositeKeys.has(row.key));
  const visibleKeys = multimodalPreviewV02VisibleKeys(artifact);
  const inProgress = artifact.status === 'measurements-in-progress';
  const rawCore = artifact.split?.core ?? artifact.split?.tracks?.core ?? artifact.track_splits?.core ?? {};
  const coreTotal = rawCore.items_total ?? rawCore.total ?? 418;
  const corePublic = rawCore.items_public ?? rawCore.public ?? 157;
  const coreSealed = rawCore.items_sealed ?? rawCore.sealed ?? 261;
  const computerUseTotal = artifact.split?.['computer-use']?.items_total ?? artifact.split?.tracks?.['computer-use']?.items_total ?? 86;
  const browserUseTotal = artifact.split?.['browser-use']?.items_total ?? artifact.split?.tracks?.['browser-use']?.items_total ?? 69;
  const methodNotes = scalarNotes(artifact.method, 'Scoring method').slice(0, 24);
  const exposureNotes = scalarNotes(artifact.exposure, 'Exposure').slice(0, 16);
  const publicProvenance = Object.fromEntries(Object.entries(artifact.release_provenance ?? {}).filter(([key]) => key !== 'Configuration receipts'));
  const provenanceNotes = scalarNotes(publicProvenance, 'Release provenance');
  const computerRows = systems.filter((row) => Number.isFinite(row.tracks?.['computer-use']?.composite?.score));
  const browserRows = systems.filter((row) => Number.isFinite(row.tracks?.['browser-use']?.composite?.score));
  // 1 Oct 2026 headline: JevImageBench Capability Score of systems inside the frozen JevBench cost/latency envelope.
  const eligibilityFrozen = artifact.capability_eligibility;
  const chartSystems = eligibilityFrozen ? imageJevBoardSystems(artifact) : [];
  const limits = eligibilityFrozen ? imageJevCapabilityLimits(artifact) : null;
  const classOptions = limits ? { limits, factor: limits.factor, referenceLabel: limits.referenceLabel } : null;
  const classResult = classOptions ? jevClassRows(chartSystems, classOptions) : null;
  const qualifying = classResult?.rows.filter((row) => row.inClass).length ?? 0;
  const atThree = limits ? jevClassRows(chartSystems, { ...classOptions, factor: 3, limits: { cost: limits.cost * 3 / limits.factor, latency: limits.latency * 3 / limits.factor } }).rows.filter((row) => row.inClass).length : 0;
  const repriced: any[] = systems.filter((row) => row.pricing_alternative);
  const eligibility = limits && <>Jev itself cannot read images, so there is no Jev row to anchor on. We use the same absolute budget as JevBench, frozen in this release: at most {limits.factor}× Jev 1.13.0&apos;s JevBench v1.5.4 cost (≤ USD {limits.cost.toFixed(4)} per 1,000 decisions) and at most {limits.factor}× its median latency (≤ {limits.latency.toFixed(2)} s, the adjusted p50 that the speed chart also uses). A decision model in this class should fit the same budget whether the input is text or an image. {qualifying} of {chartSystems.length} systems with a v0.2 CORE composite qualify; a 3× budget would admit {atThree}. Capability Score is (Intelligence + Calibration) / 2 on the CORE track; ranks count eligible systems only.</>;
  return <section data-bh-imagejev-v02-page data-bh-imagejev-v02-status={artifact.status}>
    <header className="bh-page-head max-w-5xl">
      <p className="bh-eyebrow">Image benchmark · v0.2</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Image JevBench {artifact.version}</h1>
      <p className="mt-3 max-w-3xl text-lg">A held-out comparison of systems that make decisions from images, from interface targets to everyday scenes.</p>
      <VersionTabs selected="v0.2.0" v02Count={systems.length} v02UnrankableCount={measuredWithoutComposite.length} v015Count={archiveCounts.v015} v014Count={archiveCounts.v014} />
      <p className="bh-muted mt-2 max-w-4xl">Headline: <b>CORE track, {coreTotal} items</b> ({corePublic} public · {coreSealed} sealed) from a frozen 573-item pool (191 public · 382 sealed). <b>{systems.length} systems ranked</b> on v0.2; <b>{measuredWithoutComposite.length} complete runs measured without a CORE composite</b> are shown without rank; <b>{referenceOnlyRows.length} reference-only systems</b> retain their labeled v0.1.4 score. {visibleKeys.size} unique configurations are represented across these sections.</p>
      <p className="bh-muted mt-2 max-w-4xl">Computer Use ({computerUseTotal}) and Browser Use ({browserUseTotal}) are static-screenshot diagnostic tracks, scored separately below. Each item is one screenshot and one decision; these scores are not workflow or task-completion rates and are not part of the headline.</p>
      {inProgress && <p className="mt-4 max-w-4xl rounded-lg border border-amber-600 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 dark:bg-amber-950/40 dark:text-amber-100" role="status" data-bh-imagejev-v02-unmeasured>
        {staging ? 'Measurements are in progress. This tab has no v0.2 scores yet.' : 'The v0.2 measurements are in progress. This artifact has no ranked scores.'} The rows below are v0.1.4 references only.
      </p>}
      {!inProgress && <p className="mt-3 max-w-4xl rounded-lg border border-amber-600 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100" role="note" data-bh-imagejev-v02-measured-only><b>Measured only.</b> A v0.2 rank requires a fresh CORE composite. v0.1.4 values remain labeled references and never contribute to a v0.2 rank, capability value or measured plot.</p>}
      <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-accent" aria-label="Jump to Image JevBench sections" data-bh-imagejev-v02-jumps>
        <a href="#jev-capability">Capability Score</a><a href="#imagejev-v02-capability">Speed &amp; cost</a><a href="#imagejev-v02-composite-heading">Composite</a><a href="#image-jev-compare">Compare</a><a href="#imagejev-v02-ranking-heading">Table</a><a href="#imagejev-v02-method-heading">Method</a><a href="#imagejev-v02-history-heading">History</a>
      </nav>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-label="Image JevBench v0.2 counts" data-bh-imagejev-v02-kpis>
        <article className="bh-panel p-4"><p className="bh-eyebrow">CORE headline</p><p className="mt-1 text-2xl font-bold">{coreTotal} items</p><p className="bh-muted mt-1 text-sm">{corePublic} public · {coreSealed} sealed</p></article>
        <article className="bh-panel p-4"><p className="bh-eyebrow">Frozen pool</p><p className="mt-1 text-2xl font-bold">573 items</p><p className="bh-muted mt-1 text-sm">191 public · 382 sealed</p></article>
        <article className="bh-panel p-4"><p className="bh-eyebrow">Ranked CORE</p><p className="mt-1 text-2xl font-bold">{systems.length} systems</p><p className="bh-muted mt-1 text-sm">v0.2 composite results</p></article>
        <article className="bh-panel p-4"><p className="bh-eyebrow">Measured · no composite</p><p className="mt-1 text-2xl font-bold">{measuredWithoutComposite.length} systems</p><p className="bh-muted mt-1 text-sm">Fresh axes · no rank</p></article>
        <article className="bh-panel p-4"><p className="bh-eyebrow">Reference only</p><p className="mt-1 text-2xl font-bold">{referenceOnlyRows.length} systems</p><p className="bh-muted mt-1 text-sm">v0.1.4 score · not ranked</p></article>
        <article className="bh-panel p-4"><p className="bh-eyebrow">Configurations</p><p className="mt-1 text-2xl font-bold">{visibleKeys.size} systems</p><p className="bh-muted mt-1 text-sm">Unique visible roster</p></article>
      </div>
    </header>

    {classOptions && <div data-bh-imagejev-v02-capability-headline>
      <JevCapabilityRanking systems={chartSystems} revision="v0.2.0 · CORE" officialHref="#imagejev-v02-composite-heading"
        benchName="JevImageBench" {...classOptions} eligibilityNote={eligibility}
        correlationReason="mostly because self-hosted cost is computed from measured GPU time; both bars are kept for consistency with JevBench" />
      <CapabilityStatusRows measured={measuredWithoutComposite} references={referenceOnlyRows} />
    </div>}

    <div id="jev-bubbles" className="scroll-mt-6">
      <ImageJevV02Charts systems={systems} references={referenceOnlyRows} showCapabilityBars={!classOptions} caps={limits ? { cost: limits.cost, latency: limits.latency } : null} />
    </div>

    <section id="imagejev-v02-composite" className="mt-10 max-w-6xl scroll-mt-6" aria-labelledby="imagejev-v02-composite-heading" data-bh-imagejev-v02-composite>
      <p className="bh-eyebrow">Headline track · CORE · {coreTotal} items</p>
      <h2 id="imagejev-v02-composite-heading" className="mt-1 text-2xl font-semibold">CORE composite score</h2>
      <p className="bh-muted mt-2 text-sm">The secondary ranking includes {systems.length} freshly measured CORE systems on all four axes. A reference row never appears in these bars.</p>
      {repriced.map((row) => <p key={row.key} className="bh-muted mt-2 max-w-5xl text-sm" data-bh-imagejev-v02-api-price-note={row.key}><b className="text-[rgb(var(--text))]">{row.name}</b> is ranked at its developer&apos;s stated API price (USD 0.042 per million input tokens; output, thinking and images free): composite {row.score.toFixed(2)}, #{row.rank}. The striped bar shows the same measurements at the {row.pricing_alternative.basis.split(' — ')[0]} (USD 0.15/M input, USD 1/M output): {row.pricing_alternative.tracks.core.composite.score.toFixed(2)}, would be #{row.pricing_alternative.rank_if_applied}. <a className="text-accent underline" href="#imagejev-v02-pricing">Pricing note ↓</a></p>)}
      <ImageJevV02Legend striped={repriced.length > 0} />
      {systems.length ? <ScoreBars systems={systems} track="core" version="v0.2.0" /> : <p className="bh-panel mt-4 p-4 text-sm" data-bh-imagejev-v02-composite-empty>No v0.2 composite scores are available yet.</p>}
    </section>

    {systems.length >= 2
      ? <ImageJevRadar systems={systems} track="core" />
      : <section className="mt-10 max-w-6xl" aria-labelledby="imagejev-v02-compare-heading" data-bh-imagejev-v02-compare>
        <h2 id="imagejev-v02-compare-heading" className="text-2xl font-semibold">Compare two CORE systems</h2>
        <p className="bh-panel mt-4 p-4 text-sm">The four-axis comparison will appear after at least two CORE systems have measured results.</p>
      </section>}

    <section id="imagejev-v02-ranking" className="mt-10 max-w-6xl scroll-mt-6" aria-labelledby="imagejev-v02-ranking-heading" data-bh-imagejev-v02-ranking>
      <h2 id="imagejev-v02-ranking-heading" className="text-2xl font-semibold">Full CORE ranking</h2>
      <p className="bh-muted mt-2 max-w-5xl text-sm">Ranked by the measured CORE composite. Computer-use and browser-use have separate tables below; they do not add to or alter CORE ranks.</p>
      {systems.length ? <ImageJevV02RankingTable systems={systems} /> : <p className="bh-panel mt-4 p-4 text-sm">No measured CORE rows yet.</p>}
    </section>

    <MeasuredWithoutCompositeRows rows={measuredWithoutComposite} references={allReferences} />
    <ReferenceRows rows={referenceOnlyRows} />

    <section className="mt-10 max-w-6xl" aria-labelledby="imagejev-v02-diagnostics-heading" data-bh-imagejev-v02-diagnostics>
      <h2 id="imagejev-v02-diagnostics-heading" className="text-2xl font-semibold">Computer Use and Browser Use · static screenshot diagnostics</h2>
      <p className="bh-muted mt-2 max-w-5xl text-sm">Each item is one screenshot and one decision. These scores are not workflow or task-completion rates and are not part of the headline.</p>
    <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <article className="min-w-0" aria-labelledby="imagejev-v02-computer-heading" data-bh-imagejev-v02-track="computer-use">
          <h3 id="imagejev-v02-computer-heading" className="text-xl font-semibold">Computer-use · {computerUseTotal} items</h3>
          <p className="bh-muted mt-2 text-xs">Scroll or swipe for every diagnostic column.</p>
          {computerRows.length ? <RankingTable systems={computerRows} track="computer-use" version="v0.2.0" /> : <p className="bh-panel mt-3 p-4 text-sm">No measured Computer-use rows are available yet.</p>}
        </article>
        <article className="min-w-0" aria-labelledby="imagejev-v02-browser-heading" data-bh-imagejev-v02-track="browser-use">
          <h3 id="imagejev-v02-browser-heading" className="text-xl font-semibold">Browser-use · {browserUseTotal} items</h3>
          <p className="bh-muted mt-2 text-xs">Scroll or swipe for every diagnostic column.</p>
          {browserRows.length ? <RankingTable systems={browserRows} track="browser-use" version="v0.2.0" /> : <p className="bh-panel mt-3 p-4 text-sm">No measured Browser-use rows are available yet.</p>}
        </article>
      </div>
    </section>

    <section className="mt-10 max-w-6xl" aria-labelledby="imagejev-v02-method-heading" data-bh-imagejev-v02-method>
      <h2 id="imagejev-v02-method-heading" className="text-2xl font-semibold">Method notes and split</h2>
      <div className="bh-panel mt-4 space-y-3 break-words p-5 text-sm [overflow-wrap:anywhere]">
        <p><b>Headline score.</b> CORE is the sole v0.2 headline ranking. It uses the frozen pool of {coreTotal} decisions ({corePublic} public and {coreSealed} sealed). Computer-use ({computerUseTotal}) and Browser-use ({browserUseTotal}) are static screenshot tracks shown separately.</p>
        <p><b>Intelligence and Calibration.</b> These axes weight the public CORE split at 35% and the sealed CORE split at 65%; the split contains {corePublic} public and {coreSealed} sealed items.</p>
        <p><b>Composite.</b> The four CORE axes use the inherited equal-weight harmonic mean. Intelligence, Speed and Cost each multiply the score by (axis / 50)² when that axis is below 50. The published score uses 25% weight per axis.</p>
        {methodNotes.map((item, index) => <PublicNote key={`m${index}`} item={item} />)}
        {exposureNotes.map((item, index) => <PublicNote key={`e${index}`} item={item} />)}
        {provenanceNotes.map((item, index) => <PublicNote key={`p${index}`} item={item} />)}
        {eligibility && <p data-bh-imagejev-v02-eligibility-method><b>Capability eligibility.</b> {eligibility} The limit itself changes no score; it only decides which systems the Capability Score ranks.</p>}
        {(artifact.pricing_alternatives ?? []).map((alternative: any) => alternative.primary_basis
          ? <p key={alternative.key} id="imagejev-v02-pricing" className="scroll-mt-6" data-bh-imagejev-v02-price-alternative><b>API pricing (1 Oct 2026).</b> API models whose base model we know are ranked at the developer&apos;s stated API price; a striped second bar shows the score and would-be rank at the base-model reference price we use for self-served open weights of the same base. For {systems.find((row) => row.key === alternative.key)?.name ?? alternative.key}, the {alternative.primary_basis.replace(/: /, ' (')}) gives a CORE composite of {alternative.primary_score.toFixed(2)}, the ranked score. The {alternative.basis.replace(/^(.*?) — /, '$1 (').replace(/ \(the price basis/, '; the price basis')} would give {alternative.alternative_score.toFixed(2)} and would be #{alternative.alternative_rank}. {alternative.source} Wity&apos;s tariff was younger than 30 days; the owner waived the 30-day price rule for this row.</p>
          : <p key={alternative.key} data-bh-imagejev-v02-price-alternative><b>{systems.find((row) => row.key === alternative.key)?.name ?? alternative.key} alternative price basis.</b> {alternative.basis} would give a CORE composite of {alternative.alternative_score.toFixed(2)}. The official ranking retains the selected price basis. Source: {alternative.source}.</p>)}
        <p>Sealed item text, images, answers and per-item predictions are not included in this aggregate page.</p>
      </div>
    </section>

    {systems.length ? <ImageJevV02WhatIf systems={systems} /> : <section className="mt-10 max-w-6xl" aria-labelledby="imagejev-v02-whatif-heading" data-bh-imagejev-v02-whatif>
      <h2 id="imagejev-v02-whatif-heading" className="text-2xl font-semibold">Presets and What-If</h2>
      <p className="bh-panel mt-4 p-4 text-sm">Exploratory weight presets will recalculate from measured CORE axes when v0.2 rows are available. No What-If scores are shown while measurement is in progress.</p>
    </section>}

    <section id="imagejev-v02-history" className="mt-10 max-w-6xl scroll-mt-6" aria-labelledby="imagejev-v02-history-heading" data-bh-imagejev-v02-history>
      <h2 id="imagejev-v02-history-heading" className="text-2xl font-semibold">Revision history</h2>
      <ol className="bh-panel mt-4 space-y-3 p-5 text-sm">
        {artifact.presentation_revision && <li data-bh-imagejev-v02-presentation-history><b>v0.2.0 · presentation update, 1 Oct 2026.</b> The JevImageBench Capability Score of eligible systems is the headline; the four-axis composite is secondary. Wity-1 is ranked at its stated API price, with its base-model reference price as a striped bar. Measured outputs, timings, Intelligence and Calibration are unchanged.</li>}
        <li><b>v0.2.0 · new pool.</b> CORE is the headline track; Computer-use and Browser-use are separate. Scores use only v0.2 measurements.</li>
        <li><b>v0.1.5 · previous release, 1 Oct 2026.</b> On the v0.1.4 pool, Wity-1 was re-priced at its stated API tariff and the JevImageBench Capability Score became the headline. Its 50-system ranking remains available in its own archived tab.</li>
        <li><b>v0.1.4 · earlier release.</b> The original 50-system ranking, with its original prices, names and scores, remains available in its own archived tab. Because the image pool changed, neither v0.1.x release is mixed into the v0.2 ranking.</li>
      </ol>
    </section>
    <p className="bh-muted mt-9 max-w-6xl border-t border-line pt-4 text-xs">Image JevBench is separate from the text-only JevBench Score. Sealed item-level content remains private. The v0.2 charts and scores use aggregate results only.</p>
  </section>;
}

export async function ImageJevBenchContent({ requestedVersion }: { requestedVersion?: string }) {
  const selected = requestedVersion === 'v0.2.0' || requestedVersion === 'v0.1.5' || requestedVersion === 'v0.1.4'
    ? requestedVersion
    : await defaultMultimodalPreviewVersion();
  const [live, archivedV014] = await Promise.all([readMultimodalPreview(), readArchivedMultimodalPreviewV014()]);
  const archiveCounts = { v015: live.ranking.length, v014: archivedV014.artifact.ranking.length };
  if (selected !== 'v0.2.0') {
    let versionTabs: VersionTabCounts;
    try {
      const bundle = await readMultimodalPreviewV02PageData();
      versionTabs = { v02Count: bundle.artifact.ranking.length, v02UnrankableCount: bundle.artifact.measured_unrankable_rows?.length ?? 0, v015Count: archiveCounts.v015, v014Count: archiveCounts.v014 };
    } catch {
      versionTabs = { v02Count: 0, v015Count: archiveCounts.v015, v014Count: archiveCounts.v014, unavailable: true };
    }
    return selected === 'v0.1.4' ? <ArchivedV014Content versionTabs={versionTabs} /> : <MultimodalPreviewContent versionTabs={versionTabs} />;
  }
  const bundle = await readMultimodalPreviewV02PageData();
  return <ImageJevV02Page artifact={bundle.artifact} staging={bundle.staging} archiveCounts={archiveCounts} />;
}

export default async function MultimodalPreviewPage() {
  return <MultimodalPreviewContent />;
}
