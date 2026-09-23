import type { JevV14Artifact, JevV14System } from '../lib/jevbench-v14.mjs';

const one = (value: number | null | undefined) => value == null ? '—' : value.toFixed(1);
const percent = (value: number | null | undefined) => value == null ? '—' : `${(value * 100).toFixed(1)}%`;
const percentagePoints = (value: number | null | undefined) => value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)} pp`;
const seconds = (value: number | null | undefined) => value == null ? '—' : `${value.toFixed(2)} s`;
const dollars = (value: number | null | undefined) => value == null ? '—' : `$${value.toFixed(value < 0.01 ? 4 : 3)}`;
const shortName = (value: string) => value.split(' (')[0].split(', formerly')[0];
const apiExplanation = "API — the operator's endpoint received sealed item text, without answers.";

function SystemName({ row }: { row: JevV14System }) {
  return <div>
    <span className="font-semibold">{row.repo
      ? <a href={row.repo} target="_blank" rel="noopener noreferrer" className="underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent hover:decoration-current" title={row.display}>{shortName(row.display)}</a>
      : shortName(row.display)}</span>
    {row.api_flag && <span className="bh-thin-tag ml-2 align-middle" data-bh-jev14-api-flag={row.key} title={row.api_exposure_note ?? apiExplanation} aria-label={apiExplanation}>API</span>}
    <span className="bh-muted block text-[11px] leading-tight">by {row.author}{row.display.startsWith(shortName(row.display)) ? ` · ${row.display.slice(shortName(row.display).length).replace(/^[ ,]*\(?|\)$/g, '')}` : ''}</span>
  </div>;
}

function CostValue({ row }: { row: JevV14System }) {
  const value = dollars(row.cost?.usd_per_1000);
  const kind = row.cost?.kind;
  return <span title={row.cost?.basis}>
    {kind === 'estimate' ? `~${value}` : value}
    {kind === 'estimate' && <span className="bh-thin-tag ml-1">est.</span>}
    {kind === 'announced' && <span className="bh-thin-tag ml-1">announced</span>}
  </span>;
}

function Row({ row, artifact }: { row: JevV14System; artifact: JevV14Artifact }) {
  const footnote = artifact.footnotes?.[row.key];
  const rankLabel = row.rank ?? '—';
  return <tr data-bh-jev14-row={row.key} data-bh-jev14-ranked={row.ranked ? '1' : '0'} className={row.ranked ? '' : 'bh-jev11-partial'}>
    <td className="bh-muted tabular">{rankLabel}</td>
    <th scope="row" className="bh-jev-sticky text-left font-normal"><SystemName row={row} />
      {!row.ranked && <span className="bh-thin-tag mt-1 inline-block" title={row.not_ranked_because ?? undefined}>{row.listing.replace(/_/g, ' ')} · not ranked</span>}
    </th>
    <td className="tabular"><b className="text-lg" data-bh-jev14-score>{one(row.jevbench_score)}</b></td>
    <td className="tabular">{one(row.axes?.intelligence)}</td>
    <td className="tabular">{one(row.axes?.calibration)}</td>
    <td className="tabular">{one(row.axes?.speed)}</td>
    <td className="tabular">{one(row.axes?.cost)}</td>
    <td className="tabular">{percent(row.public_accuracy)}</td>
    <td className="tabular">{percent(row.sealed_accuracy)}</td>
    <td className="tabular">{percentagePoints(row.public_minus_sealed_gap_pp)}</td>
    <td className="tabular"><CostValue row={row} /></td>
    <td className="tabular" title={row.speed?.adjustment ?? undefined}>{seconds(row.speed?.p50_s_raw)}</td>
    <td className="text-[12px]" title={row.endpoint_condition}>{row.endpoint_kind === 'api' ? 'API' : row.endpoint_kind === 'gpu' ? 'RunPod GPU' : row.endpoint_kind === 'demo' ? 'author demo' : row.endpoint_kind === 'cpu' ? 'CPU' : row.endpoint_kind ?? '—'}</td>
    {footnote && <td className="text-[12px]"><a href={`#jev14-note-${row.key}`} className="text-accent underline" title={footnote}>† note</a></td>}
    {!footnote && <td className="bh-muted text-[12px]">—</td>}
  </tr>;
}

