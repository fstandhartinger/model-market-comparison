/** CR-15.3 (Florian 2026-09-15): a flagged Benchmaxxing signal reads as a warning pill (icon + number, not colour
 *  alone). CR-65.6 (2026-09-17): the pill follows the published tag level — strong ⚠, weak △ — never a fixed
 *  number, so the pill and the tag can no longer disagree. CR-69.4: the score is signed, so positive values carry a "+". */
export type SignalLevel = "strong" | "weak" | null | undefined;

export function SignalValue({ score, level, large = false }: { score: number; level?: SignalLevel; large?: boolean }) {
  const text = `${score > 0 ? "+" : ""}${score.toFixed(1)}`;
  if (level !== "strong" && level !== "weak") return <span className={`font-semibold tabular ${large ? "text-5xl font-bold" : ""}`}>{text}</span>;
  const strong = level === "strong";
  return <span className="bh-signal-pill" data-level={level} data-large={large || undefined}
    title={`${strong ? "Strong" : "Weak"} Benchmaxxing tag (strong: score of +10 or more, weak: above +5, on models with n ≥ 10): ranks higher on famous public benchmarks than on held-out ones of the same topic, and the gap stays above zero when its benchmarks are resampled. A screening flag, not proof of leakage or intent.`}>
    <span aria-hidden="true">{strong ? "⚠" : "△"}</span><span className="tabular">{text}</span><span className="sr-only">, {level} Benchmaxxing tag</span>
  </span>;
}
