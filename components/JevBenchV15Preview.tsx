import type { CSSProperties, ReactNode } from 'react';
import {
  JEVBENCH_V15_METHOD_URL, JEVBENCH_V15_PRICING_URL, JEVBENCH_V15_OPTIONS, JEVBENCH_V15_TYPES,
  type JevV15Artifact, type JevV15Option, type JevV15System,
} from '../lib/jevbench-v15-preview.mjs';
import { jevTypeVarName, JEV_TYPE_LABEL } from './jevTypes';

// JevBench v1.5 board, UNPUBLISHED PREVIEW (hidden noindex route only). Server-rendered from the aggregate-only v1.5
// artifact; it follows the v1.4.2 board's look (bars, sticky-name tables, thin tags) but shows the v1.5 fields:
// three weight options with B as headline, per-type (Choice / Noul / Score) competence for open and sealed, typed
// calibration, adjusted latency, the cost basis, and honest listings for partial, unpriced and unmeasured systems.

const one = (v: number | null | undefined) => v == null ? '—' : v.toFixed(1);
const f0 = (v: number | null | undefined) => v == null ? '–' : v.toFixed(0);
const signed = (v: number | null | undefined) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
const secs = (v: number | null | undefined) => v == null ? '—' : `${v.toFixed(v < 1 ? 2 : 1)} s`;
const usd = (v: number | null | undefined) => v == null ? '—' : `$${v.toFixed(v < 0.01 ? 4 : v < 1 ? 3 : 2)}`;
const shortOnly = (display: string) => display.split(' (')[0].split(', formerly')[0];
// Two configurations can share a short name (GPT-6 Luna and its low-effort setting); those keep the full name.
let collisions = new Set<string>();
const short = (display: string) => collisions.has(shortOnly(display)) ? display : shortOnly(display);
const typeVar = (cls: string) => ({ '--jev-t': `var(${jevTypeVarName(cls)})` }) as CSSProperties;
const TYPE_LABEL: Record<string, string> = { choice: 'Choice', noul: 'Noul', score: 'Score' };
const OPTION_LABEL: Record<JevV15Option, string> = { A: 'A · equal', B: 'B · validity-weighted', C: 'C · floor-gated' };
const API_NOTE = "API — the operator's endpoint received sealed item text, without answers.";
const LISTING_LABEL: Record<string, string> = { partial: 'partial run', unpriced: 'unpriced', unranked: 'not ranked' };

function Tags({ row }: { row: JevV15System }) {
  return <>
    {row.addendum && <span className="bh-thin-tag ml-1.5 align-middle !border-solid !text-[rgb(var(--accent2))]" title="Added by a separately hashed roster addendum; same frozen sample, method and pricing rules." data-bh-jev15-addendum={row.addendum.id}>{row.addendum.label}</span>}
    {row.api_flag && <span className="bh-thin-tag ml-1.5 align-middle" title={row.api_exposure_note ?? API_NOTE}>API</span>}
    {row.listing !== 'ranked' && <span className="bh-thin-tag ml-1.5 align-middle" title={row.not_ranked_because ?? undefined}>{LISTING_LABEL[row.listing] ?? row.listing}</span>}
  </>;
}

function costCell(row: JevV15System) {
  if (row.listing === 'unpriced') return <span className="bh-muted" title={row.cost.basis}>unpriced</span>;
  const est = row.cost.kind === 'estimate';
  return <span title={row.cost.basis}>{est ? '~' : ''}{usd(row.cost.usd_per_1000)}{est ? <span className="bh-muted"> est.</span> : null}</span>;
}

function Th({ children, right = true, title }: { children: ReactNode; right?: boolean; title?: string }) {
  return <th className={`whitespace-nowrap p-2 ${right ? 'text-right' : 'text-left'} text-xs font-semibold`} title={title} scope="col">{children}</th>;
}

