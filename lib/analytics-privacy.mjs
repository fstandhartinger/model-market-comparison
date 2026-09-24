export const ANALYTICS_STATIC_PATHS = new Set([
  "/", "/about", "/account", "/benchmarks", "/benchmarks/result", "/benchmaxxing", "/charts",
  "/compare", "/eu", "/gateways", "/impressum", "/jev-models", "/jev-models/alternatives",
  "/jev-models/custom-evaluation", "/jev-models/how-to-choose", "/jev-models/jev-vs-hopper",
  "/jev-models/jev-vs-jevk5", "/jev-models/jev-vs-laya", "/jev-models/jev-vs-reflex-4b",
  "/jev-models/jev-vs-winnow-12b-q8", "/jev-models/multimodal-preview", "/jev-models/request-evaluation",
  "/jev-models/request-evaluation/cancel", "/jev-models/request-evaluation/success", "/jev-models/v1",
  "/jev-models/v1.4", "/jev-models/v1.4.1", "/privacy", "/provider-explorer", "/providers", "/radar",
  "/scatter", "/terms", "/alternatives", "/jev-vs-laya", "/image-jev-bench",
]);

function safePath(pathname, modelFamilyIds, jevSystemIds) {
  if (pathname.length > 512) return "/other";
  let segments;
  try {
    const normalized = pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    segments = normalized.split("/").map((segment) => decodeURIComponent(segment));
  } catch {
    return "/other";
  }

  const decodedPath = segments.join("/") || "/";
  if (ANALYTICS_STATIC_PATHS.has(decodedPath)) return decodedPath;
  if (segments.length === 3 && segments[0] === "" && segments[1] === "models" && modelFamilyIds.has(segments[2])) {
    return `/models/${encodeURIComponent(segments[2])}`;
  }
  if (segments.length === 3 && segments[0] === "" && segments[1] === "jev-models" && jevSystemIds.has(segments[2])) {
    return `/jev-models/${encodeURIComponent(segments[2])}`;
  }
  return "/other";
}

/** Keep only useful, public pageview data; free-form query, fragment, and page metadata never leave the site. */
export function sanitizeAnalyticsPayload(payload, {
  origin,
  fallbackUrl,
  modelIds,
  modelFamilyIds = new Set(),
  jevSystemIds,
}) {
  try {
    const base = new URL(origin);
    const page = new URL(String(payload.url || fallbackUrl || "/"), base);
    if (page.origin !== base.origin) return false;

    const path = safePath(page.pathname.replace(/\/{2,}/g, "/"), modelFamilyIds, jevSystemIds);
    const safeQuery = new URLSearchParams();
    if (path === "/compare") {
      const seen = new Set();
      for (const id of page.searchParams.getAll("model")) {
        if (modelIds.has(id) && !seen.has(id)) {
          safeQuery.append("model", id);
          seen.add(id);
          if (seen.size === 4) break;
        }
      }
    } else if (path === "/jev-models") {
      const pair = (page.searchParams.get("compare") || "").split(",");
      if (pair.length === 2 && pair[0] !== pair[1] && pair.every((id) => jevSystemIds.has(id))) {
        safeQuery.set("compare", pair.join(","));
      }
    }

    const query = safeQuery.toString();
    const referrer = payload.referrer ? new URL(String(payload.referrer), base) : null;
    const referrerHost = referrer?.hostname.toLowerCase().replace(/^www\./, "");
    const currentHost = base.hostname.toLowerCase().replace(/^www\./, "");
    const safeReferrer = referrer && /^https?:$/.test(referrer.protocol) && referrerHost !== currentHost
      ? `${referrer.origin}/`
      : "";

    return {
      website: payload.website,
      hostname: base.hostname,
      url: path + (query ? `?${query}` : ""),
      referrer: safeReferrer,
    };
  } catch {
    return false;
  }
}
