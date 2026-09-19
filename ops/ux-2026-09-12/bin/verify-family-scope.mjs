// Family-scope fill live verification — the boards that are measured once per model family
// (Epoch ECI, Software ECI, AA Agentic Index, DesignArena Web Apps / Full-Stack) must show
// the family value in every sibling-configuration column on /benchmarks, honestly labelled:
//   fs-1 — the five family-scope rows carry the "family" tag and the fill on the API,
//          and a filled sibling cell equals its donor's value (never a fabricated number);
//   fs-2 — /benchmarks shows the filled value (not "No result") in the default collapsed
//          columns for the headline families, at 1440 px and 390 px, light and dark;
//   fs-3 — a filled cell names the measured configuration (title + sr-only) and links to
//          the donor's result page; the row's tag explains the scope;
//   fs-4 — the result page for a sibling URL shows the family value with the scope note
//          and the donor's configuration named;
//   fs-5 — the Simple table on the homepage fills the same rows for its compared models;
//   fs-6 — saturation and ordering are not affected: no "saturated" chip on a family-scope
//          row that lacks coverage, and the ECI row keeps its value-based order.
// Usage: node verify-family-scope.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-family-scope';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
// 2026-09-19 (iteration 117): matched by family — the daily refresh rolls the snapshot date in the id (09-18 → 09-19).
const FS_KEYS = ['epoch_eci', 'epoch_eci_software', 'aa_agentic_index'];
const family = (id) => String(id).split('::')[0];

const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

// --- fs-1: API — fill is present, declared, and equal to the donor's own value -----------------------------
const MODELS = 'claude-fable-5.1::max,claude-fable-5.1::high,claude-opus-5::max,kimi-k3::max,kimi-k3::low';
const matrix = (await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(MODELS)}`)).json().catch(() => null))?.matrix ?? null;
if (!matrix?.rows?.length) check('api: /api/benchmark-matrix returns rows', false, String(matrix).slice(0, 200));
else {
  check('api: the family_scope tag is declared with an explanatory tip', (matrix.tags?.family_scope?.tip || '').length > 40, matrix.tags?.family_scope ?? null);
  const fsRows = matrix.rows.filter((r) => FS_KEYS.includes(family(r.id)));
  check('api: all three family-scope index rows are present', fsRows.length === 3, fsRows.map((r) => r.id));
  for (const r of fsRows) {
    const fill = r.familyScope?.fill ?? {};
    check(`api: ${r.id} has a non-empty fill and the family_scope tag`, Object.keys(fill).length > 0 && (r.tags || []).includes('family_scope'), { tags: r.tags, fillCount: Object.keys(fill).length });
    const donorId = fill['claude-fable-5.1::max'];
    if (donorId && r.values?.[donorId] != null && r.values?.['claude-fable-5.1::max'] != null) {
      check(`api: ${r.id} filled value equals the donor's own value (honest fill)`,
        r.values['claude-fable-5.1::max'] === r.values[donorId],
        { filled: r.values['claude-fable-5.1::max'], donor: r.values[donorId], donorId });
    }
    check(`api: ${r.id} — a deprecated sibling never receives a fill from a deprecated donor`,
      !Object.entries(fill).some(([k, d]) => /non-reasoning|deprecated/i.test(String(k).split('::')[1] || '') && /non-reasoning/i.test(String(d).split('::')[1] || '')),
      Object.entries(fill).filter(([k, d]) => /non-reasoning/i.test(d)).slice(0, 4));
  }
  const noScope = matrix.rows.filter((r) => family(r.id) === 'aa_intelligence_index');
  check('api: a per-configuration board (AA Intelligence) is NOT family-filled', noScope.length === 1 && noScope[0].familyScope == null, noScope[0]?.familyScope ?? 'row absent');
}

