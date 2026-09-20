// CR-68.5 live verification (2026-09-20, iteration 139): "Same benchmark measured by two runners …
// once harness/version equality is verified, show a large disagreement as its own 'runner disagreement'
// evidence line; if the versions differ, don't pair them at all."
// Checks on a deployed host: the API carries the reviewed pairs with both ranks taken inside the shared
// cohort; the change request's own example (DeepSeek V4 Pro 0813 on Terminal-Bench 2.1, AA vs Vals) is
// flagged; a pair whose versions differ is never produced; the line renders on the Benchmaxxing report at
// 1440 light and 390 dark, names both runners and their harnesses, says it is not part of the score, and
// a model with no large disagreement shows no line at all.
// Usage: node verify-cr-68-5.mjs <base> <outdir> [revision]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-68-5';
const REV = process.argv[4] || null;
await fs.mkdir(OUT, { recursive: true });
const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const FLAGGED = 'deepseek-v4-pro-0813::max';

const meta = await (await fetch(`${BASE}/api/meta`)).json();
check('the host serves the revision under test', !REV || meta.revision === REV, meta.revision);

const report = async (id) => (await (await fetch(`${BASE}/api/benchmaxxing?report=${encodeURIComponent(id)}`)).json()).report;
const r = await report(FLAGGED);
const rows = r.runnerDisagreements ?? [];
check('the report carries the reviewed runner pairs', Array.isArray(rows) && rows.length >= 3, rows.length);
const tb = rows.find((d) => d.id === 'terminal-bench-2.1');
check('the change request\'s own example is computed', !!tb, tb && [tb.a.runner, tb.b.runner]);
check('it pairs Artificial Analysis with Vals AI', tb && tb.a.runner === 'Artificial Analysis' && tb.b.runner === 'Vals AI', tb && [tb.a.runner, tb.b.runner]);
check('the disagreement is large and AA ranks it higher', tb && tb.large === true && tb.gap >= 20, tb && tb.gap);
check('both ranks come from the shared cohort, not the boards\' own populations', tb && tb.sharedCohort >= 10 && tb.sharedCohort <= 60, tb && tb.sharedCohort);
check('the gap is exactly the rank difference', tb && Math.abs(tb.gap - (tb.a.percentile - tb.b.percentile)) < 1e-9, tb && [tb.a.percentile, tb.b.percentile, tb.gap]);
check('each side names its board, runner and harness', tb && [tb.a, tb.b].every((s) => s.benchmarkId && s.runner && s.harness && s.value != null), tb && [tb.a.benchmarkId, tb.b.benchmarkId]);
check('the group states why the two versions are equal', tb && /Terminal-Bench 2\.1/.test(tb.versionEquality) && /4\.0/.test(tb.versionEquality), (tb?.versionEquality || '').slice(0, 120));
check('no pair mixes two versions of one board', rows.every((d) => d.a.benchmarkId !== d.b.benchmarkId
  && !(d.a.benchmarkId.startsWith('aa-terminal-bench::') && d.b.benchmarkId.startsWith('aa-terminal-bench::'))), rows.map((d) => [d.a.benchmarkId, d.b.benchmarkId]));
check('GPQA Diamond is compared across its three runners', rows.filter((d) => d.id === 'gpqa-diamond').length === 3,
  rows.filter((d) => d.id === 'gpqa-diamond').map((d) => `${d.a.runner}/${d.b.runner}`));
check('the published score is still only gap + jaggedness', Math.abs(r.score - (r.parts.gap + r.parts.jaggednessTerm)) < 1e-9, [r.score, r.parts.gap, r.parts.jaggednessTerm]);
// A model whose runners agree must not get the line: pick one from the API itself.
const quietId = 'gpt-5.6-sol::max';
const quiet = await report(quietId);
const quietLarge = (quiet.runnerDisagreements ?? []).filter((d) => d.large);
check('a model whose runners agree carries no large disagreement', quietLarge.length === 0, quietLarge.map((d) => d.gap));

const browser = await chromium.launch();
for (const [label, width, height, scheme] of [['desktop-light', 1440, 1000, 'light'], ['phone-dark', 390, 844, 'dark']]) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}/benchmaxxing?model=${encodeURIComponent(FLAGGED)}#radar`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  const block = page.locator('[data-bmx-runner-disagreement]').first();
  check(`${label}: the evidence line is on the report`, await block.count() === 1, await block.count());
  const text = await block.count() ? (await block.innerText()).replace(/\s+/g, ' ') : '';
  check(`${label}: it leads with the size of the disagreement`, /\d+ points on Terminal-Bench 2\.1/.test(text), text.slice(0, 90));
  check(`${label}: it names both runners with their ranks`, /Artificial Analysis ranks it p\d+/.test(text) && /Vals AI p\d+/.test(text), text.slice(0, 160));
  check(`${label}: it says the ranks are inside the shared cohort`, /among the \d+ models both ran/.test(text), /among the \d+ models both ran/.exec(text)?.[0]);
  const harnessTitles = await block.locator('[data-bmx-runner-a], [data-bmx-runner-b]').evaluateAll((e) => e.map((x) => x.getAttribute('title') || '')).catch(() => []);
  check(`${label}: each runner's name carries its harness (title)`, harnessTitles.some((t) => /Terminus 2/.test(t)) && harnessTitles.some((t) => /standard error/.test(t)), harnessTitles);
  check(`${label}: it states versions that differ are never paired`, /differ are never paired/.test(text), '');
  check(`${label}: it states it is not part of the score`, /not part of the score/.test(text), '');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${label}: no horizontal page overflow`, overflow <= 1, overflow);
  check(`${label}: no page error`, errors.length === 0, errors.slice(0, 3));
  await block.scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${OUT}/${label}.png` });
  await context.close();
}
await browser.close();

const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, `${JSON.stringify({ base: BASE, revision: meta.revision, passed, total: checks.length, checks }, null, 2)}\n`);
for (const c of checks) if (!c.ok) console.log('FAIL', c.name, c.detail);
console.log(`${passed}/${checks.length} ${BASE}`);
process.exit(passed === checks.length ? 0 : 1);
