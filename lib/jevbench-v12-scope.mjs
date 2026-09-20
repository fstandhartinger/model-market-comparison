// CR-90.1: client-safe difficulty scope helpers. Scope changes use the artifact's
// published tier aggregates and re-normalise the benchmark's tier weights.
import { intelligence, geometric, TIER_WEIGHTS } from './jevbench-v12-score.mjs';

export const TASK_SCOPES = [
  { id: 'all', label: 'All tasks', short: 'All tasks', tiers: ['easy', 'standard', 'judge', 'hard'] },
  { id: 'easy-medium', label: 'Easy + Medium', short: 'Easy + Medium', tiers: ['easy', 'standard'] },
  { id: 'easy', label: 'Easy only', short: 'Easy only', tiers: ['easy'] },
];
export const DEFAULT_TASK_SCOPE = 'all';
export const scopeById = (id) => TASK_SCOPES.find((scope) => scope.id === id) ?? TASK_SCOPES[0];
export const taskScopeLabel = (id) => scopeById(id).label;
export function parseTaskScope(search) {
  const sp = typeof search === 'string' ? new URLSearchParams(search) : search;
  const requested = sp?.get('scope')?.trim();
  return TASK_SCOPES.some((scope) => scope.id === requested) ? requested : DEFAULT_TASK_SCOPE;
}
export const toTaskScopeParam = (id) => id === DEFAULT_TASK_SCOPE ? null : scopeById(id).id;
export const tasksForScope = (tasks, id) => {
  const tiers = new Set(scopeById(id).tiers);
  return tasks.filter((task) => tiers.has(task.tier));
};

const tierAccuracy = (row, taskSystem, tier) => {
  if (taskSystem?.byTier?.[tier]?.attempted > 0) return taskSystem.byTier[tier].accuracy;
  // A system added after the pinned public-task capture has no per-task cells. It still has a published
  // tier aggregate in the main artifact; use that aggregate and show the grid gap below.
  return taskSystem ? null : row.tiers[tier];
};

export function scopedIntelligence(row, taskSystem, scopeId) {
  const scope = scopeById(scopeId);
  const selected = Object.fromEntries(scope.tiers.map((tier) => [tier, tierAccuracy(row, taskSystem, tier)]).filter(([, value]) => typeof value === 'number'));
  return intelligence(selected);
}

export function scopeRows(rows, taskSystems, scopeId, defaultWeights) {
  const all = rows.map((row) => {
    const taskSystem = taskSystems[row.key];
    const intelligenceScore = scopeId === DEFAULT_TASK_SCOPE ? row.axes.intelligence : scopedIntelligence(row, taskSystem, scopeId);
    const axes = { ...row.axes, intelligence: intelligenceScore };
    return {
      ...row,
      axes,
      publishedMain: row.main,
      publishedRank: row.rank,
      main: geometric(axes, defaultWeights) ?? row.main,
    };
  });
  return all.sort((a, b) => b.main - a.main || a.display.localeCompare(b.display));
}

export function scopeTierWeights(scopeId) {
  const tiers = new Set(scopeById(scopeId).tiers);
  const sum = TASK_SCOPES[0].tiers.reduce((n, tier) => n + (tiers.has(tier) ? TIER_WEIGHTS[tier] : 0), 0);
  return Object.fromEntries(TASK_SCOPES[0].tiers.map((tier) => [tier, tiers.has(tier) ? TIER_WEIGHTS[tier] / sum : 0]));
}
