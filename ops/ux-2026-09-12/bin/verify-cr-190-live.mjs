// CR-190 live verification: the registry entry is served and correctly described on every public host.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
const REPO = '/opt/model-market-comparison';
const CR190_COMMIT = '31ba6ed75a7803881dd309b4c0eced3d14a3d675';
const OUT = process.argv[2] || '/tmp/verify-cr190';
await fs.mkdir(OUT, { recursive: true });
const ID = 'openai-mentalhealthbench::snapshot-2026-09-23';
const HOSTS = ['https://benchmarkheaven.com', 'https://www.benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
const checks = [];
const check = (host, name, ok, detail) => checks.push({ host, name, ok: !!ok, detail: String(detail ?? '').slice(0, 300) });

for (const host of HOSTS) {
  const meta = await (await fetch(`${host}/api/meta`)).json();
  // Ancestry, not equality: every later push moves the deployed revision, and a check that pins one
  // commit would go red for a reason that has nothing to do with CR-190.
  let carries = false;
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', CR190_COMMIT, meta.revision ?? ''], { cwd: REPO, stdio: 'ignore' });
    carries = true;
  } catch { carries = false; }
  check(host, 'the deployed revision carries the CR-190 commit', carries, `${meta.revision} vs ${CR190_COMMIT}`);
  const list = await (await fetch(`${host}/api/benchmarks`)).json();
  const rows = Array.isArray(list) ? list : (list.benchmarks ?? list.entries ?? []);
  const row = rows.find((r) => r.id === ID);
  check(host, '/api/benchmarks serves the new identity', !!row, row ? row.id : `absent among ${rows.length}`);
  check(host, 'the identity is dated, not versionless', row?.version === 'snapshot-2026-09-23', row?.version);
  check(host, 'category is Safety/Alignment', row?.category === 'Safety/Alignment', row?.category);
  check(host, 'maintainer is OpenAI', row?.maintainer === 'OpenAI', row?.maintainer);
  const blob = JSON.stringify(row ?? {});
  check(host, 'the served row names the LLM judge', blob.includes('GPT-5.6 Sol at high reasoning effort'), blob.includes('GPT-5.6 Sol') ? 'judge named' : 'judge not in served fields');
  check(host, 'the served row states self_reported', blob.includes('self_reported'), blob.includes('self_reported') ? 'stated' : 'absent');
  // No observation exists yet: the board must not claim one.
  const scores = await (await fetch(`${host}/api/benchmark-scores?benchmark=${encodeURIComponent(ID)}&limit=500`)).json().catch(() => null);
  const cells = Array.isArray(scores) ? scores : (scores?.rows ?? scores?.scores ?? []);
  const mine = cells.filter((c) => JSON.stringify(c).includes('mentalhealthbench'));
  check(host, 'no score is published for it yet (the 17 rows are still open)', mine.length === 0, `${mine.length} cells`);
}
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ id: ID, at: new Date().toISOString(), checks }, null, 1));
const pass = checks.filter((c) => c.ok).length;
for (const c of checks) if (!c.ok) console.log('FAIL:', c.host, c.name, '::', c.detail);
console.log(`${pass}/${checks.length} pass`);
process.exit(pass === checks.length ? 0 : 1);
