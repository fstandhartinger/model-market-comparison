import type { ScoreKey } from "../lib/types";

/** R1.4: the plain-language explanation of the Adjusted Cost column. It names the four
 *  things the number accounts for and avoids the "Chutes global fallback" phrasing that
 *  the long inline paragraph used (R1.5). The full derivation lives on /about (R1.6). */
export const ADJUSTED_COST_TIP = (
  <>
    What one task actually costs you — not a headline price per million tokens. It combines
    the provider we would route you to, that provider’s prices, how much of your input it
    serves from cache and what cache reads and writes cost there, and how many tokens this
    particular model needs to finish the task. A verbose model on a cheap provider can cost
    more than a terse model on an expensive one; this column shows that.
  </>
);

const COMPOSITE_TIP = (
  <>
    A single 0–100 number per model. Seven equally weighted capability slots — including
    Epoch AI’s general ECI and Software Engineering ECI — are each turned into the model’s
    percentile among all models measured on it, and those percentiles are averaged, so a
    hard benchmark and an easy one count the same. Models measured on fewer benchmarks are
    not rewarded for the gaps: missing slots are filled with the model’s own mean and then
    adjusted so a thin record cannot overtake a fuller one it never beat.
  </>
);

/** Per-score explanation for the (i) next to the Score header (R1.7). */
export function scoreTip(score: ScoreKey): React.ReactNode {
  if (score === "composite") return COMPOSITE_TIP;
  if (score.startsWith("designarena")) {
    return <>An Elo rating from head-to-head DesignArena duels, published by DesignArena. It moves as new duels are played, so it is a live ranking rather than a fixed test score, and it is only comparable within the same board.</>;
  }
  if (score === "epoch_eci" || score === "epoch_eci_software") {
    return <>An Epoch AI Capabilities Index. General ECI is copied from Epoch’s published model scores; Software Engineering ECI is refit from Epoch’s published software-benchmark performance and difficulty exports, requiring at least two benchmarks. Epoch publishes the index on a 100–170-ish capability scale; the Composite percentile-normalizes it. Source and date are shown below the table.</>;
  }
  return <>Published by Artificial Analysis, shown on their scale exactly as reported — we do not rescale it. The index version and the date we read it are printed under the table, because Artificial Analysis re-bases these indices from time to time.</>;
}

/** Short pointer to the full method; deliberately understated (R1.6). */
export const METHOD_LINK_TEXT = "How we calculate";
