import type { Metadata } from 'next';
import { readJevbenchV12, jevbenchV12View } from '../../lib/jevbench-v12.mjs';
import { readJevbenchV11, jevbenchV11View } from '../../lib/jevbench-v11.mjs';
import { JEVBENCH_REPO } from '../../lib/jevbench.mjs';
import { JevModelsV12Board, CostValue, CostUnitNote } from '../../components/JevModelsV12';
import { JevCostsDisclosure } from '../../components/JevCostsDisclosure';
import { JevRadars } from '../../components/JevRadars';
import { readJevbenchV12Topics, jevbenchV12TopicsView } from '../../lib/jevbench-v12-topics.mjs';
import { readJevbenchV12Tasks, jevbenchV12TasksView } from '../../lib/jevbench-v12-tasks.mjs';
import { previewMetadata } from '../../lib/seo';
import { CustomEvaluationOffer } from '../../components/CustomEvaluationOffer';

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
const jevCostExample = (view: ReturnType<typeof jevbenchV12View>) => {
  const example = view.costUnit.worked_example;
  const tokens = example.match(/reads\s+(\d+(?:\.\d+)?)\s+input tokens/)?.[1];
  const tariff = example.match(/tariff of \$(\d+(?:\.\d+)?) per MILLION input tokens/)?.[1];
  const cost = example.match(/=\s*\$(\d+(?:\.\d+)?)/)?.[1];
  if (!tokens || !tariff || !cost) throw new Error('JevBench cost artifact is missing the worked-example values');
  return { tokens: Math.round(Number(tokens)), tariff, cost };
};

// CR-105 (2026-09-20): availability was re-audited against the public repos/weights and a RunPod GPU attempt.
// Keep this current list separate from the historical v1 capture: several candidates in that file are now measured.
const currentNotMeasured = [
  { candidate: 'open-jev', author: 'Dasein Labs', reason: 'MLX on Apple Silicon only. Its own README says Linux containers cannot reach the Apple GPU, so a RunPod NVIDIA GPU cannot run it.' },
  { candidate: 'open-jev', author: 'JoshuaSP', reason: 'A DiffusionGemma 26B-A4B serving wrapper rather than new trained weights. It was demonstrated on an H100; no public endpoint exists and no suitable 80 GB RunPod host was available in this round.' },
  { candidate: 'mini-jev', author: 'Mikhail Rakutko (r-ms)', reason: 'Public weights exist and fit a normal GPU, but the implementation covers Choice/Noul and explicitly does not measure Score. A faithful full-suite adapter would require new interface work rather than a mechanical endpoint adapter.' },
  { candidate: 'system-one-gemma', author: 'Akash Kamat', reason: 'The adapter is public, but its Gemma base is gated behind Google’s licence terms. We do not accept binding terms on Florian’s behalf.' },
  { candidate: 'jevlike', author: 'Vincent Wang-Maścianica', reason: 'Only Doom and chess vision checkpoints are released; there is no general text-decision checkpoint for this suite.' },
  { candidate: 'AlexWortega/openjev', author: 'Alex Wortega', reason: 'Its released NLI and task-specific heads do not define a distribution over an arbitrary supplied label set. Inventing that mapping would measure our assumption.' },
  { candidate: 'Needle 3', author: 'Cactus Compute', reason: 'Its native response is a chosen label plus one accept/refuse confidence, not a categorical distribution over the supplied labels. The options-as-tools adaptation remains published as a partial run.' },
  { candidate: 'Succinct Router 14M', author: 'Pedro Marques', reason: 'A router over three fixed GPT settings, not a general typed-decision model.' },
  { candidate: 'jev-model-router, Director, Loki', author: 'various', reason: 'Applications built on decision models, not decision models themselves.' },
  { candidate: 'ProgramAsWeights', author: 'ProgramAsWeights', reason: 'The compiler still requires GitHub authentication and the available path would expose held-out rubrics to a third party. No public weights or anonymous endpoint are available.' },
  { candidate: 'EigenJev', author: 'EigenJev', reason: 'The endpoint requires authentication and no public weights or runnable implementation are published.' },
  { candidate: 'NanoJev', author: 'NanoJev', reason: 'Public weights exist, but the server exposes a different schema (including boolean rather than Noul) and lacks the full structured/null contract. It needs substantive compatibility work before a fair full-suite run.' },
  { candidate: 'Werr', author: 'pCwOrM', reason: 'Its documented server imports a module (scratch.jevbench_eval.optimize_werr_jevbench) that is not in the public repository, so the submitted configuration cannot be started; its engine also sends telemetry about each request to an outside server by default.' },
  { candidate: 'DIY Jev', author: 'VakeDomen', reason: 'The repository named in the request (github.com/VakeDomen/DIY-Jev) answers 404, so there is nothing to run.' },
  { candidate: 'SimpleJev RWKV variants', author: 'SimpleJev', reason: 'The public demo exposes RWKV IDs, but it does not identify their exact checkpoints or licences. Without reproducible model provenance, we do not publish benchmark rows for them.' },
];

