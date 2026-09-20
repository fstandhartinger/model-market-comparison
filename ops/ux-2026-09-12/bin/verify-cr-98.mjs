// CR-98 live check: Step-5 Preview vendor-reported launch claims.
// Usage: node verify-cr-98.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-98';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
const expected = new Map([
  ['stepfun-gpqa-diamond::snapshot-2026-09-20', 93.5],
  ['stepfun-terminal-bench-v2-1::2.1', 85],
  ['stepfun-browsecomp::snapshot-2026-09-20', 88.7],
]);
const scores = await (await fetch(`${BASE}/api/benchmark-scores?model_id=${encodeURIComponent('step-5-preview::default')}&limit=500`)).json();
const rows = (scores.observations ?? scores.results ?? []).filter((o) => o.subject?.model_id === 'step-5-preview::default' && o.basis === 'self_reported');
check('API publishes exactly 40 StepFun self-reported claims', rows.length === 40, String(rows.length));
for (const [id, value] of expected) {
  const o = rows.find((r) => r.benchmark_id === id);
  check(`API ${id} = ${value}`, o?.value === value, JSON.stringify(o && { value: o.value, basis: o.basis }));
}
check('Every claim has exact first-party provenance and replacement rule', rows.every((o) => o.source?.url === 'https://www.stepfun.com/step-5-preview'
  && o.source?.published_at === '2026-09-20' && o.source?.retrieved_at?.startsWith('2026-09-20')
  && o.source?.sha256 && o.source?.locator && /replace with an independently measured matching-version result/.test(o.protocol ?? '')), `${rows.length} rows`);

const browser = await chromium.launch();
try {
  for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['phone', { width: 390, height: 844 }]]) {
    const mobile = kind === 'phone'; const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e.message)));
    await page.goto(`${BASE}/models/${encodeURIComponent('step-5-preview::default')}?v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
    const modelBody = await page.locator('body').innerText();
    check(`${kind}: model page shows the model and its 40-row benchmark sheet`, /Step 5 Preview/.test(modelBody) && /40 of 182 registered benchmark versions/.test(modelBody) && /BrowseComp/.test(modelBody), modelBody.slice(0, 240));
    const vendorMarks = await page.locator('sup[title="Self-reported by the developer"]').count();
    check(`${kind}: model page visibly marks all 40 vendor claims`, vendorMarks === 40, String(vendorMarks));
    check(`${kind}: model page has no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), await page.evaluate(() => `${document.documentElement.scrollWidth}/${document.documentElement.clientWidth}`));
    await page.screenshot({ path: `${OUT}/${kind}-model.png`, fullPage: false });
    await page.goto(`${BASE}/benchmarks?models=${encodeURIComponent('step-5-preview::default')}&rows=all&v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
    const benchmarkBody = await page.locator('body').innerText();
    check(`${kind}: comparison view shows vendor claims with dagger labels`, /GPQA Diamond/.test(benchmarkBody) && /93\.5/.test(benchmarkBody) && /self-reported by the developer/i.test(benchmarkBody), benchmarkBody.match(/GPQA Diamond.{0,160}/s)?.[0] ?? 'missing');
    check(`${kind}: comparison view has no horizontal page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), await page.evaluate(() => `${document.documentElement.scrollWidth}/${document.documentElement.clientWidth}`));
    check(`${kind}: no page errors`, errors.length === 0, JSON.stringify(errors));
    await page.screenshot({ path: `${OUT}/${kind}-benchmarks.png`, fullPage: false });
    await context.close();
  }
} finally { await browser.close(); }
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: '39d7cafb55fd7bbe81c8b115ba90e29ef9ad22b7', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) if (!c.ok) console.log(`FAIL ${c.name}: ${c.detail}`);
console.log(`${BASE}: ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
