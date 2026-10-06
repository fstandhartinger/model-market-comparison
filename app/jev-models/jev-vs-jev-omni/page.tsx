import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';
const PATH = '/jev-models/jev-vs-jev-omni';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({path: PATH, title: 'Jev vs Jev-Omni — JevBench by Benchmark Heaven', description: 'Published Capability, axes, cost, latency and measurement conditions for Jev 1.13.0 and Jev-Omni.', keywords: ['Jev vs Jev-Omni', 'JevBench']});
}
export default function ComparisonPage() {
 return <JevComparisonPage rivalKey="jev-omni" path={PATH} label="Jev-Omni"/>;
}
