import type { ScoreKey } from "../lib/types";
import { AaCredit } from "./AaCredit";
import { EpochCredit } from "./EpochCredit";

/** R1.4: the plain-language explanation of the Adjusted Cost column. It names the four
 *  things the number accounts for and avoids the "Chutes global fallback" phrasing that
 *  the long inline paragraph used (R1.5). The full derivation lives on /about (R1.6). */
export const ADJUSTED_COST_TIP = (
  <>
    {/* CR-32.3: short and plain; the full method lives on /about. */}
    <ul className="list-disc space-y-1 pl-4">
      <li>What one typical task costs you, in US dollars.</li>
      <li>Uses the cheapest provider your options allow, with its prices and cache discounts.</li>
      <li>Counts how many tokens this model really needs per task, on the same task mix for every model.</li>
      <li>“cheaper” / “pricier” tags: well off the typical cost for that score (filled tag, ↑ ↓) or clearly off (outlined tag, ↗ ↘), judged among the models your options include.</li>
    </ul>
    <a className="mt-2 inline-block text-accent underline" href="/about#adjusted-cost">How we calculate</a> <AaCredit className="mt-1 block text-gray-400" />
  </>
);

const COMPOSITE_TIP = (
  <>
    {/* CR-32.3: short and plain; the full method lives on /about. */}
    <ul className="list-disc space-y-1 pl-4">
      <li>One 0–100 capability number per model.</li>
      <li>Averages seven major benchmarks and indices, including Artificial Analysis and Epoch AI’s ECI.</li>
      <li>Each counts as the model’s rank among measured models.</li>
      <li>Missing results are never counted as good; thin records are shown hatched.</li>
    </ul>
    <a className="mt-2 inline-block text-accent underline" href="/about#score">How we calculate</a> <AaCredit className="mt-1 block text-gray-400" /> <EpochCredit className="block text-gray-400" />
  </>
);

/** Per-score explanation for the (i) next to the Score header (R1.7). */
export function scoreTip(score: ScoreKey): React.ReactNode {
  if (score === "composite") return COMPOSITE_TIP;
  if (score.startsWith("designarena")) {
    return <>An Elo rating from head-to-head DesignArena duels, published by DesignArena. It moves as new duels are played, so it is a live ranking rather than a fixed test score, and it is only comparable within the same board.</>;
  }
  // CR-25.6: a category composite is our own average of that category's fixed anchor benchmarks.
  if (score.startsWith("cat_")) {
    return <>The average of this category&apos;s anchor benchmarks, on a 0–100 scale. The anchor set is fixed, so every
      model&apos;s number covers the same benchmarks: a model is only scored when it has a result on <em>all</em> of them —
      otherwise the cell stays empty instead of averaging a smaller, easier set. Benchmarks are counted at their newest
      published version. <a className="text-accent underline" href="/about#score">How we calculate</a>
      <AaCredit className="mt-1 block text-gray-400" /> <EpochCredit className="block text-gray-400" /></>;
  }
  if (score === "epoch_eci" || score === "epoch_eci_software") {
    return <>An Epoch AI Capabilities Index. General ECI is copied from Epoch’s published model scores; Software Engineering ECI is refit from Epoch’s published software-benchmark performance and difficulty exports, requiring at least two benchmarks. Epoch publishes the index on a 100–170-ish capability scale; the Composite percentile-normalizes it. Source and date are shown below the table. <EpochCredit className="mt-1 block text-gray-400" /></>;
  }
  return <>Published by Artificial Analysis, shown on their scale exactly as reported — we do not rescale it. The index version and the date we read it are printed under the table, because Artificial Analysis re-bases these indices from time to time. <AaCredit className="mt-1 block text-gray-400" /></>;
}

/** Short pointer to the full method; deliberately understated (R1.6). */
export const METHOD_LINK_TEXT = "How we calculate";
