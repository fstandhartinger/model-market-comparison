#!/usr/bin/env node
// CR-251: plan which rows a release re-measures. Run it FIRST in every release job and attach the output to the PR.
//   node scripts/plan-reevaluation.mjs --benchmark jevbench --kind refresh --release v1.5.5 [--date YYYY-MM-DD]
//        [--paid key,key] [--queue-from-db] [--write-ledger] [--json]   |   --seed-ledger
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { BENCHMARKS, RELEASE_KINDS, currentRows, planReevaluation, readLedger, readPolicy, renderPlan, seedLedger, writeLedger } from '../lib/reevaluation-policy.mjs';

const { values: o } = parseArgs({ options: {
  benchmark: { type: 'string' }, kind: { type: 'string' }, release: { type: 'string' }, date: { type: 'string' },
  paid: { type: 'string' }, 'queue-from-db': { type: 'boolean' }, 'write-ledger': { type: 'boolean' },
  json: { type: 'boolean' }, 'seed-ledger': { type: 'boolean' }, root: { type: 'string' },
} });
const root = o.root ?? process.cwd();
const fail = (m) => { console.error(`plan-reevaluation: ${m}`); process.exit(2); };

if (o['seed-ledger']) {
  await writeLedger(await seedLedger(root), root);
  console.log('ledger seeded from the current live releases');
  process.exit(0);
}
if (!BENCHMARKS.includes(o.benchmark)) fail(`--benchmark must be one of ${BENCHMARKS.join('|')}`);
if (!RELEASE_KINDS.includes(o.kind)) fail(`--kind must be one of ${RELEASE_KINDS.join('|')}`);
if (!o.release) fail('--release <label> is required');
const date = o.date ?? new Date().toISOString().slice(0, 10);

// Benchmark ids on the form: queued submissions list the benchmarks they asked for ('jevbench', 'imagejevbench', ...).
function queueFromDb(benchmark) {
  const sql = `SELECT COALESCE(json_agg(q ORDER BY q.fast_lane DESC, q.queued_at), '[]'::json) FROM (
    SELECT left(id::text, 8) AS ref, model_name AS name, queued_at, fast_lane
    FROM bh_model_submissions WHERE status='queued' AND :'bench' = ANY(benchmarks)) q;`;
  const r = spawnSync('/usr/bin/psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', `bench=${benchmark}`, '-h', '/var/run/postgresql', '-p', '5432', '-U', 'flori', '-d', 'benchmarkheaven_accounts'],
    { input: sql, encoding: 'utf8', timeout: 20_000, env: { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8', PGCONNECT_TIMEOUT: '5' } });
  if (r.status !== 0) { console.error('plan-reevaluation: submission queue unavailable, continuing without it'); return []; }
  try { return JSON.parse(r.stdout.trim() || '[]'); } catch { return []; }
}

const [policy, ledger, { rows }] = await Promise.all([readPolicy(root), readLedger(root), currentRows(o.benchmark, root)]);
const plan = planReevaluation({
  benchmark: o.benchmark, releaseKind: o.kind, releaseLabel: o.release, releaseDate: date, rows, ledger, policy,
  paidKeys: (o.paid ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  newQueue: o['queue-from-db'] ? queueFromDb(o.benchmark) : [],
});
if (o['write-ledger']) await writeLedger(plan.ledgerUpdate, root);
if (o.json) console.log(JSON.stringify(plan, null, 2)); else process.stdout.write(renderPlan(plan));