function NameCell({ row, rank }: { row: JevV15System; rank: ReactNode }) {
  return <>
    <td className="sticky left-0 z-[1] w-10 min-w-10 bg-[var(--surface)] p-2 text-right font-bold tabular-nums shadow-[inset_-1px_0_0_rgb(var(--line))]">{rank}</td>
    <th scope="row" className="sticky left-10 z-[1] w-44 min-w-44 bg-[var(--surface)] p-2 text-left font-semibold shadow-[inset_-1px_0_0_rgb(var(--line))] sm:w-60 sm:min-w-60" style={typeVar(row.class)}>
      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[rgb(var(--jev-t))] align-middle" aria-hidden="true" />
      <span title={row.display}>{short(row.display)}</span><Tags row={row} />
    </th>
  </>;
}

/** The headline (option B) bars: every ranked system, the four axes and the cost next to it, ranks under A and C. */
function HeadlineBars({ a, ranked }: { a: JevV15Artifact; ranked: JevV15System[] }) {
  const markers = a.board.B.markers ?? [];
  const tieBelow = new Map(markers.filter((m) => m.tie).map((m) => [m.upper, m.lower]));
  return <figure className="bh-panel mt-6 p-4 sm:p-5" data-bh-jev15-board="B" aria-labelledby="jev15-board-title">
    <p className="bh-eyebrow">JevBench {a.revision} · headline option B</p>
    <h2 id="jev15-board-title" className="mt-1 text-xl font-bold leading-snug sm:text-2xl">JevBench Score: {ranked.length} ranked systems</h2>
    <p className="bh-muted mt-1 text-sm"><span className="bh-jevc-official mr-2">Official (B)</span>weighted harmonic mean of four 0–100 axes, Intelligence 40 · Calibration 20 · Speed 20 · Cost 20, with the low-axis gates · <a href="#jev15-method" className="text-accent underline">Method ↓</a></p>
    {a.board.B.leader_wording && <p className="mt-2 text-sm font-semibold" data-bh-jev15-leader>{a.board.B.leader_wording}</p>}
    <p className="bh-muted mt-1 text-xs" data-bh-jev15-ties>{markers.length ? `Adjacent pairs whose paired-bootstrap 95% interval includes zero are marked ≈ (statistical tie).` : 'Bootstrap intervals and tie markers are not in this data file yet; they come with the official scorer output.'}</p>
    <div className="mt-4 hidden grid-cols-[1.8rem_15rem_minmax(0,1fr)_3.4rem_24rem] gap-x-2 text-[11px] sm:grid" aria-hidden="true">
      <span /><span /><span className="bh-muted font-mono">JevBench Score (B)</span><span className="bh-muted text-right font-mono">Score</span>
      <span className="bh-muted grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_3fr] text-right font-mono"><span>Intel.</span><span>Calib.</span><span>Speed</span><span>Cost</span><span>A #</span><span>C #</span><span>$/1k dec.</span></span>
    </div>
    <ol className="mt-2 grid gap-1.5" data-bh-jev15-bars>{ranked.map((row) => {
      const s = row.scores.B;
      return <li key={row.key} style={typeVar(row.class)} className="grid grid-cols-[1.5rem_minmax(0,1fr)_3.3rem] items-center gap-x-2 text-sm sm:grid-cols-[1.8rem_15rem_minmax(0,1fr)_3.4rem_24rem]" data-bh-jev15-bar={row.key}
        aria-label={`${row.display}: JevBench Score ${one(s)}, rank ${row.rank}. Intelligence ${one(row.axes.intelligence)}, calibration ${one(row.axes.calibration)}, speed ${one(row.axes.speed)}, cost ${one(row.axes.cost)}.`}>
        <span className="bh-muted tabular-nums col-start-1 row-start-1 text-right text-xs">{row.rank}</span>
        <span className="col-start-2 row-start-1 min-w-0 sm:truncate sm:text-right" title={row.display}>{short(row.display)}<Tags row={row} />{tieBelow.has(row.key) && <span className="bh-muted ml-1" title={`Statistical tie with the next row`}>≈</span>}</span>
        <span className="bh-jevc-grid col-start-2 row-start-2 mt-1 flex h-4 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:h-6" aria-hidden="true">
          {s != null && <span className="bh-jevc-bar" style={{ width: `${Math.max(0, Math.min(100, s)).toFixed(3)}%` }} />}
        </span>
        <b className="tabular-nums col-start-3 row-span-2 row-start-1 self-center text-right text-base sm:col-start-4 sm:row-span-1 sm:text-lg">{one(s)}</b>
        <span className="bh-muted col-start-2 row-start-3 mt-0.5 min-w-0 font-mono text-[10.5px] sm:col-start-5 sm:row-start-1 sm:mt-0 sm:grid sm:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_3fr] sm:whitespace-nowrap sm:text-right sm:text-[12px]">
          <span className="sm:hidden">I </span><span>{f0(row.axes.intelligence)}</span><span className="sm:hidden"> · C </span><span>{f0(row.axes.calibration)}</span>
          <span className="sm:hidden"> · S </span><span>{f0(row.axes.speed)}</span><span className="sm:hidden"> · K </span><span>{f0(row.axes.cost)}</span>
          <span className="sm:hidden"> · A#</span><span>{row.ranks.A}</span><span className="sm:hidden"> · C#</span><span>{row.ranks.C}</span>
          <span className="sm:hidden"> · </span>{costCell(row)}
        </span>
      </li>;
    })}</ol>
  </figure>;
}

