// CR-62.3 (Florian 2026-09-16): launch share images with the real product look — the dark Overview
// (value map + ranking) under the logo and the accepted brand copy. 1200×630 for link cards and a 1:1
// variant; the text-only public/brand/og-image.png stays as the fallback.
// Usage: node scripts/build-share-image.mjs [base-url]   (default https://benchmarkheaven.com)
import { createRequire } from "node:module";
import { readFile, stat } from "node:fs/promises";

const BASE = (process.argv[2] || "https://benchmarkheaven.com").replace(/\/$/, "");
const OUT = new URL("../public/brand/", import.meta.url);
const require = createRequire("/home/flori/n8n-local/");
const { chromium } = require("playwright");

const svg = await readFile(new URL("og-image.svg", OUT), "utf8");
// The logo group of the text-only card, so both images carry the identical mark.
const logo = svg.slice(svg.indexOf("<g transform="), svg.indexOf("<text")).replace(/^<g transform="[^"]*"/, "<g");

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1700 }, deviceScaleFactor: 2, colorScheme: "dark" });
  await ctx.addInitScript(() => { try { localStorage.clear(); localStorage.setItem("bh-theme", "dark"); } catch {} });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(() => !document.querySelector(".bh-deferred"), null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  const box = await page.locator('section[aria-label="Recommendation mode"]').boundingBox();
  const shot = await page.screenshot({ clip: { x: box.x, y: box.y + 50, width: box.width, height: 1300 } });
  await ctx.close();
  const img = `data:image/png;base64,${shot.toString("base64")}`;

  const card = (w, h, shotHeight, headline) => `<!doctype html><html><head><style>
    html,body{margin:0;width:${w}px;height:${h}px;background:#0e131b;overflow:hidden;font-family:Helvetica,Arial,sans-serif}
    .head{display:flex;align-items:center;gap:22px;padding:34px 48px 0}
    .head svg{width:74px;height:64px;flex:none}
    .name{color:#edf2f8;font-size:34px;font-weight:700;white-space:nowrap}.name span{color:#5ae6ff}
    .claim{padding:${headline ? 22 : 14}px 48px 0;font-family:Georgia,serif;letter-spacing:-1px;line-height:1.12;font-size:${headline}px;color:#edf2f8}
    .claim em{font-style:normal;color:#67e0c1;display:block}
    .shot{position:absolute;left:48px;right:48px;bottom:0;height:${shotHeight}px;border:1px solid #394657;border-bottom:0;border-radius:18px 18px 0 0;overflow:hidden;
      background:url(${img}) top left/100% auto no-repeat;box-shadow:0 -8px 40px rgba(0,0,0,.45)}
    .url{position:absolute;right:52px;top:48px;color:#6caeff;font-size:22px}
  </style></head><body>
    <div class="head"><svg viewBox="0 0 64 56">${logo}</svg><div class="name">Benchmark <span>Heaven</span></div></div>
    <div class="url">benchmarkheaven.com</div>
    <div class="claim">The most detailed cost–capability analysis in AI.<em>Every model. Every Benchmark. Actual Costs.</em></div>
    <div class="shot"></div>
  </body></html>`;

  for (const [file, w, h, shotHeight, headline] of [["og-launch.png", 1200, 630, 395, 40], ["og-launch-square.png", 1200, 1200, 900, 52]]) {
    const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent(card(w, h, shotHeight, headline), { waitUntil: "load" });
    const path = new URL(file, OUT).pathname;
    await p.screenshot({ path, type: "png" });
    await p.close();
    console.log("✓", `public/brand/${file}`, `${w}×${h}`, `${Math.round((await stat(path)).size / 1024)} KB`, `from ${BASE}/`);
  }
} finally { await browser.close(); }
