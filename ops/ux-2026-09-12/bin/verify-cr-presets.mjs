// Acceptance for CR-2.4 (model-list presets), CR-3.1 (row presets), CR-4.1 (filter presets),
// CR-4.2 (one consistent preset component) and the models/rows part of CR-2.5 (shareable URL).
// Usage: node verify-cr-presets.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter53-presets/canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };

const state = () => {
  const table = document.querySelector('table.bh-matrix');
  // F-83: the status holds the count <select>; read its value, not every option's text.
  const statusEl = document.querySelector('section[aria-label="Benchmark comparison"] [role="status"]');
  const statusClone = statusEl?.cloneNode(true);
  statusClone?.querySelectorAll('select').forEach((x, i) => x.replaceWith(statusEl.querySelectorAll('select')[i].value));
  const status = statusClone?.textContent.replace(/\s+/g, ' ').trim() ?? '';
  const cols = table ? [...table.querySelectorAll('thead th.bh-matrix-model .bh-matrix-name a')].map((a) => decodeURIComponent(a.getAttribute('href').replace('/models/', ''))) : [];
  const orgs = table ? [...table.querySelectorAll('thead th.bh-matrix-model .bh-matrix-org')].map((x) => x.textContent.trim()) : [];
  // Benchmark data rows only: the hero ScoreRow (CR-12.1, .bh-matrix-hero) and the category-composite
  // group headers (CR-12.3, .bh-matrix-group) are synthesized rows without a .bh-matrix-bench stub.
  const rows = table ? [...table.querySelectorAll('tbody tr:not(.bh-matrix-group):not(.bh-matrix-hero)')].map((tr) => ({
    name: tr.querySelector('.bh-matrix-bench').childNodes[0].textContent,
    tags: [...tr.querySelectorAll('.bh-matrix-tag')].map((t) => t.dataset.tag),
    filled: tr.querySelectorAll('td .bh-matrix-link').length, cells: tr.querySelectorAll('td').length,
  })) : [];
  const groups = table ? [...table.querySelectorAll('tr.bh-matrix-group button span:first-of-type')].map((x) => x.textContent.trim()) : [];
  const menus = [...document.querySelectorAll('.bh-preset')].map((m) => ({ kind: m.dataset.presetKind, label: m.querySelector('button').textContent.replace(/\s+/g, ' ').trim(), h: m.querySelector('button').getBoundingClientRect().height }));
  return { status, cols, orgs, rows, groups, menus, url: location.search, docOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
};
const openMenu = async (p, kind) => { await p.locator(`.bh-preset[data-preset-kind="${kind}"] > button`).click(); return p.locator(`.bh-preset[data-preset-kind="${kind}"] [role="dialog"]`); };
const panelInfo = (dlg) => dlg.evaluate((d) => {
  const heads = [...d.querySelectorAll('p')].map((x) => x.textContent.trim());
  const ours = [...d.querySelectorAll('ul')[0].querySelectorAll('button')].map((x) => x.querySelector('span').textContent.trim());
  const r = d.getBoundingClientRect();
  return { heads, ours, inView: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1 };
});

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
  let s = await p.evaluate(state);
  const allRows = s.rows.length;
  check(`${tag} CR-4.2 model and row preset menus present, same component`, s.menus.some((m) => m.kind === 'models') && s.menus.some((m) => m.kind === 'rows'), JSON.stringify(s.menus));
  check(`${tag} defaults: Models "Frontier top 5", Rows "All", top 5 status`, /Frontier top 5/.test(s.menus.find((m) => m.kind === 'models')?.label) && /All/.test(s.menus.find((m) => m.kind === 'rows')?.label) && s.cols.length === 5 && /top 5 by/.test(s.status), s.status);

  // CR-2.4 models
  let dlg = await openMenu(p, 'models');
  let info = await panelInfo(dlg);
  await p.screenshot({ path: `${OUT}/${tag}-models-menu.png` });
  check(`${tag} CR-2.4/4.2 model menu: "Ours" and "Yours" sections, required built-ins, panel inside the viewport`,
    info.heads.includes('Ours') && info.heads.includes('Yours') && ['Frontier top 5', 'Best open-weight', 'Best value', 'Coding leaders', 'Flagships by lab', 'EU-hostable'].every((n) => info.ours.includes(n)) && info.inView, JSON.stringify(info));
  await dlg.getByRole('button', { name: /Flagships by lab/ }).click();
  await p.waitForTimeout(400);
  s = await p.evaluate(state);
  check(`${tag} CR-2.4 Flagships by lab: one column per lab`, s.cols.length >= 2 && new Set(s.orgs.map((o) => o.toLowerCase())).size === s.orgs.length && /Flagships by lab/.test(s.status), s.orgs.join(' | '));
  check(`${tag} CR-2.5 model preset in the URL`, /set=labs/.test(s.url), s.url);
  dlg = await openMenu(p, 'models');
  await dlg.getByRole('button', { name: /Best open-weight/ }).click();
  await p.waitForTimeout(400);
  const open = await p.evaluate(state);
  check(`${tag} CR-2.4 Best open-weight changes the columns`, open.cols.length >= 1 && open.cols.join() !== s.cols.join(), open.cols.join(' | '));
  dlg = await openMenu(p, 'models');
  await dlg.getByRole('button', { name: /Best value/ }).click();
  await p.waitForTimeout(400);
  const value = await p.evaluate(state);
  check(`${tag} CR-2.4 Best value yields columns`, value.cols.length >= 2, value.cols.join(' | '));

  // CR-3.1 rows
  dlg = await openMenu(p, 'rows');
  info = await panelInfo(dlg);
  check(`${tag} CR-3.1 row menu built-ins`, ['All', 'Important', 'AA Intelligence Index', 'Coding', 'Agentic & tool use', 'Math & science', 'Community & niche', 'Full coverage only'].every((n) => info.ours.includes(n)) && info.inView, info.ours.join(' | '));
  await dlg.getByRole('button', { name: /^AA Intelligence Index/ }).click();
  await p.waitForTimeout(400);
  s = await p.evaluate(state);
  check(`${tag} CR-3.1 AA preset: only AA-tagged rows, fewer than All`, s.rows.length > 0 && s.rows.every((r) => r.tags.includes('aa')) && s.rows.length < allRows && /rows=aa/.test(s.url), `${s.rows.length} rows of ${allRows}`);
  dlg = await openMenu(p, 'rows');
  await dlg.getByRole('button', { name: /^Full coverage only/ }).click();
  await p.waitForTimeout(400);
  s = await p.evaluate(state);
  check(`${tag} CR-3.1 Full coverage only: every visible row has a value in every column`, s.rows.length === 0 || s.rows.every((r) => r.filled === r.cells), `${s.rows.length} rows`);
  dlg = await openMenu(p, 'rows');
  await dlg.getByRole('button', { name: /^Coding/ }).click();
  await p.waitForTimeout(400);
  s = await p.evaluate(state);
  check(`${tag} CR-3.1 Coding preset shows coding rows`, s.rows.length > 0 && s.groups.some((g) => /Coding/.test(g)), s.groups.join(' | '));

  // Custom rows via the checklist, save, reload from URL, apply saved.
  await p.locator('.bh-rowpicker > summary').click();
  const firstGroup = p.locator('.bh-rowpicker fieldset').first().locator('legend input[type="checkbox"]');
  const wasOn = await firstGroup.isChecked();
  await firstGroup.click();
  await p.waitForTimeout(300);
  s = await p.evaluate(state);
  check(`${tag} CR-3.1 category toggle in the checklist changes the rows; menu reads "Custom"`, /Custom/.test(s.menus.find((m) => m.kind === 'rows').label) && /rows=/.test(s.url), `${wasOn ? 'off' : 'on'} · ${s.rows.length} rows · ${s.menus.find((m) => m.kind === 'rows').label}`);
  const customRows = s.rows.map((r) => r.name).join('|');
  dlg = await openMenu(p, 'rows');
  await dlg.getByRole('textbox', { name: /Name for the current rows/ }).fill(`QA rows ${tag}`);
  await dlg.getByRole('button', { name: 'Save' }).click();
  await p.waitForTimeout(300);
  check(`${tag} CR-3.1 saved row preset listed under Yours with a confirmation`, await dlg.getByRole('button', { name: `QA rows ${tag}`, exact: true }).count() === 1 && /Saved/.test(await dlg.locator('[role="status"]').textContent()), '');
  await dlg.getByRole('button', { name: `Rename QA rows ${tag}` }).click();
  await dlg.getByRole('textbox', { name: /New name for/ }).fill(`QA renamed ${tag}`);
  await dlg.getByRole('button', { name: 'Rename', exact: true }).click();
  check(`${tag} CR-4.2 rename works`, await dlg.getByRole('button', { name: `QA renamed ${tag}`, exact: true }).count() === 1, '');
  await p.screenshot({ path: `${OUT}/${tag}-rows-menu-saved.png` });
  await dlg.getByRole('button', { name: /^All/ }).click();
  await p.waitForTimeout(300);
  dlg = await openMenu(p, 'rows');
  await dlg.getByRole('button', { name: `QA renamed ${tag}`, exact: true }).click();
  await p.waitForTimeout(300);
  s = await p.evaluate(state);
  check(`${tag} CR-3.1 applying the saved preset restores the custom rows and names it`, s.rows.map((r) => r.name).join('|') === customRows && s.menus.find((m) => m.kind === 'rows').label.includes(`QA renamed ${tag}`), s.menus.find((m) => m.kind === 'rows').label);

  // CR-2.5 URL round trip in a fresh page.
  const url = await p.evaluate(() => location.href);
  const cols = s.cols.join('|');
  const p2 = await c.newPage();
  await p2.goto(url, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(900);
  const s2 = await p2.evaluate(state);
  check(`${tag} CR-2.5 shared URL reproduces columns and rows`, s2.cols.join('|') === cols && s2.rows.map((r) => r.name).join('|') === customRows, s2.url);
  await p2.close();

  dlg = await openMenu(p, 'rows');
  await dlg.getByRole('button', { name: `Delete QA renamed ${tag}` }).click();
  check(`${tag} CR-4.2 delete removes the saved preset`, await dlg.getByRole('button', { name: `QA renamed ${tag}`, exact: true }).count() === 0, '');
  await p.keyboard.press('Escape');

  // CR-2.4 custom model list: pin via ×, save, reset, re-apply.
  dlg = await openMenu(p, 'models');
  await dlg.getByRole('button', { name: /Frontier top/ }).click();
  await p.waitForTimeout(300);
  await p.locator('thead th.bh-matrix-model').nth(1).getByRole('button').click();
  await p.waitForTimeout(300);
  s = await p.evaluate(state);
  const pinnedCols = s.cols.join('|');
  dlg = await openMenu(p, 'models');
  await dlg.getByRole('textbox', { name: /Name for the current models/ }).fill(`QA models ${tag}`);
  await dlg.getByRole('button', { name: 'Save' }).click();
  await p.keyboard.press('Escape');
  await p.getByRole('button', { name: /Reset to top/ }).click();
  await p.waitForTimeout(300);
  dlg = await openMenu(p, 'models');
  await dlg.getByRole('button', { name: `QA models ${tag}`, exact: true }).click();
  await p.waitForTimeout(300);
  s = await p.evaluate(state);
  check(`${tag} CR-2.4 saved model list re-applies the exact columns`, s.cols.join('|') === pinnedCols && s.cols.length === 4, s.cols.join(' | '));
  dlg = await openMenu(p, 'models');
  await dlg.getByRole('button', { name: `Delete QA models ${tag}` }).click();
  await p.keyboard.press('Escape');

  // CR-4.1 filter presets in the Filters sheet (home page).
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await p.waitForTimeout(700);
  await p.locator('[data-bh-filters-toggle]:visible').first().click();
  await p.waitForTimeout(300);
  dlg = await openMenu(p, 'filters');
  info = await panelInfo(dlg);
  await p.screenshot({ path: `${OUT}/${tag}-filters-presets.png` });
  check(`${tag} CR-4.1 filter preset built-ins, panel inside the viewport`, ['Company, EU-hosted only', 'Privacy strict', 'Cheapest capable', 'Open weights only', 'Frontier regardless of cost'].every((n) => info.ours.includes(n)) && info.inView, JSON.stringify(info));
  await dlg.getByRole('button', { name: /^Company, EU-hosted only/ }).click();
  await p.waitForTimeout(400);
  const toggles = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#global-filters [aria-pressed], #global-filters input[type="checkbox"], #global-filters [role="switch"]')].map((el) => [(el.getAttribute('aria-label') || el.closest('label')?.textContent || el.textContent || '').trim(), el.getAttribute('aria-pressed') ?? el.getAttribute('aria-checked') ?? String(el.checked)])));
  const label = await p.locator('.bh-preset[data-preset-kind="filters"] > button').textContent();
  const on = (re) => Object.entries(toggles).some(([k, v]) => re.test(k) && v === 'true');
  check(`${tag} CR-4.1 applying "Company, EU-hosted only" sets both toggles and the menu names it`, on(/^Hosted in EU$/) && !on(/^Hosted in US$/) && on(/buying for a company/i) && /Company, EU-hosted only/.test(label), label);
  dlg = await openMenu(p, 'filters');
  await dlg.getByRole('button', { name: /^Privacy strict/ }).click();
  await p.waitForTimeout(400);
  const t2 = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#global-filters [aria-pressed], #global-filters input[type="checkbox"], #global-filters [role="switch"]')].map((el) => [(el.getAttribute('aria-label') || el.closest('label')?.textContent || el.textContent || '').trim(), el.getAttribute('aria-pressed') ?? el.getAttribute('aria-checked') ?? String(el.checked)])));
  const on2 = (re) => Object.entries(t2).some(([k, v]) => re.test(k) && v === 'true');
  // CR-25.2 removed 'Strong confidential guarantees'; Privacy strict is now EU-hosted + no training/retention, and it
  // replaces (not merges with) the previous preset — the company toggle from 'Company, EU-hosted only' goes off.
  check(`${tag} CR-4.1 "Privacy strict" replaces the previous preset (EU on, company off, no confidential filter)`, on2(/^Hosted in EU$/) && !on2(/^Hosted in US$/) && !on2(/buying for a company/i) && !Object.keys(t2).some((k) => /Strong confidential/.test(k)), JSON.stringify(t2));
  const reset = p.locator('#global-filters').getByRole('button', { name: 'Reset', exact: true });
  if (await reset.count()) await reset.click();
  check(`${tag} no page errors, no horizontal overflow`, errors.length === 0 && !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), errors.join(' | '));
  await c.close();
}
await b.close();
const passed = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: results.length, results }, null, 2));
console.log(`${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
