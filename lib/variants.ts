import type { ClientModel } from "./client-model";
import type { ScoreKey } from "./types";

/** "Hide deprecated" operates on FAMILIES, not variants. AA flags individual
 * effort configurations as deprecated when it re-benchmarks a model, so a live
 * family routinely mixes deprecated benchmark rows (e.g. "GPT-5.4 (xhigh)",
 * the strongest measured config) with an active alias row that only carries
 * Coding-Agent/DesignArena values. Dropping variants individually made such a
 * family be represented by its weakest-measured row (GPT-5.4 scoring below its
 * own mini/nano).
 *
 * A family stays visible when EITHER
 *   (a) any variant is not AA-deprecated, OR
 *   (b) the family is present on a current DesignArena agentic board — the
 *       arena actively runs battles, so the model is measurably current even
 *       when AA has rotated every effort config out of its own active set.
 *       Without (b), Claude Opus 4.6 and GPT-5.4 — sold and actively ranked on
 *       both DA boards — vanished from the default view. True legacy models
 *       (Claude 3, GPT-4o, …) are on no DA board and stay hidden. */
export function selectableModels<T extends ClientModel>(models: T[], hideDeprecated: boolean): T[] {
  if (!hideDeprecated) return models;
  const familyAlive = new Set<string>();
  for (const m of models) {
    if (!m.deprecated
      || m.scores.designarena_frontend != null
      || m.scores.designarena_fullstack != null) familyAlive.add(m.family_key);
  }
  return models.filter((m) => familyAlive.has(m.family_key));
}

/** For families that expose MULTIPLE variants (reasoning effort / thinking settings),
 *  choose one representative per family. Data-driven: any family_key with >1 variant is
 *  collapsible — no hardcoded lab list — so DeepSeek / MiniMax / Qwen collapse the same
 *  way as GPT / Claude / GLM / Kimi. Pick order:
 *   - GPT → "(high)" (fallback medium/xhigh/…)
 *   - Claude → the reasoning variant ("(high)"/"Adaptive Reasoning"/"Max Effort")
 *   - everything else → the reasoning/max variant, dropping "(Non-reasoning)"
 *  Returns family_key -> chosen model id (only for multi-variant families). */
export function preferredVariantIds(models: ClientModel[], score?: ScoreKey): Map<string, string> {
  const byFamily = new Map<string, ClientModel[]>();
  for (const m of models) {
    if (!byFamily.has(m.family_key)) byFamily.set(m.family_key, []);
    byFamily.get(m.family_key)!.push(m);
  }
  const ids = new Map<string, string>();
  for (const [k, rows] of byFamily) {
    if (rows.length < 2) continue; // single-variant families need no collapsing
    // When a score is selected, prefer a measured variant. Exact Coding-Agent
    // attachment must not make a family disappear merely because its generic
    // display representative is an unmeasured sibling effort.
    const measured = score ? rows.filter((row) => score === "composite"
      ? row.composite_coverage > 0
      : row.scores[score] != null) : [];
    const candidates = measured.length ? measured : rows;
    // With a score in play, the family is represented by its strongest measured
    // configuration (like AA's Coding-Agent "max across harnesses"). A static
    // effort order breaks whenever the preferred effort is missing or a weaker
    // alias row exists: GPT-5.4's "(medium)" alias (Coding-Agent+DA only) ranked
    // the family below its own mini/nano while the deprecated "(xhigh)" row held
    // the real AA scores. For the composite, prefer the row with the most OWN
    // evidence first (a thin row must not beat a fully measured sibling on the
    // strength of imputed slots), then the higher composite.
    if (score && measured.length) {
      const best = [...measured].sort((a, b) => {
        if (score === "composite") {
          return (b.composite_coverage - a.composite_coverage)
            || ((b.scores.composite ?? -Infinity) - (a.scores.composite ?? -Infinity))
            || a.id.localeCompare(b.id);
        }
        return ((b.scores[score] ?? -Infinity) - (a.scores[score] ?? -Infinity)) || a.id.localeCompare(b.id);
      })[0];
      ids.set(k, best.id);
      continue;
    }
    const pick = (order: string[]) => [...candidates].sort((a, b) => {
      const aRank = order.indexOf(a.variant);
      const bRank = order.indexOf(b.variant);
      const normalizedARank = aRank < 0 ? order.length : aRank;
      const normalizedBRank = bRank < 0 ? order.length : bRank;
      return normalizedARank - normalizedBRank || a.id.localeCompare(b.id);
    })[0];
    let chosen: ClientModel;
    if (k.startsWith("gpt-")) {
      chosen = pick(["high", "medium", "xhigh", "low", "minimal", "non-reasoning", "default"]);
    } else if (k.startsWith("claude-")) {
      chosen = pick(["reasoning", "high", "max", "adaptive", "xhigh", "medium", "low", "default", "non-reasoning"]);
    } else {
      // Prefer an explicit reasoning/effort configuration over a generic source
      // row. In particular, a bare benchmark alias must never hide a measured
      // max row such as GLM-5.2 (max).
      chosen = pick(["reasoning", "max", "high", "adaptive", "xhigh", "medium", "low", "default", "non-reasoning"]);
    }
    ids.set(k, chosen.id);
  }
  return ids;
}

const TRAILING_PAREN_RE = /\s*\([^()]*\)\s*$/;
// A trailing "(...)" that describes a reasoning/effort/thinking setting (the AA variant
// suffix), e.g. "(Adaptive Reasoning, Max Effort)", "(high)", "(Non-reasoning, Low Effort)".
const REASONING_PAREN_RE = /\s*\([^()]*\b(reasoning|effort|thinking|adaptive|non-reasoning|xhigh|high|medium|low|minimal|max)\b[^()]*\)\s*$/i;
/** Name to show for a model row. When "one variant per reasoning family" (collapse) is
 *  on, drop the trailing variant detail in parentheses so the row reads as the model
 *  name — e.g. "Claude Opus 4.8 (Adaptive Reasoning, Max Effort)" → "Claude Opus 4.8",
 *  "DeepSeek V4 Pro (Reasoning, Max Effort)" → "DeepSeek V4 Pro", "GPT-5.5 (high)" →
 *  "GPT-5.5". Multi-variant families drop any trailing "(...)" (the chosen representative);
 *  single-variant models drop the suffix only when it's a reasoning descriptor (so e.g. a
 *  "(Vision)" tag is preserved). The expanded view keeps full names. */
export function collapsedName(m: { display_name: string; family_key: string; family_name?: string }, collapse: boolean, preferredId: Map<string, string>): string {
  if (!collapse) return m.display_name;
  const re = preferredId.has(m.family_key) ? TRAILING_PAREN_RE : REASONING_PAREN_RE;
  const stripped = m.display_name.replace(re, "").trim();
  // AA's Coding-Agent rows drop the vendor prefix ("Opus 4.6 (medium)"). When such a
  // row represents the family, show the full family name ("Claude Opus 4.6") — but only
  // when the stripped name is a strict suffix of it, so richer display names (revision
  // tags, "GPT-5.4" vs family "GPT 5.4") are left untouched.
  const fam = m.family_name;
  if (fam && fam.length > stripped.length && fam.toLowerCase().endsWith(stripped.toLowerCase())) return fam;
  return stripped;
}

/** Apply the collapse rule to a model list (keep only the preferred variant per
 *  collapsible multi-variant family). */
export function collapseModels<T extends ClientModel>(models: T[], preferredId: Map<string, string>): T[] {
  return models.filter((m) => !preferredId.has(m.family_key) || preferredId.get(m.family_key) === m.id);
}
