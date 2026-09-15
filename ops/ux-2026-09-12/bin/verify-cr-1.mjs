// Acceptance for CR-1.1–1.7 and CR-2.1/2.3: the Benchmarks tab opens on the release-style table.
// Usage: node verify-cr-1.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter52-cr-1/canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };
// Since d3cee65 (CR-3.1) the row presets live in the Rows preset menu.
const pickRows = async (p, name) => { await p.locator('.bh-preset[data-preset-kind="rows"] > button').click(); await p.locator('.bh-preset[data-preset-kind="rows"] [role="dialog"]').getByRole('button', { name: new RegExp('^' + name) }).click(); await p.waitForTimeout(200); };
const snapshot = () => {
  const table = document.querySelector('table.bh-matrix');
  if (!table) return null;
  const cols = [...table.querySelectorAll('thead th.bh-matrix-model')].map((th) => ({ org: th.querySelector('.bh-matrix-org')?.textContent.trim(), name: th.querySelector('.bh-matrix-name')?.textContent.trim() }));
  const rows = [...table.querySelectorAll('tbody tr:not(.bh-matrix-group)')];
  let rowsWithTwo = 0, rowsWithWinner = 0, barsOnMissing = 0, maxBarAlpha = 0;
  for (const tr of rows) {
    const cells = [...tr.querySelectorAll('td.bh-matrix-cell')];
    const valued = cells.filter((td) => td.querySelector('.bh-matrix-link'));
    if (valued.length >= 2) rowsWithTwo++;
    if (valued.some((td) => Number(getComputedStyle(td.querySelector('.bh-matrix-link .relative')).fontWeight) >= 700)) rowsWithWinner++;
    barsOnMissing += cells.filter((td) => td.querySelector('.bh-matrix-missing') && td.querySelector('.bh-matrix-bar')).length;
    for (const bar of tr.querySelectorAll('.bh-matrix-bar')) { const m = getComputedStyle(bar).backgroundColor.match(/[\d.]+\)$/); if (m) maxBarAlpha = Math.max(maxBarAlpha, parseFloat(m[0])); }
  }
  // F-83: the status holds the count <select>; read its value, not every option's text.
  const statusEl = document.querySelector('section[aria-label="Benchmark comparison"] [role="status"]');
  const statusClone = statusEl?.cloneNode(true);
  statusClone?.querySelectorAll('select').forEach((x, i) => x.replaceWith(statusEl.querySelectorAll('select')[i].value));
  const status = statusClone?.textContent.replace(/\s+/g, ' ').trim() ?? '';
  const groups = [...table.querySelectorAll('tr.bh-matrix-group button')].map((x) => x.textContent.trim());
  const names = rows.map((tr) => tr.querySelector('th .bh-matrix-bench')?.childNodes[0]?.textContent ?? '');
  const tags = [...table.querySelectorAll('.bh-matrix-tag')].map((t) => t.dataset.tag);
  const stub = table.querySelector('tbody th.bh-matrix-stub');
  const wrap = document.querySelector('.bh-matrix-wrap');
  return { cols, rows: rows.length, rowsWithTwo, rowsWithWinner, barsOnMissing, maxBarAlpha, status, groups, names, tagSet: [...new Set(tags)],
    bars: table.querySelectorAll('.bh-matrix-bar').length, missing: table.querySelectorAll('.bh-matrix-missing').length,
    stubSticky: stub ? getComputedStyle(stub).position : null, docOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    wrapScrolls: wrap ? wrap.scrollWidth > wrap.clientWidth : false, url: location.search };
};
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  const tag = `${kind}_${theme}`;
  await p.goto(BASE + '/benchmarks', { waitUntil: 'networkidle' });
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await p.waitForTimeout(900);
  let s = await p.evaluate(snapshot);
  await p.screenshot({ path: `${OUT}/${tag}-open.png` });
  await p.screenshot({ path: `${OUT}/${tag}-open-full.png`, fullPage: true });
  check(`${tag} CR-1.1 tab opens on the comparison table`, s != null, s ? '' : 'no table.bh-matrix');
  if (!s) { await c.close(); continue; }
  check(`${tag} CR-1.2 opens with the top 5 of the filter selection`, s.cols.length === 5 && /top 5 by .+ under your filters/.test(s.status), `${s.cols.length} cols · ${s.status}`);
  // F-83: the table starts within the first screen; one status row, one box-less control row.
  const f83 = await p.evaluate(() => {
    const top = (el) => el ? el.getBoundingClientRect().top + scrollY : null;
    const first = document.querySelector('table.bh-matrix tbody td.bh-matrix-cell .bh-matrix-link');
    const status = document.querySelector('section[aria-label="Benchmark comparison"] [role="status"]');
    return { thead: top(document.querySelector('table.bh-matrix thead')), firstTop: top(first), firstBottom: first ? first.getBoundingClientRect().bottom + scrollY : null,
      sentence: document.querySelector('.bh-page-head p')?.textContent ?? '', statusSelect: !!status?.querySelector('select[aria-label="Number of models"]'),
      modelsLabel: [...document.querySelectorAll('label')].some((l) => /^\s*Models/.test(l.textContent) && l.querySelector('select')),
      borders: ['.bh-pickpanel', '.bh-rowpicker'].map((c) => { const d = document.querySelector(`details${c}`); return d && !d.open ? getComputedStyle(d).borderTopWidth : 'missing-or-open'; }) };
  });
  if (kind === 'mobile') check(`${tag} F-83 thead ≤ 560 px and first value inside the 844 px viewport`, f83.thead != null && f83.thead <= 560 && f83.firstBottom != null && f83.firstBottom <= 844, JSON.stringify(f83));
  else check(`${tag} F-83 first value ≤ 520 px from the top`, f83.firstTop != null && f83.firstTop <= 520, JSON.stringify(f83));
  check(`${tag} F-83 header sentence has no digit; count select inside the status; no "Models" select label`, !/\d/.test(f83.sentence) && f83.statusSelect && !f83.modelsLabel, JSON.stringify(f83));
  check(`${tag} F-83 closed disclosures have no border`, f83.borders.every((w) => w === '0px'), f83.borders.join(','));
  const openState = () => p.evaluate(() => ({ pick: document.querySelector('details.bh-pickpanel')?.open, rows: document.querySelector('details.bh-rowpicker')?.open }));
  await p.locator('details.bh-pickpanel > summary').click(); await p.waitForTimeout(300);
  const o1 = await openState();
  await p.locator('details.bh-rowpicker > summary').click(); await p.waitForTimeout(300);
  const o2 = await openState();
  await p.locator('details.bh-pickpanel > summary').click(); await p.waitForTimeout(300);
  const o3 = await openState();
  await p.locator('details.bh-pickpanel > summary').click(); await p.waitForTimeout(300);
  const o4 = await openState();
  check(`${tag} F-83 only one panel open at a time`, o1.pick && !o1.rows && o2.rows && !o2.pick && o3.pick && !o3.rows && !o4.pick && !o4.rows, JSON.stringify([o1, o2, o3, o4]));
  check(`${tag} CR-1.1 column headers: vendor above, model name`, s.cols.every((x) => x.org && x.name), JSON.stringify(s.cols));
  check(`${tag} CR-1.3 grouped by category with ≥ 8 group headers`, s.groups.length >= 8, s.groups.join(' | '));
  // F-77: the toolbar counts benchmarks (as "Choose rows" does); when a benchmark shows several harness
  // cohorts it adds "in N rows", and N must equal the rows rendered.
  const m = s.status.match(/(\d+) benchmarks across (\d+) categories(?: in (\d+) rows)?/);
  const chooser = await p.locator('.bh-rowpicker summary').first().textContent().catch(() => '');
  const chosen = chooser?.match(/\((\d+) of \d+\)/);
  check(`${tag} CR-1.4 / F-77 toolbar counts benchmarks like the row chooser, and rows match the table`, m && s.rows >= 25 && Number(m[3] ?? m[1]) === s.rows && chosen && Number(chosen[1]) === Number(m[1]), `${s.status} · chooser "${chooser?.trim()}" · rows ${s.rows}`);
  check(`${tag} CR-1.4 AA Intelligence Index and AA component rows present`, s.names.includes('AA Intelligence Index') && s.names.some((n) => /GPQA Diamond \(AA\)/.test(n)) && s.names.some((n) => /Humanity's Last Exam \(AA/.test(n)), '');
  check(`${tag} CR-1.1 short column names (no effort parenthetical on a unique model)`, s.cols.every((x) => x.name.length <= 40), s.cols.map((x) => x.name).join(' | '));
  check(`${tag} CR-1.5 data bars present, none on missing cells, subtle (alpha ≤ .25)`, s.bars > 0 && s.barsOnMissing === 0 && s.maxBarAlpha > 0 && s.maxBarAlpha <= 0.25, `bars=${s.bars} missing=${s.missing} alpha=${s.maxBarAlpha}`);
  check(`${tag} CR-1.6 every row with ≥ 2 values has a bold winner`, s.rowsWithTwo > 0 && s.rowsWithWinner >= s.rowsWithTwo, `${s.rowsWithWinner}/${s.rowsWithTwo}`);
  check(`${tag} CR-1.7 tags on the default selection: AA and Headline appear`, ['aa', 'headline'].every((t) => s.tagSet.includes(t)), s.tagSet.join(','));
  check(`${tag} CR-1.1 sticky first column, no page overflow`, s.stubSticky === 'sticky' && !s.docOverflow, `${s.stubSticky} docOverflow=${s.docOverflow} wrapScrolls=${s.wrapScrolls}`);
  // Collapse a group
  const before = s.rows;
  await p.locator('tr.bh-matrix-group button').first().click();
  await p.waitForTimeout(200);
  const collapsed = await p.evaluate(snapshot);
  check(`${tag} CR-1.3 groups collapse`, collapsed.rows < before && await p.locator('tr.bh-matrix-group button').first().getAttribute('aria-expanded') === 'false', `${before} → ${collapsed.rows}`);
  await p.locator('tr.bh-matrix-group button').first().click();
  // Presets
  await pickRows(p, 'Important');
  const imp = await p.evaluate(snapshot);
  check(`${tag} Important preset keeps rows`, imp.rows > 0 && imp.rows <= before, `${imp.rows}`);
  await pickRows(p, 'Full coverage only');
  const full = await p.evaluate(snapshot);
  check(`${tag} Full coverage preset: no missing cells`, full.rows > 0 && full.missing === 0, `${full.rows} rows, ${full.missing} missing`);
  await pickRows(p, 'All');
  // CR-2.1 remove and add, CR-2.3 reset
  const second = s.cols[1].name;
  await p.getByRole('button', { name: `Remove ${second} from the comparison` }).click(); await p.waitForTimeout(300);
  const removed = await p.evaluate(snapshot);
  check(`${tag} CR-2.1 remove a column`, removed.cols.length === 4 && !removed.cols.some((x) => x.name === second) && /models=/.test(removed.url), `${removed.cols.length} · ${removed.url.slice(0, 80)}`);
  await p.locator('#bh-matrix-add').fill('deepseek'); await p.waitForTimeout(300);
  const options = await p.locator('#bh-matrix-add-list [role="option"]').count();
  await p.locator('#bh-matrix-add').press('Enter'); await p.waitForTimeout(300);
  const added = await p.evaluate(snapshot);
  check(`${tag} CR-2.1 type-ahead add by keyboard`, options > 0 && added.cols.length === 5 && /deepseek/i.test(added.cols.at(-1).name), `${options} options · added ${added.cols.at(-1)?.name}`);
  await p.screenshot({ path: `${OUT}/${tag}-custom.png` });
  await p.getByRole('button', { name: /^Reset to top 5$/ }).click(); await p.waitForTimeout(300);
  const reset = await p.evaluate(snapshot);
  check(`${tag} CR-2.3 reset to top 5`, reset.cols.length === 5 && reset.cols[1].name === second && !/models=/.test(reset.url), reset.cols.map((x) => x.name).join(' | '));
  // A shared, broad-coverage selection (CR-2.5 style URL): community rows, tags and presets
  await p.goto(BASE + '/benchmarks?models=' + ['llama-4-maverick::default', 'gemma-4-31b-it::reasoning', 'llama-4-scout::default', 'gemini-3.1-pro-preview::default', 'minimax-m3::default'].map(encodeURIComponent).join(','), { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const broad = await p.evaluate(snapshot);
  await p.screenshot({ path: `${OUT}/${tag}-broad-full.png`, fullPage: true });
  check(`${tag} CR-1.7 broad selection shows AA, Headline, Niche and Community tags`, broad && ['aa', 'headline', 'niche', 'community'].every((t) => broad.tagSet.includes(t)), broad?.tagSet.join(','));
  await pickRows(p, 'Important');
  const broadImp = await p.evaluate(snapshot);
  check(`${tag} Important preset narrows a broad selection`, broad && broadImp.rows > 0 && broadImp.rows < broad.rows, `${broad?.rows} → ${broadImp.rows}`);
  // CR-1.8: a cell opens its detail page; back restores the selection
  const cell = p.locator('a.bh-matrix-link[href^="/benchmarks/result"]').first();
  const cellText = (await cell.innerText()).replace(/\s+/g, ' ').trim().replace(/\s*\(best in row\)$/, '').replace('†', '');
  await cell.click();
  await p.waitForURL(/\/benchmarks\/result\?/, { timeout: 15000 });
  await p.waitForLoadState('networkidle');
  const detail = await p.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent ?? '', value: document.querySelector('[data-bh-result-value]')?.textContent ?? '',
    source: [...document.querySelectorAll('main a[href^="http"]')].length, observed: /observed \d{4}-\d{2}-\d{2}/.test(document.body.innerText),
    compared: document.querySelectorAll('table.bh-table tbody tr').length, others: document.querySelectorAll('[aria-labelledby="bh-result-others"] li').length,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
  }));
  await p.screenshot({ path: `${OUT}/${tag}-detail.png`, fullPage: true });
  check(`${tag} CR-1.8 detail page: number, source link, observed date, compared models, other results`, detail.h1 && detail.value && cellText.startsWith(detail.value) && detail.source >= 1 && detail.observed && detail.compared === 5 && detail.others >= 3 && !detail.overflow, JSON.stringify({ ...detail, cellText }));
  await p.getByRole('link', { name: '← Back to the comparison' }).click();
  await p.waitForURL(/\/benchmarks\?models=/, { timeout: 15000 });
  await p.waitForTimeout(900);
  const restored = await p.evaluate(snapshot);
  check(`${tag} CR-1.8 back restores the compared models`, restored && restored.cols.length === 5 && restored.status.includes('your selection'), restored?.cols.map((x) => x.name).join(' | '));
  // Cell link → single-benchmark ranking still works
  await p.goto(BASE + '/benchmarks?benchmark=' + encodeURIComponent('aa-hle::snapshot-2026-09-10'), { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  const ranking = await p.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, rows: document.querySelectorAll('table.bh-table tbody tr').length, current: document.querySelector('nav[aria-label="Benchmark views"] [aria-current="page"]')?.textContent }));
  check(`${tag} ?benchmark= deep link keeps the single-benchmark ranking`, /One benchmark/.test(ranking.h1 ?? '') && ranking.rows > 0 && ranking.current === 'One benchmark', JSON.stringify(ranking));
  check(`${tag} no page errors`, errors.length === 0, errors.join(' | '));
  await c.close();
}
await b.close();
const passed = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: results.length, results }, null, 2));
console.log(`${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
