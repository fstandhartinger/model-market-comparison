import { JevBenchLegacyArchiveLoader } from './JevBenchLegacyArchiveProvider';
import { JevV14ArchiveMethod, jevV14BoardRows } from './JevModelsV14';
import { JevV15ArchiveMethod, jevV15ArchiveChartData } from './JevBenchV15View';
import { jevClassView } from './jevClassView';
import { jevV15BoardSystem } from '../lib/jevbench-v15-board.mjs';
import { jevOldNewRows } from '../lib/jev-decision-limit.mjs';
import { jevBelowRankedLast } from '../lib/jev-below-ranked.mjs';
import { one, dollars } from './JevBoardShared';
import { usd as capabilityUsd } from './JevCapabilityChart';
import { jevFixed } from '../lib/jev-decision-limit.mjs';
import { JevHistoricalSupplementHeader } from './JevHistoricalSupplementHeader';
import { jevbenchRelease } from '../lib/jevbench-releases.mjs';

type Props = { version: string; part?: string; [key: string]: any };
export function JevBenchLegacyArchiveWidget({ version, part = 'board', ...props }: Props) {
  const a = props.artifact;
  const isV15 = version.startsWith('v1.5.');
  const isCapability = isV15 || (version === 'v1.4.2.2' && part === 'capability');
  const primary = version === 'v1.4.2.2' ? part === 'capability' : part === 'board';
  let rows: Array<{ key: string; name: string; rank: string; score: number | null; cost?: number | null }> = [];
  let count = 0;
  if (primary && version === 'v1.7.0') {
    const ordered = jevOldNewRows(props.systems, props.carryRows);
    count = ordered.length;
    rows = ordered.slice(0, 20).map((r: any) => ({ key: r.key, name: r.name, rank: r.newRank == null ? '–' : String(r.newRank), score: r.newA }));
  } else if (primary && isCapability) {
    const source = a ? jevV15ArchiveChartData(a) : props.systems;
    const view = jevClassView(isV15 ? source.map(jevV15BoardSystem) : source);
    let rank = 0;
    const ordered = [...jevBelowRankedLast(view.rows.filter(r => r.inClass)), ...view.rows.filter(r => !r.inClass)];
    count = a?.systems.length ?? props.systems.length;
    rows = ordered.slice(0, 20).map(r => ({ key: r.row.key, name: r.row.display, rank: r.inClass && r.row.ranked ? String(++rank) : '–', score: r.capability, cost: r.cost }));
  } else if (primary && a) {
    count = a.systems.length;
    rows = jevV14BoardRows(a).slice(0, 20).map(r => ({ key: r.key, name: r.display, rank: r.rank == null ? '–' : String(r.rank), score: r.jevbench_score, cost: r.cost?.usd_per_1000 }));
  }
  const published = jevbenchRelease(version)?.date ?? a?.published_on;
  const date = published ?? a?.generated_utc;
  return <JevBenchLegacyArchiveLoader version={version} part={part}>
    {primary && <section className="mt-6" data-bh-jev-archive-summary={version}>
      <h2 className="text-2xl font-bold">JevBench {version} · archive summary</h2>
      <p className="bh-muted mt-2 text-sm">{count} rows · Release {version}{date && <> · {published ? 'Published' : 'Generated'} {date}</>}</p>
      {props.sha256 && <p className="bh-muted mt-2 break-all text-xs">Aggregate SHA-256 {props.sha256} · <a className="text-accent underline" href={`/api/jevbench/${version}`}>Aggregate results JSON</a></p>}
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm tabular" data-bh-jev-archive-top>
        <caption className="sr-only">JevBench {version}: top 20 rows in the default order</caption>
        <thead><tr>{['Rank', 'System', isCapability ? 'Capability Score' : 'Composite', ...(version === 'v1.7.0' ? [] : ['Cost / 1,000 decisions'])].map(h => <th className="p-2" key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map(r => <tr key={r.key} className="border-t border-line" data-bh-jev-archive-row={r.key}><td className="p-2">{r.rank}</td><th className="p-2 font-normal" scope="row">{r.name}</th><td className="p-2">{version === 'v1.7.0' ? r.score == null ? '—' : jevFixed(r.score, 2) : one(r.score)}</td>{version !== 'v1.7.0' && <td className="p-2">{isCapability ? r.cost == null ? '—' : capabilityUsd(r.cost) : dollars(r.cost)}</td>}</tr>)}</tbody>
      </table></div>
    </section>}
    {part === 'board' && version.startsWith('v1.4') && <JevV14ArchiveMethod />}
    {part === 'board' && isV15 && <JevV15ArchiveMethod artifact={a} sha256={props.sha256} />}
    {part === 'supplement' && <section id="historical-measurements" className="mx-auto max-w-7xl px-4 py-10 sm:px-6" data-jevbench-historical-supplement><JevHistoricalSupplementHeader artifact={a} /><p className="bh-muted mt-3 break-all text-xs">Aggregate SHA-256 {props.sha256}</p></section>}
    {!primary && <p className="bh-muted mt-5 text-sm">Load the full board to explore {part === 'supplement' ? 'additional historical measurements' : 'the interactive charts'}.</p>}
  </JevBenchLegacyArchiveLoader>;
}
