import type { CSSProperties } from 'react';
import Link from 'next/link';
import { jevV14RowNote, type JevV14Artifact, type JevV14System } from '../lib/jevbench-v14.mjs';
import { JevCompareV14, type JevCompareRow } from './JevCompareV14';
import { JevRankBy } from './JevRankBy';
import { JevScoreBar, JevScoreBarHeader, toBarRow } from './JevScoreBar';
import { JEV_TYPE_LABEL, jevLegendTypes, jevTypeVarName } from './jevTypes';

export { JevScoreBar, JevScoreBarHeader, toBarRow };

const one = (value: number | null | undefined) => value == null ? '—' : value.toFixed(1);
const f0 = (value: number | null | undefined) => value == null ? '–' : value.toFixed(0);
const percent = (value: number | null | undefined) => value == null ? '—' : `${(value * 100).toFixed(1)}%`;
const percentagePoints = (value: number | null | undefined) => value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)} pp`;
const seconds = (value: number | null | undefined) => value == null ? '—' : `${value.toFixed(2)} s`;
const dollars = (value: number | null | undefined) => value == null ? '—' : `$${value.toFixed(value < 0.01 ? 4 : 3)}`;
const shortName = (value: string) => value.split(' (')[0].split(', formerly')[0];
const apiExplanation = "API — the operator's endpoint received sealed item text, without answers.";
const typeVar = (cls: string) => ({ '--jev-t': `var(${jevTypeVarName(cls)})` }) as CSSProperties;
const NOT_RANKED: Record<string, string> = { honorable_mention: 'honorable mention', partial: 'partial run' };
const CHART_TOP = 20;

/** A row-specific note: a small † glued to the name that opens the note in place (tap or click), with the note as tooltip too. */
function NoteMarker({ row, note }: { row: JevV14System; note: string }) {
  return <details className="bh-jev14-note" data-bh-jev14-note={row.key}>
    <summary title={note} aria-label={`Note on ${shortName(row.display)}`}>†</summary>
    <span className="bh-jev14-note-body" role="note">{note}</span>
  </details>;
}

function SystemName({ row, note }: { row: JevV14System; note: string | null }) {
  const name = shortName(row.display);
  const rawVariant = row.display.startsWith(name) ? row.display.slice(name.length).replace(/^[ ,]*\(?|\)$/g, '') : '';
  const variant = rawVariant && !row.author.includes(rawVariant) ? rawVariant : '';
  const href = `/jev-models/${encodeURIComponent(row.key)}`;
  const cut = name.lastIndexOf(' ');
  // The † stays outside the link but shares a no-wrap box with the final word.
  return <div>
    <span className="font-semibold" title={row.display}>
      {cut > 0 && <Link href={href} title={row.display}>{name.slice(0, cut + 1)}</Link>}
      <span className="whitespace-nowrap">
        <Link href={href} title={row.display}>{cut > 0 ? name.slice(cut + 1) : name}</Link>
        {note && <NoteMarker row={row} note={note} />}
      </span>
    </span>
    {row.priority_run === true && <span className="bh-thin-tag ml-2 align-middle" data-bh-jev14-priority-run={row.key}>priority run</span>}
    {row.api_flag && <span className="bh-thin-tag ml-2 align-middle" data-bh-jev14-api-flag={row.key} title={row.api_exposure_note ?? apiExplanation} aria-label={apiExplanation}>API</span>}
    <span className="bh-muted block text-[11px] leading-tight">by {row.repo
      ? <a href={row.repo} target="_blank" rel="noopener noreferrer" className="underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent">{row.author}</a>
      : row.author}{variant ? ` · ${variant}` : ''}</span>
  </div>;
}

function CostValue({ row }: { row: JevV14System }) {
  const value = dollars(row.cost?.usd_per_1000);
  const kind = row.cost?.kind;
  return <span title={row.cost?.basis} className="whitespace-nowrap">
    {kind === 'estimate' ? `~${value}` : value}
    {kind === 'estimate' && <span className="bh-thin-tag ml-1">est.</span>}
    {kind === 'announced' && <span className="bh-thin-tag ml-1">announced</span>}
  </span>;
}

function Row({ row, note }: { row: JevV14System; note: string | null }) {
  const rankLabel = row.rank ?? '—';
  return <tr id={`jev14-row-${row.key}`} data-bh-jev14-row={row.key} data-bh-jev14-ranked={row.ranked ? '1' : '0'} className={row.ranked ? '' : 'bh-jev11-partial'}>
    <td className="bh-muted tabular">{rankLabel}</td>
    <th scope="row" className="bh-jev-sticky text-left font-normal"><SystemName row={row} note={note} />
      {!row.ranked && <span className="bh-thin-tag mt-1 inline-block" title={row.not_ranked_because ?? undefined}>{row.listing.replace(/_/g, ' ')} · not ranked</span>}
    </th>
    <td className="tabular"><b className="text-lg" data-bh-jev14-score>{one(row.jevbench_score)}</b></td>
    <td className="tabular">{one(row.axes?.intelligence)}</td>
    <td className="tabular">{one(row.axes?.calibration)}</td>
    <td className="tabular">{one(row.axes?.speed)}</td>
    <td className="tabular">{one(row.axes?.cost)}</td>
    <td className="tabular">{percent(row.public_accuracy)}</td>
    <td className="tabular">{percent(row.sealed_accuracy)}</td>
    <td className="tabular whitespace-nowrap">{percentagePoints(row.public_minus_sealed_gap_pp)}</td>
    <td className="tabular"><CostValue row={row} /></td>
    <td className="tabular whitespace-nowrap" title={row.speed?.adjustment ?? undefined}>{seconds(row.speed?.p50_s_raw)}</td>
    <td className="text-[12px]" title={row.endpoint_condition}>{row.endpoint_kind === 'api' ? 'API' : row.endpoint_kind === 'gpu' ? 'RunPod GPU' : row.endpoint_kind === 'demo' ? 'author demo' : row.endpoint_kind === 'cpu' ? 'CPU' : row.endpoint_kind ?? '—'}</td>
  </tr>;
}

/** The v1.3 page's hero bar chart, restored with the v1.4 scores: every system, top 20 open, the rest one tap away. */
/** CR-152 (Florian, 25 Sep 2026): the fairness sentence next to the top five and a visible Intelligence ordering.
 *  F-189 (Fable pass 35): the sentence keeps its words and loses its box; the ordering is the JevRankBy control,
 *  not the 89-row table of the numbers the chart already draws. */
function ScoreChart({ revision, ranked, unranked, publicDecisions, sealedDecisions, topFiveNote }: { revision: string; ranked: JevV14System[]; unranked: JevV14System[]; publicDecisions: number; sealedDecisions: number; topFiveNote?: string | null }) {
  const all = [...ranked, ...unranked];
  const types = jevLegendTypes(all.map((r) => r.class));
  const subtitle = <><span className="bh-jevc-official mr-2">Official</span>· four axes 0–100, equal-weight harmonic mean · <a href="#jev14-changes" className="text-accent underline">What changed in v1.4 ↓</a></>;
  const chartId = 'jev14-chart';
  return <figure id={chartId} className="bh-panel mt-6 p-4 sm:p-5" data-bh-jev14-chart aria-labelledby="jev14-chart-title">
    <p className="bh-eyebrow">JevBench {revision}</p>
    <h2 id="jev14-chart-title" className="mt-1 text-xl font-bold leading-snug sm:text-2xl">JevBench Score: {ranked.length} ranked systems</h2>
    <JevRankBy rows={all.map(toBarRow)} top={CHART_TOP} note={topFiveNote} subtitle={subtitle} />
    <div className="mt-2 hidden grid-cols-[1.6rem_14rem_minmax(0,1fr)_3.2rem_19rem] gap-x-2 text-[11px] sm:grid" aria-hidden="true">
      <span /><span /><span className="bh-muted flex justify-between tabular"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></span>
    </div>
    <p className="mt-3 text-center text-[13px] sm:text-sm" data-bh-jev14-formula>
      Score = 4 / (1/I + 1/C + 1/S + 1/K) <span className="bh-muted">(each 0–100; × (axis / 50)² for Intelligence, Speed or Cost below 50)</span>
    </p>
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]" aria-label="Legend" data-bh-jev14-legend>
      {types.map((t) => <li key={t} style={typeVar(t)} data-bh-jev14-class={t} data-bh-jev14-class-labelled={JEV_TYPE_LABEL[t] ? '1' : '0'}><span className="bh-jevc-swatch mr-1.5" />{JEV_TYPE_LABEL[t] ?? <code title="Class named in the v1.4.2 artifact; description pending">{t}</code>}</li>)}
      {unranked.length > 0 && <li><span className="bh-jevc-swatch is-partial mr-1.5" />Shown, not ranked</li>}
    </ul>
    <figcaption className="bh-muted mt-3 text-[11.5px] leading-snug">I, C, S, K = Intelligence, Calibration, Speed, Cost; ~ est. = <a href="#jev-costs" className="text-accent underline">estimated cost</a>; ann. = announced price; API = the operator&apos;s endpoint saw sealed item text, without answers. Names link to each project.</figcaption>
  </figure>;
}

function compareRow(row: JevV14System): JevCompareRow {
  const hard = (row.hard as { by_family?: Record<string, { accuracy: number | null; n: number }> } | null)?.by_family ?? null;
  const sealed = (row.sealed_aggregate as { by_family?: Record<string, number | null> } | null)?.by_family ?? null;
  const tiers = (row.tiers ?? {}) as Record<string, number | null>;
  return {
    key: row.key, name: shortName(row.display), cls: row.class, rank: row.rank, listing: row.listing, score: row.jevbench_score,
    axes: row.axes, tiers: { easy: tiers.easy ?? null, standard: tiers.standard ?? null, judge: tiers.judge ?? null, hard: tiers.hard ?? null, sealed: row.sealed_accuracy },
    hard: hard ? Object.fromEntries(Object.entries(hard).map(([k, v]) => [k, { accuracy: v.accuracy, n: v.n }])) : null,
    sealed,
  };
}

export function JevModelsV14Board({ artifact, sha256 }: { artifact: JevV14Artifact; sha256: string }) {
  const ranked = artifact.systems.filter((row) => row.listing === 'ranked').sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const unranked = artifact.systems.filter((row) => row.listing !== 'ranked').sort((a, b) => (b.jevbench_score ?? -1) - (a.jevbench_score ?? -1));
  const rows = [...ranked, ...unranked];
  const noteOf = new Map(rows.map((row) => [row.key, jevV14RowNote(artifact.footnotes?.[row.key])]));
  const notes = rows.filter((row) => noteOf.get(row.key));
  const publicDecisions = artifact.tiers.easy + artifact.tiers.standard + artifact.tiers.judge + artifact.tiers.hard;
  const sealedDecisions = artifact.tiers.sealed;
  return <section className="mt-8" aria-labelledby="jev14-board" data-bh-jevbench-v14>
    <h2 id="jev14-board" className="sr-only">JevBench {artifact.revision} ranking</h2>
    <ScoreChart revision={artifact.revision} ranked={ranked} unranked={unranked} publicDecisions={publicDecisions} sealedDecisions={sealedDecisions} topFiveNote={typeof artifact.top_five_note === 'string' ? artifact.top_five_note : null} />

    <h2 id="jev14-table" className="mt-10 text-xl font-semibold">Axes, accuracy, latency and cost</h2>
    <p className="bh-muted mt-1 max-w-4xl text-sm">Every system with its four axes, public and sealed accuracy and the gap between them. On a phone the name column stays put while the table scrolls sideways. <span className="whitespace-nowrap">† = a note on that system</span> — tap it to read.</p>
    <div className="bh-table-wrap mt-3">
      <table className="bh-table bh-jev-table" data-bh-jev14-table>
        <thead><tr>
          <th scope="col">#</th><th scope="col" className="bh-jev-sticky">System</th><th scope="col">JevBench Score</th>
          <th scope="col">Intelligence</th><th scope="col">Calibration</th><th scope="col">Speed</th><th scope="col">Cost axis</th>
          <th scope="col">Public accuracy<br /><span className="bh-muted text-[11px]">{publicDecisions}</span></th>
          <th scope="col">Sealed accuracy<br /><span className="bh-muted text-[11px]">{sealedDecisions}</span></th>
          <th scope="col">Public − sealed gap</th><th scope="col">Cost / 1,000</th><th scope="col">p50 latency</th><th scope="col">Endpoint</th>
        </tr></thead>
        <tbody>{rows.map((row) => <Row key={row.key} row={row} note={noteOf.get(row.key) ?? null} />)}</tbody>
      </table>
    </div>
    <p className="bh-muted mt-2 text-xs" data-bh-jev14-api-note>API = the operator's endpoint received sealed item text during evaluation; the answers and item-level results are not published. The sealed text and answers remain private; only system-level aggregates appear here. Cost is per 1,000 decisions. Hover endpoint, cost and API labels for their recorded details.</p>
    <details className="mt-3 text-xs" data-bh-jev14-notes>
      <summary className="cursor-pointer text-accent">All {notes.length} system notes and disclosures</summary>
      <ul className="bh-muted mt-2 space-y-1">{notes.map((row) => <li key={row.key} id={`jev14-note-${row.key}`}>† <b className="text-gray-200">{row.display}</b>: {noteOf.get(row.key)}</li>)}</ul>
      <p className="bh-muted mt-2">Rows without a † have no note beyond the shared provenance: every row was measured or re-run with its recorded recipe, and deviations are in its run manifest.</p>
    </details>
    <p className="bh-muted mt-2 text-xs">Artifact: <a className="text-accent underline" href={`/api/jevbench/${artifact.revision.slice(1)}`}>{artifact.revision} results JSON</a> · SHA-256 <code title={sha256}>{sha256.slice(0, 12)}…</code> · <a className="text-accent underline" href={`https://github.com/fstandhartinger/jevbench/releases/tag/${artifact.revision}`}>JevBench {artifact.revision} release and method</a></p>

    <JevCompareV14 rows={rows.map(compareRow)} sealedDecisions={sealedDecisions} hardDecisions={artifact.tiers.hard} />

    <section id="jev14-changes" className="bh-panel mt-10 max-w-5xl scroll-mt-6 p-5" aria-labelledby="jev14-changes-head" data-bh-jev14-changes>
      <h3 id="jev14-changes-head" className="text-lg font-semibold">What changed in v1.4</h3>
      <ul className="bh-muted mt-3 list-disc space-y-2 pl-5 text-sm">
        <li>Fresh sealed decisions keep the benchmark moving as public items saturate. Sealed items contribute 20% of Intelligence: <code>I = 0.8 × I_v1.3 + 0.2 × I_sealed</code>, where <code>I_sealed = 100 × max(0, (acc_sealed − 0.293) / (1 − 0.293))</code>. Public and sealed scores are published only as aggregates.</li>
        <li>Calibration blends toward the sealed-inclusive result at the approved weight: <code>C = C_v1.3 + (C_v1.4 − C_v1.3) × min(1, 0.2 / 0.35)</code>.</li>
        <li>The <code>k = 1</code> generalization penalty reduces Intelligence when public accuracy exceeds sealed accuracy by more than 25 percentage points: <code>I × (1 − max(0, gap − 25) / 100)</code>. It rewards systems that generalize beyond the public half.</li>
        <li>The four axes use an equal-weight harmonic mean (<code>p = −1</code>). Intelligence below 50 keeps its quadratic penalty; Speed and Cost each have a separate Jev-class gate below 50. Speed and Cost axis calculations are unchanged from v1.3.0.</li>
        <li>The visible <b className="text-gray-200">API</b> flag discloses when an operator endpoint received held-out item text, without answers. Existing system notes preserve disclosures such as Hopper's public-half development and JevK5's public-set selection.</li>
      </ul>
    </section>
  </section>;
}
