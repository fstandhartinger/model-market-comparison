// Live UI check: the E2 identities (Vals Index v2, FrontierCode 1.1) are selectable and rank on /benchmarks.
// Usage: node ops/ux-2026-09-12/bin/verify-e2-benchmarks-ui.mjs OUT_DIR
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/iter47-e2/ui';
mkdirSync(OUT, { recursive: true });
const hosts = { canonical: 'https://benchmarkheaven.com', legacy: 'https://model-market-comparison.app.mintapis.com' };
const vps = { desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } };
const results = []; const check = (id, name, ok, detail = '') => { results.push({ id, name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name} ${detail}`); };
const b = await chromium.launch();
for (const [hn, base] of Object.entries(hosts)) for (const [kind, vp] of Object.entries(vps)) for (const scheme of ['light', 'dark']) {
  const tag = `${hn} ${kind}_${scheme}`;
  const ctx = await b.newContext({ viewport: vp, colorScheme: scheme });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(`${base}/benchmarks`, { waitUntil: 'networkidle', timeout: 90_000 });
  const bench = p.locator('label:has-text("Benchmark and version") select');
  const options = await bench.locator('option').evaluateAll((os) => os.map((o) => ({ value: o.value, text: o.textContent.trim() })));
  for (const [key, re, cohorts] of [['vals', /^Vals Index\b(?!.*(Finance|EMB|Terminal|Vibe|Migration|Legal|HLAB|cost))/i, 1], ['frontiercode', /^FrontierCode\b(?!.*cost)/i, 7]]) {
    const opt = options.find((o) => re.test(o.text));
    check('E2-UI', `${tag} ${key} option present`, !!opt, opt?.text ?? options.filter((o) => /vals|frontier/i.test(o.text)).map((o) => o.text).join(' | '));
    if (!opt) continue;
    await bench.selectOption(opt.value);
    await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 30_000 }).catch(() => {});
    await p.waitForTimeout(800);
    const harness = p.locator('label:has-text("Evaluation group / harness") select');
    const nHarness = (await harness.count()) ? await harness.locator('option').count() : 1;
    check('E2-UI', `${tag} ${key} cohorts = ${cohorts}`, nHarness === cohorts, `harness options=${nHarness}`);
    const count = () => p.evaluate(() => ({ rows: document.querySelectorAll('[role="region"][aria-label="Benchmark ranking table"] tbody tr').length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    // E2 rows are unmatched source identities (no catalog join), so the default Measured/matched view is empty by design; record it, then open the view.
    const defaultRows = (await count()).rows;
    check('info', `${tag} ${key} default view rows (recorded, not gated)`, true, `rows=${defaultRows}`);
    await p.locator('label:has-text("Evidence") select').selectOption('all');
    await p.getByLabel('Include unmatched source identities').check();
    await p.waitForTimeout(800);
    const m = await count();
    check('E2-UI', `${tag} ${key} ranked rows shown with All evidence + unmatched identities`, m.rows > 0, `rows=${m.rows}`);
    check('overflow', `${tag} ${key} no page overflow`, m.sw <= m.cw + 1, `scrollWidth=${m.sw} clientWidth=${m.cw}`);
    await p.screenshot({ path: `${OUT}/${hn}-${kind}_${scheme}-${key}.png`, fullPage: false });
  }
  check('errors', `${tag} no page errors`, errors.length === 0, errors.join('; ').slice(0, 200));
  await ctx.close();
}
await b.close();
const fail = results.filter((r) => !r.ok).length;
writeFileSync(`${OUT}/verification.json`, JSON.stringify({ checked_at: new Date().toISOString(), pass: results.length - fail, fail, results }, null, 1) + '\n');
console.log(`${results.length - fail}/${results.length} passed`);
process.exit(fail ? 1 : 0);
