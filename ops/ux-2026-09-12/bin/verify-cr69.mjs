// CR-69.5: live check of the recalibrated Benchmaxxing signal. /benchmaxxing (tag list, drivers, radar side markers,
// no unevenness/level wording), /about tier table, Overview tag column, model pages. 1440/390 × light/dark screenshots.
// Usage: node verify-cr69.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter96-cr69/live';
await fs.mkdir(OUT, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => { checks.push({ name, ok: Boolean(ok), detail }); };
const api = async (path) => (await fetch(BASE + path)).json();
const meta = await api('/api/meta').catch(() => ({}));
// API: GPT-6 Astra ≈ −7, untagged; MiMo-V2.5-Pro strong.
const astra = (await api('/api/benchmaxxing?report=gpt-6-astra::max')).report;
check('api: GPT-6 Astra score ≈ −7.0 (±0.2)', astra?.score != null && Math.abs(astra.score + 7.0) <= 0.2, astra?.score);
check('api: report carries drivers (3 positive / 3 negative) and interval', astra?.drivers?.positive?.length === 3 && astra?.drivers?.negative?.length === 3 && astra?.interval, JSON.stringify(astra?.interval));
const mimo = (await api('/api/benchmaxxing?report=mimo-v2.5-pro::default')).report;
check('api: MiMo-V2.5-Pro score ≈ +9.2 (±0.2) with interval lower > 0', mimo?.score != null && Math.abs(mimo.score - 9.2) <= 0.2 && mimo.interval?.lower > 0, `${mimo?.score} ${JSON.stringify(mimo?.interval)}`);
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const errors = {};
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile', tag = `${kind}_${theme}`;
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  errors[tag] = [];
  p.on('pageerror', (e) => errors[tag].push(String(e.message).slice(0, 300)));
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1500); };
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await settle(); };
  await go('/benchmaxxing');
  const rows = await p.$$eval('tr[data-row-id]', (trs) => trs.map((tr) => ({ id: tr.getAttribute('data-row-id'), level: tr.querySelector('.bh-signal-pill')?.getAttribute('data-level') ?? null, text: tr.innerText.replace(/\s+/g, ' ').slice(0, 80) })));
  const text = await p.evaluate(() => document.body.innerText);
  await p.screenshot({ path: `${OUT}/${tag}-benchmaxxing-top.png` });
  if (tag === 'desktop_light') {
    check('/benchmaxxing default list = 8 strong-tagged families', rows.length === 8 && rows.every((r) => r.level === 'strong'), rows.map((r) => r.id).join(', '));
    check('/benchmaxxing strongest list includes MiMo-V2.5-Pro, excludes GPT-6 Astra', rows.some((r) => r.id.startsWith('mimo-v2.5-pro')) && !rows.some((r) => r.id.startsWith('gpt-6-astra')));
    check('/benchmaxxing copy: no "unevenness" / "level factor" / "adjusted for the model" as the score', !/unevenness|level factor|adjusted for where the model sits|adjusted for the model/i.test(text));
  }
  await go('/benchmaxxing?model=gpt-6-astra::max#radar');
  await p.waitForSelector('[data-bmx-drivers]', { timeout: 60000 }).catch(() => {});
  const drivers = await p.$eval('[data-bmx-drivers]', (n) => n.innerText).catch(() => '');
  const sides = await p.$$eval('[data-radar-side]', (ns) => ns.map((n) => n.getAttribute('data-radar-side')));
  const pill = await p.$eval('#radar', (n) => n.innerText).catch(() => '');
  await p.$eval('#radar', (n) => n.scrollIntoView()).catch(() => {});
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/${tag}-astra-report.png`, fullPage: false });
  await p.$eval('[data-bmx-drivers]', (n) => n.scrollIntoView()).catch(() => {});
  await p.screenshot({ path: `${OUT}/${tag}-astra-drivers.png`, fullPage: false });
  check(`${tag}: Astra report shows "What drives this score" with both directions`, /What drives this score/.test(drivers) && /Better on the headline board/i.test(drivers) && /Better on the held-out board/i.test(drivers), drivers.slice(0, 200));
  check(`${tag}: Astra report radar marks headline, held-out and unused axes`, sides.includes('headline') && sides.includes('heldout') && sides.includes('unused'), [...new Set(sides)].join(','));
  check(`${tag}: Astra signal shows −7.0 without a tag pill`, /-7\.0/.test(pill) && !/⚠|△/.test(pill), (pill.match(/.{0,40}-7\.0.{0,40}/s) ?? [''])[0]);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`${tag}: no horizontal page overflow on the report`, overflow <= 1, overflow);
  await go('/about#benchmaxxing');
  const tierRows = await p.$$eval('[data-bmx-tier-table] tbody tr', (trs) => trs.length).catch(() => 0);
  await p.$eval('#benchmaxxing', (n) => n.scrollIntoView()).catch(() => {});
  await p.screenshot({ path: `${OUT}/${tag}-about-benchmaxxing.png` });
  check(`${tag}: /about tier table has 56 rows`, tierRows === 56, tierRows);
  if (tag === 'desktop_light') {
    const about = await p.evaluate(() => document.getElementById('benchmaxxing')?.nextElementSibling?.innerText ?? '');
    check('/about: three-sentence rule present (headline / held-out / pulled toward zero)', /headline/.test(about) && /held-out/.test(about) && /pulled toward zero/.test(about), about.slice(0, 160));
    await go('/?view=advanced');
    const tagged = await p.$$eval('[data-bh-tag-legend="benchmaxxing"], .bh-bmx-tag', (ns) => ns.length);
    const astraRowTag = await p.evaluate(() => [...document.querySelectorAll('tr')].filter((tr) => /GPT-6 Astra/.test(tr.innerText)).some((tr) => tr.querySelector('.bh-bmx-tag')));
    await p.screenshot({ path: `${OUT}/${tag}-overview.png` });
    check('Overview: GPT-6 Astra rows carry no Benchmaxxing tag', !astraRowTag, `tags on page ${tagged}`);
    await go('/models/gpt-6-astra');
    const modelBmx = await p.$('[data-bh-model-benchmaxxing]');
    check('model page GPT-6 Astra: no Benchmaxxing tag line', !modelBmx);
  }
  await c.close();
}
await b.close();
const out = { base: BASE, revision: meta.revision ?? null, at: new Date().toISOString(), pass: checks.filter((c) => c.ok).length, total: checks.length, checks, errors };
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(out, null, 1));
console.log(`${out.pass}/${out.total}`, out.revision);
for (const c of checks) if (!c.ok) console.log('FAIL', c.name, c.detail);
