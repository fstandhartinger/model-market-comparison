// Fable pass 24 live verifier: F-126–F-133 on /jev-models (JevBench v1.2 page). 1440/390 × light/dark.
// Usage: node verify-fable-pass24.mjs <base> <outdir>   → <outdir>/verification.json, prints passed/total.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260919-pass24/verify-canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
const revision = await fetch(`${BASE}/api/meta`).then((r) => r.json()).then((m) => m.revision).catch(() => null);
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile'; const tag = `${kind}_${theme}`;
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await p.goto(`${BASE}/jev-models`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(800);
  const g = await p.evaluate(() => {
    const q = (s) => document.querySelector(s); const txt = (el) => (el?.innerText || '').replace(/\s+/g, ' ').trim();
    const fig = q('[data-bh-jev12-main-chart]'); const fr = fig.getBoundingClientRect(); const pad = parseFloat(getComputedStyle(fig).paddingRight) || 0;
    const scores = [...fig.querySelectorAll('[data-bh-jev12-main]')].map((el) => Math.round(el.getBoundingClientRect().right));
    const heads = [...document.querySelectorAll('[data-bh-jev12-table] thead th')].map(txt);
    const jevTh = txt(q('[data-bh-jev12-row="jev-1.13.0"] th'));
    const nimbleTh = txt(q('[data-bh-jev12-row="nimble-9b"] th'));
    const rev = q('[data-bh-jev-revision]');
    return { head: txt(q('.bh-page-head')), oneliner: txt(q('[data-bh-jev12-oneliner]')), findings: txt(q('[data-bh-jev12-findings]')),
      razor: txt(q('[data-bh-jev12-bar="openjev-razorback16"] span[title]')), heads, jevTh, nimbleTh,
      revInMethod: !!(rev && rev.closest('#method')), figRight: Math.round(fr.right - pad), scores, errorsNow: 0 };
  });
  check(`${tag}: head names the score, the one-liner lives in the chart only`, !g.head.includes('weak axis') && g.oneliner.includes('a weak axis pulls the score down hard'), g.head.slice(0, 160));
  check(`${tag}: revision note sits inside Method and tiers`, g.revInMethod);
  check(`${tag}: findings do not double "(options as tools)"`, !/options as tools \(options as tools\)/.test(g.findings), g.findings.slice(-160));
  check(`${tag}: razorback16 row named "OpenJev (razorback16)"`, g.razor.startsWith('OpenJev (razorback16)'), g.razor);
  check(`${tag}: $ per 1,000 column precedes the tiers`, g.heads.findIndex((h) => h.startsWith('$ per 1,000')) < g.heads.findIndex((h) => h.startsWith('Easy')) && g.heads.findIndex((h) => h.startsWith('$ per 1,000')) > 0, g.heads.join(' | '));
  check(`${tag}: score header sub is one word`, /^JevBench Score official/.test(g.heads[2]) && !/geometric/.test(g.heads[2]), g.heads[2]);
  check(`${tag}: config line never repeats the author (Jev, Nimble)`, (g.jevTh.match(/TypeSafe AI/g) || []).length === 1 && (g.nimbleTh.match(/Bespoke Labs/g) || []).length === 1, `${g.jevTh} || ${g.nimbleTh}`);
  if (mobile) check(`${tag}: every chart score stays inside the panel`, g.scores.every((r) => r <= g.figRight + 1), `${Math.max(...g.scores)} vs ${g.figRight}`);
  // F-126: open Custom → preset buttons keep their own height
  await p.locator('[data-bh-jevc-custom-panel] summary').first().scrollIntoViewIfNeeded();
  await p.locator('[data-bh-jevc-custom-panel] summary').first().click(); await p.waitForTimeout(400);
  const pre = await p.evaluate(() => ({ open: document.querySelector('[data-bh-jevc-custom-panel]').open, hs: [...document.querySelectorAll('button[data-bh-jevc-preset]')].map((b) => Math.round(b.getBoundingClientRect().height)) }));
  check(`${tag}: preset buttons do not stretch to the open Custom panel`, pre.open && pre.hs.every((h) => h <= 90), JSON.stringify(pre));
  // F-128: partial row's pinned cell is opaque
  const st = await p.evaluate(() => { const th = document.querySelector('[data-bh-jev12-ranked="0"] th.bh-jev-sticky'); const cs = getComputedStyle(th); return { opacity: cs.opacity, bg: cs.backgroundColor, pos: cs.position }; });
  check(`${tag}: partial row's pinned name cell is opaque`, st.opacity === '1' && st.bg !== 'rgba(0, 0, 0, 0)' && st.pos === 'sticky', JSON.stringify(st));
  await p.screenshot({ path: `${OUT}/${tag}-jev-custom-open.png` });
  check(`${tag}: no page errors`, errors.length === 0, errors.join(' | '));
  await c.close();
}
await b.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision, at: new Date().toISOString(), passed, total: checks.length, checks }, null, 1));
console.log(`${BASE} revision ${revision}: ${passed}/${checks.length}`); for (const c of checks.filter((c) => !c.ok)) console.log('FAIL', c.name, c.detail);
