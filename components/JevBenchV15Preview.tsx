import { jevSystemPath } from '../lib/jev-system-slug.mjs';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import {
  JEVBENCH_V15_METHOD_LINKS, JEVBENCH_V15_METHOD_URL, JEVBENCH_V15_HEADLINE_METHOD_URL, JEVBENCH_V15_PRICING_URL, JEVBENCH_V15_OPTIONS, JEVBENCH_V15_TYPES,
  jevV15LeaderSentence, jevV15TieSummary,
  type JevV15Artifact, type JevV15Option, type JevV15System,
} from '../lib/jevbench-v15-preview.mjs';
import { jevV15SliderPresets, jevV15BoardSystem, jevV15BoardRow, jevV15CompareRow, jevV15OpenSource } from '../lib/jevbench-v15-board.mjs';
import { JEVBENCH_REPO } from '../lib/jevbench.mjs';
import { jevTypeVarName, JEV_TYPE_LABEL } from './jevTypes';
import { JevCapabilityRanking } from './JevCapabilityRanking';
import { jevClassView } from './jevClassView';
import { JevBubbleCharts } from './JevBubbleChart';
import { JevScoreChart } from './JevBoardInteractive';
import { JevCompareV15 } from './JevCompareV15';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import { JevAxesViews } from './JevAxesViews';
import { JevBoardIntentLinks } from './JevBenchSeoBlocks';
import { JevCapabilityLazy } from './JevCapabilityLazy';
import { JevContextLazy } from './JevContextLazy';
import { JevCostsDisclosure } from './JevCostsDisclosure';
import { jevSourceUrl } from './jevSystemLinks';
import { BaseModelDisplay } from './BaseModelDisplay';
import type { JevV14System } from '../lib/jevbench-v14.mjs';
import { jevV15FilterRows } from '../lib/jevbench-v15-filter-rows.mjs';
import { JevV15FilterProvider, JevV15FilterPanel, type JevV15RowMeta } from './JevV15Filters';
import { JevV15FilterVisibilityBridge } from './JevV15FilterVisibilityBridge';
import { JevV15AllDataGrid } from './JevV15AllDataGrid';

// JevBench v1.5 board. Server-rendered from the aggregate-only v1.5
// artifact; it follows the v1.4.2 board's look (bars, sticky-name tables, thin tags) but shows the v1.5 fields:
// three weight options with A as headline, per-type (Choice / Noul / Score) competence for open and sealed, typed
// calibration, adjusted latency, the cost basis, and honest listings for partial, unpriced and unmeasured systems.

const one = (v: number | null | undefined) => v == null ? '—' : v.toFixed(1);
const f0 = (v: number | null | undefined) => v == null ? '–' : v.toFixed(0);
const signed = (v: number | null | undefined) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
// F-218 (Fable pass 41): a hash inside a sentence prints as the hub's provenance line does — the 12-character prefix with the full value in
// the title — so no sentence wraps mid-hex at 390 or 1440; the provenance line at the foot keeps the full values, once. The value always
// comes from the artifact (the pricing-correction hash was a literal in this file and would have outlived the next revision).
export const Sha = ({ v, id }: { v: string; id?: 'method' }) => <code title={v} data-bh-jev15-sha={id ?? 'prose'} data-bh-jev15-method-sha={id === 'method' ? '' : undefined}>{v.slice(0, 12)}…</code>;
const secs = (v: number | null | undefined) => v == null ? '—' : `${v.toFixed(v < 1 ? 2 : 1)} s`;
const usd = (v: number | null | undefined) => v == null ? '—' : `$${v.toFixed(v < 0.01 ? 4 : v < 1 ? 3 : 2)}`;
const shortOnly = (display: string) => display.split(' (')[0].split(', formerly')[0];
// Two configurations can share a short name (GPT-6 Luna and its low-effort setting); those keep the full name.
let collisions = new Set<string>();
const short = (display: string) => collisions.has(shortOnly(display)) ? display : shortOnly(display);
const typeVar = (cls: string) => ({ '--jev-t': `var(${jevTypeVarName(cls)})` }) as CSSProperties;
const TYPE_LABEL: Record<string, string> = { choice: 'Choice', noul: 'Noul', score: 'Score' };
const OPTION_LABEL: Record<JevV15Option, string> = { A: 'A · equal (headline)', B: 'B · 40/20/20/20', C: 'C · equal, I floor 60' };
const API_NOTE = "API — the operator's endpoint received sealed item text, without answers.";
// Pass 39: a pill is a word, never a key — `honorable_mention` printed as-is, and an addendum row wore two pills for one fact.
const LISTING_LABEL: Record<string, string> = { partial: 'partial run', unpriced: 'unpriced', unranked: 'not ranked', honorable_mention: 'honorable mention', addendum: 'addendum' };

function Tags({ row }: { row: JevV15System }) {
  return <>
    {row.addendum && <span className="bh-thin-tag ml-1.5 align-middle !border-solid !text-[rgb(var(--accent2))]" title="Added by a separately hashed roster addendum; same frozen sample, method and pricing rules." data-bh-jev15-addendum={row.addendum.id}>{row.addendum.label}</span>}
    {row.api_flag && <span className="bh-thin-tag ml-1.5 align-middle" title={row.api_exposure_note ?? API_NOTE}>API</span>}
    {row.listing !== 'ranked' && !(row.listing === 'addendum' && row.addendum) && <span className="bh-thin-tag ml-1.5 align-middle" title={row.not_ranked_because ?? undefined}>{LISTING_LABEL[row.listing] ?? row.listing.replace(/_/g, ' ')}</span>}
  </>;
}

// F-206(a): 94 of the 97 priced systems are estimates, so the majority is said once in the legend and the pill marks the
// exception. The number is the cell's own text, right-aligned and tabular; the pill sits left of it so a column of figures
// still lines up on its digits.
const COST_LEGEND = 'Costs are estimates (est.) unless marked tariff.';
const TARIFF_TITLE = 'A published tariff for this exact endpoint, not a base-model estimate.';

function costCell(row: JevV15System) {
  if (row.listing === 'unpriced') return <span className="bh-muted" title={row.cost.basis} data-bh-jev15-cost-cell="unpriced">unpriced</span>;
  return <span className="tabular-nums" title={row.cost.basis} data-bh-jev15-cost-cell={row.cost.kind}>
    {row.cost.kind === 'tariff' && <span className="bh-thin-tag mr-1 align-middle" title={TARIFF_TITLE}>tariff</span>}
    {usd(row.cost.usd_per_1000)}
  </span>;
}

function Th({ children, right = true, title }: { children: ReactNode; right?: boolean; title?: string }) {
  return <th className={`whitespace-nowrap p-2 ${right ? 'text-right' : 'text-left'} text-xs font-semibold`} title={title} scope="col">{children}</th>;
}

function NameCell({ row, rank }: { row: JevV15System; rank: ReactNode }) {
  return <>
    <td className="sticky left-0 z-[1] w-10 min-w-10 bg-[var(--surface)] p-2 text-right font-bold tabular-nums shadow-[inset_-1px_0_0_rgb(var(--line))]">{rank}</td>
    <th scope="row" className="sticky left-10 z-[1] w-44 min-w-44 bg-[var(--surface)] p-2 text-left font-semibold shadow-[inset_-1px_0_0_rgb(var(--line))] sm:w-60 sm:min-w-60" style={typeVar(row.class)}>
      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[rgb(var(--jev-t))] align-middle" aria-hidden="true" />
      {jevSourceUrl(row.key, row.repo)
        ? <a href={jevSourceUrl(row.key, row.repo)!} target="_blank" rel="noopener noreferrer" className="underline" title={row.display}>{short(row.display)}</a>
        : <Link href={jevSystemPath(row.key)} title={row.display}>{short(row.display)}</Link>}<Tags row={row} />
      {jevSourceUrl(row.key, row.repo) && <Link href={jevSystemPath(row.key)} className="ml-2 text-[11px] font-normal text-accent underline">details</Link>}
      {/* CR-254 (2026-10-01): cited base-model overlay, presentation only; every listed row keeps it. */}
      <BaseModelDisplay systemKey={row.key} className="mt-1 block text-[11px] font-normal leading-tight" />
    </th>
  </>;
}

/** F-223: the whisker-and-tie sentence. One string, printed under the interactive chart's leader sentence (where the
 *  reader meets the ranking) and again inside the folded official order it used to belong to; null when the data file
 *  carries no bootstrap pairs, because then there is nothing true to say about whiskers. */
