// Fable pass-21 directives F-112 (Signal bars: one page-wide scale with a visible reference mark) and F-114
// (one explainer on the Benchmaxxing page, status line in the reader's order, table pills like the Overview),
// as re-judged in iteration 101 for CR-69's signed score. Checked live, both widths, both themes.
// Usage: node verify-f112-f114.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-f112-f114';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

const PRESETS = ['Featured models', 'Top 50', 'All scored'];
const BENCHMAXX_TAG_RULE = 'the level follows the score alone';

/** Everything the two directives need from one rendered table. */
const readTable = (page) => page.evaluate(() => {
  const rows = [...document.querySelectorAll('tr[data-row-id]')].map((tr) => {
    const bar = tr.querySelector('[data-signal-frac]');
    const fill = tr.querySelector('.bh-magnitude-fill');
    const zero = tr.querySelector('[data-signal-zero]');
    const track = tr.querySelector('.bh-magnitude-track');
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: +r.left.toFixed(2), right: +r.right.toFixed(2), width: +r.width.toFixed(2) }; };
    const pill = tr.querySelector('.bh-signal-pill');
    return {
      id: tr.dataset.rowId,
      score: Number((tr.querySelector('.bh-magnitude-bar .tabular')?.textContent ?? '').replace('+', '')),
      frac: bar ? Number(bar.getAttribute('data-signal-frac')) : null,
      sign: bar?.getAttribute('data-signal-sign') ?? null,
      fillSign: fill?.getAttribute('data-sign') ?? null,
      fill: box(fill), zero: box(zero), track: box(track),
      level: pill?.dataset.level ?? null,
      hasPill: !!pill,
    };
  });
  return {
    rows,
    instruction: document.querySelector('[data-bmx-instruction]')?.textContent ?? '',
    cardText: document.querySelector('[data-bmx-instruction]')?.parentElement?.innerText ?? '',
    summary: document.querySelector('[data-bmx-level-legend]')?.innerText ?? '',
    legendCount: document.querySelectorAll('[data-bmx-level-legend]').length,
    intro: document.querySelector('.bh-page-head p')?.textContent ?? '',
    // CR-63.4(b) counts the intro's lead sentence, not the CR-64.2 exclusion line or the AA credit that follow it.
    introLines: (() => {
      const el = document.querySelector('.bh-page-head p');
      if (!el) return { lead: -1, total: -1 };
      const end = [...el.childNodes].indexOf(el.querySelector('[data-bh-capability-only]'));
      const range = document.createRange(); range.setStart(el, 0); range.setEnd(el, end < 0 ? el.childNodes.length : end);
      return { lead: range.getClientRects().length, total: Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) };
    })(),
    firstRowTop: Math.round(document.querySelector('tr[data-row-id]')?.getBoundingClientRect().top ?? -1),
    overflow: document.documentElement.scrollWidth - innerWidth,
  };
});

