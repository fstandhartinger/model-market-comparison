import Link from 'next/link';
import { isOpenWeightJevRow } from '../lib/jevbench-seo.mjs';
import { jevSystemPath } from '../lib/jev-system-slug.mjs';
import { one, usdPerThousand, costBasisLabel, type SeoRow } from './JevBenchSeoBlocks';

export function JevBenchRankingTable({rows}: {rows: SeoRow[]}) {
  return <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm" data-bh-jev-capability-table>
    <thead><tr>{['Rank','Model','Capability','Intelligence','Calibration','Cost per 1,000 decisions','p50 latency','Open weights'].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
    <tbody>{rows.map((r) => <tr key={r.key} className="border-t">
      <td className="p-2">{r.rank == null ? 'Not eligible' : `#${r.rank}`}</td>
      <td className="p-2"><Link className="text-accent underline" href={jevSystemPath(r.key)}>{r.display}</Link></td>
      <td className="p-2">{one(r.capability)}</td><td className="p-2">{one(r.axes.intelligence)}</td><td className="p-2">{one(r.axes.calibration)}</td>
      <td className="p-2">{usdPerThousand(r.cost?.usd_per_1000)} ({costBasisLabel(r.cost?.kind)})</td>
      <td className="p-2">{one(r.speed?.p50_s_adjusted ?? r.speed?.p50_s_raw)} s</td>
      <td className="p-2">{isOpenWeightJevRow(r) || r.open === 'yes' || r.open === 'weights' || r.open === 'open weights' || r.open === true ? 'Yes' : r.open === 'no' || r.open === false ? 'No' : 'Unknown'}</td>
    </tr>)}</tbody></table></div>;
}
