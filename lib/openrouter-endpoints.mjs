// CR-66.5: OpenRouter sometimes lists two physical endpoints under one provider tag (16 Sep: BaseTen
// glm-5.2 baseten/fp8 and baseten/fast, deepseek-v4-pro fp4, kimi-k2.6 fp4 …; 17 Sep also Google
// google-vertex/us-south1 for qwen3-235b-a22b-2507 at two different prices). Which one we published
// was undefined. The rule: one offer per provider + tag + quantization; when their prices differ the
// cheapest is published (input + output per token, then input, then cache read) and the others are
// recorded on the offer. The out-of-repo publish gate (gate/lib.mjs excerptFor) applies the same rule.

const n = (v) => { const x = Number(v); return v == null || String(v).trim() === "" || !Number.isFinite(x) ? Infinity : x; };
export const endpointOfferKey = (e) => `${e?.provider_name ?? ""}/${e?.tag ?? ""}/${e?.quantization ?? ""}`;
const priceOrder = (a, b) => (n(a.pricing?.prompt) + n(a.pricing?.completion)) - (n(b.pricing?.prompt) + n(b.pricing?.completion))
  || n(a.pricing?.prompt) - n(b.pricing?.prompt)
  || n(a.pricing?.input_cache_read) - n(b.pricing?.input_cache_read)
  || JSON.stringify(a.pricing ?? {}).localeCompare(JSON.stringify(b.pricing ?? {}));

/** endpoints → [{ endpoint, alternates: [endpoint …] }] in first-seen order; alternates only when prices differ. */
export function collapseDuplicateEndpoints(endpoints) {
  const groups = new Map();
  for (const e of endpoints || []) {
    const key = endpointOfferKey(e);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  return [...groups.values()].map((list) => {
    const sorted = [...list].sort(priceOrder);
    const samePrice = (e) => JSON.stringify(e.pricing ?? {}) === JSON.stringify(sorted[0].pricing ?? {});
    return { endpoint: sorted[0], physical_endpoints: list.length, alternates: sorted.slice(1).filter((e) => !samePrice(e)) };
  });
}

// CR-65.15: USD per token → USD per 1M tokens without binary float artefacts (0.00000095526 * 1e6 printed as
// 0.9552599999999999). A plain decimal string is shifted exactly; anything else is scaled and trimmed to 12 digits.
export function perMillion(x) {
  if (x == null || x === "") return null;
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  const text = typeof x === "string" ? x.trim() : "";
  const m = /^(\d*)(?:\.(\d*))?$/.exec(text);
  if (!m || (!m[1] && !m[2])) return Number((n * 1e6).toPrecision(12));
  const digits = (m[1] || "0") + ((m[2] || "") + "000000").slice(0, Math.max(6, (m[2] || "").length));
  const point = (m[1] || "0").length + 6;
  return Number(`${digits.slice(0, point)}.${digits.slice(point) || "0"}`);
}
