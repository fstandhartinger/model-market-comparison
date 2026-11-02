import release from '../data/imagejev-v03.json';
import currency from '../data/imagejev-currency-20261102.json';

type Entry = { key: string; measured: string; vendor_now: string; status: string; status_label: string; evidence: string[][] };

// CR-664 (2 Nov 2026): metadata only. Names and ranks come from the released artifact so they cannot drift from the table above.
const byKey = new Map<string, any>(release.ranking.map((r: any) => [r.key, r]));
const day = new Date(currency.checked_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function Table({ rows, caption }: { rows: Entry[]; caption: string }) {
  return <div className="mt-3 overflow-x-auto">
    <table className="bh-table w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead><tr><th scope="col">System</th><th>Composite rank</th><th>Measured on this board</th><th>Vendor today ({day})</th><th>Status</th></tr></thead>
      <tbody>{rows.map(e => {
        const r = byKey.get(e.key);
        return <tr key={e.key} data-bh-imagejev-currency-row={e.key} data-bh-imagejev-currency-status={e.status}>
          <td>{r ? r.name : e.key}</td>
          <td>{r && r.ranked ? `#${r.rank}` : 'unranked'}</td>
          <td>{e.measured}</td>
          <td>{e.vendor_now} <span className="bh-muted">{e.evidence.map(([href, label], i) => <span key={href}>{i === 0 ? '' : ' · '}<a href={href} className="text-accent underline" target="_blank" rel="noopener noreferrer">{label}</a></span>)}</span></td>
          <td>{e.status_label}</td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

export function ImageJevCurrencyCheck() {
  return <section id="currency-check" className="mt-10 max-w-6xl" data-bh-imagejev-currency>
    <h2 className="text-2xl font-semibold">Currency check — {day}</h2>
    <p className="bh-muted mt-2 text-sm">{currency.scope}</p>
    <p className="mt-2 text-sm">{currency.queue_note}</p>
    <h3 className="mt-4 font-semibold">Hosted API rows</h3>
    <Table rows={currency.api as Entry[]} caption="Hosted API rows: measured version against the vendor's current version" />
    <h3 className="mt-6 font-semibold">Open-weights rows</h3>
    <Table rows={currency.open_weights as Entry[]} caption="Open-weights rows: pinned revision against the repository head" />
    <p className="bh-muted mt-4 text-sm" data-bh-imagejev-currency-box>{currency.box_note}</p>
  </section>;
}
