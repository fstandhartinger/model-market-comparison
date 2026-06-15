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
      pick = pickOrder(["high", "xhigh", "medium", "low", "non-reasoning", "default"]) || rows[0];
    } else if (k.startsWith("claude-")) {
      const adaptive = rows.find((r) => /adaptive reasoning/i.test(r.display_name));
      pick = adaptive || pickOrder(["max", "high", "reasoning", "non-reasoning", "default"]) || rows[0];
    } else {
      // GLM / Kimi: keep the reasoning/default variant, drop "(Non-reasoning)"
      pick = pickOrder(["reasoning", "default", "max", "high", "adaptive", "non-reasoning"]) || rows[0];
    }
    ids.set(k, pick.id);
  }
  return ids;
}

/** Apply the collapse rule to a model list (keep only the preferred variant per
 *  collapsible reasoning family). */
export function collapseModels<T extends ClientModel>(models: T[], preferredId: Map<string, string>): T[] {
  return models.filter((m) => !isCollapsibleFamily(m.family_key) || preferredId.get(m.family_key) === m.id);
}
