// CR-53.1–53.3 (CR-20260916n, user report "the information window doesn't stay open"): information panels that hold
// links stay open while the pointer travels from the (i) into the panel, their links are clickable, keyboard users can
// Tab into them and out again, Escape/outside closes and focus returns, touch keeps an explicit open/close modal.
// Audited on the shared InfoTip primitive: Overview Score and Adjusted Cost headers, the Simple adjusted-cost setting
// (a further interactive panel), and the Benchmaxxing Signal column (a non-interactive panel that stays a tooltip).
// Usage: BH_RUNNER=<engine> node verify-cr-53.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-53';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

const PANEL = '[data-bh-infotip-panel]';
const INTERACTIVE = [
  { label: 'the Score column', link: /^How we calculate$/, hash: '#score', name: 'Overview Score header' },
  { label: 'the Adjusted Cost column', link: /^How we calculate$/, hash: '#adjusted-cost', name: 'Overview Adjusted Cost header' },
  { label: 'the adjusted cost setting', link: /^How we calculate$/, hash: '#adjusted-cost', name: 'Simple adjusted-cost setting' },
];

const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  const go = async (path) => { await goto(page, BASE + path); await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); };
  const panelCount = () => page.locator(PANEL).count();
  const trig = (label) => page.locator(`button[data-bh-infotip-trigger][aria-label="About ${label}"]`).first();
  const center = async (loc) => { const r = await loc.boundingBox(); return r && { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  const place = async (t) => { await t.evaluate((el) => { const r = el.getBoundingClientRect(); window.scrollBy(0, r.top - 140); }); await page.waitForTimeout(250); };

  for (const spec of INTERACTIVE) {
    await go('/');
    const t = trig(spec.label);
    if (!(await t.count())) { check(`${tag} ${spec.name}: (i) trigger present`, false, spec.label); continue; }
    await place(t);
    if (!mobile) {
      const sortBefore = await page.evaluate(() => [...document.querySelectorAll('th[aria-sort]')].map((th) => th.getAttribute('aria-sort')).join(','));
      const tc = await center(t); await page.mouse.move(tc.x, tc.y); await page.waitForTimeout(250);
      check(`${tag} ${spec.name}: hover opens the panel, trigger says expanded and controls it`, (await panelCount()) === 1 && (await t.getAttribute('aria-expanded')) === 'true' && !!(await t.getAttribute('aria-controls')), { panels: await panelCount(), expanded: await t.getAttribute('aria-expanded') });
      const panel = page.locator(PANEL).first();
      const role = await panel.getAttribute('role'), aria = await panel.getAttribute('aria-label');
      check(`${tag} ${spec.name}: a panel with links is a labelled non-modal dialog (trigger aria-haspopup=dialog)`, role === 'dialog' && !!aria && (await t.getAttribute('aria-haspopup')) === 'dialog', { role, aria });
      const link = panel.getByRole('link', { name: spec.link }).first();
      const lc = await center(link);
      // Travel slowly from the (i) to the link, crossing the gap; the panel must survive every intermediate step.
      let survived = true; const steps = 24;
      for (let i = 1; i <= steps; i++) { await page.mouse.move(tc.x + (lc.x - tc.x) * i / steps, tc.y + (lc.y - tc.y) * i / steps); await page.waitForTimeout(25); if ((await panelCount()) !== 1) { survived = false; break; } }
      await page.waitForTimeout(500);
      check(`${tag} ${spec.name}: pointer travels from the (i) to "How we calculate" and the panel stays open (incl. 500 ms dwell)`, survived && (await panelCount()) === 1, { survived, panels: await panelCount() });
      const hit = await link.evaluate((a) => { const r = a.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && (e === a || a.contains(e)); });
      check(`${tag} ${spec.name}: the link is the element under the pointer (not covered, pointer events on)`, hit, '');
      const credit = await panel.locator('[data-aa-credit] a').count();
      check(`${tag} ${spec.name}: source credit link is inside the panel`, credit >= 1, { credit });
      // A click on panel text must not sort the table the (i) sits in.
      const titleBox = await panel.locator('span').first().boundingBox();
      if (titleBox) { await page.mouse.click(titleBox.x + 4, titleBox.y + titleBox.height / 2); await page.waitForTimeout(300); }
      const sortAfter = await page.evaluate(() => [...document.querySelectorAll('th[aria-sort]')].map((th) => th.getAttribute('aria-sort')).join(','));
      check(`${tag} ${spec.name}: clicking inside the panel does not sort the table and keeps the panel open`, sortAfter === sortBefore && (await panelCount()) === 1, { sortBefore, sortAfter, panels: await panelCount() });
      const lc2 = await center(link); await page.mouse.move(lc2.x, lc2.y); await page.mouse.click(lc2.x, lc2.y);
      await page.waitForURL((u) => u.pathname === '/about', { timeout: 15000 }).catch(() => {});
      check(`${tag} ${spec.name}: mouse click on "How we calculate" opens /about${spec.hash}`, new URL(page.url()).pathname === '/about' && new URL(page.url()).hash === spec.hash, page.url());
      if (spec.name !== 'Overview Score header') continue;

      // Leaving closes after the grace period; click pins; Escape and outside pointer-down close.
      await go('/'); const t2 = trig(spec.label); await place(t2);
      const c2 = await center(t2); await page.mouse.move(c2.x, c2.y); await page.waitForTimeout(250);
      await page.mouse.move(20, vp.height - 20, { steps: 4 }); await page.waitForTimeout(700);
      check(`${tag} hover-only panel closes once the pointer has left trigger and panel`, (await panelCount()) === 0 && (await t2.getAttribute('aria-expanded')) === 'false', { panels: await panelCount() });
      await page.mouse.move(c2.x, c2.y); await page.waitForTimeout(150); await page.mouse.click(c2.x, c2.y); await page.waitForTimeout(150);
      await page.mouse.move(20, vp.height - 20, { steps: 4 }); await page.waitForTimeout(700);
      check(`${tag} a click pins the panel open after the pointer leaves`, (await panelCount()) === 1, { panels: await panelCount() });
      await page.screenshot({ path: `${OUT}/${tag}-score-pinned.png` });
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      check(`${tag} Escape closes a pinned panel`, (await panelCount()) === 0, '');
      await page.mouse.move(c2.x, c2.y); await page.mouse.click(c2.x, c2.y); await page.waitForTimeout(200);
      await page.mouse.click(vp.width - 30, vp.height - 30); await page.waitForTimeout(250);
      check(`${tag} a pointer-down outside closes a pinned panel`, (await panelCount()) === 0, '');

      // Keyboard: reach the (i) with Tab from the sort button before it, Tab into the panel, through it and out.
      const sortBtn = t2.locator('xpath=ancestor::th[1]').locator('button').first();
      await sortBtn.focus(); await page.keyboard.press('Tab'); await page.waitForTimeout(250);
      const onTrigger = await t2.evaluate((el) => document.activeElement === el);
      check(`${tag} keyboard: Tab onto the (i) opens its panel`, onTrigger && (await panelCount()) === 1, { onTrigger, panels: await panelCount() });
      await page.keyboard.press('Tab'); await page.waitForTimeout(150);
      const first = await page.evaluate((sel) => { const a = document.activeElement; return { inPanel: !!a?.closest(sel), text: a?.textContent?.trim() }; }, PANEL);
      check(`${tag} keyboard: Tab from the (i) moves into the panel's first link`, first.inPanel && /How we calculate/.test(first.text || ''), first);
      await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(150);
      check(`${tag} keyboard: Shift+Tab from the first link returns to the (i), panel still open`, (await t2.evaluate((el) => document.activeElement === el)) && (await panelCount()) === 1, '');
      await page.keyboard.press('Tab'); await page.waitForTimeout(100);
      const inside = await page.locator(`${PANEL} a[href]`).count();
      for (let i = 1; i < inside; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(60); }
      const last = await page.evaluate((sel) => !!document.activeElement?.closest(sel), PANEL);
      await page.keyboard.press('Tab'); await page.waitForTimeout(250);
      const after = await page.evaluate((sel) => ({ inPanel: !!document.activeElement?.closest(sel), tag: document.activeElement?.tagName, text: (document.activeElement?.textContent || '').trim().slice(0, 40), inHead: !!document.activeElement?.closest('thead') }), PANEL);
      check(`${tag} keyboard: Tab past the last of ${inside} panel links continues after the (i) and closes the panel`, last && !after.inPanel && after.tag !== 'BODY' && (await panelCount()) === 0, { last, after });
      await sortBtn.focus(); await page.waitForTimeout(150); await page.keyboard.press('Tab'); await page.waitForTimeout(250); await page.keyboard.press('Tab'); await page.waitForTimeout(150);
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      check(`${tag} keyboard: Escape inside the panel closes it and returns focus to the (i)`, (await panelCount()) === 0 && (await t2.evaluate((el) => document.activeElement === el)), '');
      await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      check(`${tag} keyboard: Enter on the focused (i) reopens the panel after Escape`, (await panelCount()) === 1, '');
      await page.keyboard.press('Tab'); await page.waitForTimeout(150); await page.keyboard.press('Enter');
      await page.waitForURL((u) => u.pathname === '/about', { timeout: 15000 }).catch(() => {});
      check(`${tag} keyboard: Enter on the panel link navigates to /about#score`, new URL(page.url()).pathname === '/about' && new URL(page.url()).hash === '#score', page.url());

      // Row interaction still works after the panel work.
      await go('/'); const row = page.locator('tr.bh-ranking-row').first(); await row.scrollIntoViewIfNeeded(); await row.click(); await page.waitForTimeout(700);
      check(`${tag} table rows still expand on click`, (await page.locator('[data-pane="providers"]').count()) >= 1, '');
    } else {
      await t.tap(); await page.waitForTimeout(400);
      const dlg = page.locator('dialog[open]');
      check(`${tag} ${spec.name}: tap opens the modal with a ✕ and its title`, (await dlg.count()) === 1 && (await dlg.getByRole('button', { name: 'Close' }).count()) === 1 && !!(await dlg.getAttribute('aria-label')), '');
      if (spec.name === 'Overview Score header') await page.screenshot({ path: `${OUT}/${tag}-score-modal.png` });
      await dlg.getByRole('button', { name: 'Close' }).tap(); await page.waitForTimeout(300);
      const focusBack = await t.evaluate((el) => document.activeElement === el);
      check(`${tag} ${spec.name}: ✕ closes the modal and focus returns to the (i)`, (await page.locator('dialog[open]').count()) === 0 && focusBack, { focusBack });
      await t.tap(); await page.waitForTimeout(400);
      await page.touchscreen.tap(6, 6); await page.waitForTimeout(300);
      check(`${tag} ${spec.name}: a tap on the backdrop closes the modal`, (await page.locator('dialog[open]').count()) === 0, '');
      await t.tap(); await page.waitForTimeout(400);
      const mlink = page.locator('dialog[open]').getByRole('link', { name: spec.link }).first();
      await mlink.tap();
      await page.waitForURL((u) => u.pathname === '/about', { timeout: 15000 }).catch(() => {});
      check(`${tag} ${spec.name}: tapping "How we calculate" in the modal opens /about${spec.hash}`, new URL(page.url()).pathname === '/about' && new URL(page.url()).hash === spec.hash, page.url());
    }
  }

  // A non-interactive panel keeps plain tooltip behaviour (intentional exception, CR-53.2).
  await go('/benchmaxxing');
  const sig = trig('the Signal column');
  if (await sig.count()) {
    await place(sig);
    if (!mobile) {
      const sc = await center(sig); await page.mouse.move(sc.x, sc.y); await page.waitForTimeout(300);
      const role = await page.locator(PANEL).first().getAttribute('role').catch(() => null);
      check(`${tag} Benchmaxxing Signal (no links): hover shows a role=tooltip panel referenced by aria-describedby`, role === 'tooltip' && !!(await sig.getAttribute('aria-describedby')), { role });
      await page.mouse.move(20, vp.height - 20, { steps: 3 }); await page.waitForTimeout(700);
      check(`${tag} Benchmaxxing Signal: closes when the pointer leaves`, (await panelCount()) === 0, '');
    } else {
      await sig.tap(); await page.waitForTimeout(400);
      check(`${tag} Benchmaxxing Signal: tap opens the modal`, (await page.locator('dialog[open]').count()) === 1, '');
      await page.keyboard.press('Escape'); await page.waitForTimeout(250);
      check(`${tag} Benchmaxxing Signal: Escape closes the modal`, (await page.locator('dialog[open]').count()) === 0, '');
    }
  } else check(`${tag} Benchmaxxing Signal (i) present`, false, '');
  check(`${tag} no page errors`, errors.length === 0, errors);
  await c.close();
}
await b.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || 'unknown', at: new Date().toISOString(),
  audited: { interactive: INTERACTIVE.map((s) => s.name), nonInteractive: ['Benchmaxxing Signal column'], primitive: 'components/InfoTip.tsx (all 14 InfoTip call sites share it)', exception: 'components/Nav.tsx BETA note: plain text, no interactive content, stays a hover/tap tooltip' },
  passed, total: checks.length, allPass: passed === checks.length, checks }, null, 1));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.ok ? '' : ' — ' + c.detail.slice(0, 600)}`);
console.log(`${passed}/${checks.length}${passed === checks.length ? ' ALL PASS' : ''}`);
process.exit(passed === checks.length ? 0 : 1);
