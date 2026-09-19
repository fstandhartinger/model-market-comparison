import type { Metadata } from 'next';
import { readJevbenchV11, jevbenchV11View } from '../../lib/jevbench-v11.mjs';
import { readJevbench, JEVBENCH_REPO } from '../../lib/jevbench.mjs';
import { JevModelsV11Board, CostValue } from '../../components/JevModelsV11';
import { previewMetadata } from '../../lib/seo';

// CR-86 (Florian 2026-09-19 07:35 UTC): JevBench v1.1 — one Main Score from three sub-benchmarks (capability, speed, cost),
// an easy tier and Needle 3. Supersedes CR-84's "no combined winner"; v1.0 stays published at /jev-models/v1.
// Copy: the supervisor's PAGE-COPY-v1.1.md; every number is read from the committed artifact (lib/jevbench-v11.mjs).
export const metadata: Metadata = previewMetadata({ path: '/jev-models', documentTitle: 'Jev-class decision models — JevBench v1.1', title: 'Jev-class models — JevBench v1.1 | Benchmark Heaven',
  description: 'Our own benchmark of typed-decision models: Jev, its open rebuilds, small instruction models and Needle 3 on one Main Score from capability, speed and cost — with the sub-scores and the weights in the open.' });

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const short = (d: string) => d.split(' (')[0];
const one = (v: number | null) => (v === null ? '—' : v.toFixed(1));

