import { JevArchitectureMethod, JevArchitectureBadge } from '../../../components/JevArchitecture';
import { imageJevBoardSystems, imageJevBoardRows, imageJevCompareRows, imageJevCapabilityLimits, imageJevSliderPresets, imageJevClassFor } from '../../../lib/imagejev-board.mjs';
import { JEV_TYPE_LABEL, jevTypeVarName } from '../../../components/jevTypes';
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
import { formatMatchedGapPp, readMultimodalPreview } from '../../../lib/jevbench-multimodal-preview.mjs';
import { ImageJevExamples } from '../../../components/ImageJevExamples';
import { BaseModelDisplay } from '../../../components/BaseModelDisplay';
import { imageJevSystemPath as imageSystemPath, imageJevSourceUrl } from '../../../lib/imagejev-system-links.mjs';

// CR-254 (2026-10-01): each ImageJevBench system gets its own detail page under /image-jev-bench/<key>.
// Image keys are already URL-safe (lowercase, digits and underscores); encode defensively anyway.

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
type Track = 'all' | 'core' | 'everyday_photo';
type FamilyCount = { public: number; sealed: number; retired: number };

// F-198 (pass 36): a gated row says so. A row whose composite is below 1 because a gate factor is below 0.5
// gets a muted sub-line naming the gate — in the bars and in the table's System cell.
type GateInfo = { gate: string; line: string } | null;
function gateOf(t: any, row: any): GateInfo {
  if (t.composite.score >= 1) return null;
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

function RankingTable({ systems, track, all = false }: { systems: any[]; track: Track; all?: boolean }) {
  const rows = [...systems].sort((x, y) => y.tracks[track].composite.score - x.tracks[track].composite.score);
  return <div className="mt-4 overflow-x-auto rounded-xl border border-line">
    <table className={`w-full ${all ? 'min-w-[1240px]' : 'min-w-[1080px]'} text-left text-sm`} data-bh-mm-ranking={track} aria-label={`${track === 'all' ? 'Full benchmark' : track === 'core' ? 'Licensed core' : 'Everyday photo'} ranking`}>
      <thead><tr>
        <th className="sticky left-0 z-[1] w-14 min-w-14 bg-[var(--surface)] p-3 shadow-[inset_-1px_0_0_rgb(var(--line))]">#</th><th className="sticky left-14 z-[1] w-52 min-w-52 bg-[var(--surface)] p-3 shadow-[inset_-1px_0_0_rgb(var(--line))]">System</th><th className="p-3 text-right">Composite</th>
        <th className="p-3 text-right">Intelligence</th><th className="p-3 text-right">Calibration</th><th className="p-3 text-right">Speed</th><th className="p-3 text-right">Cost</th>
        {all && <><th className="p-3 text-right">Gap (matched)</th><th className="p-3 text-right">Earlier split</th></>}
        <th className="p-3 text-right">Public accuracy</th><th className="p-3 text-right">Sealed accuracy</th><th className="p-3 text-right">USD / 1,000</th>
        {all && <th className="p-3 text-right">p50 / p95</th>}
      </tr></thead>
      <tbody>{rows.map((s, i) => {
        const t = s.tracks[track];
        const gate = gateOf(t, s);
        // F-198 (pass 36): "Cost coverage" is no longer a column — rows under 100% receipt coverage fold it into the
        // System cell. The "Penalty" column is gone (×1.000 on every row; the intro keeps the allowance sentence).
        return <tr key={s.key} id={all ? `imagejev-system-${s.key}` : undefined} className="scroll-mt-6 border-t border-line">
          <td className="sticky left-0 z-[1] w-14 min-w-14 bg-[var(--surface)] p-3 font-bold tabular-nums shadow-[inset_-1px_0_0_rgb(var(--line))]">{i + 1}</td>
          <th scope="row" className="sticky left-14 z-[1] w-52 min-w-52 bg-[var(--surface)] p-3 text-left font-semibold shadow-[inset_-1px_0_0_rgb(var(--line))]">
            {imageJevSourceUrl(s.key, s.repo)
              ? <a href={imageJevSourceUrl(s.key, s.repo)!} target="_blank" rel="noopener noreferrer" className="underline" data-bh-jev-source={s.key}><SystemName name={s.name} gate={gate} /></a>
              : <SystemName name={s.name} gate={gate} />}
            {s.key === 'wity_1' && <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300" data-bh-mm-author-review>Under author review: server build ID was not recorded; this score may change after verification.</p>}
            {s.inference_setting && <p className="bh-muted mt-1 text-xs">Setting: {s.inference_setting}</p>}
            {t.cost.coverage < 0.9995 && <p className="bh-muted mt-1 text-xs">Cost receipts cover {pct(t.cost.coverage)} of calls</p>}
            {s.api_flag && <span className="mt-1 inline-block rounded-full border border-accent px-2 py-0.5 text-[0.68rem] font-bold text-accent">API</span>}
            <JevArchitectureBadge row={s} benchmark="imagejevbench" />
        <BaseModelDisplay benchmark="imagejevbench" systemKey={s.key} className="mt-1 block text-[11px] font-normal leading-tight" />
            <Link href={imageSystemPath(s.key)} className="mt-0.5 inline-block text-[11px] font-normal text-accent underline decoration-[rgb(var(--line))] underline-offset-2 hover:decoration-current" data-bh-mm-system-details={s.key}>details</Link>
          </th>
          <td className="p-3 text-right font-bold tabular-nums">{score(t.composite.score)}</td>
          <td className="p-3 text-right tabular-nums">{score(t.axes.intelligence)}</td>
          <td className="p-3 text-right tabular-nums">{score(t.axes.calibration)}</td>
          <td className="p-3 text-right tabular-nums">{score(t.axes.speed)}</td>
          <td className="p-3 text-right tabular-nums">{score(t.axes.cost)}</td>
          {all && <><td className="p-3 text-right tabular-nums whitespace-nowrap">{formatMatchedGapPp(t.matched_gap_pp)}</td><td className="p-3 text-right tabular-nums whitespace-nowrap">{s.previous_rank != null ? `#${s.previous_rank} · ${score(s.previous_score)}` : '—'}</td></>}
          <td className="p-3 text-right tabular-nums"><span className="whitespace-nowrap">{t.public.correct}/{t.public.n} · {pct(t.public.accuracy)}</span></td>
          <td className="p-3 text-right tabular-nums"><span className="whitespace-nowrap">{t.sealed.correct}/{t.sealed.n} · {pct(t.sealed.accuracy)}</span></td>
          <td className="p-3 text-right tabular-nums">{unitCost(t.cost.usd_per_1000)}</td>
          {all && <td className="p-3 text-right tabular-nums whitespace-nowrap">{time(t.speed.raw_p50_s)} / {time(t.speed.raw_p95_s)}</td>}
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

function ScoreBars({ systems, track }: { systems: any[]; track: Track }) {
  const rows = [...systems].sort((x, y) => y.tracks[track].composite.score - x.tracks[track].composite.score);
  return <ol className="mt-4 grid gap-2" data-bh-mm-bars={track}>{rows.map((s, i) => {
    const v = s.tracks[track].composite.score;
    const gate = gateOf(s.tracks[track], s);
    // CR-290: the same base-model-family colours as the capability bars and bubbles.
    const cls = imageJevClassFor(s);
    return <li key={s.key} className="grid grid-cols-[minmax(0,11rem)_1fr_3.2rem] items-center gap-3 sm:grid-cols-[minmax(0,17rem)_1fr_3.5rem]">
      <span className="min-w-0 break-words text-sm font-semibold leading-tight" title={s.name}>
        {i + 1}. {imageJevSourceUrl(s.key, s.repo)
          ? <a href={imageJevSourceUrl(s.key, s.repo)!} target="_blank" rel="noopener noreferrer" className="underline" data-bh-jev-source={s.key}><SystemName name={s.name} gate={gate} /></a>
          : <Link href={imageSystemPath(s.key)}><SystemName name={s.name} gate={gate} /></Link>}
        {s.api_flag && <span className="ml-1 whitespace-nowrap text-[0.68rem] font-bold text-accent">API</span>}
        <JevArchitectureBadge row={s} benchmark="imagejevbench" />
            <BaseModelDisplay benchmark="imagejevbench" systemKey={s.key} className="mt-1 block text-[11px] font-normal leading-tight" />
        {imageJevSourceUrl(s.key, s.repo) && <Link href={imageSystemPath(s.key)} className="text-[11px] font-normal text-accent underline">details</Link>}
      </span>
      <span className="h-5 rounded-md bg-black/10 dark:bg-white/10"><span className="block h-full rounded-md" title={JEV_TYPE_LABEL[cls] ?? cls} style={{ width: `${Math.max(0.5, v)}%`, backgroundColor: `rgb(var(${jevTypeVarName(cls)}))` }} data-bh-mm-bar-class={cls} /></span>
      <span className="text-right font-bold tabular-nums">{score(v)}</span>
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

export async function MultimodalPreviewContent() {
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
  const eligibility = <>Jev itself cannot read images, so there is no Jev row to anchor on. We use the same absolute budget as JevBench: at most {limits.factor}× Jev 1.13.0&apos;s JevBench v1.5.4 cost (≤ USD {limits.cost.toFixed(4)} per 1,000 decisions) and at most {limits.factor}× its median latency (≤ {limits.latency.toFixed(2)} s, adjusted p50), frozen in this release. A decision model in this class should fit the same budget whether the input is text or an image. {qualifying} of {chartSystems.length} systems qualify, a larger share than on JevBench, so we keep {limits.factor}×. Loosening to 3× would add {addedAtThree} open-weight fine-tunes that sit just above the cost line; the general-purpose hosted LLMs stay outside even at 3×.</>;

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
    <p className="bh-muted mt-2 max-w-5xl text-sm" data-bh-mm-wity-pricing-note>Wity-1 is ranked at Wity&apos;s own stated API price (USD 0.042 per million input tokens, output free). The striped bar shows the score at the base-model reference price we use for self-hosted open weights of the same base (base model undisclosed at the author&apos;s request). <a className="text-accent underline" href="#imagejev-pricing">See pricing note ↓</a></p>
    <JevCompareV15 rows={compareRows} openDecisions={s.items_public} sealedDecisions={s.items_sealed} axesOnly categories={imageJevCategoryView(a.revision, compareRows.map((r: { key: string }) => r.key))} />

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
      <JevArchitectureMethod />
      <div className="bh-panel mt-4 space-y-4 p-5 text-sm">
        <p><b>Intelligence.</b> Accuracy counts missing, invalid and unparseable answers as wrong. Each part is chance-corrected against its own average chance rate, then combined as {a.weights.public * 100}% public and {a.weights.sealed * 100}% sealed. Calibration uses the same weights.</p>
        <p><b>Matched-family overfit penalty.</b> The gap is public accuracy minus sealed accuracy within families that have at least 10 items on both sides: ScreenSpot and Everyday photo. If that matched gap is above {a.gap_allowance_pp} percentage points, Intelligence is multiplied by max(0, 1 − (gap − {a.gap_allowance_pp})/100). The same rule applies to every system. The raw overall gap is shown in the data but does not affect the score.</p>
        <p><b>Calibration.</b> Ten-bin top-label ECE is scaled by valid probability coverage. Label-only output receives zero calibration. OpenJev's NLI entailment values select an answer but are not treated as categorical probabilities.</p>
        <p><b>Speed and cost.</b> Speed uses whole-call p50 and p95 latency; local latency uses the v1.4 2× plus 0.15-second adjustment. Hosted unit cost uses returned per-call usage receipts; missing receipts are not zero-filled, and the Cost axis is scaled by receipt coverage. Retry costs are tracked separately. Local cost uses measured GPU seconds at the recorded per-system GPU-hour rate and excludes loading, downloads, build, and idle time. For self-hosted systems, the original run&apos;s timings are combined with the fresh-item run on the same GPU type.</p>
        <p><b>Capability eligibility.</b> {eligibility}</p>
        <p id="imagejev-pricing" className="scroll-mt-6" data-bh-mm-pricing-method><b>API pricing (1 Oct 2026).</b> API models whose base model we know are ranked at the developer&apos;s stated API price. A striped second bar shows the score and would-be rank at the base-model reference price we use for self-served open weights of the same base. Wity-1 uses USD 0.042 per million input tokens, with output free, on its measured 120,542 input and zero output tokens. Its base model is undisclosed at the author&apos;s request; the striped bar applies the matching base-model reference price. The API does not quantify image or thinking work, so token pricing may understate full image-compute cost. <a className="text-accent underline" href="https://github.com/fstandhartinger/model-market-comparison/blob/main/data/raw/benchmarks/jevbench/multimodal-preview/PRICING-v0.1.5.md" target="_blank" rel="noopener noreferrer">Pricing provenance</a>.</p>
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

export default async function MultimodalPreviewPage() {
  return <MultimodalPreviewContent />;
}
