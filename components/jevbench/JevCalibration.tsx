"use client";
// CR-84.2: reliability diagram — top-label confidence against observed accuracy in the artifact's 10 fixed bins.
// Points only: an empty bin is absent, never interpolated. Native and verbalized probabilities are named per system.
import { useState } from "react";
import type { JevRow, JevView } from "./types";
import { cohortLabel, dec3, pct } from "./format";
import { useWidth } from "./JevScatter";

export function JevCalibration({ view }: { view: JevView }) {
  const rows = [...view.ranked, ...view.partial];
  const [key, setKey] = useState(rows[0]?.key ?? "");
  const [scope, setScope] = useState("overall");
  const [ref, W] = useWidth<HTMLDivElement>(360);
  const r = rows.find((x) => x.key === key) as JevRow;
  const s = scope === "overall" ? r.overall : scope.startsWith("f:") ? r.families[scope.slice(2)] : r.cohorts[scope.slice(2)];
  const size = Math.min(W, 420), m = { l: 54, r: 10, t: 10, b: 36 }, iw = size - m.l - m.r, ih = size - m.t - m.b;
  const X = (v: number) => m.l + v * iw, Y = (v: number) => m.t + (1 - v) * ih;
  const bins = s?.bins ?? [];
  const maxN = Math.max(1, ...bins.map((b) => b[0]));
  const ticks = [0, 0.5, 1];
  return <div data-bh-jev-calibration>
    <div className="mb-2 flex flex-wrap gap-2 text-sm">
      <label className="flex min-w-0 max-w-full flex-col text-xs text-gray-400">System<select className="bh-select mt-1 min-h-10 max-w-full rounded-md border border-line bg-[var(--surface)] px-2 text-sm" value={key} onChange={(e) => setKey(e.target.value)}>{rows.map((x) => <option key={x.key} value={x.key}>{x.display}{x.complete ? "" : " — stopped early"}</option>)}</select></label>
      <label className="flex min-w-0 max-w-full flex-col text-xs text-gray-400">Decisions<select className="bh-select mt-1 min-h-10 max-w-full rounded-md border border-line bg-[var(--surface)] px-2 text-sm" value={scope} onChange={(e) => setScope(e.target.value)}>
        <option value="overall">All {view.nDecisions}</option>
        <optgroup label="Family">{view.familyNames.map((f) => <option key={f} value={`f:${f}`}>{f} ({view.familyN[f]})</option>)}</optgroup>
        <optgroup label="Cohort">{view.cohortNames.map((c) => <option key={c} value={`c:${c}`}>{cohortLabel(c)} ({view.cohortN[c]})</option>)}</optgroup>
      </select></label>
    </div>
    <p className="mb-1 text-xs text-gray-400">Probabilities: <b className="text-gray-300">{r.probability}</b> — {r.probability === "native" ? "the model's own distribution" : "written out by the model under a JSON schema"} · ECE {dec3(s?.ece)} over {s?.n ?? 0} decisions</p>
    <div ref={ref} className="w-full min-w-0 max-w-[420px] overflow-hidden">
      {bins.length ? <svg width={size} height={size} role="img" aria-label={`Calibration of ${r.display}: see the bin table below`}>
        {ticks.map((t) => <g key={t}><line x1={X(0)} x2={X(1)} y1={Y(t)} y2={Y(t)} stroke="rgb(var(--line) / .5)" strokeDasharray="2 3" /><text x={m.l - 6} y={Y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">{t * 100}%</text>
          <line x1={X(t)} x2={X(t)} y1={Y(0)} y2={Y(1)} stroke="rgb(var(--line) / .35)" /><text x={X(t)} y={Y(0) + 16} textAnchor={t === 0 ? "start" : t === 1 ? "end" : "middle"} fontSize={11} fill="var(--muted)">{t * 100}%</text></g>)}
        <line x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(1)} stroke="var(--muted)" strokeDasharray="4 4" />
        <text x={X(0.5)} y={size - 4} textAnchor="middle" fontSize={11} fill="var(--muted)">stated confidence</text>
        <text x={11} y={Y(0.5)} textAnchor="middle" fontSize={11} fill="var(--muted)" transform={`rotate(-90 11 ${Y(0.5)})`}>observed accuracy</text>
        {bins.map(([n, c, a], i) => n > 0 && c != null && a != null && <circle key={i} cx={X(c)} cy={Y(a)} r={3 + 7 * Math.sqrt(n / maxN)} fill="rgb(var(--accent) / .55)" stroke="rgb(var(--accent))"><title>{`${i * 10}–${i * 10 + 10}%: ${n} decisions, confidence ${pct(c)}, accuracy ${pct(a)}`}</title></circle>)}
      </svg> : <p className="text-sm text-gray-400">No probability distribution was retained for this selection, so nothing is plotted.</p>}
    </div>
    <p className="mt-1 text-xs text-gray-500">On the dashed diagonal a stated 80% is right 80% of the time. Dot area = decisions in the bin; empty bins are not drawn.</p>
    <details className="mt-2 text-xs"><summary className="cursor-pointer text-gray-400">Bin table</summary>
      <table className="mt-1 tabular-nums"><thead><tr className="text-gray-500"><th className="pr-3 text-left font-normal">Confidence bin</th><th className="pr-3 text-right font-normal">Decisions</th><th className="pr-3 text-right font-normal">Mean confidence</th><th className="text-right font-normal">Accuracy</th></tr></thead>
        <tbody>{bins.map(([n, c, a], i) => <tr key={i}><td className="pr-3">{i * 10}–{i * 10 + 10}%</td><td className="pr-3 text-right">{n}</td><td className="pr-3 text-right">{n ? pct(c) : "–"}</td><td className="text-right">{n ? pct(a) : "–"}</td></tr>)}</tbody></table>
    </details>
  </div>;
}
