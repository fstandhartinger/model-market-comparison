const hosts = process.argv.slice(2);
if (!hosts.length) throw new Error('usage: node verify-cr-101.mjs <base-url> [...]');
const expected = [
  ['kev 0.5B', '63.1'],
  ['kev 0.6B', '66.7'],
  ['kev 4B', '62.2'],
  ['kev 8B', '58.3'],
];
let checks = 0;
for (const host of hosts) {
  const res = await fetch(new URL('/jev-models', host));
  if (!res.ok) throw new Error(`${host}: HTTP ${res.status}`);
  const html = await res.text();
  for (const [name, score] of expected) {
    if (!html.includes(name) || !html.includes(score)) throw new Error(`${host}: missing ${name} / ${score}`);
    checks += 2;
  }
  for (const text of ['Hard only', 'Custom evaluation', 'v1.2.5']) {
    if (!html.includes(text)) throw new Error(`${host}: missing preserved surface ${text}`);
    checks += 1;
  }
}
console.log(`CR-101 ${checks}/${checks}`);
