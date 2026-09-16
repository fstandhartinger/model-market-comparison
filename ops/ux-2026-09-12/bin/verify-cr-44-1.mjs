// CR-44.1: sort-aware value-signal framing. Sorted by score (default) the cost-relative tags ("cheaper"/"pricier") sit in
// the Adjusted Cost column; sorted by adjusted cost (keyboard-activated, both directions) the same models carry the same
// levels as capability-relative tags ("more/less capable") in the Score column — never both at once — and a polite live
// region states the changed context. Desktop 1440, phone 390 and 320, light and dark.
// Usage: BH_RUNNER=<engine> node verify-cr-44-1.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-44-1';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

const b = await chromium.launch();
const views = [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }], ['mobile320', { width: 320, height: 844 }]];
for (const theme of ['light', 'dark']) for (const [kind, vp] of views) {
  const mobile = kind !== 'desktop';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, BASE + '/'); await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200);

  const state = () => page.evaluate(() => {
    const rows = [...document.querySelectorAll('tr.bh-ranking-row')];
    const read = (col) => rows.flatMap((r) => { const t = r.querySelector(`td:nth-child(${col}) .bh-value-tag`); if (!t) return []; const cell = t.closest('td').getBoundingClientRect(), tr = t.getBoundingClientRect(); return [{ id: r.dataset.modelId, kind: t.dataset.kind, level: t.dataset.level, framing: t.dataset.framing ?? 'cost', arrow: t.querySelector('[aria-hidden]')?.textContent, visible: [...t.children].filter((e) => !e.classList.contains('sr-only') && getComputedStyle(e).display !== 'none').map((e) => e.textContent).join(' ').replace(/\s+/g, ' ').trim(), sr: t.querySelector('.sr-only')?.textContent ?? '', inCell: tr.left >= cell.left - 0.5 && tr.right <= cell.right + 0.5 }]; });
    const sorted = [...document.querySelectorAll('th[aria-sort]')].map((th) => [th.innerText.split('\n')[0].replace(/[▲▼]/g, '').trim(), th.getAttribute('aria-sort')]).filter(([, s]) => s !== 'none');
    const live = document.querySelector('[aria-live="polite"][data-value-framing]');
    return { score: read(3), cost: read(4), sorted, live: live ? { framing: live.dataset.valueFraming, text: live.textContent } : null, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  const key = (xs) => xs.map((x) => `${x.id}|${x.kind}|${x.level}`).sort().join(',');

  const d = await state();
  check(`${tag} default sort is score descending; tags only in the Adjusted Cost column, cost wording`, d.sorted.length === 1 && /score/i.test(d.sorted[0][0]) && d.sorted[0][1] === 'descending' && d.cost.length > 0 && d.score.length === 0 && d.cost.every((t) => t.framing === 'cost' && /cheap|pric/i.test(t.sr + t.visible)), d);
  check(`${tag} the live region carries the cost framing`, d.live?.framing === 'cost' && /Adjusted Cost column/.test(d.live.text), d.live);
  const tbl = page.locator('table[aria-label="Model ranking"]');
  await tbl.screenshot({ path: `${OUT}/${tag}-by-score.png` }).catch(() => {});

  // Keyboard: focus the Adjusted Cost sort button and press Enter.
  const costBtn = page.locator('th button', { hasText: /Adjusted Cost/i }).first();
  await costBtn.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
  const a = await state();
  check(`${tag} Enter on "Adjusted Cost" sorts by cost; tags move to the Score column, none left in the cost column`, a.sorted.length === 1 && /cost/i.test(a.sorted[0][0]) && a.cost.length === 0 && a.score.length > 0, { sorted: a.sorted, score: a.score.length, cost: a.cost.length });
  check(`${tag} same models, same kinds, same levels as the cost framing`, key(a.score) === key(d.cost), { byScore: key(d.cost), byCost: key(a.score) });
  check(`${tag} capability wording and arrows: cheap → more capable ↑/↗, pricey → less capable ↓/↘ (strong straight, weak slanted)`, a.score.every((t) => t.framing === 'capability' && (t.kind === 'cheap' ? /more capable/.test(t.sr) && (t.level === 'strong' ? t.arrow === '↑' : t.arrow === '↗') : /less capable/.test(t.sr) && (t.level === 'strong' ? t.arrow === '↓' : t.arrow === '↘')) && !/cheaper|pricier/.test(t.visible)), a.score.map((t) => [t.id, t.kind, t.level, t.arrow, t.visible]));
  check(`${tag} the live region announces the capability framing`, a.live?.framing === 'capability' && /Score column/.test(a.live.text), a.live);
  check(`${tag} capability tags stay inside the Score cell, no page overflow`, a.score.every((t) => t.inCell) && a.overflow <= 0, { out: a.score.filter((t) => !t.inCell).map((t) => t.id), overflow: a.overflow });
  await tbl.screenshot({ path: `${OUT}/${tag}-by-cost-asc.png` }).catch(() => {});

  await costBtn.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
  const a2 = await state();
  check(`${tag} Enter again (cost descending) keeps the capability framing with the same set`, a2.sorted[0]?.[1] === 'descending' && /cost/i.test(a2.sorted[0][0]) && a2.cost.length === 0 && key(a2.score) === key(d.cost), { sorted: a2.sorted, n: a2.score.length });

  const scoreBtn = page.locator('th button', { hasText: /^Score/i }).first();
  await scoreBtn.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
  const back = await state();
  check(`${tag} sorting by Score again restores the cost framing (same set, none in the Score column)`, /score/i.test(back.sorted[0]?.[0] ?? '') && back.score.length === 0 && key(back.cost) === key(d.cost) && back.live?.framing === 'cost', { sorted: back.sorted, score: back.score.length, cost: back.cost.length });
  check(`${tag} no page errors`, errors.length === 0, errors);
  await c.close();
}
await b.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || 'unknown', at: new Date().toISOString(), passed, total: checks.length, allPass: passed === checks.length, checks }, null, 1));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.ok ? '' : ' — ' + c.detail.slice(0, 600)}`);
console.log(`${passed}/${checks.length}${passed === checks.length ? ' ALL PASS' : ''}`);
process.exit(passed === checks.length ? 0 : 1);
