// CR-103/104 live verification: the responsive permanent offer pill at 320 px, both themes,
// plus the opaque fixed toast and its landing motion.
// Usage: node verify-cr-103.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-103';
await fs.mkdir(OUT, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) {
    const tag = `phone320_${theme}`;
    const context = await browser.newContext({ viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true, colorScheme: theme, deviceScaleFactor: 2 });
    await context.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); localStorage.removeItem('bh.jev.customEvaluation.never'); sessionStorage.clear(); } catch {} }, theme);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 60000 });
    const geometry = await page.evaluate(() => {
      const eyebrowText = document.querySelector('.bh-page-head .bh-eyebrow > span');
      const badge = document.querySelector('[data-bh-custom-evaluation-badge]');
      const a = eyebrowText?.getBoundingClientRect(); const b = badge?.getBoundingClientRect();
      const spans = badge ? [...badge.querySelectorAll('span')].map((span) => ({ text: span.textContent?.trim(), display: getComputedStyle(span).display, ariaHidden: span.getAttribute('aria-hidden') })) : [];
      return { text: eyebrowText?.textContent?.trim(), badge: badge instanceof HTMLElement ? badge.innerText.trim() : undefined, accessibleName: badge?.getAttribute('aria-label'), spans, a, b, viewport: window.innerWidth };
    });
    check(`${tag}: short narrow-screen badge is present`, geometry.badge === 'NEED A CUSTOM EVAL?', geometry);
    check(`${tag}: badge exposes one accessible name`, geometry.accessibleName === 'Need custom eval on your data?' && geometry.spans.length === 2 && geometry.spans.every((span) => span.ariaHidden === 'true'), geometry);
    check(`${tag}: badge stays beside the eyebrow and inside 320 px`, geometry.a && geometry.b && geometry.b.left >= geometry.a.right - 1 && geometry.b.right <= geometry.viewport && geometry.b.width > 0, geometry);
    await page.waitForSelector('[data-bh-custom-evaluation-toast][data-phase="open"]', { state: 'visible', timeout: 8000 });
    await page.waitForTimeout(350); // let the intentional 220 ms entrance fade settle before sampling opacity
    const open = await page.$eval('[data-bh-custom-evaluation-toast]', (el) => {
      const s = getComputedStyle(el); const r = el.getBoundingClientRect();
      return { phase: el.getAttribute('data-phase'), position: s.position, background: s.backgroundColor, opacity: Number(s.opacity), r: { left: r.left, right: r.right, bottom: r.bottom } };
    });
    check(`${tag}: toast is opaque and fixed at the bottom`, open.phase === 'open' && open.position === 'fixed' && !/transparent|rgba\([^)]*,\s*0\)/i.test(open.background) && open.opacity > 0.9 && open.r.left >= 0 && open.r.right <= 320 && open.r.bottom <= 800, open);
    await page.screenshot({ path: `${OUT}/${tag}-toast-open.png`, fullPage: false });
    await page.waitForSelector('[data-bh-custom-evaluation-toast][data-phase="landing"]', { state: 'visible', timeout: 9000 });
    const landing = await page.$eval('[data-bh-custom-evaluation-toast]', (el) => {
      const style = getComputedStyle(el); const animation = el.getAnimations()[0]; const originalTime = animation?.currentTime; const timing = animation?.effect?.getComputedTiming();
      animation?.pause(); if (animation && typeof timing?.duration === 'number') animation.currentTime = timing.duration;
      const toastRect = el.getBoundingClientRect(); const badgeRect = document.querySelector('[data-bh-custom-evaluation-badge]')?.getBoundingClientRect();
      const projected = { x: toastRect.left + toastRect.width / 2, y: toastRect.top + toastRect.height / 2 };
      const target = badgeRect ? { x: badgeRect.left + badgeRect.width / 2, y: badgeRect.top + badgeRect.height / 2 } : null;
      if (animation) { animation.currentTime = originalTime; animation.play(); }
      return { phase: el.getAttribute('data-phase'), opacity: Number(style.opacity), animation: style.animationName, projected, target };
    });
    check(`${tag}: toast enters a visible landing phase`, landing.phase === 'landing' && landing.opacity > 0.6 && landing.animation === 'bh-offer-land', landing);
    check(`${tag}: toast flight targets the resized badge`, landing.target && Math.abs(landing.projected.x - landing.target.x) < 1 && Math.abs(landing.projected.y - landing.target.y) < 1, landing);
    await page.screenshot({ path: `${OUT}/${tag}-toast-landing.png`, fullPage: false });
    await page.waitForSelector('[data-bh-custom-evaluation-toast]', { state: 'detached', timeout: 3000 });
    check(`${tag}: the landing leaves the permanent badge`, await page.locator('[data-bh-custom-evaluation-badge].is-wiggling').count() === 1, 'badge wiggle');
    check(`${tag}: no page errors`, errors.length === 0, errors);
    await page.goto(`${BASE}/jev-models/custom-evaluation`, { waitUntil: 'networkidle', timeout: 60000 });
    const detailText = ((await page.locator('body').innerText()) || '').replace(/\s+/g, ' ');
    const detailMail = await page.locator('a[href^="mailto:"]').count();
    check(`${tag}: custom-evaluation detail page carries the open-source offer and deliverables`, /Need custom eval on your data\?/.test(detailText) && /accuracy, calibration, latency and cost/.test(detailText) && /written report/.test(detailText) && /do not publish it/.test(detailText) && /MIT licence/.test(detailText), detailText.slice(0, 500));
    check(`${tag}: detail page has contact and legal links without a turnaround promise`, detailMail === 1 && /Impressum/.test(detailText) && /Privacy/.test(detailText) && /Terms/.test(detailText) && !/turnaround|working days/i.test(detailText), { detailMail, detailText: detailText.slice(-500) });
    check(`${tag}: detail page has no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'scroll width');
    await page.screenshot({ path: `${OUT}/${tag}-custom-page.png`, fullPage: true });
    await context.close();
  }
  for (const theme of ['light', 'dark']) {
    const tag = `phone390_${theme}`;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: theme, deviceScaleFactor: 2 });
    await context.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); sessionStorage.clear(); } catch {} }, theme);
    const page = await context.newPage();
    await page.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 60000 });
    const wider = await page.$eval('[data-bh-custom-evaluation-badge]', (badge) => {
      const row = badge.parentElement?.getBoundingClientRect(); const rect = badge.getBoundingClientRect();
      return { label: badge instanceof HTMLElement ? badge.innerText.trim() : '', accessibleName: badge.getAttribute('aria-label'), rect, row, viewport: innerWidth };
    });
    check(`${tag}: full wider-phone label is present`, wider.label === 'NEED CUSTOM EVAL ON YOUR DATA?' && wider.accessibleName === 'Need custom eval on your data?', wider);
    check(`${tag}: full label stays in the eyebrow row`, wider.row && wider.rect.right <= wider.viewport && wider.rect.top >= wider.row.top && wider.rect.bottom <= wider.row.bottom, wider);
    await page.screenshot({ path: `${OUT}/${tag}-badge.png`, fullPage: false });
    await context.close();
  }
  const reduce = await browser.newContext({ viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', colorScheme: 'dark' });
  const reducedPage = await reduce.newPage();
  await reducedPage.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 60000 });
  await reducedPage.waitForSelector('[data-bh-custom-evaluation-toast][data-phase="open"]', { state: 'visible', timeout: 8000 });
  check('phone320 reduced motion: toast uses the fade path', await reducedPage.$eval('[data-bh-custom-evaluation-toast]', (el) => getComputedStyle(el).animationName) === 'bh-offer-fade', 'animation');
  await reduce.close();
} finally { await browser.close(); }
const failed = checks.filter((x) => !x.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed: checks.length - failed.length, total: checks.length, checks }, null, 2));
console.log(`${BASE}: ${checks.length - failed.length}/${checks.length}`);
for (const f of failed) console.log('FAIL', f.name, f.detail);
process.exit(failed.length ? 1 : 0);
