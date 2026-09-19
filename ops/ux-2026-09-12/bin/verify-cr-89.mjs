// Iteration 123 (claude-opus, non-implementer): independent live check of CR-89.1–.4 (Support links).
// Usage: node verify-cr-89.mjs <base> <outdir>   → <outdir>/verification.json. 1440/390 × light/dark, headless, closes its browser.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-89';
const URL_ = 'https://donate.stripe.com/fZu00i9ro0wmdF88sg1Jm01';
const COMPANY = 'productivity-boost.com Betriebs UG (haftungsbeschränkt) & Co. KG';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
const revision = await fetch(`${BASE}/api/meta`).then((r) => r.json()).then((m) => m.revision).catch(() => null);
const PAGES = ['/', '/about', '/benchmarks', '/jev-models', '/compare'];
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const mobile = kind === 'mobile'; const tag = `${kind}_${theme}`;
    const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
    await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errors = [];
    p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
    for (const path of PAGES) {
      const resp = await p.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 90000 });
      await p.waitForTimeout(400);
      const g = await p.evaluate(([u]) => {
        const a = document.querySelector('footer a[data-bh-support-link]');
        if (!a) return { found: false };
        a.scrollIntoView({ block: 'center' });
        const r = a.getBoundingClientRect(); const cs = getComputedStyle(a); const line = a.closest('p');
        const footer = a.closest('footer');
        return {
          found: true, count: document.querySelectorAll('footer a[data-bh-support-link]').length, href: a.getAttribute('href'), text: a.textContent.trim(),
          visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none', color: cs.color,           lineText: line?.textContent.replace(/\s+/g, ' ').trim(), inView: r.left >= 0 && r.right <= innerWidth,
          noDonate: !/donat|spende/i.test(footer.textContent),
          ...(() => { const rgb = (x) => x.match(/[\d.]+/g).slice(0, 3).map(Number); const L = (v) => { const [r, g, b2] = v.map((n) => { n /= 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b2; };
            let el = a, bgc = 'rgba(0, 0, 0, 0)'; while (el && /rgba\(0, 0, 0, 0\)|transparent/.test(bgc)) { bgc = getComputedStyle(el).backgroundColor; el = el.parentElement; }
            const lb = L(rgb(bgc)), lf = L(rgb(cs.color)); return { dark: lb < 0.2, contrast: +((Math.max(lb, lf) + 0.05) / (Math.min(lb, lf) + 0.05)).toFixed(2), bg: bgc }; })(),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      }, [URL_]);
      const pt = `${tag} ${path}`;
      check(`${pt}: HTTP 200`, resp?.status() === 200, resp?.status());
      check(`${pt}: one footer "Support Benchmark Heaven" link with the exact Stripe URL, visible, inside the viewport`, g.found && g.count === 1 && g.href === URL_ && g.text === 'Support Benchmark Heaven' && g.visible && g.inView, JSON.stringify({ href: g.href, text: g.text, count: g.count, inView: g.inView }));
      check(`${pt}: company line present, no donation wording`, g.found && g.lineText?.includes(COMPANY) && g.noDonate, g.lineText);
      check(`${pt}: theme applied (${theme}), link contrast ≥ 4.5`, g.found && g.dark === (theme === 'dark') && g.contrast >= 4.5, `${g.color} on ${g.bg} = ${g.contrast}`);
      check(`${pt}: no horizontal overflow`, g.overflow <= 0, g.overflow);
      if (path === '/' || path === '/about') await p.screenshot({ path: `${OUT}/${tag}${path.replace(/\//g, '_') || '_home'}-footer.png` });
      if (path === '/about') {
        const s = await p.evaluate(([u]) => {
          const h = document.getElementById('support'); const para = h?.nextElementSibling; const a = para?.querySelector('a[data-bh-support-link]');
          h?.scrollIntoView({ block: 'start' });
          return { heading: h?.textContent.trim(), text: para?.textContent.replace(/\s+/g, ' ').trim(), href: a?.getAttribute('href'), linkText: a?.textContent.trim() };
        }, [URL_]);
        check(`${pt}: About #support heading + paragraph with link + company line`, s.heading === 'Support this project' && s.href === URL_ && s.linkText === 'Support this project' && s.text.includes(COMPANY) && !/donat|spende/i.test(s.text), s.text);
        await p.waitForTimeout(300);
        await p.screenshot({ path: `${OUT}/${tag}_about-support-section.png` });
      }
    }
    check(`${tag}: no page errors`, errors.length === 0, errors);
    if (kind === 'desktop' && theme === 'light') {
      await p.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 90000 });
      const [popupOrNav] = await Promise.all([
        p.context().waitForEvent('page', { timeout: 5000 }).catch(() => null),
        p.locator('footer a[data-bh-support-link]').click(),
      ]);
      const target = popupOrNav || p;
      await target.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
      await target.waitForTimeout(3000);
      const t = { url: target.url(), title: await target.title().catch(() => '') };
      check('click-through lands on the Stripe payment page', /^https:\/\/(donate|buy|checkout)\.stripe\.com\//.test(t.url) && /stripe/i.test(t.title + t.url), JSON.stringify(t));
      await target.screenshot({ path: `${OUT}/stripe-landing.png` }).catch(() => {});
    }
    await c.close();
  }
} finally { await b.close(); }
if (BASE.includes('://benchmarkheaven.com')) {
  const gh = async (u) => { const r = await fetch(u); return { status: r.status, text: await r.text() }; };
  const funding = await gh('https://raw.githubusercontent.com/fstandhartinger/model-market-comparison/main/.github/FUNDING.yml');
  check('repo .github/FUNDING.yml on GitHub main: custom = the Stripe URL', funding.status === 200 && funding.text.trim() === `custom: ${URL_}`, funding.text.trim().slice(0, 120));
  const readme = await gh('https://raw.githubusercontent.com/fstandhartinger/model-market-comparison/main/README.md');
  check('README on GitHub main: "## Support" section with the Stripe URL', readme.status === 200 && /## Support\s+[^#]*donate\.stripe\.com\/fZu00i9ro0wmdF88sg1Jm01/.test(readme.text) && !/donat(e|ion)(?!\.stripe)/i.test(readme.text.split('## Support')[1]?.split('\n## ')[0] || ''), readme.status);
}
const pass = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision, at: new Date().toISOString(), pass, total: checks.length, checks }, null, 2));
console.log(`${BASE} @ ${revision}: ${pass}/${checks.length}`);
for (const x of checks.filter((x) => !x.ok)) console.log('FAIL', x.name, JSON.stringify(x.detail).slice(0, 300));
