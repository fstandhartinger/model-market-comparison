// Iteration 44 acceptance extras for F-54 and F-56 (complements verify-f53-f57.mjs):
// F-56 — at 390 no name token spans two line boxes, badges sit on the org line, desktop badges stay inline.
// F-54 — semantic versions still render (Benchmarks selector), snapshot rows read "published YYYY-MM-DD".
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter44-f54-f56';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch(); const res = { base: BASE, at: new Date().toISOString(), checks: [] };
const ck = (id, ok, detail) => res.checks.push({ id, ok: !!ok, detail });
const openAdvanced = async (p) => {
  const tab = p.getByRole('button', { name: /^Advanced$/ }).or(p.getByRole('tab', { name: /^Advanced$/ })).first();
  if (await tab.count()) { await tab.click(); await p.waitForTimeout(800); }
};
for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile' });
  const p = await c.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  for (const mode of ['simple', 'advanced']) {
    if (mode === 'advanced') await openAdvanced(p);
    const cells = await p.evaluate(() => [...document.querySelectorAll('tbody tr td:first-child')].filter((td) => td.querySelector('a[href^="/models/"]')).map((td) => {
      const a = td.querySelector('a[href^="/models/"]');
      const tokens = [...a.querySelectorAll('.whitespace-nowrap')];
      const split = tokens.filter((s) => s.getClientRects().length > 1).map((s) => s.textContent);
      const visible = (el) => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
      const inline = [...td.children].filter((el) => el !== a && /^(open|deprecated|★)$/.test(el.textContent.trim()) && visible(el)).map((el) => el.textContent.trim());
      const orgLine = [...td.querySelectorAll('span.md\\:hidden > span')].filter((el) => /^(open|deprecated|★)$/.test(el.textContent.trim()) && visible(el)).map((el) => el.textContent.trim());
      return { name: a.innerText.replace(/\n/g, ' '), tokens: tokens.length, split, inline, orgLine };
    }));
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth);
    ck(`${kind} ${mode} rows present`, cells.length > 0, cells.length);
    ck(`${kind} ${mode} F-56 every name tokenised`, cells.every((x) => x.tokens > 0), cells.filter((x) => !x.tokens).map((x) => x.name).slice(0, 3));
    ck(`${kind} ${mode} F-56 no token broken across lines`, cells.every((x) => !x.split.length), cells.filter((x) => x.split.length).map((x) => `${x.name}: ${x.split}`).slice(0, 5));
    const badged = cells.filter((x) => x.inline.length || x.orgLine.length);
    if (kind === 'mobile') {
      ck(`${kind} ${mode} F-56 badges only on org line`, cells.every((x) => !x.inline.length), badged.slice(0, 3));
      ck(`${kind} ${mode} no page overflow`, overflow <= 390, overflow);
    } else {
      ck(`${kind} ${mode} F-56 badges inline, org line hidden`, cells.every((x) => !x.orgLine.length), badged.slice(0, 3));
    }
    res[`${kind}_${mode}_badged`] = badged.slice(0, 6);
    await p.screenshot({ path: `${OUT}/${kind}-${mode}-table.png` });
  }
  await p.goto(BASE + '/benchmarks', { waitUntil: 'networkidle' });
  const options = await p.evaluate(() => [...document.querySelectorAll('select option')].map((o) => o.textContent));
  ck(`${kind} F-54 semantic version kept in selector`, options.some((t) => / · v\d/.test(t)), options.filter((t) => / · v\d/.test(t)).slice(0, 3));
  ck(`${kind} F-54 snapshot reads published date`, options.some((t) => / · published 20\d\d-\d\d-\d\d$/.test(t)), options.find((t) => /published/.test(t)));
  ck(`${kind} F-54 no raw snapshot option`, !options.some((t) => /snapshot-|unversioned/.test(t)));
  await p.goto(BASE + '/models/claude-opus-5%3A%3Ahigh', { waitUntil: 'networkidle' });
  const sheet = await p.evaluate(() => document.body.innerText);
  ck(`${kind} F-54 model page no raw version`, !/snapshot-\d{4}|\(unversioned\)|No verified semantic version/.test(sheet));
  await c.close();
}
await b.close();
res.pass = res.checks.filter((x) => x.ok).length; res.fail = res.checks.filter((x) => !x.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(res, null, 1));
console.log(`pass ${res.pass}/${res.checks.length}`); for (const f of res.fail) console.log('FAIL', f.id, JSON.stringify(f.detail));
