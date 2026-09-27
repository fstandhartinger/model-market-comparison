import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-plumb';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({ path: PATH, title: 'Jev vs Plumb-4B — JevBench by Benchmark Heaven', description: 'Compare Jev and Plumb-4B using published JevBench measures for intelligence, calibration, speed, cost, openness and measurement setup.', keywords: ['Jev vs Plumb', 'Jev vs Plumb-4B', 'Plumb-4B benchmark', 'crh225 Plumb', 'JevBench by Benchmark Heaven'] });
}
export default function JevVsPlumbPage() {
  return <JevComparisonPage rivalKey="plumb-4b" path={PATH} label="Plumb-4B" />;
}
