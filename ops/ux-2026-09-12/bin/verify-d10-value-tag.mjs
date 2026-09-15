// Florian directive 10 (2026-09-15, 10-FLORIAN-DIRECTIVE-MOBILE-TABLE-TAGS): Simple overview cost tag is compact
// ("↓11×") below 1024 px — 320/375/390 portrait, 844 landscape, 768 tablet — without overlap or clipping; 1024 and
// 1440 desktop keep "↓ 11× cheaper" (at 768 the full words covered the score, so tablets get the compact tag too);
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

// Transient network flips on this host (ERR_NETWORK_CHANGED) retry, as the other harnesses do.
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const browser = await chromium.launch();
const sizes = [['phone320', 320, 844, true], ['phone375', 375, 844, true], ['phone390', 390, 844, true], ['phoneLandscape844', 844, 390, true], ['tablet768', 768, 1024, true], ['desktop1024', 1024, 768, false], ['desktop1440', 1440, 1000, false]];
for (const theme of ['light', 'dark']) for (const [name, width, height, touch] of sizes) {
  // Compact below 1024 px, where the full words were measured to overflow the cell (768 covered the score).
  const tag = `${name}_${theme}`, compact = width < 1024;
  const context = await browser.newContext({ viewport: { width, height }, isMobile: touch && width < 1024, hasTouch: touch, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(async () => { await page.waitForTimeout(3000); await page.reload(); }); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const tags = [...document.querySelectorAll('tr.bh-ranking-row .bh-value-tag')].filter((el) => el.offsetParent);
    return tags.slice(0, 12).map((el) => {
      const r = el.getBoundingClientRect();
      const cell = el.closest('td'), row = el.closest('tr'); const cr = cell.getBoundingClientRect();
      // What a sighted user reads: the tag without its screen-reader text or CSS-hidden spans.
      const shown = [...el.childNodes].filter((n) => n.nodeType === 3 || (n.classList && !n.classList.contains('sr-only') && getComputedStyle(n).display !== 'none')).map((n) => n.textContent).join('');
      const price = cell.querySelector('.bh-cost-line > :not(.bh-value-tag)');
      const pr = price?.getBoundingClientRect();
      const hit = (a, b) => !(a.right <= b.left + 0.5 || a.left >= b.right - 0.5 || a.bottom <= b.top + 0.5 || a.top >= b.bottom - 0.5);
      // Content of the other cells in the row (text leaves and bars), never the cells' empty padding.
      const others = [...row.children].filter((td) => td !== cell).flatMap((td) => [...td.querySelectorAll('*')].filter((x) => !x.children.length && x.getBoundingClientRect().width > 0));
      return {
        visible: shown.replace(/\s+/g, ' ').trim(), title: el.getAttribute('title') || '', sr: el.querySelector('.sr-only')?.textContent || '',
        inCell: r.left >= cr.left - 0.5 && r.right <= cr.right + 0.5,
        overlapsPrice: pr ? hit(r, pr) : null,
        overlapsOtherCell: others.some((x) => hit(r, x.getBoundingClientRect())),
        priceClipped: price ? price.scrollWidth > price.clientWidth + 1 || pr.right > cr.right + 0.5 : null,
      };
    });
  });
  check(`${tag} Simple table shows value tags`, info.length > 0, info.length);
  const visibleOk = info.every((t) => compact ? /^[↓↑]\d+(\.\d)?×$/.test(t.visible) : /^[↓↑]\d+(\.\d)?× (cheaper|pricier)$/.test(t.visible));
  check(`${tag} ${compact ? 'compact "↓11×" (no words, no space)' : 'full "↓ 11× cheaper" text unchanged'}`, visibleOk, info.map((t) => t.visible));
  check(`${tag} words kept in tooltip and accessible text`, info.every((t) => /× (cheaper|pricier)\./.test(t.title) && /× (cheaper|pricier):/.test(t.sr)), info.slice(0, 2).map((t) => [t.title.slice(0, 60), t.sr.slice(0, 60)]));
  check(`${tag} tag inside its cell, overlapping neither the price nor another cell's content, price not clipped`, info.every((t) => t.inCell && t.overlapsPrice !== true && !t.overlapsOtherCell && t.priceClipped !== true), info.map((t) => [t.inCell, t.overlapsPrice, t.overlapsOtherCell, t.priceClipped]));
  // Phones and tablets: the whole page must not scroll sideways. From 1024 px the header is known to overflow by itself
  // (logged separately, 2026-09-15, not caused by this tag), so there the check is scoped to the ranking table.
  const overflow = await page.evaluate((wide) => wide
    ? [...document.querySelectorAll('tr.bh-ranking-row')].some((r) => r.getBoundingClientRect().right > innerWidth + 1)
    : document.documentElement.scrollWidth > innerWidth + 1, width >= 1024);
  check(`${tag} no horizontal ${width >= 1024 ? 'table' : 'page'} overflow, no page errors`, !errors.length && !overflow, errors);
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
