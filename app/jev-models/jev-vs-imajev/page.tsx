import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-imajev';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({ path: PATH, title: 'Jev vs Imajev-4B — JevBench by Benchmark Heaven', description: 'Compare Jev and Imajev-4B using published JevBench measures for intelligence, calibration, speed, cost, openness and measurement setup.', keywords: ['Jev vs Imajev', 'Jev vs Imajev-4B', 'Imajev-4B benchmark', 'mohit67890 Imajev', 'JevBench by Benchmark Heaven'] });
}
export default function JevVsImajevPage() {
  return <JevComparisonPage rivalKey="imajev_4b" path={PATH} label="Imajev-4B" />;
}
