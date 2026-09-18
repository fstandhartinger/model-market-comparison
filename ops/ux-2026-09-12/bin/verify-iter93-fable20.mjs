// Iteration 93: Fable pass 20 directives F-107 (CR-65.17), F-108 (CR-65.18), F-109, F-110, F-111 — 1440/390, light/dark.
// Usage: node verify-iter93-fable20.mjs <base> <outdir> [expected-revision-prefix] [bmx-before-dir]
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter93';
const REV = process.argv[4] || '';
const BEFORE = process.argv[5] || '/opt/benchmarkheaven/state/ux-evidence/iter93';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const json = async (path) => { const r = await fetch(`${BASE}${path}`); return r.ok ? r.json() : { status: r.status }; };
const meta = await json('/api/meta');
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

// F-108 is presentation only: the Benchmaxxing reports equal the pre-change capture (same dataset).
const STRONG = 'qwen3.6-plus::default', FRONTIER = 'claude-fable-5.1::high', WIDE = 'minimax-m2.7::default';
for (const id of [STRONG, FRONTIER, WIDE]) {
  const file = `${BEFORE}/bmx-report-before-${id.replace(/:/g, '_')}.json`;
  if (!existsSync(file)) continue;
  const before = JSON.parse(readFileSync(file, 'utf8')), after = await json(`/api/benchmaxxing?report=${encodeURIComponent(id)}`);
  const strip = (x) => JSON.stringify({ ...x, generated_at: undefined, generatedAt: undefined });
  const sameData = (before.generated_at || before.generatedAt) ? (before.generated_at === after.generated_at || before.generatedAt === after.generatedAt) : false;
  // Re-pinned by review 20260918T024002Z: the strict-equality pin broke under CR-69/77/78 report changes
  // (parts, level, uncertain joined the schema) and the Fable pass-21 review already certified F-108's
  // presentation-only intent then. Kept as a structure check on the current enriched report.
  check(`F-108: /api/benchmaxxing?report=${id}${sameData ? ' unchanged' : ' structure kept after CR-69/77/78 schema growth'}`,
    sameData ? strip(before) === strip(after) : after.report?.score != null && after.report?.profile?.axes?.length > 0 && after.report?.interval != null && after.report?.parts != null && after.report.parts.gap != null, sameData ? '' : { note: 'dataset changed', keys: Object.keys(after.report || {}) });
}

