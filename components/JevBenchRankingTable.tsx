import Link from 'next/link';
import { isOpenWeightJevRow } from '../lib/jevbench-seo.mjs';
import { jevSystemPath } from '../lib/jev-system-slug.mjs';
import { one, usdPerThousand, costBasisLabel, type SeoRow } from './JevBenchSeoBlocks';
import { oneDe, usdPerThousandDe, costBasisLabelDe, TABLE_HEAD_DE } from './JevBenchSeoDe';

export function JevBenchRankingTable({rows, locale = 'en'}: {rows: SeoRow[]; locale?: 'en' | 'de'}) {
  const de = locale === 'de';
  const num = de ? oneDe : one;
  const head = de ? TABLE_HEAD_DE : ['Rank','Model','Capability','Intelligence','Calibration','Cost per 1,000 decisions','p50 latency','Open weights'];
  const [yes, no, unknown, notEligible] = de ? ['Ja', 'Nein', 'Unbekannt', 'Nicht berücksichtigt'] : ['Yes', 'No', 'Unknown', 'Not eligible'];
  return <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm" data-bh-jev-capability-table>
    <thead><tr>{head.map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
    <tbody>{rows.map((r) => <tr key={r.key} className="border-t">
      <td className="p-2">{r.rank == null ? notEligible : `#${r.rank}`}</td>
      <td className="p-2"><Link className="text-accent underline" href={jevSystemPath(r.key)}>{r.display}</Link></td>
      <td className="p-2">{num(r.capability)}</td><td className="p-2">{num(r.axes.intelligence)}</td><td className="p-2">{num(r.axes.calibration)}</td>
      <td className="p-2">{de ? usdPerThousandDe(r.cost?.usd_per_1000) : usdPerThousand(r.cost?.usd_per_1000)} ({de ? costBasisLabelDe(r.cost?.kind) : costBasisLabel(r.cost?.kind)})</td>
      <td className="p-2">{num(r.speed?.p50_s_adjusted ?? r.speed?.p50_s_raw)} s</td>
      <td className="p-2">{isOpenWeightJevRow(r) || r.open === 'yes' || r.open === 'weights' || r.open === 'open weights' || r.open === true ? yes : r.open === 'no' || r.open === false ? no : unknown}</td>
    </tr>)}</tbody></table></div>;
}
