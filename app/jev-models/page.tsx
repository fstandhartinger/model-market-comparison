import type { Metadata } from 'next';
import { readJevbenchV12, jevbenchV12View } from '../../lib/jevbench-v12.mjs';
import { readJevbenchV11, jevbenchV11View } from '../../lib/jevbench-v11.mjs';
import { readJevbench, JEVBENCH_REPO } from '../../lib/jevbench.mjs';
import { JevModelsV12Board, CostValue } from '../../components/JevModelsV12';
import { JevCostsDisclosure } from '../../components/JevCostsDisclosure';
import { previewMetadata } from '../../lib/seo';

// CR-92 (Florian 2026-09-19 ~13:20 UTC): JevBench v1.2 final — the JevBench Score (Intelligence, Calibration, Speed, Cost,
// 25 % each, geometric mean) is the default; the earlier weightings stay as presets. CR-88's WIP banner and noindex are gone and the
// page is back in the menu and sitemap (Florian approved the result). Every number is read from the committed v1.2 artifact
// (lib/jevbench-v12.mjs recomputes each one); v1.0 stays published at /jev-models/v1.
export const metadata: Metadata = previewMetadata({ path: '/jev-models', documentTitle: 'Jev-class decision models — JevBench v1.2', title: 'Jev-class models — JevBench v1.2 | Benchmark Heaven',
  description: 'Our own benchmark of typed-decision models: Jev, its open rebuilds and instruction models on the JevBench Score — Intelligence, Calibration, Speed and Cost, 25 % each, geometric mean.' });

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const short = (d: string) => d.split(' (')[0].split(', formerly')[0];
const one = (v: number | null) => (v === null ? '—' : v.toFixed(1));
// Gaps are the difference of the scores as displayed (one decimal), so a reader can check them by eye.
const gap = (a: number, b: number) => (Math.round(a * 10) - Math.round(b * 10)) / 10;

