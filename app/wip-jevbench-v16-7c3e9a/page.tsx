import type { Metadata } from 'next';
import { readJevbenchV16Preview, JEVBENCH_V16_EXCLUDED_KEYS } from '../../lib/jevbench-v16-preview.mjs';
import { readJevbenchV155Release } from '../../lib/jevbench-v15-release.mjs';
import { JevBenchV16Preview } from '../../components/JevBenchV16Preview';

// JevBench v1.6.0 preview, provisional: unlisted and noindex until the release GO. Not in the sitemap, nav or robots.
export const metadata: Metadata = {
  title: 'JevBench v1.6.0 preview, provisional',
  description: 'Provisional JevBench v1.6.0 results. Not a release; numbers can change.',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default async function JevBenchV16PreviewPage() {
  const [{ artifact, sha256, categories, categoriesSha256, carry, carrySha256 }, live] = await Promise.all([readJevbenchV16Preview(), readJevbenchV155Release()]);
  const ranked = artifact.systems.filter((s) => s.ranked);
  const api = ranked.filter((s) => s.v16.lane === 'api').length;
  return <>
    <header className="mb-6">
      <p role="note" className="rounded border border-amber-500 bg-amber-500/10 px-3 py-2 text-sm font-semibold" data-bh-jev16-provisional-banner>
        JevBench v1.6.0 preview, provisional — not a release. Scores, ranks and dates can change before GO.
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">JevBench v1.6.0 preview, provisional</h1>
      <p className="bh-muted mt-2 max-w-4xl text-sm">
        {ranked.length} systems measured on the new v1.6 pool ({ranked.length - api} self-hosted on {artifact.v16.counts.selfhosted_input.toLocaleString('en-US')} decisions each, {api} hosted APIs on {artifact.v16.counts.api_input}) ·
        {' '}{carry.rows.length} further systems keep their dated v1.5.x score in a separate list below · only system-level aggregates are shown.
      </p>
    </header>
    <JevBenchV16Preview artifact={artifact} sha256={sha256} categories={categories} categoriesSha256={categoriesSha256} carry={carry} carrySha256={carrySha256}
      previousKeys={live.artifact.systems.map((row: { key: string }) => row.key).filter((key: string) => !JEVBENCH_V16_EXCLUDED_KEYS.includes(key))} />
  </>;
}
