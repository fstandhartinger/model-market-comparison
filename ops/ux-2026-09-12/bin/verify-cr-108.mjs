// CR-108: JevBench v1.2.8 — the run-4 systems ranked, jqv complete, decision-machine-1 in its own class.
// usage: node verify-cr-108.mjs <expect.json> <base-url> [...] [--out <dir>]
const fs = await import('node:fs/promises');
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : null;
const rest = outAt >= 0 ? args.filter((a, i) => i !== outAt && i !== outAt + 1) : args;
const expect = JSON.parse(await fs.readFile(rest[0], 'utf8'));
const hosts = rest.slice(1);
let checks = 0;
const results = [];
for (const host of hosts) {
  const [pageRes, apiRes] = await Promise.all([fetch(new URL('/jev-models', host)), fetch(new URL('/api/jevbench/v1.2', host))]);
  if (!pageRes.ok || !apiRes.ok) throw new Error(`${host}: page ${pageRes.status}, api ${apiRes.status}`);
  const html = await pageRes.text();
  const api = await apiRes.json();
  if (api.revision !== expect.revision) throw new Error(`${host}: revision ${api.revision}`);
  checks += 1;
  for (const e of expect.rows) {
    const row = api.systems.find((s) => s.key === e.key);
    if (!row) throw new Error(`${host}: ${e.key} missing in API`);
    if (row.listing !== 'ranked' || row.rank !== e.rank || row.jevbench_score.toFixed(1) !== e.score) throw new Error(`${host}: ${e.key} rank/score ${row.rank} ${row.jevbench_score}`);
    if (!html.includes(e.display) || !html.includes(e.score) || !html.includes(e.repo)) throw new Error(`${host}: ${e.key} not rendered (${e.display} / ${e.score} / ${e.repo})`);
    checks += 4;
  }
  const dm = api.systems.find((s) => s.key === 'decision-machine-1');
  if (dm.class !== 'decision-api' || dm.endpoint_kind !== 'api') throw new Error(`${host}: decision-machine-1 class/endpoint`);
  if (!html.includes('Closed decision model (API only, not Jev)')) throw new Error(`${host}: decision-api legend missing`);
  checks += 2;
  const jqv = api.systems.find((s) => s.key === 'jqv');
  if (jqv.partial || jqv.hard.coverage !== 1) throw new Error(`${host}: jqv still partial`);
  checks += 1;
  for (const [k, sc] of expect.unchanged) {
    const r = api.systems.find((s) => s.key === k);
    if (!r || r.jevbench_score.toFixed(1) !== sc) throw new Error(`${host}: earlier row ${k} changed`);
    checks += 1;
  }
  for (const text of ['Hard only', 'custom eval on your data?', 'Who could not be measured, and why', 'Werr', 'DIY Jev']) {
    if (!html.includes(text)) throw new Error(`${host}: missing surface ${text}`);
    checks += 1;
  }
  if (/425 of 534/.test(api.footnotes?.jqv ?? '')) throw new Error(`${host}: jqv footnote still partial`);
  checks += 1;
  for (const gone of ["candidate: 'OpenDecision'", 'OpenDecision</b> (Deepan Wadhwa)']) {
    if (html.includes(gone)) throw new Error(`${host}: stale text ${gone}`);
    checks += 1;
  }
  results.push({ host, checks });
}
if (out) {
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(`${out}/verification.json`, JSON.stringify({ at: new Date().toISOString(), passed: checks, results }, null, 2));
}
console.log(JSON.stringify({ passed: checks, results }));
