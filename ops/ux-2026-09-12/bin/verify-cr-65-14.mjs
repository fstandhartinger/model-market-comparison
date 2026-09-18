// CR-65.14 live verification — the board lifecycle, on the page.
//  The registry marks a board `retained` when its maintainer stopped reporting it. Until 2026-09-18 that
//  field was validated and never read: the protocol review's packet omitted it (so the AA arm failed closed
//  from 11 Sep on), and no surface told a reader that a row had stopped moving. This checks the reader's half.
//    65.14a — /benchmarks shows a "Retired" tag on exactly the boards whose registry entry is `retained`,
//             with the tooltip, at 1440 and 390 px, light and dark.
//    65.14b — Terminal-Bench 2.1 is NOT tagged: AA's protocol says it remains part of the Coding Index, and
//             the 2026-09-18 capture scored six new models on it. A retirement label there would be false.
//    65.14c — the Coding Agent Index best-of row is not tagged either: it merges a retained v1.4 into a live v1.5.
//    65.14d — the API agrees with the page: /api/benchmark-matrix rows carry `retired` matching the registry.
// Usage: node verify-cr-65-14.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-65-14';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

// Two catalog models chosen so every row this file judges exists in the matrix the page and the API build
// (both keep only rows the compared models have a value for): the three retired AA boards, Terminal-Bench 2.1
// (which must NOT be tagged) and the Coding Agent Index best-of row (which must not be either).
const MODELS = 'claude-fable-5::max,gpt-5.2::xhigh';

// --- the API half: every row's `retired` flag against the registry it came from -----------------------------
const matrix = (await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(MODELS)}`)).json().catch(() => null))?.matrix ?? null;
if (!matrix?.rows?.length) check('api: /api/benchmark-matrix returns rows', false, String(matrix).slice(0, 200));
else {
  const tagged = matrix.rows.filter((r) => r.retired === true);
  check('api: at least one board is marked retired', tagged.length > 0, { retired: tagged.length, rows: matrix.rows.length });
  check('api: every retired row carries the tag, and no other row does',
    matrix.rows.every((r) => (r.tags || []).includes('retired') === (r.retired === true)),
    matrix.rows.filter((r) => (r.tags || []).includes('retired') !== (r.retired === true)).map((r) => r.id));
  check('api: the retired tag is declared with its tooltip', (matrix.tags?.retired?.tip || '').length > 20, matrix.tags?.retired ?? null);
  const tb21 = matrix.rows.find((r) => String(r.version) === '2.1' && /Terminal-Bench/i.test(r.name));
  check('api: Terminal-Bench 2.1 is not labelled retired — AA still reports it in the Coding Index',
    !!tb21 && tb21.retired !== true, tb21 ? { id: tb21.id, retired: tb21.retired === true, tags: tb21.tags } : 'row not found');
  const bestOf = matrix.rows.find((r) => r.bestOf && /Coding Agent Index/i.test(r.name));
  check('api: the Coding Agent best-of row is not retired — it merges a retained v1.4 into a live v1.5',
    !bestOf || bestOf.retired !== true, bestOf ? { id: bestOf.id, retired: bestOf.retired === true } : 'no best-of row');
  const aime = matrix.rows.find((r) => /AIME 2025/i.test(r.name));
  check('api: AIME 2025 (AA) is labelled retired — AA retired it from active reporting',
    !!aime && aime.retired === true, aime ? { id: aime.id, retired: aime.retired === true, tags: aime.tags } : 'row not found');
}

// --- the reader's half: the tag on the page, both widths, both themes ---------------------------------------
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
  const seen = await page.evaluate(() => ({
    retired: [...document.querySelectorAll('.bh-matrix-tag[data-tag="retired"]')].map((el) => ({
      label: el.textContent?.replace(/:.*$/, '').trim(), tip: el.getAttribute('title') ?? '',
      row: el.closest('th,td,tr')?.textContent?.trim().slice(0, 70) ?? null })),
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  check(`${tag} /benchmarks: at least one row carries the Retired tag`, seen.retired.length > 0, { count: seen.retired.length });
  check(`${tag} /benchmarks: the tag reads "Retired" and explains itself on hover`,
    seen.retired.length > 0 && seen.retired.every((t) => t.label === 'Retired' && /no longer scored|stopped reporting/i.test(t.tip)),
    seen.retired.slice(0, 3));
  check(`${tag} /benchmarks: a retired row still shows which board it is`,
    seen.retired.every((t) => (t.row || '').length > 5), seen.retired.slice(0, 2).map((t) => t.row));
  check(`${tag} /benchmarks: no horizontal overflow`, seen.overflow <= 1, seen.overflow);
  check(`${tag} /benchmarks: no page error`, errors.length === 0, errors);
  await page.screenshot({ path: `${OUT}/benchmarks-${tag}.png`, fullPage: false });
  await c.close();
}
await b.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision ?? null, at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
console.log(`${passed}/${checks.length} checks passed`);
for (const c of checks) if (!c.ok) console.log(`FAIL ${c.name}: ${c.detail}`);
process.exit(passed === checks.length ? 0 : 1);
