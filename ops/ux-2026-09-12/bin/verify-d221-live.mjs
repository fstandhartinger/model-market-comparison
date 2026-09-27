// D221 live verifier: the four KernelBench-CUDA MegaQwen Decode cells the board publishes are on our board,
// under their joined model identity and with the value the capture states.
// Usage: node verify-d221-live.mjs <base> <outDir>   Exits 1 on any failing check.
//
// The page prints a joined row under its *model* name, never the board's source label, so a check that looks
// for "claude/claude-opus-5-5 [xhigh]" reads False on a correct page. Each expectation below therefore carries
// the source label (what the board publishes), the model id the reviewed identity map joins it to, the model
// name the page prints, and the value — re-derived from
// data/raw/benchmarks/daily-evidence/2026-09-27T05-33-09-831Z/c3e22679c1c23c355c86.gz (body sha256
// c3e22679c1c23c355c86fc8e8af4e7d40e344ce5e39a9cef4aef958cdc83f404), not copied from a rendered page.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');

const BASE = process.argv[2];
const OUT = process.argv[3];
if (!BASE || !OUT) { console.error('usage: verify-d221-live.mjs <base> <outDir>'); process.exit(2); }

const BENCHMARK = 'kernelbench-cuda-megaqwen-decode::rtx-pro-6000';
const RECOVERED = [
  { source: 'claude/claude-opus-5-5 [xhigh]', name: 'Claude Opus 5.5', value: '7.39' },
  { source: 'codex/gpt-6-luna [xhigh]', name: 'GPT-6 Luna (xhigh)', value: '2.86' },
  { source: 'codex/gpt-6-sol [xhigh]', name: 'GPT-6 Sol (xhigh)', value: '3.98' },
  { source: 'grok/grok-4.7 [xhigh]', name: 'Grok 4.7 (xhigh)', value: '4.55' },
];
// The six rows that were already on the board before D221 — they must still be there afterwards.
const KEPT = ['6.55', '6.43', '5.42', '4.26', '3.92', '0.97'];

const checks = [];
const check = (ctx, name, ok, detail) => { checks.push({ ctx, name, ok: !!ok, detail: String(detail ?? '') }); };

const browser = await chromium.launch();
try {
  for (const [ctx, opts] of [['desktop', { viewport: { width: 1440, height: 1000 } }], ['mobile', { viewport: { width: 390, height: 844 } }]]) {
    const c = await browser.newContext(opts);
    try {
      const p = await c.newPage();
      const pageErrors = []; p.on('pageerror', (e) => pageErrors.push(String(e)));
      const url = `${BASE}/benchmarks?benchmark=${encodeURIComponent(BENCHMARK)}`;
      // The hub times out under load often enough that one goto is not a measurement.
      for (let i = 0; i < 3; i++) { try { await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 }); break; } catch (e) { if (i === 2) throw e; } }
      await p.waitForTimeout(2500);
      const m = await p.evaluate(() => {
        const heading = [...document.querySelectorAll('h2,h3')].map((e) => e.textContent.trim());
        const rows = [...document.querySelectorAll('table tr')].slice(1).map((tr) => {
          const cells = [...tr.querySelectorAll('th,td')].map((c) => c.textContent.trim());
          return { rank: cells[0] ?? '', name: (cells[1] ?? '').slice(0, 80), result: (cells[2] ?? '').slice(0, 60) };
        });
        return { heading, rows };
      });
      await p.screenshot({ path: `${OUT}/${ctx}-d221.png` });
      check(ctx, 'the MegaQwen Decode board is the one on screen', m.heading.some((h) => /MegaQwen Decode/i.test(h)), JSON.stringify(m.heading.slice(0, 3)));
      check(ctx, 'the board lists ten ranked rows (six before D221, four recovered)', m.rows.length === 10, `${m.rows.length}: ${JSON.stringify(m.rows.map((r) => r.name.slice(0, 24)))}`);
      for (const want of RECOVERED) {
        const row = m.rows.find((r) => r.name.includes(want.name));
        check(ctx, `${want.source} is on the board as ${want.name}`, !!row, JSON.stringify(m.rows.map((r) => r.name.slice(0, 30))));
        check(ctx, `${want.name} carries the capture's value ${want.value}`, !!row && row.result.startsWith(`${want.value} `), row ? row.result : '(row absent)');
        check(ctx, `${want.name}'s row is dated 2026-09-27, the run that published it`, !!row && /2026-09-27/.test(row.result), row ? row.result : '(row absent)');
      }
      for (const value of KEPT) check(ctx, `the pre-D221 row at ${value} is still published`, m.rows.some((r) => r.result.startsWith(`${value} `)), JSON.stringify(m.rows.map((r) => r.result.slice(0, 12))));
      check(ctx, 'no page errors', pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally { await c.close(); }
  }
} finally { await browser.close(); }

const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, benchmark: BENCHMARK, at: new Date().toISOString(), pass, total: checks.length, checks }, null, 1));
console.log(`${pass}/${checks.length} checks passed (${BASE})`);
process.exit(pass === checks.length ? 0 : 1);
