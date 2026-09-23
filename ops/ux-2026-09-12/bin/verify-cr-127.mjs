// CR-127 live check (claude-opus): in the Compare table a *collapsed* cell now says on which basis its number
// stands. A developer's own report carries the house † mark with its title and a screen-reader equivalent, and
// where a measured value draws its percentile bar a vendor claim says "developer's claim" instead of an empty
// track. Nothing non-measured takes the tint the legend calls the "best measured relative position", and the
// Compare legend explains † — a phone reader cannot reach the mark's own title.
//
// The expected basis per cell is not hard-coded: it is recomputed from the same API payload the page fetches,
// with the page's own `latestScores` rule, and then compared against the rendered DOM.
// Usage: node verify-cr-127.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const { latestScores } = await import('../../../lib/benchmark-view.mjs');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-127';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
// Two launch-day families whose only results are the vendor's own (CR-123, CR-126), beside a model whose rows
// are measured — so one page holds both bases and the marks have to tell them apart.
const PICKS = ['claude-opus-5.5::max', 'gpt-6-sol::max', 'claude-fable-5::max'];
const QUERY = PICKS.map((id) => `model=${encodeURIComponent(id)}`).join('&');
const SELF_TITLE = 'Self-reported by the developer, not an independent measurement';
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1500));

// --- expected bases, from the payload the page itself loads ---
const view = await (await fetch(`${BASE}/api/benchmark-view?${QUERY}&collapse=1&v=${Date.now()}`)).json();
const picks = view.picks ?? PICKS;
const expected = new Map(); // axisId -> [{ basis, placeable, lowSample }|null per pick]
for (const a of view.axes) {
  const rows = latestScores(a.scores, 'all');
  expected.set(a.id, picks.map((id) => {
    const row = rows.find((r) => r.modelId === id);
    if (!row) return null;
    // 2026-09-23: this check used to require a percentile bar behind every measured value. Since the
    // CR-128 third-party ingest the catalog also carries boards with a single measured peer (Vals
    // ProofBench, Public Benefits Bench, BioMysteryBench: stats.n === 1, or n === 2 with one value),
    // and `normalize()` returns null for those by design — the cell then says "no percentile", which
    // is CR-127.2's own rule, not a defect. The expectation now follows the same placeability rule
    // the page uses, so a real regression still fails and an unplaceable row no longer does.
    const s = a.stats;
    const placeable = !row.lowSample && Number.isFinite(row.value) && !!s && s.n >= 2 && s.min !== s.max && a.higherBetter != null;
    return { basis: row.basis, placeable, lowSample: !!row.lowSample };
  }));
}
const selfCount = [...expected.values()].flat().filter((e) => e?.basis === 'self_reported').length;
const measuredCount = [...expected.values()].flat().filter((e) => e?.basis === 'measured').length;
check(`API: the selection really mixes bases (${selfCount} vendor claims, ${measuredCount} measured)`, selfCount >= 10 && measuredCount >= 10, { selfCount, measuredCount });

