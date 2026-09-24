#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const baseUrl = process.env.UMAMI_BASE_URL;
const websiteId = process.env.UMAMI_WEBSITE_ID;
const apiKey = process.env.UMAMI_API_KEY;

if (!baseUrl || !websiteId || !apiKey) {
  throw new Error("UMAMI_BASE_URL, UMAMI_WEBSITE_ID, and UMAMI_API_KEY are required");
}

const base = new URL(baseUrl);
if (base.origin !== "https://bh-analytics.app.mintapis.com" || base.pathname !== "/" || base.search || base.hash) {
  throw new Error("UMAMI_BASE_URL must be the Benchmark Heaven Umami HTTPS origin");
}
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(websiteId)) {
  throw new Error("UMAMI_WEBSITE_ID must be a UUID");
}
if (!apiKey.trim()) {
  throw new Error("UMAMI_API_KEY must be nonempty");
}

const berlinParts = (date) => Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
}).formatToParts(date).filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));

const dateKey = ({ year, month, day }) => `${year}-${month}-${day}`;
const today = berlinParts(new Date());
const todayWallTime = Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day));
const yesterday = berlinParts(new Date(todayWallTime - 86_400_000));

function berlinMidnight(parts) {
  const target = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  const atUtcMidnight = berlinParts(new Date(target));
  const localAsUtc = Date.UTC(
    Number(atUtcMidnight.year), Number(atUtcMidnight.month) - 1, Number(atUtcMidnight.day),
    Number(atUtcMidnight.hour || 0), Number(atUtcMidnight.minute || 0), Number(atUtcMidnight.second || 0),
  );
  return target - (localAsUtc - target);
}

const startAt = berlinMidnight(yesterday);
const endAt = berlinMidnight(today);

async function get(path) {
  const url = new URL(path, base);
  url.searchParams.set("startAt", String(startAt));
  url.searchParams.set("endAt", String(endAt));
  const response = await fetch(url, {
    headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Umami API request failed with HTTP ${response.status}`);
  return response.json();
}

const [stats, referrerRows] = await Promise.all([
  get(`/api/websites/${encodeURIComponent(websiteId)}/stats`),
  get(`/api/websites/${encodeURIComponent(websiteId)}/metrics?type=referrer`),
]);

function labelFor(raw) {
  const value = String(raw || "").trim();
  if (!value) return "Direct";
  let host;
  try { host = new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return "Other"; }
  if (["t.co", "x.com", "twitter.com"].includes(host) || host.endsWith(".x.com")) return "X";
  if (host === "news.ycombinator.com") return "Hacker News";
  if (host === "google.com" || /^google\.[a-z.]+$/.test(host) || host.endsWith(".google.com")) return "Google";
  if (["huggingface.co", "hf.co"].includes(host) || host.endsWith(".huggingface.co")) return "Hugging Face";
  if (["github.com", "github.io"].includes(host) || host.endsWith(".github.com") || host.endsWith(".github.io")) return "GitHub";
  return host;
}

const grouped = new Map();
for (const row of Array.isArray(referrerRows) ? referrerRows : []) {
  const label = labelFor(row.x);
  grouped.set(label, (grouped.get(label) || 0) + Number(row.y || 0));
}
const topReferrers = [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
const views = stats?.pageviews?.value;
if (!Number.isSafeInteger(views) || views < 0 || !Number.isFinite(startAt) || !Number.isFinite(endAt)) {
  throw new Error("Umami returned an invalid daily report");
}

const referrersText = topReferrers.length
  ? topReferrers.map(([label, count]) => `${label} (${count})`).join(", ")
  : "none recorded";
const line = `Benchmark Heaven analytics for ${dateKey(yesterday)}: ${views} views; top referrers: ${referrersText}.`;

if (process.env.DRY_RUN === "1") {
  process.stdout.write(`${line}\n`);
} else {
  const result = spawnSync("/home/flori/bin/notify", ["digest", "benchmarkheaven-analytics", line], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`notify digest failed with exit code ${result.status ?? "unknown"}`);
}