function OptionsTable({ a, ranked }: { a: JevV15Artifact; ranked: JevV15System[] }) {
  return <section className="mt-10" aria-labelledby="jev15-options" data-bh-jev15-options>
    <h2 id="jev15-options" className="scroll-mt-6 text-xl font-semibold">All three weight options</h2>
    <p className="bh-muted mt-1 max-w-4xl text-sm">B is the headline. A (equal weights) and C (equal weights, Intelligence floor 60) are frozen presets published with every release; they re-weight the same measured axes. The CI column is the bootstrap 95% interval of the B score where the scorer provides it.</p>
    <div className="mt-3 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[760px] text-sm" aria-label="Scores and ranks under options A, B and C">
        <thead><tr className="bg-[var(--surface)]"><Th right>#B</Th><Th right={false}>System</Th>
          {JEVBENCH_V15_OPTIONS.map((o) => <Th key={o} title={`Weights ${Object.values(a.options[o].weights).join('/')}, Intelligence floor ${a.options[o].intelligence_floor}`}>{OPTION_LABEL[o]}</Th>)}
          <Th>#A</Th><Th>#C</Th><Th>B 95% CI</Th></tr></thead>
        <tbody>{ranked.map((row) => <tr key={row.key} className="border-t border-line" data-bh-jev15-option-row={row.key}>
          <NameCell row={row} rank={row.ranks.B} />
          {JEVBENCH_V15_OPTIONS.map((o) => <td key={o} className={`p-2 text-right tabular-nums ${o === 'B' ? 'font-bold' : ''}`}>{one(row.scores[o])}</td>)}
          <td className="p-2 text-right tabular-nums">{row.ranks.A}</td><td className="p-2 text-right tabular-nums">{row.ranks.C}</td>
          <td className="bh-muted whitespace-nowrap p-2 text-right tabular-nums">{row.composite_ci95?.B ? `${one(row.composite_ci95.B[0])}–${one(row.composite_ci95.B[1])}` : '—'}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

function AxesTable({ a, rows }: { a: JevV15Artifact; rows: JevV15System[] }) {
  const cc = (row: JevV15System, split: string, t: string) => row.intelligence?.per_type_split?.[`${split}|${t}`]?.cc;
  const sup = (row: JevV15System, t: string) => row.support?.[t as 'choice'] ?? null;
  return <section className="mt-10" aria-labelledby="jev15-axes" data-bh-jev15-axes>
    <h2 id="jev15-axes" className="scroll-mt-6 text-xl font-semibold">Axes, request types, latency and cost</h2>
    <p className="bh-muted mt-1 max-w-4xl text-sm">Every measured system. Intelligence is 50% open ({a.sample.open} decisions) and 50% sealed ({a.sample.sealed}); per-type columns are chance-corrected competence (CC, 0 = chance) for Choice, Noul and Score, open / sealed. Gap = I_open − I_sealed; the penalty applies only above the field median gap (G_med {one(a.G_med)}) plus 8. Latency is adjusted p50 / p95; cost is per 1,000 decisions ("est." = base-model estimate). On a phone the name column stays put while the table scrolls sideways.</p>
    <div className="mt-3 overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[1480px] text-sm" aria-label="Per-system axes and details">
        <thead><tr className="bg-[var(--surface)]">
          <Th>#B</Th><Th right={false}>System</Th><Th>Score</Th><Th>Intel.</Th><Th>Calib.</Th><Th>Speed</Th><Th>Cost</Th>
          <Th title="Intelligence on the open set">I open</Th><Th title="Intelligence on the sealed set">I sealed</Th><Th>Gap</Th><Th title="Overfit multiplier on Intelligence">Penalty</Th>
          {JEVBENCH_V15_TYPES.map((t) => <Th key={t} title={`${TYPE_LABEL[t]} competence, open / sealed`}>{TYPE_LABEL[t]} o / s</Th>)}
          <Th title="Latency p50 / p95, adjusted">p50 / p95</Th><Th>$/1k</Th><Th right={false}>Endpoint</Th>
        </tr></thead>
        <tbody>{rows.map((row) => {
          const i = row.intelligence;
          return <tr key={row.key} className={`border-t border-line ${row.ranked ? '' : 'opacity-80'}`} data-bh-jev15-row={row.key} data-bh-jev15-listing={row.listing}>
            <NameCell row={row} rank={row.rank ?? <span className="bh-muted text-xs font-normal">–</span>} />
            <td className="p-2 text-right font-bold tabular-nums">{row.ranked ? one(row.jevbench_score) : <span className="bh-muted font-normal" title={row.not_ranked_because ?? undefined}>—</span>}</td>
            <td className="p-2 text-right tabular-nums">{one(row.axes.intelligence)}</td><td className="p-2 text-right tabular-nums">{one(row.axes.calibration)}</td>
            <td className="p-2 text-right tabular-nums">{one(row.axes.speed)}</td><td className="p-2 text-right tabular-nums">{row.listing === 'unpriced' ? <span className="bh-muted">n/a</span> : one(row.axes.cost)}</td>
            <td className="p-2 text-right tabular-nums">{one(i?.I_open)}</td><td className="p-2 text-right tabular-nums">{one(i?.I_sealed)}</td>
            <td className="p-2 text-right tabular-nums">{signed(i?.gap)}</td><td className="p-2 text-right tabular-nums">{i?.penalty == null ? '—' : `×${i.penalty.toFixed(3)}`}</td>
            {JEVBENCH_V15_TYPES.map((t) => <td key={t} className="whitespace-nowrap p-2 text-right tabular-nums" title={sup(row, t) ? `support: ${sup(row, t)}` : undefined}>
              {sup(row, t) === 'unsupported' || sup(row, t) === 'not supported' ? <span className="bh-muted">not supported</span> : <>{f0(cc(row, 'open', t))} / {f0(cc(row, 'sealed', t))}</>}
            </td>)}
            <td className="whitespace-nowrap p-2 text-right tabular-nums" title={row.speed.adjustment ? `Adjustment: ${row.speed.adjustment}; raw p50 ${secs(row.speed.p50_s_raw)}, p95 ${secs(row.speed.p95_s_raw)}` : undefined}>{secs(row.speed.p50_s_adjusted)} / {secs(row.speed.p95_s_adjusted)}</td>
            <td className="whitespace-nowrap p-2 text-right tabular-nums">{costCell(row)}</td>
            <td className="bh-muted whitespace-nowrap p-2 text-xs" title={row.endpoint_condition ?? undefined}>{row.endpoint_kind === 'gpu' ? `GPU pod${row.gpu ? ` (${row.gpu})` : ''}` : row.endpoint_kind === 'cpu' ? 'CPU container' : row.endpoint_kind === 'demo' ? 'author demo endpoint' : row.endpoint_kind === 'api' ? 'hosted API' : '—'}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <p className="bh-muted mt-2 text-xs" data-bh-jev15-api-note>API = the operator's endpoint received sealed item text during evaluation, without answers. Sealed item text, answers and item-level results stay private; only system-level aggregates appear here. Hover a cost for its price basis and a latency for its raw values and adjustment.</p>
  </section>;
}

function NotRanked({ a, partial, unpriced }: { a: JevV15Artifact; partial: JevV15System[]; unpriced: JevV15System[] }) {
  return <section className="bh-panel mt-10 max-w-5xl p-5" aria-labelledby="jev15-unranked" data-bh-jev15-unranked>
    <h2 id="jev15-unranked" className="text-lg font-semibold">Not ranked: partial, unpriced and unmeasured systems</h2>
    <p className="bh-muted mt-1 text-sm">These systems are part of the {a.roster_count}-system v1.5 roster but have no rank. Their numbers are never shown as zero or free.</p>
    {partial.length > 0 && <><h3 className="mt-4 font-semibold">Partial runs ({partial.length})</h3>
      <ul className="bh-muted mt-1 space-y-1 text-sm">{partial.map((r) => <li key={r.key} data-bh-jev15-partial={r.key}><b>{r.display}</b><Tags row={r} />: {r.not_ranked_because}</li>)}</ul></>}
    {unpriced.length > 0 && <><h3 className="mt-4 font-semibold">Measured, unpriced ({unpriced.length})</h3>
      <ul className="bh-muted mt-1 space-y-1 text-sm">{unpriced.map((r) => <li key={r.key} data-bh-jev15-unpriced={r.key}><b>{r.display}</b><Tags row={r} />: {r.not_scored_reason}. No Cost axis and no score until a price qualifies under the v1.5 price rules.</li>)}</ul></>}
    {a.not_measured.length > 0 && <><h3 className="mt-4 font-semibold">Not measured in v1.5 ({a.not_measured.length})</h3>
      <p className="bh-muted mt-1 text-sm" data-bh-jev15-not-measured>{a.not_measured.map((r, i) => <span key={r.key}>{i ? ' · ' : ''}<span title={r.reason ?? r.status}>{short(r.display)}</span>{r.addendum ? <span className="bh-thin-tag ml-1">{r.addendum.label}</span> : null}</span>)}</p>
      <p className="bh-muted mt-1 text-xs">Not measured means no v1.5 run exists yet (for example no offline image, or a hosted API not cleared for sealed items). Their v1.4.2 results stay on the v1.4.2 page.</p></>}
  </section>;
}

function Method({ a, sha256 }: { a: JevV15Artifact; sha256: string }) {
  return <section id="jev15-method" className="bh-panel mt-10 max-w-5xl scroll-mt-6 p-5" aria-labelledby="jev15-method-head" data-bh-jev15-method>
    <h2 id="jev15-method-head" className="text-lg font-semibold">Method notes: what changed in v1.5</h2>
    <p className="bh-muted mt-2 text-sm">Frozen method <a className="text-accent underline" href={JEVBENCH_V15_METHOD_URL}>METHOD-v1.5</a>, SHA-256 <code className="break-all" data-bh-jev15-method-sha>{a.method_sha256}</code>; pricing addendum <a className="text-accent underline" href={JEVBENCH_V15_PRICING_URL}>v1.5-M2</a>, SHA-256 <code className="break-all">{a.pricing_addendum_sha256}</code>.</p>
    <ul className="bh-muted mt-3 list-disc space-y-2 pl-5 text-sm">
      <li>{a.sample.total.toLocaleString('en-US')} decisions per system: {a.sample.open} open ({a.sample.published_open} published) and {a.sample.sealed} sealed, drawn fresh from a private pool with the same tier mix as the open set. Sealed counts for 50% of Intelligence: <code>base = 0.5 × I_open + 0.5 × I_sealed</code>.</li>
      <li>Three request types, each scored natively and chance-corrected per item: Choice 50%, Noul 25%, Score 25%. Tier weights easy / standard / judge / hard = 10 / 20 / 30 / 40. A type a system does not support is excluded, never scored zero; only full-coverage systems are ranked.</li>
      <li>Overfit penalty relative to the field: <code>excess = gap − G_med</code>, <code>penalty = max(0, 1 − max(0, excess − 8) / 100)</code>. G_med for this batch is {one(a.G_med)} CC points{a.G_med_flag_gt10 ? ' (above 10: the difficulty-mismatch flag is set)' : ''}.</li>
      <li>Calibration is typed (Choice ECE/TVD, Noul ECE with Brier, Score normalised RPS and top-level ECE), pooled over open and sealed. Speed and Cost formulas are unchanged from v1.4; self-hosted and demo endpoints carry the ×2 + 0.15 s adjustment. Prices follow the 24 Sep price rule: a system without a public, bookable price gets a labelled base-model estimate, and one with no eligible price is listed as unpriced.</li>
      <li>Composite: weighted harmonic mean with the Intelligence, Speed and Cost gates below 50 (Intelligence below 60 in option C). Headline weights B = 40 / 20 / 20 / 20; A and C are frozen presets. Ties come from a paired bootstrap, and "#1" is claimed only if it is significant.</li>
      <li>Rows marked with a <b>v1.5.1 addendum</b> label were added by a separately hashed roster addendum: same frozen sample, method, pricing rules and G_med.</li>
    </ul>
    <p className="bh-muted mt-3 text-xs" data-bh-jev15-provenance>Data file SHA-256 <code className="break-all">{sha256}</code> · scorer output SHA-256 <code className="break-all">{a.source_sha256}</code> · run kind <b>{a.run_kind}</b>.</p>
  </section>;
}

export function JevBenchV15Preview({ artifact: a, sha256 }: { artifact: JevV15Artifact; sha256: string }) {
  const ranked = a.systems.filter((s) => s.listing === 'ranked').sort((x, y) => (x.rank ?? 999) - (y.rank ?? 999));
  const partial = a.systems.filter((s) => s.listing === 'partial' || s.listing === 'unranked');
  const unpriced = a.systems.filter((s) => s.listing === 'unpriced');
  const classes = [...new Set(a.systems.map((s) => s.class))];
  const seen = new Map<string, number>();
  for (const s of [...a.systems, ...a.not_measured]) seen.set(shortOnly(s.display), (seen.get(shortOnly(s.display)) ?? 0) + 1);
  collisions = new Set([...seen].filter(([, n]) => n > 1).map(([name]) => name));
  return <section data-bh-jevbench-v15-preview data-bh-jev15-run-kind={a.run_kind}>
    <HeadlineBars a={a} ranked={ranked} />
    <p className="bh-muted mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="System types">{classes.map((c) => <span key={c} style={typeVar(c)} className="whitespace-nowrap"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[rgb(var(--jev-t))] align-middle" aria-hidden="true" />{JEV_TYPE_LABEL[c] ?? c}</span>)}</p>
    <OptionsTable a={a} ranked={ranked} />
    <AxesTable a={a} rows={[...ranked, ...partial, ...unpriced]} />
    <NotRanked a={a} partial={partial} unpriced={unpriced} />
    <Method a={a} sha256={sha256} />
    <p className="bh-muted mt-4 text-xs">Earlier releases: <a className="text-accent underline" href="/jev-models/v1.4.2">JevBench v1.4.2 (current public release)</a>.</p>
  </section>;
}
