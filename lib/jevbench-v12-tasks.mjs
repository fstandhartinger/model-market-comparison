// CR-90: the public-task slice for the JevBench v1.2 result page.
// This artifact intentionally contains public task ids and outcome codes only. Held-out
// and imported task text/results are not shipped to the browser.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export const JEVBENCH_V12_TASKS_ARTIFACT = 'ops/ux-2026-09-12/jevbench/v1.2-final/jevbench-v1.2-per-task.json';
export const JEVBENCH_V12_TASKS_SHA256 = 'ab899ecef64d1bd8425c31504df177e4f9895eec91dbd4a38eeb77dc3eb96a84';

const TIERS = ['easy', 'standard', 'judge', 'hard'];
const CODES = new Set(['c', 'w', 'f', 'n']);
const fail = (message) => { throw new Error('JevBench v1.2 public tasks: ' + message); };
const exactKeys = (value, keys) => value && Object.keys(value).sort().join(',') === [...keys].sort().join(',');

export function validateJevbenchV12Tasks(a, v12) {
  if (!a || a.benchmark !== 'JevBench' || a.revision !== 'v1.2' || a.status !== 'final') fail('benchmark, revision or status');
  if (!Array.isArray(a.tasks) || !a.tasks.length || !a.systems || typeof a.systems !== 'object') fail('tasks or systems missing');
  const ids = new Set();
  for (const t of a.tasks) {
    if (!exactKeys(t, ['id', 'tier', 'topic', 'public', 'type']) || typeof t.id !== 'string' || !TIERS.includes(t.tier) || typeof t.topic !== 'string' || t.public !== true || typeof t.type !== 'string') fail('invalid public task metadata ' + (t?.id ?? ''));
    if (ids.has(t.id)) fail('duplicate task ' + t.id);
    ids.add(t.id);
  }
  const publicByTier = Object.fromEntries(TIERS.map((tier) => [tier, a.tasks.filter((t) => t.tier === tier).length]));
  for (const tier of TIERS) if (a.task_counts?.[tier]?.public !== publicByTier[tier]) fail('task_counts.' + tier + '.public');
  const v12Keys = new Set(v12.systems.map((s) => s.key));
  for (const key of Object.keys(a.systems)) {
    const system = a.systems[key];
    if (!v12Keys.has(key)) fail('public task artifact contains an unknown system');
    if (!system || !exactKeys(system, ['display', 'partial', 'by_tier', 'by_tier_topic', 'public_tasks']) || typeof system.display !== 'string' || typeof system.partial !== 'boolean') fail(key + ': system shape');
    if (!system.by_tier || !TIERS.every((tier) => system.by_tier[tier] && typeof system.by_tier[tier] === 'object')) fail(key + ': tier counts');
    const outcomes = system.public_tasks;
    if (!outcomes || Object.keys(outcomes).sort().join(',') !== [...ids].sort().join(',')) fail(key + ': public task coverage');
    for (const [taskId, outcome] of Object.entries(outcomes)) {
      if (!Array.isArray(outcome) || outcome.length !== 2 || !CODES.has(outcome[0]) || !(outcome[1] === null || (typeof outcome[1] === 'number' && Number.isFinite(outcome[1]) && outcome[1] >= 0)) || (outcome[0] !== 'n' && outcome[1] === null)) fail(key + '.' + taskId + ': outcome');
    }
  }
  return a;
}

export async function readJevbenchV12Tasks(v12, root = process.cwd()) {
  const bytes = await readFile(root + '/' + JEVBENCH_V12_TASKS_ARTIFACT);
  const artifact = validateJevbenchV12Tasks(JSON.parse(bytes.toString('utf8')), v12.artifact);
  return { artifact, bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

export function jevbenchV12TasksView({ artifact: a, sha256 }) {
  const tasks = a.tasks.map(({ id, tier, topic, type }) => ({ id, tier, topic, type }));
  const taskCounts = Object.fromEntries(TIERS.map((tier) => [tier, { public: a.task_counts[tier].public }]));
  const systems = Object.fromEntries(Object.entries(a.systems).map(([key, s]) => [key, {
    display: s.display,
    partial: s.partial,
    byTier: Object.fromEntries(TIERS.map((tier) => {
      const x = s.by_tier[tier];
      const attempted = (x.c ?? 0) + (x.w ?? 0) + (x.f ?? 0);
      return [tier, { correct: x.c ?? 0, wrong: (x.w ?? 0) + (x.f ?? 0), failed: x.f ?? 0, notAttempted: x.n ?? 0, attempted, accuracy: attempted ? x.c / attempted : null }];
    })),
    outcomes: Object.fromEntries(Object.entries(s.public_tasks).map(([id, [status, latency]]) => [id, { status, latency }])),
  }]));
  return { sha256, revision: a.revision, note: a.note, taskCounts, tasks, systems };
}
