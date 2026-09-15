/** CR-15.3 (Florian 2026-09-15): a Benchmaxxing signal above SIGNAL_WARN reads as a warning pill
 *  (icon + number, not colour alone). 25 is where the catalog's tag starts today (top 10 % of scored
 *  models, lowest tagged 24.9); the threshold text is repeated in the column's (i). */
export const SIGNAL_WARN = 25;

export function SignalValue({ score, large = false }: { score: number; large?: boolean }) {
  const text = score.toFixed(1);
  if (score <= SIGNAL_WARN) return <span className={`font-semibold tabular ${large ? "text-5xl font-bold" : ""}`}>{text}</span>;
  return <span className="bh-signal-pill" data-large={large || undefined}
    title={`Above ${SIGNAL_WARN}: results jump strongly between related benchmarks. A screening flag, not proof of leakage or intent.`}>
    <span aria-hidden="true">⚠</span><span className="tabular">{text}</span><span className="sr-only">, warning: above {SIGNAL_WARN}</span>
  </span>;
}
