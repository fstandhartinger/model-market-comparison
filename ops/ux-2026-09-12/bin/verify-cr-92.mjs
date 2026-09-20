// CR-92 live verification (Florian 2026-09-19): /jev-models defaults to the JevBench Score (4 axes, geometric mean) from the v1.2
// final artifact; every chart value equals the artifact; the Speed honesty line is on chart, table and formula; one
// open-alternative-jev row + footnote; partial runs unranked; presets/custom re-rank as geometric means with the not-default
// state; WIP banner and noindex gone; page in the menu and sitemap — 1440/390 px, light/dark, no page errors.
// Usage: node verify-cr-92.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-92';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const a = await (await fetch(`${BASE}/api/jevbench/v1.2`)).json();
const ranked = a.systems.filter((s) => s.ranked);
const AX = ['intelligence', 'calibration', 'speed', 'cost'];
const geo = (s, w) => { const t = w.reduce((x, y) => x + y, 0); return Math.exp(AX.reduce((l, k, i) => l + (w[i] > 0 ? (w[i] / t) * Math.log(Math.max(s.axes[k] ?? 0, 1)) : 0), 0)); };
const expectOrder = (w) => ranked.map((s) => ({ k: s.key, v: geo(s, w), o: s.rank })).sort((x, y) => y.v - x.v || x.o - y.o).map((x) => x.k);
const PRESETS = { score: [[25, 25, 25, 25], 'JevBench Score (Intelligence, Calibration, Speed, Cost — 25 % each)'], balanced: [[1, 0, 1, 1], 'Balanced 33:33:33 (Intelligence, Speed, Cost; no calibration)'],
  accuracy: [[60, 0, 20, 20], 'Emphasis on Accuracy (60:20:20, no calibration)'], speed: [[20, 0, 60, 20], 'Emphasis on Speed (20:60:20, no calibration)'], cost: [[20, 0, 20, 60], 'Emphasis on Cost (20:20:60, no calibration)'] };
check('artifact: v1.2 final', ['v1.2', 'v1.2.1', 'v1.2.2', 'v1.2.3'].includes(a.revision) && a.status === 'final', a.status);
check('artifact: one open-alternative-jev row', a.systems.filter((s) => s.key.startsWith('open-alternative-jev')).length === 1, '');
const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
check('sitemap lists /jev-models and /jev-models/v1', /\/jev-models<\/loc>/.test(sm) && /\/jev-models\/v1<\/loc>/.test(sm), '');
const html = await (await fetch(`${BASE}/jev-models`)).text();
check('no noindex, no WIP banner in the HTML', !/noindex/.test(html) && !/data-bh-jev-wip/.test(html) && !/preliminary/i.test(html), '');
const html1 = await (await fetch(`${BASE}/jev-models/v1`)).text();
check('/jev-models/v1: no noindex, no WIP banner', !/noindex/.test(html1) && !/data-bh-jev-wip/.test(html1), '');

