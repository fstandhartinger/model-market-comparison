// Iteration 79: (a) the slug-board identity joins — twelve boards that were collected but never shown
// now carry rows, and joined cost twins still do not count as benchmarks; (b) CR-39, the recorded
// DesignArena access decision and its wording. API checks plus UI at 1440/390, light/dark.
// Usage: node verify-iter79.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter79';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2500); };

// ---------- the twelve boards, through the product's own API ----------
const NEW_BOARDS = ['BullshitBench V1', 'BullshitBench V2', 'ApprenticeBench API', 'ApprenticeBench CUA',
  'Vals Index', 'Excel Modeling Benchmark', 'HLAB'];
// The models these boards actually measured, so a row can only appear if its join happened.
const IDS = ['claude-fable-5::high', 'claude-fable-5.1::max', 'gpt-6-astra::max', 'claude-opus-4.8::xhigh', 'minimax-m3::default'];
const api = await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(IDS.join(','))}`)).json();
const matrix = api.matrix;
const names = (matrix?.rows ?? []).map((r) => r.name);
for (const board of NEW_BOARDS) {
  check(`board on the site: ${board}`, names.some((n) => n.includes(board)), names.filter((n) => n.includes(board.split(' ')[0])).join(' | ').slice(0, 200));
}
// F-102's counting rule: the boards the catalog reports must have grown past the 77 of iteration 78.
check('the catalog board count grew past iteration 78 (77)', (matrix?.catalogRows ?? 0) > 77 || (matrix?.catalogBoards ?? 0) > 77,
  { catalogRows: matrix?.catalogRows, catalogBoards: matrix?.catalogBoards });

// A joined value is the source's own number: ApprenticeBench CUA published claude-fable-5 · Claude Code ·
// high → 35 (passed of 100) in the retained capture.
const rowIndex = (needle) => (matrix?.rows ?? []).findIndex((r) => r.name.includes(needle));
const valueOf = (modelId, needle) => {
  const i = rowIndex(needle);
  const hit = (matrix?.values?.[modelId] ?? []).find(([idx]) => idx === i);
  return hit ? hit[1] : null;
};
check('ApprenticeBench CUA carries the published 35 for claude-fable-5 (Claude Code, high)',
  valueOf('claude-fable-5::high', 'ApprenticeBench CUA') === 35, String(valueOf('claude-fable-5::high', 'ApprenticeBench CUA')));

// Joined cost twins are published rows but never benchmarks (CR-34.3 / F-102): this configuration now has
// ten published cells, of which four are cost rows, and exactly six count as benchmarks.
const cov = (await (await fetch(`${BASE}/api/benchmark-scores?model_id=${encodeURIComponent('claude-fable-5::high')}&limit=1`)).json()).coverage?.model;
check('joined cost rows are published but never counted as benchmarks (claude-fable-5::high)',
  cov?.available === 10 && cov?.capability_available === 6, JSON.stringify(cov));

// ---------- CR-39: the DesignArena decision, as a reader sees it ----------
const about = await (await fetch(`${BASE}/about`)).text();
check('CR-39.2 /about says what the DesignArena source is', /publishes no API documentation or data licence/.test(about) && /not an official feed/.test(about), '');
check('CR-39.2 /about no longer presents it as an official leaderboard API', !/DesignArena<\/b>[^<]*leaderboard API/.test(about) && !/Intelligence\.ai leaderboard API/.test(about), '');
check('CR-39.1 /about states that we collect nothing further from this source', /collect\s*\n?\s*nothing further from this source|nothing further from this source/.test(about.replace(/\s+/g, ' ')), '');

// ---------- UI ----------
const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/?v=${Date.now()}`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(async () => { await new Promise((r) => setTimeout(r, 3000)); await page.reload(); }); await settle(page);
  const hero = await page.evaluate(() => document.querySelector('.bh-hero-line')?.innerText.replace(/\s+/g, ' ').trim() ?? '');
  const heroBoards = Number(/(\d[\d,]*) benchmarks/.exec(hero)?.[1]?.replace(/,/g, '') ?? 0);
  check(`${tag} the hero counts more benchmarks than before this change (77)`, heroBoards > 77, hero);
  await page.locator('#benchmarks').scrollIntoViewIfNeeded().catch(() => {});
  await settle(page);
  const sec2 = await page.evaluate(() => {
    const t = document.querySelector('[data-bench-count]')?.closest('p')?.innerText.replace(/\s+/g, ' ').trim() ?? '';
    return { sentence: t, denominator: Number(/of the (\d[\d,]*) benchmarks/.exec(t)?.[1]?.replace(/,/g, '') ?? 0) };
  });
  check(`${tag} the hero and section 2 still count the same collection`, sec2.denominator === heroBoards, JSON.stringify({ hero, ...sec2 }));
  await page.screenshot({ path: `${OUT}/${tag}-home.png` }).catch(() => {});

  // The new boards render as rows with a value, on the Benchmarks page's own columns.
  await goto(page, `${BASE}/benchmarks?models=${encodeURIComponent(IDS.slice(0, 3).join(','))}&rows=all`);
  await settle(page);
  const seen = await page.evaluate((boards) => {
    const rows = [...document.querySelectorAll('table tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ').trim());
    return boards.map((b) => ({ board: b, row: rows.find((r) => r.includes(b)) ?? null }));
  }, ['BullshitBench', 'ApprenticeBench', 'Vals Index']);
  check(`${tag} the new boards render as rows with values`, seen.every((s) => s.row && /\d/.test(s.row)), JSON.stringify(seen).slice(0, 400));
  await page.screenshot({ path: `${OUT}/${tag}-benchmarks.png`, fullPage: false }).catch(() => {});

  await goto(page, `${BASE}/about`);
  await settle(page);
  const aboutText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  check(`${tag} CR-39 the DesignArena sentence is visible to a reader`, /publishes no API documentation or data licence/.test(aboutText), aboutText.slice(aboutText.indexOf('DesignArena'), aboutText.indexOf('DesignArena') + 200));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${tag} no horizontal overflow on /about`, overflow <= 1, String(overflow));
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${String(c.detail).slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
