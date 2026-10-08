import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';
const PATH = '/jev-models/jev-vs-torchcast-decision-12b';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({path: PATH, title: 'Jev vs torchcast-decision-12b — JevBench by Benchmark Heaven', description: 'Published Capability, axes, cost, latency and measurement conditions for Jev 1.13.0 and torchcast-decision-12b.', keywords: ['Jev vs torchcast-decision-12b', 'JevBench']});
}
export default function ComparisonPage() {
 return <JevComparisonPage rivalKey="torchcast-decision-12b" path={PATH} label="Torchcast Decision 12B"/>;
}
