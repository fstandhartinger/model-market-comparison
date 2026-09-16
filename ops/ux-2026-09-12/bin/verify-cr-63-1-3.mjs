// CR-63.1 (Benchmaxxing second in nav + Overview teaser), CR-63.2 (/eu table filled for a fresh visitor),
// CR-63.3 (header More menus close on outside click / Escape / route change), CR-63.9 (distinct titles).
// Usage: BH_RUNNER=<engine> node verify-cr-63-1-3.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-63-1-3';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

const titles = {};
for (const p of ['/', '/benchmarks', '/compare', '/charts', '/eu', '/about', '/benchmaxxing', '/scatter', '/providers', '/radar', '/models/claude-opus-5']) {
  const html = await (await fetch(`${BASE}${p}`, { headers: { 'User-Agent': 'Twitterbot/1.0' } })).text(); const head = html.slice(0, html.indexOf('</head>')); titles[p] = head.match(/<title>([^<]*)<\/title>/)?.[1] ?? null;
}
check('CR-63.9: every listed page has its own <title>', new Set(Object.values(titles)).size === Object.keys(titles).length && /benchmarks &amp; cost \| Benchmark Heaven$/.test(titles['/models/claude-opus-5'] || ''), titles);

const browser = await chromium.launch();
const settle = (page) => page.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {});
try {
  for (const scheme of ['light', 'dark']) {
    // Desktop.
    let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
    await ctx.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, scheme);
    let page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await settle(page);
    const order = await page.locator('nav[aria-label="Primary"] > a').allTextContents();
    check(`CR-63.1 desktop ${scheme}: primary nav order`, JSON.stringify(order) === JSON.stringify(['Overview', 'Benchmaxxing', 'Benchmarks', 'Compare', 'Charts']), order);
    const teaser = page.locator('[data-bh-benchmaxxing-teaser]');
    const teaserInfo = { count: await teaser.count(), text: (await teaser.first().textContent().catch(() => '')) || '' };
    const beforeSubs = await page.evaluate(() => { const t = document.querySelector('[data-bh-benchmaxxing-teaser]'); const s = document.querySelector('details[aria-label="Subscriptions"]'); return !!(t && s && t.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING); });
    check(`CR-63.1 desktop ${scheme}: Benchmaxxing teaser under the table, above subscriptions`, teaserInfo.count === 1 && /Benchmaxxing check\./.test(teaserInfo.text) && beforeSubs, { ...teaserInfo, beforeSubs });
    await teaser.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${OUT}/teaser-1440-${scheme}.png` });
    const more = page.locator('nav[aria-label="Primary"] details');
    await more.locator('summary').click(); await page.waitForTimeout(300); const opened = await more.evaluate((d) => d.open);
    await page.mouse.click(700, 600); await page.waitForTimeout(300); const afterOutside = await more.evaluate((d) => d.open);
    await more.locator('summary').click(); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const afterEscape = await more.evaluate((d) => d.open); const focusOnSummary = await page.evaluate(() => document.activeElement?.tagName === 'SUMMARY');
    await more.locator('summary').click(); await page.waitForTimeout(300); await more.getByRole('link', { name: 'About' }).click(); await page.waitForURL('**/about'); await page.waitForTimeout(500);
    const afterRoute = await page.locator('nav[aria-label="Primary"] details').evaluate((d) => d.open);
    check(`CR-63.3 desktop ${scheme}: More closes on outside click, Escape (focus to summary) and route change`, opened && !afterOutside && !afterEscape && focusOnSummary && !afterRoute, { opened, afterOutside, afterEscape, focusOnSummary, afterRoute });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await settle(page);
    await page.locator('[data-bh-benchmaxxing-teaser] a').click(); await page.waitForURL('**/benchmaxxing', { timeout: 30000 }).catch(() => {});
    check(`CR-63.1 desktop ${scheme}: teaser link opens /benchmaxxing`, new URL(page.url()).pathname === '/benchmaxxing', page.url());
    await ctx.close();

    // Fresh visitor on /eu.
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
      await ctx.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, scheme);
      page = await ctx.newPage();
      await page.goto(`${BASE}/eu`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await settle(page); await page.waitForTimeout(1500);
      const rows = await page.locator('main table tbody tr').count();
      const priced = await page.locator('main table tbody tr').filter({ hasText: '$' }).count();
      const empty = await page.getByText('No SOTA model family matches').count();
      check(`CR-63.2 /eu ${w}px ${scheme}: fresh visitor sees rows with EU prices`, rows >= 5 && priced >= 3 && empty === 0, { rows, priced, empty });
      await page.locator('main table').first().scrollIntoViewIfNeeded(); await page.screenshot({ path: `${OUT}/eu-${w}-${scheme}.png` });
      await ctx.close();
    }

    // Phone header.
    for (const w of [320, 360, 390, 640, 1024]) {
      ctx = await browser.newContext({ viewport: { width: w, height: 844 }, colorScheme: scheme, hasTouch: true, isMobile: true });
      await ctx.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, scheme);
      page = await ctx.newPage();
      await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForTimeout(800);
      const info = await page.evaluate(() => {
        const header = document.querySelector('header'); const link = [...header.querySelectorAll('a')].find((a) => a.textContent === 'Benchmaxxing' && a.getBoundingClientRect().width > 0 && !a.closest('details'));
        const r = link?.getBoundingClientRect(); const visible = !!(r && r.width > 0);
        const buttons = [...header.querySelectorAll('a, button, summary')].filter((el) => el.getBoundingClientRect().width > 0);
        const overflowing = buttons.filter((el) => { const b = el.getBoundingClientRect(); return b.right > window.innerWidth + 0.5 || b.left < -0.5; }).map((el) => el.textContent);
        const truncated = visible && link.scrollWidth > link.clientWidth + 1;
        const small = buttons.filter((el) => el.getBoundingClientRect().height < 40).map((el) => el.textContent?.trim() || el.getAttribute('aria-label'));
        return { visible, overflowing, truncated, docOverflow: document.documentElement.scrollWidth > window.innerWidth, layoutWidth: window.innerWidth, small };
      });
      const wantVisible = w >= 640;
      check(`CR-63.1 header ${w}px ${scheme}: Benchmaxxing ${wantVisible ? 'shown' : 'in More only'}, no overflow or truncation`, info.visible === wantVisible && !info.overflowing.length && !info.truncated && !info.docOverflow && info.layoutWidth === w, info);
      await page.screenshot({ path: `${OUT}/header-${w}-${scheme}.png`, clip: { x: 0, y: 0, width: w, height: 70 } });
      if (w === 390) {
        await page.locator('header .relative.xl\\:hidden details summary').click(); await page.waitForTimeout(400);
        const items = (await page.locator('header .relative.xl\\:hidden details a').allTextContents()).map((t) => t.trim());
        check(`CR-63.1 phone ${scheme}: More menu order starts Overview · Benchmaxxing · Compare · Charts`, JSON.stringify(items.slice(0, 4)) === JSON.stringify(['Overview', 'Benchmaxxing', 'Compare', 'Charts']), items);
        await page.screenshot({ path: `${OUT}/phone-more-${scheme}.png` });
        await page.touchscreen.tap(195, 600); await page.waitForTimeout(300);
        const closed = !(await page.locator('header .relative.xl\\:hidden details').evaluate((d) => d.open));
        check(`CR-63.3 phone ${scheme}: More closes on a tap outside`, closed, { closed });
      }
      await ctx.close();
    }
  }
} finally { await browser.close(); }
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || null, at: new Date().toISOString(), revision: meta.revision ?? null, passed, total: checks.length, checks }, null, 2));
for (const c of checks.filter((x) => !x.ok)) console.log('FAIL', c.name, c.detail);
console.log(`${passed}/${checks.length} checks passed → ${OUT}/verification.json`);
process.exit(passed === checks.length ? 0 : 1);
