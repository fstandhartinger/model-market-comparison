import type { Metadata } from 'next';
import { JevComparisonPage } from '../../../components/JevComparisonPage';
import { jevIntentMetadata } from '../../../lib/jevbench-seo-metadata';

const PATH = '/jev-models/jev-vs-hopper';
export async function generateMetadata(): Promise<Metadata> {
  return jevIntentMetadata({ path: PATH, title: 'Jev vs Hopper — JevBench by Benchmark Heaven', description: 'Compare Jev and Hopper using published JevBench measures for intelligence, calibration, speed, cost and openness.', keywords: ['jev vs hopper', 'Hopper Jev alternative', 'JevBench by Benchmark Heaven'] });
}
export default function JevVsHopperPage() {
  return <JevComparisonPage rivalKey="hopper" path={PATH} label="Hopper" />;
}
