import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-winnow-12b-q8';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({ path: PATH, title: 'Jev vs Winnow-12B Q8 — JevBench by Benchmark Heaven', description: 'Compare Jev and Winnow-12B Q8 using the same published JevBench measures and evidence labels.', keywords: ['jev vs winnow 12b q8', 'Winnow Jev alternative', 'JevBench by Benchmark Heaven'] });
}
export default function JevVsWinnowPage() {
  return <JevComparisonPage rivalKey="winnow-12b" path={PATH} label="Winnow-12B Q8" />;
}
