import { JEV_REMEASURE_PENDING, JEV_REMEASURE_PENDING_LABEL } from './jev-decision-limit.mjs';
import { JEV_SCOPE_LISTING } from './jevbench-scope.mjs';

export const referenceNote = (classLabel = 'Jev-class') => `Reference system for the ${classLabel} limits`;

// v1.7.1 (Florian 6 Oct 2026): the Jev row on the open-weights board says plainly that it is a comparison reference.
export function unrankedNote(listing, benchName, preliminary) {
  if (listing === JEV_SCOPE_LISTING.reference) return 'Not ranked, only shown as a reference to compare with';
  if (listing === JEV_SCOPE_LISTING.api) return 'Not ranked here: API offering, ranked on the API leaderboard';
  // v1.7.5 (Florian 6 Oct 2026): public-set figures shown before the full sealed re-run.
  // v1.6.14: a measurement that discloses its own preliminary scope shows that label; legacy P300 rows keep the exact text.
  if (listing === 'preliminary') return preliminary?.label ?? 'Preliminary · public set (300 items) · full sealed run pending';
  if (listing === 'pending') return 'Pending · no v1.6 figure yet';
  // v1.7.0: the row keeps its v1.6 values, labelled as v1.6, and has no v1.7 value or rank.
  if (listing === JEV_REMEASURE_PENDING) return `Not ranked: ${JEV_REMEASURE_PENDING_LABEL}. Shown with its v1.6 values until it is measured again`;
  return `Not ranked in the official ${benchName} Score (${listing.replace(/_/g, ' ')})`;
}
