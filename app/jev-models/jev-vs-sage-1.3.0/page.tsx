import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';
const PATH = '/jev-models/jev-vs-sage-1.3.0';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({path: PATH, title: 'Jev vs Sage 1.3.0 — JevBench by Benchmark Heaven', description: 'Published Capability, axes, cost, latency and measurement conditions for Jev 1.13.0 and Sage 1.3.0.', keywords: ['Jev vs Sage 1.3.0', 'JevBench']});
}
export default function ComparisonPage() {
 return <JevComparisonPage rivalKey="sage-1.3.0" path={PATH} label="Sage 1.3.0"/>;
}
