import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const OUT = process.env.BH_OUT || '/opt/benchmarkheaven/state/ux-evidence/iter1';
const BASE = process.argv[2] || 'http://127.0.0.1:3210';
const browser = await chromium.launch();
const report = {};

async function ctx(width, height, touch) {
  const c = await browser.newContext({
    viewport: { width, height },
    hasTouch: touch, isMobile: touch,
    // InfoTip branches on (hover:hover) and (pointer:fine); emulate the real device class.
    ...(touch ? {} : {}),
  });
  return c;
}

// ---------- desktop ----------
{
  const c = await ctx(1440, 950, false);
  const p = await c.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.getByRole('tab', { name: 'Advanced' }).click();
  await p.waitForTimeout(600);

  // R1.1 / R1.2: default sort + dynamic score sub-label
  const scoreTh = p.locator('th', { hasText: 'Score' }).first();
  report.r1_1_aria_sort = await scoreTh.getAttribute('aria-sort');
  report.r1_2_sub = (await scoreTh.innerText()).replace(/\s+/g, ' ').trim();
  const scores = await p.locator('table.dtable tbody tr td:nth-child(3)').allInnerTexts();
  const nums = scores.map(s => parseFloat(s)).filter(Number.isFinite).slice(0, 8);
  report.r1_1_first_scores = nums;
  report.r1_1_descending = nums.every((v, i) => i === 0 || nums[i - 1] >= v);

  // R2.2: #benchmarks is a real count, not the 0-5 composite coverage
  const bench = (await p.locator('table.dtable tbody tr td:nth-child(5)').allInnerTexts())
    .map(s => parseInt(s, 10)).filter(Number.isFinite);
  report.r2_2_benchmark_counts = bench.slice(0, 8);
  report.r2_2_above_five = bench.filter(v => v > 5).length;

  // R1.8 desktop: hover shows a tooltip, no dialog
  const info = p.getByRole('button', { name: 'About the Adjusted Cost column' });
  report.r1_4_info_present = await info.count();
  await info.first().hover();
  await p.waitForTimeout(250);
  report.r1_8_desktop_tooltip = await p.getByRole('tooltip').count();
  report.r1_8_desktop_tooltip_text = (await p.getByRole('tooltip').first().innerText().catch(() => '')).slice(0, 90);
  report.r1_8_desktop_dialog = await p.locator('dialog[open]').count();
  await p.screenshot({ path: `${OUT}/desktop-overview-tooltip.png`, fullPage: false });

  // R4: the grouped filter bar
  await p.locator('summary', { hasText: 'Filters & settings' }).first().click();
  await p.waitForTimeout(400);
  report.r4_sections = await p.locator('details[open] >> text=Regional settings').count();
  report.r4_2_blends = await p.locator('select[aria-label="Fixed I/O blend"] option').allInnerTexts();
  report.r4_2_default_blend = await p.locator('select[aria-label="Fixed I/O blend"]').inputValue();
  report.r4_6_exclude_chinese_pressed = await p.getByRole('button', { name: 'Exclude Chinese providers' }).getAttribute('aria-pressed');
  report.r4_9_tee_label = await p.getByRole('button', { name: /Strong confidential guarantees/ }).count();
  report.r4_10_toggle_pressed = await p.getByRole('button', { name: /Trains or keeps your data/ }).getAttribute('aria-pressed');
  await p.screenshot({ path: `${OUT}/desktop-filters.png`, fullPage: false });

  // R4.10 behaviour: turning the filter ON must change the cheapest routes
  const before = await p.locator('table.dtable tbody tr td:nth-child(4)').allInnerTexts();
  await p.getByRole('button', { name: /Trains or keeps your data/ }).click();
  await p.waitForTimeout(700);
  const after = await p.locator('table.dtable tbody tr td:nth-child(4)').allInnerTexts();
  report.r4_10_costs_changed = JSON.stringify(before.slice(0, 12)) !== JSON.stringify(after.slice(0, 12));
  report.r4_10_before = before.slice(0, 4);
  report.r4_10_after = after.slice(0, 4);
  await c.close();
}

// ---------- mobile ----------
{
  const c = await ctx(390, 844, true);
  const p = await c.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  report.r5_1_simple_selected = await p.getByRole('tab', { name: 'Simple' }).getAttribute('aria-selected');
  const rows = await p.locator('table.dtable tbody tr').count();
  report.r5_2_row_count = rows;
  const costs = (await p.locator('table.dtable tbody tr td:nth-child(4)').allInnerTexts())
    .map(s => parseFloat(String(s).replace(/[^0-9.]/g, ''))).filter(Number.isFinite);
  report.r5_2_costs = costs.slice(0, 6);
  report.r5_2_descending = costs.every((v, i) => i === 0 || costs[i - 1] >= v);

  // R1.8 mobile: the (i) opens a real modal with an ✕
  const info = p.getByRole('button', { name: 'About the Adjusted Cost column' }).first();
  await info.scrollIntoViewIfNeeded();
  await info.click({ force: true });
  await p.locator('dialog[open]').waitFor({ state: 'attached', timeout: 8000 }).catch(async () => {
    await p.screenshot({ path: `${OUT}/mobile-infotip-FAILED.png` });
  });
  await p.waitForTimeout(350);
  report.r1_8_mobile_dialog = await p.locator('dialog[open]').count();
  report.r1_8_mobile_close = await p.locator('dialog[open] button[aria-label="Close"]').count();
  report.r1_8_mobile_text = (await p.locator('dialog[open]').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 110);
  await p.screenshot({ path: `${OUT}/mobile-infotip-modal.png` });
  await p.locator('dialog[open] button[aria-label="Close"]').click({ timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(250);
  report.r1_8_mobile_closed = await p.locator('dialog[open]').count();
  await p.screenshot({ path: `${OUT}/mobile-overview.png`, fullPage: false });
  await c.close();
}

await browser.close();
const fs = await import('node:fs/promises');
report.checked_at = new Date().toISOString();
report.base = BASE;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
