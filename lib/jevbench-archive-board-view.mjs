import { jevV16BoardRows, jevV16ComparisonSources } from './jevbench-board-rows.mjs';
import { jevbenchCategoryView, isFreshJevbenchV16Revision } from './jevbench-categories.mjs';
import { hasApiFullAddendumCategories } from './jevbench-category-bounds.mjs';

/** Project while the validated category WeakMap is still available on the server. JSON cannot carry object identity. */
export function jevArchiveComparisonCategories({ artifact, categories, scope }) {
  const rows = jevV16ComparisonSources(artifact, jevV16BoardRows(artifact, scope));
  return jevbenchCategoryView(artifact.revision, rows.map(r => r.key), {
    supplement: Boolean(categories.supplement),
    artifact: isFreshJevbenchV16Revision(artifact.revision) || hasApiFullAddendumCategories(categories) ? categories : undefined,
  });
}
