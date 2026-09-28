// D250 live acceptance. Usage: node ops/ux-2026-09-12/bin/verify-d250-live.mjs <base> <outDir>
//   base   e.g. https://benchmarkheaven.com
//   outDir absolute path; its previous verification.json is removed before the run, so an old
//          receipt can never be mistaken for this one's
//
// What it proves on the deployed site:
//  1. each of the four boards D250 registered carries judged === true and the `judged` tag in the
//     matrix API — queried with a model that actually holds that board, since /api/benchmark-matrix
//     only serves rows the compared models hold;
//  2. the two AA boards the vendor rows copy are still judged, so the pair cannot drift apart again;
//  3. VulcanBench Frontier v4 is out of the Coding category composite: the /benchmarks header counts
//     5 benchmarks feeding the group score, not 6, and does not name VulcanBench among them;
//  4. the row renders the Judged tag, desktop and mobile, light and dark;
//  5. /api/benchmarks serves both policy notes D250 converted.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
// Playwright lives outside this checkout on Sandy, as every shoot-* script in this folder resolves it.
const { chromium } = createRequire('/home/flori/n8n-local/')('playwright');

const [, , BASE = 'https://benchmarkheaven.com', OUT = '/tmp/d250'] = process.argv;
// board → a model that holds it (the matrix API serves only rows the compared models hold)
const BOARDS = {
  'vulcanbench-frontier': 'claude-fable-5.1::max',
  'anthropic-gdpval-aa-v2-1': 'claude-opus-5.5::max',
  'anthropic-aa-briefcase-v1-1': 'claude-opus-5.5::max',
  'xiaomi-gdpval-aa-2-1': 'mimo-v2.6-pro::default',
};
const PAGE_MODELS = ['claude-fable-5.1::max', 'gpt-6-astra::max'];
const checks = [];
const ok = (name, pass, detail) => checks.push({ name, pass: !!pass, detail });

async function getJson(path) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`${BASE}${path}`, { headers: { 'user-agent': 'benchmarkheaven-d250-verifier' } });
      if (r.ok) return await r.json();
      last = `HTTP ${r.status}`;
    } catch (e) { last = String(e); }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${path}: ${last}`);
}

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  rmSync(`${OUT}/verification.json`, { force: true });

  const byModel = new Map();
  for (const model of new Set(Object.values(BOARDS))) {
    byModel.set(model, (await getJson(`/api/benchmark-matrix?models=${encodeURIComponent(model)}`)).matrix);
  }
  for (const [key, model] of Object.entries(BOARDS)) {
    const rows = byModel.get(model).rows.filter((r) => r.key === key);
    ok(`matrix row served: ${key}`, rows.length > 0, `${rows.length} row(s) on ${model}`);
    for (const row of rows) {
      ok(`judged === true: ${row.id}`, row.judged === true, JSON.stringify(row.judged));
      ok(`judged tag: ${row.id}`, (row.tags ?? []).includes('judged'), JSON.stringify(row.tags));
    }
  }
  // the AA identities the three vendor rows copy must stay judged, or the pair is inconsistent again
  const opus = byModel.get('claude-opus-5.5::max');
  for (const key of ['aa-gdpval', 'aa-briefcase']) {
    const row = opus.rows.find((r) => r.key === key);
    ok(`AA sibling still judged: ${key}`, row?.judged === true, row ? JSON.stringify(row.judged) : 'row not served');
  }

  const benchmarks = await getJson('/api/benchmarks');
  const list = Array.isArray(benchmarks) ? benchmarks : (benchmarks.benchmarks ?? benchmarks.entries ?? []);
  for (const [id, phrase] of [
    ['frontiercode-cost::1.1', 'Benchmark Heaven policy: not a capability score and not a Composite input.'],
    ['vulcanbench-frontier::4', 'Benchmark Heaven policy: community benchmark (single operator), never a Composite input, and counted as a judged board for our category composites.'],
  ]) {
    const entry = list.find((b) => b.id === id);
    ok(`policy note served: ${id}`, (entry?.scoring?.notes ?? '').includes(phrase), entry ? (entry.scoring?.notes ?? '').slice(-170) : 'entry not served');
  }

  const url = `${BASE}/benchmarks?models=${PAGE_MODELS.map(encodeURIComponent).join(',')}`;
  for (const [label, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]]) {
    for (const theme of ['light', 'dark']) {
      // one browser per context: a shared Chromium dies on this page after a few contexts
      const browser = await chromium.launch();
      const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme, isMobile: label === 'mobile', hasTouch: label === 'mobile' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      for (let i = 0; i < 3; i++) {
        try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; }
        catch (e) { if (i === 2) throw e; }
      }
      await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(2500);
      const seen = await page.evaluate(() => {
        const flat = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
        const rows = [...document.querySelectorAll('tr')];
        const vulcan = rows.find((tr) => /VulcanBench Frontier v4/.test(tr.textContent ?? ''));
        const coding = rows.find((tr) => /^Coding\d+ benchmarks/.test(flat(tr).replace(/\s/g, '')) || /^Coding\s*\d+ benchmarks/.test(flat(tr)));
        return {
          vulcanTags: vulcan ? [...vulcan.querySelectorAll('.bh-matrix-tag')].map((e) => e.getAttribute('data-tag')) : null,
          codingHeader: flat(coding).slice(0, 400),
        };
      });
      ok(`${label}/${theme}: VulcanBench row served`, seen.vulcanTags !== null, seen.vulcanTags);
      ok(`${label}/${theme}: VulcanBench carries the Judged tag`, (seen.vulcanTags ?? []).includes('judged'), seen.vulcanTags);
      ok(`${label}/${theme}: Coding composite takes 5 rows, not 6`, /5 feed the group score/.test(seen.codingHeader), seen.codingHeader.slice(0, 200));
      ok(`${label}/${theme}: VulcanBench is not named among them`, seen.codingHeader.length > 0 && !/VulcanBench/.test(seen.codingHeader), seen.codingHeader.slice(0, 260));
      ok(`${label}/${theme}: no page error`, errors.length === 0, errors.slice(0, 3));
      await page.screenshot({ path: `${OUT}/benchmarks-${label}-${theme}.png` });
      await context.close();
      await browser.close();
    }
  }

  const pass = checks.filter((c) => c.pass).length;
  writeFileSync(`${OUT}/verification.json`, `${JSON.stringify({ base: BASE, checked_at: new Date().toISOString(), pass, total: checks.length, checks }, null, 2)}\n`);
  console.log(`${BASE}: ${pass}/${checks.length}`);
  for (const c of checks) if (!c.pass) console.log(`  FAIL ${c.name}: ${JSON.stringify(c.detail)?.slice(0, 260)}`);
  if (pass !== checks.length) process.exitCode = 1;
};

run().catch((e) => { console.error(e); process.exitCode = 1; });
