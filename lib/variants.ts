import type { ClientModel } from "./client-model";
import type { ScoreKey } from "./types";

/** Remove lifecycle-deprecated rows before choosing a family representative.
 * Filtering after collapse can erase an otherwise active family when the
 * score-preferred effort happens to be deprecated. */
export function selectableModels<T extends ClientModel>(models: T[], hideDeprecated: boolean): T[] {
  return hideDeprecated ? models.filter((model) => !model.deprecated) : models;
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
    const measured = score ? rows.filter((row) => row.scores[score] != null) : [];
    const candidates = measured.length ? measured : rows;
    const byVar = (v: string) => candidates.find((r) => r.variant === v);
    const pick = (order: string[]) => (order.map(byVar).find(Boolean) as ClientModel | undefined) || candidates[0];
    let chosen: ClientModel;
    if (k.startsWith("gpt-")) {
      chosen = pick(["high", "medium", "xhigh", "low", "minimal", "non-reasoning", "default"]);
    } else if (k.startsWith("claude-")) {
      chosen = pick(["reasoning", "high", "max", "adaptive", "default", "non-reasoning"]);
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
export function collapsedName(m: { display_name: string; family_key: string }, collapse: boolean, preferredId: Map<string, string>): string {
  if (!collapse) return m.display_name;
  const re = preferredId.has(m.family_key) ? TRAILING_PAREN_RE : REASONING_PAREN_RE;
  return m.display_name.replace(re, "").trim();
}

/** Apply the collapse rule to a model list (keep only the preferred variant per
 *  collapsible multi-variant family). */
export function collapseModels<T extends ClientModel>(models: T[], preferredId: Map<string, string>): T[] {
  return models.filter((m) => !preferredId.has(m.family_key) || preferredId.get(m.family_key) === m.id);
}
