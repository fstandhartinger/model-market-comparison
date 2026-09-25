import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-decider-4b-v2';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({ path: PATH, title: 'Jev vs decider-4b v2 — JevBench by Benchmark Heaven', description: 'Compare Jev and decider-4b v2 using published JevBench measures for intelligence, calibration, speed, cost, openness and measurement setup.', keywords: ['jev vs decider', 'jev vs decider-4b v2', 'decider-4b v2 benchmark', 'Mapika decider', 'JevBench by Benchmark Heaven'] });
}
export default function JevVsDecider4bV2Page() {
  return <JevComparisonPage rivalKey="decider-4b-v2" path={PATH} label="decider-4b v2" />;
}
