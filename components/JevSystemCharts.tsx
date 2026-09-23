import type { JevV12Row } from '../lib/jevbench-v12.mjs';

// F-167 (Fable pass 32): the per-system page draws its number. Two figures that need no interaction —
// a score strip on the board's own 0–100 scale and a band per axis — so this module is not "use client"
// and ships no JavaScript. The type colour map is the one components/JevRadars.tsx uses; that module is
// "use client", and Next.js treats every export of a client module as a client reference, so a server
// component cannot import it (the same reason the page duplicates `usdText` and `TYPE_LABEL`).
const TYPE_VAR: Record<string, string> = { jev: '--jev-t-jev', 'jev-rebuild': '--jev-t-rebuild', 'llm-baseline': '--jev-t-llm', 'small-tool-model': '--jev-t-tool', 'jev-service': '--jev-t-service', classifier: '--jev-t-classifier', 'decision-api': '--jev-t-api' };
export const typeColour = (cls: string) => `rgb(var(${TYPE_VAR[cls] ?? TYPE_VAR['llm-baseline']}))`;
const one = (v: number) => v.toFixed(1);
const clamp = (v: number) => Math.max(0, Math.min(100, v));
const short = (d: string) => d.split(' (')[0].split(', formerly')[0];
const TICKS = [0, 25, 50, 75, 100];

/** The JevBench Score scale, 0–100: every ranked system as a faint tick, this system as its own point,
 *  and the reference (Jev 1.13.0, or the rank-2 system on Jev's own page) as a marked tick. */
export function JevScoreStrip({ row, ranked, reference }: { row: JevV12Row; ranked: JevV12Row[]; reference: JevV12Row | null }) {
  const colour = typeColour(row.cls);
  const caption = row.ranked ? `Where it sits among the ${ranked.length} ranked systems.` : 'Shown, not ranked.';
  return <figure className="mt-4" data-bh-jev-system-strip={row.key}>
    <div className="relative h-8 w-full min-w-[300px]">
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[rgb(var(--line))]" aria-hidden="true" />
      {TICKS.map((t) => <span key={t} aria-hidden="true" style={{ left: `${t}%` }}
        className="absolute top-1/2 h-3.5 w-px -translate-x-1/2 -translate-y-1/2 bg-[rgb(var(--line))]" />)}
      {ranked.map((r) => <span key={r.key} title={`${short(r.display)} · ${one(r.main)}`} data-bh-jev-system-peer-tick={r.key}
        style={{ left: `${clamp(r.main)}%` }}
        className="absolute top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-[var(--muted)] opacity-40" />)}
      {reference && <span title={`${short(reference.display)} · ${one(reference.main)}`} data-bh-jev-system-reference-tick={reference.key}
        style={{ left: `${clamp(reference.main)}%` }}
        className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[var(--text)] opacity-75" />}
      <span title={`${short(row.display)} · ${one(row.main)}`} data-bh-jev-system-point={row.main.toFixed(3)}
        style={{ left: `${clamp(row.main)}%`, background: row.ranked ? colour : 'transparent', boxShadow: row.ranked ? undefined : 'inset 0 0 0 2px var(--muted)' }}
        className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--surface)]" />
    </div>
    <div className="relative mt-0.5 h-4 w-full" aria-hidden="true">
      {TICKS.map((t) => <span key={t} style={{ left: `${t}%`, transform: t === 0 ? 'none' : t === 100 ? 'translateX(-100%)' : 'translateX(-50%)' }}
        className="bh-muted absolute text-[11px] tabular-nums">{t}</span>)}
    </div>
    <figcaption className="bh-muted mt-1 text-[12px]" data-bh-jev-system-strip-caption>
      {caption}{reference ? ` The marked tick is ${short(reference.display)} (${one(reference.main)}).` : ''}
    </figcaption>
  </figure>;
}

/** F-79's 22 px band, on the axis' own 0–100 scale, with the reference's value as a tick. */
export function JevAxisBand({ axis, value, colour, reference, referenceName }: { axis: string; value: number; colour: string; reference: number | null; referenceName: string }) {
  return <div aria-hidden="true" data-bh-jev-system-band={axis}
    className="relative mt-2 h-[22px] w-full overflow-hidden rounded-sm bg-[rgb(var(--line)/.45)]">
    <span className="absolute inset-y-0 left-0 rounded-r-sm" style={{ width: `${clamp(value)}%`, background: colour, opacity: 0.55 }} />
    {reference !== null && <span title={`${referenceName}: ${one(reference)}`} data-bh-jev-system-band-reference={axis}
      style={{ left: `${clamp(reference)}%` }} className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[var(--text)] opacity-70" />}
  </div>;
}
