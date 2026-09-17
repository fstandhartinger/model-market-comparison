// F-115 (Fable pass 21) — the Compare radar's "Full scale" checkbox sits on the control row.
// Usage: node verify-f115.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-f115';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport, mobile] of [['desktop', { width: 1440, height: 1000 }, false], ['mobile', { width: 390, height: 844 }, true]]) {
  const tag = `${kind}_${theme}`;
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/compare`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  const box = await page.evaluate(() => {
    const input = document.querySelector('[data-radar-fullscale]');
    if (!input) return null;
    const label = input.closest('label');
    // Only the segmented controls that share the label's row count; the page has other groups.
    const groups = [...label.parentElement.querySelectorAll(':scope > [role="group"]')];
    const legend = document.querySelector('#benchmark-radar ul[aria-label="Chart legend"]');
    const r = (el) => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), height: Math.round(b.height) }; };
    return { label: r(label), groups: groups.map(r), legend: legend ? r(legend) : null, sameRowParent: groups.some((g) => g.parentElement === label.parentElement) };
  });
  check(`${tag} the checkbox exists on /compare`, !!box, box ? 'found' : 'missing');
  if (box) {
    check(`${tag} it shares the control row's container`, box.sameRowParent, box.sameRowParent);
    check(`${tag} 36 px control height`, box.label.height >= 36, `${box.label.height}px`);
    if (kind === 'desktop') check('desktop: top edge within 4 px of the segmented controls', box.groups.length > 0 && Math.abs(box.label.top - Math.min(...box.groups.map((g) => g.top))) <= 4, { label: box.label.top, groups: box.groups.map((g) => g.top) });
    else check('mobile: the checkbox is the last control above the legend', !box.legend || box.label.bottom <= box.legend.top, { label: box.label.bottom, legend: box.legend?.top });
  }
  check(`${tag} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.locator('#benchmark-radar').screenshot({ path: `${OUT}/${tag}-compare-controls.png` }).catch(() => {});
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) if (!c.ok) console.log(`FAIL  ${c.name}  ${c.detail}`);
console.log(`${passed}/${checks.length} checks passed — ${OUT}/verification.json`);
process.exit(passed === checks.length ? 0 : 1);