export function JevModelsV14Board({ artifact, sha256 }: { artifact: JevV14Artifact; sha256: string }) {
  const ranked = artifact.systems.filter((row) => row.listing === 'ranked').sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const unranked = artifact.systems.filter((row) => row.listing !== 'ranked').sort((a, b) => (b.jevbench_score ?? -1) - (a.jevbench_score ?? -1));
  const rows = [...ranked, ...unranked];
  const notes = rows.filter((row) => artifact.footnotes?.[row.key]);
  const publicDecisions = artifact.tiers.easy + artifact.tiers.standard + artifact.tiers.judge + artifact.tiers.hard;
  const sealedDecisions = artifact.tiers.sealed;
  return <section className="mt-8" aria-labelledby="jev14-board" data-bh-jevbench-v14>
    <h2 id="jev14-board" className="text-2xl font-semibold">JevBench v1.4.0 ranking</h2>
    <p className="bh-muted mt-1 max-w-5xl text-sm">{ranked.length} ranked systems and {unranked.length} unranked rows, measured on {publicDecisions} public decisions plus {sealedDecisions} sealed decisions. The sealed text and answers remain private; only system-level aggregates appear here.</p>

    <section className="bh-panel mt-5 max-w-5xl p-5" aria-labelledby="jev14-changes" data-bh-jev14-changes>
      <h3 id="jev14-changes" className="text-lg font-semibold">What changed in v1.4</h3>
      <ul className="bh-muted mt-3 list-disc space-y-2 pl-5 text-sm">
        <li>Fresh sealed decisions keep the benchmark moving as public items saturate. Sealed items contribute 20% of Intelligence: <code>I = 0.8 × I_v1.3 + 0.2 × I_sealed</code>, where <code>I_sealed = 100 × max(0, (acc_sealed − 0.293) / (1 − 0.293))</code>. Public and sealed scores are published only as aggregates.</li>
        <li>Calibration blends toward the sealed-inclusive result at the approved weight: <code>C = C_v1.3 + (C_v1.4 − C_v1.3) × min(1, 0.2 / 0.35)</code>.</li>
        <li>The <code>k = 1</code> generalization penalty reduces Intelligence when public accuracy exceeds sealed accuracy by more than 25 percentage points: <code>I × (1 − max(0, gap − 25) / 100)</code>. It rewards systems that generalize beyond the public half.</li>
        <li>The four axes use an equal-weight harmonic mean (<code>p = −1</code>). Intelligence below 50 keeps its quadratic penalty; Speed and Cost each have a separate Jev-class gate below 50. Speed and Cost axis calculations are unchanged from v1.3.0.</li>
        <li>The visible <b className="text-gray-200">API</b> flag discloses when an operator endpoint received held-out item text, without answers. Existing system notes preserve disclosures such as Hopper's public-half development and JevK5's public-set selection.</li>
      </ul>
    </section>

    <div className="bh-table-wrap mt-6">
      <table className="bh-table bh-jev-table" data-bh-jev14-table>
        <thead><tr>
          <th scope="col">#</th><th scope="col" className="bh-jev-sticky">System</th><th scope="col">JevBench Score</th>
          <th scope="col">Intelligence</th><th scope="col">Calibration</th><th scope="col">Speed</th><th scope="col">Cost axis</th>
          <th scope="col">Public accuracy<br /><span className="bh-muted text-[11px]">{publicDecisions}</span></th>
          <th scope="col">Sealed accuracy<br /><span className="bh-muted text-[11px]">{sealedDecisions}</span></th>
          <th scope="col">Public − sealed gap</th><th scope="col">Cost / 1,000</th><th scope="col">p50 latency</th><th scope="col">Endpoint</th><th scope="col">Note</th>
        </tr></thead>
        <tbody>{rows.map((row) => <Row key={row.key} row={row} artifact={artifact} />)}</tbody>
      </table>
    </div>
    <p className="bh-muted mt-2 text-xs" data-bh-jev14-api-note>API = the operator's endpoint received sealed item text during evaluation; the answers and item-level results are not published. Cost is per 1,000 decisions. Hover endpoint, cost and API labels for their recorded details.</p>
    <details className="mt-3 text-xs" data-bh-jev14-notes>
      <summary className="cursor-pointer text-accent">System notes and disclosures</summary>
      <ul className="bh-muted mt-2 space-y-1">{notes.map((row) => <li key={row.key} id={`jev14-note-${row.key}`}>† <b className="text-gray-200">{row.display}</b>: {artifact.footnotes[row.key]}</li>)}</ul>
    </details>
    <p className="bh-muted mt-2 text-xs">Artifact: <a className="text-accent underline" href="/api/jevbench/v1.4">v1.4 results JSON</a> · SHA-256 <code title={sha256}>{sha256.slice(0, 12)}…</code> · <a className="text-accent underline" href="https://github.com/fstandhartinger/jevbench/releases/tag/v1.4.0">JevBench v1.4.0 release and method</a></p>
  </section>;
}