export default async function JevModelsPage() {
  const v12 = await readJevbenchV12();
  const view = jevbenchV12View(v12);
  const costExample = jevCostExample(view);
  const topics = jevbenchV12TopicsView(await readJevbenchV12Topics(v12.artifact));
  const tasks = jevbenchV12TasksView(await readJevbenchV12Tasks(v12));
  const v11 = jevbenchV11View(await readJevbenchV11());
  const [lead] = view.ranked;
  const rankOf = (key: string) => view.ranked.findIndex((r) => r.key === key) + 1;
  const bestOpen = view.ranked.find((r) => r.cls === 'jev-rebuild');
  const jev = view.ranked.find((r) => r.cls === 'jev');
  const prices = v11.referencePrices ?? {};
  const all = [...view.ranked, ...view.honorable, ...view.partial];
  const estimated = all.filter((r) => r.costKind === 'estimate');
  // CR-96: the rows whose price the v1.2.3 correction moved, in the published order.
  const corrected = all.flatMap((r) => {
    const c = view.costCorrectionTable?.[r.key];
    return c && !c.unchanged ? [{ r, c }] : [];
  });
  const topInt = [...view.ranked].sort((a, b) => (b.axes.intelligence ?? 0) - (a.axes.intelligence ?? 0))[0];
  const [topHonorable] = view.honorable;
  const notMeasured = currentNotMeasured;
  const credits = all.filter((r) => !r.key.endsWith('-tools')).sort((a, b) => a.display.localeCompare(b.display));
  return <>
    <header className="bh-page-head">
      <p className="bh-eyebrow flex flex-nowrap items-center"><span><span className="sm:hidden">JevBench v1.2</span><span className="hidden sm:inline">JevBench v1.2 · our own benchmark</span></span><CustomEvaluationOffer /></p>
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

    <JevModelsV12Board view={view} tasks={tasks}>
    {lead && <section className="mt-8 max-w-4xl" aria-labelledby="jev12-headline">
      <h2 id="jev12-headline" className="text-xl font-semibold">What the run says (JevBench Score)</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px]" data-bh-jev12-findings>
        <li><b>{lead.display}</b> leads with {one(lead.main)}: Intelligence {one(lead.axes.intelligence)}, Calibration {one(lead.axes.calibration)}, Speed {one(lead.axes.speed)}, Cost {one(lead.axes.cost)} (<CostValue r={lead} /> per 1,000 decisions).</li>
        {jev && jev.key !== lead.key && <li><b>{jev.display}</b> is #{rankOf(jev.key)} at {one(jev.main)}, {one(gap(lead.main, jev.main))} points behind.</li>}
        {/* CR-97 (Florian 2026-09-20): a service running another entrant's model is listed, not ranked. CR-95.3's
            "why a service leads" bullet is replaced by the reason it no longer does. */}
        {topHonorable && <li data-bh-jev12-honorable-lead><b>{short(topHonorable.display)}</b> scores {one(topHonorable.main)} — higher than anything in the ranking — but is <b>not ranked</b>: it runs {view.honorableMentions?.systems[topHonorable.key]?.runs_on ?? 'another entrant&rsquo;s model'}, so ranking it would put the same model in the list twice, once at the model&apos;s own price and once at the service&apos;s. It keeps every number it earned under <a href="#jev12-honorable" className="text-accent underline">{view.honorableMentions?.heading ?? 'Honorable mentions'}</a>.</li>}
        {bestOpen && bestOpen.key !== lead.key && <li>Open rebuilds of Jev appeared within days. The best of them, <b>{bestOpen.display}</b>, is #{rankOf(bestOpen.key)} at {one(bestOpen.main)} — <span data-bh-jev12-gap>{one(gap(lead.main, bestOpen.main))} points behind</span>: more speed and a lower (estimated) price, less intelligence and calibration.</li>}
        {topInt && topInt.key !== lead.key && <li><b>{topInt.display}</b> has the highest Intelligence ({one(topInt.axes.intelligence)}) but places #{rankOf(topInt.key)}: its cost score is {one(topInt.axes.cost)} (<CostValue r={topInt} /> per 1,000 decisions), and the geometric mean does not let accuracy buy that back.</li>}
        {view.partial.length > 0 && <li>{view.partial.map((r) => short(r.display)).join(', ')} did not answer every tier — each for the reason in its † note; they are shown below the ranking as partial runs, without a rank.</li>}
      </ul>
    </section>}
    </JevModelsV12Board>

    {/* CR-94: two-system radars — the four score axes and accuracy by subject topic (completes CR-90.3). */}
    <JevRadars ranked={view.ranked} honorable={view.honorable} partial={view.partial} topics={topics} />

    <section className="mt-8 max-w-4xl text-sm" data-bh-jev-costs>
      {/* CR-96 (2026-09-20): a reader read this column as dollars per 1,000 tokens. Say the unit before anything else. */}
      <p className="bh-panel mb-3 p-3 text-[15px]" data-bh-jev12-cost-unit-panel>
        <b>Every price here is US dollars per 1,000 decisions — not per 1,000 tokens.</b>{' '}
        One decision is a whole question — state, rubric and options — about {costExample.tokens} input tokens for Jev 1.13.0, so at its ${costExample.tariff} per million input tokens 1,000 decisions cost ${costExample.cost}.
      </p>
      <JevCostsDisclosure>
        <p className="bh-muted mt-2">{view.costUnit.worked_example}</p>
        <p className="bh-muted mt-2">Systems with a public tariff (per token or per request) are priced at that tariff times the tokens we measured. Systems without one — open weights, author demos, models we ran locally — are priced as if a <b className="text-gray-200">large inference provider</b> hosted them: the OpenRouter list price of the same weights; if OpenRouter does not list them, the nearest larger sibling; if no model of that size class is on OpenRouter, the DeepInfra list price of the same weights or of the nearest larger model of the same class. We do not use per-minute GPU rental or our own CPU time — providers buy capacity in bulk or own the hardware, and price accordingly. Price × tokens per decision = $ per 1,000 decisions, marked &ldquo;est.&rdquo;.</p>
        <ul className="mt-3 space-y-1.5" data-bh-jev-cost-rows>
          {estimated.map((r) => <li key={r.key}><b>{short(r.display)}</b> — <CostValue r={r} /> per 1,000 decisions: <span className="bh-muted">{r.costBasis.replace(/^ESTIMATE: (hosted-provider price, )?/, '')}</span></li>)}
        </ul>
        {prices.size_classes && <details className="mt-3"><summary className="cursor-pointer text-accent">Reference prices by size class ($ per million input / output tokens)</summary>
          <ul className="bh-muted mt-2 space-y-1" data-bh-jev-cost-classes>
            {Object.entries(prices.size_classes as Record<string, { reference_models: Record<string, number | number[]> }>).map(([k, c]) => <li key={k}><b className="text-gray-200">{k.replace(/_/g, ' ')}</b>: {Object.entries(c.reference_models).map(([m, v]) => `${m} ${Array.isArray(v) ? v.map((x) => `$${x}`).join(' / ') : `$${v}`}`).join('; ')}</li>)}
          </ul>
          <p className="bh-muted mt-2">Sources: {String(prices.token_source ?? '')}.</p></details>}
      </JevCostsDisclosure>
      {view.costCorrection && corrected.length > 0 && <details className="bh-panel mt-3 p-4" data-bh-jev12-cost-correction>
        <summary className="cursor-pointer text-sm font-semibold">Correction, {view.costCorrection.revision} (20 September 2026): every price recomputed, each decision counted once</summary>
        <p className="bh-muted mt-2">{view.costCorrection.rule}</p>
        <ul className="bh-muted mt-2 list-disc space-y-1 pl-5">
          {view.costCorrection.what_was_wrong.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
        <p className="bh-muted mt-2">No tariff, measurement, item, answer or rank changed. The prices before and after:</p>
        <ul className="bh-muted mt-2 space-y-1" data-bh-jev12-cost-correction-rows>
          {corrected.map(({ r, c }) => <li key={r.key}><b className="text-gray-200">{short(r.display)}</b> — ${c.old.toFixed(4)} → ${c.new.toFixed(4)} ({c.pct > 0 ? '+' : ''}{c.pct.toFixed(2)} %)</li>)}
        </ul>
      </details>}
    </section>

    <section className="mt-10 max-w-4xl space-y-3" aria-labelledby="jev-not-measured">
      <h2 id="jev-not-measured" className="text-xl font-semibold">Who could not be measured, and why</h2>
      <p className="bh-muted text-sm">An exclusion is an availability fact about our run — hardware, access, terms — <b className="text-gray-200">never a quality verdict</b>. Partial runs are in the table above, greyed and without a rank; so are the <a className="text-accent underline" href="#jev12-honorable">honorable mentions</a>, which are complete runs that simply are not ranked.</p>
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
        {view.honorableMentions && <p data-bh-jev12-method-honorable><b className="text-gray-200">A service running another entrant&apos;s model is listed, but not ranked against the models.</b> {view.honorableMentions.rule.replace(/^A service that runs another entrant's model is listed with all of its scores and axes, but is not ranked against the models\. /, '')} Which rows this applies to, and why: <a className="text-accent underline" href="#jev12-honorable">{view.honorableMentions.heading}</a>.</p>}
        <p>v1.2 numbers are not comparable with v1.1 or v1.0 (different tiers and scoring). The v1.0 page keeps its own numbers, calibration plots and per-family tables.</p>
      </div>
    </details>

    <details id="limits" className="bh-panel mt-3 max-w-4xl scroll-mt-6 p-5">
      <summary className="cursor-pointer text-sm font-semibold">Limits</summary>
      <ul className="bh-muted mt-4 list-disc space-y-2 pl-5 text-sm">
        <li>{view.decisions} decisions is a pilot, not a census, and it is English-only.</li>
        <li>The weights are a choice. The JevBench Score weights the four axes equally and multiplies rather than adds them; if a wrong decision costs you more than a slow or expensive one, pick &ldquo;Emphasis on Accuracy&rdquo; above — the table of views shows what other weightings would do.</li>
        {/* CR-94.3 (Florian 2026-09-19): why the adjustment exists, what supports it, and that it stays an assumption. */}
        <li data-bh-jev12-latency-limit><b className="text-gray-200">The latency adjustment (×2, +0.15 s on our own servers) is an assumption, not a measurement.</b> We ran the self-hosted and demo endpoints one request at a time (parallelism 1, no other load), so their latency is likely better than the same model on a busy production server. The official Jev API is presumably under high load, given the public interest.
          {' '}Serving under load trades per-user speed for throughput: in the NVIDIA chart shown by <a className="text-accent underline" href="https://newsletter.semianalysis.com/p/nvidia-blackwell-perf-tco-analysis" target="_blank" rel="noopener noreferrer">SemiAnalysis</a>, moving to the throughput-maximising setting cuts per-user tokens per second by far more than 2×. That chart is a 1.8T mixture-of-experts model on GPU clusters, not a 4B model on one GPU, so it supports the direction and size of the effect, not our exact factor.
          {' '}The +0.15 s stands for infrastructure our self-hosted tests lacked: authentication, load balancing, logging, billing and an API gateway.
          {' '}Both numbers are assumptions; raw p50/p95 latencies are in the table and the <a className="text-accent underline" href={JEVBENCH_REPO}>repo</a>, and a measurement under load is planned.</li>
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
