// CR-42.3 follow-up (iteration 87): the expanded-row provider links point at homepages, never at the evidence
// pages behind a judgment (privacy/terms/legal), openrouter.ai or an API host; Makora (no primary-source
// homepage) stays plain text. Checks the most-routes row plus two more, 1440 and 390, light and dark.
// Usage: BH_RUNNER=<engine> node verify-cr-42-3-websites.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-42-3-websites';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });
const bad = (href) => { const u = new URL(href); return /privacy|terms|legal|policy/i.test(u.pathname) || u.hostname === 'openrouter.ai' || /^api\./.test(u.hostname); };
const b = await chromium.launch();
const seen = new Map();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`;
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
  const rows = page.locator('tr.bh-ranking-row');
  const n = Math.min(await rows.count(), 40);
  const counts = await rows.evaluateAll((trs) => trs.map((tr) => { const t = tr.querySelectorAll('td'); return Number((t[t.length - 1]?.textContent || '').replace(/\D/g, '')) || 0; }));
  const order = counts.map((v, i) => [v, i]).sort((a, z) => z[0] - a[0]).slice(0, 3).map(([, i]) => i).filter((i) => i < n);
  let links = [];
  for (const i of order) {
    await rows.nth(i).scrollIntoViewIfNeeded(); await rows.nth(i).click(); await page.waitForTimeout(800);
    links.push(...await page.evaluate(() => [...document.querySelectorAll('[data-pane="providers"] tbody a')].map((a) => ({ text: a.textContent.trim(), href: a.href }))));
  }
  links.forEach((l) => seen.set(l.text, l.href));
  check(`${tag} expanded rows carry provider links`, links.length > 0, links.length);
  const offenders = links.filter((l) => bad(l.href));
  check(`${tag} no provider link is a legal page, openrouter.ai or an API host`, offenders.length === 0, offenders);
  await page.locator('[data-pane="providers"]').first().screenshot({ path: `${OUT}/${tag}-providers.png` }).catch(() => {});
  await c.close();
}
await b.close();
check('sampled distinct provider links across views', seen.size >= 10, [...seen].slice(0, 40));
const failed = checks.filter((x) => !x.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ runner: process.env.BH_RUNNER || 'unknown', base: BASE, revision: meta.revision, at: new Date().toISOString(), checks, failed: failed.length }, null, 2));
console.log(`${OUT}: ${checks.length - failed.length}/${checks.length} passed`);
for (const f of failed) console.log(`FAIL ${f.name}: ${f.detail}`);
process.exit(failed.length ? 1 : 0);
