import box from '../data/imagejev-box-v01.json';

const KINDS: [string, string][] = [['single', 'Single'], ['ref', 'Referring'], ['small', 'Small'], ['doc', 'Document'], ['ui', 'UI']];
const num = (v: any, d = 1) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '—');
const pct = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? (v * 100).toFixed(0) + ' %' : '—');
const usd = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? (v === 0 ? '0' : v < 0.01 ? v.toFixed(5) : v.toFixed(3)) : '—');
const sec = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(2) + ' s' : '—');
const ci = (v: any) => (Array.isArray(v) && v.length === 2 ? `95 % CI ${num(v[0])}–${num(v[1])}` : null);

function Tag({ s }: { s: any }) {
 return s.kind === 'api' ? <span className="bh-thin-tag ml-1.5" title="Hosted API">API</span> : s.kind === 'self-hosted' ? <span className="bh-thin-tag ml-1.5" title="Self-hosted on our GPU">self-hosted</span> : null;
}

function Name({ s }: { s: any }) {
 return <th className="text-left font-normal">{s.url ? <a className="text-accent underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a> : s.name}<Tag s={s} />
  <span className="bh-muted block text-xs">{[s.author, s.licence, s.params].filter(Boolean).join(' · ')}{s.access ? <><br />{s.access}</> : null}</span></th>;
}

export function ImageJevBoxTrack() {
 const b: any = box;
 const systems: any[] = b.systems ?? [];
 const baselines: any[] = b.baselines ?? [];
 const ranked = systems.filter(s => s.ranked).sort((x, y) => (x.rank ?? 1e9) - (y.rank ?? 1e9));
 const unranked = systems.filter(s => !s.ranked);
 const maxCap = Math.max(1, ...ranked.map(s => s.capability ?? 0));
 const it = b.items ?? {};
 const fam = it.families ?? {};
 const notMeasured = Object.entries(b.not_measured ?? {});
 const row = (s: any, showRank: boolean) => <tr key={s.key} data-bh-box-row>
  <td>{showRank ? '#' + s.rank : '—'}</td><Name s={s} />
  <td>{num(s.capability, 2)}</td>
  <td>{num(s.box_intelligence)}{ci(s.ci95) && <span className="bh-muted block text-xs">{ci(s.ci95)}</span>}</td>
  <td>{pct(s.acc50)}</td><td>{num(s.calibration)}</td><td>{sec(s.p50_s)}</td><td>{usd(s.cost_per_1000)}</td>
 </tr>;
 const head = <thead><tr><th>Rank</th><th>System</th><th>Box Capability</th><th>Box Intelligence</th><th>Acc@0.5</th><th>Calibration</th><th>p50 latency</th><th>$ / 1,000 boxes</th></tr></thead>;
 return <section id="box-track" className="mt-10 max-w-5xl scroll-mt-20" data-bh-v03-box-track>
  <h2 className="text-2xl font-semibold">Box track — find it in the image <span className="bh-thin-tag ml-2">PREVIEW</span></h2>
  <p className="mt-3">A Box question shows one image and a short description such as “the signature field” or “the rightmost truck”. The model answers with a bounding box (four edges as fractions of the image) and a confidence. This is the new <code>box</code> question type of Jev 1.14. The Box track is separate: it does not change the core ranking or Capability Score above.</p>
  <p className="bh-muted mt-2 text-sm">{it.public ?? '—'} public items{it.sealed ? <> (the {it.sealed} sealed items are held back for official runs)</> : null}
   {Object.keys(fam).length > 0 && <>: {Object.entries(fam).map(([k, v]) => `${({ coco: 'photos', doc: 'documents', ui: 'UI screenshots' } as any)[k] ?? k} ${v}`).join(', ')}</>}.
   Preview built {String(b.built_utc ?? '').slice(0, 10)}; some systems may still be running.</p>
  {ranked.length > 0 && <div className="bh-panel mt-4 p-4" data-bh-box-chart>
   <h3 className="font-semibold">Box Capability (ranked systems)</h3>
   <ul className="mt-3 grid gap-2">{ranked.map(s => <li key={s.key} className="grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-2 text-sm sm:grid-cols-[14rem_1fr_3rem]">
    <span className="truncate" title={s.name}>{s.name}<Tag s={s} /></span>
    <span className="h-4 rounded bg-line/30" role="img" aria-label={`${s.name}: Box Capability ${num(s.capability, 2)}`}><span className="block h-4 rounded bg-accent" style={{ width: `${Math.max(1, Math.min(100, (s.capability ?? 0) / maxCap * 100))}%` }} /></span>
    <span className="text-right tabular-nums">{num(s.capability, 1)}</span></li>)}</ul>
  </div>}
  <div className="mt-4 overflow-x-auto"><table className="bh-table w-full" data-bh-box-table>{head}<tbody>
   {ranked.map(s => row(s, true))}
   {unranked.length > 0 && <tr><td colSpan={8} className="bh-muted pt-4 text-xs font-semibold uppercase tracking-wide">Measured, not ranked</td></tr>}
   {unranked.map(s => <tr key={s.key} data-bh-box-row data-bh-box-unranked><td>—</td><Name s={s} /><td>{num(s.capability, 2)}</td><td>{num(s.box_intelligence)}{ci(s.ci95) && <span className="bh-muted block text-xs">{ci(s.ci95)}</span>}</td><td>{pct(s.acc50)}</td><td>{num(s.calibration)}</td><td>{sec(s.p50_s)}</td><td>{usd(s.cost_per_1000)}<span className="bh-muted mt-1 block text-xs">Not ranked: {s.not_ranked_because ?? 'did not meet the ranking rule'}</span></td></tr>)}
  </tbody></table></div>
  <p className="bh-muted mt-2 text-xs">Box Intelligence is the mean IoU × 100. Acc@0.5 is the share of boxes with IoU ≥ 0.5. Calibration is how well the stated confidence predicts IoU ≥ 0.5. Cost is per 1,000 boxes.</p>
  {baselines.length > 0 && <div className="mt-6" data-bh-box-baselines><h3 className="font-semibold">Reference baselines (not ranked)</h3>
   <div className="mt-2 overflow-x-auto"><table className="bh-table"><thead><tr><th>Baseline</th><th>Box Intelligence</th><th>Acc@0.5</th><th>Box Capability</th></tr></thead><tbody>{baselines.map(s => <tr key={s.key}><th className="text-left font-normal">{s.name}</th><td>{num(s.box_intelligence)}</td><td>{pct(s.acc50)}</td><td>{num(s.capability, 2)}</td></tr>)}</tbody></table></div></div>}
  {ranked.length > 0 && <div className="mt-6" data-bh-box-by-kind><h3 className="font-semibold">By item type — Box Intelligence</h3>
   <div className="mt-2 overflow-x-auto"><table className="bh-table"><thead><tr><th>System</th>{KINDS.map(([k, l]) => <th key={k}>{l}{it.kinds?.[k] ? <span className="bh-muted block text-xs font-normal">n={it.kinds[k]}</span> : null}</th>)}</tr></thead><tbody>{ranked.map(s => <tr key={s.key}><th className="text-left font-normal">{s.name}</th>{KINDS.map(([k]) => <td key={k}>{num(s.by_kind?.[k]?.box_intelligence)}</td>)}</tr>)}</tbody></table></div></div>}
  <details className="mt-6" data-bh-box-method><summary className="cursor-pointer text-accent">How it is scored</summary>
   <div className="mt-2 grid gap-2 text-sm">
    {b.headline && <p><b>Headline.</b> {b.headline}.</p>}
    {b.ranking_floor?.rule && <p><b>Ranking rule.</b> {b.ranking_floor.rule}{typeof b.ranking_floor.box_intelligence === 'number' && <> (floor at this revision: Box Intelligence ≥ {num(b.ranking_floor.box_intelligence)}).</>}</p>}
    <p><b>Calibration.</b> Expected calibration error of the stated confidence against the event “IoU ≥ 0.5”, scaled to 0–100.</p>
    <p><b>Latency and cost.</b> p50 latency is the median wall time per request; cost is per 1,000 boxes (provider price for APIs, GPU seconds for self-hosted models).</p>
    {Array.isArray(b.notes) && b.notes.length > 0 && <ul className="list-disc pl-5">{b.notes.map((n: string) => <li key={n}>{n}</li>)}</ul>}
    {notMeasured.length > 0 && <div><b>Not measured yet.</b><ul className="list-disc pl-5">{notMeasured.map(([k, v]) => <li key={k}>{k}: {String(v)}</li>)}</ul></div>}
   </div></details>
 </section>;
}
