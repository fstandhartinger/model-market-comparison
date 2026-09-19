// CR-86 live verification (Florian 2026-09-19, JevBench v1.1): /jev-models shows v1.1 with the Main Score first; every
// displayed Main Score recomputes from its displayed sub-scores with the published weights; sub-scores, tiers, latency and
// cost equal the artifact; estimates carry "~ … est.", unknown cost "no tariff", never $0.00; label-only systems read
// "no calibrated distribution" (no blank cell); partial runs below, unranked; the sensitivity table equals rank_under;
// the public JSON equals the committed artifact; v1.0 is linked and reachable — 1440/390 px, light/dark.
// Usage: node verify-cr-86.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-86';
const REV = process.argv[4] || '';
const SHA = '1e280185173f3830a73cf9ebc86c901f82bbc5fe4aec4cb7b4b9fbadcdb6ae3a';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

if (REV) { const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({})); check('deployed revision matches the expected commit', String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV }); }
const res = await fetch(`${BASE}/api/jevbench/v1.1`);
const bytes = Buffer.from(await res.arrayBuffer());
check('public v1.1 JSON is the committed artifact byte for byte', res.ok && createHash('sha256').update(bytes).digest('hex') === SHA, { status: res.status });
const a = JSON.parse(bytes.toString('utf8'));
const sys = Object.fromEntries(a.systems.map((s) => [s.key, s]));
const ranked = a.systems.filter((s) => s.ranked).sort((x, y) => y.main_score - x.main_score).map((s) => s.key);
const partial = a.systems.filter((s) => !s.ranked).map((s) => s.key);
const w = a.weights; const f1 = (v) => (v === null || v === undefined ? '—' : v.toFixed(1));
const v1 = await fetch(`${BASE}/jev-models/v1`);
check('v1.0 page still reachable', v1.status === 200, v1.status);

