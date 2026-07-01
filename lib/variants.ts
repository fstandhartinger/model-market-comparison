import type { ClientModel } from "./client-model";

/** Families whose many reasoning variants collapse to a single representative. */
const COLLAPSE_RE = /^(gpt-|claude-|glm-|kimi-)/;
export function isCollapsibleFamily(familyKey: string): boolean {
  return COLLAPSE_RE.test(familyKey);
}

/** For reasoning-model families that expose multiple variants, choose one
 *  representative per family:
 *   - GPT → the "(high)" effort variant (fallback xhigh/medium/low/non-reasoning)
 *   - Claude → the "Adaptive Reasoning" variant
 *   - GLM / Kimi → the reasoning (or default) variant, dropping "(Non-reasoning)"
 *  Returns family_key -> chosen model id. */
export function preferredVariantIds(models: ClientModel[]): Map<string, string> {
  const byFamily = new Map<string, ClientModel[]>();
  for (const m of models) {
    if (!isCollapsibleFamily(m.family_key)) continue;
    if (!byFamily.has(m.family_key)) byFamily.set(m.family_key, []);
    byFamily.get(m.family_key)!.push(m);
  }
  const ids = new Map<string, string>();
  for (const [k, rows] of byFamily) {
    const byVar = (v: string) => rows.find((r) => r.variant === v);
    const pickOrder = (order: string[]) => order.map(byVar).find(Boolean) as ClientModel | undefined;
    let pick = rows[0];
    if (k.startsWith("gpt-")) {
      // Prefer "(high)", then "(medium)". Families without either (e.g. GPT-5.4,
      // Pro/codex-only families) fall back to "(xhigh)" — their strongest tier.
      pick = pickOrder(["high", "medium", "xhigh", "low", "minimal", "non-reasoning", "default"]) || rows[0];
    } else if (k.startsWith("claude-")) {
      // Keep the reasoning variant. Anthropic labels the reasoning tier of Opus
      // 4.6/4.7/4.8, Sonnet 4.6 and Fable as "Adaptive Reasoning, Max Effort" —
      // there is no reasoning "High Effort" variant — so "Max" survives for those;
      // the 4.5-era families use the plain "(Reasoning)" variant.
      pick = pickOrder(["reasoning", "high", "max", "adaptive", "default", "non-reasoning"]) || rows[0];
    } else {
      // GLM / Kimi: keep the reasoning/default variant, drop "(Non-reasoning)"
      pick = pickOrder(["reasoning", "default", "max", "high", "adaptive", "non-reasoning"]) || rows[0];
    }
    ids.set(k, pick.id);
  }
  return ids;
}

const TRAILING_PAREN_RE = /\s*\([^()]*\)\s*$/;
/** Name to show for a model row. When "one variant per reasoning family" (collapse)
 *  is on, the row stands in for the whole family, so drop the trailing variant detail
 *  in parentheses — e.g. "Claude Sonnet 5 (Adaptive Reasoning, Max Effort)" → "Claude
 *  Sonnet 5", "GPT-5.5 (high)" → "GPT-5.5". Only for collapsible families; other
 *  models (and the expanded view) keep their full name. */
export function collapsedName(m: { display_name: string; family_key: string }, collapse: boolean): string {
  return collapse && isCollapsibleFamily(m.family_key) ? m.display_name.replace(TRAILING_PAREN_RE, "").trim() : m.display_name;
}

/** Apply the collapse rule to a model list (keep only the preferred variant per
 *  collapsible reasoning family). */
export function collapseModels<T extends ClientModel>(models: T[], preferredId: Map<string, string>): T[] {
  return models.filter((m) => !isCollapsibleFamily(m.family_key) || preferredId.get(m.family_key) === m.id);
}
