// Review-gate harness: re-checks every ledger claim on the live site at desktop and mobile
// width, in light and dark theme. BH_OUT=<dir> node verify-live-review.mjs <base-url>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const OUT = process.env.BH_OUT || '/opt/benchmarkheaven/state/ux-evidence/review-live';
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const r = { base: BASE, checked_at: new Date().toISOString(), errors: [] };
const txt = async (l) => (await l.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
const safe = async (key, fn) => { try { await fn(); } catch (e) { r.errors.push(`${key}: ${String(e).split('\n')[0].slice(0, 220)}`); } };

async function page(kind, theme) {
  const mobile = kind === 'mobile';
  const c = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    hasTouch: mobile, isMobile: mobile, colorScheme: theme,
  });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  p.on('pageerror', (e) => r.errors.push(`${kind}/${theme} pageerror: ${String(e).slice(0, 200)}`));
  return { c, p };
}
const setTheme = (p, t) => p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), t);
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

for (const kind of ['desktop', 'mobile']) {
  for (const theme of ['light', 'dark']) {
    const k = `${kind}_${theme}`; const o = (r[k] = {});
    const { c, p } = await page(kind, theme);
    await safe(`${k}/home`, async () => {
      await p.goto(BASE, { waitUntil: 'networkidle' }); await setTheme(p, theme); await p.waitForTimeout(700);
      o.theme_attr = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
      o.hero = await txt(p.locator('h1').first());
      o.hero_sub = await txt(p.locator('h1').first().locator('xpath=following-sibling::*[1]'));
      o.modes = await p.getByRole('tab').allInnerTexts();
      o.simple_selected = await p.getByRole('tab', { name: 'Simple' }).getAttribute('aria-selected');
      o.simple_headers = (await p.locator('table.dtable thead th').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
      o.simple_rows = await p.locator('table.dtable tbody tr').count();
      o.simple_score_slider = await p.getByLabel(/^Minimum /).first().inputValue().catch(() => null);
      o.simple_summary = await txt(p.locator('text=/recommended models meet your limits/').first());
      o.overflow_home = await overflow(p);
      o.chutes_fallback_text = (await p.locator('body').innerText()).includes('Chutes global fallback');
      await p.screenshot({ path: `${OUT}/${k}-simple.png` });
      await p.screenshot({ path: `${OUT}/${k}-simple-full.png`, fullPage: true });
    });
    await safe(`${k}/advanced`, async () => {
      await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(800);
      const th = p.locator('th', { hasText: 'Score' }).first();
      o.adv_headers = (await p.locator('table.dtable thead th').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
      o.adv_score_aria_sort = await th.getAttribute('aria-sort');
      const idx = o.adv_headers.findIndex((h) => /^SCORE/i.test(h));
      const nums = (await p.locator(`table.dtable tbody tr td:nth-child(${idx + 1})`).allInnerTexts()).map(parseFloat).filter(Number.isFinite).slice(0, 10);
      o.adv_first_scores = nums; o.adv_desc = nums.every((v, i) => !i || nums[i - 1] >= v);
      o.adv_has_channels_col = o.adv_headers.some((h) => /channel/i.test(h));
      o.adv_rows = await p.locator('table.dtable tbody tr').count();
      o.adv_badges = await p.locator('table.dtable .bh-alert').count();
      o.overflow_adv = await overflow(p);
      await p.screenshot({ path: `${OUT}/${k}-advanced.png` });
      // (i) behaviour
      const info = p.getByRole('button', { name: 'About the Adjusted Cost column' }).first();
      if (kind === 'desktop') {
        await info.hover(); await p.waitForTimeout(300);
        o.info_tooltip = await p.getByRole('tooltip').count(); o.info_dialog = await p.locator('dialog[open], [role=dialog]').count();
      } else {
        await info.click(); await p.waitForTimeout(300);
        o.info_dialog = await p.locator('dialog[open], [role=dialog]').count();
        await p.screenshot({ path: `${OUT}/${k}-infotip.png` });
        await p.getByRole('button', { name: /close/i }).first().click().catch(() => {}); await p.waitForTimeout(300);
        o.info_dialog_after_close = await p.locator('dialog[open], [role=dialog]').count();
      }
      const scoreInfo = p.getByRole('button', { name: /About the Score/ }).first();
      o.score_info_present = await scoreInfo.count();
      if (kind === 'desktop' && o.score_info_present) { await scoreInfo.hover(); await p.waitForTimeout(300); o.score_tip_text = (await txt(p.getByRole('tooltip').first())).slice(0, 700); }
      // filters
      const sum = p.locator('summary', { hasText: /Filters/ }).first();
      if (await sum.count()) { await sum.click(); await p.waitForTimeout(400); }
      const body = await p.locator('body').innerText();
      o.f = Object.fromEntries(['Regional settings', 'EU-hosted only', 'Strong confidential guarantees', 'Trains or keeps your data', 'More settings', 'Exclude Chinese providers', 'One variant', 'Hide deprecated', 'company', 'EU-hosted / approved', 'TEE / confidential only'].map((s) => [s, body.includes(s)]));
      o.blend_options = await p.locator('select[aria-label="Fixed I/O blend"] option').allInnerTexts().catch(() => []);
      o.blend_value = await p.locator('select[aria-label="Fixed I/O blend"]').inputValue().catch(() => null);
      o.excl_cn_pressed = await p.getByRole('button', { name: 'Exclude Chinese providers' }).first().getAttribute('aria-pressed').catch(() => null);
      o.trains_pressed = await p.getByRole('button', { name: /Trains or keeps your data/ }).first().getAttribute('aria-pressed').catch(() => null);
      o.overflow_filters = await overflow(p);
      await p.screenshot({ path: `${OUT}/${k}-filters.png`, fullPage: kind === 'mobile' });
    });
    await safe(`${k}/guided`, async () => {
      await p.goto(BASE, { waitUntil: 'networkidle' }); await setTheme(p, theme); await p.waitForTimeout(400);
      await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(400);
      o.wizard_step1 = await txt(p.getByRole('heading', { level: 2 }).first());
      await p.screenshot({ path: `${OUT}/${k}-wizard-1.png` });
    });
    for (const [name, path] of [['about', '/about'], ['benchmaxxing', '/benchmaxxing'], ['compare', '/compare'], ['charts', '/charts']]) {
      await safe(`${k}/${name}`, async () => {
        const res = await p.goto(BASE + path, { waitUntil: 'networkidle' }); await setTheme(p, theme); await p.waitForTimeout(700);
        o[`${name}_status`] = res?.status();
        o[`${name}_overflow`] = await overflow(p);
        const b = await p.locator('body').innerText();
        if (name === 'about') o.about_anchors = await p.evaluate(() => ['adjusted-cost', 'score', 'data-policy', 'featured', 'identity'].filter((id) => document.getElementById(id)));
        if (name === 'benchmaxxing') {
          o.bm_method_anchor = await p.evaluate(() => !!document.getElementById('method'));
          o.bm_report = await p.getByRole('region', { name: 'Per-model Benchmaxxing report' }).count();
          o.bm_radar = await p.locator('svg[aria-label^="Many-axis radar"]').count();
          o.bm_radar_axes = await p.locator('svg[aria-label^="Many-axis radar"] line').count();
          o.bm_signal_badges = await p.locator('.bh-alert').count();
          o.bm_text_head = b.slice(0, 1200);
        }
        if (name === 'about') o.about_eci = /ECI/.test(b);
        await p.screenshot({ path: `${OUT}/${k}-${name}.png` });
        if (name === 'benchmaxxing' && kind === 'desktop' && theme === 'light') await p.screenshot({ path: `${OUT}/${k}-${name}-full.png`, fullPage: true });
      });
    }
    await c.close();
  }
}
await browser.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(r, null, 2));
console.log(JSON.stringify(r, null, 2));
