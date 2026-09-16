/** CR-15.3 (Florian 2026-09-15): a flagged Benchmaxxing signal reads as a warning pill (icon + number, not colour
 *  alone). CR-65.6 (2026-09-17): the pill follows the published tag level — strong ⚠, weak △ — never a fixed
 *  number, so the pill and the tag can no longer disagree. */
export type SignalLevel = "strong" | "weak" | null | undefined;

export function SignalValue({ score, level, large = false }: { score: number; level?: SignalLevel; large?: boolean }) {
  const text = score.toFixed(1);
  if (level !== "strong" && level !== "weak") return <span className={`font-semibold tabular ${large ? "text-5xl font-bold" : ""}`}>{text}</span>;
  const strong = level === "strong";
  return <span className="bh-signal-pill" data-level={level} data-large={large || undefined}
    title={`${strong ? "Strong" : "Weak"} Benchmaxxing tag (${strong ? "top 10 %" : "next 10 %"} of scored models): results jump between related benchmarks. A screening flag, not proof of leakage or intent.`}>
    <span aria-hidden="true">{strong ? "⚠" : "△"}</span><span className="tabular">{text}</span><span className="sr-only">, {level} Benchmaxxing tag</span>
  </span>;
}