const b = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
    const m = kind === 'mobile'; const tag = `${kind}_${theme}`;
    const c = await b.newContext({ viewport: vp, isMobile: m, hasTouch: m, colorScheme: theme, deviceScaleFactor: m ? 2 : 1 });
    await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
    await p.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 90000 });
    const bars = () => p.$$eval('[data-bh-jevc-bars] [data-bh-jev12-bar]', (e) => e.map((x) => x.getAttribute('data-bh-jev12-bar')));
    const title = () => p.textContent('[data-bh-jevc-title]');
    const header = async () => (await p.textContent('[data-bh-jev12-sort="main"]')).trim();
    check(`${tag}: menu has the Jev page`, (await p.$$('header a[href="/jev-models"], nav a[href="/jev-models"]')).length >= 1, '');
    check(`${tag}: default title is the JevBench Score`, (await title()) === PRESETS.score[1], await title());
    check(`${tag}: one-line explanation`, ((await p.textContent('[data-bh-jev12-oneliner]')) || '').includes('25 % each, geometric mean: a weak axis pulls the score down hard'), '');
    check(`${tag}: default chart order = official ranking`, JSON.stringify((await bars()).slice(0, ranked.length)) === JSON.stringify(ranked.map((s) => s.key)), await bars());
    const shown = await p.$$eval('[data-bh-jevc-bars] [data-bh-jev12-bar]', (e) => e.map((x) => [x.getAttribute('data-bh-jev12-bar'), x.querySelector('[data-bh-jev12-main]').textContent.trim()]));
    check(`${tag}: every chart value = artifact (1 decimal)`, shown.length === a.systems.length && shown.every(([k, v]) => a.systems.find((s) => s.key === k).jevbench_score.toFixed(1) === v), shown.slice(0, 3));
    check(`${tag}: partial runs have no rank`, (await p.$$eval('[data-bh-jevc-bars] [data-bh-jev12-bar]', (e) => e.filter((x) => x.textContent.includes('partial run')).map((x) => x.querySelector('[data-bh-jevc-rank]').textContent))).every((r) => r === ''), '');
    const notes = await p.$$eval('[data-bh-jev12-speed-note]', (e) => e.filter((x) => x.offsetParent !== null || getComputedStyle(x).display !== 'none').map((x) => x.textContent));
    check(`${tag}: speed honesty line on chart, table and formula`, notes.length >= 3 && notes.every((t) => /adjusted ×2/.test(t) && /assumption/.test(t)), notes.length);
    check(`${tag}: option-order footnote`, ((await p.textContent('[data-bh-jev12-footnote="open-alternative-jev"]')) || '').includes('21 % instead of 72 %'), '');
    check(`${tag}: raw latency in the table`, (await p.$$('[data-bh-jev12-latency]')).length === a.systems.length, '');
    check(`${tag}: official badge only`, (await p.$('[data-bh-jevc-badge="official"]')) && !(await p.$('[data-bh-jevc-badge="not-default"]')), '');
    const links = await p.$$eval('[data-bh-jevc-bars] a[data-bh-jev-link]', (e) => e.map((x) => x.href));
    check(`${tag}: every system in the chart links out`, links.length === a.systems.length && links.every((h) => h.startsWith('https://')), links.length);
    for (const [id, [w, name]] of Object.entries(PRESETS)) {
      await p.click(`[data-bh-jevc-preset="${id}"]`); await p.waitForTimeout(250);
      const off = id !== 'score';
      check(`${tag}: preset ${id} title`, (await title()) === name, await title());
      check(`${tag}: preset ${id} re-ranks (geometric)`, JSON.stringify((await bars()).slice(0, ranked.length)) === JSON.stringify(expectOrder(w)), await bars());
      check(`${tag}: preset ${id} not-default state`, off === !!(await p.$('[data-bh-jevc-badge="not-default"]')) && off === !!(await p.$('[data-bh-jevc-reset]')) && off === /not the official/.test(await header()), await header());
      if (id === 'accuracy') await p.screenshot({ path: `${OUT}/${tag}-accuracy.png`, fullPage: false });
    }
    await p.click('[data-bh-jevc-preset="accuracy"]'); await p.waitForTimeout(200);
    check(`${tag}: URL carries the weighting`, p.url().endsWith('?w=60-0-20-20'), p.url());
    await p.click('[data-bh-jevc-reset]'); await p.waitForTimeout(200);
    check(`${tag}: reset returns to the JevBench Score and a clean URL`, (await title()) === PRESETS.score[1] && !p.url().includes('?'), p.url());
    await p.goto(`${BASE}/jev-models?w=50-10-20-20`, { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
    check(`${tag}: shared custom URL restores, labelled not official`, (await title()) === 'Custom weights (50:10:20:20) — not the official JevBench Score' && JSON.stringify((await bars()).slice(0, ranked.length)) === JSON.stringify(expectOrder([50, 10, 20, 20])), await title());
    check(`${tag}: no horizontal overflow`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), '');
    await p.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle' });
    await (await p.$('[data-bh-jevc-hero]')).screenshot({ path: `${OUT}/${tag}-default.png` });
    await p.screenshot({ path: `${OUT}/${tag}-full.png`, fullPage: true });
    check(`${tag}: no page errors`, errors.length === 0, errors);
    await c.close();
  }
} finally { await b.close(); }
const failed = checks.filter((x) => !x.ok);
await fs.writeFile(`${OUT}/verify-cr-92.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), checks }, null, 1));
for (const f of failed) console.log('FAIL', f.name, f.detail.slice(0, 300));
console.log(`${checks.length - failed.length}/${checks.length}`);
process.exit(failed.length ? 1 : 0);
