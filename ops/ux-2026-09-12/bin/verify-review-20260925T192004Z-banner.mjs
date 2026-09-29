// Independent review-gate receipt for CR-167/CR-168 (fast-lane banner) and CR-166 (/image-jev-bench).
// Run under ~/.locks/chrome-9333.lock.  Usage: node verify-...-banner.mjs <base> <outDir>
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-banner';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const metrics = {};
const check = (ctx, name, ok, detail) => checks.push({ context: ctx, name, ok: !!ok, detail: String(detail ?? '') });

// sRGB relative luminance + WCAG contrast ratio from computed rgb() strings.
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const parse = (s) => (String(s).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const ratio = (a, b) => { const [l1, l2] = [lum(parse(a)), lum(parse(b))].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };

const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
try {
// One DOM probe, run twice per route: once on the bar as a first-time visitor meets it, and once
// with the phone disclosure open (see openOffer below).
function probe() {
    const b = document.querySelector('[data-bh-fastlane-banner]');
    const cs = b && getComputedStyle(b);
    const r = b?.getBoundingClientRect();
    const copy = b?.querySelector('.bh-fastlane-copy');
    const link = b?.querySelector('a.bh-fastlane-secondary');
    const btns = b ? [...b.querySelectorAll('button, a')].map((el) => ({ t: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), h: Math.round(el.getBoundingClientRect().height), w: Math.round(el.getBoundingClientRect().width), label: el.getAttribute('aria-label') || '' })) : [];
    // the deepest element actually painting the banner background under the copy
    let bg = 'rgba(0, 0, 0, 0)', node = copy;
    while (node && bg === 'rgba(0, 0, 0, 0)') { const s = getComputedStyle(node); bg = s.backgroundColor; if (bg === 'rgba(0, 0, 0, 0)' && s.backgroundImage !== 'none') bg = 'gradient'; node = node.parentElement; }
    return {
      present: !!b, expanded: b?.getAttribute('data-bh-fastlane-expanded') ?? null, position: cs?.position, bottom: cs?.bottom, zIndex: cs?.zIndex,
      bannerTop: r ? Math.round(r.top) : null, bannerH: r ? Math.round(r.height) : null, bannerW: r ? Math.round(r.width) : null,
      viewportH: innerHeight, viewportW: innerWidth, layoutW: document.documentElement.clientWidth,
      bodyPad: Math.round(parseFloat(getComputedStyle(document.body).paddingBottom) || 0),
      bodyClass: document.body.classList.contains('bh-fastlane-visible'),
      ariaLabel: b?.getAttribute('aria-label') || '', role: b?.tagName,
      copyColor: copy && getComputedStyle(copy).color, copyBg: bg,
      copyText: (copy?.textContent || '').replace(/\s+/g, ' ').trim(),
      linkHref: link?.getAttribute('href') || null,
      btns, overflow: document.documentElement.scrollWidth > innerWidth + 1,
      scrollH: Math.round(document.documentElement.scrollHeight),
      firstClassRowY: (() => { const li = document.querySelector('[data-bh-jev-class-list] > li'); return li ? Math.round(li.getBoundingClientRect().y + scrollY) : null; })(),
    };
}

for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = `${kind}_${theme}`;
  const c = await browser.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
  try {
    const p = await c.newPage(); p.setDefaultTimeout(25000);
    const errors = []; p.on('pageerror', (e) => errors.push(String(e.message)));
    const beacons = []; p.on('request', (r) => { if (r.url().includes('/api/fastlane-banner-event')) beacons.push(r.method()); });
    const responses = []; p.on('response', (r) => { if (r.url().includes('/api/fastlane-banner-event')) responses.push(r.status()); });
    // CR-167.2 / D207 fix (iteration 230): on a phone the bar now starts as a one-line teaser, so the
    // offer's own controls are behind a disclosure. Geometry is still judged on the collapsed default —
    // that is what a first-time visitor meets — and the offer's checks run after opening it. On desktop
    // the teaser is display:none and this is a no-op.
    const openOffer = async () => {
      const teaser = p.locator('[data-bh-fastlane-teaser]');
      if (await teaser.isVisible().catch(() => false)) { await teaser.click(); await p.waitForTimeout(350); }
    };
    const go = async (path) => {
      await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      await p.waitForLoadState('networkidle').catch(() => {});
      // Legacy-host mobile hydration can insert the client banner after networkidle; wait for the
      // positive-route marker so a slow mount is not misreported as a missing product surface.
      if (/^\/(?:jev-models|image-jev-bench)/.test(path)) {
        await p.waitForSelector('[data-bh-fastlane-banner]', { timeout: 5000 }).catch(() => {});
      }
      await p.waitForTimeout(800);
    };

    for (const [label, path] of [['hub', '/jev-models'], ['imagejev', '/image-jev-bench'], ['pinned', '/jev-models/v1.4.2']]) {
      await go(path);
      const m = await p.evaluate(probe);
      metrics[`${ctx}-${label}`] = m;
      check(ctx, `${label}: banner is present`, m.present, JSON.stringify({ present: m.present }));
      if (!m.present) continue;
      check(ctx, `${label}: fixed to the bottom, full width, above page content`, m.position === 'fixed' && m.bottom === '0px' && m.bannerW >= m.layoutW - 1 && Number(m.zIndex) >= 50, JSON.stringify({ position: m.position, bottom: m.bottom, w: m.bannerW, layoutW: m.layoutW, innerW: m.viewportW, z: m.zIndex }));
      check(ctx, `${label}: reserves its own height at the end of the document`, m.bodyClass && Math.abs(m.bodyPad - m.bannerH) <= 2, JSON.stringify({ bodyPad: m.bodyPad, bannerH: m.bannerH }));
      check(ctx, `${label}: banner covers at most a fifth of the viewport`, m.bannerH <= Math.round(m.viewportH / 5), `${m.bannerH} of ${m.viewportH}`);
      if (kind === 'mobile') {
        check(ctx, `${label}: the phone bar starts collapsed, with the close control still reachable`,
          m.expanded === 'no' && m.btns.filter((b) => b.h > 0).length === 2 && m.btns.some((b) => /close/i.test(b.label)),
          JSON.stringify({ expanded: m.expanded, visible: m.btns.filter((b) => b.h > 0).map((b) => b.t || b.label) }));
      }
      // the offer's own copy and controls, measured with the disclosure open
      await openOffer();
      const o = await p.evaluate(probe);
      metrics[`${ctx}-${label}-offer`] = o;
      const cr = o.copyBg === 'gradient' ? ratio(o.copyColor, 'rgb(84, 48, 164)') : ratio(o.copyColor, o.copyBg);
      check(ctx, `${label}: body copy contrast >= 4.5:1 against the banner`, cr >= 4.5, `${cr.toFixed(2)}:1 (${m.copyColor} on ${m.copyBg === 'gradient' ? 'gradient darkest stop #5430a4' : m.copyBg})`);
      check(ctx, `${label}: every banner control is at least 44 px tall`, o.btns.filter((b) => b.h > 0).length === 3 && o.btns.filter((b) => b.h > 0).every((b) => b.h >= 43.5), JSON.stringify(o.btns));
      check(ctx, `${label}: labelled region and a named close control`, /priority|evaluation/i.test(o.ariaLabel) && o.btns.some((b) => /close/i.test(b.label)), JSON.stringify({ ariaLabel: o.ariaLabel, closeLabel: o.btns.find((b) => /close/i.test(b.label))?.label }));
      check(ctx, `${label}: the request link points at the fast-lane page`, o.linkHref === '/jev-models/request-evaluation', String(o.linkHref));
      check(ctx, `${label}: copy names the developer audience and that priority runs are paid`, /model developer/i.test(o.copyText) && /charge/i.test(o.copyText), o.copyText.slice(0, 120));
      check(ctx, `${label}: no horizontal page overflow with the banner up`, !m.overflow, String(m.overflow));

      // the banner must not permanently hide content: scroll to the very bottom and check the footer clears it
      const foot = await p.evaluate(async () => {
        scrollTo(0, document.documentElement.scrollHeight);
        await new Promise((r) => setTimeout(r, 400));
        const b = document.querySelector('[data-bh-fastlane-banner]')?.getBoundingClientRect();
        const f = document.querySelector('footer');
        const fr = f?.getBoundingClientRect();
        const last = f ? [...f.querySelectorAll('p, a')].map((el) => el.getBoundingClientRect()).filter((r) => r.height > 0).sort((x, y) => y.bottom - x.bottom)[0] : null;
        return { bannerTop: b ? Math.round(b.top) : null, footBottom: fr ? Math.round(fr.bottom) : null, lastBottom: last ? Math.round(last.bottom) : null };
      });
      metrics[`${ctx}-${label}-foot`] = foot;
      check(ctx, `${label}: the page's last content clears the banner at full scroll`, foot.lastBottom != null && foot.bannerTop != null && foot.lastBottom <= foot.bannerTop + 1, JSON.stringify(foot));

      if (label === 'hub' && kind === 'mobile') {
        check(ctx, 'hub: the first Jev-class row is visible above the banner on a phone', m.firstClassRowY != null && m.firstClassRowY < m.bannerTop, `row y ${m.firstClassRowY}, banner top ${m.bannerTop}`);
      }
      if (label === 'pinned' && kind === 'desktop') {
        check(ctx, 'pinned v1.4.2: page height stays under the 14,000 px F-190 budget with the banner up', m.scrollH < 14000, String(m.scrollH));
      }
      await p.screenshot({ path: `${OUT}/${ctx}-${label}.png` });
    }

    // the banner must NOT appear off the JevBench routes
    for (const path of ['/', '/benchmarks']) {
      await go(path);
      const off = await p.evaluate(() => ({ present: !!document.querySelector('[data-bh-fastlane-banner]'), pad: Math.round(parseFloat(getComputedStyle(document.body).paddingBottom) || 0) }));
      check(ctx, `no banner on ${path}`, !off.present && off.pad === 0, JSON.stringify(off));
    }

    // dismissal behaviour
    await go('/jev-models');
    const beaconsBefore = beacons.length;
    await p.locator('.bh-fastlane-close').click(); await p.waitForTimeout(400);
    let state = await p.evaluate(() => ({ present: !!document.querySelector('[data-bh-fastlane-banner]'), pad: Math.round(parseFloat(getComputedStyle(document.body).paddingBottom) || 0), session: sessionStorage.getItem('bh-fastlane-banner-closed'), local: localStorage.getItem('bh-fastlane-banner-hidden') }));
    check(ctx, 'the close control hides the banner and releases the reserved space', !state.present && state.pad === 0 && state.session === '1' && state.local === null, JSON.stringify(state));
    await go('/jev-models');
    state = await p.evaluate(() => ({ present: !!document.querySelector('[data-bh-fastlane-banner]') }));
    check(ctx, 'the session dismissal survives a reload', !state.present, JSON.stringify(state));
    await p.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
    await go('/jev-models');
    state = await p.evaluate(() => ({ present: !!document.querySelector('[data-bh-fastlane-banner]') }));
    check(ctx, 'a fresh session sees the banner again', state.present, JSON.stringify(state));
    await openOffer();
    await p.locator('.bh-fastlane-primary').click(); await p.waitForTimeout(400);
    state = await p.evaluate(() => ({ present: !!document.querySelector('[data-bh-fastlane-banner]'), local: localStorage.getItem('bh-fastlane-banner-hidden') }));
    check(ctx, '"Don\'t show again" stores a permanent dismissal', !state.present && state.local === '1', JSON.stringify(state));
    await go('/image-jev-bench');
    state = await p.evaluate(() => ({ present: !!document.querySelector('[data-bh-fastlane-banner]') }));
    check(ctx, 'the permanent dismissal also holds on the other banner route', !state.present, JSON.stringify(state));
    await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    // the analytics beacon (CR-168) must be accepted, not 4xx
    await go('/jev-models');
    await p.waitForTimeout(1200);
    check(ctx, 'the banner view beacon is sent and accepted (204)', beacons.length > beaconsBefore && responses.length > 0 && responses.every((s) => s === 204), JSON.stringify({ beacons: beacons.length, responses }));
    check(ctx, 'no page errors in any banner context', errors.length === 0, JSON.stringify(errors.slice(0, 3)));
  } finally { await c.close(); }
}
} finally { await browser.close(); }

const failed = checks.filter((c) => !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), total: checks.length, failed: failed.length, checks }, null, 2));
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 2));
console.log(`${BASE}: ${checks.length - failed.length}/${checks.length}`);
for (const f of failed) console.log(`FAIL [${f.context}] ${f.name} — ${f.detail}`);
process.exit(failed.length ? 1 : 0);
