// R9.1 live check for the curated-catalog collectors: /api/meta dates and the refreshed offers
// rendered on model pages at desktop and phone width.
// Usage: node verify-r91-catalogs.mjs <base-url> <out-dir> <yyyy-mm-dd> [source=model-slug:Provider ...]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const [BASE, OUT, DAY, ...pairs] = process.argv.slice(2);
const fs = await import('node:fs/promises');
await fs.mkdir(OUT, { recursive: true });
const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

const meta = await (await fetch(`${BASE}/api/meta`)).json();
const find = (o, k) => { if (o && typeof o === 'object') { for (const [a, v] of Object.entries(o)) { if (a === k) return v; const r = find(v, k); if (r !== undefined) return r; } } return undefined; };
const targets = pairs.map((p) => { const [source, rest] = p.split('='); const [slug, provider] = rest.split(':'); return { source, slug, provider }; });
for (const source of new Set(targets.map((t) => t.source))) check(`/api/meta ${source} dated ${DAY}`, find(meta, source) === DAY, find(meta, source));

const b = await chromium.launch();
const errors = [];
for (const [name, vp, mobile] of [['desktop', { width: 1440, height: 1000 }, false], ['mobile', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  for (const t of targets) {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`${name} ${t.slug}: ${e.message}`));
    // networkidle occasionally never settles on one host right after a deploy flip (curl returns
    // 200 in < 1 s); fall back to "load" plus a settle delay instead of aborting the whole run.
    let res;
    try { res = await p.goto(`${BASE}/models/${t.slug}`, { waitUntil: 'networkidle', timeout: 45000 }); }
    catch (e) {
      check(`${name} /models/${t.slug} networkidle fallback used`, true, e.message.split('\n')[0]);
      res = await p.goto(`${BASE}/models/${t.slug}`, { waitUntil: 'load', timeout: 60000 });
      await p.waitForTimeout(2500);
    }
    check(`${name} /models/${t.slug} HTTP 200`, res.status() === 200, res.status());
    // The full offer list sits in the collapsed "Token offers by platform" disclosure; open it like a user.
    const offers = p.locator('main details:has(summary:has-text("Token offers by platform"))').first();
    check(`${name} /models/${t.slug} has the offers disclosure`, await offers.count(), null);
    if (await offers.count()) { await offers.locator('summary').first().click(); await p.waitForTimeout(400); }
    const group = offers.locator(`h2, h3, h4`).filter({ hasText: new RegExp(`^${t.provider} \\(\\d+\\)$`) });
    const groupVisible = (await group.count()) > 0 && await group.first().isVisible();
    const rows = (await offers.innerText().catch(() => '')).replace(/\s+/g, ' ');
    check(`${name} /models/${t.slug} shows a visible "${t.provider} (n)" offer group`, groupVisible, rows.slice(0, 200));
    if (groupVisible) await group.first().scrollIntoViewIfNeeded();
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    check(`${name} /models/${t.slug} no horizontal overflow`, sw <= vp.width, sw);
    await p.screenshot({ path: `${OUT}/${name}-${t.slug.replace(/[^a-z0-9.-]/gi, '_')}.png` });
    await p.close();
  }
  await ctx.close();
}
await b.close();
check('no page errors', errors.length === 0, errors);
const failed = checks.filter((c) => !c.pass);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, day: DAY, passed: checks.length - failed.length, total: checks.length, checks }, null, 2));
console.log(`${BASE}: ${checks.length - failed.length}/${checks.length}`);
for (const f of failed) console.log('FAIL', f.name, JSON.stringify(f.detail).slice(0, 200));
process.exitCode = failed.length ? 1 : 0;