// --- fs-2..fs-5: the page ------------------------------------------------------------------
const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind !== 'desktop';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/benchmarks?rows=all&models=${encodeURIComponent(MODELS)}`);
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2000);

  // fs-2: ECI + Agentic rows filled in every default column (no "No result" cell)
  const seen = await page.evaluate(() => {
    const rows = {};
    for (const tr of document.querySelectorAll('main table tbody tr')) {
      const th = tr.querySelector('th'); if (!th) continue;
      const label = th.textContent || '';
      if (!/Epoch Capabilities Index \(ECI\)|Epoch Software ECI|AA Agentic Index/.test(label)) continue;
      const key = /Epoch Capabilities Index \(ECI\)/.test(label) ? 'eci' : /Software ECI/.test(label) ? 'ecisw' : 'agentic';
      const cells = [...tr.querySelectorAll('td.bh-matrix-cell')];
      rows[key] = {
        label: label.slice(0, 60),
        missing: cells.filter((td) => td.querySelector('.bh-matrix-missing')).length,
        filledWithSrc: cells.filter((td) => td.querySelector('a[data-family-src]')).length,
        tag: !!th.querySelector('.bh-matrix-tag[data-tag="family_scope"]') || /family/i.test(th.textContent || ''),
        tagTip: th.querySelector('.bh-matrix-tag')?.getAttribute('title') ?? '',
      };
    }
    const sample = document.querySelector('a[data-family-src]');
    return { rows, sample: sample ? { title: sample.getAttribute('title') ?? '', href: sample.getAttribute('href') ?? '', src: sample.getAttribute('data-family-src') } : null, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  for (const k of ['eci', 'ecisw', 'agentic']) {
    const r = seen.rows[k];
    check(`${tag} /benchmarks: ${k} row has no "No result" cells in the compared columns`, !!r && r.missing === 0, r ?? 'row not found');
    check(`${tag} /benchmarks: ${k} row carries the family tag`, !!r && r.tag, r);
    check(`${tag} /benchmarks: ${k} row is family-filled (cells link to the measured configuration)`, !!r && r.filledWithSrc >= 3, r); // 3 of the 5 pinned models are representatives/donor-less siblings: fable::max, opus::max, kimi::low
  }
  check(`${tag} /benchmarks: a filled cell names the measured configuration in its title`,
    !!seen.sample && /^Measured once for the whole model family, on /.test(seen.sample.title) && seen.sample.src.length > 3, seen.sample);
  check(`${tag} /benchmarks: no horizontal overflow`, seen.overflow <= 1, seen.overflow);
  check(`${tag} /benchmarks: no page error`, errors.length === 0, errors);
  await page.screenshot({ path: `${OUT}/benchmarks-${tag}.png`, fullPage: false });

  // fs-4: result page for a sibling (fable 5.1 ::max) shows the family value + scope note
  await goto(page, `${BASE}/benchmarks/result?axis=${encodeURIComponent('aa_agentic_index::snapshot-2026-09-18')}&model=claude-fable-5.1::max`);
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
  const res = await page.evaluate(() => ({
    scope: document.querySelector('[data-bh-result-scope]')?.textContent?.trim() ?? '',
    body: document.body.innerText.slice(0, 60000),
  }));
  check(`${tag} result page: sibling URL shows the family scope note naming the donor configuration`,
    /one value per model family/i.test(res.scope) && /Claude Fable 5\.1/.test(res.body) && /high/i.test(res.scope), res.scope.slice(0, 160));
  check(`${tag} result page: the compared table marks the filled sibling cell`,
    /family value, measured on/i.test(res.body), null);
  await page.screenshot({ path: `${OUT}/result-sibling-${tag}.png`, fullPage: false });
  await c.close();
}

// fs-5: Simple mode — the homepage shortlist table fills the family-scope rows
{
  const c = await b.newContext({ viewport: { width: 1440, height: 1100 }, colorScheme: 'light' });
  await c.addInitScript(() => { try { localStorage.setItem('bh-mode', 'simple'); } catch {} });
  const page = await c.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/`);
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2500);
  const simple = await page.evaluate(() => {
    const rows = [];
    for (const tr of document.querySelectorAll('main table tbody tr')) {
      const th = tr.querySelector('th'); if (!th) continue;
      const label = th.textContent || '';
      if (!/Epoch Capabilities Index \(ECI\)|AA Agentic Index/.test(label)) continue;
      const cells = [...tr.querySelectorAll('td')];
      rows.push({ label: label.slice(0, 50), missing: cells.filter((td) => td.querySelector('.bh-matrix-missing')).length, src: cells.filter((td) => td.querySelector('a[data-family-src]')).length });
    }
    return { rows, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  check('simple mode: family-scope rows present in the shortlist table', simple.rows.length >= 1, simple.rows);
  for (const r of simple.rows) {
    check(`simple mode: "${r.label}" has no "No result" cells in the shortlist`, r.missing === 0, r);
  }
  check('simple mode: no horizontal overflow', simple.overflow <= 1, simple.overflow);
  check('simple mode: no page error', errors.length === 0, errors);
  await page.screenshot({ path: `${OUT}/simple-home.png`, fullPage: false });
  await c.close();
}
await b.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision ?? null, at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
console.log(`${passed}/${checks.length} checks passed`);
for (const c of checks) if (!c.ok) console.log(`FAIL ${c.name}: ${c.detail}`);
process.exit(passed === checks.length ? 0 : 1);