function tieSentence(a: JevV15Artifact) {
  const { ties, pairs } = jevV15TieSummary(a.board[a.headline]);
  const adjacentPairs = Math.max(0, a.board[a.headline].order.length - 1);
  if (!pairs) return null;
  const untested = Math.max(0, adjacentPairs - pairs);
  return `Whiskers are 95% bootstrap intervals. ${ties} of ${pairs} adjacent pairs with published paired-bootstrap comparisons are statistical ties — read the order as a ranking, not the gaps as significant.${untested ? ` No paired comparison is published for the other ${untested} adjacent pairs, so no tie classification is inferred.` : ''}`;
}

/** The official headline bars: every ranked system, the four axes and cost, plus secondary option ranks. */
function HeadlineBars({ a, ranked }: { a: JevV15Artifact; ranked: JevV15System[] }) {
  const headline = a.headline;
  const markers = a.board[headline].markers ?? [];
  const tieBelow = new Map(markers.filter((m) => m.tie).map((m) => [m.upper, m.lower]));
  const named = new Map(a.systems.map((s) => [s.key, short(s.display)]));
  const leader = jevV15LeaderSentence(a.board[headline], (key) => named.get(key) ?? key);
  const w = a.options[headline].weights;
  const weightText = `${w.intelligence} · ${w.calibration} · ${w.speed} · ${w.cost}`;
  const secondary = JEVBENCH_V15_OPTIONS.filter((o) => o !== headline) as [JevV15Option, JevV15Option];
  // F-223 (Fable pass 42): one ranking, one figure. This static rendering of the official order is the third printing of
  // the same ranking on the page, so it folds; every marker, row and interval stays in the document for the readers and
  // verifiers that look for them. The interactive chart above now carries the whiskers and the tie sentence.
  return <details className="mt-10" data-bh-jev15-bars-fold>
    <summary className="cursor-pointer text-sm font-semibold text-accent" data-bh-jev15-bars-summary>Official order with 95% intervals ({ranked.length} systems)</summary>
    <figure className="bh-panel mt-3 p-4 sm:p-5" data-bh-jev15-board={headline} aria-labelledby="jev15-board-title">
    <p className="bh-eyebrow">JevBench {a.revision} · headline option {headline}</p>
    <h2 id="jev15-board-title" className="mt-1 text-xl font-bold leading-snug sm:text-2xl">JevBench Score: {ranked.length} ranked systems</h2>
    <p className="bh-muted mt-1 text-sm"><span className="bh-jevc-official mr-2">Official ({headline})</span>weighted harmonic mean of four 0–100 axes, Intelligence · Calibration · Speed · Cost = {weightText}, with the low-axis gates · <a href="#jev15-method" className="text-accent underline">Method ↓</a></p>
    {/* F-206(d): the sentence names the systems; `jevV15LeaderSentence` already appends the artifact's `leader_wording` when it adds
        words, so the raw wording ("joint leaders (statistical tie)") is never printed on its own (pass 39: PR #53 had put it first). */}
    {leader && <p className="mt-2 text-sm font-semibold" data-bh-jev15-leader>{leader}</p>}
    {a.headline_hold && <p className="mt-2 rounded border border-amber-500/60 bg-amber-500/10 p-2 text-sm" data-bh-jev15-headline-hold>{a.headline_hold}</p>}
    <p className="bh-muted mt-1 text-xs" data-bh-jev15-ties>{tieSentence(a) ?? 'Bootstrap intervals and tie markers are not in this data file yet; they come with the official scorer output.'}</p>
    <div className="mt-4 hidden grid-cols-[1.8rem_15rem_minmax(0,1fr)_3.4rem_24rem] gap-x-2 text-[11px] sm:grid" aria-hidden="true">
      <span /><span /><span className="bh-muted font-mono">JevBench Score ({headline})</span><span className="bh-muted text-right font-mono">Score</span>
      <span className="bh-muted grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_3fr] text-right font-mono"><span>Intel.</span><span>Calib.</span><span>Speed</span><span>Cost</span><span>{secondary[0]} #</span><span>{secondary[1]} #</span><span>$/1k decisions</span></span>
    </div>
    <ol className="mt-2 grid gap-1.5" data-bh-jev15-bars>{ranked.map((row) => {
      const s = row.scores[headline];
      // F-206(b): the interval is drawn on the bar's own 0–100 scale, so the reader sees the uncertainty instead of a marker
      // that sat on 76 of 88 rows. The tie is still said, once in the note above and per row in the bar's accessible name.
      const ci = row.composite_ci95?.[headline] ?? null;
      const clamp = (v: number) => Math.max(0, Math.min(100, v));
      const lo = ci ? clamp(Math.min(ci[0], ci[1])) : null, hi = ci ? clamp(Math.max(ci[0], ci[1])) : null;
      return <li key={row.key} style={typeVar(row.class)} className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.3rem] items-center gap-x-2 text-sm sm:grid-cols-[1.8rem_15rem_minmax(0,1fr)_3.4rem_24rem]" data-bh-jev15-bar={row.key} data-bh-jev15-global-filter-row={row.key}
        aria-label={`${row.display}: JevBench Score ${one(s)}, rank ${row.ranks[headline]}. Intelligence ${one(row.axes.intelligence)}, calibration ${one(row.axes.calibration)}, speed ${one(row.axes.speed)}, cost ${one(row.axes.cost)}.${ci ? ` 95% interval ${one(lo)} to ${one(hi)}.` : ''}${tieBelow.has(row.key) ? ' Statistical tie with the next row.' : ''}`}>
        <span className="bh-muted tabular-nums col-start-1 row-start-1 text-right text-xs">{row.ranks[headline]}</span>
        <span className="col-start-2 row-start-1 min-w-0 sm:text-right" title={row.display}>
          <span className="block truncate sm:text-right">{short(row.display)}<Tags row={row} /></span>
          <BaseModelDisplay systemKey={row.key} className="mt-0.5 block text-[10.5px] font-normal leading-tight sm:text-right" />
        </span>
        <span className="bh-jevc-grid relative col-start-2 row-start-2 mt-1 flex h-4 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:h-6" aria-hidden="true">
          {s != null && <span className="bh-jevc-bar" style={{ width: `${Math.max(0, Math.min(100, s)).toFixed(3)}%` }} />}
          {lo != null && hi != null && <span className="bh-jevc-ci" data-bh-jev15-ci={row.key} style={{ left: `${lo.toFixed(3)}%`, width: `${(hi - lo).toFixed(3)}%` }} />}
        </span>
        <b className="tabular-nums col-start-3 row-span-2 row-start-1 self-center text-right text-base sm:col-start-4 sm:row-span-1 sm:text-lg">{one(s)}</b>
        <span className="bh-muted col-start-2 row-start-3 mt-0.5 min-w-0 font-mono text-[10.5px] sm:col-start-5 sm:row-start-1 sm:mt-0 sm:grid sm:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_3fr] sm:whitespace-nowrap sm:text-right sm:text-[12px]">
          <span className="sm:hidden">I </span><span>{f0(row.axes.intelligence)}</span><span className="sm:hidden"> · C </span><span>{f0(row.axes.calibration)}</span>
          <span className="sm:hidden"> · S </span><span>{f0(row.axes.speed)}</span><span className="sm:hidden"> · K </span><span>{f0(row.axes.cost)}</span>
          <span className="sm:hidden"> · {secondary[0]}#</span><span>{row.ranks[secondary[0]]}</span><span className="sm:hidden"> · {secondary[1]}#</span><span>{row.ranks[secondary[1]]}</span>
          <span className="sm:hidden"> · </span>{costCell(row)}
        </span>
      </li>;
    })}</ol>
    <p className="bh-muted mt-3 text-xs" data-bh-jev15-cost-legend>{COST_LEGEND}</p>
    </figure>
  </details>;
}

