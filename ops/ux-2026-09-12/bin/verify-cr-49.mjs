// CR-49.1 / F-106: "Edit shortlist" in the Simple view. The chart's columns (bar rows on phones) toggle models in one
// ordered selection of at most 5 that the benchmark table follows; full state is aria-disabled with a tooltip; Edit shows
// ‹ › × per column header and "+ Add a model" (F-95 picker) below 5; keyboard works; reload keeps a manual selection;
// "Reset to top 5" restores the automatic five; the global Options state is unchanged; no overflow at 320 px.
// Usage: BH_RUNNER=<engine> node verify-cr-49.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-49';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const b = await chromium.launch();
const views = [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }], ['mobile320', { width: 320, height: 844 }]];
for (const theme of ['light', 'dark']) for (const [kind, vp] of views) {
  if (kind === 'mobile320' && theme === 'dark') continue;
  const mobile = kind !== 'desktop';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  const load = async () => { await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500); };
  await goto(page, BASE + '/'); await load();
  const tap = async (loc) => { await loc.scrollIntoViewIfNeeded(); if (mobile) await loc.tap(); else await loc.click(); await page.waitForTimeout(700); };
  const st = () => page.evaluate(() => ({
    pressed: [...document.querySelectorAll('[data-toggle][aria-pressed="true"]')].map((x) => x.dataset.toggle),
    labels: [...document.querySelectorAll('[data-toggle]')].slice(0, 7).map((x) => x.getAttribute('aria-label')),
    disabled: [...document.querySelectorAll('[data-toggle][aria-disabled="true"]')].map((x) => [x.dataset.toggle, x.getAttribute('title')]),
    toggles: [...document.querySelectorAll('[data-toggle]')].map((x) => x.dataset.toggle),
    colours: Object.fromEntries([...document.querySelectorAll('[data-toggle][aria-pressed="true"]')].map((x) => [x.dataset.toggle, getComputedStyle(x.querySelector('span[style*="background"]') ?? x).backgroundColor])),
    cols: [...document.querySelectorAll('[data-selection-col]')].map((t) => t.dataset.selectionCol),
    letters: [...document.querySelectorAll('[data-selection-col] .bh-matrix-accent')].map((t) => t.textContent),
    state: document.querySelector('[data-selection-state]')?.innerText ?? null,
    add: !!document.querySelector('[data-selection-add]'),
    controls: [...document.querySelectorAll('[data-selection-col]')].map((t) => [...t.querySelectorAll('[data-selection-controls] button')].map((x) => x.getAttribute('aria-label'))),
    overflow: document.documentElement.scrollWidth - innerWidth,
    full: document.querySelector('#benchmarks a.bh-button')?.getAttribute('href'),
    stored: localStorage.getItem('bh.simpleShortlist.v1'),
    filters: Object.fromEntries(Object.keys(localStorage).filter((k) => !/shortlist|Shortlist|theme|Note|Hint/.test(k)).map((k) => [k, localStorage.getItem(k)])),
  }));

  const d = await st();
  check(`${tag} automatic default: the first 5 chart models are pressed as A–E and are the table's columns in that order`, d.pressed.length === 5 && same(d.cols, d.pressed) && same(d.pressed, d.toggles.slice(0, 5)) && same(d.letters, ['A', 'B', 'C', 'D', 'E']) && d.state === null, d);
  check(`${tag} full state: every muted column is aria-disabled with the "full" tooltip`, d.disabled.length === d.toggles.length - 5 && d.disabled.every(([, t]) => /Your comparison is full \(5\) — remove a model first/.test(t)), d.disabled.slice(0, 3));
  check(`${tag} accessible names say value and membership`, /, in your comparison as A$/.test(d.labels[0]) && d.labels.slice(5).every((l) => /, not in your comparison$/.test(l)), d.labels);
  await page.locator('#benchmarks').screenshot({ path: `${OUT}/${tag}-1-automatic.png` }).catch(() => {});

  // Remove column A via its bar: B–E shift up in position and colour.
  await tap(page.locator(`[data-toggle="${d.pressed[0]}"]`));
  const r = await st();
  check(`${tag} tapping column A's bar removes it; B–E move to A–D, colours follow the slot`, same(r.cols, d.pressed.slice(1)) && same(r.pressed.sort(), d.pressed.slice(1).sort()) && r.colours[d.pressed[1]] === d.colours[d.pressed[0]] && r.disabled.length === 0, { cols: r.cols, colours: r.colours, before: d.colours });
  check(`${tag} manual state line "Your selection · 4 of 5 · Reset to top 5"`, /Your selection · 4 of 5 · Reset to top 5/.test(r.state ?? ''), r.state);
  // Add the 7th column → last free slot E.
  const seventh = d.toggles[6];
  await tap(page.locator(`[data-toggle="${seventh}"]`));
  const a = await st();
  check(`${tag} tapping the 7th column adds it as column E in series colour 5`, a.cols[4] === seventh && a.cols.length === 5 && a.colours[seventh] === d.colours[d.pressed[4]], { cols: a.cols, colour: a.colours[seventh], expected: d.colours[d.pressed[4]] });
  check(`${tag} the full-comparison link passes the selection in order`, decodeURIComponent(a.full ?? '').endsWith(`models=${a.cols.join(',')}`), a.full);

  // Edit: controls on every header; no Add at 5; remove the last via ×, Add appears; add by type-ahead.
  await tap(page.locator('[data-selection-edit]'));
  const e = await st();
  check(`${tag} Edit reveals ‹ › × with names (no ‹ on A, no › on the last), no "+ Add" when full`, e.controls.length === 5 && e.controls.every((cs, j) => cs.some((l) => l === `Remove ${l.slice(7, -20)} from the comparison`) && (j === 0 ? !cs.some((l) => /left$/.test(l)) : cs.some((l) => /^Move .* left$/.test(l))) && (j === 4 ? !cs.some((l) => /right$/.test(l)) : cs.some((l) => /^Move .* right$/.test(l)))) && !e.add, e.controls);
  // Keyboard: move B left with Enter.
  const moveLeft = page.locator('[data-selection-col] button[aria-label$=" left"]').first();
  await moveLeft.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  const m = await st();
  check(`${tag} keyboard Enter on "Move … left" swaps A and B in table and chart colours`, same(m.cols, [e.cols[1], e.cols[0], ...e.cols.slice(2)]) && m.colours[e.cols[1]] === e.colours?.[e.cols[0]] || (same(m.cols, [e.cols[1], e.cols[0], ...e.cols.slice(2)]) && m.colours[e.cols[1]] === a.colours[e.cols[0]]), { cols: m.cols });
  const removeLast = page.locator('[data-selection-col] button[aria-label^="Remove"]').last();
  await removeLast.focus(); await page.keyboard.press('Space'); await page.waitForTimeout(600);
  const x = await st();
  check(`${tag} Space on × removes the model; "+ Add a model" appears below 5`, x.cols.length === 4 && x.add, { cols: x.cols, add: x.add });
  await tap(page.locator('[data-selection-add]'));
  const opts = page.locator('[data-picker-option]');
  await opts.first().waitFor({ timeout: 5000 }).catch(() => {});
  const optNames = await opts.allInnerTexts();
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForTimeout(900);
  const y = await st();
  check(`${tag} the picker lists models of the list not yet selected; choosing adds at slot E`, optNames.length > 0 && y.cols.length === 5 && !x.cols.includes(y.cols[4]) && y.toggles.includes(y.cols[4]), { opts: optNames.slice(0, 3), cols: y.cols });
  await page.locator('#benchmarks').screenshot({ path: `${OUT}/${tag}-2-edited.png` }).catch(() => {});

  // Reload keeps the manual selection and order.
  await page.reload({ waitUntil: 'domcontentloaded' }); await load();
  const z = await st();
  check(`${tag} reload keeps the manual selection and its order`, same(z.cols, y.cols) && /5 of 5/.test(z.state ?? ''), { before: y.cols, after: z.cols });
  check(`${tag} global settings in storage untouched by curation`, same(z.filters, d.filters), { before: d.filters, after: z.filters });
  // Name links still open the model page.
  const href = await page.locator('[data-selection-col] .bh-matrix-name a').first().getAttribute('href');
  check(`${tag} table header names stay model-page links`, href === `/models/${encodeURIComponent(z.cols[0])}`, href);
  // Reset.
  await tap(page.locator('[data-selection-reset]'));
  const q = await st();
  check(`${tag} "Reset to top 5" restores the automatic five and clears storage`, same(q.cols, d.cols) && q.state === null && q.stored === null, { cols: q.cols, stored: q.stored });
  check(`${tag} no horizontal page overflow`, [d, r, a, e, x, y, z, q].every((s) => s.overflow <= 0), [d, r, a, e, x, y, z, q].map((s) => s.overflow));
  check(`${tag} no page errors`, errors.length === 0, errors);
  await c.close();
}
await b.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || 'unknown', at: new Date().toISOString(), passed, total: checks.length, allPass: passed === checks.length, checks }, null, 1));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.ok ? '' : ' — ' + c.detail.slice(0, 700)}`);
console.log(`${passed}/${checks.length}${passed === checks.length ? ' ALL PASS' : ''}`);
process.exit(passed === checks.length ? 0 : 1);
