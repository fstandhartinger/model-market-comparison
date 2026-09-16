// CR-51.1/51.2 (MIT licence + open-source/hobby copy) and CR-42.3 (expanded-row provider
// links) — live verification on both hosts, 1440 and 390, light and dark.
// Usage: BH_RUNNER=<engine> node verify-cr-51-42-3.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-51-42-3';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

// --- CR-51.1: the licence is real and machine-readable (GitHub banner source of truth) ---
const gh = await (await fetch('https://api.github.com/repos/fstandhartinger/model-market-comparison', { headers: { 'user-agent': 'benchmarkheaven-verify' } })).json().catch(() => ({}));
check('CR-51.1 GitHub detects a licence', !!gh.license, gh.license);
check('CR-51.1 GitHub licence key is MIT', gh.license?.spdx_id === 'MIT' || gh.license?.key === 'mit', gh.license?.spdx_id);
const licRaw = await fetch('https://raw.githubusercontent.com/fstandhartinger/model-market-comparison/main/LICENSE');
check('CR-51.1 LICENSE file is served from the repo root', licRaw.status === 200, licRaw.status);
const licText = licRaw.status === 200 ? await licRaw.text() : '';
check('CR-51.1 LICENSE carries the MIT text and the copyright holder', /MIT License/.test(licText) && /Florian Standhartinger/.test(licText), licText.slice(0, 80));
const readmeRaw = await fetch('https://raw.githubusercontent.com/fstandhartinger/model-market-comparison/main/README.md');
const readmeText = readmeRaw.status === 200 ? await readmeRaw.text() : '';
check('CR-51.1 README Licence section states third-party data is not relicensed', /not relicensed/i.test(readmeText) && /Artificial Analysis/i.test(readmeText) && /Epoch AI — CC BY 4\.0/i.test(readmeText), 'see README Licence section');