function OptionsTable({ a, ranked }: { a: JevV15Artifact; ranked: JevV15System[] }) {
  const secondary = JEVBENCH_V15_OPTIONS.filter((o) => o !== a.headline) as [JevV15Option, JevV15Option];
  // F-223: the ranked systems appear a fourth time under the two secondary weight options; fold to save space.
  return <details className="mt-10" data-bh-jev15-options-fold>
    <summary className="cursor-pointer text-sm font-semibold text-accent" data-bh-jev15-options-summary>All three weight options ({ranked.length} systems)</summary>
    <section className="mt-3" aria-labelledby="jev15-options" data-bh-jev15-options>
    <h2 id="jev15-options" className="scroll-mt-6 text-xl font-semibold">All three weight options</h2>
    <p className="bh-muted mt-1 max-w-4xl text-sm">A is the official headline: equal 25/25/25/25 axis weights and an Intelligence floor of 50. B remains the secondary 40/20/20/20 axis-weight view; C retains equal axes with an Intelligence floor of 60. All three use equal Choice/Noul/Score weights. The CI column is the paired-bootstrap 95% interval of the {a.headline} score.</p>
    <div className="mt-3 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[760px] text-sm" aria-label="Scores and ranks under options A, B and C">
        <thead><tr className="bg-[var(--surface)]"><Th right>#{a.headline}</Th><Th right={false}>System</Th>
          {JEVBENCH_V15_OPTIONS.map((o) => <Th key={o} title={`Weights ${Object.values(a.options[o].weights).join('/')}, Intelligence floor ${a.options[o].intelligence_floor}`}>{OPTION_LABEL[o]}</Th>)}
          <Th>#{secondary[0]}</Th><Th>#{secondary[1]}</Th><Th>{a.headline} 95% CI</Th></tr></thead>
        <tbody>{ranked.map((row) => <tr key={row.key} className="border-t border-line" data-bh-jev15-option-row={row.key} data-bh-jev15-global-filter-row={row.key}>
          <NameCell row={row} rank={row.ranks[a.headline]} />
          {JEVBENCH_V15_OPTIONS.map((o) => <td key={o} className={`p-2 text-right tabular-nums ${o === a.headline ? 'font-bold' : ''}`}>{one(row.scores[o])}</td>)}
          <td className="p-2 text-right tabular-nums">{row.ranks[secondary[0]]}</td><td className="p-2 text-right tabular-nums">{row.ranks[secondary[1]]}</td>
          <td className="bh-muted whitespace-nowrap p-2 text-right tabular-nums">{row.composite_ci95?.[a.headline] ? `${one(row.composite_ci95[a.headline]![0])}–${one(row.composite_ci95[a.headline]![1])}` : '—'}</td>
        </tr>)}</tbody>
      </table>
    </div>
    </section>
  </details>;
}

// F-224 (Fable pass 42): the section keeps its heading, id and `data-bh-jev15-axes` marker; the two panes below it hold
// the columns that belong together. The name is unchanged because the page's section order is pinned by `<AxesTable`.
function AxesTable({ a, rows }: { a: JevV15Artifact; rows: JevV15System[] }) {
  return <section className="mt-10" aria-labelledby="jev15-axes" data-bh-jev15-axes>
    <h2 id="jev15-axes" className="scroll-mt-6 text-xl font-semibold">Axes, request types, latency and cost</h2>
    <JevAxesViews axes={<AxesView a={a} rows={rows} view="axes" />} types={<AxesView a={a} rows={rows} view="types" />} />
  </section>;
}

function AxesView({ a, rows, view }: { a: JevV15Artifact; rows: JevV15System[]; view: 'axes' | 'types' }) {
  const cc = (row: JevV15System, split: string, t: string) => row.intelligence?.per_type_split?.[`${split}|${t}`]?.cc;
  const sup = (row: JevV15System, t: string) => row.support?.[t as 'choice'] ?? null;
  const isAxes = view === 'axes';
  // The phone note is only true on a phone: at 1440 neither view scrolls sideways any more.
  const phoneNote = <span className="sm:hidden"> On a phone the name column stays put while the table scrolls sideways.</span>;
  return <>
    <p className="bh-muted mt-2 max-w-4xl text-sm" data-bh-jev15-axes-intro={view}>{isAxes
      ? <>Every measured system, under the four score axes. Intelligence is 50% open ({a.sample.open} decisions) and 50% sealed ({a.sample.sealed}); Gap = I_open − I_sealed, and the penalty applies only above the field median gap (G_med {one(a.G_med)}) plus 8. The per-type competence, latency and price of the same systems are in <b>Types &amp; cost</b>.{phoneNote}</>
      : <>The same systems, by what was asked and what it cost. Per-type columns are chance-corrected competence (CC, 0 = chance) for Choice, Noul and Score, open / sealed; I open and I sealed are the two halves of Intelligence. Latency is adjusted p50 / p95; cost is per 1,000 decisions.{phoneNote}</>}</p>
    <div className="mt-3 overflow-x-auto rounded-xl border border-line" data-bh-jev15-axes-wrap={view}>
      <table className={`w-full text-sm ${isAxes ? 'min-w-[680px]' : 'min-w-[940px]'}`} aria-label={isAxes ? 'Per-system score axes' : 'Per-system request types, latency and cost'}>
        <thead><tr className="bg-[var(--surface)]">
          <Th>#{a.headline}</Th><Th right={false}>System</Th>
          {isAxes ? <><Th>Score</Th><Th>Intel.</Th><Th>Calib.</Th><Th>Speed</Th><Th>Cost</Th><Th>Gap</Th><Th title="Overfit multiplier on Intelligence">Penalty</Th></> : <>
            <Th title="Intelligence on the open set">I open</Th><Th title="Intelligence on the sealed set">I sealed</Th>
            {JEVBENCH_V15_TYPES.map((t) => <Th key={t} title={`${TYPE_LABEL[t]} competence, open / sealed`}>{TYPE_LABEL[t]} o / s</Th>)}
            <Th title="Latency p50 / p95, adjusted">p50 / p95</Th><Th title="Cost per 1,000 decisions">$/1k decisions</Th><Th right={false}>Endpoint</Th></>}
        </tr></thead>
        <tbody>{rows.map((row) => {
          const i = row.intelligence;
          return <tr key={row.key} className={`border-t border-line ${row.ranked ? '' : 'opacity-80'}`} data-bh-jev15-row={row.key} data-bh-jev15-listing={row.listing} data-bh-jev15-global-filter-row={row.key}>
            <NameCell row={row} rank={row.ranks[a.headline] ?? <span className="bh-muted text-xs font-normal">–</span>} />
            {isAxes ? <>
              <td className="p-2 text-right font-bold tabular-nums">{row.ranked ? one(row.jevbench_score) : <span className="bh-muted font-normal" title={row.not_ranked_because ?? undefined}>—</span>}</td>
              <td className="p-2 text-right tabular-nums">{one(row.axes.intelligence)}</td><td className="p-2 text-right tabular-nums">{one(row.axes.calibration)}</td>
              <td className="p-2 text-right tabular-nums">{one(row.axes.speed)}</td><td className="p-2 text-right tabular-nums">{row.listing === 'unpriced' ? <span className="bh-muted">n/a</span> : one(row.axes.cost)}</td>
              <td className="p-2 text-right tabular-nums">{signed(i?.gap)}</td><td className="p-2 text-right tabular-nums">{i?.penalty == null ? '—' : `×${i.penalty.toFixed(3)}`}</td>
            </> : <>
              <td className="p-2 text-right tabular-nums">{one(i?.I_open)}</td><td className="p-2 text-right tabular-nums">{one(i?.I_sealed)}</td>
              {JEVBENCH_V15_TYPES.map((t) => <td key={t} className="whitespace-nowrap p-2 text-right tabular-nums" title={sup(row, t) ? `support: ${sup(row, t)}` : undefined}>
                {sup(row, t) === 'unsupported' || sup(row, t) === 'not supported' ? <span className="bh-muted">not supported</span> : <>{f0(cc(row, 'open', t))} / {f0(cc(row, 'sealed', t))}</>}
              </td>)}
              <td className="whitespace-nowrap p-2 text-right tabular-nums" title={row.speed.adjustment ? `Adjustment: ${row.speed.adjustment}; raw p50 ${secs(row.speed.p50_s_raw)}, p95 ${secs(row.speed.p95_s_raw)}` : undefined}>{secs(row.speed.p50_s_adjusted)} / {secs(row.speed.p95_s_adjusted)}</td>
              <td className="whitespace-nowrap p-2 text-right tabular-nums">{costCell(row)}</td>
              <td className="bh-muted whitespace-nowrap p-2 text-xs" title={row.endpoint_condition ?? undefined}>{row.endpoint_kind === 'gpu' ? `GPU pod${row.gpu ? ` (${row.gpu})` : ''}` : row.endpoint_kind === 'cpu' ? (row.addendum?.id === 'A4' ? 'CPU (shared host)' : 'CPU container') : row.endpoint_kind === 'demo' ? 'author demo endpoint' : row.endpoint_kind === 'api' ? 'hosted API' : '—'}</td>
            </>}
          </tr>;
        })}</tbody>
      </table>
    </div>
    {/* The cost legend and the API note explain columns that only the second view prints. */}
    {!isAxes && <>
      <p className="bh-muted mt-2 text-xs" data-bh-jev15-cost-legend>{COST_LEGEND}</p>
      <p className="bh-muted mt-2 text-xs" data-bh-jev15-api-note>API = the operator&apos;s endpoint received sealed item text during evaluation, without answers. Sealed item text, answers and item-level results stay private; only system-level aggregates appear here. Hover a cost for its price basis and a latency for its raw values and adjustment.</p>
    </>}
  </>;
}

