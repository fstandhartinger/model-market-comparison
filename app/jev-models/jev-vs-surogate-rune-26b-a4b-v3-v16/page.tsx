import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';
const PATH = '/jev-models/jev-vs-surogate-rune-26b-a4b-v3-v16';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({path: PATH, title: 'Jev vs Surogate Rune 26B-A4B v3 — JevBench by Benchmark Heaven', description: 'Published Capability, axes, cost, latency and measurement conditions for Jev 1.13.0 and Surogate Rune 26B-A4B v3.', keywords: ['Jev vs Surogate Rune 26B-A4B v3', 'JevBench']});
}
export default function ComparisonPage() {
 return <JevComparisonPage rivalKey="surogate-rune-26b-a4b-v3-v16" path={PATH} label="Surogate Rune 26B-A4B v3"/>;
}
