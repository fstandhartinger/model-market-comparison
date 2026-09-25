// Fable pass-35 live verifier (non-Fable engines run it before flipping a row to verified).
// Usage: node verify-fable-pass35-design.mjs <base> <outDir>   ONLY=F-191 (or F-183, F-189, F-190, F-192) restricts the groups.
// Groups: F-191 the leaf's one reference; F-183 the leaf head/foot copy; F-189 the chart's rank-by control; F-190 the pinned page;
// F-192 the system-one-open class. Writes <outDir>/verification.json and exits 1 on any failing check in the selected groups.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-fable-pass35';
await fs.mkdir(OUT, { recursive: true });
const ONLY = process.env.ONLY || null;
const checks = [];
const check = (group, ctx, name, ok, detail) => { checks.push({ group, ctx, name, ok: !!ok, detail }); };
const want = (g) => !ONLY || g === ONLY;
const LEAVES = ['jevk5-v02', 'jev-1.13.0', 'decider-4b-v2'];
const txt = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = `${kind}_${theme}`;
  const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
  const p = await c.newPage(); p.setDefaultTimeout(20000);
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(600); };

  if (want('F-191') || want('F-183')) for (const key of LEAVES) {
    await go(`/jev-models/${key}`);
    const m = await p.evaluate(() => {
      const main = document.querySelector('main');
      const t = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
      const delta = main.querySelector('[data-bh-jev-system-delta]');
      const cap = main.querySelector('[data-bh-jev-system-strip] figcaption');
      const legendB = [...main.querySelectorAll('li')].map(t).find((s) => /^B: /.test(s)) || '';
      const legendA = [...main.querySelectorAll('li')].map(t).find((s) => /^A: /.test(s)) || '';
      const h2s = [...main.querySelectorAll('h2')].map((h) => ({ t: t(h), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
      const sub = main.querySelector('[data-bh-jev-system-subline]');
      const mainText = t(main);
      const release = [...main.querySelectorAll('p')].find((el) => /Scores and ranks can change/.test(el.textContent));
      return { delta: t(delta), deltaRef: delta?.getAttribute('data-bh-jev-system-delta'), cap: t(cap), legendA, legendB, h2s, sub: t(sub), hasHash: /hash-checked|name-only/.test(mainText), releaseY: release ? Math.round(release.getBoundingClientRect().y + scrollY) : null, h1: t(main.querySelector('h1')) };
    });
    await p.screenshot({ path: `${OUT}/${ctx}-${key}.png` });
    const capM = m.cap.match(/The marked tick is (.+?) \((\d+\.\d)\)\./);
    const deltaM = m.delta.match(/^(\d+\.\d) points (ahead of|behind) (.+?)'s (\d+\.\d)\.$/);
    if (want('F-191')) {
      check('F-191', ctx, `${key}: points sentence present and well-formed`, !!deltaM, m.delta);
      check('F-191', ctx, `${key}: sentence names the strip's marked tick`, capM && deltaM && deltaM[3] === capM[1] && deltaM[4] === capM[2], `${m.delta} | ${m.cap}`);
      check('F-191', ctx, `${key}: the radar's B row is the same system`, deltaM && m.legendB.startsWith(`B: ${deltaM[3]} `), m.legendB);
      check('F-191', ctx, `${key}: heading "Against ⟨reference⟩"`, deltaM && m.h2s.some((h) => h.t === `Against ${deltaM[3]}`), JSON.stringify(m.h2s.map((h) => h.t)));
      check('F-191', ctx, `${key}: no h2 equals a radar's title`, !m.h2s.some((h) => /^Accuracy per tier/.test(h.t)), '');
    }
    if (want('F-183')) {
      check('F-183', ctx, `${key}: no "hash-checked" / "name-only" in main`, !m.hasHash, '');
      check('F-183', ctx, `${key}: sub-line present with "by ⟨author⟩"`, /· by |^by /.test(m.sub), m.sub);
      const cls = (m.legendA.match(/^A: .+? — (.+?) · /) || [])[1];
      check('F-183', ctx, `${key}: sub-line class words match the compare legend's A row (or the class is unlabelled)`, !cls || /^[a-z0-9-]+$/.test(cls) || m.sub.startsWith(cls), `${cls} | ${m.sub}`);
      const avail = m.h2s.find((h) => /Availability and evidence/.test(h.t));
      check('F-183', ctx, `${key}: the release sentence sits under "Availability and evidence"`, avail && m.releaseY && m.releaseY > avail.y, `${m.releaseY} vs ${avail?.y}`);
    }
  }

  if (want('F-189') || want('F-192')) {
    await go('/jev-models');
    const m = await p.evaluate(() => {
      const t = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
      const chart = document.querySelector('[data-bh-jev14-chart]') || document.querySelector('[data-bh-jevbench-v14]');
      const firstBar = document.querySelector('[data-bh-jev14-bar]');
      const before = []; if (chart && firstBar) { const w = document.createTreeWalker(chart, NodeFilter.SHOW_ELEMENT); let n; while ((n = w.nextNode())) { if (n === firstBar || n.contains(firstBar)) { if (n === firstBar) break; else continue; } if (/^(TABLE|DETAILS)$/.test(n.tagName)) before.push(n.tagName); } }
      const rankBy = document.querySelector('[data-bh-jev14-rank-by]');
      const note = [...document.querySelectorAll('[data-bh-jev14-top-five-note]')];
      const noteBox = note[0] ? [note[0], note[0].parentElement].map((e) => getComputedStyle(e).borderStyle) : null;
      const rows = [...document.querySelectorAll('[data-bh-jev14-bars] > li')];
      const firstName = rows[0] ? t(rows[0].querySelector('a')) : null;
      const legend = [...document.querySelectorAll('.bh-jevc-swatch')].map((s) => t(s.parentElement));
      const bar1 = rows[0] ? [...rows[0].querySelectorAll('*')].map((e) => getComputedStyle(e).backgroundColor).find((bg) => bg && bg !== 'rgba(0, 0, 0, 0)') : null;
      const llmSwatch = [...document.querySelectorAll('.bh-jevc-swatch')].find((s) => /Instruction model/.test(t(s.parentElement)));
      const llmColor = llmSwatch ? getComputedStyle(llmSwatch).backgroundColor : null;
      return { before, rankBy: rankBy ? [...rankBy.querySelectorAll('button')].map((b) => ({ t: t(b), pressed: b.getAttribute('aria-pressed') })) : null, notes: note.length, noteBox, firstBarY: firstBar ? Math.round(firstBar.getBoundingClientRect().y + scrollY) : null, firstName, legend, bar1, llmColor, rawKey: /— system-one-open/.test(document.body.innerText) };
    });
    await p.screenshot({ path: `${OUT}/${ctx}-hub.png` });
    if (want('F-189')) {
      check('F-189', ctx, 'rank-by control with two buttons, one pressed', m.rankBy && m.rankBy.length === 2 && m.rankBy.filter((b) => b.pressed === 'true').length === 1, JSON.stringify(m.rankBy));
      check('F-189', ctx, 'no table or disclosure between the chart title and the first bar', m.before.length === 0, JSON.stringify(m.before));
      check('F-189', ctx, 'fairness sentence exactly once, unboxed', m.notes === 1 && m.noteBox && m.noteBox.every((s) => s === 'none'), JSON.stringify(m.noteBox));
      if (kind === 'mobile') check('F-189', ctx, 'first bar at y ≤ 720 on a phone', m.firstBarY != null && m.firstBarY <= 720, String(m.firstBarY));
      if (m.rankBy) {
        await p.locator('[data-bh-jev14-rank-by] button', { hasText: 'Intelligence' }).first().click(); await p.waitForTimeout(400);
        const after = await p.evaluate(() => { const r = document.querySelector('[data-bh-jev14-bars] > li'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : null; });
        check('F-189', ctx, 'after "Intelligence" the first row is the highest-Intelligence system', after && /Jev 1\.13\.0/.test(after) && /53\.1/.test(after), after);
        await p.locator('[data-bh-jev14-rank-by] button', { hasText: 'JevBench Score' }).first().click(); await p.waitForTimeout(400);
        const back = await p.evaluate(() => { const r = document.querySelector('[data-bh-jev14-bars] > li'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : null; });
        check('F-189', ctx, 'after "JevBench Score" the order is the rank order again', back && back.replace(/\s+/g, ' ').includes(m.firstName), back);
      }
    }
    if (want('F-192')) {
      check('F-192', ctx, 'the #1 bar is not the llm-baseline colour', m.bar1 && m.llmColor && m.bar1 !== m.llmColor, `${m.bar1} vs ${m.llmColor}`);
      check('F-192', ctx, 'the legend lists the system-one-open class (code key or its label)', m.legend.some((l) => /system-one-open|System One/i.test(l)), JSON.stringify(m.legend));
      check('F-192', ctx, 'no bare "— system-one-open" class key in visible text', !m.rawKey, '');
    }
  }

  if (want('F-190')) {
    await go('/jev-models/v1.4.2');
    const m = await p.evaluate(() => {
      const t = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
      const main = document.querySelector('main');
      const h2 = [...main.querySelectorAll('h2')].map(t);
      const board = main.querySelector('[data-bh-jevbench-v14]');
      const blocksBefore = board ? [...main.children].indexOf(board.closest('main > *') || board) : null;
      const firstBar = main.querySelector('[data-bh-jev14-bar]');
      return { h2, blocksBefore, firstBarY: firstBar ? Math.round(firstBar.getBoundingClientRect().y + scrollY) : null, h: document.documentElement.scrollHeight };
    });
    await p.screenshot({ path: `${OUT}/${ctx}-v142.png` });
    check('F-190', ctx, 'no "Frozen top five" heading', !m.h2.some((h) => /Frozen top five/.test(h)), JSON.stringify(m.h2));
    check('F-190', ctx, 'no "Context length" section', !m.h2.some((h) => /^Context length/.test(h)), '');
    check('F-190', ctx, 'at most 5 blocks before the board', m.blocksBefore != null && m.blocksBefore <= 5, String(m.blocksBefore));
    if (kind === 'desktop') check('F-190', ctx, 'page height under 14,000 px at 1440', m.h < 14000, String(m.h));
  }
  await b.close();
}
const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), only: ONLY, pass, total: checks.length, checks }, null, 1));
for (const c of checks.filter((c) => !c.ok)) console.log(`FAIL ${c.group} ${c.ctx} ${c.name} :: ${String(c.detail).slice(0, 200)}`);
console.log(`${pass}/${checks.length} checks passed (${BASE}${ONLY ? ', ONLY=' + ONLY : ''})`);
process.exit(pass === checks.length ? 0 : 1);