export default async function JevModelsPage() {
  const view = jevbenchV11View(await readJevbenchV11());
  const v1 = await readJevbench();
  const [lead] = view.ranked;
  const leadRank = (key: string) => view.ranked.findIndex((r) => r.key === key) + 1;
  const bestOpen = view.ranked.find((r) => r.cls === 'jev-rebuild');
  const jev = view.ranked.find((r) => r.cls === 'jev');
  const prices = view.referencePrices ?? {};
  const estimated = [...view.ranked, ...view.partial].filter((r) => r.costKind === 'estimate');
  const topCap = [...view.ranked].sort((a, b) => (b.capability ?? 0) - (a.capability ?? 0))[0];
  const needle = view.ranked.find((r) => r.cls === 'small-tool-model' && !r.key.endsWith('-tools'));
  const measuredKeys = new Set([...view.ranked, ...view.partial].map((r) => short(r.display).toLowerCase()));
  // Candidates v1.1 now measures (Needle 3) leave the not-measured ledger; the rest still applies to this run.
  const notMeasured = (v1.availability.not_measured as { candidate: string; author: string; reason: string }[]).filter((n) => !measuredKeys.has(n.candidate.toLowerCase()));
  const credits = [...view.ranked, ...view.partial].filter((r) => !r.key.endsWith('-tools')).sort((a, b) => a.display.localeCompare(b.display));
  return <>
    <header className="bh-page-head">
      <p className="bh-eyebrow">JevBench v1.1 · our own benchmark{view.pilot ? ' · pilot' : ''}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Jev-class models</h1>
      <p className="mt-3 max-w-3xl text-lg" data-bh-jev-own>JevBench is <b>Benchmark Heaven&apos;s own benchmark</b> for Jev-class decision models: state and a bounded rubric in, a typed answer out.</p>
      <p className="bh-muted mt-2 max-w-3xl">Version 1.1 measures {view.ranked.length + view.partial.length} systems on {view.decisions} decisions and scores three things — <b className="text-gray-200">Capability</b>, <b className="text-gray-200">Speed</b> and <b className="text-gray-200">Cost</b> — which combine into one <b className="text-gray-200">JevBench Main Composite Score</b> (officially Balanced 33 : 33 : 33 — you can re-weight it below). Built and run by us, not collected from someone else&apos;s leaderboard; the results describe the tested configurations, not every application.</p>
      <p className="bh-muted mt-3 max-w-3xl text-xs leading-relaxed" data-bh-jev-meta>
        Measured {day(view.generated)} · protocol <code>{view.protocol}</code> · {view.tierCounts.easy} easy + {view.tierCounts.standard} standard + {view.tierCounts.judge} judge decisions · one request at a time from a {view.hardwareOrigin || 'server'} in Germany ·{' '}
        <a className="text-accent underline" href={JEVBENCH_REPO}>harness, public tasks &amp; scoring rules (MIT)</a> ·{' '}
        <a className="text-accent underline" href="/api/jevbench/v1.1" data-bh-jev-sha={view.sha256}>results JSON</a> <span className="whitespace-nowrap">sha256 <code title={view.sha256}>{view.sha256.slice(0, 12)}…</code></span> ·{' '}
        <a className="text-accent underline" href="/jev-models/v1" data-bh-jev-v1-link>v1.0 results</a>
      </p>
      {view.revision && <p className="bh-muted mt-2 max-w-3xl text-xs leading-relaxed" data-bh-jev-revision><b className="text-gray-200">Revision {view.revision}.</b> {view.revisionNote}</p>}
    </header>

    <JevModelsV11Board view={view}>
    {lead && <section className="mt-8 max-w-4xl" aria-labelledby="jev11-headline">
      <h2 id="jev11-headline" className="text-xl font-semibold">What the run says (official weights)</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px]" data-bh-jev11-findings>
        <li><b>{lead.display}</b>{lead.cls === 'jev-rebuild' ? <>, one of the open lookalikes of Jev that appeared within days,</> : null} leads with a Main Composite Score of {one(lead.main)}: capability {one(lead.capability)}, {lead.p50?.toFixed(2)} s median, <CostValue r={lead} /> per 1,000 decisions.</li>
        {jev && jev.key !== lead.key && <li><b>{jev.display}</b> is #{leadRank(jev.key)} at {one(jev.main)}, {one((lead.main ?? 0) - (jev.main ?? 0))} points behind: capability {one(jev.capability)} vs {one(lead.capability)}, speed {one(jev.speed)} vs {one(lead.speed)}, cost {one(jev.cost)} vs {one(lead.cost)} (<CostValue r={jev} /> vs <CostValue r={lead} /> per 1,000 decisions{lead.costKind === 'estimate' ? <>; the leader&apos;s cost is <a className="text-accent underline" href="#jev-costs">estimated at hosted-provider prices</a></> : null}).</li>}
        {bestOpen && bestOpen.key !== lead.key && lead.cls === 'jev' && <li>Open lookalikes of Jev appeared within days; the best of them, <b>{bestOpen.display}</b>, is #{leadRank(bestOpen.key)} at {one(bestOpen.main)} with capability {one(bestOpen.capability)} — {one((lead.main ?? 0) - (bestOpen.main ?? 0))} points behind.</li>}
        {topCap && topCap.key !== lead.key && <li><b>{topCap.display}</b> has the highest capability ({one(topCap.capability)}) but places #{leadRank(topCap.key)}: {topCap.p50?.toFixed(2)} s median and <CostValue r={topCap} /> per 1,000 decisions.</li>}
        {needle && <li><b>{short(needle.display)}</b> returns a tool call, not a probability distribution, so it has no calibration score — &ldquo;no calibrated distribution&rdquo;, not zero. It gets {Math.round((needle.tiers.easy ?? 0) * 100)}% of the easy tier right and falls off on the harder tiers: Main Score {one(needle.main)}.</li>}
      </ul>
    </section>}

    </JevModelsV11Board>

    <section id="jev-costs" className="bh-panel mt-8 max-w-4xl scroll-mt-6 p-5 text-sm" aria-labelledby="jev-costs-h" data-bh-jev-costs>
      <h2 id="jev-costs-h" className="text-xl font-semibold">How costs are estimated</h2>
      <p className="bh-muted mt-2">Systems with a public tariff (per token or per request) are priced at that tariff times the tokens we measured. Systems without one — open weights, author demos, models we ran locally — are priced as if a <b className="text-gray-200">large inference provider</b> hosted them: the OpenRouter list price of the same weights; if OpenRouter does not list them, the nearest larger sibling; if no model of that size class is on OpenRouter, the DeepInfra list price of the same weights or of the nearest larger model of the same class. We do not use per-minute GPU rental or our own CPU time — providers buy capacity in bulk or own the hardware, and price accordingly. Price × tokens per decision = $ per 1,000 decisions, marked &ldquo;est.&rdquo;.</p>
      <ul className="mt-3 space-y-1.5" data-bh-jev-cost-rows>
        {estimated.map((r) => <li key={r.key}><b>{short(r.display)}</b> — <CostValue r={r} /> per 1,000: <span className="bh-muted">{r.costBasis.replace(/^ESTIMATE: hosted-provider price, /, '')}</span></li>)}
      </ul>
      {prices.size_classes && <details className="mt-3"><summary className="cursor-pointer text-accent">Reference prices by size class ($ per million input / output tokens)</summary>
        <ul className="bh-muted mt-2 space-y-1" data-bh-jev-cost-classes>
          {Object.entries(prices.size_classes as Record<string, { reference_models: Record<string, number | number[]> }>).map(([k, c]) => <li key={k}><b className="text-gray-200">{k.replace(/_/g, ' ')}</b>: {Object.entries(c.reference_models).map(([m, v]) => `${m} ${Array.isArray(v) ? v.map((x) => `$${x}`).join(' / ') : `$${v}`}`).join('; ')}</li>)}
        </ul>
        <p className="bh-muted mt-2">Sources: {String(prices.token_source ?? '')}.</p></details>}
    </section>

    <section className="mt-10 max-w-4xl space-y-3" aria-labelledby="jev-not-measured">
      <h2 id="jev-not-measured" className="text-xl font-semibold">Who could not be measured, and why</h2>
      <p className="bh-muted text-sm">An exclusion is an availability fact about our run — hardware, access, terms — <b className="text-gray-200">never a quality verdict</b>. Partial runs are in the table above, greyed and unranked.</p>
      <ul className="space-y-2 text-sm" data-bh-jev-availability>
        {notMeasured.map((n, i) => <li key={`${n.candidate}-${i}`} className="bh-panel p-3" data-bh-jev-availability-row={n.candidate}><b>{n.candidate}</b> <span className="bh-muted">({n.author})</span> — <span className="bh-muted">{n.reason.replace(/`/g, '')}</span></li>)}
      </ul>
    </section>

    <details id="method" className="bh-panel mt-8 max-w-4xl scroll-mt-6 p-5">
      <summary className="cursor-pointer text-sm font-semibold">Method and tiers</summary>
      <div className="bh-muted mt-4 space-y-3 text-sm">
        <p>{view.scoring.main}</p>
        <ul className="list-disc space-y-1.5 pl-5">{(['easy', 'standard', 'judge'] as const).map((t) => <li key={t}><b className="text-gray-200">{t}</b>: {view.tierNotes[t]}</li>)}</ul>
        <p>Every system sees the same state, instructions, rubric and exact label set; only the transport differs. Requests go out one at a time with no retries, so latency includes the network. Estimated costs are hosted-provider prices for the same weights or size class and are marked &ldquo;est.&rdquo; — hover one for its basis, or see <a className="text-accent underline" href="#jev-costs">how costs are estimated</a>; a route with neither a tariff nor a price we could state honestly shows &ldquo;no tariff&rdquo;, never $0.</p>
        <p>{view.notComparableWith} The v1.0 page keeps its own numbers, calibration plots and per-family tables.</p>
      </div>
    </details>

    <details id="limits" className="bh-panel mt-3 max-w-4xl scroll-mt-6 p-5">
      <summary className="cursor-pointer text-sm font-semibold">Limits</summary>
      <ul className="bh-muted mt-4 list-disc space-y-2 pl-5 text-sm">
        <li>{view.decisions} decisions is a pilot, not a census, and it is English-only.</li>
        <li>The weights are a choice. The Main Score weights Capability, Speed and Cost equally; if a wrong decision costs you more than a slow or expensive one, pick &ldquo;Emphasis on Accuracy&rdquo; above — the sensitivity table shows what other weightings would do.</li>
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
