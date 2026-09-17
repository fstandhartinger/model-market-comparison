// CR-67.4: privacy-preserving visitor statistics (decision record: ops/ux-2026-09-12/CR-67.5-CONSENT-DECISION.md).
// The server counts the page requests it delivers anyway. Nothing is written to or read from the visitor's
// device (no cookie, storage, script, pixel or client hint), no identifier is derived (no IP, no hash, no
// fingerprint), and only daily totals per page and referring host are stored. Unique visitors are therefore
// not measured; "visits" counts page loads that entered the site from outside (no same-site referrer).
// Only full page loads (document requests) are seen: Next.js removes the RSC/prefetch headers before middleware,
// so in-app navigations cannot be told apart from prefetches and are not counted.

export const RETENTION_MONTHS = 13;

export const VISIT_STATS_SCHEMA_SQL = `-- CR-67.4: aggregate daily page statistics. No IP, user agent, identifier or visitor-level row.
CREATE TABLE IF NOT EXISTS bh_visit_daily (
  day date NOT NULL,
  path text NOT NULL,
  referrer_host text NOT NULL DEFAULT '',
  views integer NOT NULL DEFAULT 0,
  visits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path, referrer_host)
);
`;

const OWN_HOSTS = new Set(["benchmarkheaven.com", "model-market-comparison.app.mintapis.com", "localhost", "127.0.0.1"]);

// The user agent is read only for this test and never stored.
const BOT_UA = /bot|crawl|spider|slurp|preview|fetch|scan|monitor|lighthouse|headless|phantom|playwright|puppeteer|selenium|curl|wget|python|httpx|axios|node-fetch|undici|go-http|java\/|okhttp|libwww|facebookexternalhit|embedly|quora|whatsapp|telegram|discord|skype|vkshare|w3c_validator|pingdom|uptime|gptbot|chatgpt|claude|anthropic|perplexity|bytespider|ccbot|amazonbot|applebot|bingpreview/i;

// Only known page routes are recorded; anything else (scanners, typos) is folded into one row.
const PAGE_ROOTS = new Set(["", "about", "account", "benchmarks", "benchmaxxing", "charts", "compare", "eu", "gateways",
  "impressum", "models", "privacy", "provider-explorer", "providers", "radar", "scatter", "terms"]);

const hostOf = (value) => {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
};

/** Page path without query or fragment, truncated to its route shape; null for non-page requests. */
export function normalisePath(pathname) {
  if (typeof pathname !== "string" || !pathname.startsWith("/")) return null;
  if (/^\/(_next|api)(\/|$)/.test(pathname) || /\.[a-z0-9]{2,5}$/i.test(pathname)) return null;
  let clean = pathname.replace(/\/{2,}/g, "/");
  if (clean.length > 1) clean = clean.replace(/\/$/, "");
  const parts = clean.split("/").slice(1);
  if (!PAGE_ROOTS.has(parts[0] ?? "")) return "(other)";
  return ("/" + parts.slice(0, 3).join("/")).slice(0, 160);
}

/**
 * Decide whether one incoming request is a page view to count.
 * @param {{ method: string, url: string, headers: { get(name: string): string | null } }} req
 * @returns {{ path: string, referrerHost: string, visit: boolean } | null}
 */
export function classifyRequest(req) {
  if (req.method !== "GET") return null;
  const h = req.headers;
  // Objection signals the browser already sends: Global Privacy Control and Do Not Track.
  if (h.get("sec-gpc") === "1" || h.get("dnt") === "1") return null;
  // Browser prefetch/prerender of a document is not a view.
  if (/prefetch|prerender/i.test(h.get("sec-purpose") ?? h.get("purpose") ?? "")) return null;
  const dest = h.get("sec-fetch-dest");
  if (dest ? dest !== "document" : !(h.get("accept") ?? "").includes("text/html")) return null;
  const ua = h.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return null;
  let pathname;
  try { pathname = new URL(req.url).pathname; } catch { return null; }
  const path = normalisePath(pathname);
  if (!path) return null;
  const ref = h.get("referer");
  const refHost = ref ? hostOf(ref) : null;
  const sameSite = refHost !== null && OWN_HOSTS.has(refHost);
  return {
    path,
    referrerHost: refHost && !sameSite ? refHost.slice(0, 100) : "",
    visit: !sameSite,
  };
}

/** UTC calendar day of a timestamp, YYYY-MM-DD. */
export const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);

/** In-memory daily totals; flushed as increments, then cleared. Holds no request-level data. */
export function createAccumulator() {
  let rows = new Map();
  return {
    add(hit, now = Date.now()) {
      const day = dayOf(now);
      const key = `${day}\u0000${hit.path}\u0000${hit.referrerHost}`;
      const row = rows.get(key) ?? { day, path: hit.path, referrerHost: hit.referrerHost, views: 0, visits: 0 };
      row.views += 1;
      if (hit.visit) row.visits += 1;
      rows.set(key, row);
    },
    size: () => rows.size,
    take() { const out = [...rows.values()]; rows = new Map(); return out; },
    restore(taken) {
      for (const r of taken) {
        const key = `${r.day}\u0000${r.path}\u0000${r.referrerHost}`;
        const row = rows.get(key);
        if (row) { row.views += r.views; row.visits += r.visits; } else rows.set(key, { ...r });
      }
    },
  };
}

/** Upsert a batch of totals and apply the retention limit. `query` is pg's pool.query. */
export async function flushRows(query, rows) {
  if (!rows.length) return;
  const values = [];
  const params = [];
  rows.forEach((r, i) => {
    values.push(`($${i * 5 + 1}::date, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}::int, $${i * 5 + 5}::int)`);
    params.push(r.day, r.path, r.referrerHost, r.views, r.visits);
  });
  await query(
    `INSERT INTO bh_visit_daily (day, path, referrer_host, views, visits) VALUES ${values.join(", ")}
     ON CONFLICT (day, path, referrer_host) DO UPDATE SET views = bh_visit_daily.views + EXCLUDED.views,
       visits = bh_visit_daily.visits + EXCLUDED.visits`,
    params,
  );
  await query(`DELETE FROM bh_visit_daily WHERE day < (current_date - interval '${RETENTION_MONTHS} months')`);
}

/** Aggregate report for the operator: totals per day, top pages and top referring hosts. */
export async function visitReport(query, days = 30) {
  const n = Math.max(1, Math.min(400, Math.floor(Number(days) || 30)));
  const since = `current_date - ${n - 1}`;
  const [daily, pages, referrers] = await Promise.all([
    query(`SELECT to_char(day, 'YYYY-MM-DD') AS day, sum(views)::int AS views, sum(visits)::int AS visits
           FROM bh_visit_daily WHERE day >= ${since} GROUP BY day ORDER BY day`),
    query(`SELECT path, sum(views)::int AS views, sum(visits)::int AS visits
           FROM bh_visit_daily WHERE day >= ${since} GROUP BY path ORDER BY views DESC LIMIT 25`),
    query(`SELECT referrer_host, sum(visits)::int AS visits
           FROM bh_visit_daily WHERE day >= ${since} AND referrer_host <> '' GROUP BY referrer_host ORDER BY visits DESC LIMIT 25`),
  ]);
  const sum = (key) => daily.rows.reduce((acc, r) => acc + r[key], 0);
  return {
    days: n,
    unique_visitors: null,
    unique_visitors_note: "Not measured: counting unique visitors would need an identifier (cookie, IP or hash).",
    totals: { views: sum("views"), visits: sum("visits") },
    daily: daily.rows,
    top_pages: pages.rows,
    top_referrers: referrers.rows,
  };
}
