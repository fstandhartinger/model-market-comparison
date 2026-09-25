import type { Metadata } from 'next';
import { formatMatchedGapPp, readMultimodalPreview } from '../../../lib/jevbench-multimodal-preview.mjs';
import { ImageJevExamples } from '../../../components/ImageJevExamples';

export const metadata: Metadata = {
  title: 'PREVIEW — Image JevBench v0.1',
  description: 'A non-indexed candidate preview of Image JevBench v0.1. Not part of the JevBench Score.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const score = (v: number) => Number(v).toFixed(2);
const unitCost = (v: number | null) => v == null ? 'Not measured' : `USD ${v.toFixed(4)}`;
const time = (v: number) => `${v.toFixed(3)} s`;
type Track = 'all' | 'core' | 'everyday_photo';
type FamilyCount = { public: number; sealed: number };

function RankingTable({ systems, track, all = false }: { systems: any[]; track: Track; all?: boolean }) {
  const rows = [...systems].sort((x, y) => y.tracks[track].composite.score - x.tracks[track].composite.score);
  return <div className="mt-4 overflow-x-auto rounded-xl border border-line">
    <table className={`w-full ${all ? 'min-w-[1300px]' : 'min-w-[1080px]'} text-left text-sm`} data-bh-mm-ranking={track} aria-label={`${track === 'all' ? 'Whole-candidate' : track === 'core' ? 'Licensed core' : 'Everyday photo'} ranking`}>
      <thead><tr>
        <th className="sticky left-0 z-[1] w-14 min-w-14 bg-[rgb(var(--surface))] p-3 shadow-[inset_-1px_0_0_rgb(var(--line))]">#</th><th className="sticky left-14 z-[1] w-52 min-w-52 bg-[rgb(var(--surface))] p-3 shadow-[inset_-1px_0_0_rgb(var(--line))]">System</th><th className="p-3 text-right">Composite</th>
        <th className="p-3 text-right">Intelligence</th><th className="p-3 text-right">Calibration</th><th className="p-3 text-right">Speed</th><th className="p-3 text-right">Cost</th>
        {all && <><th className="p-3 text-right">Gap (matched)</th><th className="p-3 text-right">Penalty</th></>}
        <th className="p-3 text-right">Public accuracy</th><th className="p-3 text-right">Sealed accuracy</th><th className="p-3 text-right">USD / 1,000</th>
        <th className="p-3 text-right">Cost coverage</th>{all && <th className="p-3 text-right">p50 / p95</th>}
      </tr></thead>
      <tbody>{rows.map((s, i) => {
        const t = s.tracks[track];
        return <tr key={s.key} className="border-t border-line">
          <td className="sticky left-0 z-[1] w-14 min-w-14 bg-[rgb(var(--surface))] p-3 font-bold tabular-nums shadow-[inset_-1px_0_0_rgb(var(--line))]">{i + 1}</td>
          <th scope="row" className="sticky left-14 z-[1] w-52 min-w-52 bg-[rgb(var(--surface))] p-3 font-semibold shadow-[inset_-1px_0_0_rgb(var(--line))]">
            {s.name}{s.api_flag && <span className="ml-2 inline-block rounded-full border border-accent px-2 py-0.5 text-[0.68rem] font-bold text-accent">API</span>}
          </th>
          <td className="p-3 text-right font-bold tabular-nums">{score(t.composite.score)}</td>
          <td className="p-3 text-right tabular-nums">{score(t.axes.intelligence)}</td>
          <td className="p-3 text-right tabular-nums">{score(t.axes.calibration)}</td>
          <td className="p-3 text-right tabular-nums">{score(t.axes.speed)}</td>
          <td className="p-3 text-right tabular-nums">{score(t.axes.cost)}</td>
          {all && <><td className="p-3 text-right tabular-nums whitespace-nowrap">{formatMatchedGapPp(t.matched_gap_pp)}</td><td className="p-3 text-right tabular-nums">×{t.penalty_multiplier.toFixed(3)}</td></>}
          <td className="p-3 text-right tabular-nums"><span className="whitespace-nowrap">{t.public.correct}/{t.public.n} · {pct(t.public.accuracy)}</span></td>
          <td className="p-3 text-right tabular-nums"><span className="whitespace-nowrap">{t.sealed.correct}/{t.sealed.n} · {pct(t.sealed.accuracy)}</span></td>
          <td className="p-3 text-right tabular-nums">{unitCost(t.cost.usd_per_1000)}</td>
          <td className="p-3 text-right tabular-nums">{pct(t.cost.coverage)}</td>
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
    const color = i === 0 ? 'bg-amber-400' : s.api_flag ? 'bg-pink-400' : 'bg-teal-400';
    return <li key={s.key} className="grid grid-cols-[minmax(0,11rem)_1fr_3.2rem] items-center gap-3 sm:grid-cols-[minmax(0,17rem)_1fr_3.5rem]">
      <span className="truncate text-sm font-semibold" title={s.name}>{i + 1}. {s.name}{s.api_flag && <span className="ml-1 whitespace-nowrap text-[0.68rem] font-bold text-accent">API</span>}</span>
      <span className="h-5 rounded-md bg-black/10 dark:bg-white/10"><span className={`block h-full rounded-md ${color}`} style={{ width: `${Math.max(0.5, v)}%` }} /></span>
      <span className="text-right font-bold tabular-nums">{score(v)}</span>
    </li>;
  })}</ol>;
}

export async function MultimodalPreviewContent({ publicRoute = false }: { publicRoute?: boolean } = {}) {
  const a: any = await readMultimodalPreview();
  const s = a.split;
  const djevSpark = a.ranking.find((x: any) => x.key === 'djev_spark_nvfp4');
  const photoSealed = djevSpark.tracks.everyday_photo.sealed;
  const topFive = a.ranking.slice(0, 5);
  const familyRows = Object.entries(s.family_counts) as [string, FamilyCount][];
  const systemsOverAllowance = a.ranking.filter((row: any) => row.tracks.all.matched_gap_pp > a.gap_allowance_pp).length;
  const reasons = s.public_reason_counts;

  return <>
    {publicRoute ? <p className="bh-muted mb-4 text-xs" data-bh-mm-public-status>v0.1</p> : <div className="mb-6 rounded-xl border-2 border-amber-500 bg-amber-100 px-5 py-4 text-amber-950 shadow-sm dark:bg-amber-950 dark:text-amber-100" role="note" data-bh-mm-preview-banner>
      <p className="text-lg font-bold">Preview — Image JevBench v0.1 candidate; not part of the JevBench Score</p>
      <p className="mt-1 text-sm">Results and the release decision remain under review. This page stays unlinked and excluded from search.</p>
    </div>}

    <header className="bh-page-head max-w-5xl">
      <p className="bh-eyebrow">Experimental image track · candidate v0.1</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Image JevBench v0.1</h1>
      <p className="mt-3 max-w-3xl text-lg">A held-out comparison of systems that make decisions from images, from interface targets to everyday scenes.</p>
      <p className="bh-muted mt-2 max-w-4xl">The frozen candidate has {s.items_total} items: {s.items_public} public and {s.items_sealed} sealed. This page shows aggregate sealed results only. It contains no sealed task, image, answer key, or per-item prediction.</p>
    </header>

    <section className="mt-7 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Candidate size">
      <article className="bh-panel p-4"><p className="bh-eyebrow">Licensed real-source core</p><p className="mt-1 text-2xl font-bold">{s.licensed_core_total} items</p><p className="bh-muted mt-1 text-sm">{s.licensed_core_public} public · {s.licensed_core_sealed} sealed · six below the earlier target</p></article>
      <article className="bh-panel p-4"><p className="bh-eyebrow">Everyday photo decisions</p><p className="mt-1 text-2xl font-bold">{s.everyday_photo_total} items</p><p className="bh-muted mt-1 text-sm">{s.everyday_photo_public} public · {s.everyday_photo_sealed} new sealed · 100% synthetic</p></article>
      <article className="bh-panel p-4"><p className="bh-eyebrow">Public / sealed split</p><p className="mt-1 text-2xl font-bold">{s.items_public} / {s.items_sealed}</p><p className="bh-muted mt-1 text-sm">{s.public_percent.toFixed(1)}% public · {s.sealed_percent.toFixed(1)}% sealed · was {s.previous_split.public} / {s.previous_split.sealed}</p></article>
      <article className="bh-panel p-4"><p className="bh-eyebrow">Synthetic share</p><p className="mt-1 text-2xl font-bold">{s.synthetic_share_percent.toFixed(2)}%</p><p className="bh-muted mt-1 text-sm">{s.synthetic_total}/{s.items_total} overall; the synthetic photo track is labelled separately</p></article>
    </section>

    <section className="mt-10 max-w-6xl" aria-labelledby="split-heading">
      <h2 id="split-heading" className="text-2xl font-semibold">Split</h2>
      <div className="bh-panel mt-4 space-y-3 p-5 text-sm">
        <p><b>Public</b> means an item was already exposed anywhere. That includes all {reasons.mind2web_public_only} Mind2Web-derived items because Kev's training data overlaps Mind2Web; the {reasons.shown_in_promo_videos} promo photos shown in videos; the {reasons.shown_on_wip_page_and_status_video} example cards on this page and in the status video; and {reasons['in_public_repo_2026-09-21_preview']} source rows in the public site repository since the 21 Sep preview. The split also counts {reasons.image_in_public_repo} image asset already present in that repository. Every item that has never been exposed is sealed.</p>
        <p>The goal was one third public, but {s.items_public} of {s.items_total} items were already exposed. Moving any of them into the held-out score would expose public content, so this is the most sealed possible without adding new items and rerunning all {a.n_systems} systems. The audit moved {s.moved_sealed_to_public_exposed} items that had been sealed but were found exposed into public; it moved {s.moved_public_to_sealed_unexposed} items that were public but never shown into sealed.</p>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm" data-bh-mm-family-counts>
            <thead><tr className="border-b border-line"><th scope="col" className="p-3">Family</th><th scope="col" className="p-3 text-right">Public</th><th scope="col" className="p-3 text-right">Sealed</th></tr></thead>
            <tbody>{familyRows.map(([family, counts]) => <tr key={family} className="border-b border-line last:border-0"><th scope="row" className="p-3 font-medium">{family}</th><td className="p-3 text-right tabular-nums">{counts.public}</td><td className="p-3 text-right tabular-nums">{counts.sealed}</td></tr>)}
              <tr className="font-bold"><th scope="row" className="p-3">Total</th><td className="p-3 text-right tabular-nums">{s.items_public}</td><td className="p-3 text-right tabular-nums">{s.items_sealed}</td></tr>
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
      <div className="mt-4 space-y-3 rounded-xl border border-line bg-[rgb(var(--surface))] p-4 text-sm">
        <p><b>Cross-track sealing rule.</b> {a.preview_tracks.cross_track_rule}</p>
        <p><b>Kev / Mind2Web flag.</b> {a.preview_tracks.browser_use.mind2web_public_only} {a.preview_tracks.kev_flag}</p>
      </div>
      <p className="mt-4 rounded-lg border border-amber-600 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 dark:bg-amber-950/40 dark:text-amber-100" role="note" data-bh-mm-unmeasured>Not measured yet — no scores. Scored with the same method once systems have run.</p>
    </section>

    <section className="mt-8 max-w-6xl rounded-xl border border-emerald-800 bg-emerald-950/30 p-5" aria-labelledby="top-five-heading">
      <h2 id="top-five-heading" className="text-xl font-semibold">Current top five by candidate composite</h2>
      <p className="bh-muted mt-1 text-sm">This is the top-five review cut under the frozen method, not a release approval.</p>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{topFive.map((row: any, i: number) => <li key={row.key} className="rounded-lg border border-line bg-[rgb(var(--surface))] p-3">
        <span className="bh-muted text-xs">Rank {i + 1}</span><p className="mt-1 font-semibold">{row.name}{row.api_flag && <span className="ml-2 rounded-full border border-accent px-2 py-0.5 text-[0.68rem] text-accent">API</span>}</p><p className="mt-1 tabular-nums">{score(row.tracks.all.composite.score)}</p>
      </li>)}</ol>
    </section>

    <section className="mt-10" aria-labelledby="bars-heading">
      <h2 id="bars-heading" className="text-2xl font-semibold">Composite score</h2>
      <p className="bh-muted mt-1 text-sm">Whole candidate, {s.items_total} decisions. Bars include all {a.n_systems} systems. Pink bars are hosted APIs; the four axes and Jev-class gates are in the table below.</p>
      <ScoreBars systems={a.ranking} track="all" />
    </section>
    <ImageJevExamples />

    <section className="mt-9 max-w-none" aria-labelledby="overall-heading">
      <h2 id="overall-heading" className="text-2xl font-semibold">Whole-candidate ranking</h2>
      <p className="bh-muted mt-2 max-w-5xl text-sm">Ranked by the candidate composite: equal-weight Intelligence, Calibration, Speed and Cost axes, then the unchanged Jev-class gates. Matched gap is signed public-minus-sealed accuracy within the matched families; the penalty column shows the Intelligence multiplier. {systemsOverAllowance === 0 ? `No system currently exceeds the ${a.gap_allowance_pp} pp allowance.` : `${systemsOverAllowance} systems currently exceed the ${a.gap_allowance_pp} pp allowance.`} Hosted systems are marked API because their providers received sealed images and questions.</p>
      <RankingTable systems={a.ranking} track="all" all />
    </section>

    <section className="mt-10 max-w-6xl" aria-labelledby="track-heading">
      <h2 id="track-heading" className="text-2xl font-semibold">Results by track</h2>
      <p className="bh-muted mt-2 max-w-5xl text-sm">Each track is ranked on its own public and sealed items. The licensed core and synthetic everyday-photo results remain separately visible.</p>
      <article className="mt-6" aria-labelledby="core-heading"><h3 id="core-heading" className="text-xl font-semibold">Licensed real-source core · {s.licensed_core_total} items</h3><p className="bh-muted mt-1 text-sm">{s.licensed_core_public} public · {s.licensed_core_sealed} sealed under the frozen exposure rule.</p><RankingTable systems={a.ranking} track="core" /></article>
      <article className="mt-10" aria-labelledby="photo-heading"><h3 id="photo-heading" className="text-xl font-semibold">Everyday photo decisions · {s.everyday_photo_total} synthetic items</h3><p className="bh-muted mt-1 text-sm">{s.everyday_photo_public} public images from the promo set; {s.everyday_photo_sealed} sealed variants from the reviewed candidate pool. Ambiguous labels were dropped after visual, two-model and gold-blind human checks. There are {s.everyday_photo_situations} matched everyday situations, no brands, and no focused faces.</p><RankingTable systems={a.ranking} track="everyday_photo" /></article>
      <p className="mt-4 rounded-lg border border-line p-4 text-sm" data-bh-djev-spark-sealed-photo><b>djev-spark sealed photo result:</b> {photoSealed.correct}/{photoSealed.n} new sealed decisions · {pct(photoSealed.accuracy)}. It saw the public promo images in an earlier inference-only video run, with no training; this new sealed score is the independent measurement for it.</p>
    </section>

    <section className="mt-10 max-w-6xl" aria-labelledby="method-heading">
      <h2 id="method-heading" className="text-2xl font-semibold">Method and limitations</h2>
      <div className="bh-panel mt-4 space-y-4 p-5 text-sm">
        <p><b>Intelligence.</b> Accuracy counts missing, invalid and unparseable answers as wrong. Each part is chance-corrected against its own average chance rate, then combined as {a.weights.public * 100}% public and {a.weights.sealed * 100}% sealed. Calibration uses the same weights.</p>
        <p><b>Matched-family overfit penalty.</b> The gap is public accuracy minus sealed accuracy within families that have at least 10 items on both sides: ScreenSpot and Everyday photo. If that matched gap is above {a.gap_allowance_pp} percentage points, Intelligence is multiplied by max(0, 1 − (gap − {a.gap_allowance_pp})/100). The same rule applies to every system. The raw overall gap is shown in the data but does not affect the score.</p>
        <p><b>Calibration.</b> Ten-bin top-label ECE is scaled by valid probability coverage. Label-only output receives zero calibration. OpenJev's NLI entailment values select an answer but are not treated as categorical probabilities.</p>
        <p><b>Speed and cost.</b> These rules are unchanged. Speed uses whole-call p50 and p95 latency; local latency uses the v1.4 2× plus 0.15-second adjustment. Hosted unit cost uses returned per-call usage receipts; missing receipts are not zero-filled, and the Cost axis is scaled by receipt coverage. Retry costs are tracked separately. Local cost uses measured GPU seconds at the recorded per-system GPU-hour rate and excludes loading, downloads, build, and idle time.</p>
        <p><b>Composite and gates.</b> These rules are unchanged. The four axes use an equal-weight harmonic mean, followed by the Jev-class Intelligence, Speed, and Cost gates below 50. Gemini 3.8 Flash's high raw accuracy but near-zero composite reflects its measured cost and the Cost gate; label-only systems have zero Calibration under the inherited convention.</p>
        <p><b>Difficulty balance.</b> The split follows exposure, not a stratified draw, so the parts differ in family mix: browser actions (Mind2Web), chart questions (FinQA) and geometry are public-only, while ScreenSpot-Pro and Android-in-the-Wild are almost entirely sealed. This is why the overfit penalty compares only matched families. Within ScreenSpot, the task-length difficulty proxy tiers split 8/24, 7/24 and 5/26 (public/sealed); the photo track keeps all 17 situations on both sides.</p>
        <p><b>Exposure.</b> GPT-6 Luna and Gemini 3.8 Flash previously saw public promo-photo candidates and sealed-photo candidates in stateless label-check calls, including candidates later dropped. The checks showed no gold; human gold-blind adjudication decided inclusion. All API systems received sealed inputs and are flagged. Local systems ran without network, credentials, or gold maps.</p>
      </div>
    </section>
    <p className="bh-muted mt-9 max-w-6xl border-t border-line pt-4 text-xs">Preview only; not part of the JevBench Score. Sealed item-level content remains private. Public/sealed item counts, accuracy, track and score breakdowns are aggregates. Results describe these exact tested configurations and do not establish absence from model training data.</p>
  </>;
}

export default async function MultimodalPreviewPage() {
  return <MultimodalPreviewContent />;
}