export default async function JevModelsPage() {
  const view = jevbenchV12View(await readJevbenchV12());
  const v11 = jevbenchV11View(await readJevbenchV11());
  const v1 = await readJevbench();
  const [lead] = view.ranked;
  const rankOf = (key: string) => view.ranked.findIndex((r) => r.key === key) + 1;
  const bestOpen = view.ranked.find((r) => r.cls === 'jev-rebuild');
  const jev = view.ranked.find((r) => r.cls === 'jev');
  const prices = v11.referencePrices ?? {};
  const all = [...view.ranked, ...view.partial];
  const estimated = all.filter((r) => r.costKind === 'estimate');
  const topInt = [...view.ranked].sort((a, b) => (b.axes.intelligence ?? 0) - (a.axes.intelligence ?? 0))[0];
  const measuredKeys = new Set(all.map((r) => short(r.display).toLowerCase()));
  const notMeasured = (v1.availability.not_measured as { candidate: string; author: string; reason: string }[]).filter((n) => !measuredKeys.has(n.candidate.toLowerCase()));
  const credits = all.filter((r) => !r.key.endsWith('-tools')).sort((a, b) => a.display.localeCompare(b.display));
  return <>
    <header className="bh-page-head">
      <p className="bh-eyebrow">JevBench v1.2 · our own benchmark</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Jev-class models</h1>
      <p className="mt-3 max-w-3xl text-lg" data-bh-jev-own>JevBench is <b>Benchmark Heaven&apos;s own benchmark</b> for Jev-class decision models: state and a bounded rubric in, a typed answer out.</p>
      <p className="bh-muted mt-2 max-w-3xl">Version 1.2 measures {all.length} systems on {view.decisions} decisions, including {view.tierCounts.hard} hard ones, and ranks them by the <b className="text-gray-200">JevBench Score</b>. Built and run by us, not collected from someone else&apos;s leaderboard; the results describe the tested configurations, not every application.</p>
      <p className="bh-muted mt-3 max-w-3xl text-xs leading-relaxed" data-bh-jev-meta>
        Scored {day(view.generated)} · protocol <code>{view.protocol}</code> · {view.tierCounts.easy} easy + {view.tierCounts.standard} standard + {view.tierCounts.judge} judge + {view.tierCounts.hard} hard decisions · one request at a time from a server in Germany ·{' '}
        <a className="text-accent underline" href={JEVBENCH_REPO}>harness, public tasks &amp; scoring rules (MIT)</a> ·{' '}
        <a className="text-accent underline" href="/api/jevbench/v1.2" data-bh-jev-sha={view.sha256}>results JSON</a> <span className="whitespace-nowrap">sha256 <code title={view.sha256}>{view.sha256.slice(0, 12)}…</code></span> ·{' '}
        <a className="text-accent underline" href="/jev-models/v1" data-bh-jev-v1-link>v1.0 results</a>
      </p>
    </header>

    <JevModelsV12Board view={view}>
    {lead && <section className="mt-8 max-w-4xl" aria-labelledby="jev12-headline">
      <h2 id="jev12-headline" className="text-xl font-semibold">What the run says (JevBench Score)</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px]" data-bh-jev12-findings>
        <li><b>{lead.display}</b> leads with {one(lead.main)}: Intelligence {one(lead.axes.intelligence)}, Calibration {one(lead.axes.calibration)}, Speed {one(lead.axes.speed)}, Cost {one(lead.axes.cost)} (<CostValue r={lead} /> per 1,000 decisions).</li>
        {jev && jev.key !== lead.key && <li><b>{jev.display}</b> is #{rankOf(jev.key)} at {one(jev.main)}, {one(gap(lead.main, jev.main))} points behind.</li>}
        {bestOpen && bestOpen.key !== lead.key && <li>Open rebuilds of Jev appeared within days. The best of them, <b>{bestOpen.display}</b>, is #{rankOf(bestOpen.key)} at {one(bestOpen.main)} — <span data-bh-jev12-gap>{one(gap(lead.main, bestOpen.main))} points behind</span>: more speed and a lower (estimated) price, less intelligence and calibration.</li>}
        {topInt && topInt.key !== lead.key && <li><b>{topInt.display}</b> has the highest Intelligence ({one(topInt.axes.intelligence)}) but places #{rankOf(topInt.key)}: its cost score is {one(topInt.axes.cost)} (<CostValue r={topInt} /> per 1,000 decisions), and the geometric mean does not let accuracy buy that back.</li>}
        {view.partial.length > 0 && <li>{view.partial.map((r) => short(r.display)).join(', ')} did not finish every tier in time; they are shown below the ranking as partial runs, without a rank.</li>}
      </ul>
    </section>}
    </JevModelsV12Board>

    <section className="mt-8 max-w-4xl text-sm" data-bh-jev-costs>
      <p className="bh-muted mb-2">Systems with a public tariff use that tariff and measured tokens. For systems without one, we use a clearly marked estimate based on a large inference provider&apos;s list price for the same weights or size class.</p>
      <JevCostsDisclosure>
        <p className="bh-muted mt-2">Systems with a public tariff (per token or per request) are priced at that tariff times the tokens we measured. Systems without one — open weights, author demos, models we ran locally — are priced as if a <b className="text-gray-200">large inference provider</b> hosted them: the OpenRouter list price of the same weights; if OpenRouter does not list them, the nearest larger sibling; if no model of that size class is on OpenRouter, the DeepInfra list price of the same weights or of the nearest larger model of the same class. We do not use per-minute GPU rental or our own CPU time — providers buy capacity in bulk or own the hardware, and price accordingly. Price × tokens per decision = $ per 1,000 decisions, marked &ldquo;est.&rdquo;.</p>
        <ul className="mt-3 space-y-1.5" data-bh-jev-cost-rows>
          {estimated.map((r) => <li key={r.key}><b>{short(r.display)}</b> — <CostValue r={r} /> per 1,000: <span className="bh-muted">{r.costBasis.replace(/^ESTIMATE: (hosted-provider price, )?/, '')}</span></li>)}
        </ul>
        {prices.size_classes && <details className="mt-3"><summary className="cursor-pointer text-accent">Reference prices by size class ($ per million input / output tokens)</summary>
          <ul className="bh-muted mt-2 space-y-1" data-bh-jev-cost-classes>
            {Object.entries(prices.size_classes as Record<string, { reference_models: Record<string, number | number[]> }>).map(([k, c]) => <li key={k}><b className="text-gray-200">{k.replace(/_/g, ' ')}</b>: {Object.entries(c.reference_models).map(([m, v]) => `${m} ${Array.isArray(v) ? v.map((x) => `$${x}`).join(' / ') : `$${v}`}`).join('; ')}</li>)}
          </ul>
          <p className="bh-muted mt-2">Sources: {String(prices.token_source ?? '')}.</p></details>}
      </JevCostsDisclosure>
    </section>

    <section className="mt-10 max-w-4xl space-y-3" aria-labelledby="jev-not-measured">
      <h2 id="jev-not-measured" className="text-xl font-semibold">Who could not be measured, and why</h2>
      <p className="bh-muted text-sm">An exclusion is an availability fact about our run — hardware, access, terms — <b className="text-gray-200">never a quality verdict</b>. Partial runs are in the table above, greyed and without a rank.</p>
      <ul className="space-y-2 text-sm" data-bh-jev-availability>
        {notMeasured.map((n, i) => <li key={`${n.candidate}-${i}`} className="bh-panel p-3" data-bh-jev-availability-row={n.candidate}><b>{n.candidate}</b> <span className="bh-muted">({n.author})</span> — <span className="bh-muted">{n.reason.replace(/`/g, '')}</span></li>)}
      </ul>
    </section>

    <details id="method" className="bh-panel mt-8 max-w-4xl scroll-mt-6 p-5">
      <summary className="cursor-pointer text-sm font-semibold">Method and tiers</summary>
      <div className="bh-muted mt-4 space-y-3 text-sm">
        <p>{view.scoring.jevbench_score}</p>
        <p data-bh-jev-revision><b className="text-gray-200">Revision {view.revision}.</b> {view.revisionNote}</p>
        <ul className="list-disc space-y-1.5 pl-5">{(['easy', 'standard', 'judge'] as const).map((t) => <li key={t}><b className="text-gray-200">{t}</b>: {v11.tierNotes[t]}</li>)}
          <li><b className="text-gray-200">hard</b>: {view.scoring.hard_tier}</li></ul>
        <p>Every system sees the same state, instructions, rubric and exact label set; only the transport differs. Requests go out one at a time with no retries, so latency includes the network. Estimated costs are hosted-provider prices for the same weights or size class and are marked &ldquo;est.&rdquo; — hover one for its basis, or see <a className="text-accent underline" href="#jev-costs">how costs are estimated</a>. Every system has a price; none gets a free 100.</p>
        <p>v1.2 numbers are not comparable with v1.1 or v1.0 (different tiers and scoring). The v1.0 page keeps its own numbers, calibration plots and per-family tables.</p>
      </div>
    </details>

    <details id="limits" className="bh-panel mt-3 max-w-4xl scroll-mt-6 p-5">
      <summary className="cursor-pointer text-sm font-semibold">Limits</summary>
      <ul className="bh-muted mt-4 list-disc space-y-2 pl-5 text-sm">
        <li>{view.decisions} decisions is a pilot, not a census, and it is English-only.</li>
        <li>The weights are a choice. The JevBench Score weights the four axes equally and multiplies rather than adds them; if a wrong decision costs you more than a slow or expensive one, pick &ldquo;Emphasis on Accuracy&rdquo; above — the table of views shows what other weightings would do.</li>
        <li>The latency adjustment for self-hosted and demo endpoints (×2, +0.15 s on our own servers) is an assumption about production load, not a measurement. Raw latencies are in the table and the repo.</li>
        <li>Held-out decisions are sent to the evaluated services to get predictions. Not public is not the same as not seen.</li>
        <li>Latency is one origin at one time of day; hosted endpoints, public demos and a local CPU are different kinds of latency. Public demo endpoints are shared with everyone else using them.</li>
        <li>Estimated costs describe what a large inference provider would charge for a model of that size, not what the author pays; a system on a tariff pays its tariff.</li>
      </ul>
    </details>

    <details id="credit" className="bh-panel mt-3 max-w-4xl scroll-mt-6 p-5">
      <summary className="cursor-pointer text-sm font-semibold">Credit</summary>
      <div className="bh-muted mt-4 space-y-3 text-sm">
        <p>Harness, public tasks and every scoring rule: <a className="text-accent underline" href={JEVBENCH_REPO}>github.com/fstandhartinger/jevbench</a> (MIT). Each project links its author&apos;s repository or vendor page.</p>
        <ul className="list-disc space-y-1.5 pl-5" data-bh-jev-credits>
          {credits.map((r) => <li key={r.key}><b className="text-gray-200">{r.display}</b> — {r.author}, {r.licence}{r.link && <> — <a className="text-accent underline" href={r.link} target="_blank" rel="noopener noreferrer">{r.link.replace(/^https:\/\//, '')}</a></>}</li>)}
        </ul>
        <p>Authors: if we tested the wrong configuration, tell us and we will rerun it. New entrants become a new version rather than silently changing this one.</p>
      </div>
    </details>
  </>;
}
