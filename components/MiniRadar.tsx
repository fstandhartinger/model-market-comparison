/** F-08b: six-axis radar of the Composite inputs on the model page. Values are catalog
 *  percentiles (0–100); a missing input is a gap in the line, never a zero. */
export type MiniRadarAxis = { label: string; value: number | null };

export function MiniRadar({ axes, size = 220 }: { axes: MiniRadarAxis[]; size?: number }) {
  // Labels sit left and right of the ring, so the canvas is wider than it is tall.
  const width = size + 190;
  const cx = width / 2;
  const c = size / 2;
  const r = size / 2 - 30;
  const n = axes.length;
  const at = (i: number, radius: number) => {
    const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [cx + Math.cos(angle) * radius, c + Math.sin(angle) * radius] as const;
  };
  const points = axes.map((axis, i) => (axis.value == null ? null : at(i, (r * axis.value) / 100)));
  // Join only neighbouring measured axes (wrapping around), so a gap stays visibly open.
  const segments: string[] = [];
  points.forEach((p, i) => {
    const q = points[(i + 1) % n];
    if (p && q && n > 1) segments.push(`M ${p[0]} ${p[1]} L ${q[0]} ${q[1]}`);
  });
  const complete = points.every(Boolean);
  return (
    <svg viewBox={`0 0 ${width} ${size}`} role="img" className="mx-auto block h-[220px] w-auto max-w-full"
      aria-label={`Composite inputs as catalog percentiles: ${axes.map((a) => `${a.label} ${a.value == null ? "missing" : Math.round(a.value)}`).join(", ")}`}>
      {[25, 50, 75, 100].map((ring) => (
        <polygon key={ring} fill="none" stroke="currentColor" opacity={ring === 100 ? 0.22 : 0.1}
          points={axes.map((_, i) => at(i, (r * ring) / 100).join(",")).join(" ")} />
      ))}
      {axes.map((axis, i) => {
        const [x, y] = at(i, r);
        const [lx, ly] = at(i, r + 16);
        const anchor = Math.abs(lx - cx) < 4 ? "middle" : lx > cx ? "start" : "end";
        return (
          <g key={axis.label}>
            <line x1={cx} y1={c} x2={x} y2={y} stroke="currentColor" opacity={axis.value == null ? 0.12 : 0.25} strokeDasharray={axis.value == null ? "2 3" : undefined} />
            <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" fontSize="10" fill="currentColor" opacity={axis.value == null ? 0.45 : 0.8}>{axis.label}</text>
          </g>
        );
      })}
      {complete && <polygon points={points.map((p) => p!.join(",")).join(" ")} fill="rgb(var(--accent) / .14)" stroke="none" />}
      {segments.map((d) => <path key={d} d={d} stroke="rgb(var(--accent))" strokeWidth="2" fill="none" strokeLinejoin="round" />)}
      {points.map((p, i) => p && (
        <circle key={axes[i].label} cx={p[0]} cy={p[1]} r="3.5" fill="rgb(var(--accent))" stroke="var(--surface)" strokeWidth="1">
          <title>{`${axes[i].label}: percentile ${Math.round(axes[i].value!)}`}</title>
        </circle>
      ))}
    </svg>
  );
}
