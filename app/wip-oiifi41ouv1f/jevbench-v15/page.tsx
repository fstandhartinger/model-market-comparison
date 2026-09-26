import type { Metadata } from 'next';
import { readJevbenchV15Preview } from '../../../lib/jevbench-v15-preview.mjs';
import { JevBenchV15Preview } from '../../../components/JevBenchV15Preview';

// Unlisted, UNPUBLISHED preview of the JevBench v1.5 page for Florian's review (25 Sep 2026), the same pattern as the
// earlier ImageJevBench WIP route: noindex/nofollow (meta + X-Robots-Tag in next.config.mjs), not in the sitemap, the
// nav, /jev-models or the API, and not linked from any public page. The public JevBench pages stay on v1.4.2.
// At release the page body moves to the public route; until then only the data file changes.
export const metadata: Metadata = {
  title: 'UNPUBLISHED PREVIEW — JevBench v1.5',
  description: 'Unpublished preview, not released.',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};

export default async function WipJevBenchV15Preview() {
  const { artifact, sha256 } = await readJevbenchV15Preview();
  const diagnostic = artifact.run_kind !== 'official';
  return <>
    <div className="mb-6 rounded-xl border-4 border-red-600 bg-red-50 px-5 py-4 text-red-900 dark:bg-red-950 dark:text-red-100" role="note" data-bh-wip-banner data-bh-jev15-banner>
      <p className="text-2xl font-black tracking-wide">Unpublished preview — not released</p>
      <p className="mt-1 text-sm">JevBench v1.5 as it would go live. Numbers, wording and layout may still change. Please don't share this URL.</p>
      {diagnostic && <p className="mt-2 inline-block rounded border-2 border-red-700 bg-yellow-200 px-2 py-0.5 text-sm font-black tracking-wide" style={{ color: '#7f1d1d' }} data-bh-jev15-diagnostic>DIAGNOSTIC numbers — not the official v1.5 measurement</p>}
    </div>
    <header className="bh-page-head">
      <p className="bh-eyebrow" data-bh-jev-frozen-version>JevBench release {artifact.revision}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">JevBench {artifact.revision} — Jev alternatives ranking</h1>
      <p className="bh-muted mt-3 max-w-3xl">JevBench measures Jev-class decision models on intelligence, calibration, speed and cost. v1.5 doubles the sample to {artifact.sample.total.toLocaleString('en-US')} decisions per system, scores Choice, Noul and Score requests natively, gives the fresh sealed set half of Intelligence and makes validity-weighted scoring (option B) the headline.</p>
      <p className="bh-muted mt-2 max-w-3xl text-xs" data-bh-jev-meta>{artifact.sample.open} open + {artifact.sample.sealed} sealed decisions · {artifact.n_ranked} ranked of {artifact.roster_count} roster systems · only system-level sealed aggregates are published.</p>
    </header>
    <JevBenchV15Preview artifact={artifact} sha256={sha256} />
  </>;
}
