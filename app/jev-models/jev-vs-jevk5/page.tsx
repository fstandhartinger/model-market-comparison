import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-jevk5';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({ path: PATH, title: 'Jev vs JevK5 — JevBench by Benchmark Heaven', description: 'Compare Jev and JevK5 using the published JevBench measures for intelligence, calibration, speed, cost and openness.', keywords: ['jev vs jevk5', 'jevk5 alternative', 'JevBench by Benchmark Heaven'] });
}
export default function JevVsJevK5Page() {
  return <JevComparisonPage rivalKey="jevk5-v02" path={PATH} label="JevK5" />;
}
