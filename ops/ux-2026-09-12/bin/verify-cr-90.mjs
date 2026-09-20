// CR-90 live verifier: difficulty scopes and the public-task outcome grid.
// Usage: node verify-cr-90.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/work-20260919-cr90/verify';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
try {
  for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const tag = `${kind}_${theme}`;
    const context = await browser.newContext({ viewport, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme, deviceScaleFactor: kind === 'mobile' ? 2 : 1 });
    await context.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error.message)));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    try {
      await page.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 60000 });
      const difficulty = page.locator('[data-bh-jev12-difficulty]');
      const grid = page.locator('[data-bh-jev12-task-grid]');
      check(`${tag}: difficulty controls render`, await difficulty.count() === 1 && await difficulty.locator('[data-bh-jev12-scope-option]').count() === 3);
      check(`${tag}: default scope is All tasks without warning`, await difficulty.getAttribute('data-bh-jev12-scope') === 'all' && await difficulty.locator('[data-bh-jev12-scope-warning]').count() === 0);
      // Review gate 20260920T043003Z: the hero's decision count must be the artifact's tier aggregate for the
      // scope (534 / 168 / 72), never the public-task slice the grid ships (231 / 120 / 48). The default view
      // had no assertion at all and read "231 decisions per system" while its own table showed 146 + 220 alone.
      const defaultEyebrow = await page.locator('[data-bh-jev12-main-chart] .bh-eyebrow').first().innerText();
      check(`${tag}: default hero counts all 534 decisions per system`, /534 decisions per system/i.test(defaultEyebrow) && !/231 decisions/i.test(defaultEyebrow), defaultEyebrow);
      check(`${tag}: default grid still ships the 231 public outcomes only`, /231 public task outcomes/.test(await grid.locator('summary').innerText()));
      await difficulty.locator('[data-bh-jev12-scope-option="easy-medium"]').click();
      check(`${tag}: Easy + Medium changes scope and warns`, await difficulty.getAttribute('data-bh-jev12-scope') === 'easy-medium' && await difficulty.locator('[data-bh-jev12-scope-warning]').count() === 1);
      check(`${tag}: Easy + Medium grid summary is public-only`, /120 public task outcomes/.test(await grid.locator('summary').innerText()));
      const easyMediumState = await page.evaluate(() => ({
        chart: document.querySelector('[data-bh-jev12-main-chart]')?.getAttribute('data-bh-jevc-chart'),
        badge: document.querySelector('[data-bh-jevc-badge="not-default"]')?.textContent || '',
        eyebrow: document.querySelector('[data-bh-jev12-main-chart] .bh-eyebrow')?.textContent || '',
        subtitle: document.querySelector('[data-bh-jevc-subtitle]')?.textContent || '',
        tableMain: document.querySelector('[data-bh-jev12-sort="main"]')?.textContent || '',
        scope: new URL(window.location.href).searchParams.get('scope'),
      }));
      check(`${tag}: Easy + Medium chart and table are explicitly custom`, easyMediumState.chart === 'custom' && /Easy \+ Medium tasks/.test(easyMediumState.badge) && /168 decisions per system/.test(easyMediumState.eyebrow) && /Easy \+ Medium/.test(easyMediumState.subtitle) && /recomputed for the easy \+ medium decisions/i.test(easyMediumState.subtitle) && /Easy \+ Medium · not the official score/.test(easyMediumState.tableMain) && easyMediumState.scope === 'easy-medium', easyMediumState);
      await difficulty.locator('[data-bh-jev12-scope-option="easy"]').click();
      check(`${tag}: Easy changes scope`, await difficulty.getAttribute('data-bh-jev12-scope') === 'easy' && /48 public task outcomes/.test(await grid.locator('summary').innerText()));
      const easyState = await page.evaluate(() => ({
        chart: document.querySelector('[data-bh-jev12-main-chart]')?.getAttribute('data-bh-jevc-chart'),
        badge: document.querySelector('[data-bh-jevc-badge="not-default"]')?.textContent || '',
        eyebrow: document.querySelector('[data-bh-jev12-main-chart] .bh-eyebrow')?.textContent || '',
        subtitle: document.querySelector('[data-bh-jevc-subtitle]')?.textContent || '',
        tableMain: document.querySelector('[data-bh-jev12-sort="main"]')?.textContent || '',
        scope: new URL(window.location.href).searchParams.get('scope'),
      }));
      check(`${tag}: Easy chart and table are explicitly custom`, easyState.chart === 'custom' && /Easy only tasks/.test(easyState.badge) && /72 decisions per system/.test(easyState.eyebrow) && /Easy only/.test(easyState.subtitle) && /recomputed for the easy only decisions/i.test(easyState.subtitle) && /Easy only · not the official score/.test(easyState.tableMain) && easyState.scope === 'easy', easyState);
      await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
      check(`${tag}: reload restores the scoped URL view`, await page.locator('[data-bh-jev12-difficulty]').getAttribute('data-bh-jev12-scope') === 'easy' && await page.locator('[data-bh-jev12-main-chart]').getAttribute('data-bh-jevc-chart') === 'custom' && new URL(page.url()).searchParams.get('scope') === 'easy');
      await difficulty.locator('[data-bh-jev12-scope-reset]').click();
      const defaultState = await page.evaluate(() => ({
        chart: document.querySelector('[data-bh-jev12-main-chart]')?.getAttribute('data-bh-jevc-chart'),
        tableMain: document.querySelector('[data-bh-jev12-sort="main"]')?.textContent || '',
        scope: new URL(window.location.href).searchParams.get('scope'),
      }));
      check(`${tag}: reset returns official All tasks`, await difficulty.getAttribute('data-bh-jev12-scope') === 'all' && await difficulty.locator('[data-bh-jev12-scope-warning]').count() === 0 && defaultState.chart === 'official' && /JevBench Score/.test(defaultState.tableMain) && !/not the official score/.test(defaultState.tableMain) && defaultState.scope === null, defaultState);
      await grid.locator('summary').click();
      const gridData = await grid.locator('table').evaluate((table) => {
        const heads = [...table.querySelectorAll('thead th')].map((node) => node.textContent?.replace(/\s+/g, ' ').trim());
        const taskRows = table.querySelectorAll('tbody tr[data-bh-jev12-task]').length;
        const first = table.querySelector('tbody tr[data-bh-jev12-task]');
        const groupRows = [...table.querySelectorAll('tbody tr')].filter((row) => !row.hasAttribute('data-bh-jev12-task'));
        const groupCells = groupRows.flatMap((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent?.trim() || ''));
        const taskCellRects = first ? [...first.querySelectorAll('td')].map((cell) => { const rect = cell.getBoundingClientRect(); return { width: rect.width, height: rect.height }; }) : [];
        const rotated = [...table.querySelectorAll('thead th:not(:first-child) span')].every((node) => getComputedStyle(node).writingMode === 'vertical-rl' && getComputedStyle(node).transform !== 'none');
        // Review gate 20260919T233002Z: the v1.2.2 capture covers every scored system, so no column may be unavailable.
        const blank = [...table.querySelectorAll('tbody tr[data-bh-jev12-task] td')].filter((node) => /no public outcome/.test(node.getAttribute('title') || ''));
        const djevIndex = heads.findIndex((head) => head === 'djev');
        const djevCell = djevIndex >= 0 ? first?.children[djevIndex] : null;
        return { heads, taskRows, djevIndex, blank: blank.length, djevText: djevCell?.textContent?.trim(), djevTitle: djevCell?.getAttribute('title'), groupRows: groupRows.length, groupCells, taskCellRects, rotated };
      });
      check(`${tag}: grid exposes all 231 public tasks grouped by tier`, gridData.taskRows === 231, gridData.taskRows);
      check(`${tag}: every scored system has a column, djev included`, gridData.heads.length === 22 && gridData.djevIndex >= 0 && /correct|wrong|failed|not attempted/.test(gridData.djevTitle || ''), gridData);
      check(`${tag}: no column is left unavailable`, gridData.blank === 0, gridData.blank);
      check(`${tag}: dense grid uses compact cells and per-system tier summaries`, gridData.groupRows === 3 && gridData.groupCells.length === 63 && gridData.groupCells.every((cell) => /^\d+\/\d+$/.test(cell)) && gridData.taskCellRects.every((rect) => rect.width <= 34 && rect.height <= 30) && gridData.rotated, gridData);
      check(`${tag}: the unavailable-systems sentence is gone while every system is covered`, await page.locator('[data-bh-jev12-task-uncovered]').count() === 0);
      check(`${tag}: task grid contains no hidden question/answer payload`, !/question|expected|prediction/i.test(await grid.locator('table').innerText()));
      if (kind === 'mobile') check(`${tag}: no page horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 1);
      check(`${tag}: no page or console errors`, errors.length === 0, errors);
      await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: false });
    } finally {
      await page.close();
      await context.close();
    }
  }
} finally {
  await browser.close();
}
const failed = checks.filter((item) => !item.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed: checks.length - failed.length, total: checks.length, checks }, null, 2));
console.log(`${BASE}: ${checks.length - failed.length}/${checks.length} passed`);
for (const item of failed) console.log(`FAIL ${item.name}: ${item.detail}`);
process.exit(failed.length ? 1 : 0);
