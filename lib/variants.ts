import type { ClientModel } from "./client-model";

/** For families that expose MULTIPLE variants (reasoning effort / thinking settings),
 *  choose one representative per family. Data-driven: any family_key with >1 variant is
 *  collapsible — no hardcoded lab list — so DeepSeek / MiniMax / Qwen collapse the same
 *  way as GPT / Claude / GLM / Kimi. Pick order:
 *   - GPT → "(high)" (fallback medium/xhigh/…)
 *   - Claude → the reasoning variant ("(high)"/"Adaptive Reasoning"/"Max Effort")
 *   - everything else → the reasoning/max variant, dropping "(Non-reasoning)"
 *  Returns family_key -> chosen model id (only for multi-variant families). */
export function preferredVariantIds(models: ClientModel[]): Map<string, string> {
  const byFamily = new Map<string, ClientModel[]>();
  for (const m of models) {
    if (!byFamily.has(m.family_key)) byFamily.set(m.family_key, []);
    byFamily.get(m.family_key)!.push(m);
  }
  const ids = new Map<string, string>();
  for (const [k, rows] of byFamily) {
    if (rows.length < 2) continue; // single-variant families need no collapsing
    const byVar = (v: string) => rows.find((r) => r.variant === v);
    const pick = (order: string[]) => (order.map(byVar).find(Boolean) as ClientModel | undefined) || rows[0];
    let chosen: ClientModel;
    if (k.startsWith("gpt-")) {
      chosen = pick(["high", "medium", "xhigh", "low", "minimal", "non-reasoning", "default"]);
    } else if (k.startsWith("claude-")) {
      chosen = pick(["reasoning", "high", "max", "adaptive", "default", "non-reasoning"]);
    } else {
      chosen = pick(["reasoning", "default", "max", "high", "adaptive", "xhigh", "medium", "low", "non-reasoning"]);
    }
    ids.set(k, chosen.id);
  }
  return ids;
}

const TRAILING_PAREN_RE = /\s*\([^()]*\)\s*$/;
/** Name to show for a model row. When "one variant per reasoning family" (collapse) is
 *  on, a multi-variant family's row stands in for the whole family, so drop the trailing
 *  variant detail in parentheses — e.g. "Claude Sonnet 5 (Adaptive Reasoning, Max
 *  Effort)" → "Claude Sonnet 5", "DeepSeek V4 Pro (Reasoning, Max Effort)" → "DeepSeek
 *  V4 Pro". Single-variant models (and the expanded view) keep their full name. */
export function collapsedName(m: { display_name: string; family_key: string }, collapse: boolean, preferredId: Map<string, string>): string {
  return collapse && preferredId.has(m.family_key) ? m.display_name.replace(TRAILING_PAREN_RE, "").trim() : m.display_name;
}

/** Apply the collapse rule to a model list (keep only the preferred variant per
 *  collapsible multi-variant family). */
export function collapseModels<T extends ClientModel>(models: T[], preferredId: Map<string, string>): T[] {
  return models.filter((m) => !preferredId.has(m.family_key) || preferredId.get(m.family_key) === m.id);
}