const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const r = await page.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 90000 });
  check(`${tag}: page 200 and v1.1 title`, r.status() === 200 && (await page.title()).startsWith('Jev-class decision models — JevBench v1.1'), await page.title());
  check(`${tag}: lead says it is our own benchmark`, /own benchmark/.test(await page.locator('[data-bh-jev-own]').innerText()), '');
  check(`${tag}: page sha = artifact, v1.0 linked`, (await page.locator('[data-bh-jev-sha]').getAttribute('data-bh-jev-sha')) === SHA && (await page.locator('[data-bh-jev-v1-link]').getAttribute('href')) === '/jev-models/v1', '');
  const rows = await page.$$eval('[data-bh-jev11-table] tbody tr[data-bh-jev11-row]', (els) => els.map((e) => ({ key: e.getAttribute('data-bh-jev11-row'), ranked: e.getAttribute('data-bh-jev11-ranked'), cells: [...e.children].map((x) => x.innerText.trim()) })));
  check(`${tag}: default order = Main Score desc, partial runs after, unranked`, JSON.stringify(rows.map((x) => x.key)) === JSON.stringify([...ranked, ...rows.filter((x) => x.ranked === '0').map((x) => x.key)]) && rows.filter((x) => x.ranked === '0').every((x) => x.cells[0] === '' && partial.includes(x.key)), rows.map((x) => x.key));
  const bad = [];
  for (const x of rows) {
    const s = sys[x.key]; const [, , main, cap, spd, cost, easy, std, judge, , usd, cal] = x.cells;
    const shown = [main, cap, spd, cost].map((t) => (t === '—' ? null : Number(t)));
    if (main !== f1(s.main_score) || cap !== f1(s.capability.score) || spd !== f1(s.speed.score) || cost !== f1(s.cost.score)) bad.push({ key: x.key, why: 'sub/main text', cells: x.cells.slice(2, 6) });
    if (s.ranked && Math.abs(w.capability * shown[1] + w.speed * shown[2] + w.cost * shown[3] - shown[0]) > 0.15) bad.push({ key: x.key, why: 'main does not recompute from displayed parts' });
    for (const [t, cell] of [['easy', easy], ['standard', std], ['judge', judge]]) { const v = s.capability.tier_accuracy[t]; if (!cell.startsWith(v === null ? '—' : `${(v * 100).toFixed(1)}%`)) bad.push({ key: x.key, why: `tier ${t}`, cell }); }
    const k = s.cost.kind;
    if (k === 'unknown' ? !/no tariff/.test(usd) : k === 'estimate' ? !(usd.startsWith(`~$${s.cost.usd_per_1000.toFixed(3)}`) && /est\./.test(usd)) : usd !== `$${s.cost.usd_per_1000.toFixed(3)}`) bad.push({ key: x.key, why: 'cost', usd });
    if (!cal || (s.has_distribution === false && !/no calibrated distribution/.test(cal))) bad.push({ key: x.key, why: 'calibration cell', cal });
  }
  check(`${tag}: every row equals the artifact; every ranked Main Score recomputes from its shown parts`, bad.length === 0, bad);
  check(`${tag}: no $0.00 anywhere`, !/\$0\.00(?!\d)|\$0(?![.\d])/.test(await page.locator('main').innerText()), '');
  const sens = await page.$$eval('[data-bh-jev11-sens-row]', (els) => els.map((e) => ({ key: e.getAttribute('data-bh-jev11-sens-row'), ranks: [...e.querySelectorAll('[data-bh-jev11-rank]')].map((td) => [Number(td.getAttribute('data-bh-jev11-rank')), td.getAttribute('data-bh-jev11-moved')]) })));
  const sensBad = sens.filter((x) => a.sensitivity_order.some((k, i) => x.ranks[i]?.[0] !== sys[x.key].rank_under[k] || (x.ranks[i]?.[1] === '1') !== (sys[x.key].rank_under[k] !== sys[x.key].rank_under[a.sensitivity_order[0]])));
  check(`${tag}: sensitivity table = rank_under, moved cells highlighted`, sens.length === ranked.length && sensBad.length === 0, sensBad);
  const sorts = [];
  for (const col of ['main', 'capability', 'speed', 'cost', 'easy', 'standard', 'judge', 'p50', 'usd', 'brier']) {
    await page.locator(`[data-bh-jev11-sort="${col}"]`).click();
    sorts.push([col, await page.locator(`th:has([data-bh-jev11-sort="${col}"])`).getAttribute('aria-sort')]);
    if (col === 'brier') {
      const order = await page.$$eval('[data-bh-jev11-table] tbody tr[data-bh-jev11-ranked="1"]', (els) => els.map((e) => e.getAttribute('data-bh-jev11-row')));
      const nulls = order.map((k) => sys[k].calibration.brier_standard_judge === null); const first = nulls.indexOf(true);
      check(`${tag}: calibration sort — systems without a distribution last`, first < 0 || nulls.slice(first).every(Boolean), order);
    }
  }
  check(`${tag}: all ten columns sortable with aria-sort`, sorts.every(([, s]) => s === 'ascending' || s === 'descending'), sorts);
  const bars = await page.$$eval('[data-bh-jev11-bar]', (els) => els.map((e) => e.getAttribute('data-bh-jev11-bar')));
  check(`${tag}: Main Score chart lists ranked then partial`, JSON.stringify(bars.slice(0, ranked.length)) === JSON.stringify(ranked) && bars.length === a.systems.length, bars);
  check(`${tag}: formula in words beside the chart`, /Main = 0\.6 × Capability \+ 0\.2 × Speed \+ 0\.2 × Cost/.test(await page.locator('[data-bh-jev11-formula]').innerText()), '');
  check(`${tag}: no defective pooled accuracy on the page`, !/pooled/i.test(await page.locator('[data-bh-jev11-table]').innerText()), '');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`${tag}: no horizontal page overflow`, overflow <= 0, overflow);
  check(`${tag}: no page errors`, errors.length === 0, errors);
  await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: !mobile });
  if (mobile) { await page.locator('[data-bh-jev11-main-chart]').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${OUT}/${tag}-chart.png` }); }
  await c.close();
}
await b.close();
const pass = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), pass, total: checks.length, checks }, null, 2));
console.log(`${pass}/${checks.length}`); for (const x of checks.filter((y) => !y.ok)) console.log('FAIL', x.name, x.detail.slice(0, 400));
