import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';
const PATH = '/jev-models/jev-vs-quyet-1-0-large';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({path: PATH, title: 'Jev vs Quyet-1.0-Large — JevBench by Benchmark Heaven', description: 'Published Capability, axes, cost, latency and measurement conditions for Jev 1.13.0 and Quyet-1.0-Large.', keywords: ['Jev vs Quyet-1.0-Large', 'JevBench']});
}
export default function ComparisonPage() {
 return <JevComparisonPage rivalKey="quyet-1-0-large" path={PATH} label="Quyet-1.0-Large"/>;
}
