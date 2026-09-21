// CR-110: JevBench v1.2.9 — Certo v1, preserving the CR-109 held-out diagnostic.
// usage: node verify-cr-110.mjs <base-url> [...] [--out <dir>]
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
  if (api.revision !== 'v1.2.9') throw new Error(`${host}: revision ${api.revision}`);
  checks += 1;
  const certo = api.systems.find((s) => s.key === 'certo');
  if (!certo || certo.listing !== 'ranked' || certo.rank !== 12 || certo.jevbench_score.toFixed(1) !== '68.2') throw new Error(`${host}: Certo rank/score`);
  if (certo.cost.kind !== 'estimate' || !(certo.cost.usd_per_1000 > 0) || certo.licence !== 'MIT') throw new Error(`${host}: Certo provenance/cost`);
  checks += 3;
  for (const text of ['Certo v1 (AltSlate Labs)', '68.2', 'https://huggingface.co/altslate/certo-decision-model', 'held-out-diagnostic', 'Public-split policy.', 'Hard only', 'custom eval on your data?']) {
    if (!html.includes(text)) throw new Error(`${host}: missing surface ${text}`);
    checks += 1;
  }
  for (const [key, score] of [['jev-1.13.0', '75.4'], ['semif-qwen3.5-4b', '74.7'], ['djev', '74.3'], ['gliner2', '53.0']]) {
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
