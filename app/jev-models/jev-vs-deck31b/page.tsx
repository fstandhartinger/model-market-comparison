import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';
const PATH = '/jev-models/jev-vs-deck31b';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({path: PATH, title: 'Jev vs deck-31B — JevBench by Benchmark Heaven', description: 'Published Capability, axes, cost, latency and measurement conditions for Jev 1.13.0 and deck-31B.', keywords: ['Jev vs deck-31B', 'JevBench']});
}
export default function ComparisonPage() {
 return <JevComparisonPage rivalKey="deck31b" path={PATH} label="deck-31B"/>;
}
