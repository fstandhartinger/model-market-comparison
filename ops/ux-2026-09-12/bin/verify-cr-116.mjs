// CR-116: JevBench v1.2.16 — Open-Jev 2B and 9B (Zefan Cai), including their held-out diagnostic rows.
// usage: node verify-cr-116.mjs <base-url> [...] [--out <dir>]
const fs = await import('node:fs/promises');
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : null;
const hosts = outAt >= 0 ? args.filter((a, i) => i !== outAt && i !== outAt + 1) : args;
const results = [];
const text = (html) => html.replace(/<!--.*?-->/gs, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
for (const host of hosts) {
  let checks = 0;
  const pageUrl = new URL('/jev-models', host);
  const apiUrl = new URL('/api/jevbench/v1.2', host);
  pageUrl.searchParams.set('verify', 'cr116');
  apiUrl.searchParams.set('verify', 'cr116');
  const [pageRes, apiRes] = await Promise.all([fetch(pageUrl, { cache: 'no-store' }), fetch(apiUrl, { cache: 'no-store' })]);
  if (!pageRes.ok || !apiRes.ok) throw new Error(`${host}: page ${pageRes.status}, api ${apiRes.status}`);
  const html = await pageRes.text();
  const api = await apiRes.json();
  if (api.revision !== 'v1.2.16') throw new Error(`${host}: revision ${api.revision}`);
  checks += 1;
  for (const [key, rank, score] of [['open-jev-zefan-9b', 44, '56.7'], ['open-jev-zefan-2b', 46, '53.8']]) {
    const row = api.systems.find((s) => s.key === key);
    if (!row || row.listing !== 'ranked' || row.rank !== rank || row.jevbench_score.toFixed(1) !== score) throw new Error(`${host}: ${key} rank/score`);
    if (row.cost.kind !== 'estimate' || !(row.cost.usd_per_1000 > 0) || !row.licence.includes('Apache-2.0') || !row.licence.includes('MIT') || row.endpoint_kind !== 'gpu') throw new Error(`${host}: ${key} provenance/cost`);
    checks += 2;
  }
  for (const value of ['Open-Jev 9B (Zefan Cai)', 'Open-Jev 2B (Zefan Cai)', '56.7', '53.8', 'https://github.com/Zefan-Cai/Open-Jev', 'held-out-diagnostic', 'Public-split policy.', 'Hard only']) {
    if (!html.includes(value)) throw new Error(`${host}: missing surface ${value}`);
    checks += 1;
  }
  // held-out diagnostic: the Zefan rows are in the table with their frozen counts, over the v1.2.16 field of 49
  const start = html.indexOf('data-bh-jev-heldout');
  const diag = text(html.slice(start, html.indexOf('</details>', start)));
  if (!diag.includes('across 49 complete systems')) throw new Error(`${host}: held-out field is not v1.2.16`);
  checks += 1;
  for (const [name, pub, held] of [['Open-Jev 2B (Zefan Cai)', '(46/111)', '(48/109)'], ['Open-Jev 9B (Zefan Cai)', '(66/111)', '(68/109)']]) {
    const at = diag.indexOf(name);
    const cell = at >= 0 ? diag.slice(at, at + 200).replace(/\s/g, '') : '';
    if (!cell.includes(pub) || !cell.includes(held)) throw new Error(`${host}: held-out row ${name}: ${diag.slice(at, at + 160)}`);
    checks += 1;
  }
  for (const [key, score] of [['jev-1.13.0', '75.4'], ['winnow-12b', '72.5'], ['zerank-2', '68.9'], ['system-one-sg', '56.6'], ['gliner2', '53.0']]) {
    const old = api.systems.find((s) => s.key === key);
    if (!old || old.jevbench_score.toFixed(1) !== score) throw new Error(`${host}: preserved row ${key}`);
    checks += 1;
  }
  results.push({ host, checks });
}
if (out) {
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(`${out}/verification.json`, JSON.stringify({ at: new Date().toISOString(), passed: results.reduce((n, r) => n + r.checks, 0), results }, null, 2));
}
console.log(JSON.stringify({ passed: results.reduce((n, r) => n + r.checks, 0), results }));
