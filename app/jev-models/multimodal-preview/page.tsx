import type { Metadata } from 'next';
import { readMultimodalPreview } from '../../../lib/jevbench-multimodal-preview.mjs';

export const metadata: Metadata = {
  title: 'PREVIEW — multimodal JevBench',
  description: 'An experimental JevBench track for image reasoning, computer use and browser use. Not part of the JevBench Score.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const one = (v: number | null) => v == null ? '—' : v.toFixed(1);
const money = (v: number | null) => v == null ? 'Not measured' : `USD ${v.toFixed(3)}`;
const skillNames: Record<string, string> = { image_reasoning: 'Image reasoning', computer_use: 'Computer use', browser_use: 'Browser use' };

export default async function MultimodalPreviewPage() {
  const a: any = await readMultimodalPreview();
  return <>
    <div className="mb-6 rounded-xl border-2 border-amber-500 bg-amber-100 px-5 py-4 text-amber-950 shadow-sm dark:bg-amber-950 dark:text-amber-100" role="note" data-bh-mm-preview-banner>
      {/* F-158 (Fable pass 30): the warning sentence is the label; no second "Preview" eyebrow above it. */}
      <p className="text-lg font-bold">Preview — multimodal JevBench, results may change; not part of the JevBench Score</p>
    </div>

    <header className="bh-page-head max-w-5xl">
      <p className="bh-eyebrow">Experimental track · preview 1</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Multimodal JevBench</h1>
      <p className="mt-3 max-w-3xl text-lg">Can a decision system read an image, choose the right interface target, and identify the next browser action?</p>
      <p className="bh-muted mt-2 max-w-4xl">This separate preview measures <b className="text-[rgb(var(--text))]">image reasoning, computer use and browser use</b>. It contains {a.public_real_items} public, source-labelled real items. No held-out item or answer is published here. The eight synthetic checks are flagged and reported separately.</p>
    </header>

    <section className="mt-8 max-w-6xl" aria-labelledby="overall-heading">
      <h2 id="overall-heading" className="text-2xl font-semibold">Overall real-item ranking</h2>
      <p className="bh-muted mt-2 max-w-4xl text-sm">Ranked by correct answers across the 128 public real items. This is a preview accuracy ranking, not the four-axis JevBench Score. Calibration was not measured because these runs returned labels rather than probability distributions.</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[780px] text-left text-sm" data-bh-mm-overall>
          <thead><tr><th className="p-3">#</th><th className="p-3">System</th><th className="p-3 text-right md:w-56">All real</th><th className="p-3 text-right">Intelligence</th><th className="p-3 text-right">Speed</th><th className="p-3 text-right">Cost</th><th className="p-3 text-right">USD / 1,000 image decisions</th></tr></thead>
          <tbody>{a.systems.map((s: any) => <tr key={s.key} className="border-t border-line">
            <td className="p-3 font-bold">{s.rank}</td><th scope="row" className="p-3 font-semibold">{s.display}</th>
            {/* F-159 (Fable pass 30): the share of real items answered correctly is drawn as a bar, so the ranking reads at a glance at every width.
                F-158: Calibration was not measured for any system — the sentence above says so once; a column of "Not measured" is not a column. */}
            <td className="p-3 text-right font-bold tabular-nums" data-bh-mm-real={s.overall.accuracy.toFixed(4)}>
              <span className="whitespace-nowrap">{s.overall.correct}/{s.overall.n} · {pct(s.overall.accuracy)}</span>
              <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--line)/.5)]" aria-hidden="true"><span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(2, s.overall.accuracy * 100)}%` }} /></span>
            </td>
            <td className="p-3 text-right tabular-nums">{one(s.axes.intelligence)}</td>
            <td className="p-3 text-right tabular-nums">{one(s.axes.speed)} <span className="bh-muted">({s.latency_s.toFixed(3)} s)</span></td>
            <td className="p-3 text-right tabular-nums">{one(s.axes.cost)}</td><td className="p-3 text-right tabular-nums" title={s.cost_note}>{money(s.cost_per_1000)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="bh-muted mt-2 text-xs">Intelligence = real-item accuracy × 100. Speed is normalized to the fastest observed median (100 × 0.09 s / median, capped at 100). The cost axis uses the text board&apos;s non-saturating USD 0.001–10 scale only where a cost can be derived. Local costs are marginal occupied H200 time at the measured rental rate; loading and idle time are excluded. Hover a cost for its basis. Missing values are never zero.</p>
    </section>

    <section className="mt-9 max-w-6xl" aria-labelledby="skills-heading">
      <h2 id="skills-heading" className="text-2xl font-semibold">Ranking by skill</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">{Object.entries(skillNames).map(([key, label]) => <article key={key} className="bh-panel p-4">
        <h3 className="font-semibold">{label} <span className="bh-muted font-normal">· {a.counts[key]} items</span></h3>
        <ol className="mt-3 space-y-2">{[...a.systems].sort((x: any, y: any) => x.skills[key].rank - y.skills[key].rank).map((s: any) => <li key={s.key} className="flex items-start justify-between gap-3 border-t border-line pt-2 first:border-0 first:pt-0"><span><b className="mr-2">{s.skills[key].rank}</b>{s.display}</span><span className="whitespace-nowrap tabular-nums">{s.skills[key].correct}/{s.skills[key].n} · <b>{pct(s.skills[key].accuracy)}</b></span></li>)}</ol>
      </article>)}</div>
    </section>

    <section className="mt-9 max-w-5xl" aria-labelledby="eligibility-heading">
      <h2 id="eligibility-heading" className="text-2xl font-semibold">Eligibility</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="bh-panel p-5"><h3 className="font-semibold text-emerald-700 dark:text-emerald-300">Eligible in this run</h3><p className="bh-muted mt-2 text-sm">GPT-5.6 Luna, Gemini 3.1 Flash-Lite, djev-dev BF16, AlexWortega/openjev 4B v2 BF16, Mapika/decider-2b-vision BF16 and kshetrajna12/reflex 4B BF16 accepted image input and completed all 128 real decisions.</p></div>
        <div className="bh-panel p-5"><h3 className="font-semibold">Not eligible — not zero</h3><p className="bh-muted mt-2 text-sm">Text-only Jev and text-only Jev-class configurations cannot receive the image input used by this track. They are excluded, never assigned 0%. An absent row means “not eligible or not tested,” not failure.</p></div>
      </div>
    </section>

    <section className="mt-9 max-w-6xl" aria-labelledby="examples-heading">
      <h2 id="examples-heading" className="text-2xl font-semibold">Public example items</h2>
      <p className="bh-muted mt-2 text-sm">Only public, licensed real examples are shown. The source link and licence travel with every card.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{a.examples.map((e: any) => <article key={e.id} className="overflow-hidden rounded-xl border border-line bg-[rgb(var(--surface))]">
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src={e.image} alt={`Example from ${e.dataset}`} className="h-48 w-full bg-black/5 object-contain" />
        <div className="p-4"><h3 className="font-semibold">{e.dataset}</h3><p className="bh-muted mt-2 line-clamp-4 text-sm">{e.prompt}</p><p className="mt-3 text-xs"><a className="text-accent underline" href={e.source_url}>Source</a> · {e.licence}</p></div>
      </article>)}</div>
    </section>

    <section className="mt-9 max-w-5xl" aria-labelledby="synthetic-heading">
      <h2 id="synthetic-heading" className="text-2xl font-semibold">Synthetic checks — separate, illustrative</h2>
      <p className="bh-muted mt-2 text-sm">Eight accepted generated images ({(a.synthetic.share_of_evaluated * 100).toFixed(1)}% of all evaluated items) test damaged parcels, shelf state, safety hazards, UI errors and product photos. Gold was fixed in each generation spec before inspection, independently checked against the rendered pixels, and ambiguous disagreements were dropped. This family is too small to rank and may favour systems exposed to similar generators.</p>
      <div className="mt-4 flex flex-wrap gap-2">{a.systems.map((s: any) => <span key={s.key} className="rounded-full border border-line px-3 py-1.5 text-sm">{s.display}: <b>{a.synthetic.scores[s.key].correct}/{a.synthetic.scores[s.key].n}</b></span>)}</div>
    </section>

    <details className="bh-panel mt-9 max-w-5xl p-5" open>
      <summary className="cursor-pointer text-lg font-semibold">Methodology and limitations</summary>
      <div className="bh-muted mt-4 space-y-3 text-sm">
        <p><b className="text-[rgb(var(--text))]">Real set.</b> 80 image-reasoning items (20 each from CLEVR-HOPE, Geometry3K, ArxivQA and FinQA), 36 ScreenSpot GUI-grounding items and 12 Multimodal-Mind2Web browser-choice items. Questions and source gold were mechanically wrapped as typed choices; model-authored gold was not used.</p>
        <p><b className="text-[rgb(var(--text))]">What is not measured.</b> These are static screenshots and action choices, not execution in a live desktop or browser. The sources label targets/actions but do not provide auditable post-action completion screenshots, so no “task done?” gold was inferred. Label-only output means calibration is unavailable.</p>
        <p><b className="text-[rgb(var(--text))]">Comparability.</b> Hosted/subscription end-to-end latency is not directly comparable with local H200 inference. Local cost is an occupancy estimate, not a hosted tariff. Public items can be trained on or otherwise encountered, so this preview is contamination-prone. No held-out content is exposed.</p>
        <p><b className="text-[rgb(var(--text))]">Interpretation.</b> The track is small, especially browser use and the synthetic family. Treat differences as leads for a larger run, not definitive model rankings. Results describe the exact tested configurations.</p>
      </div>
    </details>
  </>;
}
