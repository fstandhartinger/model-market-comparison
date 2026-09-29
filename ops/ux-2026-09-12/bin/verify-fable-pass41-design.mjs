// Fable pass-41 live verifier (non-Fable engines run it before flipping a row to verified).
// Usage: node verify-fable-pass41-design.mjs <base> <outDir>   ONLY=F-218 restricts the groups (there is one).
// Group F-218, on the released v1.5 page reached from the former preview URL and its What-If page, at 1440/390 × light/dark:
//   the method notes print no full 64-hex hash outside the provenance line; the four prose hashes are 12-char prefixes whose title is
//   the full hash and whose box is one line tall; the method hash keeps its marker; the pricing-correction prefix on the preview is the
//   prefix the What-If page prints; the former preview URL returns a permanent redirect with an X-Robots-Tag noindex header; 0 page errors.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-fable-pass41';
const ONLY = process.env.ONLY || null;
await fs.mkdir(OUT, { recursive: true });
const checks = [];
const check = (group, ctx, name, ok, detail = '') => { checks.push({ group, ctx, name, ok: !!ok, detail: String(detail).slice(0, 400) }); if (!ok) console.log(`FAIL ${group} ${ctx} ${name} :: ${String(detail).slice(0, 200)}`); };
const want = (g) => !ONLY || g === ONLY;
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const previewProbe = () => {
  const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim() : '';
  const method = document.querySelector('[data-bh-jev15-method]'); const prov = document.querySelector('[data-bh-jev15-provenance]');
  const codes = method ? [...method.querySelectorAll('code')] : [];
  const fullOutsideProv = codes.filter((c) => !(prov && prov.contains(c)) && /^[0-9a-f]{64}$/.test(txt(c))).map((c) => txt(c).slice(0, 12));
  const shas = [...document.querySelectorAll('[data-bh-jev15-sha]')].map((c) => { const b = c.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(c.parentElement).lineHeight) || 20; return { t: txt(c), title: c.getAttribute('title') || '', kind: c.getAttribute('data-bh-jev15-sha'), lines: Math.round(b.height / lh), h: Math.round(b.height), lh }; });
  const methodSha = document.querySelector('[data-bh-jev15-method-sha]');
  const provFull = prov ? [...prov.querySelectorAll('code')].map((c) => txt(c)) : [];
  const pricingLi = [...(method ? method.querySelectorAll('li') : [])].map((l) => txt(l)).find((t) => /Pricing disclosure correction SHA-256/.test(t)) || '';
  return { hasMethod: !!method, fullOutsideProv, shas, methodSha: methodSha ? { t: txt(methodSha), title: methodSha.getAttribute('title') || '' } : null, provFull, pricingPrefix: (pricingLi.match(/SHA-256: ([0-9a-f]{12})…/) || [])[1] || null, robots: document.querySelector('meta[name=robots]')?.content || '' };
};
const whatifProbe = () => { const t = document.body.innerText.replace(/\s+/g, ' '); return { prefix: (t.match(/Pricing disclosure correction SHA-256 ([0-9a-f]{12})…/) || [])[1] || null }; };
for (const [kind, theme] of [['desktop', 'light'], ['desktop', 'dark'], ['mobile', 'light'], ['mobile', 'dark']]) {
  const ctx = `${kind}_${theme}`;
  const browser = await chromium.launch({ headless: true });
  const bctx = await browser.newContext({ viewport: kind === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, deviceScaleFactor: kind === 'mobile' ? 2 : 1, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
  const p = await bctx.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error' && !/status of 50[0-9]/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  try {
    if (want('F-218')) {
      const formerPreview = await fetch(`${BASE}/wip-oiifi41ouv1f/jevbench-v15`, { redirect: 'manual' });
      const formerLocation = formerPreview.headers.get('location') || '';
      const robotsHeader = formerPreview.headers.get('x-robots-tag') || '';
      check('F-218', ctx, 'former preview URL permanently redirects to the released v1.5 page',
        formerPreview.status === 308 && new URL(formerLocation, BASE).pathname === '/jev-models/v1.5.0',
        `${formerPreview.status} ${formerLocation}`);
      check('F-218', ctx, 'former preview redirect remains noindex', /noindex,\s*nofollow/.test(robotsHeader), robotsHeader);
      await goto(p, `${BASE}/wip-oiifi41ouv1f/jevbench-v15`); await p.waitForTimeout(1500);
      const m = await p.evaluate(previewProbe);
      check('F-218', ctx, 'the redirected page is the public v1.5 canonical route', new URL(p.url()).pathname === '/jev-models/v1.5.0', p.url());
      check('F-218', ctx, 'method section present', m.hasMethod);
      check('F-218', ctx, 'no full hash printed outside the provenance line', m.fullOutsideProv.length === 0, JSON.stringify(m.fullOutsideProv));
      check('F-218', ctx, 'four prose hashes', m.shas.length === 4, m.shas.length);
      check('F-218', ctx, 'each prose hash is a 12-char prefix + …', m.shas.every((s) => /^[0-9a-f]{12}…$/.test(s.t)), JSON.stringify(m.shas.map((s) => s.t)));
      check('F-218', ctx, 'each prose hash title is the full 64-hex value starting with the prefix', m.shas.every((s) => /^[0-9a-f]{64}$/.test(s.title) && s.title.startsWith(s.t.slice(0, 12))), JSON.stringify(m.shas.map((s) => s.title.slice(0, 16))));
      check('F-218', ctx, 'no prose hash wraps (one line tall)', m.shas.every((s) => s.lines <= 1), JSON.stringify(m.shas.map((s) => [s.h, s.lh])));
      check('F-218', ctx, 'the method hash keeps its marker and is a prefix', !!m.methodSha && /^[0-9a-f]{12}…$/.test(m.methodSha.t) && /^[0-9a-f]{64}$/.test(m.methodSha.title), JSON.stringify(m.methodSha));
      check('F-218', ctx, 'the provenance line keeps two full hashes', m.provFull.length === 2 && m.provFull.every((h) => /^[0-9a-f]{64}$/.test(h)), JSON.stringify(m.provFull.map((h) => h.slice(0, 12))));
      check('F-218', ctx, 'the pricing-correction bullet prints a prefix', !!m.pricingPrefix, m.pricingPrefix);
      await p.screenshot({ path: `${OUT}/${ctx}-v15-method.png` }).catch(() => {});
      await goto(p, `${BASE}/wip-oiifi41ouv1f/jevbench-v15-whatif.html`); await p.waitForTimeout(1500);
      const w = await p.evaluate(whatifProbe);
      check('F-218', ctx, 'the What-If page prints the same pricing-correction prefix as the preview', !!w.prefix && w.prefix === m.pricingPrefix, `${w.prefix} vs ${m.pricingPrefix}`);
      check('F-218', ctx, '0 page errors on both pages', errors.length === 0, JSON.stringify(errors.slice(0, 3)));
    }
  } catch (e) { check('F-218', ctx, 'run', false, String(e)); }
  await bctx.close(); await browser.close();
}
const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), only: ONLY, pass, total: checks.length, checks }, null, 1));
console.log(`${pass}/${checks.length} checks passed (${BASE}${ONLY ? `, ONLY=${ONLY}` : ''})`);

process.exitCode = pass === checks.length ? 0 : 1;
