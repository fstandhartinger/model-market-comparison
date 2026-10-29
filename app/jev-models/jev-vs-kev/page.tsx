import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-kev';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({ path: PATH, title: 'Jev vs Kev — JevBench by Benchmark Heaven', description: 'Compare Jev and Kev 27B using published JevBench intelligence, calibration, speed and cost, with measurement dates and conditions.', keywords: ['jev vs kev', 'kev model', 'Kev benchmark', 'JevBench by Benchmark Heaven'] });
}
export default function JevVsKevPage() {
  return <JevComparisonPage rivalKey="kev-27b" path={PATH} label="Kev" />;
}
