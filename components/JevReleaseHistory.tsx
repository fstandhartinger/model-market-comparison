import { JEVBENCH_RELEASES } from '../lib/jevbench-releases.mjs';
import { hasPublishedJevbenchV162Release } from '../lib/jevbench-v162-release.mjs';
import { hasPublishedJevbenchV163Release } from '../lib/jevbench-v163-release.mjs';
import { hasPublishedJevbenchV164Release } from '../lib/jevbench-v164-release.mjs';
import { hasPublishedJevbenchV165Release } from '../lib/jevbench-v165-release.mjs';
import { hasPublishedJevbenchV166Release } from '../lib/jevbench-v166-release.mjs';

/** Dated release history of the live board (Florian 10 Oct 2026: versions move here from the tabs on top). Fresh-draw
 *  releases are listed only for a validated publication; a failed validation omits the entry and keeps the rest. */
export async function JevReleaseHistory() {
  const [v162, v163, v164, v165, v166] = await Promise.all([hasPublishedJevbenchV162Release(), hasPublishedJevbenchV163Release(), hasPublishedJevbenchV164Release(), hasPublishedJevbenchV165Release(), hasPublishedJevbenchV166Release()]);
  const hidden = new Set([!v162 && 'v1.6.2', !v163 && 'v1.6.3', !v164 && 'v1.6.4', !v165 && 'v1.6.5', !v166 && 'v1.6.6'].filter(Boolean));
  const releases = JEVBENCH_RELEASES.filter((r) => !hidden.has(r.version));
  return <section className="mt-10 max-w-4xl" id="jev-release-history" aria-labelledby="jev-release-history-title" data-bh-jev-release-history>
    <h2 id="jev-release-history-title" className="text-2xl font-bold">Release history</h2>
    <p className="bh-muted mt-1 text-sm">The board above is always the current merged board: every system with its latest measurement. Each release stays readable as published.</p>
    <ul className="mt-2 space-y-1 text-sm">{releases.map((r) => <li key={r.version} data-bh-jev-release={r.version}>
      <a className="text-accent font-semibold underline" href={r.href}>JevBench {r.version}</a> <span className="bh-muted">· {r.date} · {r.text}</span>
    </li>)}</ul>
  </section>;
}
