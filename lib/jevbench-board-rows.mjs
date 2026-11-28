import { JEV_REMEASURE_PENDING } from './jev-decision-limit.mjs';
import { JEV_PRELIMINARY_LISTING, JEV_PENDING_LISTING, JEV_SCOPE_LISTING, jevScopeDisplayOrder } from './jevbench-scope.mjs';
import { freshJevbenchCategoryRows } from './jevbench-categories.mjs';

export function jevV16BoardRows(artifact, scope = 'all', extra = []) {
  const listed = s => s.ranked || s.listing === JEV_SCOPE_LISTING.reference || s.listing === JEV_SCOPE_LISTING.api || s.listing === JEV_PRELIMINARY_LISTING;
  const remeasure = s => s.listing === JEV_REMEASURE_PENDING;
  return scope === 'all'
    ? jevScopeDisplayOrder(artifact.systems.filter(s => s.ranked || s.listing === JEV_PRELIMINARY_LISTING || remeasure(s)))
    : jevScopeDisplayOrder([...artifact.systems.filter(s => listed(s) || remeasure(s)), ...extra]);
}
export function jevV16ComparisonSources(artifact, ranked) {
  const sources = ['v1.6.3', 'v1.6.4'].includes(artifact.revision) ? freshJevbenchCategoryRows(artifact.systems) : ranked;
  return sources.filter(s => s.listing !== JEV_PRELIMINARY_LISTING && s.listing !== JEV_PENDING_LISTING && s.listing !== JEV_REMEASURE_PENDING);
}
