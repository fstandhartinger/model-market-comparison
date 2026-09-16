// CR-62.1/62.2 (CR-20260916d, link previews). Every public page's initial HTML stays ≤ 300 KB for the
// link-preview crawlers' user agents, carries complete preview tags, robots.txt/sitemap.xml are real, and
// the pages whose data now arrives after the shell still render their content (1440/390, light/dark) with
// no page errors.
// Usage: BH_RUNNER=<engine> node verify-cr-62.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-62';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

const UAS = {
  Twitterbot: 'Twitterbot/1.0',
  WhatsApp: 'WhatsApp/2.23.20.0 A',
  TelegramBot: 'TelegramBot (like TwitterBot)',
  facebookexternalhit: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
};
const LIMIT = 300 * 1024;
const PREVIEW_PAGES = ['/', '/benchmarks', '/compare', '/benchmaxxing', '/charts', '/eu', '/about', '/models/claude-fable-5.1'];
// The heaviest model pages (most benchmarks and offers) must fit too.
const HEAVY_MODELS = ['/models/glm-5.3%3A%3Amax', '/models/kimi-k3%3A%3Amax', '/models/glm-5.2%3A%3Amax', '/models/claude-opus-5%3A%3Amax', '/models/gpt-5.6-sol%3A%3Amax'];
const OTHER_PAGES = ['/benchmarks?benchmark=aa_intelligence_index', '/scatter', '/providers', '/provider-explorer', '/radar', '/gateways', '/privacy', '/terms', '/impressum'];
const tag = (html, attr, name) => { const m = html.match(new RegExp(`<meta[^>]*${attr}="${name.replace(/[:.]/g, (c) => `\\${c}`)}"[^>]*content="([^"]*)"`)); return m ? m[1] : null; };
const sizes = {};
for (const path of [...PREVIEW_PAGES, ...OTHER_PAGES, ...HEAVY_MODELS]) {
  sizes[path] = {};
  for (const [ua, value] of Object.entries(UAS)) {
    const r = await fetch(`${BASE}${path}`, { headers: { 'User-Agent': value, 'Accept-Encoding': 'identity' } });
    const html = await r.text();
    const bytes = Buffer.byteLength(html);
    sizes[path][ua] = bytes;
    check(`${path} ${ua}: HTTP 200 and initial HTML ≤ 300 KB`, r.status === 200 && bytes <= LIMIT, { status: r.status, bytes });
    if (ua !== 'Twitterbot' || !PREVIEW_PAGES.includes(path)) continue;
    const head = html.slice(0, html.indexOf('</head>') + 7);
    const t = { ogTitle: tag(head, 'property', 'og:title'), ogDescription: tag(head, 'property', 'og:description'), ogUrl: tag(head, 'property', 'og:url'),
      ogImage: tag(head, 'property', 'og:image'), ogLocale: tag(head, 'property', 'og:locale'), card: tag(head, 'name', 'twitter:card'),
      site: tag(head, 'name', 'twitter:site'), creator: tag(head, 'name', 'twitter:creator'), twImage: tag(head, 'name', 'twitter:image') };
    check(`${path}: complete preview tags in <head>`, t.ogTitle && t.ogDescription && t.ogImage && t.ogLocale === 'en_US' && t.card === 'summary_large_image'
      && t.site === '@benchmarkheaven' && t.creator === '@benchmarkheaven' && t.twImage && (path.startsWith('/models/') ? String(t.ogUrl || '').startsWith('https://benchmarkheaven.com/models/') : String(t.ogUrl || '').replace(/\/$/, '') === `https://benchmarkheaven.com${path === '/' ? '' : path}`), t);
    sizes[path].tags = t;
  }
}
const titles = new Set(PREVIEW_PAGES.filter((p) => p !== '/about').map((p) => sizes[p].tags?.ogTitle));
check('per-page og:title differs between the preview pages', titles.size === PREVIEW_PAGES.length - 1, [...titles]);
const img = await fetch(new URL(sizes['/'].tags?.ogImage || '/brand/og-image.png', BASE));
const imgBytes = (await img.arrayBuffer()).byteLength;
check('share image answers 200 and is ≤ 1 MB', img.status === 200 && imgBytes <= 1024 * 1024, { status: img.status, bytes: imgBytes, type: img.headers.get('content-type') });
const robots = await fetch(`${BASE}/robots.txt`); const robotsText = await robots.text();
check('robots.txt is a real robots file with the sitemap', robots.status === 200 && /User-Agent: \*/i.test(robotsText) && /Allow: \//.test(robotsText) && /Sitemap: https:\/\/benchmarkheaven\.com\/sitemap\.xml/.test(robotsText), robotsText);
const sitemap = await fetch(`${BASE}/sitemap.xml`); const sitemapText = await sitemap.text();
check('sitemap.xml lists the public pages and model pages', sitemap.status === 200 && sitemapText.includes('<loc>https://benchmarkheaven.com/benchmarks</loc>') && (sitemapText.match(/\/models\//g) || []).length > 100, { status: sitemap.status, urls: (sitemapText.match(/<loc>/g) || []).length });
const api = await fetch(`${BASE}/api/page-data/home`);
check('page-data API answers with the dataset version header', api.status === 200 && api.headers.get('x-dataset-version'), { status: api.status, version: api.headers.get('x-dataset-version'), cache: api.headers.get('cache-control') });
await api.arrayBuffer();
const bad = await fetch(`${BASE}/api/page-data/nope`);
check('unknown page-data key is a 404', bad.status === 404, bad.status);

// Rendering after the shell: the content each page used to server-render must appear.
const RENDER = {
  '/': async (p) => (await p.locator('main table tbody tr').count()) >= 5 && (await p.locator('main svg').count()) >= 1,
  '/benchmarks': async (p) => (await p.locator('main table tbody tr').count()) >= 10,
  '/benchmarks?benchmark=aa_intelligence_index': async (p) => (await p.locator('main li, main tr').count()) >= 5,
  '/compare': async (p) => (await p.locator('main svg').count()) >= 1 && (await p.locator('main table').count()) >= 1,
  '/radar': async (p) => (await p.locator('main svg').count()) >= 1,
  '/benchmaxxing': async (p) => (await p.locator('main table tbody tr, main [role="row"]').count()) >= 5,
  '/charts': async (p) => (await p.locator('main svg, main [class*="bar"]').count()) >= 1,
  '/scatter': async (p) => (await p.locator('main svg circle').count()) >= 10,
  '/eu': async (p) => (await p.locator('main table tbody tr').count()) >= 3,
  '/providers': async (p) => (await p.locator('main table tbody tr, main li').count()) >= 5,
  '/provider-explorer': async (p) => (await p.locator('main button, main li').count()) >= 10,
  '/models/claude-fable-5.1': async (p) => (await p.getByText('Composite', { exact: true }).count()) >= 1 && (await p.locator('main table tbody tr').count()) >= 3,
};
const browser = await chromium.launch();
try {
  // The Options sheet's model and provider lists now load after the shell (they were inlined into every page).
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/about`, { waitUntil: 'networkidle', timeout: 90000 });
      await page.locator('button[data-bh-filters-toggle][aria-controls="global-filters"]').first().click();
      await page.locator('[data-bh-combobox-trigger="Models"]').click();
      await page.waitForTimeout(800);
      const models = await page.locator('[data-bh-combobox] [role="listbox"][aria-label="Models"] [role="option"]').count();
      await page.keyboard.press('Escape');
      await page.locator('[data-bh-combobox-trigger^="Provider"]').first().click().catch(() => {});
      await page.waitForTimeout(800);
      const providers = await page.locator('[data-bh-combobox] [role="option"]').count();
      check(`Options sheet ${w}px: Models and Providers pickers are filled after the shell`, models >= 100 && providers > 20, { models, providers });
      await page.screenshot({ path: `${OUT}/options-sheet-${w}.png` });
    } catch (e) { check(`Options sheet ${w}px: opens`, false, String(e.message).slice(0, 300)); }
    finally { await ctx.close(); }
  }
  // Model page: a benchmark row's evidence and the missing-coverage list load when opened.
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/models/claude-fable-5.1`, { waitUntil: 'networkidle', timeout: 90000 });
      const row = page.locator('#benchmark-sheet li details').first();
      await row.locator('summary').click();
      await page.waitForFunction(() => { const d = document.querySelector('#benchmark-sheet li details'); return d && /Exact observation and full protocol|Protocol:/.test(d.textContent || ''); }, null, { timeout: 30000 }).catch(() => {});
      const evidence = await row.locator('summary:text-is("Evidence")').count();
      const missing = page.locator('#benchmark-sheet details.bh-panel').last();
      await missing.locator('summary').click();
      await page.waitForTimeout(2500);
      const missingItems = await missing.locator('li').count();
      const label = await missing.locator('summary').textContent();
      const expected = Number((label || '').match(/(\d+) benchmark versions/)?.[1] ?? -1);
      check(`model page ${w}px: row evidence and missing coverage load on open`, evidence >= 1 && missingItems === expected && expected > 0, { evidence, missingItems, expected });
      await page.screenshot({ path: `${OUT}/model-evidence-${w}.png`, fullPage: false });
    } catch (e) { check(`model page ${w}px: evidence opens`, false, String(e.message).slice(0, 300)); }
    finally { await ctx.close(); }
  }
  for (const [w, h] of [[1440, 900], [390, 844]]) for (const scheme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
    await ctx.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, scheme);
    for (const [path, ok] of Object.entries(RENDER)) {
      const page = await ctx.newPage(); const errors = [];
      page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
      try {
        await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {});
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const deferredLeft = await page.locator('.bh-deferred').count();
        const rendered = deferredLeft === 0 && await ok(page);
        check(`${path} ${w}px ${scheme}: content rendered after the shell, no page errors`, rendered && errors.length === 0, { deferredLeft, errors });
        if (w === 1440 && scheme === 'dark' || path === '/') await page.screenshot({ path: `${OUT}/${path.replace(/[^a-z0-9]+/gi, '_') || 'home'}-${w}-${scheme}.png` });
      } catch (e) { check(`${path} ${w}px ${scheme}: loads`, false, String(e.message).slice(0, 300)); }
      finally { await page.close(); }
    }
    await ctx.close();
  }
} finally { await browser.close(); }

const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || null, at: new Date().toISOString(), revision: meta.revision ?? null, passed, total: checks.length, sizes, checks }, null, 2));
for (const c of checks.filter((x) => !x.ok)) console.log('FAIL', c.name, c.detail);
console.log(`${passed}/${checks.length} checks passed → ${OUT}/verification.json`);
process.exit(passed === checks.length ? 0 : 1);
