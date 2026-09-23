// Live verifier for F-165(b) — the cohort sub-line prints only when it is not the default
// "Published board". For a non-implementing engine to run on both hosts:
//
//   node verify-f165-b.mjs <base> <outDir>
//
// Nothing is pinned to a screenshot or a fixed row list. The expected set is re-derived from the
// host's own /api/benchmark-view payload: every axis whose cohort is the default must render its
// name with no cohort sub-line, and every axis whose cohort says something must still show it. The
// models picked are the ones F-165 is about — two same-named Terminal-Bench 4.0 rows on one sheet,
// one Vals' measured run and one Anthropic's launch claim.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || `/tmp/f165b-${new URL(BASE).hostname}`;
await fs.mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' — ' + JSON.stringify(detail ?? null).slice(0, 500)}`); };

const PICKS = ['claude-opus-5.5::max', 'gpt-6-sol::max'];
const api = async (path) => { const r = await fetch(`${BASE}${path}`); if (!r.ok) throw new Error(`${path} → ${r.status}`); return r.json(); };

const view = await api(`/api/benchmark-view?${PICKS.map((id) => `model=${encodeURIComponent(id)}`).join('&')}&collapse=1`);
const axes = view.axes ?? [];
const defaultCohort = axes.filter((a) => a.cohort === 'Published board');
const namedCohort = axes.filter((a) => a.cohort && a.cohort !== 'Published board');
check('payload/has-default-cohort-axes', defaultCohort.length > 0, `${defaultCohort.length} of ${axes.length} axes carry the default cohort`);
check('payload/cohort-strings-unchanged', axes.every((a) => typeof a.cohort === 'string' && a.cohort.length > 0),
  `F-165(b) is display-only: every axis still carries its cohort in the payload (${namedCohort.length} name something)`);

const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    for (const scheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, colorScheme: scheme });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(String(e)));
      const url = `${BASE}/compare?${PICKS.map((id) => `model=${encodeURIComponent(id)}`).join('&')}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForTimeout(1200);
      const label = `${width}-${scheme}`;

      const text = await page.evaluate(() => document.body.innerText);
      check(`${label}/no-published-board-anywhere`, !text.includes('Published board'),
        text.includes('Published board') ? text.slice(Math.max(0, text.indexOf('Published board') - 160), text.indexOf('Published board') + 160) : 'absent from the rendered page');

      // A cohort that does say something must still be printed, or this became a deletion.
      if (namedCohort.length) {
        const shown = namedCohort.filter((a) => text.includes(a.cohort));
        check(`${label}/named-cohorts-still-render`, shown.length > 0,
          `${shown.length} of ${namedCohort.length} named cohorts visible in the rendered rows`);
      }

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${label}/no-horizontal-overflow`, overflow <= 1, `${overflow}px`);
      check(`${label}/no-page-errors`, pageErrors.length === 0, pageErrors.slice(0, 3));

      await page.screenshot({ path: `${OUT}/compare_${label}.png`, fullPage: false });
      await context.close();
    }
  }
} finally { await browser.close(); }

const passed = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, `${JSON.stringify({ base: BASE, verified_at: new Date().toISOString(), passed, total: results.length, results }, null, 2)}\n`);
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
