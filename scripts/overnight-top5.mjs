// Top-5 by Capability (Jev-class, official caps) and by Composite A for one or more result artifacts.
// Usage: node scripts/overnight-top5.mjs label=path [label=path ...]   -> JSON
import { readFileSync } from 'node:fs';
import { jevClassRows } from '../lib/jevbench-jev-class.mjs';
import { jevV15BoardSystem } from '../lib/jevbench-v15-board.mjs';
const out = {};
for (const arg of process.argv.slice(2)) {
  const [label, path] = arg.split('=');
  const a = JSON.parse(readFileSync(path, 'utf8'));
  const sys = a.systems.map(jevV15BoardSystem);
  const view = jevClassRows(sys);
  const cap = view.rows.filter((r) => r.inClass && r.row.ranked).slice(0, 5).map((r) => ({ key: r.row.key, display: r.row.display, capability: +r.capability.toFixed(1) }));
  const comp = a.systems.filter((s) => s.ranked || s.listing === 'ranked').sort((x, y) => (y.scores?.A ?? y.jevbench_score ?? -1) - (x.scores?.A ?? x.jevbench_score ?? -1))
    .slice(0, 5).map((s) => ({ key: s.key, display: s.display, composite: +(s.scores?.A ?? s.jevbench_score).toFixed(1) }));
  out[label] = { capability: cap, composite: comp, n_ranked: a.systems.filter((s) => s.ranked || s.listing === 'ranked').length };
}
console.log(JSON.stringify(out, null, 1));
