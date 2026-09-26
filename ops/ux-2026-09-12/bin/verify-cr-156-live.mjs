// CR-156.1/.2/.3 live receipt — no browser, so it can run beside a Chromium verifier.
// Usage: node verify-cr-156-live.mjs <outDir> [host]   (the route/sitemap pass covers all three public hosts;
// the number pass runs against the host given, default canonical.)
// CR-156.1 every planned SEO route answers 200 on every public host.
// CR-156.3 each route has a self-canonical, an internal link back to the JevBench pages, and a live sitemap entry.
// CR-156.2 every figure the comparison routes print for a system and axis equals the live
//          /api/jevbench/v1.4.2 value: each of the nine table rows is re-derived from the API with the
//          page's own formatters and compared as a string, for both systems of every pair.
// CR-156.4 (Search Console) is out of this harness's reach — it needs the verified property.
import fs from 'node:fs/promises';
const OUT = process.argv[2] || '/tmp/cr156';
const HOST = (process.argv[3] || 'https://benchmarkheaven.com').replace(/\/$/, '');
await fs.mkdir(OUT, { recursive: true });
const HOSTS = ['https://benchmarkheaven.com', 'https://www.benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
const ROUTES = ['jev-vs-jevk5', 'jev-vs-cygnet', 'jev-vs-reflex-4b', 'jev-vs-decider-4b-v2', 'alternatives',
  'jev-vs-hopper', 'how-to-choose', 'jev-vs-winnow-12b-q8', 'open-source-jev', 'jev-vs-laya'];
const checks = [];
const check = (ctx, name, ok, detail) => checks.push({ ctx, name, ok: !!ok, detail: String(detail ?? '').slice(0, 300) });
const get = async (url) => { for (let a = 1; ; a++) { try { const r = await fetch(url, { redirect: 'follow' }); return { status: r.status, body: await r.text(), url: r.url }; } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 2000)); } } };

for (const host of HOSTS) {
  const sitemap = await get(`${host}/sitemap.xml`);
  check(host, 'sitemap.xml answers 200', sitemap.status === 200, sitemap.status);
  for (const route of ROUTES) {
    const path = `/jev-models/${route}`;
    const page = await get(host + path);
    check(host, `${route}: 200`, page.status === 200, page.status);
    const canon = (page.body.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';
    check(host, `${route}: self-canonical`, canon.endsWith(path), canon);
    check(host, `${route}: links back to the JevBench pages`, /href="\/jev-models(["/#?])/.test(page.body), '');
    check(host, `${route}: in the live sitemap`, sitemap.body.includes(path + '<') || sitemap.body.includes(path + '"'), '');
  }
}
const PAIRS = { 'jev-vs-jevk5': 'jevk5-v02', 'jev-vs-cygnet': 'cygnet', 'jev-vs-reflex-4b': 'reflex-4b',
  'jev-vs-decider-4b-v2': 'decider-4b-v2', 'jev-vs-hopper': 'hopper', 'jev-vs-winnow-12b-q8': 'winnow-12b', 'jev-vs-laya': 'laya' };
const one = (v) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(1));
const percent = (v) => (v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(1)}%`);
const usdPerThousand = (v) => (v == null || !Number.isFinite(v) ? 'not published' : `$${v.toFixed(v < 0.01 ? 4 : 3)} per 1,000 decisions`);
const basis = (k) => (k === 'measured' ? 'measured' : k === 'estimate' ? 'estimated' : k === 'announced' ? 'announced price' : 'not published');

const api = await (await fetch(`${HOST}/api/jevbench/v1.4.2`)).json();
const byKey = new Map(api.systems.map((s) => [s.key, s]));
const jevKey = api.systems.find((s) => /^Jev 1\./.test(s.display))?.key;
check(HOST, 'the live API names a Jev row', !!jevKey, jevKey);

const expected = (row) => ({
  'Published rank': `#${row.rank}`,
  'JevBench Score': one(row.jevbench_score),
  'Sealed-set accuracy': percent(row.sealed_accuracy),
  'Intelligence axis': one(row.axes?.intelligence),
  'Calibration axis': one(row.axes?.calibration),
  'Speed axis': one(row.axes?.speed),
  'Cost axis': one(row.axes?.cost),
  'Cost evidence': basis(row.cost?.kind),
  'Cost per 1,000 decisions': usdPerThousand(row.cost?.usd_per_1000),
});
const strip = (h) => h.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();

for (const [route, rivalKey] of Object.entries(PAIRS)) {
  const html = await (await fetch(`${HOST}/jev-models/${route}`)).text();
  const table = html.slice(html.indexOf('data-bh-jev-comparison-table'));
  const body = table.slice(0, table.indexOf('</table>'));
  const rows = [...body.matchAll(/<th scope="row"[^>]*>(.*?)<\/th><td[^>]*>(.*?)<\/td><td[^>]*>(.*?)<\/td>/g)]
    .map((m) => [strip(m[1]), strip(m[2]), strip(m[3])]);
  const jev = byKey.get(jevKey), rival = byKey.get(rivalKey);
  check(route, 'the live API has both rows of the pair', !!jev && !!rival, `${jevKey} / ${rivalKey}`);
  if (!jev || !rival) continue;
  const wantJev = expected(jev), wantRival = expected(rival);
  check(route, 'the table prints all nine measures', rows.length === 9, `${rows.length} rows: ${rows.map((r) => r[0]).join(', ')}`);
  for (const [label, printedJev, printedRival] of rows) {
    if (!(label in wantJev)) { check(route, `${label}: known measure`, false, 'unexpected row label'); continue; }
    check(route, `${label} (Jev) equals the live API`, printedJev === wantJev[label], `page ${printedJev} vs api ${wantJev[label]}`);
    check(route, `${label} (${rivalKey}) equals the live API`, printedRival === wantRival[label], `page ${printedRival} vs api ${wantRival[label]}`);
  }
}
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ host: HOST, at: new Date().toISOString(), checks, failed: checks.filter((c) => !c.ok) }, null, 2));
console.log(`${checks.filter((c) => c.ok).length}/${checks.length} passed (${HOST})`);
for (const f of checks.filter((c) => !c.ok)) console.log('FAIL', f.ctx, f.name, '—', f.detail);
if (checks.some((c) => !c.ok)) process.exitCode = 1;
