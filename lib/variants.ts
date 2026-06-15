import type { ClientModel } from "./client-model";

/** For GPT-* and Claude-* families (which expose many reasoning variants), choose
 *  one representative per family: GPT → the "(high)" effort variant (fallback
 *  xhigh/medium/low/non-reasoning); Claude → the "Adaptive Reasoning" variant.
 *  Returns family_key -> chosen model id. */
export function preferredVariantIds(models: ClientModel[]): Map<string, string> {
  const byFamily = new Map<string, ClientModel[]>();
  for (const m of models) {
    const k = m.family_key;
    if (!k.startsWith("gpt-") && !k.startsWith("claude-")) continue;
    if (!byFamily.has(k)) byFamily.set(k, []);
    byFamily.get(k)!.push(m);
  }
  const ids = new Map<string, string>();
  for (const [k, rows] of byFamily) {
    const byVar = (v: string) => rows.find((r) => r.variant === v);
    let pick = rows[0];
    if (k.startsWith("gpt-")) {
      for (const v of ["high", "xhigh", "medium", "low", "non-reasoning", "default"]) { const r = byVar(v); if (r) { pick = r; break; } }
    } else {
      const adaptive = rows.find((r) => /adaptive reasoning/i.test(r.display_name));
      pick = adaptive || (["max", "high", "reasoning", "non-reasoning", "default"].map(byVar).find(Boolean) as ClientModel) || rows[0];
    }
    ids.set(k, pick.id);
  }
  return ids;
}

/** Apply the collapse rule to a model list (drop non-preferred GPT/Claude variants). */
export function collapseModels<T extends ClientModel>(models: T[], preferredId: Map<string, string>): T[] {
  return models.filter((m) => {
    const k = m.family_key;
    if (!k.startsWith("gpt-") && !k.startsWith("claude-")) return true;
    return preferredId.get(k) === m.id;
  });
}
