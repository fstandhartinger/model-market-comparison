// Iteration 94: CR-56 WebMCP tools. The page is loaded twice per viewport/scheme: once with a recording test double of
// navigator.modelContext injected by this verifier (the product ships no shim) — every tool is discovered and invoked
// with valid, invalid and boundary inputs — and once without it (unsupported browser: no registration, no page error).
// Also checks the Permissions-Policy header and that a cross-origin iframe does not register tools.
// Usage: node verify-cr-56-webmcp.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr56';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json();
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });
const head = await fetch(`${BASE}/about`);
check('CR-56.3: Permissions-Policy tools=(self) on pages', head.headers.get('permissions-policy') === 'tools=(self)', head.headers.get('permissions-policy'));
const double = () => {
  const registered = [];
  Object.defineProperty(navigator, 'modelContext', { configurable: true, value: { registerTool: (tool, options) => { registered.push({ tool, aborted: () => !!options?.signal?.aborted }); return Promise.resolve(); } } });
  window.__bhWebMcp = registered;
};
const browser = await chromium.launch();
try {
  for (const scheme of ['light', 'dark']) for (const [w, h] of [[1440, 900], [390, 844]]) {
    const tag = `${w}px ${scheme}`;
    for (const supported of [true, false]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, ...(w < 500 ? { isMobile: true, hasTouch: true } : {}) });
      await ctx.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, scheme);
      if (supported) await ctx.addInitScript(double);
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2500);
      if (!supported) {
        check(`CR-56.1 ${tag}: unsupported browser — no modelContext, no page error, page renders`, errors.length === 0 && await page.evaluate(() => !('modelContext' in navigator) && document.querySelectorAll('table, h1').length > 0), errors.slice(0, 3));
        await page.screenshot({ path: `${OUT}/unsupported-${w}-${scheme}.png` });
        await ctx.close(); continue;
      }
      const result = await page.evaluate(async () => {
        const reg = window.__bhWebMcp; const byName = Object.fromEntries(reg.map((r) => [r.tool.name, r.tool]));
        const run = async (name, input) => (await byName[name].execute(input, { signal: new AbortController().signal })).structuredContent;
        const search = await run('search_benchmarks', { query: 'gpqa diamond', limit: 3 });
        const id = search.benchmarks?.find((b) => b.models_with_results > 0)?.benchmark_id;
        const results = id ? await run('get_benchmark_results', { benchmark_id: id, limit: 50 }) : null;
        const modelId = results?.results?.find((r) => r.model_id)?.model_id;
        const summary = modelId ? await run('get_model_benchmark_summary', { model_id: modelId, benchmark_ids: [id, 'no-such-benchmark::1'] }) : null;
        return {
          names: reg.map((r) => r.tool.name).sort(), readOnly: reg.every((r) => r.tool.annotations?.readOnlyHint === true), schemas: reg.every((r) => r.tool.inputSchema?.additionalProperties === false),
          search: { ok: search.ok, n: search.benchmarks?.length, id }, results: results && { ok: results.ok, n: results.results.length, total: results.total, first: results.results[0] },
          modelId, summary: summary && { ok: summary.ok, first: summary.results[0], missing: summary.results[1] },
          invalid: [await run('search_benchmarks', { limit: 26 }), await run('get_benchmark_results', { benchmark_id: 'x y' }), await run('get_model_benchmark_summary', { model_id: 'no-such-model::x' }), await run('search_benchmarks', { nope: 1 })].map((x) => x.error?.code),
          boundary: (await run('search_benchmarks', { limit: 25 })).benchmarks.length,
          iframe: document.querySelectorAll('iframe').length,
        };
      });
      check(`CR-56.1 ${tag}: three read-only tools with closed schemas are registered`, JSON.stringify(result.names) === JSON.stringify(['get_benchmark_results', 'get_model_benchmark_summary', 'search_benchmarks']) && result.readOnly && result.schemas, result.names);
      check(`CR-56.1/56.2 ${tag}: valid calls return published results with unit, basis and dated source`, result.search.ok && result.search.n <= 3 && result.results?.ok && result.results.n <= 50 && result.results.first?.unit && result.results.first?.basis && result.results.first?.source?.retrieved_at && result.summary?.ok && result.summary.first?.value != null && result.summary.missing?.value === null, { search: result.search, results: result.results, summary: result.summary });
      // Contract: the tool value equals the public API's value for the same model and benchmark.
      const api = await (await fetch(`${BASE}/api/benchmark-scores?benchmark_id=${encodeURIComponent(result.search.id)}&model_id=${encodeURIComponent(result.modelId)}`)).json();
      check(`CR-56.2 ${tag}: tool value equals /api/benchmark-scores`, api.observations?.[0]?.value === result.summary?.first?.value && api.observations?.[0]?.source?.retrieved_at === result.summary?.first?.source?.retrieved_at, { api: api.observations?.[0]?.value, tool: result.summary?.first?.value });
      check(`CR-56.1 ${tag}: invalid inputs give structured errors; the boundary limit works`, JSON.stringify(result.invalid) === JSON.stringify(['invalid_input', 'invalid_input', 'not_found', 'invalid_input']) && result.boundary === 25, { invalid: result.invalid, boundary: result.boundary });
      check(`${tag}: no page errors with the tools registered`, errors.length === 0, errors.slice(0, 3));
      await ctx.close();
    }
  }
  // CR-56.3: the site framed by another origin registers nothing (the component only registers in the top-level page;
  // browsers additionally enforce Permissions-Policy tools=(self)). The same recording double is injected into every frame.
  {
    const ctx = await browser.newContext();
    await ctx.addInitScript(double);
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('data:text/html,<p>other origin</p>');
    await page.setContent(`<iframe src="${BASE}/about" width="800" height="600"></iframe>`);
    const frame = await (await page.waitForSelector('iframe')).contentFrame();
    await frame.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    const framed = await frame.evaluate(() => ({ registered: window.__bhWebMcp?.length ?? null, top: window.top === window.self }));
    check('CR-56.3: a cross-origin frame of the site registers no tools', framed.registered === 0 && framed.top === false, { framed, errors: errors.slice(0, 2) });
    await ctx.close();
  }
} finally { await browser.close(); }
const failed = checks.filter((c) => !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, at: new Date().toISOString(), passed: checks.length - failed.length, total: checks.length, checks }, null, 1));
console.log(`${checks.length - failed.length}/${checks.length} passed`); for (const c of failed) console.log('FAIL', c.name, c.detail);