function Honorable({ a, rows }: { a: JevV15Artifact; rows: JevV15System[] }) {
  if (!rows.length) return null;
  return <section className="bh-panel mt-10 max-w-5xl p-5" aria-labelledby="jev15-honorable" data-bh-jev15-honorable>
    <h2 id="jev15-honorable" className="text-lg font-semibold">Honorable mentions and Jev wrappers — listed separately, not ranked ({rows.length})</h2>
    <p className="bh-muted mt-1 text-sm">Eligibility rule: services that run on Jev itself may be measured and shown as honorable mentions, but are not competitors ranked against Jev and do not enter the field median gap (G_med) or tie markers. classifier.dev (TypeSafe) runs on Jev, so it stays unranked under this rule.</p>
    <ul className="bh-muted mt-2 space-y-1 text-sm">{rows.map((r) => <li key={r.key} data-bh-jev15-honorable-row={r.key} data-bh-jev15-global-filter-row={r.key}><b>{r.display}</b><Tags row={r} />: {r.not_ranked_because}. Official ({a.headline}) score {r.scores?.[a.headline] != null ? r.scores[a.headline]!.toFixed(1) : '–'}.</li>)}</ul>
  </section>;
}

function Addendum({ a, rows }: { a: JevV15Artifact; rows: JevV15System[] }) {
  if (!rows.length) return null;
  const interval = (row: JevV15System, option: 'A' | 'B' | 'C') => {
    const ci = row.composite_ci95?.[option];
    return ci ? `${one(ci[0])}–${one(ci[1])}` : 'CI unavailable';
  };
  const score = (row: JevV15System, option: 'A' | 'B' | 'C') => <>{one(row.scores[option])} <span className="bh-muted">{interval(row, option)}</span></>;
  if (a.revision === 'v1.5.1' || a.revision === 'v1.5.2' || a.revision === 'v1.5.3' || a.revision === 'v1.5.4' || a.revision === 'v1.5.5') return <section className="bh-panel mt-10 max-w-5xl p-5" aria-labelledby="jev15-addendum" data-bh-jev15-addendum-section>
    <h2 id="jev15-addendum" className="text-lg font-semibold">Roster addendum: newcomers scored on the same frozen protocol ({rows.length})</h2>
    <p className="bh-muted mt-1 text-sm">All {rows.length} {a.revision === 'v1.5.5' ? 'A1/A2/A3/A4/A5/A6' : a.revision === 'v1.5.4' ? 'A1/A2/A3/A4/A5' : a.revision === 'v1.5.3' ? 'A1/A2/A3/A4' : a.revision === 'v1.5.2' ? 'A1/A2/A3' : 'A1/A2'} systems below completed all {a.sample.total.toLocaleString('en-US')} decisions and now have official ranks in A, B, and C; the interactive score presets also include them. Their scores, individual 95% intervals, and the frozen v1.5.0 G_med are unchanged. No new paired-bootstrap comparisons were computed for addendum systems. Existing tie markers are retained only for base-system pairs that remain adjacent; no tie or separation is inferred for the other pairs.</p>
    <div className="mt-3 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[900px] text-sm" data-bh-jev15-addendum-table aria-label="Completed roster addendum systems with official ranks and scores in options A, B, and C">
        <thead><tr className="bg-[var(--surface)]">
          <Th right={false}>System</Th>
          <Th>Rank (A)</Th><Th title="Individual 95% bootstrap interval">A score · 95% CI</Th>
          <Th>Rank (B)</Th><Th title="Individual 95% bootstrap interval">B score · 95% CI</Th>
          <Th>Rank (C)</Th><Th title="Individual 95% bootstrap interval">C score · 95% CI</Th>
        </tr></thead>
        <tbody>{rows.map((r) => <tr key={r.key} className="border-t border-line" data-bh-jev15-addendum-row={r.key} data-bh-jev15-global-filter-row={r.key}>
          <th scope="row" className="whitespace-nowrap p-2 text-left font-semibold" style={typeVar(r.class)}>
            <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[rgb(var(--jev-t))] align-middle" aria-hidden="true" />
            <span title={r.display}>{short(r.display)}</span><Tags row={r} />
          </th>
          {(['A', 'B', 'C'] as const).flatMap((option) => [
            <td key={`${r.key}-${option}-rank`} className="whitespace-nowrap p-2 text-right tabular-nums">#{r.ranks[option]}</td>,
            <td key={`${r.key}-${option}-score`} className="whitespace-nowrap p-2 text-right tabular-nums">{score(r, option)}</td>,
          ])}
        </tr>)}</tbody>
      </table>
    </div>
    <p className="bh-muted mt-2 text-xs" data-bh-jev15-addendum-legend>Ranks follow option scores; score intervals are per system, not pairwise rank comparisons. Every slider preset sorts these same ranked systems using its selected weights.</p>
  </section>;

  // F-210 (pass 39): six newcomers were six paragraphs that each repeated the placement, the score at two precisions and the
  // frozen-order caveat. The facts are a small matrix, so they are a table: the caveat is said once, in the intro above.
  const PLACE_TITLE = (o: 'A' | 'B') => `Placement against the frozen v1.5.0 base under the ${o === 'A' ? 'official A' : 'secondary B'} weights`;
  const CI_TITLE = '95% paired-bootstrap interval';
  const dash = <span className="bh-muted">—</span>;
  return <section className="bh-panel mt-10 max-w-5xl p-5" aria-labelledby="jev15-addendum" data-bh-jev15-addendum-section>
    <h2 id="jev15-addendum" className="text-lg font-semibold">Roster addendum: newcomers scored on the same frozen protocol ({rows.length})</h2>
    <p className="bh-muted mt-1 text-sm">Added by separately hashed roster addenda before they ran. Same frozen sample, method, price rules and v1.5.0 median gap. These rows stay outside the v1.5.0 order and its tie markers. A and secondary B placement compare each row with the frozen base point estimates only; each row's interval is shown separately and does not establish a tie with a base row or another addendum.</p>
    <div className="mt-3 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[640px] text-sm" data-bh-jev15-addendum-table aria-label="Roster addendum systems, their placement against the frozen base and their scores">
        <thead><tr className="bg-[var(--surface)]">
          <Th right={false}>System</Th>
          <Th title={PLACE_TITLE('A')}>Would place (A)</Th><Th title={CI_TITLE}>A score · 95% CI</Th>
          <Th title={PLACE_TITLE('B')}>Would place (B)</Th><Th title={CI_TITLE}>B score · 95% CI</Th>
        </tr></thead>
        <tbody>{rows.map((r) => <tr key={r.key} className="border-t border-line" data-bh-jev15-addendum-row={r.key} data-bh-jev15-global-filter-row={r.key}>
          <th scope="row" className="whitespace-nowrap p-2 text-left font-semibold" style={typeVar(r.class)} title={r.not_ranked_because ?? undefined}>
            <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[rgb(var(--jev-t))] align-middle" aria-hidden="true" />
            <span title={r.display}>{short(r.display)}</span><Tags row={r} />
          </th>
          <td className="whitespace-nowrap p-2 text-right tabular-nums">{r.would_place_A == null ? dash : `#${r.would_place_A}`}</td>
          <td className="whitespace-nowrap p-2 text-right tabular-nums">{r.would_place_A == null ? dash : score(r, 'A')}</td>
          <td className="whitespace-nowrap p-2 text-right tabular-nums">{r.would_place_B == null ? dash : `#${r.would_place_B}`}</td>
          <td className="whitespace-nowrap p-2 text-right tabular-nums">{r.would_place_B == null ? dash : score(r, 'B')}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="bh-muted mt-2 text-xs" data-bh-jev15-addendum-legend>Score followed by its 95% interval. Placements compare point estimates with the frozen base only.</p>
  </section>;
}

function NotRanked({ a, partial, unpriced }: { a: JevV15Artifact; partial: JevV15System[]; unpriced: JevV15System[] }) {
  return <section className="bh-panel mt-10 max-w-5xl p-5" aria-labelledby="jev15-unranked" data-bh-jev15-unranked>
    <h2 id="jev15-unranked" className="text-lg font-semibold">Not ranked: partial, unpriced and unmeasured systems</h2>
    <p className="bh-muted mt-1 text-sm">These systems are part of the {a.roster_count}-system v1.5 roster but have no rank. Their numbers are never shown as zero or free.</p>
    {partial.length > 0 && <><h3 className="mt-4 font-semibold">Partial runs ({partial.length})</h3>
      <ul className="bh-muted mt-1 space-y-1 text-sm">{partial.map((r) => <li key={r.key} data-bh-jev15-partial={r.key} data-bh-jev15-global-filter-row={r.key}><b>{r.display}</b><Tags row={r} />: {r.not_ranked_because}</li>)}</ul></>}
    {unpriced.length > 0 && <><h3 className="mt-4 font-semibold">Measured, unpriced ({unpriced.length})</h3>
      <ul className="bh-muted mt-1 space-y-1 text-sm">{unpriced.map((r) => <li key={r.key} data-bh-jev15-unpriced={r.key} data-bh-jev15-global-filter-row={r.key}><b>{r.display}</b><Tags row={r} />: {r.not_scored_reason}. No Cost axis and no score until a price qualifies under the v1.5 price rules.</li>)}</ul></>}
    {a.not_measured.length > 0 && <><h3 className="mt-4 font-semibold">Incomplete or not measured in v1.5 ({a.not_measured.length})</h3>
      <ul className="bh-muted mt-1 space-y-1 text-sm" data-bh-jev15-not-measured>{a.not_measured.map((r) => <li key={r.key} data-bh-jev15-unmeasured-row={r.key} data-bh-jev15-global-filter-row={r.key}><b>{r.display}</b>{r.addendum ? <span className="bh-thin-tag ml-1">{r.addendum.label}</span> : null}: {r.reason ?? r.status}{r.rows != null && r.missing != null ? ` (${r.rows.toLocaleString('en-US')}/${a.sample.total.toLocaleString('en-US')} rows; ${r.missing.toLocaleString('en-US')} missing)` : ''}. <BaseModelDisplay systemKey={r.key} className="ml-1 text-xs" /></li>)}</ul>
      <p className="bh-muted mt-1 text-xs">Incomplete and unmeasured systems receive no official rank. Existing results from earlier benchmark versions remain on their frozen version pages.</p></>}
  </section>;
}

function Method({ a, sha256 }: { a: JevV15Artifact; sha256: string }) {
  return <section id="jev15-method" className="bh-panel mt-10 max-w-5xl scroll-mt-6 p-5" aria-labelledby="jev15-method-head" data-bh-jev15-method>
    <h2 id="jev15-method-head" className="text-lg font-semibold">Method notes: what changed in v1.5</h2>
    <h3 className="mt-4 text-base font-semibold">The four axes</h3>
    <dl className="mt-2 grid gap-3 text-sm sm:grid-cols-2" data-bh-jev15-four-axes>
      <div><dt className="font-semibold">Intelligence · 25%</dt><dd className="bh-muted mt-1">How often answers are right above chance: each type is normalized against its task-specific random baseline (chance = 0, perfect = 100; below-chance tiers can be negative). Choice, Noul and Score count one third each. Easy, Standard, Judge and Hard items count 10%, 20%, 30% and 40%; the open and sealed sets count equally.</dd></div>
      <div><dt className="font-semibold">Calibration · 25%</dt><dd className="bh-muted mt-1">How closely stated probabilities match what happens. It uses ECE and TVD for Choice, ECE and Brier for Noul, and normalized RPS plus top-level ECE for Score. The three types count equally; open and sealed items are pooled.</dd></div>
      <div><dt className="font-semibold">Speed · 25%</dt><dd className="bh-muted mt-1">Serial response latency on open Standard and Judge items. The p50 and p95 each get a log score: 100 − 20 × log₁₀(seconds ÷ 0.1), then are averaged. Self-hosted and demo endpoints get the published ×2 plus 0.15-second adjustment.</dd></div>
      <div><dt className="font-semibold">Cost · 25%</dt><dd className="bh-muted mt-1">Estimated or billed US dollars per 1,000 decisions, using pooled token use across {a.sample.total.toLocaleString('en-US')} decisions and the documented price rules. The log score is 100 − 30 × log₁₀(cost ÷ $0.001). The price reference is $0.001 per 1,000 decisions.</dd></div>
    </dl>
    <p className="bh-muted mt-3 text-sm">The official score is the weighted harmonic mean of the four axes. Option A gives each axis 25%; option B (40/20/20/20) is a secondary view, while option C keeps equal axes and sets the Intelligence gate at 60. In A and B, Intelligence, Speed and Cost each have a quadratic gate below 50. To limit benchmaxxing on the public items, the open-minus-sealed Intelligence gap may be up to 8 points above the field median (<code>G_med</code>) before a penalty applies. Each further point lowers the multiplier on unpenalized Intelligence by one percentage point.</p>
    <p className="bh-muted mt-2 text-sm">Frozen method <a className="text-accent underline" href={JEVBENCH_V15_METHOD_URL}>METHOD-v1.5</a>, SHA-256 <Sha v={a.method_sha256} id="method" />; pricing addendum <a className="text-accent underline" href={JEVBENCH_V15_PRICING_URL}>v1.5-M2</a>, SHA-256 <Sha v={a.pricing_addendum_sha256} />.</p>
    <p className="bh-muted mt-2 text-sm">The method owner chose equal axis weights and equal weights for Choice, Noul and Score after reviewing the What-If Lab, preserving continuity with v1.4 and treating the three decision types equally. Disclosed headline amendment: <a className="text-accent underline" href={JEVBENCH_V15_HEADLINE_METHOD_URL}>equal-axis, equal-type A</a>, SHA-256 <Sha v={a.headline_method_addendum_sha256} />. B remains a secondary view.</p>
    <p className="bh-muted mt-2 text-sm" data-bh-reevaluation-policy><b>Re-evaluation policy.</b> Every release re-evaluates the current top 10 on the composite score. Models ranked #11 and below are re-evaluated on a slower cadence — at least monthly, or with every third scheduled refresh release, whichever comes first — and their score is shown as last measured on its release. A material method change re-evaluates every model. Paid fast-lane runs are evaluated within 48 hours of payment, and new submissions are evaluated in the order received.</p>
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="JevBench v1.5 method documents" data-bh-jev15-method-links>{JEVBENCH_V15_METHOD_LINKS.map((doc) => <li key={doc.filename}><a className="text-accent underline" href={doc.url}>{doc.label}</a></li>)}</ul>
    <ul className="bh-muted mt-3 list-disc space-y-2 pl-5 text-sm">
      <li>{a.sample.total.toLocaleString('en-US')} decisions per system: {a.sample.open} open ({a.sample.published_open} published) and {a.sample.sealed} sealed, drawn fresh from a private pool with the same tier mix as the open set. Sealed counts for 50% of Intelligence: <code>base = 0.5 × I_open + 0.5 × I_sealed</code>.</li>
      <li>Three request types are scored natively and chance-corrected per item: Choice, Noul and Score each receive one third. Tier weights easy / standard / judge / hard = 10 / 20 / 30 / 40. A type a system does not support is excluded, never scored zero; only full-coverage systems are ranked.</li>
      <li>Overfit penalty relative to the field: <code>excess = gap − G_med</code>, <code>penalty = max(0, 1 − max(0, excess − 8) / 100)</code>. G_med for this batch is {one(a.G_med)} CC points{a.G_med_flag_gt10 ? ' (above 10: the difficulty-mismatch flag is set)' : ''}.</li>
      <li>Calibration is typed (Choice ECE/TVD, Noul ECE with Brier, Score normalised RPS and top-level ECE), pooled over open and sealed. Speed and Cost formulas are unchanged from v1.4; self-hosted and demo endpoints carry the ×2 + 0.15 s adjustment. A manufacturer's standard, non-promotional launch list price counts from day one, but a newer price cut younger than 30 days does not. Rows without token counts use the measured proxy-token basis. A system without any eligible public, bookable price is listed as unpriced.</li>
      <li>The frozen 25 Sep DeepInfra snapshot records Qwen3.5-4B as deprecated on 11 Jun 2026 and replaced by Qwen3.5-9B. Its frozen snapshot rates remain the v1.5 M2 reference; price basis tooltips and the correction note disclose this. Pricing disclosure correction SHA-256: <Sha v={a.pricing_disclosure_correction_sha256} />.</li>
      <li>Composite: weighted harmonic mean with the Intelligence, Speed and Cost gates below 50 (Intelligence below 60 in option C). The official headline A uses equal 25 / 25 / 25 / 25 axis weights and Intelligence floor 50. B remains the secondary 40 / 20 / 20 / 20 view; C keeps equal axes and Intelligence floor 60. Ties come from the paired bootstrap. <span data-bh-jev-gates-method>The gates belong to the score, not to the weights: in the custom-weight views of the score chart they still apply to an axis set to 0, as in the published views — so “Intelligence only” follows the Intelligence column except for systems with Cost, Speed or Intelligence below 50 (a general-purpose LLM with Cost 39 keeps only (39/50)², about 0.61, of its score). Every gated row carries a “gate ×…” tag naming the axis and factor, and the weights panel lists the gates that fire.</span></li>
      <li>{a.revision === 'v1.5.2' || a.revision === 'v1.5.3' || a.revision === 'v1.5.4' || a.revision === 'v1.5.5' ? <>All {a.systems.filter((system) => system.addendum != null && system.status?.status === 'complete').length} full-coverage systems marked with a <b>v1.5 roster addendum</b> label are officially ranked in A, B, C, and every score preset. Their scores, individual intervals, method, pricing rules and frozen G_med are unchanged. No new paired-bootstrap comparison is inferred for addendum pairs.</> : a.revision === 'v1.5.1' ? <>The nine full-coverage systems marked with a <b>v1.5 roster addendum</b> label are officially ranked in A, B, C, and every score preset. Their scores, individual intervals, method, pricing rules and frozen G_med are unchanged. No new paired-bootstrap comparison is inferred for addendum pairs.</> : <>Rows marked with a <b>v1.5 roster addendum</b> label were added by separately hashed roster addenda: same frozen sample, method, pricing rules and G_med. They remain outside the base release order and its tie markers.</>}</li>
      <li>Before every release we review the leaderboard for anomalies and close loopholes with general, documented rules. The page and Git repository provide transparent data and method details; Benchmark Heaven owns its rules.</li>
    </ul>
    <p className="bh-muted mt-3 text-xs" data-bh-jev15-provenance>Data file SHA-256 <code className="break-all">{sha256}</code> · scorer output SHA-256 <code className="break-all">{a.source_sha256}</code> · run kind <b>{a.run_kind}</b>.</p>
  </section>;
}

/** CR-205: the "What the run says" findings block the v1.4.2.2 page carried, computed from the v1.5 board. */
function Findings({ a, jevClass, ranked, honorable, partial, addendum }: {
  a: JevV15Artifact; jevClass: ReturnType<typeof jevClassView>; ranked: JevV15System[];
  honorable: JevV15System[]; partial: JevV15System[]; addendum: JevV15System[];
}) {
  const [lead] = ranked;
  const capabilityLead = jevClass.rows.find((r) => r.inClass && r.row.ranked);
  const inClass = jevClass.rows.filter((r) => r.inClass).length;
  const bestOpen = ranked.find((r) => r.key !== lead?.key && r.class === 'jev-rebuild' && jevV15OpenSource(r))
    ?? ranked.find((r) => r.key !== lead?.key && jevV15OpenSource(r));
  const topInt = ranked.filter((r) => r.key !== lead?.key).sort((x, y) => (y.axes.intelligence ?? 0) - (x.axes.intelligence ?? 0))[0];
  const topSealed = [...ranked].sort((x, y) => (y.intelligence?.I_sealed ?? -1) - (x.intelligence?.I_sealed ?? -1))[0];
  const { ties, pairs } = jevV15TieSummary(a.board[a.headline]);
  const gap = (x: number | null, y: number | null) => x == null || y == null ? null : (Math.round(x * 10) - Math.round(y * 10)) / 10;
  return <section className="mt-10 max-w-4xl" aria-labelledby="jev15-findings" data-bh-jev15-findings>
    <h2 id="jev15-findings" className="text-xl font-semibold">What the run says</h2>
    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px]">
      {capabilityLead && <li data-bh-jev15-capability-lead>Among the {inClass} Jev-class systems, <b>{short(capabilityLead.row.display)}</b> has the highest JevBench Capability Score, {one(capabilityLead.capability)} (Intelligence {one(capabilityLead.row.axes.intelligence)}, Calibration {one(capabilityLead.row.axes.calibration)}).</li>}
      {lead && <li><b>{short(lead.display)}</b> leads the official JevBench {a.revision} score (option {a.headline}) with {one(lead.jevbench_score)}: Intelligence {one(lead.axes.intelligence)}, Calibration {one(lead.axes.calibration)}, Speed {one(lead.axes.speed)}, Cost {one(lead.axes.cost)} ({usd(lead.cost?.usd_per_1000)} per 1,000 decisions).</li>}
      {bestOpen && lead && <li>The best open or open-planned rebuild, <b>{short(bestOpen.display)}</b>, is #{bestOpen.rank} at {one(bestOpen.jevbench_score)} — {one(gap(lead.jevbench_score, bestOpen.jevbench_score))} points behind.</li>}
      {topInt && lead && topInt.key !== lead.key && <li><b>{short(topInt.display)}</b> has the highest Intelligence ({one(topInt.axes.intelligence)}) but places #{topInt.rank}: Speed {one(topInt.axes.speed)}, Cost {one(topInt.axes.cost)} — the harmonic mean does not let accuracy buy back a weak axis.</li>}
      {topSealed?.intelligence?.I_sealed != null && <li>The strongest sealed Intelligence is {one(topSealed.intelligence.I_sealed)} (<b>{short(topSealed.display)}</b>, #{topSealed.rank}); sealed items carry half of Intelligence, and an open-minus-sealed gap beyond the field median plus eight points costs Intelligence.</li>}
      {pairs > 0 && <li>{ties} of {pairs} adjacent pairs with published paired-bootstrap comparisons are statistical ties — read the order as a ranking, not the gaps as significant.{pairs < a.board[a.headline].order.length - 1 ? ' No paired comparison is published for the other adjacent pairs, so no tie classification is inferred.' : ''}</li>}
      {addendum.length > 0 && <li>{a.revision === 'v1.5.1' || a.revision === 'v1.5.2' || a.revision === 'v1.5.3' || a.revision === 'v1.5.4' || a.revision === 'v1.5.5' ? `All ${addendum.length} systems joined by separately hashed roster addenda and have official ranks in this revision; their A/B/C ranks and intervals are in the addendum table below.` : `${addendum.length} systems joined by separately hashed roster addenda; they sit outside the frozen ${a.revision} order — their placements against it are in the addendum table below.`}</li>}
      {honorable.map((r) => <li key={r.key}><b>{short(r.display)}</b> scores {one(r.jevbench_score)} but is <b>not ranked</b>: {r.not_ranked_because ?? 'it is a service running another entrant\u2019s model'}.</li>)}
      {partial.length > 0 && <li>{partial.map((r) => short(r.display)).join(', ')} did not complete the full suite; they are listed without a rank.</li>}
    </ul>
  </section>;
}

/** CR-205: the v1.4.2.2 alternatives/self-hosting guide, with v1.5 data and method links. */
function Guide({ a, ranked }: { a: JevV15Artifact; ranked: JevV15System[] }) {
  const openAlternatives = ranked.filter((r) => jevV15OpenSource(r)).slice(0, 4);
  const w = a.options[a.headline].weights;
  return <section className="mt-10 max-w-5xl" aria-labelledby="jev-alternatives-heading" data-bh-jev-seo-guide>
    <h2 id="jev-alternatives-heading" className="text-2xl font-semibold">Jev alternatives, open source and self-hosting</h2>
    <p className="bh-muted mt-2 max-w-4xl">The chart and table above compare the tested systems, not marketing claims. These are the practical answers readers most often need before choosing a Jev-class decision model.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <article className="bh-panel p-5">
        <h3 className="text-lg font-semibold">What are open-source alternatives to Jev?</h3>
        <p className="bh-muted mt-2 text-sm">The highest-ranked open entrants in this run are {openAlternatives.map((r, i) => <span key={r.key}>{i ? ', ' : ''}<a className="text-accent underline" href={jevSourceUrl(r.key, r.repo) ?? JEVBENCH_REPO} target="_blank" rel="noopener noreferrer">{short(r.display)}</a> (#{r.rank}, {one(r.jevbench_score)})</span>)}. “Open” here means the tested row publishes code or weights; check the licence and exact configuration in the board before adopting one.</p>
      </article>
      <article className="bh-panel p-5">
        <h3 className="text-lg font-semibold">Which Jev-class models can I self-host in the EU or use for GDPR-sensitive work?</h3>
        <p className="bh-muted mt-2 text-sm">Open entrants with released code or weights can run on infrastructure you choose, including EU infrastructure. That can support data residency, but neither open source nor an EU server makes a deployment GDPR-compliant by itself. Assess your data, contracts, retention, subprocessors and security for the complete setup. See Benchmark Heaven&apos;s broader <a className="text-accent underline" href="/eu">EU-hosting comparison</a>.</p>
        <p className="bh-muted mt-2 text-sm"><a className="text-accent underline" href="https://jev-router.com" target="_blank" rel="noopener noreferrer">jev-router.com</a> offers self-hosted open decision models. Neutrality disclosure: it is run by the authors of this benchmark; it receives no scoring advantage and is not a ranked entrant.</p>
      </article>
      <article className="bh-panel p-5">
        <h3 className="text-lg font-semibold">How is JevBench scored?</h3>
        <p className="bh-muted mt-2 text-sm">The official score (option {a.headline}) is the equal-weight harmonic mean of Intelligence, Calibration, Speed and Cost — {w.intelligence}/{w.calibration}/{w.speed}/{w.cost} — with an Intelligence floor of {a.options[a.headline].intelligence_floor} and low-axis gates on Speed and Cost. Version {a.revision} measures {a.sample.open.toLocaleString('en-US')} open and {a.sample.sealed.toLocaleString('en-US')} sealed decisions per system; Choice, Noul and Score each carry a third, sealed items contribute {Math.round(a.sealed_share_of_intelligence * 100)}% of Intelligence, and an open-minus-sealed gap beyond the field median costs points. <a className="text-accent underline" href="#jev15-method">Method notes</a> · <a className="text-accent underline" href="#jev15-options">options B and C</a>.</p>
      </article>
      <article className="bh-panel p-5">
        <h3 className="text-lg font-semibold">How do I submit my model?</h3>
        <p className="bh-muted mt-2 text-sm">Open an issue in the <a className="text-accent underline" href={`${JEVBENCH_REPO}/issues`} target="_blank" rel="noopener noreferrer">JevBench repository</a> with a reproducible endpoint or runnable code, the exact model and licence, and whether public JevBench items were used during development. New entrants use the same frozen harness and appear in a new version or a disclosed roster addendum. For private data, see the <a className="text-accent underline" href="/jev-models/custom-evaluation">custom evaluation options</a>.</p>
      </article>
    </div>
  </section>;
}

/** CR-205: the "What a decision costs" section, on the v1.5 price rules and per-row bases. */
function Costs({ a }: { a: JevV15Artifact }) {
  const estimated = a.systems.filter((r) => r.cost?.kind === 'estimate');
  const tariffs = a.systems.filter((r) => r.cost?.kind === 'tariff').length;
  return <section id="jev-costs-section" className="mt-10 max-w-4xl scroll-mt-6 text-sm" data-bh-jev-costs>
    <h2 className="mb-3 text-xl font-semibold">What a decision costs</h2>
    <p className="bh-panel mb-3 p-3 text-[15px]" data-bh-jev15-cost-unit-panel>
      <b>Every price here is US dollars per 1,000 decisions — not per 1,000 tokens.</b>{' '}
      One decision is a whole typed request — state, rubric and options — not a single token.
    </p>
    <JevCostsDisclosure>
      <p className="bh-muted mt-2">Systems with a public tariff (per token or per request) are priced at that tariff times the tokens we measured — {tariffs} rows carry a tariff. Systems without one — open weights, author demos, models we ran ourselves — are priced as if a <b className="text-gray-200">large inference provider</b> hosted them: the list price of the same weights, or the nearest larger sibling or size class when the exact weights are not listed. We do not use per-minute GPU rental or our own CPU time — providers buy capacity in bulk or own the hardware, and price accordingly. Price × tokens per decision = $ per 1,000 decisions, marked &ldquo;est.&rdquo;.</p>
      <p className="bh-muted mt-2" data-bh-jev-price-rules><b className="text-gray-200">Price rules (v1.5).</b> Only public, bookable list prices that have been in effect for at least 30 days count; a manufacturer&apos;s standard, non-promotional launch list price counts from day one, and promotions, subsidies, credits and free tiers never do. The scoring price is never below the market reference price of the system&apos;s base model. A system without any eligible price is listed as unpriced — no Cost axis and no score until a price qualifies. A later price change triggers a re-score with a visible note on the row.</p>
      <p className="bh-muted mt-2" data-bh-jev-api-price-rule><b className="text-gray-200">API models with a known base model (from 1 Oct 2026).</b> They are ranked at their developer&apos;s own stated API price; a striped second bar shows the score and rank they would have at the base-model reference price, the way we price self-served open weights of the same base. First applied on Image JevBench v0.1.5 (Wity-1). Self-hosted open weights retain the base-model reference price. Cloudflare rows in v1.5.5 show a separate striped Workers AI price scenario with the self-hosted latency held fixed; Workers AI latency has not been measured, and this scenario does not determine official Capability eligibility.</p>
      <ul className="mt-3 space-y-1.5" data-bh-jev-cost-rows>
        {estimated.map((r) => <li key={r.key}><b>{short(r.display)}</b> — <span className="whitespace-nowrap">~{usd(r.cost.usd_per_1000)} <span className="bh-thin-tag">est.</span></span> per 1,000 decisions: <span className="bh-muted">{r.cost.basis}</span></li>)}
      </ul>
    </JevCostsDisclosure>
  </section>;
}

/** CR-205: the Limits disclosure, adapted to the v1.5 protocol. */
function Limits({ a }: { a: JevV15Artifact }) {
  return <details id="limits" className="bh-panel mt-3 max-w-4xl scroll-mt-6 p-5" data-bh-jev15-limits>
    <summary className="cursor-pointer text-sm font-semibold">Limits</summary>
    <ul className="bh-muted mt-4 list-disc space-y-2 pl-5 text-sm">
      <li>{a.sample.total.toLocaleString('en-US')} decisions per system ({a.sample.open.toLocaleString('en-US')} open, {a.sample.sealed.toLocaleString('en-US')} sealed) is a measurement, not a census, and it is English-only.</li>
      <li>The weights are a choice. Option {a.headline} weights the four axes equally and uses a harmonic mean, so the weakest axis dominates; options B and C are published alternatives and the weight sliders re-score the same axes for exploration — only the official option gives the official score and rank. If a wrong decision costs you more than a slow or expensive one, read the Intelligence column and the per-type competence rather than the score alone.</li>
      <li data-bh-jev15-latency-limit><b className="text-gray-200">The latency adjustment (×2, +0.15 s on our own servers and demo endpoints) is an assumption, not a measurement.</b> We ran the self-hosted and demo endpoints one request at a time (parallelism 1, no other load), so their latency is likely better than the same model on a busy production server. Serving under load trades per-user speed for throughput. The +0.15 s stands for infrastructure our self-hosted tests lacked: authentication, load balancing, logging, billing and an API gateway. Both numbers are assumptions; raw p50/p95 latencies are in the table and the <a className="text-accent underline" href={JEVBENCH_REPO}>repo</a>.</li>
      <li>Held-out decisions are sent to the evaluated services to get predictions. Not public is not the same as not seen.</li>
      <li>Latency is one origin at one time of day; hosted endpoints, public demos and our own pods are different kinds of latency. Public demo endpoints are shared with everyone else using them.</li>
      <li>Estimated costs describe what a large inference provider would charge for a model of that size, not what the author pays; a system on a tariff pays its tariff.</li>
    </ul>
  </details>;
}

/** CR-205: the Credit disclosure — harness repo, per-system author/licence/source, and the 3D library line. */
function Credit({ a }: { a: JevV15Artifact }) {
  const credits = [...a.systems].sort((x, y) => x.display.localeCompare(y.display));
  return <details id="credit" className="bh-panel mt-3 max-w-4xl scroll-mt-6 p-5" data-bh-jev15-credit>
    <summary className="cursor-pointer text-sm font-semibold">Credit</summary>
    <div className="bh-muted mt-4 space-y-3 text-sm">
      <p>Harness, public tasks and every scoring rule: <a className="text-accent underline" href={JEVBENCH_REPO}>github.com/fstandhartinger/jevbench</a> (MIT). Each project links its author&apos;s repository or vendor page.</p>
      <ul className="list-disc space-y-1.5 pl-5" data-bh-jev-credits>
        {credits.map((r) => <li key={r.key}><b className="text-gray-200">{r.display}</b> — {r.author}, {r.licence}{r.repo && <> — <a className="text-accent underline" href={r.repo} target="_blank" rel="noopener noreferrer">{r.repo.replace(/^https:\/\//, '')}</a></>}</li>)}
      </ul>
      <p>Authors: if we tested the wrong configuration, tell us and we will rerun it. New entrants become a new version or a disclosed roster addendum rather than silently changing this one.</p>
      <p data-bh-jev-credit-3d>3D view: three.js r128 (MIT).</p>
    </div>
  </details>;
}

export function JevBenchV15({ artifact: a, sha256, previousKeys = [] }: { artifact: JevV15Artifact; sha256: string; previousKeys?: string[] }) {
  const ranked = a.systems.filter((s) => s.listing === 'ranked').sort((x, y) => (x.rank ?? 999) - (y.rank ?? 999));
  const partial = a.systems.filter((s) => s.listing === 'partial' || s.listing === 'unranked');
  const honorable = a.systems.filter((s) => s.listing === 'honorable_mention');
  const addendum = a.systems.filter((s) => s.addendum != null && (!['v1.5.3', 'v1.5.4', 'v1.5.5'].includes(a.revision) || s.ranked)).sort((x, y) => (x.rank ?? x.would_place_A ?? 999) - (y.rank ?? y.would_place_A ?? 999));
  const unpriced = a.systems.filter((s) => s.listing === 'unpriced');
  // v1.5.1 and v1.5.2 keep wrappers and other non-eligible rows out of every ranked visualization. v1.5.0 stays frozen.
  const chartData = a.revision === 'v1.5.1' || a.revision === 'v1.5.2' || a.revision === 'v1.5.3' || a.revision === 'v1.5.4' || a.revision === 'v1.5.5' ? ranked : a.systems;
  const classes = [...new Set(chartData.map((s) => s.class))];
  const seen = new Map<string, number>();
  for (const s of [...a.systems, ...a.not_measured]) seen.set(shortOnly(s.display), (seen.get(shortOnly(s.display)) ?? 0) + 1);
  collisions = new Set([...seen].filter(([, n]) => n > 1).map(([name]) => name));
  // CR-205: the complete v1.4.2.2 section order, on v1.5 data — capability ranking, the two bubble charts,
  // the interactive composite chart, the compare view and the full table, then the evergreen disclosures.
  const allChartSystems = a.systems.map((s) => jevV15BoardSystem(s) as JevV14System);
  const allClassEligibility = jevClassView(allChartSystems);
  const chartSystems = chartData.map((s) => jevV15BoardSystem(s) as JevV14System);
  const jevClass = jevClassView(chartSystems);
  const eligibilityByKey = new Map(allClassEligibility.rows.map((row) => [row.row.key, {
    status: (row.inClass ? 'eligible' : 'outside') as 'eligible' | 'outside',
    reason: row.reasons.length ? row.reasons.join('; ') : 'within the official Jev-class caps',
  }]));
  const filterProjection = jevV15FilterRows(a, { previousKeys, eligibilityByKey, revisionHref: `/jev-models/${a.revision}` });
  const filterRows: JevV15RowMeta[] = filterProjection.map((row) => ({
    key: row.key,
    display: row.display,
    provider: row.provider,
    family: row.family,
    modelClass: row.modelType,
    open: row.openStatus === 'yes' || row.openStatus === 'weights' || row.openStatus === 'no' ? row.openStatus : 'unknown',
    api: row.api,
    newInVersion: row.newInVersion,
    parameters: row.parametersB,
    licence: row.licence,
    developerPrice: row.apiPricePer1000,
    basePrice: row.basePricePer1000,
    officialCost: row.costPer1000,
    alternativePrice: row.alternativePricePer1000,
    p50: row.p50,
    p95: row.p95,
    jevClass: { status: row.eligibility, reason: row.eligibilityReason },
  }));
  const allDataKeys = [...new Set([...a.systems, ...(a.not_measured ?? [])].map((row) => row.key))];
  const allDataCategories = jevbenchCategoryView(a.revision, allDataKeys);
  const numericMetadata = (select: (row: typeof filterProjection[number]) => number | null) => Object.fromEntries(
    filterProjection.flatMap((row) => {
      const value = select(row);
      return value != null && Number.isFinite(value) ? [[row.key, value]] : [];
    }),
  );
  const stringMetadata = (select: (row: typeof filterProjection[number]) => string | null) => Object.fromEntries(
    filterProjection.flatMap((row) => {
      const value = select(row);
      return typeof value === 'string' && value.trim() ? [[row.key, value]] : [];
    }),
  );
  const allDataMetadata = {
    params: numericMetadata((row) => row.parametersB),
    families: stringMetadata((row) => row.family),
    firstAdded: stringMetadata((row) => row.versionAdded),
    apiPriceUsdPer1000: numericMetadata((row) => row.apiPricePer1000),
    basePriceUsdPer1000: numericMetadata((row) => row.basePricePer1000),
    alternativePriceUsdPer1000: numericMetadata((row) => row.alternativePricePer1000),
    revisionNotesHref: stringMetadata((row) => row.revisionNotesHref),
  };
  const addendumLinks = Object.fromEntries(a.systems.flatMap((row) => row.addendum?.id
    ? [[row.addendum.id, `/jev-models/${a.revision}#jev15-addendum`]] : []));
  const previous = new Set(previousKeys);
  const viewRows = chartData.map((s) => jevV15BoardRow(s, { isNew: previous.size > 0 && !previous.has(s.key), headline: a.headline }));
  const compareRows = chartData.map(jevV15CompareRow);
  const named = new Map(a.systems.map((s) => [s.key, short(s.display)]));
  const leader = jevV15LeaderSentence(a.board[a.headline], (key) => named.get(key) ?? key);
  const newLabel = previous.size > 0 && viewRows.some((r) => r.isNew) ? a.revision : null;
  return <JevV15FilterProvider rows={filterRows}>
  <section data-bh-jevbench-v15 data-bh-jev15-run-kind={a.run_kind}>
    <JevV15FilterVisibilityBridge />
    <JevCapabilityRanking systems={chartSystems} eligibilitySystems={allChartSystems} revision={a.revision} officialHref="#jev14-chart-title" />
    <JevBoardIntentLinks />
    <JevBubbleCharts points={jevClass.points} costLimit={jevClass.limits.cost} referenceName="Jev" scoreKind="v15" />
    <JevV15FilterPanel />
    <p className="bh-muted mt-3 max-w-4xl text-sm" data-bh-jev15-whatif>
      What-If: the <a className="text-accent underline" href="#jev14-chart-title">weight sliders below</a> re-score every system under other axis weights — only the equal 25/25/25/25 weights give the official option-{a.headline} ranking. The 3D view of capability, cost and speed loads <a className="text-accent underline" href="#jev14-capability-views">further down</a>.
    </p>
    <JevScoreChart revision={a.revision} rows={viewRows} rankedCount={ranked.length} newLabel={newLabel} fairness={null} approvedNote={leader} tieNote={tieSentence(a)} capabilityHref="#jev-capability" presets={jevV15SliderPresets(a)} compactMobile scoreKind="v15" methodLink={{ href: '#jev15-method', label: 'Method notes ↓' }} />
    {(a.revision === 'v1.5.1' || a.revision === 'v1.5.2' || a.revision === 'v1.5.3' || a.revision === 'v1.5.4' || a.revision === 'v1.5.5') && <Honorable a={a} rows={honorable} />}
    <JevCompareV15 rows={compareRows} openDecisions={a.sample.open} sealedDecisions={a.sample.sealed} categories={jevbenchCategoryView(a.revision, compareRows.map((r) => r.key))} />
    <AxesTable a={a} rows={[...new Map([...ranked, ...honorable, ...addendum, ...partial, ...unpriced].map((row) => [row.key, row])).values()]} />
    <HeadlineBars a={a} ranked={ranked} />
    <p className="bh-muted mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="System types">{classes.map((c) => <span key={c} style={typeVar(c)} className="whitespace-nowrap"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[rgb(var(--jev-t))] align-middle" aria-hidden="true" />{JEV_TYPE_LABEL[c] ?? c}</span>)}</p>
    <OptionsTable a={a} ranked={ranked} />
    <JevV15AllDataGrid
      artifact={a}
      categoryView={allDataCategories}
      previousKeys={previousKeys}
      eligibility={allClassEligibility}
      metadata={allDataMetadata}
      links={{ method: '#jev15-method', pricing: JEVBENCH_V15_PRICING_URL, revisionNotes: `/jev-models/${a.revision}#jev15-method`, addenda: addendumLinks }}
    />
    <Findings a={a} jevClass={jevClass} ranked={ranked} honorable={honorable} partial={partial} addendum={addendum} />
    <Guide a={a} ranked={ranked} />
    <Costs a={a} />
    {a.revision !== 'v1.5.1' && a.revision !== 'v1.5.2' && a.revision !== 'v1.5.3' && a.revision !== 'v1.5.4' && a.revision !== 'v1.5.5' && <Honorable a={a} rows={honorable} />}
    <Addendum a={a} rows={addendum} />
    <NotRanked a={a} partial={partial} unpriced={unpriced} />
    <Method a={a} sha256={sha256} />
    <Limits a={a} />
    <Credit a={a} />
    <JevCapabilityLazy revision={a.revision} only3d />
    <JevContextLazy />
    <p className="bh-muted mt-4 text-xs">Previous release: <a className="text-accent underline" href={a.revision === 'v1.5.5' ? '/jev-models/v1.5.4' : a.revision === 'v1.5.4' ? '/jev-models/v1.5.3' : a.revision === 'v1.5.3' ? '/jev-models/v1.5.2' : a.revision === 'v1.5.2' ? '/jev-models/v1.5.1' : a.revision === 'v1.5.1' ? '/jev-models/v1.5.0' : '/jev-models/v1.4.2.2'}>{a.revision === 'v1.5.5' ? 'JevBench v1.5.4' : a.revision === 'v1.5.4' ? 'JevBench v1.5.3' : a.revision === 'v1.5.3' ? 'JevBench v1.5.2' : a.revision === 'v1.5.2' ? 'JevBench v1.5.1' : a.revision === 'v1.5.1' ? 'JevBench v1.5.0' : 'JevBench v1.4.2.2'} (frozen results)</a>.</p>
  </section>
  </JevV15FilterProvider>;
}

// Keep the old export name available for local preview tooling and screenshot scripts.
export const JevBenchV15Preview = JevBenchV15;
