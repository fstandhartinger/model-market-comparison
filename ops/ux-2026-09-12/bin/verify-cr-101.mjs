const fs = await import('node:fs/promises');
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : null;
const hosts = args.filter((arg, i) => i !== outAt && i !== outAt + 1);
if (!hosts.length) throw new Error('usage: node verify-cr-101.mjs <base-url> [...] [--out <outdir>]');
const expected = [
  ['kev 0.5B', '63.1'],
  ['kev 0.6B', '66.7'],
  ['kev 4B', '62.2'],
  ['kev 8B', '58.3'],
];
let checks = 0;
const results = [];
for (const host of hosts) {
  const res = await fetch(new URL('/jev-models', host));
  if (!res.ok) throw new Error(`${host}: HTTP ${res.status}`);
  const html = await res.text();
  for (const [name, score] of expected) {
    if (!html.includes(name) || !html.includes(score)) throw new Error(`${host}: missing ${name} / ${score}`);
    checks += 2;
  }
  for (const text of ['Hard only', 'You need a custom eval', 'v1.2.5']) {
    if (!html.includes(text)) throw new Error(`${host}: missing preserved surface ${text}`);
    checks += 1;
  }
  results.push({ host, checks: 11 });
}
if (out) {
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(`${out}/verification.json`, JSON.stringify({ at: new Date().toISOString(), passed: checks, total: checks, results }, null, 2));
}
console.log(`CR-101 ${checks}/${checks}`);