const browser = await chromium.launch();
for (const width of [1440, 390]) {
  for (const theme of ['light', 'dark']) {
    const tag = `${width}-${theme}`;
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    await goto(page, `${BASE}/benchmaxxing`);
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);

    const byPreset = {};
    for (const preset of PRESETS) {
      const btn = page.locator('button', { hasText: preset }).first();
      if (await btn.count()) { await btn.click(); await page.waitForTimeout(700); }
      byPreset[preset] = await readTable(page);
      await page.screenshot({ path: `${OUT}/${tag}-${preset.replace(/\s+/g, '-').toLowerCase()}.png`, fullPage: false });
    }
    const featured = byPreset['Featured models'];

    // ---- F-112 -------------------------------------------------------------
    // The defect this replaces: on a 0 → max bar every row scoring ≤ 0 drew nothing.
    const blank = featured.rows.filter((r) => r.score !== 0 && (!r.fill || r.fill.width < 1));
    check(`F-112 ${tag}: every non-zero row draws a visible bar`, featured.rows.length > 0 && blank.length === 0,
      { rows: featured.rows.length, blank: blank.slice(0, 5).map((r) => `${r.id}=${r.score}`) });

    const negatives = featured.rows.filter((r) => r.sign === 'neg');
    const positives = featured.rows.filter((r) => r.sign === 'pos');
    check(`F-112 ${tag}: the bar diverges — both signs are drawn`, negatives.length > 0 && positives.length > 0,
      { neg: negatives.length, pos: positives.length, zero: featured.rows.filter((r) => r.sign === 'zero').length });

    // Every bar is anchored on the shared zero line, on the side its sign says.
    const misplaced = featured.rows.filter((r) => {
      if (r.sign === 'zero' || !r.fill || !r.zero) return false;
      return r.sign === 'pos' ? Math.abs(r.fill.left - r.zero.left) > 2 : Math.abs(r.fill.right - r.zero.right) > 2;
    });
    check(`F-112 ${tag}: every bar starts at the shared zero line`, misplaced.length === 0,
      misplaced.slice(0, 4).map((r) => ({ id: r.id, sign: r.sign, fill: r.fill, zero: r.zero })));

    // The zero line itself: one per row, at the same fraction of the track everywhere.
    const zeroFracs = featured.rows.filter((r) => r.zero && r.track && r.track.width > 0)
      .map((r) => +((r.zero.left - r.track.left) / r.track.width).toFixed(3));
    check(`F-112 ${tag}: one zero line per row, all at the same position`,
      zeroFracs.length === featured.rows.length && new Set(zeroFracs).size === 1, { positions: [...new Set(zeroFracs)], rows: featured.rows.length });

    // Magnitudes are readable: a −0.1 and a −7.3 row must not look alike (the live 17 Sep complaint).
    const ordered = [...negatives].sort((a, b) => a.score - b.score);
    check(`F-112 ${tag}: a larger magnitude draws a longer bar`,
      ordered.length < 2 || (ordered[0].fill.width > ordered[ordered.length - 1].fill.width),
      ordered.length < 2 ? 'fewer than two negative rows' : { widest: `${ordered[0].id}=${ordered[0].score}@${ordered[0].fill.width}`, narrowest: `${ordered[ordered.length - 1].id}=${ordered[ordered.length - 1].score}@${ordered[ordered.length - 1].fill.width}` });

    // One page-wide scale: the same model has the same bar on all three presets (F-112's core ask, CR-63.5).
    const common = featured.rows.filter((r) => byPreset['All scored'].rows.some((x) => x.id === r.id)).slice(0, 8);
    const drift = common.filter((r) => {
      const other = byPreset['All scored'].rows.find((x) => x.id === r.id);
      return Math.abs((r.frac ?? 0) - (other.frac ?? 0)) > 1e-4 || Math.abs((r.fill?.width ?? 0) - (other.fill?.width ?? 0)) > 1;
    });
    check(`F-112 ${tag}: one model, one bar on every preset`, common.length > 0 && drift.length === 0,
      { compared: common.length, drift: drift.map((r) => r.id) });

    // ---- F-114 -------------------------------------------------------------
    check(`F-114 ${tag}: the card holds one instruction line`,
      /^Select a row to open its report below, or ▸ for a quick look\.$/.test(featured.instruction.trim()), featured.instruction);
    check(`F-114 ${tag}: the screening-flag caveat is said once, in the page intro`,
      /screening flag/.test(featured.intro) && !/screening flag/.test(featured.cardText), { intro: /screening flag/.test(featured.intro), card: featured.cardText.slice(0, 120) });
    check(`F-114 ${tag}: one status line reads tag counts, thresholds, then the rule`,
      featured.legendCount === 1 && /^Tagged:/.test(featured.summary.trim()) && /≥ \+3/.test(featured.summary)
        && featured.summary.trim().endsWith(BENCHMAXX_TAG_RULE) && !/scored from n =/.test(featured.summary),
      { rows: featured.legendCount, text: featured.summary.replace(/\n/g, ' · ') });

    // The pill vocabulary: three levels, untagged rows carry no pill (same function as the Overview).
    const badPill = byPreset['All scored'].rows.filter((r) => (r.score >= 3) !== r.hasPill);
    check(`F-114 ${tag}: only rows at or above the light threshold carry a pill`, badPill.length === 0,
      badPill.slice(0, 5).map((r) => `${r.id}=${r.score} pill=${r.hasPill}`));
    const badLevel = byPreset['All scored'].rows.filter((r) => r.level && r.level !== (r.score >= 12 ? 'strong' : r.score >= 6 ? 'medium' : 'light'));
    check(`F-114 ${tag}: each pill's level matches its score`, badLevel.length === 0, badLevel.slice(0, 5));

    if (width === 1440) check(`CR-63.4(b) ${tag}: the page intro's lead is at most two lines`,
      featured.introLines.lead > 0 && featured.introLines.lead <= 2, featured.introLines);
    if (width === 390) check(`F-114 ${tag}: the first table row is within the first screen`, featured.firstRowTop > 0 && featured.firstRowTop <= 780, featured.firstRowTop);
    check(`F-112/F-114 ${tag}: no horizontal overflow`, featured.overflow <= 1, featured.overflow);
    check(`F-112/F-114 ${tag}: no page errors`, !errors.length, errors);
    await context.close();
  }
}
await browser.close();

const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${String(c.detail).slice(0, 240)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
