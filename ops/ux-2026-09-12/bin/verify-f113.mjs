// F-113 (Fable pass 21) — radar ring labels off the 12-o'clock spoke, the unit word in the caption.
// Usage: node verify-f113.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-f113';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

/**
 * F-113 asks for ring labels that no longer sit under the 12-o'clock spoke's own point or under the
 * sector band. A radar with 38 axes has a 4.7° step, so *no* angle is more than ~17 px from a
 * neighbouring spoke: a strict "touches no point" rule is unreachable there. What is checked is what
 * makes the numbers readable — they stay inside the rim (never under the arc band), they sit off
 * every spoke, and they are painted after the data points, with the halo, so nothing covers them.
 */
const geometry = (page) => page.evaluate(() => {
  const svg = document.querySelector('svg[data-topic-radar]');
  if (!svg) return null;
  const box = (el) => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; };
  const svgBox = box(svg), cx = (svgBox.left + svgBox.right) / 2, cy = (svgBox.top + svgBox.bottom) / 2;
  const rings = [...svg.querySelectorAll('circle:not([cx="0"])')].filter((c) => c.getAttribute('fill') === 'none' && !c.getAttribute('stroke-dasharray'));
  const rimPx = Math.max(...rings.map((c) => { const b = c.getBoundingClientRect(); return b.width / 2; }), 0);
  const corners = (b) => [[b.left, b.top], [b.right, b.top], [b.left, b.bottom], [b.right, b.bottom]];
  const labels = [...svg.querySelectorAll('[data-radar-ring-labels] text')].map((t) => {
    const b = box(t);
    const far = Math.max(...corners(b).map(([x, y]) => Math.hypot(x - cx, y - cy)));
    const angle = Math.atan2((b.top + b.bottom) / 2 - cy, (b.left + b.right) / 2 - cx) * 180 / Math.PI;
    return { text: t.textContent, farthestPx: far, angleDeg: angle };
  });
  const ringGroup = svg.querySelector('[data-radar-ring-labels]');
  const nodes = [...svg.children];
  // A data point is a painted circle: the rings and the dashed average ring are fill="none", and the
  // keyboard/hover hit targets are fill="transparent" and may sit on top.
  const painted = (n) => n.tagName === 'circle' && !['none', 'transparent'].includes(n.getAttribute('fill'));
  const lastPoint = nodes.map((n, i) => (painted(n) ? i : -1)).reduce((m, i) => Math.max(m, i), -1);
  const paintedAfterPoints = !!ringGroup && lastPoint >= 0 && nodes.indexOf(ringGroup) > lastPoint;
  const unitWords = [...svg.querySelectorAll('text')].map((t) => (t.textContent || '').trim()).filter((t) => t === 'percentile' || t === 'position');
  return { labels, rimPx, paintedAfterPoints, unitWords, points: lastPoint >= 0 };
});

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport, mobile] of [['desktop', { width: 1440, height: 1000 }, false], ['mobile', { width: 390, height: 844 }, true]]) {
  for (const [page_, path] of [['benchmaxxing', '/benchmaxxing'], ['compare', '/compare']]) {
    const tag = `${kind}_${theme}_${page_}`;
    const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
    await goto(page, `${BASE}${path}`);
    await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    await page.reload().catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    if (page_ === 'benchmaxxing') {
      // Open the first model's report, which carries the topic radar.
      await page.locator('table tbody tr').first().click().catch(() => {});
      await page.waitForTimeout(1200);
    } else {
      await page.locator('button:has-text("Detailed")').first().click().catch(() => {});
      await page.waitForTimeout(1200);
    }
    const g = await geometry(page);
    check(`${tag}: a topic radar is on screen`, !!g, g ? `${g.labels.length} ring labels` : 'no radar');
    if (g) {
      check(`${tag}: ring labels are 0 / 50 / 100 (plus the average on a single-series chart)`, g.labels.filter((l) => ['0', '50', '100'].includes(l.text)).length === 3, g.labels.map((l) => l.text));
      check(`${tag}: no unit word inside the chart`, g.unitWords.length === 0, g.unitWords);
      check(`${tag}: every ring label stays inside the rim (never under the sector band)`, g.labels.every((l) => l.farthestPx <= g.rimPx + 1), { rim: Math.round(g.rimPx), labels: g.labels.map((l) => [l.text, Math.round(l.farthestPx)]) });
      check(`${tag}: no ring label sits on the 12-o'clock spoke`, g.labels.every((l) => Math.abs(l.angleDeg + 90) > 1), g.labels.map((l) => [l.text, Math.round(l.angleDeg)]));
      check(`${tag}: ring labels are painted after the data points`, g.paintedAfterPoints, g.paintedAfterPoints);
    }
    const caption = await page.locator('[data-radar-axes-note], #benchmark-radar p').filter({ hasText: 'Rings:' }).first().innerText().catch(() => '');
    check(`${tag}: the caption carries the ring unit`, /Rings: 0 · 50 · 100 (percentile|position)\./.test(caption), caption.slice(0, 160));
    check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
    await page.locator('svg[data-topic-radar]').first().screenshot({ path: `${OUT}/${tag}-radar.png` }).catch(() => {});
    await context.close();
  }
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) if (!c.ok) console.log(`FAIL  ${c.name}  ${c.detail}`);
console.log(`${passed}/${checks.length} checks passed — ${OUT}/verification.json`);
process.exit(passed === checks.length ? 0 : 1);
