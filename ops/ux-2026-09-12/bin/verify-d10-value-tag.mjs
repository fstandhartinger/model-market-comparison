// Florian directive 10 (2026-09-15, 10-FLORIAN-DIRECTIVE-MOBILE-TABLE-TAGS): Simple overview cost tag is compact
// ("↓11×") in mobile portrait at 320/375/390 × 844 without overlap or clipping; desktop/tablet keep "↓ 11× cheaper";
// the words stay in the tooltip and the accessible text. Light and dark.
// Usage: BH_RUNNER=<engine> node verify-d10-value-tag.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-d10';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

const browser = await chromium.launch();
const sizes = [['phone320', 320, 844, true], ['phone375', 375, 844, true], ['phone390', 390, 844, true], ['tablet768', 768, 1024, true], ['desktop1440', 1440, 1000, false]];
for (const theme of ['light', 'dark']) for (const [name, width, height, touch] of sizes) {
  const tag = `${name}_${theme}`, compact = width < 640;
  const context = await browser.newContext({ viewport: { width, height }, isMobile: touch && width < 1024, hasTouch: touch, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const tags = [...document.querySelectorAll('tr.bh-ranking-row .bh-value-tag')].filter((el) => el.offsetParent);
    return tags.slice(0, 12).map((el) => {
      const r = el.getBoundingClientRect();
      const cell = el.closest('td'); const cr = cell.getBoundingClientRect();
      const price = [...cell.querySelectorAll('*')].find((x) => /\$\d/.test(x.textContent || '') && !x.closest('.bh-value-tag') && x.children.length === 0);
      const pr = price?.getBoundingClientRect();
      return {
        visible: el.innerText.replace(/\s+/g, ' ').trim(), title: el.getAttribute('title') || '', sr: el.querySelector('.sr-only')?.textContent || '',
        inCell: r.left >= cr.left - 0.5 && r.right <= cr.right + 0.5,
        overlapsPrice: pr ? !(r.right <= pr.left + 0.5 || r.left >= pr.right - 0.5 || r.bottom <= pr.top + 0.5 || r.top >= pr.bottom - 0.5) : null,
        priceClipped: price ? price.scrollWidth > price.clientWidth + 1 : null,
      };
    });
  });
  check(`${tag} Simple table shows value tags`, info.length > 0, info.length);
  const visibleOk = info.every((t) => compact ? /^[↓↑]\d+(\.\d)?×$/.test(t.visible) : /^[↓↑]\s?\d+(\.\d)?× (cheaper|pricier)$/.test(t.visible));
  check(`${tag} ${compact ? 'compact "↓11×" (no words, no space)' : 'full "↓ 11× cheaper" text unchanged'}`, visibleOk, info.map((t) => t.visible));
  check(`${tag} words kept in tooltip and accessible text`, info.every((t) => /× (cheaper|pricier)\./.test(t.title) && /× (cheaper|pricier):/.test(t.sr)), info.slice(0, 2).map((t) => [t.title.slice(0, 60), t.sr.slice(0, 60)]));
  check(`${tag} tag inside its cell, not overlapping the price, price not clipped`, info.every((t) => t.inCell && t.overlapsPrice !== true && t.priceClipped !== true), info.map((t) => [t.inCell, t.overlapsPrice, t.priceClipped]));
  check(`${tag} no horizontal page overflow, no page errors`, !errors.length && !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), errors);
  await page.locator('tr.bh-ranking-row .bh-value-tag').first().scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${OUT}/${tag}.png` });
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 200)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
