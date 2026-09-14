// Live acceptance for Fable pass-13 fixes F-69 (phone benchmark-sheet names wrap), F-70 (value-map
// label halo) and F-71 (integer token counts in the cost modal). Usage: node verify-f69-f71.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass13/verify-f69-f71';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const tag = `${kind}_${theme}`;
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(500); };
  // F-69
  await go('/models/claude-opus-5%3A%3Ahigh');
  const sheet = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('#benchmark-sheet details > summary, section details > summary')].filter((s) => s.querySelector('.bh-row-chevron'));
    const names = rows.map((s) => s.querySelector('span.min-w-0'));
    const clipped = names.filter((n) => n && n.scrollWidth > n.clientWidth + 1).length;
    const heights = rows.map((s) => s.getBoundingClientRect().height);
    const texts = names.map((n) => n?.textContent?.trim() ?? '');
    return { rows: rows.length, clipped, maxH: Math.max(...heights), minH: Math.min(...heights), overflow: document.documentElement.scrollWidth, sample: texts.slice(0, 6) };
  });
  check(`${tag} F-69 sheet rows present`, sheet.rows >= 10, `rows=${sheet.rows}`);
  check(`${tag} F-69 no clipped name`, sheet.clipped === 0, `clipped=${sheet.clipped}`);
  check(`${tag} F-69 no horizontal overflow`, sheet.overflow <= vp.width, `scrollWidth=${sheet.overflow}`);
  if (kind === 'mobile') check(`${tag} F-69 two-line rows on phone`, sheet.maxH >= 40, `maxH=${sheet.maxH}`);
  else check(`${tag} F-69 one-line rows on desktop`, sheet.maxH <= 36, `maxH=${sheet.maxH}`);
  await p.screenshot({ path: `${OUT}/${tag}-model-sheet.png`, fullPage: kind === 'mobile' });
  // F-70 + F-71 on the Simple page
  await go('/');
  const halo = await p.evaluate(() => { const t = [...document.querySelectorAll('.bh-point-labels text')]; return { n: t.length, withStroke: t.filter((e) => e.getAttribute('paint-order') === 'stroke' && e.getAttribute('stroke')).length, strokes: [...new Set(t.map((e) => getComputedStyle(e).stroke))] }; });
  check(`${tag} F-70 labels present`, halo.n >= 3, `n=${halo.n}`);
  check(`${tag} F-70 every label has a halo`, halo.n > 0 && halo.withStroke === halo.n, `withStroke=${halo.withStroke}/${halo.n} stroke=${halo.strokes.join('|')}`);
  await p.screenshot({ path: `${OUT}/${tag}-simple.png` });
  const priceBtn = p.locator('tbody tr button').first();
  if (await priceBtn.count()) {
    await priceBtn.click(); await p.waitForTimeout(500);
    const dl = await p.evaluate(() => { const d = document.querySelector('dialog[open] dl'); if (!d) return null; const dd = [...d.querySelectorAll('dd')].map((e) => e.textContent.trim()); return dd; });
    check(`${tag} F-71 modal opened`, !!dl, dl ? dl.slice(0, 4).join(' | ') : 'no dialog');
    if (dl) { check(`${tag} F-71 integer input tokens`, /^[\d,]+$/.test(dl[0]), dl[0]); check(`${tag} F-71 integer output tokens`, /^([\d,]+|—)$/.test(dl[1]), dl[1]); check(`${tag} F-71 ratio one decimal`, /^(\d+\.\d:1|—)$/.test(dl[2]), dl[2]); check(`${tag} F-71 hit rate one decimal`, /^\d+\.\d%$/.test(dl[3]), dl[3]); }
    await p.screenshot({ path: `${OUT}/${tag}-cost-modal.png` });
    await p.keyboard.press('Escape');
  } else check(`${tag} F-71 price button found`, false, 'none');
  await c.close();
}
await b.close();
const fails = results.filter((r) => !r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), pass: results.length - fails, fail: fails, results }, null, 1));
console.log(`${results.length - fails}/${results.length} checks passed on ${BASE}`);
process.exit(fails ? 1 : 0);
