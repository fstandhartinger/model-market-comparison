import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';
const PATH = '/jev-models/jev-vs-h2o-lightning-4b';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({path: PATH, title: 'Jev vs H2O-Lightning-4B v1.1 — JevBench by Benchmark Heaven', description: 'Published Capability, axes, cost, latency and measurement conditions for Jev 1.13.0 and H2O-Lightning-4B v1.1.', keywords: ['Jev vs H2O-Lightning-4B v1.1', 'JevBench']});
}
export default function ComparisonPage() {
 return <JevComparisonPage rivalKey="h2o-lightning-4b" path={PATH} label="H2O-Lightning-4B v1.1"/>;
}
