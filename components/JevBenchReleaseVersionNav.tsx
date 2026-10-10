import { jevbenchRelease } from '../lib/jevbench-releases.mjs';
type JevRelease = 'v1.6.7' | 'v1.6.6' | 'v1.6.5' | 'v1.6.4' | 'v1.6.3' | 'v1.6.2' | 'v1.6.1' | 'v1.6.0' | 'v1.5.7' | 'v1.5.6' | 'v1.5.5';

/** Florian 10 Oct 2026: archived release pages keep their URL; the version tabs became this one-line bar. The live
 *  board (/jev-models) is always the merged board with every system's latest measurement; releases are listed in
 *  its Release history (lib/jevbench-releases.mjs). The fresh* flags of older callers are accepted and ignored. */
export async function JevBenchReleaseVersionNav({ active }: { active: JevRelease; fresh?: boolean; fresh163?: boolean; fresh164?: boolean; fresh165?: boolean; fresh166?: boolean; fresh167?: boolean }) {
  const r = jevbenchRelease(active);
  return <nav aria-label="JevBench release" className="bh-panel mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm" data-bh-jev-archive-bar={active}>
    <span className="font-semibold">Archived release JevBench {active}{r ? ` · ${r.date}` : ''}</span>
    <span className="bh-muted">shown as published</span>
    <a className="text-accent font-semibold underline" href="/jev-models" data-bh-jev-live-link>Current board (all systems) →</a>
    <a className="text-accent underline" href="/jev-models#jev-release-history">Release history</a>
  </nav>;
}
