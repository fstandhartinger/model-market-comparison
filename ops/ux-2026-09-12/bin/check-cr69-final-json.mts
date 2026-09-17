// CR-69.2/69.3 acceptance: JS scores and tags on the current view vs the calibration job's final.json.
// Usage: npx tsx ops/ux-2026-09-12/bin/check-cr69-final-json.mts [final.json] [out.json]
import { readFileSync, writeFileSync } from 'fs';
import { getBenchmarkView } from '../../../lib/benchmark-data';
import { benchmaxxingFamilySignals, benchmaxxingPrior, scoreBenchmaxxing } from '../../../lib/benchmax.mjs';
const finalPath = process.argv[2] ?? `${process.env.HOME}/jobs/bh-benchmaxxing-calibration-20260917/final.json`;
const ref = JSON.parse(readFileSync(finalPath, 'utf8'));
const view: any = await getBenchmarkView();
const prior = benchmaxxingPrior(view);
const diffs = ref.pool.map(([id, score, n]: [string, number, number]) => {
  const r = scoreBenchmaxxing(view, id);
  return { id, ref: score, js: r.score, refN: n, jsN: r.comparisons, delta: r.score == null ? null : r.score - score };
});
const bad = diffs.filter((d: any) => d.delta == null || Math.abs(d.delta) > 0.2 || d.refN !== d.jsN);
const fam = benchmaxxingFamilySignals(view) as any;
const name = (id: string) => view.models.find((m: any) => m.id === id)?.name ?? id;
const repIds = fam.reports.map(([id]: any) => id);
const refStrong = ref.tags.filter((t: any) => t.tag === 'strong').map((t: any) => name(t.model));
const refWeak = ref.tags.filter((t: any) => t.tag === 'weak').map((t: any) => name(t.model));
const banded = fam.banded.map((b: any) => { const r = fam.reports.find(([x]: any) => x === b.id)[1]; const rt = ref.tags.find((t: any) => t.model === b.id);
  return { model: name(b.id).slice(0, 40), band: b.band, passes: b.passes, score: +r.score.toFixed(2), n: r.comparisons, lower: +r.interval.lower.toFixed(2), upper: +r.interval.upper.toFixed(2), refLower: rt?.lo ?? null, refTag: rt?.tag ?? null }; });
const out = { k: prior.shrink, refK: ref.k, representatives: repIds.length, compared: diffs.length, outsideTolerance: bad,
  maxAbsDelta: Math.max(...diffs.filter((d: any) => d.delta != null).map((d: any) => Math.abs(d.delta))),
  strong: repIds.filter((id: string) => fam.tagged.has(id)).map(name), weak: repIds.filter((id: string) => fam.weak.has(id)).map(name), refStrong, refWeak, banded };
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, banded: undefined }, null, 1));
console.table(banded);
