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
      check(`${tag}: difficulty controls render`, await difficulty.count() === 1 && await difficulty.locator('[data-bh-jev12-scope-option]').count() === 4);
      check(`${tag}: default scope is All tasks without warning`, await difficulty.getAttribute('data-bh-jev12-scope') === 'all' && await difficulty.locator('[data-bh-jev12-scope-warning]').count() === 0);
      // Review gate 20260920T043003Z: the hero's decision count must be the artifact's tier aggregate for the
      // scope (534 / 168 / 72), never the public-task slice the grid ships (231 / 120 / 48). The default view
      // had no assertion at all and read "231 decisions per system" while its own table showed 146 + 220 alone.
      const defaultEyebrow = await page.locator('[data-bh-jev12-main-chart] .bh-eyebrow').first().innerText();
      check(`${tag}: default hero counts all 534 decisions per system`, /534 decisions per system/i.test(defaultEyebrow) && !/231 decisions/i.test(defaultEyebrow), defaultEyebrow);
      check(`${tag}: default grid still ships the 231 public outcomes only`, /231 public task outcomes/.test(await grid.locator('summary').innerText()));
      // Review gate 20260920T043003Z, open item (a): the tier columns and the "How the score works" list must state
      // the weights the shown score actually uses. On the default view that is still the official 14/28/28/30 %.
      const weightState = () => page.evaluate(() => ({
        tiers: ['easy', 'standard', 'judge', 'hard'].map((t) => document.querySelector(`[data-bh-jev12-sort="${t}"]`)?.textContent?.replace(/\s+/g, ' ').trim() || ''),
        intel: document.querySelector('[data-bh-jev12-intel-weights]')?.textContent?.replace(/\s+/g, ' ').trim() || '',
        intelScope: document.querySelector('[data-bh-jev12-intel-weights]')?.getAttribute('data-bh-jev12-intel-weights'),
      }));
      const defaultWeights = await weightState();
      check(`${tag}: default tier columns carry the official weights`, defaultWeights.tiers[0].includes('72 dec. · 14 %') && defaultWeights.tiers[1].includes('96 dec. · 28 %') && defaultWeights.tiers[2].includes('146 dec. · 28 %') && defaultWeights.tiers[3].includes('220 dec. · 30 %') && !defaultWeights.tiers.some((t) => /outside this scope/.test(t)), defaultWeights.tiers);
      check(`${tag}: default method list carries the official weights`, defaultWeights.intelScope === 'all' && /hard 30 %, easy 14 %, standard 28 %, judge 28 %/.test(defaultWeights.intel) && /220 \/ 72 \/ 96 \/ 146 decisions/.test(defaultWeights.intel) && !/outside this scope/.test(defaultWeights.intel), defaultWeights.intel);
      // CR-99: the hard-only scope is a four-axis recomputation over all 220 hard decisions.
      await difficulty.locator('[data-bh-jev12-scope-option="hard"]').click();
      const hardState = await page.evaluate(() => ({
        scope: document.querySelector('[data-bh-jev12-difficulty]')?.getAttribute('data-bh-jev12-scope'),
        chart: document.querySelector('[data-bh-jev12-main-chart]')?.getAttribute('data-bh-jevc-chart'),
        badge: document.querySelector('[data-bh-jevc-badge="not-default"]')?.textContent || '',
        eyebrow: document.querySelector('[data-bh-jev12-main-chart] .bh-eyebrow')?.textContent || '',
        summary: document.querySelector('[data-bh-jev12-task-grid] summary')?.textContent || '',
        unranked: [...document.querySelectorAll('[data-bh-jev12-row]')].filter((row) => row.getAttribute('data-bh-jev12-ranked') !== '1').map((row) => row.getAttribute('data-bh-jev12-row')),
      }));
      check(`${tag}: Hard only recomputes all four axes on 220 decisions`, hardState.scope === 'hard' && hardState.chart === 'custom' && /Hard only/.test(hardState.badge) && /220 decisions per system/.test(hardState.eyebrow) && /111 public task outcomes/.test(hardState.summary), hardState);
      check(`${tag}: Hard only keeps missing hard runs unranked`, hardState.unranked.every(Boolean), hardState.unranked);
      await difficulty.locator('[data-bh-jev12-scope-reset]').click();
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
      const emWeights = await weightState();
      check(`${tag}: Easy + Medium re-normalises the tier columns and names the excluded tiers`, emWeights.tiers[0].includes('72 dec. · 33 %') && emWeights.tiers[1].includes('96 dec. · 67 %') && /146 dec. · outside this scope/.test(emWeights.tiers[2]) && /220 dec. · outside this scope/.test(emWeights.tiers[3]) && !/28 %|30 %|14 %/.test(emWeights.tiers.join(' ')), emWeights.tiers);
      check(`${tag}: Easy + Medium method list re-normalises too`, emWeights.intelScope === 'easy-medium' && /for the Easy \+ Medium scope/.test(emWeights.intel) && /easy 33 %, standard 67 %/.test(emWeights.intel) && /72 \/ 96 decisions/.test(emWeights.intel) && /Hard and Judge are outside this scope/.test(emWeights.intel) && !/hard 30 %|judge 28 %/.test(emWeights.intel), emWeights.intel);
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
      const easyWeights = await weightState();
      check(`${tag}: Easy scope gives the easy tier the whole weight`, easyWeights.tiers[0].includes('72 dec. · 100 %') && easyWeights.tiers.slice(1).every((t) => /outside this scope/.test(t)), easyWeights.tiers);
      check(`${tag}: Easy method list states one scored tier`, easyWeights.intelScope === 'easy' && /for the Easy only scope/.test(easyWeights.intel) && /easy 100 %/.test(easyWeights.intel) && /Hard, Standard and Judge are outside this scope/.test(easyWeights.intel), easyWeights.intel);
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
        const groupHeads = groupRows.map((row) => row.querySelector('th span.hidden')?.textContent?.replace(/\s+/g, ' ').trim() || row.querySelector('th')?.textContent?.replace(/\s+/g, ' ').trim() || '');
        // Review gate 20260920T043003Z (c): a group row must not mix bases — its cells count the public rows it lists.
        const groupBasesAgree = groupRows.every((row) => {
          const declared = Number(row.querySelector('th')?.textContent?.match(/(\d+) of \d+ decisions public/)?.[1]);
          return Number.isFinite(declared) && [...row.querySelectorAll('td')].every((cell) => {
            const denominator = Number(cell.textContent?.split('/')[1]);
            return Number.isFinite(denominator) && denominator <= declared;
          });
        });
        // Review gate 20260920T043003Z (b): the question type is visible text on every row, not a native title only.
        const taskHeads = [...table.querySelectorAll('tbody tr[data-bh-jev12-task] th')];
        const typedRows = taskHeads.filter((head) => head.querySelector('[data-bh-jev12-task-type]')?.textContent?.trim()).length;
        const typeCodes = [...new Set(taskHeads.map((head) => head.querySelector('[data-bh-jev12-task-type]')?.textContent?.trim()))].sort();
        const titleHasTopicAndType = taskHeads.filter((head) => /·\s+(choice|noul|score)\s+—/.test(head.getAttribute('title') || '')).length;
        const legend = document.querySelector('[data-bh-jev12-task-legend]')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const taskCellRects = first ? [...first.querySelectorAll('td')].map((cell) => { const rect = cell.getBoundingClientRect(); return { width: rect.width, height: rect.height }; }) : [];
        const rotated = [...table.querySelectorAll('thead th:not(:first-child) span')].every((node) => getComputedStyle(node).writingMode === 'vertical-rl' && getComputedStyle(node).transform !== 'none');
        // Review gate 20260919T233002Z: the v1.2.2 capture covers every scored system, so no column may be unavailable.
        const blank = [...table.querySelectorAll('tbody tr[data-bh-jev12-task] td')].filter((node) => /no public outcome/.test(node.getAttribute('title') || ''));
        const djevIndex = heads.findIndex((head) => head === 'djev');
        const djevCell = djevIndex >= 0 ? first?.children[djevIndex] : null;
        return { heads, taskRows, djevIndex, blank: blank.length, djevText: djevCell?.textContent?.trim(), djevTitle: djevCell?.getAttribute('title'), groupRows: groupRows.length, groupCells, groupHeads, groupBasesAgree, typedRows, typeCodes, titleHasTopicAndType, legend, taskCellRects, rotated };
      });
      check(`${tag}: grid exposes all 231 public tasks grouped by tier`, gridData.taskRows === 231, gridData.taskRows);
      check(`${tag}: every scored system has a column, djev included`, gridData.heads.length >= 22 && gridData.djevIndex >= 0 && /correct|wrong|failed|not attempted/.test(gridData.djevTitle || ''), gridData);
      check(`${tag}: no column is left unavailable`, gridData.blank === 0, gridData.blank);
      check(`${tag}: dense grid uses compact cells and per-system tier summaries`, gridData.groupRows === 3 && gridData.groupCells.length === gridData.groupRows * (gridData.heads.length - 1) && gridData.groupCells.every((cell) => /^\d+\/\d+$/.test(cell)) && gridData.taskCellRects.every((rect) => rect.width <= 34 && rect.height <= 30) && gridData.rotated, gridData);
      check(`${tag}: group rows name both bases and count only the public rows they list`, gridData.groupBasesAgree && gridData.groupHeads.length === 3 && /^Easy · 48 of 72 decisions public$/.test(gridData.groupHeads[0]) && /^Medium \(standard\) · 72 of 96 decisions public$/.test(gridData.groupHeads[1]) && /^Hard · 111 of 220 decisions public$/.test(gridData.groupHeads[2]), gridData.groupHeads);
      check(`${tag}: every task row carries its question type as text and accessible title`, gridData.typedRows === 231 && gridData.typeCodes.join(',') === 'choice,noul,score' && gridData.titleHasTopicAndType === 231, { typedRows: gridData.typedRows, typeCodes: gridData.typeCodes, titleHasTopicAndType: gridData.titleHasTopicAndType });
      check(`${tag}: the legend defines the types and says where the topic is readable`, /choice/.test(gridData.legend) && /noul/.test(gridData.legend) && /score/.test(gridData.legend) && /carries its topic/.test(gridData.legend) && /group row counts the public tasks it lists/.test(gridData.legend), gridData.legend.slice(0, 260));
      // Review gate 20260920T055002Z: the head is the only thing that names the 21 system columns. With 231 rows in
      // a 38rem scroller it has to stay on screen, or every cell below the first screenful belongs to nobody.
      const headPinned = await page.evaluate(() => {
        const table = document.querySelector('[data-bh-jev12-task-table]');
        const wrap = table.closest('div');
        const head = table.querySelector('thead th:nth-child(3)');
        wrap.scrollTop = wrap.scrollHeight;
        const wr = wrap.getBoundingClientRect(), hr = head.getBoundingClientRect();
        const position = getComputedStyle(head).position;
        const offset = Math.round(hr.top - wr.top);
        wrap.scrollTop = 0;
        return { position, offset, scrollHeight: Math.round(wrap.scrollHeight), clientHeight: Math.round(wrap.clientHeight), label: head.textContent.replace(/\s+/g, ' ').trim() };
      });
      check(`${tag}: the grid head stays pinned while the 231 rows scroll`, headPinned.position === 'sticky' && headPinned.offset >= 0 && headPinned.offset <= 4 && headPinned.scrollHeight > headPinned.clientHeight && headPinned.label.length > 0, headPinned);
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
