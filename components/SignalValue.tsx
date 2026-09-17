import { BENCHMAXX_GUARD_TEXT, benchmaxxingLevelInfo, benchmaxxingThresholdText, type BenchmaxxingLevel } from "../lib/benchmaxxing-levels.mjs";

/** CR-15.3 (Florian 2026-09-15): a flagged Benchmaxxing signal reads as a warning pill (icon + number, not colour
 *  alone). CR-65.6: the pill follows the published tag level, never a fixed number, so the pill and the tag can no
 *  longer disagree. CR-69.4: the score is signed, so positive values carry a "+". CR-74.1: three levels — light "?",
 *  medium "⚠", very strong "⚠⚠" — styled like the Overview tag (muted outline, amber tint, solid red). */
export type SignalLevel = BenchmaxxingLevel | null | undefined;

export function SignalValue({ score, level, large = false }: { score: number; level?: SignalLevel; large?: boolean }) {
  const text = `${score > 0 ? "+" : ""}${score.toFixed(1)}`;
  const info = benchmaxxingLevelInfo(level);
  if (!info) return <span className={`font-semibold tabular ${large ? "text-5xl font-bold" : ""}`}>{text}</span>;
  return <span className="bh-signal-pill" data-level={info.level} data-large={large || undefined}
    title={`${info.title} Benchmaxxing tag (${benchmaxxingThresholdText()}; a tag ${BENCHMAXX_GUARD_TEXT}): ranks higher on famous public benchmarks than on held-out ones of the same topic. A screening flag, not proof of leakage or intent.`}>
    <span aria-hidden="true">{info.mark}</span><span className="tabular">{text}</span><span className="sr-only">, {info.label} Benchmaxxing tag</span>
  </span>;
}
