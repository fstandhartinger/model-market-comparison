// D248 live acceptance (iteration 263): the two HuggingFace-caused routing rows are gone from the
// published site, and the row that carries each family's benchmarks now also carries its price.
// Usage: node verify-d248-live.mjs <base> <outDir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const { writeFileSync, mkdirSync } = require('node:fs');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '.';
mkdirSync(OUT, { recursive: true });

const MERGED = [
  { family: 'command-a+', kept: 'command-a+::default', gone: 'command-a+::openrouter' },
  { family: 'nemotron-3-super-120b-a12b', kept: 'nemotron-3-super-120b-a12b::reasoning', gone: 'nemotron-3-super-120b-a12b::openrouter' },
];
// Still split, for three other reasons (D248.1, D248.2). Checked so a later repair is noticed here.
const STILL_SPLIT = ['gemini-2.5-pro', 'gemini-3.1-flash-lite', 'gpt-5.2-codex'];

const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });

const api = async (path) => {
  const res = await fetch(`${BASE}${path}`, { headers: { accept: 'application/json' } });
  return { status: res.status, body: res.ok ? await res.json() : null };
};

const models = await api('/api/models?limit=2000');
const rowsOf = (familyKey) => (models.body?.models ?? models.body?.data ?? []).filter((m) => m.family_key === familyKey);

for (const { family, kept, gone } of MERGED) {
  const rows = rowsOf(family);
  check(`${family}: one catalog row`, rows.length === 1, rows.map((r) => r.id));
  check(`${family}: the kept row is the benchmarked one`, rows[0]?.id === kept, rows[0]?.id);
  check(`${family}: no routing row`, !rows.some((r) => r.id === gone), gone);
  check(`${family}: the kept row has a price`, (rows[0]?.offer_count ?? rows[0]?.offers?.length ?? 0) > 0,
    rows[0]?.offer_count ?? rows[0]?.offers?.length);
}
for (const family of STILL_SPLIT) {
  check(`${family}: still two rows (D248.1/D248.2 open)`, rowsOf(family).length === 2, rowsOf(family).map((r) => r.id));
}

const browser = await chromium.launch();
for (const [kind, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  let pageerror = null;
  page.on('pageerror', (e) => { pageerror = String(e); });
  for (const { family, kept, gone } of MERGED) {
    for (const [id, expectLive] of [[kept, true], [gone, false]]) {
      const url = `${BASE}/models/${encodeURIComponent(id)}`;
      let response = null;
      for (let i = 0; i < 3; i++) {
        try { response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }); break; }
        catch (e) { if (i === 2) throw e; }
      }
      const seen = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
          h1: document.querySelector('h1')?.innerText.trim() ?? null,
          dollars: (text.match(/\$\d[\d.,]*/g) || []).length,
          headerOffers: Number(text.match(/(\d+)\s+offers?\b/)?.[1] ?? NaN),
          filteredOut: /no per-token pricing matches the active global filters/i.test(text),
          saysUnknown: /not found|unknown model|no such model/i.test(text),
        };
      });
      if (expectLive) {
        check(`${kind} ${id}: page renders`, response?.status() === 200 && !seen.saysUnknown, `${response?.status()} ${seen.h1}`);
        // The point of the repair: the row with the benchmarks now states the family's offers. A
        // price is not always *shown* — `command-a+`'s only provider is Cohere, which the default
        // "Trains or keeps your data" filter removes (R4.10, `zero_retention: false`), and the page
        // says so rather than rendering an empty table. Either outcome proves the offer arrived;
        // silence would not.
        const apiOffers = rowsOf(family)[0]?.offer_count ?? rowsOf(family)[0]?.offers?.length ?? 0;
        check(`${kind} ${id}: header states the API's offer count`, seen.headerOffers === apiOffers,
          `page ${seen.headerOffers} vs api ${apiOffers}`);
        check(`${kind} ${id}: a price is shown or explicitly filtered out`, seen.dollars > 0 || seen.filteredOut,
          { dollars: seen.dollars, filteredOut: seen.filteredOut });
        check(`${kind} ${id}: no page error`, pageerror === null, pageerror);
      } else {
        check(`${kind} ${id}: the routing row is gone`, response?.status() === 404 || seen.saysUnknown,
          `${response?.status()} ${seen.h1}`);
      }
      await page.screenshot({ path: `${OUT}/${kind}-${id.replace(/[^a-z0-9.+-]/gi, '_')}.png`, fullPage: false });
    }
  }
  await ctx.close();
}
await browser.close();

const passed = checks.filter((c) => c.ok).length;
writeFileSync(`${OUT}/verification.json`, JSON.stringify({ base: BASE, checked_at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
console.log(`${passed}/${checks.length} checks passed (${BASE})`);
for (const c of checks) if (!c.ok) console.log(`  FAIL ${c.name}: ${JSON.stringify(c.detail)}`);
process.exit(passed === checks.length ? 0 : 1);
