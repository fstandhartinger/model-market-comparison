"use client";

import { CostValue, JevModelsV12Board } from './JevModelsV12';
import { JevRadars } from './JevRadars';
import type { JevV12View } from '../lib/jevbench-v12.mjs';
import type { JevTasksView } from '../lib/jevbench-v12-tasks.mjs';
import type { JevTopicsView } from '../lib/jevbench-v12-topics.mjs';

export type JevHistoryPayload = {
  view: JevV12View;
  topics: JevTopicsView;
  tasks: JevTasksView;
  heldout: {
    rows: Array<{ key: string; display: string; partial: boolean; publicCorrect: number; publicN: number; publicAccuracy: number | null; heldoutCorrect: number; heldoutN: number; heldoutAccuracy: number | null; gap: number | null; ciLow: number | null; ciHigh: number | null }>;
    fieldMeanGap: number;
    fieldN: number;
  };
};

const one = (v: number | null) => (v === null ? '—' : v.toFixed(1));
const pct = (v: number | null) => (v === null ? '—' : `${(100 * v).toFixed(1)}%`);
const points = (v: number | null, signed = false) => v === null ? '—' : `${signed && v >= 0 ? '+' : ''}${(100 * v).toFixed(1)}`;
const short = (d: string) => d.split(' (')[0].split(', formerly')[0];
const gap = (a: number, b: number) => (Math.round(a * 10) - Math.round(b * 10)) / 10;

