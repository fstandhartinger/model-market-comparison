import { jevOldNewRows, jevFixed, jevSigned, JEV_REMEASURE_PENDING_LABEL, JEV_CARRY_LABEL, JEV_LIMIT_RULE_EN, JEV_LIMIT_RAW_NOTE } from '../lib/jev-decision-limit.mjs';
import { JevMethodTag } from './JevMethodTag';

type Systems = Parameters<typeof jevOldNewRows>[0];
type Carry = NonNullable<Parameters<typeof jevOldNewRows>[1]>;

/**
 * Release-page table for JevBench v1.7.0 (precedent: the v1.6.30 old/new cost table): every board row with its v1.6.37 value
 * and its v1.7.0 value side by side, sorted by new rank, pending and carried rows at the end. Closed by default.
 * Pending rows have empty "new" cells and the pending label; carry rows show their v1.5 value as the old value.
 */
export function JevV170OldNewTable({ systems, carryRows = [], carryLabel = JEV_CARRY_LABEL, previousRelease = 'v1.6.37', csvHref }: { systems: Systems; carryRows?: Carry; carryLabel?: string; previousRelease?: string; csvHref?: string }) {
  const rows = jevOldNewRows(systems, carryRows);
  const rescored = rows.filter((r) => r.status === 're-scored').length;
  const pending = rows.filter((r) => r.status === 'remeasure-pending').length;
  const added = rows.filter((r) => r.status === 'new').length;
  const remeasured = rows.filter((r) => r.status === 'remeasured').length;
  const carry = rows.filter((r) => r.status === 'carry').length;
  const hasNew = (r: { status: string }) => r.status === 're-scored' || r.status === 'new' || r.status === 'remeasured';
  const cell = (v: number | null, d = 2) => (v == null ? '—' : jevFixed(v, d));
  return <details className="bh-panel mt-8 p-5" data-bh-jev-v170-old-new>
    <summary className="cursor-pointer text-lg font-semibold">Old and new values, every row ({rescored} re-scored{added > 0 ? ` · ${added} new in v1.7.0` : ''}{remeasured > 0 ? ` · ${remeasured} re-measured on a GPU` : ''} · {pending} re-measure pending · {carry} carried)</summary>
    <p className="bh-muted mt-2 max-w-4xl text-sm" data-bh-jev-v170-old-new-note>Old = {previousRelease} (method v1.6, no time limit). New = v1.7.0 (method v1.7). {JEV_LIMIT_RULE_EN} {JEV_LIMIT_RAW_NOTE} Rows marked “{JEV_REMEASURE_PENDING_LABEL}” keep only their v1.6 values; they have no v1.7 value and no v1.7 rank. Carried rows were “{carryLabel}”.</p>
    {csvHref && <p className="mt-1 text-sm"><a className="text-accent underline" href={csvHref} data-bh-jev-v170-old-new-csv>Download the table as CSV</a></p>}
    <div className="mt-3 max-h-[40rem] overflow-auto"><table className="w-full text-left text-sm tabular">
      <caption className="sr-only">JevBench {previousRelease} values next to the v1.7.0 values</caption>
      <thead><tr>{['System', 'Method', `A ${previousRelease}`, 'A v1.7.0', 'Δ A', `Capability ${previousRelease}`, 'Capability v1.7.0', 'Rank old → new', `Speed ${previousRelease}`, 'Speed v1.7.0', 'p50 / p95 (measured)', 'Over 10 s', 'Status']
        .map((h) => <th key={h} scope="col" className="p-2">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r) => {
        const sys = r.status === 'carry' ? undefined : (systems as Array<{ key: string }>).find((s) => s.key === r.key);
        return <tr key={`${r.status}-${r.key}`} className="border-t border-line" data-bh-jev-v170-row={r.key} data-bh-jev-v170-status={r.status}>
          <th scope="row" className="p-2 font-normal">{r.name}</th>
          <td className="p-2 whitespace-nowrap">{r.status === 'carry' ? <JevMethodTag row={{ key: r.key }} carry carryLabel={carryLabel} className="" /> : <JevMethodTag row={sys ?? { key: r.key }} className="" />}</td>
          <td className="p-2" data-bh-jev-v170-old-a>{cell(r.oldA)}</td>
          <td className="p-2" data-bh-jev-v170-new-a>{hasNew(r) ? cell(r.newA) : <span className="bh-muted">—</span>}</td>
          <td className="p-2">{jevSigned(r.dA)}</td>
          <td className="p-2">{cell(r.oldCapability)}</td>
          <td className="p-2">{hasNew(r) ? cell(r.newCapability) : <span className="bh-muted">—</span>}</td>
          <td className="p-2 whitespace-nowrap">{r.oldRank ?? '—'} → {hasNew(r) ? r.newRank ?? '—' : '—'}</td>
          <td className="p-2">{cell(r.oldSpeed, 1)}</td>
          <td className="p-2">{hasNew(r) ? cell(r.newSpeed, 1) : <span className="bh-muted">—</span>}</td>
          <td className="p-2 whitespace-nowrap" data-bh-jev-v170-latency>{r.p50Raw == null ? '—' : `${jevFixed(r.p50Raw, 3)} / ${jevFixed(r.p95Raw, 3)} s`}</td>
          <td className="p-2 whitespace-nowrap" data-bh-jev-v170-over>{r.nOver == null ? '—' : `${r.nOver} of ${r.n ?? '—'}`}</td>
          <td className="p-2 whitespace-nowrap">{r.status === 're-scored' ? 're-scored' : r.status === 'new' ? 'new in v1.7.0 (no v1.6 value)' : r.status === 'remeasured' ? 're-measured on a GPU (replaces the CPU row)' : r.status === 'carry' ? 'carried (v1.5)' : JEV_REMEASURE_PENDING_LABEL}</td>
        </tr>;
      })}</tbody>
    </table></div>
  </details>;
}
