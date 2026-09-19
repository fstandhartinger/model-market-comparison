// Iteration 123 (claude-opus): CR-85.3 live check — DeepSeek V4.1 Flash shows the CR-70 thin-data marker and an
// uncertain Benchmaxxing tag ("based on N comparisons — uncertain", CR-77) in the Overview and in its Benchmaxxing report.
// Usage: node verify-cr-85-3.mjs <base> <outdir>   → <outdir>/verification.json. 1440/390 × light/dark, headless.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-85-3';
const ID = 'deepseek-v4.1-flash::max';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
const revision = await fetch(`${BASE}/api/meta`).then((r) => r.json()).then((m) => m.revision).catch(() => null);
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const mobile = kind === 'mobile'; const tag = `${kind}_${theme}`;
    const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
    await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errors = [];
    p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
    await p.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 90000 });
    await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500);
    const row = p.locator(`tr[data-model-id="${ID}"]`);
    const n = await row.count();
    check(`${tag}: V4.1 Flash row present in Advanced (featured, default filters)`, n === 1, n);
    if (n === 1) {
      await row.scrollIntoViewIfNeeded();
      const g = await row.evaluate((tr) => {
        const thin = tr.querySelector('[data-thin-evidence]');
        const vis = (e) => { if (!e) return ''; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? e.innerText.replace(/\s+/g, ' ').trim() : ''; };
        const bmx = tr.querySelector('.bh-bmx-tag');
        return {
          thinInputs: thin?.dataset.compositeInputs, thinTitle: thin?.title, thinVisible: vis(thin), thinSr: thin?.querySelector('.sr-only')?.textContent,
          bmxLevel: bmx?.dataset.level, bmxUncertain: bmx?.hasAttribute('data-bmx-uncertain'), bmxAria: bmx?.getAttribute('aria-label'), bmxTitle: bmx?.title,
          bmxVisible: vis(bmx), bmxHref: bmx?.getAttribute('href'),
        };
      });
      check(`${tag}: thin-data marker visible with its input count (1 of 7)`, g.thinInputs === '1' && /◔/.test(g.thinVisible) && /1\/7/.test(g.thinVisible), g.thinVisible);
      check(`${tag}: thin-data note says "Based on only 1 of 7 Composite inputs — treat this rank as uncertain" (title + screen readers)`, /^Based on only 1 of 7 Composite inputs — treat this rank as uncertain$/.test(g.thinTitle) && g.thinSr === g.thinTitle, g.thinTitle);
      check(`${tag}: Benchmaxxing tag shown, marked uncertain, visible ◔`, !!g.bmxLevel && g.bmxUncertain && /Benchmaxxing/.test(g.bmxVisible) && /◔/.test(g.bmxVisible), `${g.bmxLevel} | ${g.bmxVisible}`);
      check(`${tag}: tag says "Based on only N comparisons … — treat this tag as uncertain" (title + aria-label)`, /Based on only \d+ comparisons?.*— treat this tag as uncertain/.test(g.bmxTitle) && /uncertain: Based on only \d+ comparisons?/.test(g.bmxAria), g.bmxAria);
      await p.screenshot({ path: `${OUT}/${tag}-overview-row.png` });
      // The tag links to the model's report, which must state the same uncertainty.
      await p.goto(`${BASE}${g.bmxHref}`, { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(1200);
      const rep = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      const m = rep.match(/Based on only (\d+) comparisons?[^.]*— treat this tag as uncertain/);
      check(`${tag}: Benchmaxxing report for V4.1 Flash states the uncertainty`, !!m && /DeepSeek V4\.1 Flash/.test(rep), m?.[0]);
      await p.screenshot({ path: `${OUT}/${tag}-benchmaxxing-report.png` });
    }
    check(`${tag}: no horizontal overflow`, await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0, '');
    check(`${tag}: no page errors`, errors.length === 0, errors);
    await c.close();
  }
} finally { await b.close(); }
const pass = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision, at: new Date().toISOString(), pass, total: checks.length, checks }, null, 2));
console.log(`${BASE} @ ${revision}: ${pass}/${checks.length}`);
for (const x of checks.filter((x) => !x.ok)) console.log('FAIL', x.name, JSON.stringify(x.detail).slice(0, 300));