function HistoryRows({ payload }: { payload: JevHistoryPayload }) {
  const { view, topics, tasks, heldout } = payload;
  const [lead] = view.ranked;
  const rankOf = (key: string) => view.ranked.findIndex((r) => r.key === key) + 1;
  const bestOpen = view.ranked.find((r) => r.cls === 'jev-rebuild');
  const jev = view.ranked.find((r) => r.cls === 'jev');
  const topInt = [...view.ranked].sort((a, b) => (b.axes.intelligence ?? 0) - (a.axes.intelligence ?? 0))[0];
  const [topHonorable] = view.honorable;

  return <>
    <p className="bh-muted mb-5 max-w-4xl text-sm">The following public-only tables and diagnostics preserve the earlier JevBench v1.3.0 view. The ranking above is the current v1.4.1 result.</p>
    <JevModelsV12Board view={view} tasks={tasks}>
      <aside className="bh-panel mt-6 max-w-4xl p-4 text-sm" data-bh-jev-score-change>
        <h2 className="font-semibold">What changed in the score</h2>
        <p className="bh-muted mt-1">A system that is cheap and fast but barely better than guessing could rank high; intelligence is now measured above chance, and systems below half-way get a growing penalty. The tasks, Calibration, Speed, Cost and ranking eligibility are unchanged.</p>
      </aside>
      {lead && <section className="mt-8 max-w-4xl" aria-labelledby="jev12-headline">
        <h2 id="jev12-headline" className="text-xl font-semibold">What the run says (JevBench Score)</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px]" data-bh-jev12-findings>
          <li><b>{lead.display}</b> leads with {one(lead.main)}: Intelligence {one(lead.axes.intelligence)}, Calibration {one(lead.axes.calibration)}, Speed {one(lead.axes.speed)}, Cost {one(lead.axes.cost)} (<CostValue r={lead} /> per 1,000 decisions).</li>
          {jev && jev.key !== lead.key && <li><b>{jev.display}</b> is #{rankOf(jev.key)} at {one(jev.main)}, {one(gap(lead.main, jev.main))} points behind.</li>}
          {topHonorable && <li data-bh-jev12-honorable-lead><b>{short(topHonorable.display)}</b> scores {one(topHonorable.main)} — higher than anything in the ranking — but is <b>not ranked</b>: it runs {view.honorableMentions?.systems[topHonorable.key]?.runs_on ?? 'another entrant&rsquo;s model'}, so ranking it would put the same model in the list twice, once at the model&apos;s own price and once at the service&apos;s. It keeps every number it earned under <a href="#jev12-honorable" className="text-accent underline">{view.honorableMentions?.heading ?? 'Honorable mentions'}</a>.</li>}
          {bestOpen && bestOpen.key !== lead.key && <li>Open rebuilds of Jev appeared within days. The best of them, <b>{bestOpen.display}</b>, is #{rankOf(bestOpen.key)} at {one(bestOpen.main)} — <span data-bh-jev12-gap>{one(gap(lead.main, bestOpen.main))} points behind</span>: more speed and a lower (estimated) price, less intelligence and calibration.</li>}
          {topInt && topInt.key !== lead.key && <li><b>{topInt.display}</b> has the highest Intelligence ({one(topInt.axes.intelligence)}) but places #{rankOf(topInt.key)}: its cost score is {one(topInt.axes.cost)} (<CostValue r={topInt} /> per 1,000 decisions), and the geometric mean does not let that back.</li>}
          {view.partial.length > 0 && <li>{view.partial.map((r) => short(r.display)).join(', ')} did not answer every tier — each for the reason in its † note; they are shown below the ranking as partial runs, without a rank.</li>}
        </ul>
      </section>}
    </JevModelsV12Board>
    <JevRadars ranked={view.ranked} honorable={view.honorable} partial={view.partial} topics={topics} />
    <details id="held-out-diagnostic" className="bh-panel mt-8 max-w-5xl scroll-mt-6 p-5" data-bh-jev-heldout>
      <summary className="cursor-pointer text-sm font-semibold">Held-out hard-tier detail</summary>
      <div className="bh-muted mt-4 space-y-3 text-sm">
        <p>With about 110 items on each side, ordinary noise is roughly ±9 percentage points. Read a system&apos;s public-minus-held-out gap against the field mean ({points(heldout.fieldMeanGap, true)} points across {heldout.fieldN} complete systems): only an outlier against that field is meaningful. &ldquo;Not public&rdquo; does not mean &ldquo;not seen&rdquo;, because held-out items were sent to hosted APIs.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs" data-bh-jev-heldout-table>
            <thead><tr><th className="p-2">System</th><th className="p-2 text-right">Hard public</th><th className="p-2 text-right">Hard held-out</th><th className="p-2 text-right">Public − held-out gap (95% interval)</th><th className="p-2 text-right">Field mean gap</th></tr></thead>
            <tbody>{heldout.rows.map((r) => <tr key={r.key} className="border-t border-line">
              <th scope="row" className="p-2 font-medium text-[rgb(var(--text))]">{r.display}{r.partial ? <span className="bh-muted"> (partial)</span> : null}</th>
              <td className="p-2 text-right tabular-nums">{pct(r.publicAccuracy)} <span className="bh-muted">({r.publicCorrect}/{r.publicN})</span></td>
              <td className="p-2 text-right tabular-nums">{pct(r.heldoutAccuracy)} <span className="bh-muted">({r.heldoutCorrect}/{r.heldoutN})</span></td>
              <td className="p-2 text-right tabular-nums">{points(r.gap, true)} points <span className="bh-muted">[{points(r.ciLow, true)}, {points(r.ciHigh, true)}]</span></td>
              <td className="p-2 text-right tabular-nums">{points(heldout.fieldMeanGap, true)} points</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p>Accuracy is correct / attempted; invalid responses count as incorrect. The interval is the unpooled two-sample normal 95% interval for a difference in proportions. Partial systems are shown but excluded from the field mean.</p>
        <p data-bh-jev-training-policy><b className="text-gray-200">Public-split policy.</b> Training on JevBench&apos;s public split is allowed and should be declared with each submission. Rankings continue to use all benchmark items. We report held-out results separately so that specialisation on public tasks is visible. Held-out means not publicly released, not guaranteed unseen: hosted systems receive these tasks during evaluation. We periodically issue fresh tasks to reduce the value of prior exposure.</p>
      </div>
    </details>
  </>;
}

export function JevHistoryContent({ payload }: { payload: JevHistoryPayload }) {
  return <HistoryRows payload={payload} />;
}
