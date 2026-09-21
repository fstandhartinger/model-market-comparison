// CR-113: JevBench v1.2.14 — Winnow-12B Q8 entrant.
// usage: node verify-cr-113.mjs <base-url> [...] [--out <dir>]
const fs = await import('node:fs/promises');
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : null;
const hosts = outAt >= 0 ? args.filter((a, i) => i !== outAt && i !== outAt + 1) : args;
let checks = 0;
const results = [];
for (const host of hosts) {
  const pageUrl = new URL('/jev-models', host);
  const apiUrl = new URL('/api/jevbench/v1.2', host);
  pageUrl.searchParams.set('verify', 'cr113');
  apiUrl.searchParams.set('verify', 'cr113');
  const [pageRes, apiRes] = await Promise.all([fetch(pageUrl, { cache: 'no-store' }), fetch(apiUrl, { cache: 'no-store' })]);
  if (!pageRes.ok || !apiRes.ok) throw new Error(`${host}: page ${pageRes.status}, api ${apiRes.status}`);
  const html = await pageRes.text();
  const api = await apiRes.json();
  if (api.revision !== 'v1.2.14') throw new Error(`${host}: revision ${api.revision}`);
  checks += 1;
  const row = api.systems.find((s) => s.key === 'winnow-12b');
  if (!row || row.listing !== 'ranked' || row.rank !== 5 || row.jevbench_score.toFixed(1) !== '72.5') throw new Error(`${host}: Winnow rank/score`);
  if (row.cost.kind !== 'estimate' || !(row.cost.usd_per_1000 > 0) || !row.licence.includes('Apache-2.0') || row.endpoint_kind !== 'gpu') throw new Error(`${host}: Winnow provenance/cost`);
  checks += 4;
  for (const value of ['Winnow-12B Q8', '72.5', 'https://huggingface.co/EldanRing/Winnow-12B', 'held-out-diagnostic', 'Public-split policy.', 'Hard only', 'custom eval on your data?']) {
    if (!html.includes(value)) throw new Error(`${host}: missing surface ${value}`);
    checks += 1;
  }
  for (const [key, score] of [['jev-1.13.0', '75.4'], ['djev-thinking', '63.5'], ['openjev-thinking', '60.6'], ['smalljev', '62.4'], ['gliner2', '53.0']]) {
    const old = api.systems.find((s) => s.key === key);
    if (!old || old.jevbench_score.toFixed(1) !== score) throw new Error(`${host}: preserved row ${key}`);
    checks += 1;
  }
  results.push({ host, checks });
}
if (out) {
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(`${out}/verification.json`, JSON.stringify({ at: new Date().toISOString(), passed: checks, results }, null, 2));
}
console.log(JSON.stringify({ passed: checks, results }));
