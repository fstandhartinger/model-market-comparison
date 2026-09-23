// F-165(a), the open half: which vendor launch boards could join an independent board's identity.
//
//   node f165a-rekey-candidates.mjs            (reads this checkout's data/dataset.json)
//
// This narrows the question; it does not answer it. A shared family or display name is a *candidate*,
// never a join: the rule is that the vendor's number was produced on the board's own protocol, which
// has to be read per row against the captured source, and several candidates below are a different
// snapshot identity of the same board rather than the same one. Output: 96 vendor-scoped boards, of
// which 25 have any counterpart at all and 71 provably have none — those 71 stay separate, and that
// is a finding, not a gap.
import { readFileSync } from 'node:fs';
const ds = JSON.parse(readFileSync('/opt/model-market-comparison/data/dataset.json','utf8'));
const reg = ds.benchmark_results.registry;
const byId = new Map(reg.map(b => [b.id, b]));
const re = /^Vendor-reported by ([A-Za-z0-9 .&-]+?) for /;
const launch = ds.benchmark_results.observations.filter(o => re.test(o.protocol || ''));
const vendorBoards = [...new Set(launch.map(o => o.benchmark_id))];
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const vendorPrefix = /^(anthropic|openai|deepseek|stepfun|xiaomi)-/;
let pairs = 0, orphans = 0;
const out = [];
for (const id of vendorBoards.sort()) {
  const b = byId.get(id);
  const stem = String(b.family ?? id.split('::')[0]).replace(vendorPrefix, '');
  const cands = reg.filter(x => x.id !== id && !vendorPrefix.test(String(x.family ?? x.id))
    && (norm(x.family ?? '') === norm(stem) || norm(x.name) === norm(b.name)));
  if (cands.length) { pairs++; out.push({ vendor: id, name: b.name, version: b.version, candidates: cands.map(c => `${c.id} :: ${c.name}`) }); }
  else { orphans++; out.push({ vendor: id, name: b.name, version: b.version, candidates: [] }); }
}
console.log(`vendor-scoped boards ${vendorBoards.length}: ${pairs} have an independent counterpart by family or name, ${orphans} have none`);
for (const r of out.filter(r => r.candidates.length)) console.log(`  ${r.vendor}\n      "${r.name}" v${r.version} -> ${r.candidates.join(' | ')}`);