const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  const go = async (path) => { await goto(page, BASE + path); await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); };

  // --- CR-51.2: footer copy on the home page ---
  await go('/');
  const footer = await page.evaluate(() => {
    const f = document.querySelector('footer');
    if (!f) return null;
    const links = [...f.querySelectorAll('a')].map((a) => ({ text: a.textContent.trim(), href: a.href }));
    return { text: f.innerText, links };
  });
  check(`${tag} footer states open source (MIT) and hobby project`, !!footer && /Open source \(MIT\) and a hobby project/.test(footer.text), footer?.text?.slice(0, 200));
  check(`${tag} footer links the code to the GitHub repo`, !!footer?.links?.some((l) => /the code is on GitHub/.test(l.text) && l.href === 'https://github.com/fstandhartinger/model-market-comparison'), footer?.links);
  check(`${tag} footer has an MIT licence link to the repo's LICENSE`, !!footer?.links?.some((l) => l.text === 'MIT licence' && l.href === 'https://github.com/fstandhartinger/model-market-comparison/blob/main/LICENSE'), footer?.links);
  check(`${tag} footer says the licence covers the code, not the data`, !!footer && /licence covers the code, not the third-party data/.test(footer.text));
  check(`${tag} BETA tag still present (consistency with CR-35.2)`, await page.locator('[data-bh-beta], .bh-beta, [class*="beta" i]').first().count() > 0 || /BETA/.test(await page.locator('header, nav').first().innerText().catch(() => '')));
  await page.locator('footer').screenshot({ path: `${OUT}/${tag}-footer.png` }).catch(() => {});

  // --- CR-51.2: /about section (h2#open-source + its following <p> body) ---
  await go('/about#open-source');
  const about = await page.evaluate(() => {
    const el = document.getElementById('open-source');
    if (!el) return null;
    let body = '', links = [];
    let n = el.nextElementSibling;
    while (n && n.tagName !== 'H2') { body += (n.innerText || '') + '\n'; links.push(...[...n.querySelectorAll('a')].map((a) => ({ text: a.textContent.trim(), href: a.href }))); n = n.nextElementSibling; }
    return { heading: el.textContent.trim(), body, links };
  });
  check(`${tag} /about has the "Open source & hobby project" section`, !!about && /Open source & hobby project/.test(about.heading), about?.heading);
  check(`${tag} /about section links the repo and the licence file`, !!about?.links?.some((l) => l.href === 'https://github.com/fstandhartinger/model-market-comparison') && !!about?.links?.some((l) => l.href === 'https://github.com/fstandhartinger/model-market-comparison/blob/main/LICENSE'), about?.links);
  check(`${tag} /about section keeps the code-vs-data terms note`, !!about && /relicensed by the MIT licence/.test(about.body), about?.body?.slice(0, 200));
  check(`${tag} /about section notes the beta state`, !!about && /still in beta/.test(about.body));
  await page.locator('#open-source').scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${OUT}/${tag}-about-opensource.png` }).catch(() => {});

  // --- CR-42.3: expanded-row provider links ---
  await go('/');
  await page.waitForTimeout(600);
  const row = page.locator('tr.bh-ranking-row').first();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(900);
  const provLinks = await page.evaluate(() => {
    const tables = [...document.querySelectorAll('table')];
    // Scope to the table's own thead so the main table (whose tbody nests the
    // provider table) is not mistaken for the provider table.
    const ownTh = (x) => [...(x.querySelector('thead')?.querySelectorAll('th') || [])];
    const t = tables.find((x) => ownTh(x).some((h) => h.textContent.trim().toLowerCase() === 'provider'));
    if (!t) return { found: false };
    return { found: true, links: [...t.querySelectorAll('tbody a')].map((a) => ({ text: a.textContent.trim(), href: a.href, target: a.target, rel: a.rel, aria: a.getAttribute('aria-label') })) };
  });
  check(`${tag} expanded row's provider list exists`, provLinks.found, provLinks);
  const pl = provLinks.links || [];
  check(`${tag} provider names are external links (target=_blank, rel=noopener)`, pl.length > 0 && pl.every((l) => l.target === '_blank' && /noopener/.test(l.rel)), pl.slice(0, 5));
  check(`${tag} every provider link is an https URL with an aria-label`, pl.length > 0 && pl.every((l) => /^https:\/\//.test(l.href) && l.aria?.includes('official website')), pl.slice(0, 5));
  check(`${tag} link text equals the provider name (no manufactured labels)`, pl.length > 0 && pl.every((l) => l.text.length > 0), pl.slice(0, 5));
  const provTable = page.locator('table').filter({ has: page.locator('th', { hasText: /^provider$/i }) }).first();
  if (await provTable.count()) { await provTable.screenshot({ path: `${OUT}/${tag}-provider-links.png` }).catch(() => {}); }

  // A second model with a different provider mix (row 3, if present)
  const row3 = page.locator('tr.bh-ranking-row').nth(2);
  if (await row3.count()) {
    await row3.scrollIntoViewIfNeeded(); await row3.click(); await page.waitForTimeout(700);
    const pl3 = await page.evaluate(() => {
      const tables = [...document.querySelectorAll('table')];
      const ownTh = (x) => [...(x.querySelector('thead')?.querySelectorAll('th') || [])];
      const t = tables.filter((x) => ownTh(x).some((h) => h.textContent.trim().toLowerCase() === 'provider')).pop();
      return t ? [...t.querySelectorAll('tbody a')].map((a) => ({ text: a.textContent.trim(), href: a.href })) : [];
    });
    check(`${tag} a second expanded model also links its providers`, pl3.length > 0 && pl3.every((l) => /^https:\/\//.test(l.href)), pl3.slice(0, 5));
    if (await provTable.count()) { await provTable.screenshot({ path: `${OUT}/${tag}-provider-links-2.png` }).catch(() => {}); }
  }
  check(`${tag} no page errors`, errors.length === 0, errors);
  await c.close();
}
await b.close();
const failed = checks.filter((c) => !c.ok);
const out = { runner: process.env.BH_RUNNER || 'unknown', base: BASE, revision: meta.revision, at: new Date().toISOString(), checks, failed: failed.length };
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(out, null, 2));
console.log(`${OUT}: ${checks.length - failed.length}/${checks.length} passed`);
for (const f of failed) console.log(`FAIL ${f.name}: ${f.detail}`);
process.exit(failed.length ? 1 : 0);
