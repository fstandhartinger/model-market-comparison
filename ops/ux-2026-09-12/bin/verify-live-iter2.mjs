import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const OUT = process.env.BH_OUT || '/opt/benchmarkheaven/state/ux-evidence/iter2-live';
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const browser = await chromium.launch();
const r = { base: BASE };

// ---------- desktop ----------
{
  const c = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await c.newPage();
  p.on('pageerror', e => (r.page_errors = [...(r.page_errors||[]), String(e).slice(0,200)]));
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);

  // R5.1 three modes; Simple is the start view
  r.modes = await p.getByRole('tab').allInnerTexts();
  r.r5_1_simple_selected = await p.getByRole('tab', { name: 'Simple' }).getAttribute('aria-selected');

  // R5.3 / R5.4 sliders
  const score = p.getByLabel(/^Minimum /);
  const cost = p.getByLabel('Maximum cost per task');
  r.r5_3_score_slider = await score.count();
  r.r5_3_score_value = await score.inputValue();
  r.r5_3_type = await score.getAttribute('type');
  r.r5_4_cost_slider = await cost.count();
  r.r5_4_cost_label = (await p.locator('text=Maximum cost per task').first().locator('..').innerText()).replace(/\s+/g,' ').slice(0,60);
  // R5.5 histograms present, and they react
  const bars = p.locator('.card').first();
  r.r5_5_bar_count_before = await p.locator('div.flex.h-12 > div').count();
  const rowsBefore = await p.locator('table.dtable tbody tr').count();
  await score.fill('70');
  await p.waitForTimeout(500);
  const rowsAfter = await p.locator('table.dtable tbody tr').count();
  r.r5_3_rows_before_after = [rowsBefore, rowsAfter];
  r.r5_3_slider_changes_table = rowsAfter !== rowsBefore;
  r.r5_5_summary = (await p.locator('text=/recommended models meet your limits/').first().innerText()).replace(/\s+/g,' ');
  await p.screenshot({ path: `${OUT}/desktop-simple-sliders.png` });

  // R7 logo in the nav, theme-aware
  r.r7_1_brandmark = await p.locator('a.bh-brand-link svg').count();
  r.r7_1_mark_shapes = await p.locator('a.bh-brand-link svg rect, a.bh-brand-link svg circle, a.bh-brand-link svg path').count();
  r.r7_default_theme = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const brandVars = async () => p.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return ['--brand-from', '--brand-to', '--brand-ray', '--brand-stair'].map((v) => cs.getPropertyValue(v).trim()).join(' ');
  });
  await p.evaluate(() => document.documentElement.setAttribute('data-theme','dark'));
  await p.waitForTimeout(150);
  r.r7_3_brand_dark = await brandVars();
  await p.locator('a.bh-brand-link').first().screenshot({ path: `${OUT}/logo-dark.png` });
  await p.evaluate(() => document.documentElement.setAttribute('data-theme','light'));
  await p.waitForTimeout(150);
  r.r7_3_brand_light = await brandVars();
  await p.locator('a.bh-brand-link').first().screenshot({ path: `${OUT}/logo-light.png` });
  r.r7_3_switches = r.r7_3_brand_dark !== r.r7_3_brand_light;
  await p.evaluate(() => document.documentElement.setAttribute('data-theme','dark'));

  // R7.2: favicon and touch icon are served and are the new mark
  for (const [k, path] of [['icon', '/icon.svg'], ['apple', '/apple-icon.png'], ['pwa192', '/brand/icon-192.png'], ['og', '/brand/og-image.png']]) {
    const res = await p.request.get(BASE + path);
    r[`r7_2_${k}`] = `${res.status()} ${(await res.body()).length}b`;
  }
  r.r7_2_icon_is_new_mark = (await (await p.request.get(BASE + '/icon.svg')).text()).includes('bhCloud');

  // R5.6 the wizard, walked
  await p.getByRole('tab', { name: 'Guided' }).click();
  await p.waitForTimeout(400);
  r.r5_6_step1 = (await p.getByRole('heading', { level: 2 }).first().innerText()).trim();
  await p.screenshot({ path: `${OUT}/desktop-wizard-step1.png` });
  await p.getByRole('button', { name: /Yes, for a company/ }).click();
  await p.getByRole('button', { name: 'Continue →' }).click(); await p.waitForTimeout(250);
  r.r5_6_step2 = (await p.getByRole('heading', { level: 2 }).first().innerText()).trim();
  await p.getByRole('button', { name: 'Continue →' }).click(); await p.waitForTimeout(250);
  await p.getByRole('button', { name: '3 mo' }).first().click(); await p.waitForTimeout(200);
  r.r5_6_step3_frontier = (await p.locator('text=/best model available 3 months ago/').first().innerText()).replace(/\s+/g,' ');
  await p.screenshot({ path: `${OUT}/desktop-wizard-step3.png` });
  await p.getByRole('button', { name: 'Continue →' }).click(); await p.waitForTimeout(250);
  r.r5_6_step4 = (await p.getByRole('heading', { level: 2 }).first().innerText()).trim();
  await p.getByRole('button', { name: 'See the models →' }).click(); await p.waitForTimeout(700);
  r.r5_6_result_chips = (await p.locator('.card').first().innerText()).replace(/\s+/g,' ').slice(0,300);
  r.r5_6_result_rows = await p.locator('table.dtable tbody tr').count();
  await p.screenshot({ path: `${OUT}/desktop-wizard-results.png` });

  // R4.4 featured audit page
  await p.goto(`${BASE}/about`, { waitUntil: 'networkidle' });
  const featuredList = p.locator('#featured ~ ol li');
  r.r4_4_about_entries = await featuredList.count();
  r.r4_4_about_text = (await p.locator('#featured + p').innerText()).replace(/\s+/g,' ').slice(0,320);
  r.r4_4_about_entries_text = (await featuredList.allInnerTexts()).map((t) => t.replace(/\s+/g,' ').trim());
  r.r4_4_deepseek_listed = (await p.locator('body').innerText()).includes('DeepSeek V4.1 Flash');
  await p.screenshot({ path: `${OUT}/desktop-about-featured.png` });
  await c.close();
}

// ---------- mobile ----------
{
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await c.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  r.mobile_modes = await p.getByRole('tab').allInnerTexts();
  r.mobile_score_slider = await p.getByLabel(/^Minimum /).count();
  r.mobile_histogram_bars = await p.locator('div.flex.h-12 > div').count();
  await p.screenshot({ path: `${OUT}/mobile-simple-sliders.png` });
  await p.getByRole('tab', { name: 'Guided' }).click();
  await p.waitForTimeout(400);
  r.mobile_wizard_step1 = (await p.getByRole('heading', { level: 2 }).first().innerText()).trim();
  await p.screenshot({ path: `${OUT}/mobile-wizard-step1.png` });
  await c.close();
}

await browser.close();
r.checked_at = new Date().toISOString();
await fs.writeFile(`${OUT}/verification-iter2.json`, JSON.stringify(r, null, 2));
console.log(JSON.stringify(r, null, 2));
