import type { ComponentProps } from 'react';
import { JevBenchV16ArchiveMethod, type JevBenchV16Board } from './JevBenchV16Board';
import { JevBenchArchiveLoader } from './JevBenchArchiveLoader';
import { jevV16BoardRows } from '../lib/jevbench-board-rows.mjs';
import { jevV16ChartRow } from '../lib/jevbench-v15-board.mjs';
import { jevClassRows, JEV_V16_CLASS_OPTIONS } from '../lib/jevbench-jev-class.mjs';
import { jevBelowRankedLast } from '../lib/jev-below-ranked.mjs';
import { jevbenchRelease } from '../lib/jevbench-releases.mjs';
import { one } from '../lib/jevbench-board-format.mjs';
import { usd } from './JevCapabilityChart';
import { referenceNote, unrankedNote } from '../lib/jevbench-capability-notes.mjs';

/** Server boundary: only version (never the board or categories) crosses into the loader's Flight payload. */
export function JevBenchArchiveBoard({ version, ...props }: ComponentProps<typeof JevBenchV16Board> & { version: string }) {
  const { artifact, sha256 } = props;
  if (artifact.revision !== version) throw new Error(`Archive ${version} received artifact ${artifact.revision}`);
  const rows = jevV16BoardRows(artifact, props.scope).map(jevV16ChartRow);
  const view = jevClassRows(rows, { ...JEV_V16_CLASS_OPTIONS, nearCapPrecision: true });
  const inside = jevBelowRankedLast(view.rows.filter(r => r.inClass));
  let rank = 0;
  const top = [...inside.map(r => ({ ...r, rank: r.row.ranked ? String(++rank) : '–' })),
    ...view.rows.filter(r => !r.inClass).map(r => ({ ...r, rank: '–' }))].slice(0, 20);
  const jsonHref = `/api/jevbench/${version}/board`;
  const published = jevbenchRelease(version)?.date;
  return <section className="mt-6" data-bh-jev-archive-summary={version}>
    <h2 className="text-2xl font-bold">JevBench {version} · archive summary</h2>
    <p className="bh-muted mt-2 text-sm">{rows.length} measured rows · {artifact.n_ranked} ranked{published && <> · Published {published}</>} · Release {version}</p>
    <p className="bh-muted mt-2 break-all text-xs">Aggregate SHA-256 {sha256} · <a className="text-accent underline" href={`/api/jevbench/${version}`}>Aggregate results JSON</a> · <a className="text-accent underline" href={jsonHref}>Full board JSON</a></p>
    <p className="mt-3 max-w-4xl text-sm">Capability Score averages Intelligence and Calibration. The ranking uses the board’s official Jev-class cost and latency limits. The top 20 rows in its default order are shown below; rows outside the limits retain their scores and are listed after the qualifying rows.</p>
    <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm tabular" data-bh-jev-archive-top>
      <caption className="sr-only">JevBench {version}: top 20 rows in the default Capability ranking</caption>
      <thead><tr>{['Rank', 'System', 'Capability Score', 'Composite', 'Cost / 1,000 decisions'].map(h => <th className="p-2" key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>{top.map(r => <tr className="border-t border-line" key={r.row.key} data-bh-jev-archive-row={r.row.key}>
        <td className="p-2">{r.rank}</td><th className="p-2 font-normal" scope="row">{r.row.display}{!r.inClass && <span className="bh-muted block text-xs">Outside: {r.reasons.join(', ')}</span>}{r.inClass && (r.isReference || !r.row.ranked) && <span className="bh-muted block text-xs">{r.isReference ? referenceNote() : unrankedNote(r.row.listing, 'JevBench', (r.row as { preliminary?: { label?: string | null } | null }).preliminary)}</span>}</th>
        <td className="p-2">{one(r.capability)}</td><td className="p-2">{one(r.row.jevbench_score)}</td><td className="p-2">{r.row.cost?.kind === 'estimate' && 'est. '}{r.row.cost?.usd_per_1000 == null ? '—' : usd(r.row.cost.usd_per_1000)}</td>
      </tr>)}</tbody>
    </table></div>
    <JevBenchArchiveLoader version={version} />
    <JevBenchV16ArchiveMethod {...props} />
  </section>;
}
