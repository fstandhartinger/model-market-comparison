import type { Metadata } from 'next';
import { readCurrentJevbench } from '../../../lib/jevbench-current.mjs';
import { JevBenchV16ReleaseRoute } from '../../../components/JevBenchV16ReleaseRoute';
import { JevHistoryLazy } from '../../../components/JevHistoryLazy';

// Florian + Marco De Rossi, 10 Oct 2026: the "All" preset of the one JevBench board — open-weights and API systems in
// one Capability ranking. Composite, speed and cost stay, tagged by group (they compare fairly only within a group).
export const metadata: Metadata = {
  title: 'JevBench — all decision models (open weights and APIs)',
  description: 'Every AI decision model measured on JevBench, open weights and hosted APIs, ranked together by the JevBench Capability Score.',
  alternates: { canonical: '/jev-models/all' },
};

export default async function JevModelsAllPage() {
  const release = await readCurrentJevbench();
  const url = 'https://benchmarkheaven.com/jev-models/all';
  const jsonLd = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': `${url}#page`, url, name: 'JevBench: all decision models', isPartOf: { '@id': 'https://benchmarkheaven.com/#website' } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Benchmark Heaven', item: 'https://benchmarkheaven.com' },
      { '@type': 'ListItem', position: 2, name: 'JevBench', item: 'https://benchmarkheaven.com/jev-models' },
      { '@type': 'ListItem', position: 3, name: 'All decision models', item: url },
    ] },
  ] };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <JevBenchV16ReleaseRoute live scope="all" release={release} versionPath="/jev-models/all" />
    <JevHistoryLazy />
  </>;
}
