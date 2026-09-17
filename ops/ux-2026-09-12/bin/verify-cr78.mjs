// CR-78 (jaggedness blended into the Benchmaxxing score) and CR-76 (value-map axis labels), checked live.
// Usage: node verify-cr78.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr78';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

// The API is the same code every surface reads, so the arithmetic is checked once per host, not per viewport.
const report = await fetch(`${BASE}/api/benchmaxxing?report=${encodeURIComponent('muse-spark-1.1::xhigh')}`).then((r) => r.json()).catch(() => null);
const parts = report?.report?.parts ?? null;
check('api: the report publishes both parts of the score', !!parts, parts ? Object.keys(parts).join(',') : 'missing');
if (parts) {
  check('api: the weight is 0.3', parts.jaggednessWeight === 0.3, String(parts.jaggednessWeight));
  check('api: score = gap + jaggedness term', Math.abs(report.report.score - (parts.gap + parts.jaggednessTerm)) < 1e-9,
    `${report.report.score} vs ${parts.gap} + ${parts.jaggednessTerm}`);
  check('api: the term is weight × (jaggedness − catalog mean)',
    Math.abs(parts.jaggednessTerm - 0.3 * (parts.jaggedness - parts.jaggednessMean)) < 1e-9,
    `j=${parts.jaggedness} mean=${parts.jaggednessMean}`);
  check('api: Muse Spark 1.1 is the simulation\'s very strong case (11.7 → 13.8)',
    Math.abs(parts.gap - 11.7) < 0.1 && Math.abs(report.report.score - 13.8) < 0.1, `${parts.gap} → ${report.report.score}`);
}
for (const [id, gap, score] of [['qwen3.7-max::default', 5.8, 7.7], ['gemini-3.6-flash::high', 2.4, 3.2], ['hy3::default', 5.8, 4.3]]) {
  const r = await fetch(`${BASE}/api/benchmaxxing?report=${encodeURIComponent(id)}`).then((x) => x.json()).catch(() => null);
  check(`api: ${id} ${gap} → ${score}`, r?.report?.parts && Math.abs(r.report.parts.gap - gap) < 0.1 && Math.abs(r.report.score - score) < 0.1,
    r?.report ? `${r.report.parts?.gap} → ${r.report.score}` : 'no report');
}
for (const id of ['gpt-6-astra::max', 'claude-opus-5::max', 'claude-fable-5.1::max', 'gpt-5.6-sol::max', 'kimi-k3::max']) {
  const r = await fetch(`${BASE}/api/benchmaxxing?report=${encodeURIComponent(id)}`).then((x) => x.json()).catch(() => null);
  check(`api: frontier model ${id} stays below the light threshold`, typeof r?.report?.score === 'number' && r.report.score < 3, String(r?.report?.score));
}

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport, mobile] of [['desktop', { width: 1440, height: 1000 }, false], ['mobile', { width: 390, height: 844 }, true]]) {
  const tag = `${kind}_${theme}`;
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));

  // --- CR-76: the value map on the Overview names its axes ---
  await goto(page, `${BASE}/`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1800);
  const axes = await page.evaluate(() => {
    const row = document.querySelector('[data-bh-value-map-axes]');
    if (!row) return null;
    const y = row.querySelector('[data-bh-axis-y]'), x = row.querySelector('[data-bh-axis-x]');
    const map = document.querySelector('.bh-value-map');
    const rect = (el) => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), width: Math.round(b.width) }; };
    const style = getComputedStyle(row);
    const rowBox = row.getBoundingClientRect();
    const lineHeight = y ? Math.round(y.getBoundingClientRect().height) : 0;
    return { y: y?.textContent?.trim() ?? null, x: x?.textContent?.trim() ?? null, row: { ...rect(row), height: Math.round(rowBox.height) },
      map: map ? rect(map) : null, fontSize: style.fontSize, color: style.color, lineHeight,
      oneLine: lineHeight > 0 && rowBox.height <= lineHeight + 2,
      overflowRight: Math.round(rowBox.right - document.documentElement.clientWidth) };
  });
  check(`${tag} home: the value map has an axis caption row`, !!axes, axes ? 'found' : 'missing');
  if (axes) {
    check(`${tag} home: the Y axis is named capability`, /↑ Capability/.test(axes.y ?? ''), axes.y);
    check(`${tag} home: the X axis is named adjusted cost per task`, /Adjusted cost per task/.test(axes.x ?? ''), axes.x);
    check(`${tag} home: the caption stays on one line`, !!axes.oneLine, `${axes.row.height}px, ${axes.lineHeight}px line`);
    check(`${tag} home: it stays inside the viewport`, axes.overflowRight <= 0, `${axes.overflowRight}px past the right edge`);
    check(`${tag} home: it is subtle (≤ 12 px type)`, parseFloat(axes.fontSize) <= 12, axes.fontSize);
    check(`${tag} home: it sits under the map`, !!axes.map && axes.row.top >= axes.map.top, `row ${axes.row.top} vs map ${axes.map?.top}`);
  }
  await page.locator('.bh-value-map').screenshot({ path: `${OUT}/${tag}-valuemap-axes.png` }).catch(() => {});

  // --- CR-78: the model report explains both parts ---
  await goto(page, `${BASE}/benchmaxxing`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
  const jag = await page.evaluate(() => {
    const el = document.querySelector('[data-bmx-jaggedness]');
    const drivers = document.querySelector('[data-bmx-drivers]');
    return { text: el?.textContent?.replace(/\s+/g, ' ').trim() ?? null, inDrivers: !!(el && drivers && drivers.contains(el)) };
  });
  check(`${tag} /benchmaxxing: the report prints the jaggedness part`, !!jag.text, jag.text?.slice(0, 120) ?? 'missing');
  if (jag.text) {
    check(`${tag} /benchmaxxing: it names the catalog average and the weight`, /catalog average/.test(jag.text) && /At weight 0\.3/.test(jag.text), jag.text.slice(0, 200));
    check(`${tag} /benchmaxxing: it adds up to the score`, /together the score/.test(jag.text), jag.text.slice(-90));
    check(`${tag} /benchmaxxing: it sits with the other drivers`, jag.inDrivers, String(jag.inDrivers));
  }
  const method = await page.evaluate(() => document.body.textContent.replace(/\s+/g, ' '));
  check(`${tag} /benchmaxxing: the method section explains the second part`, /Jaggedness \(Florian, 17 Sep 2026\)/.test(method), /Jaggedness/.test(method) ? 'present' : 'missing');
  await page.locator('[data-bmx-drivers]').first().screenshot({ path: `${OUT}/${tag}-report-parts.png` }).catch(() => {});

  // --- CR-78.2: /about ---
  await goto(page, `${BASE}/about`);
  await page.waitForLoadState('networkidle').catch(() => {});
  const about = await page.evaluate(() => {
    const el = document.querySelector('[data-bh-benchmaxxing-jaggedness]');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  });
  check(`${tag} /about: the second part is explained`, !!about && /second/i.test(about) && /catalog average/.test(about), about?.slice(0, 160) ?? 'missing');
  check(`${tag} /about: the null simulation is disclosed`, /simulated a catalog in which nobody targets benchmarks/.test(await page.evaluate(() => document.body.textContent.replace(/\s+/g, ' '))), 'null simulation sentence');
  check(`${tag} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) if (!c.ok) console.log(`FAIL  ${c.name}  ${c.detail}`);
console.log(`${passed}/${checks.length} checks passed — ${OUT}/verification.json`);
process.exit(passed === checks.length ? 0 : 1);
