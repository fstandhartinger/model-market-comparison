// CR-190 live verification: the registry entry is served and correctly described on every public host.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
const REPO = '/opt/model-market-comparison';
const CR190_COMMIT = '31ba6ed75a7803881dd309b4c0eced3d14a3d675';
const OUT = process.argv[2] || '/tmp/verify-cr190';
await fs.mkdir(OUT, { recursive: true });
const ID = 'openai-mentalhealthbench::snapshot-2026-09-23';
const HOSTS = ['https://benchmarkheaven.com', 'https://www.benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
const PAPER_SHA = 'fa5a3dc17fb2a58f820a1f4269cde93010b7f7c3e98558f65d082a9c5690644f';
// The 17 rows as Figure 5(a) prints them (page 11 of the retained paper capture).
const EXPECTED = [['GPT-6 Astra', 57.3], ['GPT-6 Sol', 53.9], ['Claude Opus 5.5', 52.4], ['GPT-6 Luna', 50.2],
  ['Muse Spark 1.3', 48.6], ['GPT-5.6 Sol (Aug 2026)', 47], ['Claude Fable 5.1', 46.4], ['GPT-5.6 Luna (Aug 2026)', 44.9],
  ['Claude Sonnet 5', 44.5], ['GPT-5 Thinking', 42.9], ['Claude Haiku 4.5', 41.7], ['Grok 4.7', 41.3],
  ['Gemini 3.8 Flash', 35.5], ['Gemini 2.5 Flash', 33.5], ['GPT-4o (March 2025)', 32.1], ['Gemini 3.1 Pro', 32.1],
  ['Gemini 2.5 Pro', 29.5]];
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
  // CR-190.1's 17 rows: served by the scores API, self-reported, and pinned to no reasoning effort.
  const scores = await (await fetch(`${host}/api/benchmark-scores?benchmark_id=${encodeURIComponent(ID)}&limit=500`)).json();
  const served = scores.observations ?? [];
  check(host, 'the scores API serves all 17 observations', scores.total === 17 && served.length === 17, `total ${scores.total}, returned ${served.length}`);
  const byName = new Map(served.map((o) => [o.subject.name, o]));
  const missingLabel = EXPECTED.filter(([name]) => !byName.has(name)).map(([name]) => name);
  check(host, 'every printed Figure 5(a) label is served', missingLabel.length === 0, missingLabel.join(', ') || 'all 17');
  const wrongValue = EXPECTED.filter(([name, value]) => byName.get(name)?.value !== value).map(([name, value]) => `${name} expected ${value} got ${byName.get(name)?.value}`);
  check(host, 'every served value equals the paper\'s printed number', wrongValue.length === 0, wrongValue.join('; ') || 'all 17 match');
  check(host, 'every row is self_reported', served.every((o) => o.basis === 'self_reported'), [...new Set(served.map((o) => o.basis))].join(','));
  check(host, 'no row is pinned to a model configuration or effort', served.every((o) => o.subject.model_id === null && o.subject.variant === null),
    served.filter((o) => o.subject.model_id || o.subject.variant).map((o) => o.subject.name).join(', ') || 'all 17 unjoined');
  const withCi = served.filter((o) => o.confidence_interval);
  check(host, 'the 15 models in the announcement chart carry OpenAI\'s own 95% interval', withCi.length === 15
    && withCi.every((o) => o.confidence_interval.level === 0.95 && o.confidence_interval.lower <= o.value && o.value <= o.confidence_interval.upper), `${withCi.length} intervals`);
  check(host, 'the two models the chart omits carry none', served.filter((o) => !o.confidence_interval).map((o) => o.subject.name).sort().join(' | ') === 'GPT-5 Thinking | Gemini 2.5 Flash',
    served.filter((o) => !o.confidence_interval).map((o) => o.subject.name).join(', '));
  check(host, 'every row names the retained paper capture', served.every((o) => o.source.sha256 === PAPER_SHA && o.source.published_at === '2026-09-23'), `${served.filter((o) => o.source.sha256 === PAPER_SHA).length}/17`);
  check(host, 'no value entered the Composite', served.every((o) => o.basis === 'self_reported') && !JSON.stringify(scores.divergences ?? []).includes('composite'), 'self-reported rows are outside the Composite by construction');
  check(host, 'the collection plan records the board as collected', scores.collection?.status === 'collected', scores.collection?.status);
}
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ id: ID, at: new Date().toISOString(), checks }, null, 1));
const pass = checks.filter((c) => c.ok).length;
for (const c of checks) if (!c.ok) console.log('FAIL:', c.host, c.name, '::', c.detail);
console.log(`${pass}/${checks.length} pass`);
process.exit(pass === checks.length ? 0 : 1);
