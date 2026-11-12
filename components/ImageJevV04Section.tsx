import { validateImageJevV04Feed } from '../lib/imagejev-v04-feed.mjs';

const number = (value: number, digits = 2) => value.toLocaleString('en-US', {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
});

/** This section accepts only its own validated v0.4 aggregate; no legacy board helpers. */
export function ImageJevV04Section({ feed }: { feed: unknown }) {
  const data = validateImageJevV04Feed(feed);
  if (!data) return null;
  return <section id="imagejev-v04" className="mt-6" aria-labelledby="imagejev-v04-heading" data-bh-imagejev-v04 data-feed-kind={data.data_kind}>
    {data.data_kind === 'fixture' && <aside className="bh-panel border-amber-500 p-4" role="note" data-bh-imagejev-v04-fixture>
      <strong className="text-amber-500">FICTIONAL FIXTURE — NOT BENCHMARK RESULTS</strong>
      <p className="mt-1 text-sm">Every model and number below is made up to preview the v0.4 board.</p>
    </aside>}
    <header className="mt-6 max-w-5xl">
      <p className="bh-eyebrow">Image benchmark · {data.revision} · {data.data_kind === 'fixture' ? 'Fixture preview' : 'Measured aggregates'}</p>
      <h2 id="imagejev-v04-heading" className="mt-1 text-2xl font-semibold">JevImageBench Capability Score — v0.4</h2>
      <p className="mt-3">v0.4 uses a separate scale. Its scores cannot be compared with v0.3 scores.</p>
      <p className="bh-muted mt-2 text-sm">{data.rows.length.toLocaleString('en-US')} systems · {data.items.toLocaleString('en-US')} items · Updated <time dateTime={data.built_utc}>{data.built_utc.slice(0, 10)}</time></p>
      <p className="bh-muted mt-2 text-sm">Raw Capability is the mean of Intelligence and Calibration (0–100), before any serving-budget caps. No ranks are assigned in this preview.</p>
    </header>
    <div className="bh-panel mt-4 p-4" aria-label="v0.4 raw capability scores">
      <ul className="space-y-4">
        {data.rows.map(row => {
          const capability = (row.intelligence + row.calibration) / 2;
          return <li key={row.id}>
            <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm"><span>{row.name}</span><strong>{number(capability)}</strong></div>
            <div role="meter" aria-label={`${row.name} raw Capability`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={capability}
              aria-valuetext={`${number(capability)} out of 100`} className="h-3 overflow-hidden rounded bg-accent/10">
              <div className="h-full rounded bg-accent" style={{ width: `${capability}%` }} />
            </div>
          </li>;
        })}
      </ul>
    </div>
    <section className="mt-8" aria-labelledby="imagejev-v04-results-heading">
      <h3 id="imagejev-v04-results-heading" className="text-xl font-semibold">v0.4 aggregates — all systems</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="bh-table w-full" data-bh-imagejev-v04-table>
          <caption className="sr-only">{data.revision} {data.data_kind === 'fixture' ? 'fictional fixture' : 'measured'} scores. All rows use the v0.4 scale.</caption>
          <thead><tr>{['System', 'Raw Capability', 'Intelligence', 'Calibration', 'Composite', 'Median latency (s)', 'USD / 1,000 decisions', 'Items', 'Measured'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{data.rows.map(row => <tr key={row.id} data-bh-imagejev-v04-row={row.id}>
            <th scope="row" className="text-left font-normal">{row.name}</th>
            <td>{number((row.intelligence + row.calibration) / 2)}</td><td>{number(row.intelligence)}</td><td>{number(row.calibration)}</td><td>{number(row.composite)}</td>
            <td>{number(row.latency_p50_s, 3)}</td><td>{number(row.usd_per_1000, 5)}</td><td>{row.n.toLocaleString('en-US')}</td>
            <td><time dateTime={row.measured_utc}>{row.measured_utc.slice(0, 10)}</time></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
    <section id="imagejev-v04-method" className="bh-panel mt-8 max-w-5xl p-4" aria-labelledby="imagejev-v04-method-heading">
      <h3 id="imagejev-v04-method-heading" className="text-xl font-semibold">v0.4 method disclosure</h3>
      {data.method_disclosure === null
        ? <p className="bh-muted mt-2" data-bh-imagejev-v04-method-placeholder><strong>PLACEHOLDER — release owner to supply the reviewed method disclosure before publication.</strong></p>
        : <p className="mt-2 whitespace-pre-wrap">{data.method_disclosure}</p>}
    </section>
  </section>;
}
