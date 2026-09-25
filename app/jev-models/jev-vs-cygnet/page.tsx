import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-cygnet';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({ path: PATH, title: 'Jev vs Cygnet — JevBench by Benchmark Heaven', description: 'Compare Jev and Cygnet using published JevBench measures for intelligence, calibration, speed, cost, openness and measurement setup.', keywords: ['jev vs cygnet', 'Cygnet benchmark', 'blockbrain Cygnet', 'JevBench by Benchmark Heaven'] });
}
export default function JevVsCygnetPage() {
  return <JevComparisonPage rivalKey="cygnet" path={PATH} label="Cygnet" />;
}
