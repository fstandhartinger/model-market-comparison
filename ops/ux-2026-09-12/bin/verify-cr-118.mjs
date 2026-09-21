// CR-118 (iteration 159, claude-opus, non-implementer): JevBench v1.3.0 scoring is live — the API serves the pinned
// v1.3.0 artifact, the independently recomputed ranking (Jev 74.4, SemIf 73.1, djev 73.0, Winnow 71.2, reflex 70.3,
// Certo 0.0), the hard-only scope recomputed above chance (Jev 66.2, djev 63.6, Winnow 61.9), and the "What changed in
// the score" note and the method panel's Intelligence/penalty lines; /jev-models renders at 1440/390 in light and dark without page errors or horizontal overflow.
// The expected values come from an independent Python recomputation (iteration 159, PROGRESS.md), not from lib/.
// usage: node verify-cr-118.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-118';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const api = await (await fetch(`${BASE}/api/jevbench/v1.2?v=${Date.now()}`, { cache: 'no-store' })).json();
const local = JSON.parse(await fs.readFile(new URL('../../../data/raw/benchmarks/jevbench/v1.2/jevbench-v1.2-results.json', import.meta.url), 'utf8'));
check('API revision v1.3.0', api.revision === 'v1.3.0', api.revision);
const diff = local.systems.filter((s) => { const r = api.systems.find((x) => x.key === s.key); return !r || r.jevbench_score !== s.jevbench_score || r.rank !== s.rank || r.axes?.intelligence !== s.axes.intelligence; });
check(`API scores, ranks and Intelligence equal the committed artifact for all ${local.systems.length} systems`, diff.length === 0 && api.systems.length === local.systems.length, diff.map((s) => s.key));
for (const [key, rank, score] of [['jev-1.13.0', 1, '74.4'], ['winnow-12b', 4, '71.2']]) {
  const r = api.systems.find((s) => s.key === key);
  check(`${key}: #${rank} at ${score}`, r && r.rank === rank && r.jevbench_score.toFixed(1) === score, r && { rank: r.rank, score: r.jevbench_score });
}
const top5 = api.systems.filter((s) => s.listing === 'ranked').sort((a, b) => a.rank - b.rank).slice(0, 5).map((s) => s.jevbench_score.toFixed(1));
check('ranked top five 74.4 / 73.1 / 73.0 / 71.2 / 70.3', top5.join('/') === '74.4/73.1/73.0/71.2/70.3', top5);
const certo = api.systems.find((s) => /certo/i.test(s.key));
check('Certo: Intelligence 0 above chance, score 0.0, still ranked (eligibility unchanged)', certo && certo.axes.intelligence === 0 && certo.jevbench_score === 0 && certo.listing === 'ranked', certo && { i: certo.axes.intelligence, s: certo.jevbench_score, l: certo.listing });
check('revision log leads with v1.3.0 scoring-only note', /Scoring-only release/.test(api.revision_log?.[0]?.note ?? '') && api.revision_log[0].revision === 'v1.3.0');
const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1200 }], ['mobile', { width: 390, height: 844 }]]) {
    const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
    const c = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
    await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errors = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    try {
      await p.goto(`${BASE}/jev-models?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1500);
      const eyebrow = await p.locator('.bh-eyebrow').first().innerText().catch(() => '');
      check(`${tag}: eyebrow names JevBench v1.3.0`, /JevBench v1\.3\.0/i.test(eyebrow), eyebrow);
      const note = p.locator('[data-bh-jev-score-change]');
      const noteText = await note.innerText().catch(() => '');
      check(`${tag}: "What changed in the score" note with the reason`, /What changed in the score/.test(noteText) && /barely better than guessing/.test(noteText) && /growing penalty/.test(noteText), noteText.slice(0, 200));
      if (await note.count()) { await note.scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/${tag}-note.png` }); }
      const text = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: default view shows Jev at 74.4`, /Jev 1\.13\.0[\s\S]{0,200}74\.4/.test(text));
      const method = await p.locator('[data-bh-jev12-formula]').innerText().catch(() => '');
      check(`${tag}: method panel defines Intelligence above chance and states the (I ÷ 50)² penalty`, /accuracy above chance/.test(method) && /Below 50 Intelligence[\s\S]*\(Intelligence ÷ 50\)²/.test(method) && !/— weighted accuracy/.test(method), method.slice(0, 300));
      await p.locator('[data-bh-jev12-scope-option="hard"]').click();
      await p.waitForTimeout(800);
      const hardText = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: Hard only recomputes above chance — Jev 66.2, djev 63.6, Winnow 61.9`, /Jev 1\.13\.0[\s\S]{0,200}66\.2/.test(hardText) && /63\.6/.test(hardText) && /61\.9/.test(hardText) && /Not the default JevBench setting/.test(hardText));
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: no horizontal overflow`, overflow <= 1, String(overflow));
      check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
      await p.screenshot({ path: `${OUT}/${tag}-hard-only.png` }).catch(() => {});
    } finally { await c.close(); }
  }
} finally { await browser.close(); }
const passed = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: REV, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const x of checks) if (!x.ok) console.log(`FAIL ${x.name} — ${JSON.stringify(x.detail).slice(0, 300)}`);
console.log(`${BASE} @ ${REV}: ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
