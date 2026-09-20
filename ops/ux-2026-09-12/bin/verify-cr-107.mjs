const fs = await import('node:fs/promises');
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : null;
const hosts = outAt >= 0 ? args.filter((arg, i) => i !== outAt && i !== outAt + 1) : args;  // without --out, keep every argument
if (!hosts.length) throw new Error('usage: node verify-cr-107.mjs <base-url> [...] [--out <outdir>]');

// CR-107: JevBench v1.2.7 — three GLiNER2-family checkpoints ranked, jqv shown as a partial row.
const expectedRanked = [
  ['GLiNER2.5 multi (Fastino, 287M)', '63.1'],
  ['GLiNER2.5 small (Fastino, 74M)', '62.1'],
];
const expectedPartial = [['jqv (Qwen3-32B zero-shot)', '67.2']];
let checks = 0;
const results = [];
for (const host of hosts) {
  const [pageRes, apiRes] = await Promise.all([
    fetch(new URL('/jev-models', host)),
    fetch(new URL('/api/jevbench/v1.2', host)),
  ]);
  if (!pageRes.ok || !apiRes.ok) throw new Error(`${host}: page ${pageRes.status}, api ${apiRes.status}`);
  const html = await pageRes.text();
  const api = await apiRes.json();
  if (api.revision !== 'v1.2.7') throw new Error(`${host}: revision ${api.revision}`);
  checks += 1;
  for (const [name, score] of [...expectedRanked, ...expectedPartial]) {
    if (!html.includes(name) || !html.includes(score)) throw new Error(`${host}: missing ${name} / ${score}`);
    checks += 2;
  }
  // the three new GLiNER2-family rows are ranked, jqv is listed as partial and carries no rank
  for (const key of ['gliner2.5-small', 'gliner2.5-multi']) {
    const row = api.systems.find((s) => s.key === key);
    if (!row || row.listing !== 'ranked' || !row.rank) throw new Error(`${host}: ${key} is not a ranked row`);
    checks += 1;
  }
  const jqv = api.systems.find((s) => s.key === 'jqv');
  if (!jqv || jqv.listing !== 'partial' || jqv.rank) throw new Error(`${host}: jqv is not an unranked partial row`);
  if (Math.abs((jqv.hard?.coverage ?? 0) - 111 / 220) > 1e-6) throw new Error(`${host}: jqv hard coverage wrong`);
  checks += 2;
  // the earlier GLiNER2 row and every other earlier row are untouched
  const gliner2 = api.systems.find((s) => s.key === 'gliner2');
  if (!gliner2 || gliner2.jevbench_score.toFixed(1) !== '53.0') throw new Error(`${host}: earlier GLiNER2 row changed`);
  checks += 1;
  for (const text of ['Hard only', 'custom eval on your data?', 'Who could not be measured, and why', 'OpenDecision']) {
    if (!html.includes(text)) throw new Error(`${host}: missing preserved/current surface ${text}`);
    checks += 1;
  }
  for (const link of ['https://huggingface.co/fastino/gliner2.5-small-v1', 'https://huggingface.co/fastino/gliner2.5-multi-v1']) {
    if (!html.includes(link)) throw new Error(`${host}: checkpoint link ${link} missing`);
    checks += 1;
  }
  // the reason jqv is unranked has to be readable on the page, not only in the repo
  if (!html.includes('425 of 534')) throw new Error(`${host}: jqv coverage note missing`);
  checks += 1;
  results.push({ host, checks });
}
if (out) {
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(`${out}/verification.json`, JSON.stringify({ at: new Date().toISOString(), passed: checks, total: checks, results }, null, 2));
}
console.log(`CR-107 ${checks}/${checks}`);
