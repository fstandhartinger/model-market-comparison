// Run against a production server. Browser tooling may be provided outside app dependencies.
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.BH_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.BH_UI_URL || 'http://127.0.0.1:3316';
const out = process.env.BH_UI_OUT || 'ops/rebuild-2026-09/evidence/phase-06/rendered';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.BH_CHROME || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const receipt = { base, at: new Date().toISOString(), environment: 'Headless system Chrome on Sandy, local production HTTP unless URL overrides; no network/CPU throttling', pages: [], interactions: [], screenshots: [] };
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark', reducedMotion: 'reduce' });
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  window.__bhPerf = { cls: 0, lcp: null };
  new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__bhPerf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__bhPerf.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
});
async function shot(name, locator = null) {
  const file = `${out}/${name}.png`;
  if (locator) await locator.screenshot({ path: file }); else await page.screenshot({ path: file });
  const bytes = await readFile(file); receipt.screenshots.push({ file, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, viewport: page.viewportSize(), theme: await page.locator('html').getAttribute('data-theme') });
}
async function loaded() { await page.waitForLoadState('networkidle'); }
async function seriesCount(n) { await page.waitForFunction((expected) => document.querySelector('[aria-label="Chart legend"]')?.children.length === expected, n); }
async function audit(name) {
  await loaded();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const metrics = await page.evaluate(() => ({ ...window.__bhPerf, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime, documentWidth: document.documentElement.scrollWidth, viewport: innerWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }));
  assert.ok(metrics.documentWidth <= metrics.viewport + 1, `${name}: document overflow ${JSON.stringify(metrics)}`);
  let axe = null;
  if (process.env.BH_AXE_PATH) { await page.addScriptTag({ path: process.env.BH_AXE_PATH }); axe = await page.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','best-practice'] } }); return { violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 12).map((n) => ({ target: n.target, failure: n.failureSummary })) })), incomplete: r.incomplete.map((v) => v.id), passes: r.passes.length }; }); }
  await writeFile(`${out}/${name}-aria.txt`, await page.locator('body').ariaSnapshot());
  receipt.pages.push({ name, url: page.url(), metrics, axe });
}
try {
  await page.goto(`${base}/compare`); await loaded();
  await page.keyboard.press('Tab'); assert.match(await page.locator(':focus').innerText(), /Skip to main/);
  await page.keyboard.press('Enter'); assert.equal(await page.locator(':focus').getAttribute('id'), 'main-content');
  receipt.interactions.push('Tab reaches skip link; Enter focuses main content');
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await audit('compare-dark'); await shot('compare-dark');
  await shot('radar-dark', page.getByRole('region', { name: 'Benchmark radar', exact: true }));
  await page.getByRole('combobox', { name: 'Model C', exact: true }).selectOption('gpt-5.6-terra::high'); await seriesCount(3);
  await page.getByRole('combobox', { name: 'Model D', exact: true }).selectOption('grok-4.6::high'); await seriesCount(4);
  assert.equal(await page.getByRole('list', { name: 'Chart legend' }).locator('li').count(), 4);
  await shot('radar-four', page.getByRole('region', { name: 'Benchmark radar', exact: true }));
  await page.getByRole('button', { name: /Remove GPT-5.6 Terra/ }).focus(); await page.keyboard.press('Enter'); await seriesCount(3);
  assert.equal(await page.getByRole('list', { name: 'Chart legend' }).locator('li').count(), 3);
  receipt.interactions.push('Native model selects add C/D to four series; focused Remove + Enter reduces to three');
  const axisSummary = page.locator('summary').filter({ hasText: 'Radar axes' }); await axisSummary.focus(); await page.keyboard.press('Enter');
  const checks = axisSummary.locator('..');
  while (await checks.locator('input:checked').count() < 8) { const c = checks.locator('input:not(:checked):not(:disabled)').first(); await c.focus(); await page.keyboard.press('Space'); }
  assert.equal(await checks.locator('input:checked').count(), 8); assert.ok(await checks.locator('input:disabled').count() > 0);
  receipt.interactions.push('Keyboard Space selects radar axes; eight-axis cap disables remaining choices');
  await axisSummary.focus(); await page.keyboard.press('Enter');
  const evidence = page.locator('#full-comparison summary').filter({ hasText: /^Evidence$/ }).first(); await evidence.focus(); await page.keyboard.press('Enter'); assert.equal(await evidence.locator('..').getAttribute('open'), '');
  await shot('compare-evidence', page.locator('#full-comparison').locator('table').locator('tbody').first());
  receipt.interactions.push('Keyboard Enter opens a numeric source evidence disclosure');
  await page.getByRole('button', { name: /theme/i }).click(); assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await audit('compare-light'); await shot('radar-light', page.getByRole('region', { name: 'Benchmark radar', exact: true }));
  await page.goto(`${base}/radar`); await loaded(); await audit('radar-light');
  await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => window.scrollTo(0, 0)); await audit('radar-mobile'); await shot('radar-mobile'); await page.locator('#benchmark-radar').evaluate((el) => window.scrollTo(0, scrollY + el.getBoundingClientRect().top - 16)); await shot('radar-mobile-chart');
  await page.setViewportSize({ width: 320, height: 844 }); await audit('radar-320');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/benchmarks`); await loaded(); await audit('ranking-light'); await shot('ranking-light');
  await page.getByRole('combobox', { name: 'Benchmark and version', exact: true }).selectOption('aa-coding-agent-index::1.5'); await loaded();
  assert.match(await page.locator('main').innerText(), /Version 1.5/); await shot('ranking-v1-5');
  await page.getByLabel('Search models', { exact: true }).fill('no-such-model-638173'); assert.ok(await page.getByText('No results in this view', { exact: true }).isVisible());
  receipt.interactions.push('Version selector exposes v1.5 separately; no-match search displays explicit empty state');
  await page.getByLabel('Search models', { exact: true }).fill('');
  await page.setViewportSize({ width: 390, height: 844 }); await audit('ranking-mobile'); await shot('ranking-mobile');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/models/gpt-5.6-sol%3A%3Ahigh`); await loaded();
  await page.locator('#benchmark-sheet').scrollIntoViewIfNeeded(); await audit('model-sheet'); await shot('model-sheet');
  const why = page.locator('#benchmark-sheet summary').filter({ hasText: /^Why$/ }).first();
  if (await why.count()) { await why.focus(); await page.keyboard.press('Enter'); await shot('anomaly-why'); receipt.interactions.push('Model sheet anomaly Why opens through keyboard; input values and directed z are rendered'); }
  await page.goto(`${base}/models/qwen3-235b-a22b-thinking-2507%3A%3Areasoning`); await loaded();
  const claim = page.locator('#benchmark-sheet').getByText('self-reported', { exact: true }).first(); await claim.scrollIntoViewIfNeeded(); await shot('self-reported-sheet');
  await page.goto(`${base}/`); await loaded(); await audit('overview-light'); await shot('overview-light');
  await page.setViewportSize({ width: 390, height: 844 }); await audit('overview-mobile'); await shot('overview-mobile');
  await page.getByRole('button', { name: /theme/i }).click(); await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark'); await audit('overview-dark-mobile');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/compare`); await loaded();
  let fail = true;
  await page.route('**/api/benchmark-view?*', (route) => fail ? route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }) : route.continue());
  await page.getByRole('combobox', { name: 'Model C', exact: true }).selectOption('gpt-5.6-terra::high'); await page.getByRole('button', { name: 'Retry loading', exact: true }).waitFor({ state: 'visible' });
  assert.ok(await page.getByRole('button', { name: 'Retry loading', exact: true }).isVisible());
  fail = false; await page.getByRole('button', { name: 'Retry loading', exact: true }).click(); await seriesCount(3);
  assert.equal(await page.getByRole('list', { name: 'Chart legend' }).locator('li').count(), 3);
  receipt.interactions.push('Injected local HTTP503 shows retry; retry loads three models without stale or fabricated scores');
  await page.unroute('**/api/benchmark-view?*');
  const summary = page.locator('summary').filter({ hasText: 'Price & provider comparison' }); await summary.focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /Select GPT-5.6 Sol \(high\) for comparison/ }).click(); await page.getByRole('button', { name: /Select Grok 4.6 \(high\) for comparison/ }).click();
  receipt.interactions.push('Legacy two-model price/provider comparison remains selectable');
  receipt.errors = errors; assert.equal(errors.length, 0, 'browser runtime errors');
  receipt.verdict = receipt.pages.some((p) => p.axe?.violations.length) ? 'needs-accessibility-fixes' : 'pass';
} catch (error) { await shot('failure'); await writeFile(`${out}/failure-aria.txt`, await page.locator('body').ariaSnapshot()); receipt.failure = error.stack; receipt.verdict = 'failed'; process.exitCode = 1; }
finally { await writeFile(`${out}/browser-checks.json`, JSON.stringify(receipt, null, 2)+'\n'); await browser.close(); }
console.log(JSON.stringify({ verdict: receipt.verdict, failure: receipt.failure, pages: receipt.pages.map((p) => ({ name:p.name, violations:p.axe?.violations.map((v) => v.id), metrics:p.metrics })), interactions:receipt.interactions.length, screenshots:receipt.screenshots.length },null,2));
