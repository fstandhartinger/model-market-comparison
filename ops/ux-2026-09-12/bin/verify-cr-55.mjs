// CR-55.1/55.2 (CR-20260916p): switching Simple → Guided → Advanced → Simple never moves the page shell, header,
// mode switch or main content horizontally. Desktop runs with a classic, space-taking scrollbar (Playwright's default
// --hide-scrollbars removed), where the bug showed: Guided is shorter than the viewport, the scrollbar disappeared and
// the centred shell jumped. Phones use overlay scrollbars. Positions are read immediately after the switch and again
// after 800 ms (no compensating animation), with mouse and keyboard activation, light and dark.
// Usage: BH_RUNNER=<engine> node verify-cr-55.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-55';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const CONFIGS = [['desktop-1440', { width: 1440, height: 900 }, false], ['desktop-1024', { width: 1024, height: 768 }, false], ['mobile-390', { width: 390, height: 844 }, true]];
for (const theme of ['light', 'dark']) for (const [kind, vp, mobile] of CONFIGS) {
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1, reducedMotion: 'reduce' });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, BASE + '/'); await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200);
  const pos = () => page.evaluate(() => {
    const left = (el) => el ? Math.round(el.getBoundingClientRect().left * 10) / 10 : null;
    const de = document.documentElement;
    return { header: left(document.querySelector('header')), logo: left(document.querySelector('header a')), tabs: left(document.querySelector('[role=tablist][aria-label="View mode"]')),
      main: left(document.querySelector('main')), mainRight: Math.round((document.querySelector('main')?.getBoundingClientRect().right ?? 0) * 10) / 10, section: left(document.querySelector('section[aria-label="Recommendation mode"]')),
      clientWidth: de.clientWidth, overflowX: de.scrollWidth - de.clientWidth, scrolls: de.scrollHeight > de.clientHeight };
  });
  const same = (a, bb) => ['header', 'logo', 'tabs', 'main', 'mainRight', 'section'].every((k) => a[k] === bb[k]);
  const base = await pos();
  const classic = !mobile ? await page.evaluate(() => window.innerWidth - document.documentElement.clientWidth) : 0;
  if (!mobile) check(`${tag} classic scrollbar configuration is active (gutter ${classic}px)`, classic > 0, { classic });
  const seq = [];
  for (const [m, how] of [['Guided', 'mouse'], ['Advanced', 'mouse'], ['Simple', 'mouse'], ['Guided', 'keyboard'], ['Advanced', 'keyboard'], ['Simple', 'keyboard']]) {
    const tab = page.getByRole('tab', { name: m });
    if (how === 'mouse') { if (mobile) await tab.tap(); else await tab.click(); }
    else { await tab.focus(); await page.keyboard.press('Enter'); }
    const now = await pos(); await page.waitForTimeout(800); const later = await pos();
    const selected = await tab.getAttribute('aria-selected'); const focused = how === 'keyboard' ? await tab.evaluate((el) => document.activeElement === el) : true;
    seq.push({ m, how, now, later });
    check(`${tag} ${how} → ${m}: header, logo, mode switch, main and section keep their x (immediately and after 800 ms)`, same(base, now) && same(base, later), { base, now, later });
    check(`${tag} ${how} → ${m}: no horizontal page overflow`, now.overflowX <= 0 && later.overflowX <= 0, { now: now.overflowX, later: later.overflowX });
    check(`${tag} ${how} → ${m}: tab is selected${how === 'keyboard' ? ' and keeps focus' : ''}`, selected === 'true' && focused, { selected, focused });
    if (m === 'Guided' && how === 'mouse') { check(`${tag} Guided is the short-content case (page ${later.scrolls ? 'scrolls' : 'does not scroll'})`, true, later); await page.screenshot({ path: `${OUT}/${tag}-guided.png` }); }
  }
  // Scrolling still works after the switches.
  await page.evaluate(() => window.scrollTo(0, 600)); await page.waitForTimeout(200);
  check(`${tag} page still scrolls vertically in Simple`, (await page.evaluate(() => window.scrollY)) > 0, '');
  check(`${tag} no page errors`, errors.length === 0, errors);
  await fs.writeFile(`${OUT}/${tag}-positions.json`, JSON.stringify({ base, seq }, null, 1));
  await c.close();
}
await b.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || 'unknown', at: new Date().toISOString(), passed, total: checks.length, allPass: passed === checks.length, checks }, null, 1));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.ok ? '' : ' — ' + c.detail.slice(0, 600)}`);
console.log(`${passed}/${checks.length}${passed === checks.length ? ' ALL PASS' : ''}`);
process.exit(passed === checks.length ? 0 : 1);
