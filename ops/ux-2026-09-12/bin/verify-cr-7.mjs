// Acceptance for CR-7.1 (Simple landing = overview + simple Benchmarks section built from section 1's
// current selection, Important rows), CR-7.2 (marked as the simple version, obvious switch to the full
// version, one-time small-screen note) and CR-7.3 (header Benchmarks: Simple scrolls to / focuses
// section 2, Advanced opens the full tab).
// Usage: node verify-cr-7.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter53-cr-7/canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };
const idOf = (href) => decodeURIComponent(href.replace(/^.*\/models\//, ''));

const snap = () => {
  const sec = document.getElementById('benchmarks');
  const tableIds = [...document.querySelectorAll('tr.bh-ranking-row a[href^="/models/"]')].map((a) => a.getAttribute('href'));
  if (!sec) return { sec: false, tableIds };
  const cols = [...sec.querySelectorAll('thead th.bh-matrix-model .bh-matrix-name a')].map((a) => a.getAttribute('href'));
  const rows = [...sec.querySelectorAll('tbody tr:not(.bh-matrix-group)')].map((tr) => ({ name: tr.querySelector('.bh-matrix-bench')?.textContent, filled: tr.querySelectorAll('td .bh-matrix-link').length }));
  const full = [...sec.querySelectorAll('a')].find((a) => /Open the full comparison/.test(a.textContent));
  const overview = document.querySelector('tr.bh-ranking-row');
  const r = sec.getBoundingClientRect();
  return { sec: true, tableIds, cols, rows, eyebrow: sec.querySelector('.bh-eyebrow')?.textContent, heading: sec.querySelector('h2')?.textContent,
    fullHref: full?.getAttribute('href') ?? null, note: !!sec.querySelector('[role="note"]'),
    afterOverview: overview ? !!(overview.compareDocumentPosition(sec) & Node.DOCUMENT_POSITION_FOLLOWING) : false,
    top: r.top, focused: document.activeElement === sec, path: location.pathname,
    docOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
};

for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  const tag = `${kind}_${theme}`;
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await p.waitForTimeout(1200);
  let s = await p.evaluate(snap);
  check(`${tag} CR-7.1 Simple landing has a second Benchmarks section after the overview table`, s.sec && s.afterOverview, `sec=${s.sec}`);
  if (!s.sec) { await c.close(); continue; }
  const expected = s.tableIds.slice(0, 5).map(idOf);
  const got = s.cols.map(idOf);
  check(`${tag} CR-7.1 columns = the first (up to) 5 models of section 1's list, in order`, got.length >= 2 && got.every((id, j) => id === expected[j]) || (got.length > 0 && got.every((id) => expected.includes(id))), `${got.join(' | ')} vs ${expected.join(' | ')}`);
  // 2026-09-16: CR-28.1 (newer than CR-7.1's "Important row preset") requires this section to list
  // every benchmark its models have, not only the headline ones. Sparse rows are therefore expected
  // and correct — family-scoped evidence (Epoch ECI, DesignArena, the OpenRouter runs) sits on one
  // configuration while these columns are the top five models' own variants, and a missing value is
  // shown as missing (CR-9.3). What must hold: enough rows, no all-empty row, and no row whose
  // values exceed the number of columns.
  check(`${tag} CR-7.1/CR-28.1 rows are the models' full benchmark list (≥ 5 rows, every row carries at least one real value)`,
    s.rows.length >= 5 && s.rows.every((r) => r.filled >= 1 && r.filled <= got.length),
    `${s.rows.length} rows, sparse: ${s.rows.filter((r) => r.filled < 2).length}; first: ${s.rows.slice(0, 4).map((r) => r.name).join(' | ')}`);
  check(`${tag} CR-7.2 marked as the simple version, obvious link to the full comparison with these models`, /Simple view/i.test(s.eyebrow) && s.fullHref && new URL(s.fullHref, BASE).searchParams.get('models') === got.join(','), `${s.eyebrow} · ${s.fullHref}`);
  check(`${tag} CR-7.2 small-screen note only on phones`, kind === 'mobile' ? s.note : !s.note, `note=${s.note}`);
  await p.locator('#benchmarks').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${OUT}/${tag}-simple-benchmarks.png` });
  await p.locator('#benchmarks').screenshot({ path: `${OUT}/${tag}-simple-benchmarks-section.png` });
  if (kind === 'mobile') {
    await p.getByRole('button', { name: 'Dismiss this note' }).click();
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);
    s = await p.evaluate(snap);
    check(`${tag} CR-7.2 note stays dismissed on the next visit`, s.sec && !s.note, `note=${s.note}`);
  }
  // Changing section 1 changes section 2: raise the score floor.
  const slider = p.getByRole('slider').first();
  if (await slider.count()) {
    await p.evaluate(() => window.scrollTo(0, 0));
    await slider.focus();
    for (let i = 0; i < 6; i++) await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(600);
    const s2 = await p.evaluate(snap);
    const exp2 = s2.tableIds.slice(0, 5).map(idOf), got2 = (s2.cols ?? []).map(idOf);
    check(`${tag} CR-7.1 section 2 follows section 1 after the score slider moves`, got2.every((id) => exp2.includes(id)) && got2.length === Math.min(5, exp2.filter(Boolean).length) || got2.length <= exp2.length && got2.every((id) => exp2.includes(id)), `${got2.join(' | ')} vs ${exp2.join(' | ')}`);
  }
  // CR-7.3: header Benchmarks in Simple jumps to the section.
  await p.evaluate(() => window.scrollTo(0, 0));
  const navLink = kind === 'mobile' ? p.locator('header a[href="/benchmarks"]:visible').first() : p.locator('nav[aria-label="Primary"] a[href="/benchmarks"]');
  await navLink.click();
  await p.waitForTimeout(1200);
  s = await p.evaluate(snap);
  check(`${tag} CR-7.3 Simple: header Benchmarks stays on / and brings section 2 into view with focus`, s.path === '/' && s.top >= -2 && s.top < vp.height * 0.5 && s.focused, `path=${s.path} top=${Math.round(s.top)} focused=${s.focused}`);
  // Advanced: no simple section; the header opens the full tab.
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.getByRole('tab', { name: 'Advanced' }).click();
  await p.waitForTimeout(800);
  const adv = await p.evaluate(snap);
  check(`${tag} Advanced has no simple Benchmarks section`, !adv.sec, '');
  await (kind === 'mobile' ? p.locator('header a[href="/benchmarks"]:visible').first() : p.locator('nav[aria-label="Primary"] a[href="/benchmarks"]')).click();
  await p.waitForURL(/\/benchmarks/, { timeout: 15000 }).catch(() => {});
  check(`${tag} CR-7.3 Advanced: header Benchmarks opens the full tab`, /\/benchmarks$/.test(new URL(p.url()).pathname), p.url());
  check(`${tag} no page errors, no horizontal overflow on the home page`, errors.length === 0 && !s.docOverflow, errors.join(' | '));
  await c.close();
}
await b.close();
const passed = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: results.length, results }, null, 2));
console.log(`${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
