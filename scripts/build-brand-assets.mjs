#!/usr/bin/env node
/**
 * R7 — brand assets from Florian's new artwork
 * (`ops/ux-2026-09-12/assets/benchmark-heaven-logo-light.jpg`).
 *
 * The artwork is a 1254×1254 JPEG. Rather than shipping a raster that blurs at 36 px and
 * cannot follow the theme, the mark is re-drawn as SVG from geometry measured off that
 * JPEG: the cloud is the union of three circles cut off at the flat bottom edge, the
 * staircase is seven treads, and the seven sun rays use the endpoints of the rays in the
 * original. Every number below is in a 64-unit viewBox and comes from
 *   u(x) = (x - 0.4995) * 96 + 32,  v(y) = (y - 0.3365) * 96 + 32
 * applied to the fractional coordinates measured in the JPEG, so the shape can be checked
 * against the source at any time.
 *
 * One deliberate departure: the rays are drawn 1.8 units wide where the artwork measures
 * 1.25. At 1254 px the original rays are 16 px; at a 36 px nav logo that is half a pixel
 * and they vanish. The heavier stroke keeps the mark recognisable at favicon size.
 *
 * Run: node scripts/build-brand-assets.mjs        (SVGs only)
 *      node scripts/build-brand-assets.mjs --png  (also rasterise icons + OG image)
 */
import { writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const OUT = new URL("../public/brand/", import.meta.url);
const APP = new URL("../app/", import.meta.url);
const PUBLIC = new URL("../public/", import.meta.url);

/** Cloud lobes, flat bottom and staircase — measured, see the header. */
const CLOUD = {
  top: { cx: 32.0, cy: 38.6, r: 16.2 },
  left: { cx: 14.1, cy: 45.3, r: 11.3 },
  right: { cx: 49.9, cy: 45.3, r: 11.3 },
  body: { x: 14.1, y: 38.6, w: 35.8, h: 16.9 },
  bottom: 55.5,
};
const STAIRS = [
  { x: 33.9, y: 33.8, w: 7.7, h: 1.6 },
  { x: 31.8, y: 35.9, w: 8.8, h: 1.4 },
  { x: 29.2, y: 38.1, w: 10.6, h: 1.6 },
  { x: 26.2, y: 40.5, w: 12.5, h: 2.3 },
  { x: 22.5, y: 43.6, w: 14.9, h: 2.9 },
  { x: 18.3, y: 47.2, w: 17.3, h: 3.3 },
  { x: 13.8, y: 51.5, w: 19.8, h: 4.0 },
];
const RAYS = [
  [19.1, 26.0, 12.8, 21.5],
  [22.8, 23.0, 17.7, 16.8],
  [27.3, 20.9, 24.3, 13.3],
  [32.0, 20.1, 32.0, 8.5],
  [36.8, 20.9, 39.7, 13.3],
  [41.2, 23.0, 46.3, 16.8],
  [44.9, 26.0, 51.2, 21.5],
];

/** Sampled from the artwork; the dark palette lifts luminance so the mark keeps the same
 *  visual weight on a near-black page instead of sinking into it. */
const PALETTE = {
  light: { from: "#0951fd", to: "#2ddbfd", ray: "#fed432", stair: "#f2f7fd" },
  dark: { from: "#2a68ff", to: "#5ae6ff", ray: "#ffd95c", stair: "#ffffff" },
};

function markBody(p, idSuffix) {
  const g = `bhCloud${idSuffix}`;
  const c = `bhCut${idSuffix}`;
  return `<defs>` +
    `<linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="12" y1="56" x2="52" y2="24">` +
      `<stop stop-color="${p.from}"/><stop offset="1" stop-color="${p.to}"/>` +
    `</linearGradient>` +
    `<clipPath id="${c}"><rect x="0" y="0" width="64" height="${CLOUD.bottom}" rx="0"/></clipPath>` +
  `</defs>` +
  `<g stroke="${p.ray}" stroke-width="1.8" stroke-linecap="round">` +
    RAYS.map(([x1, y1, x2, y2]) => `<path d="M${x1} ${y1}L${x2} ${y2}"/>`).join("") +
  `</g>` +
  `<g clip-path="url(#${c})" fill="url(#${g})">` +
    `<circle cx="${CLOUD.top.cx}" cy="${CLOUD.top.cy}" r="${CLOUD.top.r}"/>` +
    `<circle cx="${CLOUD.left.cx}" cy="${CLOUD.left.cy}" r="${CLOUD.left.r}"/>` +
    `<circle cx="${CLOUD.right.cx}" cy="${CLOUD.right.cy}" r="${CLOUD.right.r}"/>` +
    `<rect x="${CLOUD.body.x}" y="${CLOUD.body.y}" width="${CLOUD.body.w}" height="${CLOUD.body.h}"/>` +
  `</g>` +
  `<g fill="${p.stair}">` +
    STAIRS.map((s) => `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="0.6"/>`).join("") +
  `</g>`;
}

const mark = (theme, { id = "" } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="Benchmark Heaven">` +
  markBody(PALETTE[theme], id) + `</svg>`;

/** Favicon: the same mark on the brand ink square, so it keeps a shape on a white tab bar. */
const icon = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="Benchmark Heaven">` +
  `<rect width="64" height="64" rx="14" fill="#0e131b"/>` +
  `<g transform="translate(32 32) scale(0.86) translate(-32 -32)">${markBody(PALETTE.dark, "I")}</g>` +
  `</svg>`;

const TAGLINE = "LLM benchmarks. Higher standards.";

const wordmark = (theme) => {
  const ink = theme === "dark" ? "#0e131b" : "#ffffff";
  const first = theme === "dark" ? "#edf2f8" : "#021533";
  const second = theme === "dark" ? "#5ae6ff" : "#0a76fd";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="200" viewBox="0 0 900 200" role="img" aria-labelledby="t"><title id="t">Benchmark Heaven — ${TAGLINE}</title>` +
    `<rect width="900" height="200" rx="16" fill="${ink}"/>` +
    `<g transform="translate(40 42) scale(1.8)">${markBody(PALETTE[theme], theme === "dark" ? "WD" : "WL")}</g>` +
    `<text x="180" y="108" fill="${first}" font-family="Helvetica,Arial,sans-serif" font-size="62" font-weight="700" letter-spacing="-1">Benchmark <tspan fill="${second}">Heaven</tspan></text>` +
    `<text x="183" y="142" fill="${theme === "dark" ? "#adb9ca" : "#4c5e75"}" font-family="Helvetica,Arial,sans-serif" font-size="20" letter-spacing="2.4">${TAGLINE.toUpperCase()}</text>` +
    `</svg>`;
};

const og = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="t"><title id="t">Benchmark Heaven — every benchmark result for every model, and what each one actually costs.</title>` +
  `<rect width="1200" height="630" fill="#0e131b"/>` +
  `<g transform="translate(64 52) scale(1.1)">${markBody(PALETTE.dark, "OG")}</g>` +
  `<text x="150" y="102" fill="#edf2f8" font-family="Helvetica,Arial,sans-serif" font-size="34" font-weight="700">Benchmark <tspan fill="#5ae6ff">Heaven</tspan></text>` +
  `<text x="64" y="272" fill="#edf2f8" font-family="Georgia,serif" font-size="66" letter-spacing="-2">Every benchmark result for every model,</text>` +
  `<text x="64" y="352" fill="#67e0c1" font-family="Georgia,serif" font-size="66" letter-spacing="-2">and what each one actually costs.</text>` +
  `<text x="68" y="420" fill="#adb9ca" font-family="Helvetica,Arial,sans-serif" font-size="25">Benchmarks with their source and date · adjusted cost per task, not price per million tokens</text>` +
  `<path d="M64 508h600" stroke="#394657"/>` +
  `<text x="68" y="560" fill="#6caeff" font-family="Helvetica,Arial,sans-serif" font-size="23">benchmarkheaven.com</text>` +
  `</svg>`;

async function rasterise(targets) {
  const require = createRequire("/home/flori/n8n-local/");
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  for (const { svg, path, width, height } of targets) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block}</style>` +
      svg.replace(/width="\d+" height="\d+"/, `width="${width}" height="${height}"`),
      { waitUntil: "load" },
    );
    await page.screenshot({ path, omitBackground: true });
    await page.close();
    console.log("✓", path.replace(/^.*\/public\//, "public/"), `${width}×${height}`);
  }
  await browser.close();
}

await mkdir(OUT, { recursive: true });
const files = [
  [new URL("mark.svg", OUT), mark("light", { id: "L" })],
  [new URL("mark-dark.svg", OUT), mark("dark", { id: "D" })],
  [new URL("wordmark.svg", OUT), wordmark("dark")],
  [new URL("wordmark-light.svg", OUT), wordmark("light")],
  [new URL("og-image.svg", OUT), og()],
  [new URL("icon.svg", APP), icon()],
];
for (const [url, content] of files) {
  await writeFile(url, content + "\n");
  console.log("✓", url.pathname.replace(/^.*\/(app|public)\//, "$1/"));
}

if (process.argv.includes("--png")) {
  await rasterise([
    { svg: og(), path: new URL("og-image.png", OUT).pathname, width: 1200, height: 630 },
    { svg: icon(), path: new URL("apple-icon.png", APP).pathname, width: 180, height: 180 },
    { svg: icon(), path: new URL("icon-192.png", OUT).pathname, width: 192, height: 192 },
    { svg: icon(), path: new URL("icon-512.png", OUT).pathname, width: 512, height: 512 },
    { svg: mark("light", { id: "L" }), path: new URL("mark-light-512.png", OUT).pathname, width: 512, height: 512 },
    { svg: mark("dark", { id: "D" }), path: new URL("mark-dark-512.png", OUT).pathname, width: 512, height: 512 },
  ]);
}
