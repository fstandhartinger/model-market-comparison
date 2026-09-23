import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-reflex-4b';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({ path: PATH, title: 'Jev vs reflex 4B — JevBench by Benchmark Heaven', description: 'Compare Jev and reflex 4B using published JevBench accuracy, Intelligence, Calibration, Speed and Cost.', keywords: ['jev vs reflex 4b', 'reflex 4b Jev alternative', 'JevBench by Benchmark Heaven'] });
}
export default function JevVsReflexPage() {
  return <JevComparisonPage rivalKey="reflex-4b" path={PATH} label="reflex 4B" />;
}
