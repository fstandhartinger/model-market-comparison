import type { Metadata } from 'next';
import { readJevbenchV12 } from '../../lib/jevbench-v12.mjs';
import { readJevbenchV11, jevbenchV11View } from '../../lib/jevbench-v11.mjs';
import { JEVBENCH_REPO } from '../../lib/jevbench.mjs';
import { CostUnitNote } from '../../components/JevModelsV12';
import { JevCostsDisclosure } from '../../components/JevCostsDisclosure';
import { CustomEvaluationOffer } from '../../components/CustomEvaluationOffer';
import { readJevbenchV142, jevbenchV142View } from '../../lib/jevbench-v142.mjs';
import { readJevbenchV141 } from '../../lib/jevbench-v141.mjs';
import { JevModelsV14Board } from '../../components/JevModelsV14';
import { JevCapabilityLazy } from '../../components/JevCapabilityLazy';
import { JevBoardIntentLinks } from '../../components/JevBenchSeoBlocks';
import { JevContextLazy } from '../../components/JevContextLazy';
import { JevHistoryLazy } from '../../components/JevHistoryLazy';

const OG_ART_REVISION = 'og4'; // The live board URL changes; its share card stays evergreen.

// CR-152: v1.4.2 is the default board (CR-135 introduced the v1.4.x default). The previous public-only v1.3.0 view stays below in a
// labeled historical disclosure; frozen releases remain at their version-pinned URLs.
export async function generateMetadata(): Promise<Metadata> {
  const title = 'JevBench by Benchmark Heaven — Jev-class model benchmark';
  const description = 'Compare Jev-class decision models across intelligence, calibration, speed, and cost with JevBench.';
  const imageAlt = 'JevBench by Benchmark Heaven: a benchmark for Jev-class decision models across intelligence, calibration, speed, and cost.';
  const image = `https://benchmarkheaven.com/jev-models/opengraph-image?v=${OG_ART_REVISION}`;
  return {
    title,
    description,
    alternates: { canonical: '/jev-models' },
    openGraph: {
      type: 'website', siteName: 'Benchmark Heaven', locale: 'en_US', url: '/jev-models',
      title, description,
      images: [{ url: image, type: 'image/png', secureUrl: image, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image', site: '@benchmarkheaven', creator: '@benchmarkheaven',
      title, description,
      images: [{ url: image, alt: imageAlt }],
    },
  };
}

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const short = (d: string) => d.split(' (')[0].split(', formerly')[0];
const one = (v: number | null) => (v === null ? '—' : v.toFixed(1));
const pct = (v: number | null) => (v === null ? '—' : `${(100 * v).toFixed(1)}%`);
const points = (v: number | null, signed = false) => v === null ? '—' : `${signed && v >= 0 ? '+' : ''}${(100 * v).toFixed(1)}`;
// Gaps are the difference of the scores as displayed (one decimal), so a reader can check them by eye.
const gap = (a: number, b: number) => (Math.round(a * 10) - Math.round(b * 10)) / 10;
type CostCorrection = { revision: string; rule: string; what_was_wrong: string[] };
type CostCorrectionEntry = { old: number; new: number; pct: number; unchanged?: boolean };
const jevCostExample = (costUnit: { worked_example: string }) => {
  const example = costUnit.worked_example;
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
  const v14Result = await readJevbenchV142();
  const v14 = jevbenchV142View(v14Result);
  // CR-151: the previous release's systems, so the board can mark and filter what is new in this one.
  const previousRelease = (await readJevbenchV141()).artifact;
  const previous = { revision: previousRelease.revision, keys: previousRelease.systems.map((row) => row.key) };
  const v12 = await readJevbenchV12();
  const costUnit = v12.artifact.cost_unit;
  const costCorrection = (v12.artifact.cost_correction ?? null) as CostCorrection | null;
  const costCorrectionTable = (v12.artifact.cost_correction_table ?? {}) as Record<string, CostCorrectionEntry>;
  const costCorrectionRows: Array<{ r: { key: string; display: string }; c: CostCorrectionEntry }> = v12.artifact.systems.flatMap((r: { key: string; display: string }) => {
    const c = costCorrectionTable[r.key];
    return c && !c.unchanged ? [{ r, c }] : [];
  });
  const costExample = jevCostExample(costUnit);
  const v11 = jevbenchV11View(await readJevbenchV11());
  const prices = v11.referencePrices ?? {};
  const notMeasured = currentNotMeasured;
  // Page fix (Florian 23 Sep 2026): the evergreen sections below read the v1.4 board, not the v1.3 one.
  const v14Rank = (key: string) => v14.ranked.find((r) => r.key === key)?.rank ?? null;
  const openAlternatives = v14.ranked.filter((r) => r.class === 'jev-rebuild' && r.open === 'yes').slice(0, 4);
  const [v14Lead] = v14.ranked;
  const v14BestOpen = v14.ranked.find((r) => r.class === 'jev-rebuild' && r.key !== v14Lead.key);
  const v14TopInt = [...v14.ranked].sort((a, b) => (b.axes.intelligence ?? 0) - (a.axes.intelligence ?? 0))[0];
  const v14TopSealed = [...v14.ranked].sort((a, b) => (b.sealed_accuracy ?? 0) - (a.sealed_accuracy ?? 0))[0];
  const v14Honorable = v14.unranked.find((r) => r.listing === 'honorable_mention');
  const v14Partial = v14.unranked.filter((r) => r.listing === 'partial');
  const v14Estimated = v14.systems.filter((r) => r.cost?.kind === 'estimate');
  const v14Credits = v14.systems.filter((r) => !r.key.endsWith('-tools')).sort((a, b) => a.display.localeCompare(b.display));
  const v14Scoring = v14.artifact.scoring as Record<string, string>;
  const usd = (v: number | null | undefined) => (v == null ? '—' : `$${v.toFixed(v < 0.01 ? 4 : 3)}`);
  const faq = [
    {
      question: 'What are open-source alternatives to Jev?',
      answer: `JevBench ${v14.revision} includes open implementations such as ${openAlternatives.map((r) => short(r.display)).join(', ')}. The leaderboard links each tested project and records its code and model licences.`,
    },
    {
      question: 'Which Jev-class models can I self-host in the EU or use for a GDPR-sensitive workload?',
      answer: 'Open entrants with released code or weights can be deployed on infrastructure you choose, including EU infrastructure. That can support a data-residency plan, but a model licence or EU server location does not by itself make a deployment GDPR-compliant; the controller must assess the complete processing setup.',
    },
    {
      question: 'How is JevBench scored?',
      answer: `JevBench ${v14.revision} blends 20% sealed aggregate accuracy into Intelligence, blends Calibration toward its sealed-inclusive result at the approved weight, applies a k=1 public-to-sealed gap penalty above 25 percentage points, and combines the four axes with an equal-weight harmonic mean. Intelligence, Speed and Cost retain their approved low-axis gates.`,
    },
    {
      question: 'How do I submit my model?',
      answer: 'Open an issue in the JevBench repository with a reproducible endpoint or runnable code, the exact model and licence, and any public-task training disclosure. New entrants are measured with the same harness and published in a new version.',
    },
  ];
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': 'https://benchmarkheaven.com/jev-models#page',
        url: 'https://benchmarkheaven.com/jev-models', name: 'JevBench by Benchmark Heaven — Jev-class model benchmark',
        description: `Independent comparison of ${v14.systems.length} Jev-class systems across ${v14.totalDecisions} public and sealed decisions.`,
        dateModified: v14.generated, isPartOf: { '@id': 'https://benchmarkheaven.com/#website' },
        mainEntity: { '@id': 'https://benchmarkheaven.com/jev-models#dataset' },
      },
      {
        '@type': 'Dataset', '@id': 'https://benchmarkheaven.com/jev-models#dataset',
        name: `JevBench ${v14.revision} results`,
        description: `Measured JevBench results for ${v14.systems.length} Jev-class systems on ${v14.totalDecisions} typed decisions.`,
        url: 'https://benchmarkheaven.com/jev-models', dateModified: v14.generated,
        creator: { '@type': 'Organization', name: 'Benchmark Heaven', url: 'https://benchmarkheaven.com' },
        license: 'https://github.com/fstandhartinger/jevbench/blob/main/LICENSE',
        isAccessibleForFree: true,
        variableMeasured: ['JevBench Score', 'Intelligence', 'Calibration', 'Speed', 'Cost'],
        distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `https://benchmarkheaven.com/api/jevbench/${v14.revision}` }],
      },
      {
        '@type': 'FAQPage', '@id': 'https://benchmarkheaven.com/jev-models#faq',
        mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
      },
    ],
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    <header className="bh-page-head">
      {/* F-160 (Fable pass 30): the eyebrow is a div — CustomEvaluationOffer mounts a <div> toast inside it after 6 s, which is invalid inside a <p>. */}
      <div className="bh-eyebrow flex flex-nowrap items-center"><span><span className="sm:hidden">JevBench {v14.revision}</span><span className="hidden sm:inline">JevBench {v14.revision} · our own benchmark</span></span><CustomEvaluationOffer /></div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">JevBench by Benchmark Heaven</h1>
      <p className="mt-3 max-w-3xl text-lg" data-bh-jev-own>JevBench is <b>Benchmark Heaven&apos;s own benchmark</b> for Jev-class decision models: state and a bounded rubric in, a typed answer out.</p>
      <JevBoardIntentLinks />
      <p className="bh-muted mt-3 max-w-3xl text-xs leading-relaxed" data-bh-jev-meta>
        Scored {day(v14.generated)} · protocol <code>{v14.artifact.protocol}</code> · {v14.publicDecisions} public + {v14.sealedDecisions} sealed aggregate decisions · one request at a time from a server in Germany ·{' '}
        <a className="text-accent underline" href={JEVBENCH_REPO}>harness, public tasks &amp; scoring rules (MIT)</a> ·{' '}
        <a className="text-accent underline" href={`/api/jevbench/${v14.revision}`} data-bh-jev-sha={v14.sha256}>results JSON</a> <span className="whitespace-nowrap">sha256 <code title={v14.sha256}>{v14.sha256.slice(0, 12)}…</code></span> ·{' '}
        <a className="text-accent underline" href="/jev-models/v1" data-bh-jev-v1-link>v1.0 results</a>
      </p>
      <p className="mt-3 max-w-3xl text-sm" data-bh-jev-version-share-row>
        <a className="text-accent underline" href="/jev-models/v1.4.2" data-bh-jev-version-share>Share this version</a>
      </p>
    </header>

    <JevModelsV14Board artifact={v14.artifact} sha256={v14.sha256} previous={previous} capabilityHref="#jev14-capability-views" />


    {/* Page fix (Florian 23 Sep 2026): the v1.3 page's "what the run says" findings, recomputed from the v1.4 board. */}
    <section className="mt-10 max-w-4xl" aria-labelledby="jev14-headline" data-bh-jev14-findings>
      <h2 id="jev14-headline" className="text-xl font-semibold">What the run says</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px]">
        <li><b>{short(v14Lead.display)}</b> leads {v14.revision} with {one(v14Lead.jevbench_score)}: Intelligence {one(v14Lead.axes.intelligence)}, Calibration {one(v14Lead.axes.calibration)}, Speed {one(v14Lead.axes.speed)}, Cost {one(v14Lead.axes.cost)} ({usd(v14Lead.cost.usd_per_1000)} per 1,000 decisions).</li>
        {v14BestOpen && <li>The best open or open-planned rebuild, <b>{short(v14BestOpen.display)}</b>, is #{v14BestOpen.rank} at {one(v14BestOpen.jevbench_score)} — {one(gap(v14Lead.jevbench_score ?? 0, v14BestOpen.jevbench_score ?? 0))} points behind.</li>}
        {v14TopInt && v14TopInt.key !== v14Lead.key && <li><b>{short(v14TopInt.display)}</b> has the highest Intelligence ({one(v14TopInt.axes.intelligence)}) but places #{v14TopInt.rank}: Speed {one(v14TopInt.axes.speed)}, Cost {one(v14TopInt.axes.cost)} — the harmonic mean does not let accuracy buy back a weak axis.</li>}
        <li>The sealed set is hard for everyone: the best sealed accuracy among ranked systems is {pct(v14TopSealed.sealed_accuracy)} (<b>{short(v14TopSealed.display)}</b>, #{v14Rank(v14TopSealed.key)}); chance is {pct(v14.artifact.sealed_chance)}. Large public-minus-sealed gaps above 25 points reduce Intelligence.</li>
        {v14Honorable && <li><b>{short(v14Honorable.display)}</b> scores {one(v14Honorable.jevbench_score)} but is <b>not ranked</b>: it is a service running another entrant&apos;s model.</li>}
        {v14Partial.length > 0 && <li>{v14Partial.map((r) => short(r.display)).join(', ')} did not complete every tier; they are listed without a rank.</li>}
      </ul>
    </section>

    {/* CR-129 (2026-09-23): a dedicated page per system (Google Trends shows readers searching system names
        directly, e.g. "semif", "laya model"). F-169 (Fable pass 32): those pages are reached from the board
        row that names the system — the list of 52 links that used to stand here said nothing the table above
        does not already say, and cost the phone page 1,488 px. The sitemap still carries every page. */}

    <section className="mt-10 max-w-5xl" aria-labelledby="jev-alternatives-heading" data-bh-jev-seo-guide>
      <h2 id="jev-alternatives-heading" className="text-2xl font-semibold">Jev alternatives, open source and self-hosting</h2>
      <p className="bh-muted mt-2 max-w-4xl">The chart and table above compare the tested systems, not marketing claims. These are the practical answers readers most often need before choosing a Jev-class decision model.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <article className="bh-panel p-5">
          <h3 className="text-lg font-semibold">What are open-source alternatives to Jev?</h3>
          <p className="bh-muted mt-2 text-sm">The highest-ranked open entrants in this run are {openAlternatives.map((r, i) => <span key={r.key}>{i ? ', ' : ''}<a className="text-accent underline" href={r.repo ?? JEVBENCH_REPO} target="_blank" rel="noopener noreferrer">{short(r.display)}</a> (#{r.rank}, {one(r.jevbench_score)})</span>)}. “Open” here means the tested row publishes code or weights; check the licence and exact configuration in the board before adopting one.</p>
        </article>
        <article className="bh-panel p-5">
          <h3 className="text-lg font-semibold">Which Jev-class models can I self-host in the EU or use for GDPR-sensitive work?</h3>
          <p className="bh-muted mt-2 text-sm">Open entrants with released code or weights can run on infrastructure you choose, including EU infrastructure. That can support data residency, but neither open source nor an EU server makes a deployment GDPR-compliant by itself. Assess your data, contracts, retention, subprocessors and security for the complete setup. See Benchmark Heaven&apos;s broader <a className="text-accent underline" href="/eu">EU-hosting comparison</a>.</p>
          <p className="bh-muted mt-2 text-sm"><a className="text-accent underline" href="https://jev-router.com" target="_blank" rel="noopener noreferrer">jev-router.com</a> offers self-hosted open decision models. Neutrality disclosure: it is run by the authors of this benchmark; it receives no scoring advantage and is not a ranked entrant.</p>
        </article>
        <article className="bh-panel p-5">
          <h3 className="text-lg font-semibold">How is JevBench scored?</h3>
          <p className="bh-muted mt-2 text-sm">The official score is the equal-weight harmonic mean of Intelligence, Calibration, Speed and Cost. Version {v14.revision} measures {v14.publicDecisions} public and {v14.sealedDecisions} sealed decisions: 20% of Intelligence comes from the sealed set, a public-minus-sealed gap above 25 points costs Intelligence, and Intelligence, Speed or Cost below 50 each pull the score down quadratically. <a className="text-accent underline" href="#jev14-changes">What changed in v1.4</a> · <a className="text-accent underline" href="#method">method and tiers</a>.</p>
        </article>
        <article className="bh-panel p-5">
          <h3 className="text-lg font-semibold">How do I submit my model?</h3>
          <p className="bh-muted mt-2 text-sm">Open an issue in the <a className="text-accent underline" href={`${JEVBENCH_REPO}/issues`} target="_blank" rel="noopener noreferrer">JevBench repository</a> with a reproducible endpoint or runnable code, the exact model and licence, and whether public JevBench items were used during development. New entrants use the same frozen harness and appear in a new version. For private data, see the <a className="text-accent underline" href="/jev-models/custom-evaluation">custom evaluation options</a>.</p>
        </article>
      </div>
    </section>

    <section id="jev-costs-section" className="mt-10 max-w-4xl scroll-mt-6 text-sm" data-bh-jev-costs>
      <h2 className="mb-3 text-xl font-semibold">What a decision costs</h2>
      {/* CR-96 (2026-09-20): a reader read this column as dollars per 1,000 tokens. Say the unit before anything else. */}
      <p className="bh-panel mb-3 p-3 text-[15px]" data-bh-jev12-cost-unit-panel>
        <b>Every price here is US dollars per 1,000 decisions — not per 1,000 tokens.</b>{' '}
        One decision is a whole question — state, rubric and options — about {costExample.tokens} input tokens for Jev 1.13.0, so at its ${costExample.tariff} per million input tokens 1,000 decisions cost ${costExample.cost}.
      </p>
      <JevCostsDisclosure>
        <p className="bh-muted mt-2">{costUnit.worked_example}</p>
        <p className="bh-muted mt-2">Systems with a public tariff (per token or per request) are priced at that tariff times the tokens we measured. Systems without one — open weights, author demos, models we ran locally — are priced as if a <b className="text-gray-200">large inference provider</b> hosted them: the OpenRouter list price of the same weights; if OpenRouter does not list them, the nearest larger sibling; if no model of that size class is on OpenRouter, the DeepInfra list price of the same weights or of the nearest larger model of the same class. We do not use per-minute GPU rental or our own CPU time — providers buy capacity in bulk or own the hardware, and price accordingly. Price × tokens per decision = $ per 1,000 decisions, marked &ldquo;est.&rdquo;.</p>
        <ul className="mt-3 space-y-1.5" data-bh-jev-cost-rows>
          {v14Estimated.map((r) => <li key={r.key}><b>{short(r.display)}</b> — <span className="whitespace-nowrap">~{usd(r.cost.usd_per_1000)} <span className="bh-thin-tag">est.</span></span> per 1,000 decisions: <span className="bh-muted">{r.cost.basis.replace(/^ESTIMATE: (hosted-provider price, )?/, '')}</span></li>)}
        </ul>
        {prices.size_classes && <details className="mt-3"><summary className="cursor-pointer text-accent">Reference prices by size class ($ per million input / output tokens)</summary>
          <ul className="bh-muted mt-2 space-y-1" data-bh-jev-cost-classes>
            {Object.entries(prices.size_classes as Record<string, { reference_models: Record<string, number | number[]> }>).map(([k, c]) => <li key={k}><b className="text-gray-200">{k.replace(/_/g, ' ')}</b>: {Object.entries(c.reference_models).map(([m, v]) => `${m} ${Array.isArray(v) ? v.map((x) => `$${x}`).join(' / ') : `$${v}`}`).join('; ')}</li>)}
          </ul>
          <p className="bh-muted mt-2">Sources: {String(prices.token_source ?? '')}.</p></details>}
      </JevCostsDisclosure>
      {costCorrection && costCorrectionRows.length > 0 && <details className="bh-panel mt-3 p-4" data-bh-jev12-cost-correction>
        <summary className="cursor-pointer text-sm font-semibold">Correction, {costCorrection.revision} (20 September 2026): every price recomputed, each decision counted once</summary>
        <p className="bh-muted mt-2">{costCorrection.rule}</p>
        <ul className="bh-muted mt-2 list-disc space-y-1 pl-5">
          {costCorrection.what_was_wrong.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
        <p className="bh-muted mt-2">No tariff, measurement, item, answer or rank changed. The prices before and after:</p>
        <ul className="bh-muted mt-2 space-y-1" data-bh-jev12-cost-correction-rows>
          {costCorrectionRows.map(({ r, c }) => <li key={r.key}><b className="text-gray-200">{short(r.display)}</b> — ${c.old.toFixed(4)} → ${c.new.toFixed(4)} ({c.pct > 0 ? '+' : ''}{c.pct.toFixed(2)} %)</li>)}
        </ul>
      </details>}
    </section>

    <section className="mt-10 max-w-4xl space-y-3" aria-labelledby="jev-not-measured">
      <h2 id="jev-not-measured" className="text-xl font-semibold">Who could not be measured, and why</h2>
      <p className="bh-muted text-sm">An exclusion is an availability fact about our run — hardware, access, terms — <b className="text-gray-200">never a quality verdict</b>. Partial runs are in the table above, greyed and without a rank; so are the <a className="text-accent underline" href="#jev14-table">honorable mentions</a>, which are complete runs that simply are not ranked.</p>
      <ul className="space-y-2 text-sm" data-bh-jev-availability>
        {notMeasured.map((n, i) => <li key={`${n.candidate}-${i}`} className="bh-panel p-3" data-bh-jev-availability-row={n.candidate}><b>{n.candidate}</b> <span className="bh-muted">({n.author})</span> — <span className="bh-muted">{n.reason.replace(/`/g, '')}</span></li>)}
      </ul>
    </section>

    <details id="method" className="bh-panel mt-8 max-w-4xl scroll-mt-6 p-5">
      <summary className="cursor-pointer text-sm font-semibold">Method and tiers</summary>
      <div className="bh-muted mt-4 space-y-3 text-sm">
        <p>Built and run by us, not collected from someone else&apos;s leaderboard; the results describe the tested configurations, not every application.</p>
        <p data-bh-jev14-method-score><b className="text-gray-200">JevBench Score.</b> {v14Scoring.jevbench_score}</p>
        <p><b className="text-gray-200">Intelligence.</b> {v14Scoring.intelligence}</p>
        <p data-bh-jev-revision><b className="text-gray-200">Revision {v14.revision}.</b> {String(v14.artifact.revision_note ?? '')}</p>
        <ul className="list-disc space-y-1.5 pl-5">{(['easy', 'standard', 'judge'] as const).map((t) => <li key={t}><b className="text-gray-200">{t}</b>: {v11.tierNotes[t]}</li>)}
          <li><b className="text-gray-200">hard</b>: {v14Scoring.hard_tier ?? v12.artifact.scoring.hard_tier}</li>
          <li data-bh-jev14-method-sealed><b className="text-gray-200">sealed</b>: {v14.sealedDecisions} fresh private decisions across ten families, run once per system. Only system-level aggregates — overall and per-family accuracy, calibration — are published; the item text, answers and per-item results stay private and rotate between versions.</li></ul>
        <p>Every system sees the same state, instructions, rubric and exact label set; only the transport differs. Requests go out one at a time with no retries, so latency includes the network. Estimated costs are hosted-provider prices for the same weights or size class and are marked &ldquo;est.&rdquo; — hover one for its basis, or see <a className="text-accent underline" href="#jev-costs">how costs are estimated</a>. Every system has a price; none gets a free 100.</p>
        {v12.artifact.honorable_mentions && <p data-bh-jev12-method-honorable><b className="text-gray-200">A service running another entrant&apos;s model is listed, but not ranked against the models.</b> {v12.artifact.honorable_mentions.rule.replace(/^A service that runs another entrant's model is listed with all of its scores and axes, but is not ranked against the models\. /, '')} Which rows this applies to, and why: <a className="text-accent underline" href="#jev12-honorable">{v12.artifact.honorable_mentions.heading}</a>.</p>}
        <p>v1.4 scores are not comparable with v1.3 or earlier (sealed blend, gap penalty and harmonic mean). The v1.3.0 board stays below as history; the v1.0 page keeps its own numbers, calibration plots and per-family tables.</p>
      </div>
    </details>

    <details id="limits" className="bh-panel mt-3 max-w-4xl scroll-mt-6 p-5">
      <summary className="cursor-pointer text-sm font-semibold">Limits</summary>
      <ul className="bh-muted mt-4 list-disc space-y-2 pl-5 text-sm">
        <li>{v14.totalDecisions} decisions ({v14.publicDecisions} public, {v14.sealedDecisions} sealed) is a pilot, not a census, and it is English-only. The v1.4 sealed set is very hard: most systems score close to chance on it, so sealed accuracy separates the field less than public accuracy does.</li>
        <li>The weights are a choice. The JevBench Score weights the four axes equally and uses a harmonic mean, so the weakest axis dominates; if a wrong decision costs you more than a slow or expensive one, read the Intelligence column and the accuracy radars rather than the score alone.</li>
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
          {v14Credits.map((r) => <li key={r.key}><b className="text-gray-200">{r.display}</b> — {r.author}, {r.licence}{r.repo && <> — <a className="text-accent underline" href={r.repo} target="_blank" rel="noopener noreferrer">{r.repo.replace(/^https:\/\//, '')}</a></>}</li>)}
        </ul>
        <p>Authors: if we tested the wrong configuration, tell us and we will rerun it. New entrants become a new version rather than silently changing this one.</p>
        <p data-bh-jev-credit-3d>3D view: three.js r128 (MIT).</p>
      </div>
    </details>

    <JevCapabilityLazy revision={v14.revision} />
    <JevContextLazy />

    <JevHistoryLazy />
  </>;
}
