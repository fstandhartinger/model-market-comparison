// CR-127.4 live check (claude-opus): the model page's benchmark sheet was the one surface that showed a
// preliminary, chart-read value as a bare number — CR-60.2's rule ("every surface that shows a preliminary
// value also marks it") was written for the three table components and missed it. Union Alpha's 52.0 % and
// 73.0 % now carry ‡ with a title and a screen-reader equivalent, say "announced value" where a measured row
// shows its percentile, and the sheet head explains ‡ the way it already explains †. The Advanced matrix's
// two marks are checked to be audible, not only hoverable.
// Usage: node verify-cr-127-4.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-127-4';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const PRELIM = 'union-alpha::default';          // the only preliminary rows we hold (CR-60.2)
const VENDOR = 'claude-opus-5.5::max';          // a launch-day family whose sheet is all vendor claims (CR-123)
const PRELIM_ROWS = [['Terminal-Bench v4.0 (AA)', '52.0%'], ['DeepSWE (Datacurve, via Epoch AI)', '73.0%']];
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1200));

// the sheet must actually be showing preliminary rows, or the marks below would be vacuous
const view = await (await fetch(`${BASE}/api/benchmark-view?model=${encodeURIComponent(PRELIM)}&v=${Date.now()}`)).json();
const bases = view.axes.flatMap((a) => a.scores.filter((r) => r.modelId === PRELIM).map((r) => r.basis));
check(`API: ${PRELIM} still has exactly ${PRELIM_ROWS.length} preliminary rows and nothing else`,
  bases.length === PRELIM_ROWS.length && bases.every((b) => b === 'preliminary'), bases);

const readSheet = () => {
  const sheet = document.querySelector('#benchmark-sheet');
  const rows = [...(sheet?.querySelectorAll('summary') ?? [])].map((s) => {
    const sup = s.querySelector('sup');
    const cells = [...s.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim());
    return { text: s.textContent.replace(/\s+/g, ' ').trim(), cells,
      mark: sup?.textContent.replace(/\s+/g, ' ').trim() ?? null, markTitle: sup?.getAttribute('title') ?? null,
      bar: !!s.querySelector('span[style*="width"]') };
  });
  return { rows, vendorLine: sheet?.querySelector('[data-bh-sheet-vendor-line]')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
    prelimLine: sheet?.querySelector('[data-bh-sheet-preliminary-line]')?.textContent.replace(/\s+/g, ' ').trim() ?? null };
};

const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
    const c = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
    await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errors = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    try {
      // --- the preliminary sheet ---
      await p.goto(`${BASE}/models/${encodeURIComponent(PRELIM)}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      const prelim = await p.evaluate(readSheet);
      const byName = (name) => prelim.rows.find((r) => r.text.includes(name));  // the summary opens with the chevron glyph
      const bad = PRELIM_ROWS.filter(([name, value]) => {
        const r = byName(name);
        return !r || !r.text.includes(value) || r.mark !== '‡ preliminary, not independently measured'
          || !/^Preliminary: announced, read off a chart/.test(r.markTitle ?? '') || r.bar
          || !r.cells.some((cell) => cell === 'announced value');
      }).map(([n]) => ({ name: n, row: byName(n) ?? null }));
      check(`${tag}: both Union Alpha rows carry ‡ with its title and screen-reader text, say "announced value", draw no bar`, bad.length === 0, bad);
      check(`${tag}: the sheet head explains ‡`, /2 of 2 values are announced, chart-read figures \(‡\)/.test(prelim.prelimLine ?? '')
        && /never entering a score, a ranking or a percentile/.test(prelim.prelimLine ?? ''), prelim.prelimLine);
      check(`${tag}: no page errors on the preliminary model page`, errors.length === 0, errors.slice(0, 3));
      const shot = p.locator('#benchmark-sheet');
      if (await shot.count()) await shot.screenshot({ path: `${OUT}/${tag}-prelim-sheet.png` }).catch(() => {});

      // --- a vendor-claim sheet is unchanged: † , "developer's claim", its own head line ---
      await p.goto(`${BASE}/models/${encodeURIComponent(VENDOR)}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      const vendor = await p.evaluate(readSheet);
      const claims = vendor.rows.filter((r) => r.mark === '† self-reported by the developer');
      check(`${tag}: ${VENDOR}'s sheet still marks its vendor claims (${claims.length} rows)`, claims.length >= 10
        && claims.every((r) => r.markTitle === 'Self-reported by the developer' && r.cells.some((cell) => cell === "developer's claim") && !r.bar),
        claims.filter((r) => r.bar || r.markTitle !== 'Self-reported by the developer').slice(0, 3));
      check(`${tag}: the vendor head line is unchanged and no ‡ line appears beside it`,
        /own claims \(†\)/.test(vendor.vendorLine ?? '') && vendor.prelimLine === null, { vendorLine: vendor.vendorLine, prelimLine: vendor.prelimLine });
      await p.locator('#benchmark-sheet').screenshot({ path: `${OUT}/${tag}-vendor-sheet.png` }).catch(() => {});

      // --- the Advanced matrix: both marks audible ---
      await p.goto(`${BASE}/benchmarks?models=${encodeURIComponent(`${PRELIM},${VENDOR}`)}&v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      const marks = await p.evaluate(() => [...document.querySelectorAll('table sup')]
        .map((s) => ({ glyph: s.firstChild?.textContent?.trim() ?? '', sr: s.querySelector('.sr-only')?.textContent.trim() ?? null }))
        .filter((m) => m.glyph === '†' || m.glyph === '‡'));
      const daggers = marks.filter((m) => m.glyph === '†'), dbl = marks.filter((m) => m.glyph === '‡');
      check(`${tag}: the matrix's marks are announced, not only hoverable (${daggers.length} †, ${dbl.length} ‡)`,
        daggers.length + dbl.length > 0
        && daggers.every((m) => m.sr === 'self-reported by the developer')
        && dbl.every((m) => m.sr === 'preliminary, not yet independently measured'),
        marks.filter((m) => !m.sr).slice(0, 3));
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: /benchmarks has no horizontal overflow`, overflow <= 1, String(overflow));
      check(`${tag}: no page errors across the three pages`, errors.length === 0, errors.slice(0, 3));
    } finally { await c.close(); }
  }
} finally { await browser.close(); }
const passed = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: REV, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const x of checks) if (!x.ok) console.log(`FAIL ${x.name} — ${JSON.stringify(x.detail).slice(0, 600)}`);
console.log(`${BASE} @ ${REV}: ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
