// CR-111: JevBench v1.2.10 — smalljev semantic-v9.
// usage: node verify-cr-111.mjs <base-url> [...] [--out <dir>]
const fs = await import('node:fs/promises');
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : null;
const hosts = outAt >= 0 ? args.filter((a, i) => i !== outAt && i !== outAt + 1) : args;
let checks = 0;
const results = [];
for (const host of hosts) {
  const [pageRes, apiRes] = await Promise.all([fetch(new URL('/jev-models', host)), fetch(new URL('/api/jevbench/v1.2', host))]);
  if (!pageRes.ok || !apiRes.ok) throw new Error(`${host}: page ${pageRes.status}, api ${apiRes.status}`);
  const html = await pageRes.text();
  const api = await apiRes.json();
  if (api.revision !== 'v1.2.10') throw new Error(`${host}: revision ${api.revision}`);
  checks += 1;
  const smalljev = api.systems.find((s) => s.key === 'smalljev');
  if (!smalljev || smalljev.listing !== 'ranked' || smalljev.rank !== 29 || smalljev.jevbench_score.toFixed(1) !== '62.4') throw new Error(`${host}: smalljev rank/score`);
  if (smalljev.cost.kind !== 'estimate' || !(smalljev.cost.usd_per_1000 > 0) || smalljev.licence !== 'Apache-2.0' || smalljev.endpoint_kind !== 'gpu') throw new Error(`${host}: smalljev provenance/cost`);
  checks += 4;
  for (const value of ['smalljev semantic-v9', '62.4', 'https://github.com/isHeSatoshi/smalljev', 'held-out-diagnostic', 'Public-split policy.', 'Hard only', 'custom eval on your data?']) {
    if (!html.includes(value)) throw new Error(`${host}: missing surface ${value}`);
    checks += 1;
  }
  for (const [key, score] of [['jev-1.13.0', '75.4'], ['certo', '68.2'], ['gliner2.5-multi', '63.1'], ['kev-4b', '62.2'], ['gliner2', '53.0']]) {
    const row = api.systems.find((s) => s.key === key);
    if (!row || row.jevbench_score.toFixed(1) !== score) throw new Error(`${host}: earlier row ${key} changed`);
    checks += 1;
  }
  results.push({ host, checks });
}
if (out) {
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(`${out}/verification.json`, JSON.stringify({ at: new Date().toISOString(), passed: checks, results }, null, 2));
}
console.log(JSON.stringify({ passed: checks, results }));
