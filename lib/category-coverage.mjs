// CR-244: audit the exact dataset being considered, including previously withdrawn anchors.
// Reporting requalification never restores scores or changes their fixed anchor sets automatically.
import { compatibleRow } from './benchmark-matrix.mjs';
import { newestRow } from './category-scores.mjs';

export function auditCategoryCoverage(matrix, dataset, anchors) {
  const featured = new Set(dataset.models.filter(m => m.featured && !m.deprecated).map(m => m.family_key));
  if (!featured.size) throw new Error('category coverage requires featured model families');
  const familyOf = new Map(dataset.models.map(m => [m.id, m.family_key]));
  const measured = new Map(), counts = new Map();
  for (const [id, values] of Object.entries(matrix.values)) {
    for (const [index, value, basis] of values) {
      if ((basis ?? 0) !== 0 || !Number.isFinite(value)) continue;
      counts.set(index, (counts.get(index) ?? 0) + 1);
      const family = familyOf.get(id);
      if (!featured.has(family)) continue;
      if (!measured.has(index)) measured.set(index, new Set());
      measured.get(index).add(family);
    }
  }
  const categories = [...anchors.categories, ...(anchors.withdrawn?.categories ?? [])];
  const indexed = matrix.rows.map((row, index) => ({ ...row, index }));
  const results = categories.map(category => {
    const offered = anchors.categories.some(c => c.key === category.key);
    const active = new Set((category.anchors ?? []).map(a => a.key));
    const candidates = new Set([...active, ...(anchors.withdrawn?.anchors ?? [])
      .filter(a => a.category === category.id).map(a => a.key)]);
    const rows = [...candidates].map(key => {
      // Resolve the current identity first; never fall back to an older non-judged/wider row.
      const row = newestRow(indexed.filter(r => r.key === key && r.group === category.group && compatibleRow(r)), counts);
      const families = row ? (measured.get(row.index)?.size ?? 0) : 0;
      const coverage = families / featured.size;
      return { key, active: active.has(key), version: row?.version ?? null,
        measured_families: families, coverage, missing: !row, judged: Boolean(row?.judged),
        qualifies: Boolean(row && !row.judged && coverage >= anchors.min_coverage) };
    });
    const qualifying = rows.filter(r => r.qualifies);
    const activeRows = rows.filter(r => r.active);
    return { key: category.key, offered, anchors: rows,
      qualified: offered && activeRows.length >= anchors.min_anchors && activeRows.every(r => r.qualifies),
      requalifies: !offered && qualifying.length >= anchors.min_anchors,
      returned_anchors: rows.filter(r => !r.active && r.qualifies).map(r => r.key) };
  });
  return { featured_families: featured.size, min_coverage: anchors.min_coverage,
    min_anchors: anchors.min_anchors, categories: results,
    offered_failures: results.filter(c => c.offered && !c.qualified).map(c => c.key),
    requalified_categories: results.filter(c => c.requalifies).map(c => c.key) };
}