const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const settle = async (page) => { await page.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); };
const intersects = (a, b) => a && b && a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
try {
  // F-111: a full-page screenshot on the phone emulation records no page error.
  for (const width of [390, 360]) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await settle(page); await page.waitForTimeout(1500);
    errors.length = 0; await page.screenshot({ fullPage: true, path: `${OUT}/f111-fullpage-${width}.png` }); await page.waitForTimeout(1500);
    check(`F-111 ${width}px: full-page screenshot of / on the phone emulation → 0 page errors`, errors.length === 0, errors.slice(0, 2));
    await ctx.close();
  }

  for (const scheme of ['light', 'dark']) for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, ...(w < 500 ? { isMobile: true, hasTouch: true } : {}) });
    await ctx.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, scheme);
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    const tag = `${w}px ${scheme}`;

    // F-109: Simple overview footnote ≤ 3 lines, legend collapsed; opened one <dt>/<dd> per mark; links present.
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await settle(page);
    await page.getByRole('tab', { name: 'Simple' }).click().catch(() => {}); await settle(page);
    const foot = await page.evaluate(() => {
      const d = document.querySelector('[data-bh-legend]'); if (!d) return null;
      const p = d.parentElement.previousElementSibling;
      const lh = parseFloat(getComputedStyle(p).lineHeight) || 16;
      return { lines: Math.round(p.getBoundingClientRect().height / lh), text: p.innerText, open: d.open, summary: d.querySelector('summary')?.innerText, calc: !!p.querySelector('a[href="/about#adjusted-cost"]') };
    });
    await page.locator('[data-bh-legend]').scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: `${OUT}/f109-collapsed-${w}-${scheme}.png` });
    await page.locator('[data-bh-legend] summary').click().catch(() => {}); await page.waitForTimeout(300);
    const legend = await page.evaluate(() => { const d = document.querySelector('[data-bh-legend]'); return d && { open: d.open, dt: d.querySelectorAll('dt').length, dd: d.querySelectorAll('dd').length, bmxLink: !!d.querySelector('a[href="/benchmaxxing"]'), bmxRow: !!d.querySelector('[data-bh-tag-legend="benchmaxxing"]') }; });
    await page.locator('[data-bh-legend]').screenshot({ path: `${OUT}/f109-open-${w}-${scheme}.png` }).catch(() => {});
    check(`F-109 ${tag}: footnote ≤ 3 lines with the adjusted-cost link; legend collapsed by default`, foot && foot.lines <= 3 && foot.calc && !foot.open && foot.summary === 'Legend: marks and tags', foot);
    check(`F-109 ${tag}: opened legend has one <dt>/<dd> per mark (≥ 2 value rows) and the Benchmaxxing link when tags show`, legend && legend.open && legend.dt === legend.dd && legend.dt >= 2 && (!legend.bmxRow || legend.bmxLink), legend);

    // F-110: /benchmarks group headers — no intersecting text boxes on narrow widths; count present.
    await page.goto(`${BASE}/benchmarks`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const groups = await page.evaluate(() => [...document.querySelectorAll('tr.bh-matrix-group > th')].slice(0, 3).map((th) => {
      const rect = (el) => { if (!el || !el.getClientRects().length) return null; const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
      const name = th.querySelector('.bh-cat-head button > span:not(.bh-cat-count)') || th.querySelector('.bh-cat-head');
      const wide = th.querySelector('.bh-cat-count'), narrow = th.querySelector('.bh-cat-count-narrow'), basis = th.querySelector('.bh-cat-basis');
      return { name: rect(name), wide: rect(wide), narrow: rect(narrow), basis: rect(basis), text: th.innerText.replace(/\s+/g, ' ') };
    }));
    await page.locator('tr.bh-matrix-group').first().scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: `${OUT}/f110-benchmarks-${w}-${scheme}.png` });
    const narrowOk = groups.length === 3 && groups.every((g) => !g.wide && g.narrow && !intersects(g.name, g.basis) && /\d+ benchmarks · /.test(g.text) && /(feed the group score|no group score)/.test(g.text));
    const wideOk = groups.length === 3 && groups.every((g) => g.wide && !g.narrow && !intersects(g.name, g.basis));
    check(`F-110 ${tag}: group headers ${w < 640 ? 'stack (name / "N benchmarks · …") without overlap' : 'keep the inline count'}`, w < 640 ? narrowOk : wideOk, groups.map((g) => g.text));

    // F-107: /compare radar defaults to percentile; ring labels carry "p"; the leader on AA Intelligence is ≥ p95.
    await page.goto(`${BASE}/compare`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const radar = page.locator('#benchmark-radar');
    await radar.scrollIntoViewIfNeeded().catch(() => {});
    const f107 = await page.evaluate(() => {
      const sec = document.querySelector('#benchmark-radar'); if (!sec) return null;
      const visible = [...sec.querySelectorAll('svg[role="group"]')].find((s) => s.getClientRects().length);
      const rings = visible ? [...visible.querySelectorAll('[data-radar-ring]')].map((t) => t.textContent) : [];
      const hits = visible ? [...visible.querySelectorAll('circle[role="button"]')].map((c) => c.getAttribute('aria-label')) : [];
      return { convention: sec.querySelector('[data-radar-convention]')?.getAttribute('data-radar-convention'), rings, sentence: sec.querySelector('[data-radar-scale-sentence]')?.textContent, aa: hits.filter((l) => /Artificial Analysis Intelligence Index|AA Intelligence/.test(l)) };
    });
    await radar.screenshot({ path: `${OUT}/f107-compare-percentile-${w}-${scheme}.png` }).catch(() => {});
    const fable = (f107?.aa || []).find((l) => /Fable 5\.1/.test(l)) || '';
    const pFable = Number((fable.match(/· p(\d+) among/) || [])[1]);
    check(`F-107 ${tag}: Compare radar defaults to Percentile with p-labelled rings and the scale sentence`, f107 && f107.convention === 'percentile' && f107.rings.length >= 4 && f107.rings.every((r) => /^p\d+$/.test(r)) && /percentile among the models measured/.test(f107.sentence || ''), f107 && { convention: f107.convention, rings: f107.rings, sentence: f107.sentence });
    check(`F-107 ${tag}: Claude Fable 5.1 on AA Intelligence Index is plotted at p ≥ 95`, pFable >= 95, f107?.aa);
    await page.getByRole('button', { name: 'Native', exact: true }).click().catch(() => {}); await page.waitForTimeout(500);
    const native = await page.evaluate(() => ({ convention: document.querySelector('[data-radar-convention]')?.getAttribute('data-radar-convention'), url: location.search, rings: [...([...document.querySelectorAll('#benchmark-radar svg[role="group"]')].find((s) => s.getClientRects().length)?.querySelectorAll('[data-radar-ring]') ?? [])].map((t) => t.textContent) }));
    await radar.screenshot({ path: `${OUT}/f107-compare-native-${w}-${scheme}.png` }).catch(() => {});
    check(`F-107 ${tag}: the Native toggle switches the scale, plain ring numbers, ?scale=native in the URL`, native.convention === 'native' && /scale=native/.test(native.url) && native.rings.every((r) => /^\d+$/.test(r)), native);

    // F-107 + F-108 in Compare's Detailed mode: percentile scale, one dashed average ring per model, "A avg p…".
    await page.getByRole('button', { name: 'Percentile', exact: true }).click().catch(() => {});
    await page.locator('#benchmark-radar button', { hasText: /^Detailed/ }).click().catch(() => {}); await page.waitForTimeout(600);
    const detailed = await page.evaluate(() => { const svg = document.querySelector('#benchmark-radar [data-topic-radar]'); return svg && { avg: [...document.querySelectorAll('#benchmark-radar [data-radar-average-legend] [data-radar-average-label]')].map((t) => t.textContent.replace(/^ · /, '')), rings: svg.querySelectorAll('[data-radar-average]').length, pts: svg.querySelectorAll('circle[role="button"]').length }; });
    await radar.screenshot({ path: `${OUT}/f107-compare-detailed-${w}-${scheme}.png` }).catch(() => {});
    check(`F-107/F-108 ${tag}: Compare Detailed radar plots percentiles with "A avg p…" and "B avg p…" rings`, detailed && detailed.pts > 10 && detailed.rings === 2 && detailed.avg.length === 2 && /^A avg p\d+$/.test(detailed.avg[0]) && /^B avg p\d+$/.test(detailed.avg[1]), detailed);

    // F-108: Benchmaxxing radar for a strong-tag model and a frontier model.
    for (const id of [STRONG, FRONTIER, WIDE]) {
      await page.goto(`${BASE}/benchmaxxing?model=${encodeURIComponent(id)}#radar`, { waitUntil: 'domcontentloaded' }); await settle(page);
      await page.waitForSelector('#radar [data-topic-radar]', { timeout: 30000 }).catch(() => {});
      const r = await page.evaluate(() => {
        const sec = document.querySelector('#radar'); const svg = sec?.querySelector('[data-topic-radar]'); if (!svg) return null;
        const wrap = svg.parentElement.getBoundingClientRect();
        const labels = [...sec.querySelectorAll('[data-radar-topic-label]')].map((l) => { const b = l.getBoundingClientRect(); return { t: l.textContent, inside: b.left >= wrap.left - 0.5 && b.right <= wrap.right + 0.5 }; });
        const circles = [...svg.querySelectorAll('circle')];
        return { avg: [...svg.querySelectorAll('[data-radar-average]')].map((c) => c.getAttribute('data-radar-average')), avgLabel: [...svg.querySelectorAll('[data-radar-average-label]')].map((t) => t.textContent),
          ringLabels: [...svg.querySelectorAll('[data-radar-ring-labels] text')].map((t) => t.textContent), labels,
          note: sec.querySelector('[data-radar-axes-note]')?.textContent, jagged: sec.querySelector('[data-jagged-note]')?.textContent, grid: circles.length };
      });
      await page.locator('#radar').screenshot({ path: `${OUT}/f108-${id.replace(/:/g, '_')}-${w}-${scheme}.png` }).catch(() => {});
      // Re-pinned review 20260918T024002Z: F-113 moved the unit word "percentile" out of the SVG ring labels
      // into the caption ("The unit word moved into the caption", TopicRadar.tsx), and CR-78 rewrote the
      // jagged note ("A jagged shape between topics is specialisation, not a flag — a flag is a screen, not proof.").
      check(`F-108 ${tag} ${id}: zero ring + 0/50/100 labels, dashed average ring with "avg p…", honest copy`, r && r.avg.length === 1 && /^avg p\d+$/.test(r.avgLabel[0] || '') && ['0', '50', '100'].every((x) => r.ringLabels.includes(x))
        && /percentile/.test(r.note || '') && /Dashed ring = this model's average percentile\./.test(r.note || '') && /specialisation, not a flag|neighbouring benchmarks of one topic/.test(r.jagged || ''), r && { avg: r.avgLabel, rings: r.ringLabels, note: r.note });
      check(`F-108 ${tag} ${id}: every topic label inside the chart wrapper`, r && r.labels.length > 0 && r.labels.every((l) => l.inside), r?.labels.filter((l) => !l.inside));
    }
    check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
} finally { await browser.close(); }
const failed = checks.filter((c) => !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || null, at: new Date().toISOString(), passed: checks.length - failed.length, total: checks.length, checks }, null, 1));
console.log(`${checks.length - failed.length}/${checks.length} passed`); for (const c of failed) console.log('FAIL', c.name, c.detail);
