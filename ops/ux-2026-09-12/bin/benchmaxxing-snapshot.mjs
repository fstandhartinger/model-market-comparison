// CR-64.3: snapshot of the Benchmaxxing verdicts (per family: score, tag level, axes used) for a before/after diff.
// Usage: node ops/ux-2026-09-12/bin/benchmaxxing-snapshot.mjs <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { buildBenchmarkView } from '../../../lib/benchmark-view.mjs';
import { benchmaxxingFamilySignals, groupedRadarProfile } from '../../../lib/benchmax.mjs';
const ds = JSON.parse(readFileSync(new URL('../../../data/dataset.json', import.meta.url), 'utf8'));
const view = buildBenchmarkView(ds);
const { reports, taggedFamilies, weakFamilies } = benchmaxxingFamilySignals(view);
const family = (id) => view.models.find((m) => m.id === id)?.family ?? id;
const rows = reports.map(([id, r], i) => ({ rank: i + 1, family: family(id), representative: id, score: Math.round(r.score * 100) / 100,
  level: taggedFamilies.has(family(id)) ? 'strong' : weakFamilies.has(family(id)) ? 'weak' : null, comparisons: r.comparisons, topics: r.topics,
  measuredAxes: r.profile.measured, totalAxes: r.profile.total, costAxesMeasured: groupedRadarProfile(view, id).axes.filter((a) => !a.missing && /-cost::/.test(a.id)).length }));
writeFileSync(process.argv[2], JSON.stringify({ generated_at: ds.generated_at, scored: rows.length, strong: taggedFamilies.size, weak: weakFamilies.size, rows }, null, 2));
console.log(`${rows.length} scored families, ${taggedFamilies.size} strong, ${weakFamilies.size} weak → ${process.argv[2]}`);
