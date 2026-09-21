// CR-112: JevBench v1.2.11 — metadata-only djev openness correction.
// usage: node verify-cr-112.mjs <base-url> [...] [--out <dir>]
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
  pageUrl.searchParams.set('verify', 'cr112');
  apiUrl.searchParams.set('verify', 'cr112');
  const [pageRes, apiRes] = await Promise.all([fetch(pageUrl, { cache: 'no-store' }), fetch(apiUrl, { cache: 'no-store' })]);
  if (!pageRes.ok || !apiRes.ok) throw new Error(`${host}: page ${pageRes.status}, api ${apiRes.status}`);
  const html = await pageRes.text();
  const api = await apiRes.json();
  if (api.revision !== 'v1.2.11') throw new Error(`${host}: revision ${api.revision}`);
  checks += 1;
  const djev = api.systems.find((s) => s.key === 'djev');
  if (!djev || djev.open !== 'yes' || djev.repo !== 'https://github.com/Davipar/djev-dev') throw new Error(`${host}: djev openness/repo`);
  if (!/Apache-2.0 code/.test(djev.licence) || !/no djev-specific weights/.test(djev.licence)) throw new Error(`${host}: djev licence`);
  if (!/inference method/.test(djev.underlying) || !/not a separately trained model/.test(djev.underlying)) throw new Error(`${host}: djev underlying model`);
  if (djev.rank !== 3 || djev.jevbench_score.toFixed(1) !== '74.3') throw new Error(`${host}: djev score/rank changed`);
  checks += 4;
  for (const value of ['Davipar/djev-dev', 'Apache-2.0 code', 'no djev-specific weights', 'not a separately trained model']) {
    if (!html.includes(value)) throw new Error(`${host}: missing page text ${value}`);
    checks += 1;
  }
  results.push({ host, checks });
}
if (out) {
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(`${out}/verification.json`, JSON.stringify({ at: new Date().toISOString(), passed: checks, results }, null, 2));
}
console.log(JSON.stringify({ passed: checks, results }));
