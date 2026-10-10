import { readFile } from 'node:fs/promises';

// PREVIEW ONLY (Florian, 10 Oct 2026; not linked, not rolled out): Option 2 for the version tabs — one board with
// every system, newer draws merged after anchor equating, each row showing its draw and date, tabs moved into a
// release history. Scores for cohort rows are deliberately not shown: they are not equated yet.
export const metadata = { title: 'Preview · JevBench one board', robots: { index: false, follow: false } };

type Row = { key: string; display: string; capability: number; jevbench_score: number | null; rank: number | null; ranked?: boolean;
  cost?: { usd_per_1000?: number | null }; speed?: { p50_s_adjusted?: number | null }; last_measured_on?: string; measured_in?: string; ranks?: { capability?: number } };
const read = async (v: string) => JSON.parse(await readFile(`${process.cwd()}/data/raw/benchmarks/jevbench/v1.6/jevbench-v${v}-results.json`, 'utf8')) as { systems: Row[] };
const short = (s: string) => s.replace(/\s*\(.*$/, '');
const usd = (v?: number | null) => (v == null ? '—' : `$${Number(v.toPrecision(2))}`);
const secs = (v?: number | null) => (v == null ? '—' : v >= 1 ? `${v.toFixed(1)} s` : `${Math.round(v * 1000)} ms`);
const date = (d?: string) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '—');
const DRAW: Record<string, string> = { 'v1.6.0': 'Draw A', 'v1.6.1': 'Draw A', 'v1.6.4': 'Draw B', 'v1.6.5': 'Draw C' };

export default async function PreviewOneBoard() {
  const main = await read('1.6.1');
  const fast = await read('1.6.4');
  const regular = await read('1.6.5');
  const top = main.systems.filter((s) => s.ranks?.capability).sort((a, b) => (a.ranks!.capability! - b.ranks!.capability!)).slice(0, 10);
  const joining = [...fast.systems.map((s) => ({ ...s, measured_in: 'v1.6.4' })), ...regular.systems.map((s) => ({ ...s, measured_in: 'v1.6.5' }))].filter((s) => s.ranked);
  const total = main.systems.length + fast.systems.length + regular.systems.length;
  const releases = [
    ['v1.6.5', '10 Oct', '8 new open systems, Draw C', 'merged after equating'],
    ['v1.6.2–v1.6.4', '9–10 Oct', 'paid fast-lane cohort, Draw B', 'merged after equating'],
    ['v1.6.1', '7 Oct', '140 systems, Draw A', 'base board'],
    ['v1.6.0', '2 Oct', '94 systems, Draw A', 'superseded'],
  ];
  return <main className="mx-auto max-w-6xl px-4 py-6" data-bh-preview-one-board>
    <div className="mb-4 rounded border border-warn bg-warn/10 px-3 py-2 text-sm">Preview for review — not live. Layout for “Option 2: one board”. Rows from the newer draws show no score here because the anchor equating does not exist yet.</div>
    <header className="bh-page-head">
      <div className="bh-eyebrow">JevBench · one board</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">JevBench — AI decision model leaderboard</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border border-accent2 px-3 py-1 font-semibold text-accent2">Up to date · {total} systems</span>
        <span className="rounded-full border border-line px-3 py-1">Last change 10 Oct 2026: 12 systems joined from 2 new draws</span>
        <details className="basis-full sm:basis-auto">
          <summary className="cursor-pointer rounded-full border border-line px-3 py-1 text-accent">Release history</summary>
          <div className="bh-panel mt-2 w-full max-w-[560px] p-3 text-sm">
            {releases.map(([v, d, what, status]) => <div key={v} className="flex justify-between gap-3 border-b border-line/50 py-1.5 last:border-0">
              <span><strong>{v}</strong> · {d} · {what}</span><span className="bh-muted whitespace-nowrap">{status}</span></div>)}
          </div>
        </details>
      </div>
    </header>

    <section className="bh-panel mt-6 p-4 text-sm" data-bh-preview-anchor-method>
      <h2 className="text-lg font-semibold">How a new draw joins this board</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>Each release still scores on a fresh draw of sealed items (rotation rule unchanged).</li>
        <li>Every new draw also re-runs a fixed set of 8 self-hosted <strong>anchor systems</strong> spread across the score range.</li>
        <li>Their scores on the old and the new draw give the conversion onto the main scale (linear equating per axis, bootstrap 95% CI; one frozen field median for the gap penalty).</li>
        <li>New systems appear on the main board as soon as they are measured, with their draw and date and a wider CI.</li>
      </ol>
    </section>

    <section className="mt-6" aria-labelledby="pv-table">
      <h2 id="pv-table" className="text-xl font-semibold">JevBench Capability Score — all systems</h2>
      <div className="bh-matrix-wrap mt-3">
        <table className="w-full sm:min-w-[640px] text-sm">
          <thead><tr className="text-left">
            <th className="p-2">#</th><th className="p-2">System</th><th className="p-2 text-right">Capability</th><th className="hidden p-2 text-right sm:table-cell">$ / 1,000</th><th className="hidden p-2 text-right sm:table-cell">Median</th><th className="p-2">Measured</th>
          </tr></thead>
          <tbody>
            {top.map((s) => <tr key={s.key} className="border-t border-line/50">
              <td className="p-2">{s.ranks?.capability}</td><td className="p-2">{short(s.display)}</td>
              <td className="p-2 text-right font-semibold">{s.capability.toFixed(1)}</td><td className="hidden p-2 text-right sm:table-cell">{usd(s.cost?.usd_per_1000)}</td>
              <td className="hidden p-2 text-right sm:table-cell">{secs(s.speed?.p50_s_adjusted)}</td>
              <td className="p-2"><span className="bh-matrix-tag">{DRAW[s.measured_in ?? ''] ?? '—'}</span> {date(s.last_measured_on)}</td>
            </tr>)}
            <tr className="border-t border-line"><td colSpan={6} className="bh-muted p-2 text-xs">… 125 more on Draw A …</td></tr>
            <tr className="border-t border-line bg-accent/5"><td colSpan={6} className="p-2 text-xs font-semibold">Joined 9–10 Oct — placed by score once equated (preview shows them grouped)</td></tr>
            {joining.map((s) => <tr key={s.key} className="border-t border-line/50">
              <td className="p-2">·</td><td className="p-2">{short(s.display)} <span className="bh-matrix-tag" data-tag="headline">new</span></td>
              <td className="bh-muted p-2 text-right">equating</td><td className="hidden p-2 text-right sm:table-cell">{usd(s.cost?.usd_per_1000)}</td>
              <td className="hidden p-2 text-right sm:table-cell">{secs(s.speed?.p50_s_adjusted)}</td>
              <td className="p-2"><span className="bh-matrix-tag">{DRAW[s.measured_in ?? '']}</span> {date(s.last_measured_on)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className="bh-muted mt-2 text-xs">The full page keeps every section below this table (charts, comparison, method notes, What-If, revision history).</p>
    </section>
  </main>;
}
