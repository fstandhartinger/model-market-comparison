import { coverageMarker, type CompositeMarker } from "../lib/client-model";
import type { CSSProperties } from "react";

/** CR-213 (Florian 2026-09-29): one incomplete Main Composite point on an SVG chart. "half" (4/7–6/7 inputs) is a solid
 *  outline with its lower half filled; "hollow" (3/7 or fewer) is an empty, dashed outline. Complete (7/7) points keep
 *  each chart's own solid shape and never reach this component. `square` draws the open-weights square instead of a
 *  circle. `coverage` ("5/7") is stamped on the group for tests and assistive tooling. */
export function CompositeDot({ cx, cy, r, color, marker, coverage, square = false, opacity = 1, strokeWidth = 1.5 }: {
  cx: number; cy: number; r: number; color: string; marker: Exclude<CompositeMarker, "solid">; coverage: string;
  square?: boolean; opacity?: number; strokeWidth?: number;
}) {
  const half = marker === "half";
  const outline = { fill: "var(--surface)", fillOpacity: 0.6, stroke: color, strokeOpacity: opacity, strokeWidth, strokeDasharray: half ? undefined : "2 1.5" };
  return <g data-incomplete-composite={coverage} data-composite-marker={marker}>
    {square ? <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} {...outline} /> : <circle cx={cx} cy={cy} r={r} {...outline} />}
    {half && (square
      ? <rect x={cx - r} y={cy} width={2 * r} height={r} fill={color} fillOpacity={opacity} />
      : <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy} Z`} fill={color} fillOpacity={opacity} />)}
  </g>;
}

/** CR-213: the same two markers for an HTML bar — "half" keeps a solid outline with its lower half filled, "hollow" a
 *  dashed, empty outline. */
export function compositeBarStyle(coverage: string, color: string): CSSProperties {
  return coverageMarker(coverage) === "half"
    ? { borderColor: color, borderStyle: "solid", background: `linear-gradient(to top, ${color} 50%, transparent 50%)` }
    : { borderColor: color, borderStyle: "dashed", background: "transparent" };
}