// --- UI ---
const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
    const c = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
    await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errors = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    try {
      await p.goto(`${BASE}/compare?${QUERY}&v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      await p.locator('#full-comparison').scrollIntoViewIfNeeded().catch(() => {});
      await p.waitForTimeout(800);

      const read = await p.evaluate(() => {
        const rows = [...document.querySelectorAll('#full-comparison tbody tr')]
          .map((tr) => [tr, tr.querySelector('button[aria-controls^="comparison-evidence-"]')])
          .filter(([, b]) => b)
          .map(([tr, b]) => ({
            axisId: decodeURIComponent(b.getAttribute('aria-controls').replace('comparison-evidence-', '')),
            cells: [...tr.querySelectorAll('td')].map((td) => {
              const mark = td.querySelector('[data-bh-self-reported]');
              const note = td.querySelector('[data-bh-percentile-note]');
              return {
                empty: td.innerText.replace(/\s+/g, ' ').trim() === '—',
                mark: mark ? mark.textContent.replace(/\s+/g, ' ').trim() : null,
                markTitle: mark?.getAttribute('title') ?? null,
                srOnly: mark?.querySelector('.sr-only')?.textContent.trim() ?? null,
                dagger: !!td.querySelector('sup')?.textContent.includes('‡'),
                note: note ? note.textContent.replace(/\s+/g, ' ').trim() : null,
                bar: !!td.querySelector('span[aria-hidden="true"] > span[style*="width"]'),
                tinted: td.className.includes('bg-accent2'),
              };
            }),
          }));
        const legend = document.querySelector('#full-comparison details[data-bh-table-legend]');
        const entry = legend?.querySelector('[data-bh-legend-entry="self-reported"]');
        return { rows, legendOpen: legend?.open ?? null,
          legendHasSelf: !!entry, legendMark: entry?.textContent.trim() ?? null,
          legendText: entry?.nextElementSibling?.textContent.replace(/\s+/g, ' ').trim() ?? null };
      });

      check(`${tag}: the full comparison rendered rows for the selection`, read.rows.length >= 20, read.rows.length);

      // every cell's rendering matches the basis the API gives it
      const wrong = [];
      let sawSelf = 0, sawMeasured = 0;
      for (const r of read.rows) {
        const exp = expected.get(r.axisId);
        if (!exp || r.cells.length !== exp.length) { wrong.push({ axisId: r.axisId, why: 'no expectation or column count', cells: r.cells.length, exp: exp?.length }); continue; }
        r.cells.forEach((cell, i) => {
          const e = exp[i], basis = e?.basis ?? null;
          if (basis == null) { if (!cell.empty) wrong.push({ axisId: r.axisId, i, why: 'expected no value', cell }); return; }
          if (basis === 'self_reported') {
            sawSelf++;
            if (cell.mark !== '† self-reported by the developer' && cell.mark?.replace(/\s+/g, ' ') !== '† self-reported by the developer') wrong.push({ axisId: r.axisId, i, why: 'no † mark', cell });
            else if (cell.markTitle !== SELF_TITLE) wrong.push({ axisId: r.axisId, i, why: 'wrong † title', cell });
            else if (cell.srOnly !== 'self-reported by the developer') wrong.push({ axisId: r.axisId, i, why: 'no screen-reader equivalent', cell });
            else if (cell.note !== "developer's claim") wrong.push({ axisId: r.axisId, i, why: 'no "developer\'s claim" where the bar would be', cell });
            else if (cell.bar) wrong.push({ axisId: r.axisId, i, why: 'a vendor claim drew a percentile bar', cell });
            else if (cell.tinted) wrong.push({ axisId: r.axisId, i, why: 'a vendor claim took the best-measured tint', cell });
          } else if (basis === 'measured') {
            sawMeasured++;
            if (cell.mark) wrong.push({ axisId: r.axisId, i, why: 'a measured value was marked as a vendor claim', cell });
            else if (e.placeable && cell.note) wrong.push({ axisId: r.axisId, i, why: 'a placeable measured value says it has no percentile', cell });
            else if (e.placeable && !cell.bar) wrong.push({ axisId: r.axisId, i, why: 'a measured value drew no percentile bar', cell });
            else if (!e.placeable && cell.bar) wrong.push({ axisId: r.axisId, i, why: 'a value no peer range places drew a percentile bar', cell });
            else if (!e.placeable && !cell.note) wrong.push({ axisId: r.axisId, i, why: 'a value with no percentile says nothing where the bar would be', cell });
          }
        });
      }
      check(`${tag}: every collapsed cell renders its own basis (${sawSelf} vendor claims, ${sawMeasured} measured)`, wrong.length === 0 && sawSelf >= 10 && sawMeasured >= 10, { wrong: wrong.slice(0, 6), sawSelf, sawMeasured });
      // A tint means "best measured relative position", so it needs a position: measured *and* placeable.
      const tintOk = (cell, e) => !cell.tinted || (e?.basis === 'measured' && e.placeable);
      check(`${tag}: no tinted cell is anything but a placeable measured value`, read.rows.every((r) => r.cells.every((cell, i) => tintOk(cell, expected.get(r.axisId)?.[i]))), read.rows.filter((r) => r.cells.some((cell, i) => !tintOk(cell, expected.get(r.axisId)?.[i]))).slice(0, 3));

      check(`${tag}: the Compare legend is collapsed and explains †`, read.legendOpen === false && read.legendHasSelf && read.legendMark === '†'
        && /A developer's own report, not an independent measurement\./.test(read.legendText ?? '')
        && /earns no percentile and no tint/.test(read.legendText ?? ''), { open: read.legendOpen, mark: read.legendMark, text: read.legendText });

      // a shot of one real vendor-claim row, so the mark can be read rather than inferred
      const marked = p.locator('#full-comparison tr').filter({ has: p.locator('[data-bh-self-reported]') }).first();
      if (await marked.count()) await marked.screenshot({ path: `${OUT}/${tag}-vendor-claim-row.png` }).catch(() => {});
      await p.screenshot({ path: `${OUT}/${tag}-compare.png`, fullPage: false }).catch(() => {});

      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: /compare has no horizontal overflow`, overflow <= 1, String(overflow));
      check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally { await c.close(); }
  }
} finally { await browser.close(); }
const passed = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: REV, picks, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const x of checks) if (!x.ok) console.log(`FAIL ${x.name} — ${JSON.stringify(x.detail).slice(0, 600)}`);
console.log(`${BASE} @ ${REV}: ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
