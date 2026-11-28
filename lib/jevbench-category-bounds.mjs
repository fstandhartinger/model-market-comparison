// Only validated server builders attach bounds. Client rendering receives the already projected view.
export const categoryBounds = new WeakMap();
export const apiFullAddendumCategoryBounds = artifact => categoryBounds.get(artifact);
export const hasApiFullAddendumCategories = artifact => categoryBounds.has(artifact);
