import { JEV_ARCH_CLASSES, jevArchFor, jevArchBadgeText, type JevArchRow } from '../lib/jevbench-architecture.mjs';

export function JevArchitectureBadge({ row, benchmark = 'jevbench' }: { row: JevArchRow; benchmark?: string }) {
  const resolved = jevArchFor(benchmark, row);
  const arch = row.arch ?? resolved.arch;
  const text = jevArchBadgeText(row.archBadges ?? resolved.badges);
  return <span className="bh-thin-tag bh-muted ml-1" title={JEV_ARCH_CLASSES.find((c) => c.id === arch)?.label} data-bh-jev-architecture={arch}>{text || JEV_ARCH_CLASSES.find((c) => c.id === arch)?.short}</span>;
}

export function JevArchitectureMethod() {
  return <div className="mt-4" data-bh-jev-architecture-method>
    <h3 className="font-semibold">System types (colours)</h3>
    <ul className="bh-muted mt-1 space-y-1 text-sm">{JEV_ARCH_CLASSES.map((c) => <li key={c.id}><span className="bh-jevc-swatch mr-1.5" style={{ backgroundColor: `rgb(var(${c.cssVar}))` }} /><b>{c.label}</b> — {c.oneLine}</li>)}</ul>
    <p className="bh-muted mt-2 text-sm">Colours show architecture only; they never change a score or rank. Each class is assigned from cited evidence (config.json, model card or provider docs).</p>
  </div>;
}
