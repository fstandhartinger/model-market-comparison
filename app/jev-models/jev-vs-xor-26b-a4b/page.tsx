import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';
const PATH = '/jev-models/jev-vs-xor-26b-a4b';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({path: PATH, title: 'Jev vs Xor 26B-A4B — JevBench by Benchmark Heaven', description: 'Published Capability, axes, cost, latency and measurement conditions for Jev 1.13.0 and Xor 26B-A4B.', keywords: ['Jev vs Xor 26B-A4B', 'JevBench']});
}
export default function ComparisonPage() {
 return <JevComparisonPage rivalKey="xor-26b-a4b" path={PATH} label="Xor 26B-A4B"/>;
}
