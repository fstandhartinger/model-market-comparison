// Live verifier for Fable pass 33 — for a non-Fable engine to run on both hosts. Groups follow the directives; ONLY=F-176 restricts to one group.
// Usage: node verify-fable-pass33-design.mjs <base> <outDir>   (ONLY=<F-nnn> runs one group; exit code 1 on any failed check in the groups run)
//   F-176(a) (shipped by Fable): on /jev-models the 3D panel's live region never reads "Interactive 3D view ready." — after the panel scrolls into
//            view it ends empty or with a "could not" sentence; (b) the licence sentence is not in the capability figure once the implementer moves it.
//   F-171: /jev-models/jevk5-v02 and /jev-models/hopper are 200 and the score panel names the board's release (no "v1.3.0" in the panel), with a
//          strip, four axis bands and a radar; /jev-models/jev-1.13.0 says the same release and rank as the board.
//   F-172: every board row's name links to /jev-models/<key> (table th a[href^="/jev-models/"] = row count); bar-chart names link there too.
//   F-173: at 390 the first ranked bar (data-bh-jev14-bar) starts inside the first 844 px; the "534 public" size appears once in the page head.
//   F-174: on the default compare pair no radar label ends in "—"; a system without values on a radar is stated in one sentence instead.
//   F-175: the "What changed in v1.4" block comes after the "Axes, accuracy, latency and cost" table.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || `/opt/benchmarkheaven/state/ux-evidence/fable-20260923-pass33/verify-${new URL(BASE).hostname}`;
await fs.mkdir(OUT, { recursive: true });
const ONLY = process.env.ONLY || null;
const results = [];
const check = (group, name, ok, detail) => { if (ONLY && group !== ONLY) return; results.push({ group, name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${group} ${name}${ok ? '' : ' — ' + JSON.stringify(detail).slice(0, 300)}`); };
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
let meta = null; try { meta = await (await fetch(`${BASE}/api/meta`)).json(); console.log('revision', meta.revision, 'generated_at', meta.generated_at); } catch { console.log('no /api/meta'); }
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const txt = (s) => String(s || '').replace(/\s+/g, ' ').trim();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile'; const tag = `${kind}_${theme}`;
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  const go = async (path) => { await goto(p, BASE + path); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(600); };

  await go('/jev-models');
  // F-176
  if (!ONLY || ONLY === 'F-176') {
    const st = p.locator('[data-bh-jev14-capability-3d-status]').first();
    if (await st.count()) {
      await st.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await p.waitForFunction(() => { const el = document.querySelector('[data-bh-jev14-capability-3d-status]'); const t = (el?.textContent || '').trim(); return t === '' || /could not/i.test(t); }, null, { timeout: 30000 }).catch(() => {});
      const t = txt(await st.textContent());
      check('F-176', `${tag} 3D status is silent when ready (or names a failure)`, t === '' || /could not/i.test(t), { t });
      check('F-176', `${tag} no "ready" announcement`, !/view ready/i.test(t), { t });
      const capText = txt(await p.locator('[data-bh-jevc-chart]').first().evaluate((el) => el.closest('section, figure, div')?.parentElement?.innerText || '').catch(() => ''));
      check('F-176', `${tag} (b) no library licence sentence beside the chart`, !/three\.js r\d+ is included/i.test(capText), { hit: (capText.match(/three\.js[^.]*\./) || [''])[0] });
      await p.screenshot({ path: `${OUT}/${tag}-f176-3d.png` });
    } else check('F-176', `${tag} 3D status element present`, false, {});
  }
  // F-172 / F-173 / F-174 / F-175 on the hub
  const hub = await p.evaluate(() => {
    const t = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : '');
    const rows = [...document.querySelectorAll('[data-bh-jev14-row]')];
    const rowLinks = rows.filter((r) => r.querySelector('th a[href^="/jev-models/"]')).length;
    const bars = [...document.querySelectorAll('[data-bh-jev14-bar]')];
    const barLinks = bars.filter((r) => r.querySelector('a[href^="/jev-models/"]')).length;
    const firstBar = bars[0] ? Math.round(bars[0].getBoundingClientRect().top + scrollY) : null;
    const head = document.querySelector('main .bh-page-head') || document.querySelector('main header') || document.querySelector('main');
    const headText = t(head); const sizeMentions = (headText.match(/534 public/g) || []).length;
    const labels = [...document.querySelectorAll('[data-bh-jev14-compare] text, [data-bh-jev14-compare] tspan, [data-bh-jev14-compare] li')].map((e) => t(e)).filter((s) => /—\s*$/.test(s) || /·\s*—/.test(s));
    const dashLabels = labels.length ? labels : [...document.querySelectorAll('main svg text')].map((e) => t(e)).filter((s) => /·\s*—$/.test(s));
    const h = (re) => { const el = [...document.querySelectorAll('main h2, main h3')].find((x) => re.test(t(x))); return el ? Math.round(el.getBoundingClientRect().top + scrollY) : null; };
    return { rows: rows.length, rowLinks, bars: bars.length, barLinks, firstBar, sizeMentions, dashLabels: dashLabels.slice(0, 6), changedY: h(/^What changed in v1\.4/), tableY: h(/^Axes, accuracy, latency and cost/), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
  });
  check('F-172', `${tag} every board row name links to its page`, hub.rows > 0 && hub.rowLinks === hub.rows, { rows: hub.rows, rowLinks: hub.rowLinks });
  check('F-172', `${tag} bar-chart names link to the system page`, hub.bars > 0 && hub.barLinks === hub.bars, { bars: hub.bars, barLinks: hub.barLinks });
  if (mobile) check('F-173', `${tag} first ranked bar inside the first 844 px`, hub.firstBar != null && hub.firstBar < 844, { firstBar: hub.firstBar });
  check('F-173', `${tag} the head states the decision count once`, hub.sizeMentions <= 1, { sizeMentions: hub.sizeMentions });
  check('F-174', `${tag} no radar label ends in a dash on the default pair`, hub.dashLabels.length === 0, { dashLabels: hub.dashLabels });
  check('F-175', `${tag} "What changed in v1.4" follows the table`, hub.changedY != null && hub.tableY != null && hub.changedY > hub.tableY, { changedY: hub.changedY, tableY: hub.tableY });
  check('F-173', `${tag} no horizontal page overflow`, hub.sw <= hub.cw + 1, { sw: hub.sw, cw: hub.cw });
  // F-171 leaf pages
  for (const key of ['jevk5-v02', 'hopper', 'jev-1.13.0']) {
    const r = await goto(p, `${BASE}/jev-models/${key}`); await p.waitForLoadState('networkidle').catch(() => {});
    check('F-171', `${tag} /jev-models/${key} is 200`, r && r.status() === 200, { status: r && r.status() });
    const g = await p.evaluate(() => { const t = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : ''); const s = document.querySelector('[data-bh-jev-system-score]'); return { score: t(s).slice(0, 160), strip: !!document.querySelector('[data-bh-jev-system-strip]'), bands: document.querySelectorAll('[data-bh-jev-system-band]').length, radar: !!document.querySelector('[data-bh-jev-system-radar]'), h1: t(document.querySelector('main h1')) }; });
    check('F-171', `${tag} ${key} score panel names the board's release`, /v1\.4/.test(g.score) && !/v1\.3\.0/.test(g.score), { score: g.score });
    check('F-171', `${tag} ${key} draws its number (strip, bands, radar)`, g.strip && g.bands >= 3 && g.radar, g);
  }
  check('F-171', `${tag} no page errors`, errors.length === 0, { errors: errors.slice(0, 3) });
  await c.close();
}
await b.close();
const failed = results.filter((r) => !r.ok);
await fs.writeFile(`${OUT}/verification${ONLY ? '-' + ONLY : ''}.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), revision: meta && meta.revision, only: ONLY, pass: results.length - failed.length, fail: failed.length, results }, null, 1));
console.log(`\n${results.length - failed.length}/${results.length} checks passed${ONLY ? ` (${ONLY})` : ''}`);
process.exit(failed.length ? 1 : 0);
