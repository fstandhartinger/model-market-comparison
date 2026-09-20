const fs = await import('node:fs/promises');
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : null;
const hosts = args.filter((arg, i) => i !== outAt && i !== outAt + 1);
if (!hosts.length) throw new Error('usage: node verify-cr-105.mjs <base-url> [...] [--out <outdir>]');

const expected = [
  ['openJev Verdict 1.4', '72.5'],
  ['SimpleJev Qwen3.8-27B', '67.3'],
  ['SimpleJev Qwen3.6-35B-A3B', '63.8'],
];
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
  if (api.revision !== 'v1.2.6') throw new Error(`${host}: revision ${api.revision}`);
  checks += 1;
  for (const [name, score] of expected) {
    if (!html.includes(name) || !html.includes(score)) throw new Error(`${host}: missing ${name} / ${score}`);
    checks += 2;
  }
  for (const text of ['Hard only', 'You need a custom eval', 'Who could not be measured, and why', 'SimpleJev RWKV variants']) {
    if (!html.includes(text)) throw new Error(`${host}: missing preserved/current surface ${text}`);
    checks += 1;
  }
  if (!html.includes('https://huggingface.co/heman10x/rlcd-modernbert-151m')) throw new Error(`${host}: Verdict 1.4 model link missing`);
  checks += 1;
  const verdicts = api.systems.filter((s) => s.key === 'openjev-verdict' || s.key === 'openjev-verdict-1.4');
  if (verdicts.length !== 2 || verdicts.find((s) => s.key === 'openjev-verdict-1.4')?.rank !== 4) throw new Error(`${host}: distinct Verdict rows/rank missing`);
  checks += 1;
  results.push({ host, checks: 13 });
}
if (out) {
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(`${out}/verification.json`, JSON.stringify({ at: new Date().toISOString(), passed: checks, total: checks, results }, null, 2));
}
console.log(`CR-105 ${checks}/${checks}`);
